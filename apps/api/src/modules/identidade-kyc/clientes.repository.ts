import type { DatabaseSync } from "node:sqlite";
import type { Cliente, RegistoKyc, EstadoKyc, NivelRisco } from "./clientes.types.js";

interface ClienteRow {
  id: string;
  tipo: string;
  nome: string;
  tipo_documento: string;
  numero_documento: string;
  nif: string;
  nacionalidade: string;
  telefone: string;
  email: string | null;
  morada: string;
  estado: string;
  estado_kyc: string;
  nivel_risco: string;
  data_nascimento?: string | null;
  documento_emissao?: string | null;
  documento_validade?: string | null;
  profissao?: string | null;
  entidade_empregadora?: string | null;
  finalidade_conta?: string | null;
  pais_residencia?: string | null;
  pep?: number | null;
  avatar_url?: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface RegistoKycRow {
  id: string;
  cliente_id: string;
  estado_anterior: string;
  estado_novo: string;
  nivel_risco: string;
  decidido_por_id: string;
  decidido_por_nome: string;
  motivo: string | null;
  momento: string;
}

function mapearCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    tipo: row.tipo as Cliente["tipo"],
    nome: row.nome,
    tipoDocumento: row.tipo_documento as Cliente["tipoDocumento"],
    numeroDocumento: row.numero_documento,
    nif: row.nif,
    nacionalidade: row.nacionalidade,
    telefone: row.telefone,
    email: row.email,
    morada: row.morada,
    estado: row.estado as Cliente["estado"],
    estadoKyc: row.estado_kyc as Cliente["estadoKyc"],
    nivelRisco: row.nivel_risco as Cliente["nivelRisco"],
    dataNascimento: row.data_nascimento ?? null,
    documentoEmissao: row.documento_emissao ?? null,
    documentoValidade: row.documento_validade ?? null,
    profissao: row.profissao ?? null,
    entidadeEmpregadora: row.entidade_empregadora ?? null,
    finalidadeConta: row.finalidade_conta ?? null,
    paisResidencia: row.pais_residencia ?? "AO",
    pep: Boolean(row.pep),
    avatarUrl: row.avatar_url ?? null,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

export class ClientesRepository {
  constructor(private db: DatabaseSync) {}

