import { randomBytes, randomUUID } from "node:crypto";
import { decimal, D } from "@nzaidi/dominio";
import type { DatabaseSync } from "node:sqlite";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type { ClientesRepository } from "../identidade-kyc/clientes.repository.js";
import type { DocumentosKycService } from "../identidade-kyc/documentos.service.js";
import type { TaxasService } from "../taxas-cambio/taxas.service.js";
import { hashSenha, verificarSenha } from "../autenticacao/hash.js";
import {
  ErroAutenticacao,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from "../../plugins/erros.js";
import type { PortalClienteRepository } from "./portal.repository.js";
import type {
  RegistoClienteInput,
  LoginClienteInput,
  CriarPedidoCambioInput,
  CriarPedidoRemessaInput,
  PedidoCambio,
  PedidoRemessa,
} from "./portal.types.js";
import type { Cliente, DocumentoKyc, UploadDocumentoInput } from "../identidade-kyc/clientes.types.js";

export class PortalClienteService {
  constructor(
    private db: DatabaseSync,
    private portalRepo: PortalClienteRepository,
    private clientesRepo: ClientesRepository,
    private documentosService: DocumentosKycService,
    private taxasService: TaxasService,
    private auditoriaRepo: AuditoriaRepository
  ) {}

  public async registarCliente(
    input: RegistoClienteInput,
    ip?: string | null,
    userAgent?: string | null
  ): Promise<{ cliente: Cliente; token: string }> {
    // 1. Verificar se o e-mail já existe nas credenciais
    const credencialExistente = this.portalRepo.buscarCredencialPorEmail(input.email);
    if (credencialExistente) {
      throw new ErroConflito("Já existe uma conta registada com este endereço de e-mail.");
    }

    // 2. Verificar se o cliente já existe na base de dados (por documento ou NIF)
    let cliente = this.clientesRepo.buscarPorDocumento(input.tipoDocumento, input.numeroDocumento);
    if (!cliente) {
      cliente = this.clientesRepo.buscarPorNif(input.nif);
    }

    if (cliente) {
      // Se cliente já existe e já tem credencial associada
      const cred = this.portalRepo.buscarCredencialPorClienteId(cliente.id);
      if (cred) {
        throw new ErroConflito(
          "Já existe um registo digital associado ao seu documento. Por favor, inicie sessão."
        );
      }
    } else {
      // Inserir novo cliente no repositório de clientes
      const agora = new Date().toISOString();
      const novoCliente: Cliente = {
        id: `cli_${randomUUID()}`,
        tipo: input.tipoPessoa,
        nome: input.nome.trim(),
        tipoDocumento: input.tipoDocumento,
        numeroDocumento: input.numeroDocumento.trim(),
        nif: input.nif.trim(),
        nacionalidade: input.nacionalidade.toUpperCase(),
        telefone: input.telefone.trim(),
        email: input.email.trim().toLowerCase(),
        morada: input.endereco.trim(),
        estado: "ativo",
        estadoKyc: "pendente",
        nivelRisco: "baixo",
        criadoEm: agora,
        atualizadoEm: agora,
      };
      this.clientesRepo.inserir(novoCliente);
      cliente = novoCliente;
    }

    // 3. Gerar hash scrypt seguro da palavra-passe
    const senhaHash = await hashSenha(input.senha);

    // 4. Criar credenciais de acesso
    this.portalRepo.criarCredencial(
      cliente.id,
      input.email.trim().toLowerCase(),
      input.telefone.trim(),
      senhaHash
    );

    // 5. Gerar Sessão de Acesso (24 Horas)
    const rawToken = randomBytes(32).toString("hex");
    this.portalRepo.criarSessao(cliente.id, rawToken, 24, ip, userAgent);

    // 6. Auditoria de Registo
    this.auditoriaRepo.registar({
      autorId: cliente.id,
      autorNome: cliente.nome,
      autorFuncao: "cliente",
      acao: "PORTAL_CLIENTE_REGISTO",
      recurso: "clientes",
      recursoId: cliente.id,
      detalhes: {
        email: input.email,
        tipoDocumento: input.tipoDocumento,
      },
      ip: ip ?? null,
    });

    return { cliente, token: rawToken };
  }

  public async loginCliente(
    input: LoginClienteInput,
    ip?: string | null,
    userAgent?: string | null
  ): Promise<{ cliente: Cliente; token: string }> {
    const credencial = this.portalRepo.buscarCredencialPorEmail(input.email);
    if (!credencial) {
      throw new ErroAutenticacao("Credenciais inválidas. Verifique o e-mail e a palavra-passe.");
    }

    const senhaCorreta = await verificarSenha(input.senha, credencial.senhaHash);
    if (!senhaCorreta) {
      throw new ErroAutenticacao("Credenciais inválidas. Verifique o e-mail e a palavra-passe.");
    }

    const cliente = this.clientesRepo.buscarPorId(credencial.clienteId);
    if (!cliente) {
      throw new ErroNaoEncontrado("Registo de cliente não localizado.");
    }

    if (cliente.estado === "bloqueado") {
      throw new ErroAutenticacao("A sua conta encontra-se temporariamente suspensa por motivos de segurança.");
    }

    // Gerar Sessão (24 Horas)
    const rawToken = randomBytes(32).toString("hex");
    this.portalRepo.criarSessao(cliente.id, rawToken, 24, ip, userAgent);

    // Auditoria
    this.auditoriaRepo.registar({
      autorId: cliente.id,
      autorNome: cliente.nome,
      autorFuncao: "cliente",
      acao: "PORTAL_CLIENTE_LOGIN",
      recurso: "sessoes_clientes",
      recursoId: cliente.id,
      detalhes: { email: input.email },
      ip: ip ?? null,
    });

    return { cliente, token: rawToken };
  }

  public encerrarSessao(rawToken: string, clienteId: string): void {
    this.portalRepo.removerSessao(rawToken);
    this.auditoriaRepo.registar({
      autorId: clienteId,
      autorNome: "Cliente Portal",
      autorFuncao: "cliente",
      acao: "PORTAL_CLIENTE_LOGOUT",
      recurso: "sessoes_clientes",
      recursoId: clienteId,
      detalhes: {},
      ip: null,
    });
  }

  public obterPerfil(clienteId: string): {
    cliente: Cliente;
    credencial: { email: string; telefone: string | null };
    estatisticas: {
      pedidosCambioTotal: number;
      pedidosRemessaTotal: number;
      documentosTotal: number;
    };
  } {
    const cliente = this.clientesRepo.buscarPorId(clienteId);
    if (!cliente) {
      throw new ErroNaoEncontrado("Cliente não encontrado.");
    }

    const cred = this.portalRepo.buscarCredencialPorClienteId(clienteId);
    const pedidosCambio = this.portalRepo.listarPedidosCambioPorCliente(clienteId);
    const pedidosRemessas = this.portalRepo.listarPedidosRemessaPorCliente(clienteId);
    const docs = this.documentosService.listarDocumentos(clienteId);

    return {
      cliente,
      credencial: {
        email: cred ? cred.email : (cliente.email ?? ""),
        telefone: cred ? cred.telefone : cliente.telefone,
      },
      estatisticas: {
        pedidosCambioTotal: pedidosCambio.length,
        pedidosRemessaTotal: pedidosRemessas.length,
        documentosTotal: docs.length,
      },
    };
  }

  // --- Documentos KYC do Cliente ---

  public submeterDocumento(
    clienteId: string,
    dados: UploadDocumentoInput,
    ip?: string | null
  ): DocumentoKyc {
    const cliente = this.clientesRepo.buscarPorId(clienteId);
    if (!cliente) {
      throw new ErroNaoEncontrado("Cliente não encontrado.");
    }

    const doc = this.documentosService.salvarDocumento(
      clienteId,
      dados,
      {
        id: cliente.id,
        nome: cliente.nome,
        funcao: "cliente",
        ip: ip ?? null,
      }
    );

    // Se o cliente estava pendente ou rejeitado, coloca em análise
    if (cliente.estadoKyc === "pendente" || cliente.estadoKyc === "actualizacao_necessaria") {
      const stmt = this.db.prepare(`
        UPDATE clientes 
        SET estado_kyc = 'em_analise', atualizado_em = ?
        WHERE id = ?
      `);
      stmt.run(new Date().toISOString(), clienteId);
    }

    return doc;
  }

  public listarDocumentos(clienteId: string): DocumentoKyc[] {
    return this.documentosService.listarDocumentos(clienteId);
  }

  public obterDocumento(clienteId: string, docId: string): DocumentoKyc {
    const doc = this.documentosService.obterDocumento(docId);
    if (doc.clienteId !== clienteId) {
      throw new ErroNaoEncontrado("Documento não encontrado ou sem permissão de acesso.");
    }
    return doc;
  }

  public lerArquivoDocumento(clienteId: string, docId: string, ip?: string | null): { doc: DocumentoKyc; buffer: Buffer } {
    const doc = this.documentosService.obterDocumento(docId);
    if (doc.clienteId !== clienteId) {
      throw new ErroNaoEncontrado("Documento não encontrado ou sem permissão de acesso.");
    }

    return this.documentosService.lerConteudoDocumento(docId, {
      id: clienteId,
      nome: "Cliente Portal",
      funcao: "cliente",
      ip: ip ?? null,
    });
  }

  // --- Pedidos de Câmbio ---

  public criarPedidoCambio(
    clienteId: string,
    input: CriarPedidoCambioInput,
    ip?: string | null
  ): PedidoCambio {
    const cliente = this.clientesRepo.buscarPorId(clienteId);
    if (!cliente) {
      throw new ErroNaoEncontrado("Cliente não encontrado.");
    }

    // Obter cotação atualizada oficial
    const taxas = this.taxasService.obterTaxaCalculada(input.moeda);
    const taxaAplicadaStr = input.tipoOperacao === "compra" ? taxas.compra : taxas.venda;
    const taxaAplicada = decimal(taxaAplicadaStr);
    const montanteDivisa = decimal(input.montanteDivisa);

    if (montanteDivisa.lte(0)) {
      throw new ErroValidacao("O montante de divisa deve ser estritamente superior a zero.");
    }

    const totalAoaEstimado = montanteDivisa.times(taxaAplicada).toFixed(2);

    const agora = new Date();
    const dataRef = agora.toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = randomBytes(3).toString("hex").toUpperCase();
    const pedidoId = `PED-CAM-${dataRef}-${randomHex}`;

    const pedido = this.portalRepo.criarPedidoCambio({
      id: pedidoId,
      clienteId,
      tipoOperacao: input.tipoOperacao,
      moeda: input.moeda,
      montanteDivisa: montanteDivisa.toFixed(2),
      taxaProposta: taxaAplicada.toFixed(4),
      totalAoaEstimado,
      finalidade: input.finalidade.trim(),
      estado: "pendente",
      motivoRejeicao: null,
      operacaoId: null,
    });

    this.auditoriaRepo.registar({
      autorId: cliente.id,
      autorNome: cliente.nome,
      autorFuncao: "cliente",
      acao: "PEDIDO_CAMBIO_CRIADO",
      recurso: "pedidos_cambio",
      recursoId: pedido.id,
      detalhes: {
        tipoOperacao: input.tipoOperacao,
        moeda: input.moeda,
        montanteDivisa: pedido.montanteDivisa,
        totalAoaEstimado: pedido.totalAoaEstimado,
      },
      ip: ip ?? null,
    });

    return pedido;
  }

  public listarPedidosCambio(clienteId: string): PedidoCambio[] {
    return this.portalRepo.listarPedidosCambioPorCliente(clienteId);
  }

  // --- Pedidos de Remessas Internacionais ---

  public criarPedidoRemessa(
    clienteId: string,
    input: CriarPedidoRemessaInput,
    ip?: string | null
  ): PedidoRemessa {
    const cliente = this.clientesRepo.buscarPorId(clienteId);
    if (!cliente) {
      throw new ErroNaoEncontrado("Cliente não encontrado.");
    }

    const taxas = this.taxasService.obterTaxaCalculada(input.moedaDestino);
    const taxaCambio = decimal(taxas.venda); // Venda da divisa para envio ao exterior
    const montanteDivisa = decimal(input.montanteDivisa);

    if (montanteDivisa.lte(0)) {
      throw new ErroValidacao("O montante a enviar deve ser superior a zero.");
    }

    // Comissão transparente de serviço: 2.0% (mínimo 2.500 AOA)
    const contravalorAoa = montanteDivisa.times(taxaCambio);
    const comissaoPercentual = contravalorAoa.times(0.02);
    const comissaoMinima = decimal("2500.00");
    const comissaoAoa = D.max(comissaoPercentual, comissaoMinima).toFixed(2);
    const totalAoa = contravalorAoa.plus(decimal(comissaoAoa)).toFixed(2);

    const agora = new Date();
    const dataRef = agora.toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = randomBytes(3).toString("hex").toUpperCase();
    const pedidoId = `PED-REM-${dataRef}-${randomHex}`;

    const pedido = this.portalRepo.criarPedidoRemessa({
      id: pedidoId,
      clienteId,
      beneficiarioNome: input.beneficiarioNome.trim(),
      beneficiarioPais: input.beneficiarioPais.trim(),
      beneficiarioIban: input.beneficiarioIban.trim(),
      beneficiarioBanco: input.beneficiarioBanco.trim(),
      beneficiarioSwift: input.beneficiarioSwift ? input.beneficiarioSwift.trim() : null,
      moedaDestino: input.moedaDestino,
      montanteDivisa: montanteDivisa.toFixed(2),
      taxaCambio: taxaCambio.toFixed(4),
      comissaoAoa,
      totalAoa,
      finalidade: input.finalidade.trim(),
      estado: "pendente_revisao",
      motivoRejeicao: null,
    });

    this.auditoriaRepo.registar({
      autorId: cliente.id,
      autorNome: cliente.nome,
      autorFuncao: "cliente",
      acao: "PEDIDO_REMESSA_CRIADO",
      recurso: "pedidos_remessas",
      recursoId: pedido.id,
      detalhes: {
        beneficiarioPais: input.beneficiarioPais,
        moedaDestino: input.moedaDestino,
        montanteDivisa: pedido.montanteDivisa,
        totalAoa: pedido.totalAoa,
      },
      ip: ip ?? null,
    });

    return pedido;
  }

  public listarPedidosRemessa(clienteId: string): PedidoRemessa[] {
    return this.portalRepo.listarPedidosRemessaPorCliente(clienteId);
  }
}
