import type { SuporteRepository } from "./suporte.repository.js";
import type { ClientesRepository } from "../identidade-kyc/clientes.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { ErroNaoEncontrado, ErroValidacao } from "../../plugins/erros.js";
import type {
  CriarAtendimentoInput,
  EnviarMensagemInput,
  AtendimentoSuporte,
  MensagemSuporte,
  EstadoAtendimento,
} from "./suporte.types.js";
import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export class SuporteService {
  constructor(
    private suporteRepo: SuporteRepository,
    private clientesRepo: ClientesRepository,
    private auditoriaRepo: AuditoriaRepository,
    private db: DatabaseSync
  ) {}

  public criarAtendimentoCliente(
    clienteId: string,
    input: CriarAtendimentoInput,
    ip?: string | null
  ): { atendimento: AtendimentoSuporte; mensagemInicial: MensagemSuporte } {
    const cliente = this.clientesRepo.buscarPorId(clienteId);
    if (!cliente) throw new ErroNaoEncontrado("Cliente não encontrado.");

    const res = this.suporteRepo.criarAtendimento(clienteId, input, cliente.nome);

    // Criar notificação para a equipa administrativa
    const notifId = crypto.randomUUID();
    const agora = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO notificacoes_sistema (
        id, destinatario_tipo, destinatario_id, categoria, titulo, mensagem, link_acao, lida, prioridade, criado_em
      ) VALUES (?, 'admin_geral', NULL, 'comunicacao', ?, ?, ?, 0, 'normal', ?);
    `).run(
      notifId,
      `Novo Atendimento: ${input.assunto}`,
      `O cliente ${cliente.nome} iniciou uma conversa de suporte sobre "${input.assunto}".`,
      `#suporte`,
      agora
    );

    this.auditoriaRepo.registar({
      autorId: clienteId,
      acao: "CRIAR_ATENDIMENTO_SUPORTE",
      recurso: "suporte_atendimentos",
      recursoId: res.atendimento.id,
      ip: ip || undefined,
      detalhes: { assunto: input.assunto, categoria: input.categoria },
    });

    return res;
  }

  public listarAtendimentosCliente(clienteId: string): AtendimentoSuporte[] {
    return this.suporteRepo.listarAtendimentosCliente(clienteId);
  }

  public obterMensagensCliente(atendimentoId: string, clienteId: string): MensagemSuporte[] {
    const atendimento = this.suporteRepo.buscarAtendimentoPorId(atendimentoId);
    if (!atendimento || atendimento.clienteId !== clienteId) {
      throw new ErroNaoEncontrado("Atendimento não encontrado ou não pertence a este cliente.");
    }
    return this.suporteRepo.listarMensagens(atendimentoId, "cliente");
  }

  public enviarMensagemCliente(
    atendimentoId: string,
    clienteId: string,
    input: EnviarMensagemInput
  ): MensagemSuporte {
    const atendimento = this.suporteRepo.buscarAtendimentoPorId(atendimentoId);
    if (!atendimento || atendimento.clienteId !== clienteId) {
      throw new ErroNaoEncontrado("Atendimento não encontrado.");
    }

    if (atendimento.estado === "encerrado") {
      // Reabrir conversa se o cliente enviar nova mensagem
      this.suporteRepo.alterarEstado(atendimentoId, "em_atendimento");
    }

    const cliente = this.clientesRepo.buscarPorId(clienteId);
    const msg = this.suporteRepo.adicionarMensagem({
      atendimentoId,
      remetenteTipo: "cliente",
      remetenteId: clienteId,
      remetenteNome: cliente?.nome || "Cliente",
      mensagem: input.mensagem,
      anexoNome: input.anexoNome,
      anexoTipo: input.anexoTipo,
      anexoBase64: input.anexoBase64,
    });

    return msg;
  }

  // --- Operações Administrativas ---

  public listarAtendimentosAdmin(filtros?: {
    estado?: EstadoAtendimento | undefined;
    operadorId?: string | undefined;
    semOperador?: boolean | undefined;
  }): AtendimentoSuporte[] {
    return this.suporteRepo.listarAtendimentosAdmin(filtros);
  }

  public obterAtendimentoAdmin(atendimentoId: string): {
    atendimento: AtendimentoSuporte;
    mensagens: MensagemSuporte[];
  } {
    const atendimento = this.suporteRepo.buscarAtendimentoPorId(atendimentoId);
    if (!atendimento) throw new ErroNaoEncontrado("Atendimento não encontrado.");

    const mensagens = this.suporteRepo.listarMensagens(atendimentoId, "operador");
    return { atendimento, mensagens };
  }

  public assumirAtendimento(
    atendimentoId: string,
    operadorId: string,
    operadorNome: string
  ): AtendimentoSuporte {
    const atendimento = this.suporteRepo.buscarAtendimentoPorId(atendimentoId);
    if (!atendimento) throw new ErroNaoEncontrado("Atendimento não encontrado.");

    this.suporteRepo.atribuirOperador(atendimentoId, operadorId, operadorNome);

    // Mensagem de sistema no chat
    this.suporteRepo.adicionarMensagem({
      atendimentoId,
      remetenteTipo: "sistema",
      remetenteId: "sistema",
      remetenteNome: "NZAIDI Suporte",
      mensagem: `O operador ${operadorNome} assumiu este atendimento e dará continuidade ao suporte.`,
    });

    // Notificar cliente
    const notifId = crypto.randomUUID();
    const agora = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO notificacoes_sistema (
        id, destinatario_tipo, destinatario_id, categoria, titulo, mensagem, link_acao, lida, prioridade, criado_em
      ) VALUES (?, 'cliente', ?, 'comunicacao', ?, ?, ?, 0, 'normal', ?);
    `).run(
      notifId,
      atendimento.clienteId,
      "Atendimento em curso",
      `O operador ${operadorNome} assumiu a sua conversa sobre "${atendimento.assunto}".`,
      `#suporte`,
      agora
    );

    return this.suporteRepo.buscarAtendimentoPorId(atendimentoId)!;
  }

  public transferirAtendimento(
    atendimentoId: string,
    novoOperadorId: string,
    novoOperadorNome: string,
    operadorAtualNome: string
  ): AtendimentoSuporte {
    const atendimento = this.suporteRepo.buscarAtendimentoPorId(atendimentoId);
    if (!atendimento) throw new ErroNaoEncontrado("Atendimento não encontrado.");

    this.suporteRepo.atribuirOperador(atendimentoId, novoOperadorId, novoOperadorNome);

    this.suporteRepo.adicionarMensagem({
      atendimentoId,
      remetenteTipo: "sistema",
      remetenteId: "sistema",
      remetenteNome: "NZAIDI Suporte",
      mensagem: `Atendimento transferido por ${operadorAtualNome} para ${novoOperadorNome}.`,
    });

    return this.suporteRepo.buscarAtendimentoPorId(atendimentoId)!;
  }

  public alterarEstadoAtendimento(
    atendimentoId: string,
    novoEstado: EstadoAtendimento,
    operadorNome: string
  ): AtendimentoSuporte {
    const atendimento = this.suporteRepo.buscarAtendimentoPorId(atendimentoId);
    if (!atendimento) throw new ErroNaoEncontrado("Atendimento não encontrado.");

    this.suporteRepo.alterarEstado(atendimentoId, novoEstado);

    let mensagemSistema = `Estado alterado para ${novoEstado} por ${operadorNome}.`;
    if (novoEstado === "resolvido") {
      mensagemSistema = `O operador ${operadorNome} marcou esta solicitação como resolvida. Se precisar de esclarecimentos adicionais, basta responder a esta conversa.`;
    } else if (novoEstado === "encerrado") {
      mensagemSistema = `Atendimento concluído e encerrado por ${operadorNome}.`;
    }

    this.suporteRepo.adicionarMensagem({
      atendimentoId,
      remetenteTipo: "sistema",
      remetenteId: "sistema",
      remetenteNome: "NZAIDI Suporte",
      mensagem: mensagemSistema,
    });

    return this.suporteRepo.buscarAtendimentoPorId(atendimentoId)!;
  }

  public enviarMensagemOperador(
    atendimentoId: string,
    operadorId: string,
    operadorNome: string,
    input: EnviarMensagemInput
  ): MensagemSuporte {
    const atendimento = this.suporteRepo.buscarAtendimentoPorId(atendimentoId);
    if (!atendimento) throw new ErroNaoEncontrado("Atendimento não encontrado.");

    const msg = this.suporteRepo.adicionarMensagem({
      atendimentoId,
      remetenteTipo: "operador",
      remetenteId: operadorId,
      remetenteNome: operadorNome,
      mensagem: input.mensagem,
      anexoNome: input.anexoNome,
      anexoTipo: input.anexoTipo,
      anexoBase64: input.anexoBase64,
    });

    // Notificar cliente sobre nova resposta
    const notifId = crypto.randomUUID();
    const agora = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO notificacoes_sistema (
        id, destinatario_tipo, destinatario_id, categoria, titulo, mensagem, link_acao, lida, prioridade, criado_em
      ) VALUES (?, 'cliente', ?, 'comunicacao', ?, ?, ?, 0, 'alta', ?);
    `).run(
      notifId,
      atendimento.clienteId,
      "Nova resposta do Suporte NZAIDI",
      `${operadorNome}: ${input.mensagem.slice(0, 80)}${input.mensagem.length > 80 ? "..." : ""}`,
      `#suporte`,
      agora
    );

    return msg;
  }
}