  public inserir(cliente: Cliente): void {
    const stmt = this.db.prepare(`
      INSERT INTO clientes (
        id, tipo, nome, tipo_documento, numero_documento, nif,
        nacionalidade, telefone, email, morada, estado, estado_kyc,
        nivel_risco, data_nascimento, documento_emissao, documento_validade,
        profissao, entidade_empregadora, finalidade_conta, pais_residencia,
        pep, avatar_url, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cliente.id,
      cliente.tipo,
      cliente.nome,
      cliente.tipoDocumento,
      cliente.numeroDocumento,
      cliente.nif,
      cliente.nacionalidade,
      cliente.telefone,
      cliente.email ?? null,
      cliente.morada,
      cliente.estado,
      cliente.estadoKyc,
      cliente.nivelRisco,
      cliente.dataNascimento ?? null,
      cliente.documentoEmissao ?? null,
      cliente.documentoValidade ?? null,
      cliente.profissao ?? null,
      cliente.entidadeEmpregadora ?? null,
      cliente.finalidadeConta ?? null,
      cliente.paisResidencia ?? "AO",
      cliente.pep ? 1 : 0,
      cliente.avatarUrl ?? null,
      cliente.criadoEm,
      cliente.atualizadoEm
    );
  }

  public buscarPorId(id: string): Cliente | null {
    const stmt = this.db.prepare(`SELECT * FROM clientes WHERE id = ?`);
    const row = stmt.get(id) as ClienteRow | undefined;
    return row ? mapearCliente(row) : null;
  }

  public buscarPorDocumento(tipoDoc: string, numeroDoc: string): Cliente | null {
    const stmt = this.db.prepare(`
      SELECT * FROM clientes 
      WHERE tipo_documento = ? AND numero_documento = ? COLLATE NOCASE
    `);
    const row = stmt.get(tipoDoc, numeroDoc) as ClienteRow | undefined;
    return row ? mapearCliente(row) : null;
  }

  public buscarPorNif(nif: string): Cliente | null {
    const stmt = this.db.prepare(`
      SELECT * FROM clientes WHERE nif = ? COLLATE NOCASE
    `);
    const row = stmt.get(nif) as ClienteRow | undefined;
    return row ? mapearCliente(row) : null;
  }

  public listar(
    busca?: string,
    estadoKyc?: string,
    limite = 50,
    offset = 0,
    estadoCliente?: string,
    nivelRisco?: string
  ): { itens: Cliente[]; total: number } {
    let sqlCount = `SELECT COUNT(*) as total FROM clientes WHERE 1=1`;
    let sqlSelect = `SELECT * FROM clientes WHERE 1=1`;
    const params: (string | number)[] = [];

    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      sqlCount += ` AND (nome LIKE ? OR numero_documento LIKE ? OR nif LIKE ? OR telefone LIKE ? OR email LIKE ?)`;
      sqlSelect += ` AND (nome LIKE ? OR numero_documento LIKE ? OR nif LIKE ? OR telefone LIKE ? OR email LIKE ?)`;
      params.push(termo, termo, termo, termo, termo);
    }

    if (estadoKyc && estadoKyc.trim()) {
      sqlCount += ` AND estado_kyc = ?`;
      sqlSelect += ` AND estado_kyc = ?`;
      params.push(estadoKyc.trim());
    }

    if (estadoCliente && estadoCliente.trim()) {
      sqlCount += ` AND estado = ?`;
      sqlSelect += ` AND estado = ?`;
      params.push(estadoCliente.trim());
    }

    if (nivelRisco && nivelRisco.trim()) {
      sqlCount += ` AND nivel_risco = ?`;
      sqlSelect += ` AND nivel_risco = ?`;
      params.push(nivelRisco.trim());
    }

    const countStmt = this.db.prepare(sqlCount);
    const countRow = countStmt.get(...params) as { total: number } | undefined;
    const total = countRow?.total ?? 0;

    sqlSelect += ` ORDER BY criado_em DESC LIMIT ? OFFSET ?`;
    const selectParams = [...params, limite, offset];
    const selectStmt = this.db.prepare(sqlSelect);
    const rows = selectStmt.all(...selectParams) as unknown as ClienteRow[];

    return {
      itens: rows.map(mapearCliente),
      total,
    };
  }

  public atualizarCliente(id: string, dados: { [K in keyof Cliente]?: Cliente[K] | undefined }): void {
    const agora = new Date().toISOString();
    const campos: string[] = ["atualizado_em = ?"];
    const valores: any[] = [agora];

    if (dados.nome !== undefined) {
      campos.push("nome = ?");
      valores.push(dados.nome);
    }
    if (dados.telefone !== undefined) {
      campos.push("telefone = ?");
      valores.push(dados.telefone);
    }
    if (dados.email !== undefined) {
      campos.push("email = ?");
      valores.push(dados.email);
    }
    if (dados.morada !== undefined) {
      campos.push("morada = ?");
      valores.push(dados.morada);
    }
    if (dados.dataNascimento !== undefined) {
      campos.push("data_nascimento = ?");
      valores.push(dados.dataNascimento);
    }
    if (dados.documentoEmissao !== undefined) {
      campos.push("documento_emissao = ?");
      valores.push(dados.documentoEmissao);
    }
    if (dados.documentoValidade !== undefined) {
      campos.push("documento_validade = ?");
      valores.push(dados.documentoValidade);
    }
    if (dados.profissao !== undefined) {
      campos.push("profissao = ?");
      valores.push(dados.profissao);
    }
    if (dados.entidadeEmpregadora !== undefined) {
      campos.push("entidade_empregadora = ?");
      valores.push(dados.entidadeEmpregadora);
    }
    if (dados.finalidadeConta !== undefined) {
      campos.push("finalidade_conta = ?");
      valores.push(dados.finalidadeConta);
    }
    if (dados.paisResidencia !== undefined) {
      campos.push("pais_residencia = ?");
      valores.push(dados.paisResidencia);
    }
    if (dados.pep !== undefined) {
      campos.push("pep = ?");
      valores.push(dados.pep ? 1 : 0);
    }
    if (dados.avatarUrl !== undefined) {
      campos.push("avatar_url = ?");
      valores.push(dados.avatarUrl);
    }
    if (dados.estado !== undefined) {
      campos.push("estado = ?");
      valores.push(dados.estado);
    }
    if (dados.nivelRisco !== undefined) {
      campos.push("nivel_risco = ?");
      valores.push(dados.nivelRisco);
    }

    valores.push(id);
    const sql = `UPDATE clientes SET ${campos.join(", ")} WHERE id = ?`;
    this.db.prepare(sql).run(...valores);
  }

  public bloquear(id: string): void {
    const agora = new Date().toISOString();
    this.db.prepare(`UPDATE clientes SET estado = 'bloqueado', atualizado_em = ? WHERE id = ?`).run(agora, id);
  }

  public desbloquear(id: string): void {
    const agora = new Date().toISOString();
    this.db.prepare(`UPDATE clientes SET estado = 'ativo', atualizado_em = ? WHERE id = ?`).run(agora, id);
  }

  public atualizarEstadoKyc(
    clienteId: string,
    novoEstado: EstadoKyc,
    nivelRisco: NivelRisco,
    agora: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE clientes 
      SET estado_kyc = ?, nivel_risco = ?, atualizado_em = ?
      WHERE id = ?
    `);
    stmt.run(novoEstado, nivelRisco, agora, clienteId);
  }

