import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type { DocumentoKyc, UploadDocumentoInput } from "./clientes.types.js";
import { ErroValidacao, ErroNaoEncontrado, ErroPermissao } from "../../plugins/erros.js";

const LIMITE_TAMANHO_BYTES = 5 * 1024 * 1024; // 5 MB

interface DocumentoRow {
  id: string;
  cliente_id: string;
  tipo_documento: string;
  nome_arquivo: string;
  caminho_seguro: string;
  tamanho_bytes: number;
  mime_type: string;
  hash_sha256: string;
  estado_validacao: string;
  enviado_em: string;
  enviado_por_id: string;
}

function mapearDocumento(r: DocumentoRow): DocumentoKyc {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    tipoDocumento: r.tipo_documento,
    nomeArquivo: r.nome_arquivo,
    caminhoSeguro: r.caminho_seguro,
    tamanhoBytes: r.tamanho_bytes,
    mimeType: r.mime_type,
    hashSha256: r.hash_sha256,
    estadoValidacao: r.estado_validacao as DocumentoKyc["estadoValidacao"],
    enviadoEm: r.enviado_em,
    enviadoPorId: r.enviado_por_id,
  };
}

/**
 * Validação rigorosa por Magic Bytes (Assinatura Binária real do ficheiro)
 */
function validarMagicBytes(buffer: Buffer): { mimeType: string; valido: boolean } {
  if (buffer.length < 4) {
    return { mimeType: "application/octet-stream", valido: false };
  }

  // 1. PDF: %PDF- (0x25, 0x50, 0x44, 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mimeType: "application/pdf", valido: true };
  }

  // 2. PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { mimeType: "image/png", valido: true };
  }

  // 3. JPEG: 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mimeType: "image/jpeg", valido: true };
  }

  return { mimeType: "application/octet-stream", valido: false };
}

export class DocumentosKycService {
  private pastaArmazenamento: string;

  constructor(
    private db: DatabaseSync,
    private auditoriaRepo: AuditoriaRepository,
    pastaBase?: string
  ) {
    this.pastaArmazenamento = pastaBase ? resolve(pastaBase) : resolve(process.cwd(), "storage", "documentos_kyc");
    try {
      mkdirSync(this.pastaArmazenamento, { recursive: true });
    } catch {
      // Ignora erro se diretório já existir
    }
  }

  public salvarDocumento(
    clienteId: string,
    dados: UploadDocumentoInput,
    operador: { id: string; nome: string; funcao: string; ip?: string | null }
  ): DocumentoKyc {
    // 1. Decodificar Buffer Base64
    let buffer: Buffer;
    try {
      buffer = Buffer.from(dados.conteudoBase64, "base64");
    } catch {
      throw new ErroValidacao("Conteúdo em base64 inválido.");
    }

    // 2. Validar Limite de Tamanho
    if (buffer.length === 0) {
      throw new ErroValidacao("O ficheiro submetido está vazio.");
    }
    if (buffer.length > LIMITE_TAMANHO_BYTES) {
      throw new ErroValidacao(
        `O ficheiro excede o tamanho máximo permitido de 5 MB (${buffer.length} bytes recebidos).`
      );
    }

    // 3. Validar Magic Bytes
    const { mimeType, valido } = validarMagicBytes(buffer);
    if (!valido) {
      throw new ErroValidacao(
        "Formato de ficheiro não autorizado ou corrompido. Apenas ficheiros PDF, PNG e JPEG genuínos são aceites."
      );
    }

    // 4. Gerar Identificadores e Caminho Seguro
    const docId = `doc_${randomUUID()}`;
    const nomeSeguro = `${docId}.bin`;
    const caminhoCompleto = join(this.pastaArmazenamento, nomeSeguro);

    // 5. Calcular Hash SHA-256 de Integridade
    const hashSha256 = createHash("sha256").update(buffer).digest("hex");
    const agora = new Date().toISOString();

    // 6. Gravar em disco seguro
    writeFileSync(caminhoCompleto, buffer);

    // 7. Sanitizar Nome Original contra Path Traversal
    const nomeArquivoSeguro = dados.nomeArquivo.replace(/[/\\]/g, "_").slice(0, 100);

    const doc: DocumentoKyc = {
      id: docId,
      clienteId,
      tipoDocumento: dados.tipoDocumento,
      nomeArquivo: nomeArquivoSeguro,
      caminhoSeguro: caminhoCompleto,
      tamanhoBytes: buffer.length,
      mimeType,
      hashSha256,
      estadoValidacao: "valido",
      enviadoEm: agora,
      enviadoPorId: operador.id,
    };

    // 8. Gravar na Base de Dados
    const stmt = this.db.prepare(`
      INSERT INTO kyc_documentos (
        id, cliente_id, tipo_documento, nome_arquivo, caminho_seguro,
        tamanho_bytes, mime_type, hash_sha256, estado_validacao, enviado_em, enviado_por_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      doc.id,
      doc.clienteId,
      doc.tipoDocumento,
      doc.nomeArquivo,
      doc.caminhoSeguro,
      doc.tamanhoBytes,
      doc.mimeType,
      doc.hashSha256,
      doc.estadoValidacao,
      doc.enviadoEm,
      doc.enviadoPorId
    );

    // 9. Auditoria
    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "KYC_DOCUMENTO_UPLOAD",
      recurso: "kyc_documentos",
      recursoId: doc.id,
      detalhes: {
        clienteId,
        tipoDocumento: doc.tipoDocumento,
        tamanhoBytes: doc.tamanhoBytes,
        mimeType: doc.mimeType,
        hashSha256: doc.hashSha256,
      },
      ip: operador.ip,
    });

    return doc;
  }

  public listarDocumentos(clienteId: string): DocumentoKyc[] {
    const stmt = this.db.prepare(`
      SELECT * FROM kyc_documentos 
      WHERE cliente_id = ? 
      ORDER BY enviado_em DESC
    `);
    const rows = stmt.all(clienteId) as unknown as DocumentoRow[];
    return rows.map(mapearDocumento);
  }

  public obterDocumento(docId: string): DocumentoKyc {
    const stmt = this.db.prepare(`SELECT * FROM kyc_documentos WHERE id = ?`);
    const row = stmt.get(docId) as DocumentoRow | undefined;
    if (!row) {
      throw new ErroNaoEncontrado(`Documento não encontrado: ${docId}`);
    }
    return mapearDocumento(row);
  }

  public lerConteudoDocumento(
    docId: string,
    operador: { id: string; nome: string; funcao: string; ip?: string | null }
  ): { doc: DocumentoKyc; buffer: Buffer } {
    const doc = this.obterDocumento(docId);

    if (!existsSync(doc.caminhoSeguro)) {
      throw new ErroNaoEncontrado("O ficheiro físico não foi localizado no armazenamento seguro.");
    }

    const buffer = readFileSync(doc.caminhoSeguro);

    // Verificação de Integridade Criptográfica (Detecta adulteração ou corrupção no disco)
    const hashAtual = createHash("sha256").update(buffer).digest("hex");
    if (hashAtual !== doc.hashSha256) {
      throw new ErroValidacao(
        "Falha de integridade: O hash do documento físico não corresponde ao registo original de auditoria."
      );
    }

    // Registo de auditoria de acesso/leitura de documento pessoal
    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "KYC_DOCUMENTO_DOWNLOAD",
      recurso: "kyc_documentos",
      recursoId: doc.id,
      detalhes: {
        clienteId: doc.clienteId,
        tipoDocumento: doc.tipoDocumento,
      },
      ip: operador.ip,
    });

    return { doc, buffer };
  }
}