  public inserirRegistoKyc(registo: RegistoKyc): void {
    const stmt = this.db.prepare(`
      INSERT INTO kyc_registos (
        id, cliente_id, estado_anterior, estado_novo, nivel_risco,
        decidido_por_id, decidido_por_nome, motivo, momento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      registo.id,
      registo.clienteId,
      registo.estadoAnterior,
      registo.estadoNovo,
      registo.nivelRisco,
      registo.decididoPorId,
      registo.decididoPorNome,
      registo.motivo ?? null,
      registo.momento
    );
  }

  public obterHistoricoKyc(clienteId: string): RegistoKyc[] {
    const stmt = this.db.prepare(`
      SELECT * FROM kyc_registos 
      WHERE cliente_id = ? 
      ORDER BY momento DESC
    `);
    const rows = stmt.all(clienteId) as unknown as RegistoKycRow[];

    return rows.map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      estadoAnterior: r.estado_anterior as EstadoKyc,
      estadoNovo: r.estado_novo as EstadoKyc,
      nivelRisco: r.nivel_risco as NivelRisco,
      decididoPorId: r.decidido_por_id,
      decididoPorNome: r.decidido_por_nome,
      motivo: r.motivo,
      momento: r.momento,
    }));
  }

  public obterContadoresKyc(): {
    pendentes: number;
    emAnalise: number;
    aprovados: number;
    rejeitados: number;
    actualizacaoNecessaria: number;
    total: number;
  } {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado_kyc = 'pendente' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN estado_kyc = 'em_analise' THEN 1 ELSE 0 END) as emAnalise,
        SUM(CASE WHEN estado_kyc = 'aprovado' THEN 1 ELSE 0 END) as aprovados,
        SUM(CASE WHEN estado_kyc = 'rejeitado' THEN 1 ELSE 0 END) as rejeitados,
        SUM(CASE WHEN estado_kyc = 'actualizacao_necessaria' THEN 1 ELSE 0 END) as actualizacaoNecessaria
      FROM clientes
    `);
    const row = stmt.get() as any;

    return {
      pendentes: Number(row?.pendentes ?? 0),
      emAnalise: Number(row?.emAnalise ?? 0),
      aprovados: Number(row?.aprovados ?? 0),
      rejeitados: Number(row?.rejeitados ?? 0),
      actualizacaoNecessaria: Number(row?.actualizacaoNecessaria ?? 0),
      total: Number(row?.total ?? 0),
    };
  }

  public obterDetalhesCompletosCliente(clienteId: string): {
    cliente: Cliente;
    cambios: any[];
    remessas: any[];
    documentos: any[];
    historicoKyc: RegistoKyc[];
    sessoesAtivas: any[];
    inconsistenciasKyc: string[];
  } | null {
    const cliente = this.buscarPorId(clienteId);
    if (!cliente) return null;

    // 1. Operações cambiais do balcão e portal
    let cambios: any[] = [];
    try {
      cambios = this.db.prepare(`
        SELECT id, tipo_operacao as tipo, moeda_origem as moedaOrigem, montante_origem as montanteOrigem,
               moeda_destino as moedaDestino, montante_destino as montanteDestino, taxa_cambio as taxaCambio,
               estado, criado_em as criadoEm
        FROM operacoes_cambio
        WHERE cliente_id = ?
        ORDER BY criado_em DESC LIMIT 20
      `).all(clienteId) as any[];
    } catch {
      // Tabela pode ter nomes de campos ligeiramente diferentes
    }

    // 2. Pedidos do portal do cliente (se houver)
    let remessas: any[] = [];
    try {
      remessas = this.db.prepare(`
        SELECT id, beneficiario_nome as beneficiarioNome, pais_destino as paisDestino,
               moeda_envio as moedaEnvio, montante_envio as montanteEnvio,
               moeda_recebimento as moedaRecebimento, montante_recebimento as montanteRecebimento,
               comissao, estado, criado_em as criadoEm
        FROM portal_pedidos_remessa
        WHERE cliente_id = ?
        ORDER BY criado_em DESC LIMIT 20
      `).all(clienteId) as any[];
    } catch {
      // Ignora se tabela ainda não tiver dados
    }

    // 3. Documentos anexados
    let documentos: any[] = [];
    try {
      documentos = this.db.prepare(`
        SELECT id, tipo_documento as tipoDocumento, nome_arquivo as nomeArquivo,
               tamanho_bytes as tamanhoBytes, mime_type as mimeType, estado_validacao as estadoValidacao,
               enviado_em as enviadoEm
        FROM kyc_documentos
        WHERE cliente_id = ?
        ORDER BY enviado_em DESC
      `).all(clienteId) as any[];
    } catch {}

    // 4. Sessões ativas de portal do cliente
    let sessoesAtivas: any[] = [];
    try {
      sessoesAtivas = this.db.prepare(`
        SELECT id, criado_em as criadoEm, expira_em as expiraEm, ip, user_agent as userAgent,
               impersonado_por as impersonadoPor
        FROM portal_sessoes_cliente
        WHERE cliente_id = ? AND revogado_em IS NULL AND expira_em > datetime('now')
        ORDER BY criado_em DESC
      `).all(clienteId) as any[];
    } catch {}

    const historicoKyc = this.obterHistoricoKyc(clienteId);

    // 5. Verificação automática de inconsistências KYC
    const inconsistenciasKyc: string[] = [];

    // Validar idade (menor de 18 anos)
    if (cliente.dataNascimento) {
      const dataNasc = new Date(cliente.dataNascimento);
      const hoje = new Date();
      let idade = hoje.getFullYear() - dataNasc.getFullYear();
      const m = hoje.getMonth() - dataNasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) idade--;
      if (idade < 18) {
        inconsistenciasKyc.push(`Cliente menor de idade (${idade} anos). Requer autorização de tutor legal.`);
      }
    }

    // Validar expiração de documento
    if (cliente.documentoValidade) {
      const validade = new Date(cliente.documentoValidade);
      const hoje = new Date();
      if (validade.getTime() < hoje.getTime()) {
        inconsistenciasKyc.push(`Documento de identificação EXPIRADO em ${cliente.documentoValidade}.`);
      } else {
        const diasParaExpirar = Math.floor((validade.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
        if (diasParaExpirar <= 30) {
          inconsistenciasKyc.push(`Documento a expirar em breve (${diasParaExpirar} dias restantes).`);
        }
      }
    }

    // Alerta PEP
    if (cliente.pep) {
      inconsistenciasKyc.push("Pessoa Exposta Politicamente (PEP) declarada. Exige diligência reforçada (EDD).");
    }

    // Residência estrangeira
    if (cliente.paisResidencia && cliente.paisResidencia !== "AO") {
      inconsistenciasKyc.push(`Residência fiscal declarada fora de Angola (${cliente.paisResidencia}).`);
    }

    // Falta de documentos obrigatórios
    const tiposDocs = documentos.map((d) => d.tipoDocumento);
    if (!tiposDocs.includes("bi_frente") && !tiposDocs.includes("passaporte")) {
      inconsistenciasKyc.push("Documento de identificação primário (BI ou Passaporte) não anexado.");
    }

    return {
      cliente,
      cambios,
      remessas,
      documentos,
      historicoKyc,
      sessoesAtivas,
      inconsistenciasKyc,
    };
  }
}
