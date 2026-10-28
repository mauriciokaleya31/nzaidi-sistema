import { randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { decimal } from "@nzaidi/dominio";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { hashSenha, verificarSenha } from "../autenticacao/hash.js";
import {
  ErroAutenticacao,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from "../../plugins/erros.js";
import type { ParceirosRepository } from "./parceiros.repository.js";
import { FabricaAdaptadoresParceiros } from "./adaptadores/fabrica.adaptadores.js";
import type { AdaptadorIntegracaoParceiro } from "./adaptadores/adaptador.interface.js";
import type {
  Parceiro,
  UsuarioParceiro,
  OperacaoParceiro,
  ResumoDashboardParceiro,
  RelatorioReconciliacao,
  ReconciliacaoItem,
  LoginParceiroSchema,
  RegistoParceiroPortalSchema,
  LiquidarOperacaoSchema,
  DevolverOperacaoSchema,
  SubmeterLoteReconciliacaoSchema,
  CriarParceiroSchema,
  EditarParceiroSchema,
  EstadoParceiro,
} from "./parceiros.types.js";
import { z } from "zod";

export class ParceirosService {
  private fabricaAdaptadores = new FabricaAdaptadoresParceiros();

  constructor(
    private db: DatabaseSync,
    private parceirosRepo: ParceirosRepository,
    private auditoriaRepo: AuditoriaRepository
  ) {}

  // ==========================================
  // AUTENTICAÇÃO E SESSÕES DE PARCEIROS
  // ==========================================

  public async loginParceiro(
    input: z.infer<typeof LoginParceiroSchema>,
    ip?: string | null,
    userAgent?: string | null
  ): Promise<{ usuario: Omit<UsuarioParceiro, "senhaHash">; parceiro: Parceiro; token: string }> {
    const usuario = this.parceirosRepo.buscarUsuarioPorEmail(input.email);
    if (!usuario || !usuario.ativo) {
      throw new ErroAutenticacao("Credenciais de parceiro inválidas ou acesso inativo.");
    }

    const parceiro = this.parceirosRepo.buscarParceiroPorId(usuario.parceiroId);
    if (!parceiro || parceiro.estado !== "ativo") {
      if (parceiro?.estado === "suspenso") {
        let motivoSusp = "Suspensão administrativa preventiva de conformidade e auditoria.";
        try {
          const rowP = this.db.prepare("SELECT suspenso_motivo FROM parceiros WHERE id = ?").get(parceiro.id) as { suspenso_motivo?: string | null } | undefined;
          if (rowP?.suspenso_motivo) motivoSusp = rowP.suspenso_motivo;
        } catch {}
        throw new ErroAutenticacao(
          `CONTA SUSPENSA / BLOQUEADA: A conta da entidade parceira encontra-se suspensa. Motivo registado: "${motivoSusp}". Contacte a Direção de Operações NZAIDI.`
        );
      }
      throw new ErroAutenticacao("Entidade parceira não autorizada a operar.");
    }

    const senhaCorreta = await verificarSenha(input.senha, usuario.senhaHash);
    if (!senhaCorreta) {
      throw new ErroAutenticacao("Credenciais de parceiro inválidas.");
    }

    const rawToken = randomBytes(32).toString("hex");
    this.parceirosRepo.criarSessao(parceiro.id, usuario.id, rawToken, 24, ip, userAgent);
    this.parceirosRepo.atualizarUltimoLoginUsuario(usuario.id);

    this.auditoriaRepo.registar({
      autorId: usuario.id,
      autorNome: usuario.nome,
      autorFuncao: usuario.funcao,
      acao: "PARCEIRO_LOGIN",
      recurso: "parceiros",
      recursoId: parceiro.id,
      detalhes: {
        parceiroCodigo: parceiro.codigo,
        parceiroNome: parceiro.nome,
        usuarioEmail: usuario.email,
      },
      ip: ip ?? null,
    });

    const { senhaHash: _, ...usuarioLimpo } = usuario;
    return {
      usuario: usuarioLimpo,
      parceiro,
      token: rawToken,
    };
  }

  public async registarParceiroPortal(
    input: z.infer<typeof RegistoParceiroPortalSchema>,
    ip?: string | null,
    userAgent?: string | null
  ): Promise<{ usuario: Omit<UsuarioParceiro, "senhaHash">; parceiro: Parceiro; token: string }> {
    const emailNorm = input.emailCorporativo.trim().toLowerCase();
    const usuarioExistente = this.parceirosRepo.buscarUsuarioPorEmail(emailNorm);
    if (usuarioExistente) {
      throw new ErroConflito(`O endereço de e-mail '${emailNorm}' já possui conta registada no Portal dos Parceiros.`);
    }

    const baseCod = (input.codigoSugerido || input.nomeEntidade)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8);
    let codigoFinal = `PARC-${baseCod || "ENT"}-${Math.floor(100 + Math.random() * 900)}`;
    if (this.parceirosRepo.buscarParceiroPorCodigo(codigoFinal)) {
      codigoFinal = `PARC-${baseCod || "ENT"}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const parceiroId = `parc_${randomUUID()}`;
    const parceiro = this.parceirosRepo.criarParceiro({
      id: parceiroId,
      codigo: codigoFinal,
      nome: input.nomeEntidade.trim(),
      tipo: input.tipo,
      canaisSuportados: input.canaisSuportados.length ? input.canaisSuportados : ["transferencia_bancaria", "sepa"],
      comissaoPercentual: "0.50",
      limiteDiarioAoa: "50000000.00",
      estado: "ativo",
      chaveApi: randomBytes(24).toString("hex"),
    });

    const senhaHash = await hashSenha(input.senha);
    const usuarioId = `usr_parc_${randomUUID()}`;
    const usuario = this.parceirosRepo.criarUsuarioParceiro({
      id: usuarioId,
      parceiroId: parceiro.id,
      nome: input.nomeResponsavel.trim(),
      email: emailNorm,
      senhaHash,
      funcao: "gestor_parceiro",
    });

    const rawToken = randomBytes(32).toString("hex");
    this.parceirosRepo.criarSessao(parceiro.id, usuario.id, rawToken, 24, ip, userAgent);
    this.parceirosRepo.atualizarUltimoLoginUsuario(usuario.id);

    this.auditoriaRepo.registar({
      autorId: usuario.id,
      autorNome: usuario.nome,
      autorFuncao: usuario.funcao,
      acao: "PARCEIRO_REGISTO_PORTAL",
      recurso: "parceiros",
      recursoId: parceiro.id,
      detalhes: {
        parceiroCodigo: parceiro.codigo,
        parceiroNome: parceiro.nome,
        emailCorporativo: emailNorm,
      },
      ip: ip ?? null,
    });

    const { senhaHash: _, ...usuarioLimpo } = usuario;
    return {
      usuario: usuarioLimpo,
      parceiro,
      token: rawToken,
    };
  }

  public encerrarSessao(token: string, usuarioId: string, parceiroId: string): void {
    this.parceirosRepo.revogarSessao(token);
    this.auditoriaRepo.registar({
      autorId: usuarioId,
      autorNome: "Operador Parceiro",
      autorFuncao: "parceiro",
      acao: "PARCEIRO_LOGOUT",
      recurso: "sessoes_parceiros",
      recursoId: parceiroId,
      detalhes: { motivo: "Encerramento manual de sessão do parceiro" },
    });
  }

  public recuperarAcesso(email: string, ip?: string | null): { sucesso: boolean; mensagem: string } {
    const usuario = this.parceirosRepo.buscarUsuarioPorEmail(email);
    if (usuario) {
      this.auditoriaRepo.registar({
        autorId: usuario.id,
        autorNome: usuario.nome,
        autorFuncao: usuario.funcao,
        acao: "PARCEIRO_RECUPERAR_SENHA_SOLICITADA",
        recurso: "usuarios_parceiros",
        recursoId: usuario.id,
        detalhes: { email: usuario.email },
        ip: ip ?? null,
      });
    }

    return {
      sucesso: true,
      mensagem: "Se o endereço de e-mail estiver registado, as instruções de recuperação foram emitidas.",
    };
  }

  // ==========================================
  // DASHBOARD E INDICADORES
  // ==========================================

  public obterDashboardResumo(parceiroId: string): ResumoDashboardParceiro {
    const parceiro = this.parceirosRepo.buscarParceiroPorId(parceiroId);
    if (!parceiro) {
      throw new ErroNaoEncontrado("Entidade parceira não localizada.");
    }

    const metricas = this.parceirosRepo.obterMetricasDashboard(parceiroId);
    const recentes = this.parceirosRepo.listarOperacoesPorParceiro(parceiroId, { limite: 8 }).itens;

    const adaptadores = this.fabricaAdaptadores.listarAdaptadores().map((a: AdaptadorIntegracaoParceiro) => ({
      canal: a.canal,
      nome: a.nome,
      modo: a.modo,
      configurado: a.configurado,
      status: a.configurado ? "Ligado à API" : "Modo Assistido / Piloto",
    }));

    return {
      parceiro: {
        id: parceiro.id,
        codigo: parceiro.codigo,
        nome: parceiro.nome,
        tipo: parceiro.tipo,
        canaisSuportados: parceiro.canaisSuportados,
        comissaoPercentual: parceiro.comissaoPercentual,
        limiteDiarioAoa: parceiro.limiteDiarioAoa,
      },
      metricas,
      adaptadores,
      recentes,
    };
  }

  // ==========================================
  // OPERAÇÕES E LIQUIDAÇÕES (ISOLAMENTO MULTITENANT)
  // ==========================================

  public listarOperacoes(
    parceiroId: string,
    filtros: {
      estado?: string | undefined;
      canal?: string | undefined;
      moeda?: string | undefined;
      busca?: string | undefined;
      limite?: number | undefined;
      offset?: number | undefined;
    }
  ): { total: number; itens: OperacaoParceiro[] } {
    return this.parceirosRepo.listarOperacoesPorParceiro(parceiroId, filtros);
  }

  public obterDetalheOperacao(id: string, parceiroId: string): OperacaoParceiro {
    const op = this.parceirosRepo.buscarOperacaoPorId(id, parceiroId);
    if (!op) {
      throw new ErroNaoEncontrado("Operação não encontrada ou sem autorização de consulta.");
    }
    return op;
  }

  public confirmarRecepcao(
    id: string,
    parceiroId: string,
    operador: { id: string; nome: string; funcao: string },
    notas?: string | undefined,
    ip?: string | null | undefined
  ): OperacaoParceiro {
    const op = this.obterDetalheOperacao(id, parceiroId);

    if (op.estado !== "pendente") {
      throw new ErroValidacao(
        `Apenas operações no estado 'pendente' podem ser confirmadas. Estado atual: '${op.estado}'.`
      );
    }

    const notasAtualizadas = notas ? (op.notas ? `${op.notas}\n[Confirmação]: ${notas}` : notas) : (op.notas ?? null);

    const sucesso = this.parceirosRepo.atualizarEstadoOperacao(id, parceiroId, "em_processamento", {
      notas: notasAtualizadas,
    });

    if (!sucesso) {
      throw new ErroValidacao("Não foi possível atualizar o estado da operação.");
    }

    // Se houver remessa vinculada, atualiza também a tabela de remessas
    if (op.remessaId) {
      try {
        const agora = new Date().toISOString();
        this.db
          .prepare("UPDATE pedidos_remessas SET estado = 'em_processamento', atualizado_em = ? WHERE id = ?")
          .run(agora, op.remessaId);
      } catch (err) {
        console.error("Aviso: falha ao atualizar pedidos_remessas vinculado:", err);
      }
    }

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "PARCEIRO_OPERACAO_CONFIRMADA",
      recurso: "operacoes_parceiros",
      recursoId: op.id,
      detalhes: {
        parceiroId,
        canal: op.canal,
        montante: op.montante,
        moeda: op.moeda,
      },
      ip: ip ?? null,
    });

    return this.obterDetalheOperacao(id, parceiroId);
  }

  public liquidarOperacao(
    id: string,
    parceiroId: string,
    operador: { id: string; nome: string; funcao: string },
    input: z.infer<typeof LiquidarOperacaoSchema>,
    ip?: string | null | undefined
  ): OperacaoParceiro {
    // Idempotência
    const existentePorIdempotencia = this.parceirosRepo.buscarOperacaoPorChaveIdempotencia(input.chaveIdempotencia);
    if (existentePorIdempotencia && existentePorIdempotencia.id === id && existentePorIdempotencia.estado === "liquidada") {
      return existentePorIdempotencia;
    }

    const op = this.obterDetalheOperacao(id, parceiroId);

    if (op.estado === "liquidada") {
      if (
        (op.chaveIdempotencia && op.chaveIdempotencia === input.chaveIdempotencia) ||
        (op.referenciaExterna && op.referenciaExterna === input.referenciaExterna.trim())
      ) {
        return op;
      }
      throw new ErroValidacao("Esta operação já se encontra devidamente liquidada.");
    }

    if (op.estado === "devolvida" || op.estado === "cancelada") {
      throw new ErroValidacao(`Não é possível liquidar uma operação com estado '${op.estado}'.`);
    }

    const agora = new Date().toISOString();
    const notasAtualizadas = input.notas ? (op.notas ? `${op.notas}\n[Liquidação]: ${input.notas}` : input.notas) : (op.notas ?? null);

    const sucesso = this.parceirosRepo.atualizarEstadoOperacao(id, parceiroId, "liquidada", {
      referenciaExterna: input.referenciaExterna.trim(),
      comprovativoArquivo: input.comprovativoArquivo ?? null,
      comprovativoHash: input.comprovativoHash ?? null,
      notas: notasAtualizadas,
      liquidadoEm: agora,
      chaveIdempotencia: input.chaveIdempotencia,
    });

    if (!sucesso) {
      throw new ErroValidacao("Falha ao registrar liquidação da operação.");
    }

    // Se houver remessa do portal vinculada, marcar como executada
    if (op.remessaId) {
      try {
        this.db
          .prepare("UPDATE pedidos_remessas SET estado = 'executada', atualizado_em = ? WHERE id = ?")
          .run(agora, op.remessaId);
      } catch (err) {
        console.error("Aviso: falha ao atualizar pedidos_remessas vinculado:", err);
      }
    }

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "PARCEIRO_OPERACAO_LIQUIDADA",
      recurso: "operacoes_parceiros",
      recursoId: op.id,
      detalhes: {
        parceiroId,
        canal: op.canal,
        referenciaExterna: input.referenciaExterna,
        montante: op.montante,
        moeda: op.moeda,
        comissaoParceiroAoa: op.comissaoParceiroAoa,
        chaveIdempotencia: input.chaveIdempotencia,
      },
      ip: ip ?? null,
    });

    return this.obterDetalheOperacao(id, parceiroId);
  }

  public devolverOperacao(
    id: string,
    parceiroId: string,
    operador: { id: string; nome: string; funcao: string },
    input: z.infer<typeof DevolverOperacaoSchema>,
    ip?: string | null | undefined
  ): OperacaoParceiro {
    const op = this.obterDetalheOperacao(id, parceiroId);

    if (op.estado === "liquidada") {
      throw new ErroValidacao("Não é permitido devolver uma operação já liquidada pelo parceiro.");
    }

    const agora = new Date().toISOString();
    const notasAtualizadas = input.notas ? (op.notas ? `${op.notas}\n[Devolução]: ${input.notas}` : input.notas) : (op.notas ?? null);

    const sucesso = this.parceirosRepo.atualizarEstadoOperacao(id, parceiroId, "devolvida", {
      motivoDevolucao: input.motivoDevolucao.trim(),
      notas: notasAtualizadas,
    });

    if (!sucesso) {
      throw new ErroValidacao("Falha ao devolver a operação.");
    }

    if (op.remessaId) {
      try {
        this.db
          .prepare(
            "UPDATE pedidos_remessas SET estado = 'rejeitada', motivo_rejeicao = ?, atualizado_em = ? WHERE id = ?"
          )
          .run(`Devolvida pelo parceiro: ${input.motivoDevolucao}`, agora, op.remessaId);
      } catch (err) {
        console.error("Aviso: falha ao atualizar pedidos_remessas vinculado:", err);
      }
    }

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "PARCEIRO_OPERACAO_DEVOLVIDA",
      recurso: "operacoes_parceiros",
      recursoId: op.id,
      detalhes: {
        parceiroId,
        motivoDevolucao: input.motivoDevolucao,
      },
      ip: ip ?? null,
    });

    return this.obterDetalheOperacao(id, parceiroId);
  }

  // ==========================================
  // RECONCILIAÇÃO DE INSTRUÇÕES
  // ==========================================

  public processarReconciliacao(
    parceiroId: string,
    operador: { id: string; nome: string; funcao: string },
    input: z.infer<typeof SubmeterLoteReconciliacaoSchema>,
    ip?: string | null | undefined
  ): RelatorioReconciliacao {
    const parceiro = this.parceirosRepo.buscarParceiroPorId(parceiroId);
    if (!parceiro) {
      throw new ErroNaoEncontrado("Parceiro não encontrado.");
    }

    const detalhes: ReconciliacaoItem[] = [];
    let totalConciliadas = 0;
    let totalDivergentes = 0;
    let volumeTotalDec = decimal("0.00");

    for (const item of input.itens) {
      const op = this.parceirosRepo.buscarOperacaoPorId(item.referencia, parceiroId);

      if (!op) {
        totalDivergentes++;
        detalhes.push({
          referencia: item.referencia,
          referenciaExterna: item.referenciaExterna ?? null,
          montante: item.montante,
          moeda: item.moeda,
          estadoNzaidi: "inexistente",
          estadoParceiro: item.estadoReportado,
          conciliado: false,
          divergencia: "Instrução não localizada no NZAIDI para este parceiro.",
        });
        continue;
      }

      volumeTotalDec = volumeTotalDec.plus(decimal(op.montante));

      const mesmoValor = decimal(op.montante).equals(decimal(item.montante));
      const mesmaMoeda = op.moeda.toUpperCase() === item.moeda.toUpperCase();
      let statusEquivalente = false;

      if (item.estadoReportado === "liquidada" && op.estado === "liquidada") {
        statusEquivalente = true;
      } else if (item.estadoReportado === "em_processamento" && (op.estado === "em_processamento" || op.estado === "pendente")) {
        statusEquivalente = true;
      } else if (item.estadoReportado === "rejeitada" && (op.estado === "devolvida" || op.estado === "cancelada")) {
        statusEquivalente = true;
      }

      if (mesmoValor && mesmaMoeda && statusEquivalente) {
        totalConciliadas++;
        detalhes.push({
          referencia: op.id,
          referenciaExterna: op.referenciaExterna ?? null,
          montante: op.montante,
          moeda: op.moeda,
          estadoNzaidi: op.estado,
          estadoParceiro: item.estadoReportado,
          conciliado: true,
          divergencia: null,
        });
      } else {
        totalDivergentes++;
        const erros: string[] = [];
        if (!mesmoValor) erros.push(`Montante diverge (NZAIDI: ${op.montante}, Parceiro: ${item.montante})`);
        if (!mesmaMoeda) erros.push(`Moeda diverge (NZAIDI: ${op.moeda}, Parceiro: ${item.moeda})`);
        if (!statusEquivalente) erros.push(`Estado diverge (NZAIDI: ${op.estado}, Parceiro: ${item.estadoReportado})`);

        detalhes.push({
          referencia: op.id,
          referenciaExterna: op.referenciaExterna ?? null,
          montante: op.montante,
          moeda: op.moeda,
          estadoNzaidi: op.estado,
          estadoParceiro: item.estadoReportado,
          conciliado: false,
          divergencia: erros.join("; "),
        });
      }
    }

    const relatorioId = `REC-${input.dataReferencia.replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const relatorio = this.parceirosRepo.salvarReconciliacao({
      id: relatorioId,
      parceiroId,
      dataReferencia: input.dataReferencia,
      totalInstrucoes: input.itens.length,
      totalConciliadas,
      totalDivergentes,
      volumeTotal: volumeTotalDec.toFixed(2),
      detalhes,
    });

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "PARCEIRO_RECONCILIACAO_PROCESSADA",
      recurso: "reconciliacoes_parceiros",
      recursoId: relatorio.id,
      detalhes: {
        parceiroId,
        dataReferencia: input.dataReferencia,
        totalInstrucoes: relatorio.totalInstrucoes,
        totalConciliadas: relatorio.totalConciliadas,
        totalDivergentes: relatorio.totalDivergentes,
      },
      ip: ip ?? null,
    });

    return relatorio;
  }

  public listarHistoricoReconciliacao(parceiroId: string): RelatorioReconciliacao[] {
    return this.parceirosRepo.listarReconciliacoesPorParceiro(parceiroId);
  }

  // ==========================================
  // GESTÃO ADMINISTRATIVA DE PARCEIROS (ADMIN)
  // ==========================================

  public async criarParceiroAdministracao(
    input: z.infer<typeof CriarParceiroSchema>,
    operador: { id: string; nome: string; funcao: string },
    ip?: string | null | undefined
  ): Promise<{ parceiro: Parceiro; usuario: Omit<UsuarioParceiro, "senhaHash"> }> {
    const codigoFormatado = input.codigo.trim().toUpperCase();
    const existente = this.parceirosRepo.buscarParceiroPorCodigo(codigoFormatado);
    if (existente) {
      throw new ErroConflito(`Já existe um parceiro cadastrado com o código '${codigoFormatado}'.`);
    }

    const usuarioExistente = this.parceirosRepo.buscarUsuarioPorEmail(input.emailAdmin);
    if (usuarioExistente) {
      throw new ErroConflito(`O endereço de e-mail '${input.emailAdmin}' já se encontra atribuído a um utilizador.`);
    }

    const parceiroId = `parc_${randomUUID()}`;
    const parceiro = this.parceirosRepo.criarParceiro({
      id: parceiroId,
      codigo: codigoFormatado,
      nome: input.nome.trim(),
      tipo: input.tipo,
      canaisSuportados: input.canaisSuportados,
      comissaoPercentual: input.comissaoPercentual,
      limiteDiarioAoa: input.limiteDiarioAoa,
      estado: "ativo",
      chaveApi: randomBytes(24).toString("hex"),
    });

    const senhaHash = await hashSenha(input.senhaAdmin);
    const usuarioId = `usr_parc_${randomUUID()}`;
    const usuario = this.parceirosRepo.criarUsuarioParceiro({
      id: usuarioId,
      parceiroId: parceiro.id,
      nome: input.nomeAdmin.trim(),
      email: input.emailAdmin.trim(),
      senhaHash,
      funcao: "gestor_parceiro",
    });

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "ADMIN_PARCEIRO_CRIADO",
      recurso: "parceiros",
      recursoId: parceiro.id,
      detalhes: {
        codigo: parceiro.codigo,
        nome: parceiro.nome,
        emailAdmin: usuario.email,
      },
      ip: ip ?? null,
    });

    const { senhaHash: _, ...usuarioSemHash } = usuario;
    return { parceiro, usuario: usuarioSemHash };
  }

  public listarParceirosAdministracao(): Parceiro[] {
    return this.parceirosRepo.listarParceiros();
  }

  public obterParceiroAdministracao(id: string): Parceiro {
    const p = this.parceirosRepo.buscarParceiroPorId(id);
    if (!p) throw new ErroNaoEncontrado("Entidade parceira não encontrada.");
    return p;
  }

  public editarParceiroAdministracao(
    id: string,
    input: z.infer<typeof EditarParceiroSchema>,
    operador: { id: string; nome: string; funcao: string },
    ip?: string | null | undefined
  ): Parceiro {
    const atualizado = this.parceirosRepo.atualizarParceiro(id, {
      nome: input.nome,
      canaisSuportados: input.canaisSuportados,
      comissaoPercentual: input.comissaoPercentual,
      limiteDiarioAoa: input.limiteDiarioAoa,
      webhookUrl: input.webhookUrl,
    });
    if (!atualizado) throw new ErroNaoEncontrado("Parceiro não encontrado.");

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "ADMIN_PARCEIRO_ATUALIZADO",
      recurso: "parceiros",
      recursoId: id,
      detalhes: { ...input },
      ip: ip ?? null,
    });

    return atualizado;
  }

  public alterarStatusParceiro(
    id: string,
    estado: EstadoParceiro,
    operador: { id: string; nome: string; funcao: string },
    ip?: string | null | undefined,
    motivo?: string | undefined
  ): Parceiro {
    const p = this.obterParceiroAdministracao(id);
    this.parceirosRepo.atualizarStatusParceiro(id, estado);

    try {
      this.db.exec("ALTER TABLE parceiros ADD COLUMN suspenso_motivo TEXT");
    } catch {}
    try {
      const agora = new Date().toISOString();
      this.db
        .prepare("UPDATE parceiros SET suspenso_motivo = ? WHERE id = ?")
        .run(estado === "suspenso" ? (motivo ?? "Suspensão administrativa preventiva") : null, id);

      if (estado === "suspenso") {
        this.db.prepare("DELETE FROM sessoes_parceiros WHERE parceiro_id = ?").run(id);
        this.db.prepare(`
          INSERT INTO campanhas_email (id, assunto, destinatarios_filtro, corpo_html, total_enviados, estado, autor_id, autor_nome, enviado_em, criado_em)
          VALUES (?, ?, ?, ?, 1, 'enviada', ?, ?, ?, ?)
        `).run(
          "mail_susp_parc_" + randomUUID(),
          `[NZAIDI] Aviso de Suspensão Operacional — ${p.nome}`,
          p.codigo,
          `<p>À Direção de <strong>${p.nome}</strong>,</p><p>Informamos que a conta institucional da entidade parceira foi suspensa.</p><p><strong>Motivo registado:</strong> ${motivo ?? "Suspensão preventiva"}</p>`,
          operador.id,
          operador.nome,
          agora,
          agora
        );
      }
    } catch {}

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "ADMIN_PARCEIRO_STATUS_ALTERADO",
      recurso: "parceiros",
      recursoId: id,
      detalhes: { estadoAnterior: p.estado, novoEstado: estado, motivo },
      ip: ip ?? null,
    });

    return this.obterParceiroAdministracao(id);
  }

  public atribuirRemessaAoParceiro(
    parceiroId: string,
    remessaId: string,
    canal: string,
    operador: { id: string; nome: string; funcao: string },
    ip?: string | null | undefined
  ): OperacaoParceiro {
    const parceiro = this.obterParceiroAdministracao(parceiroId);
    if (parceiro.estado !== "ativo") {
      throw new ErroValidacao("Não é permitido atribuir operações a um parceiro suspenso ou inativo.");
    }

    const rowRemessa = this.db.prepare("SELECT * FROM pedidos_remessas WHERE id = ?").get(remessaId) as any;
    if (!rowRemessa) {
      throw new ErroNaoEncontrado("Pedido de remessa não encontrado.");
    }

    const montanteDivisa = decimal(rowRemessa.montante_divisa);
    const taxaCambio = decimal(rowRemessa.taxa_cambio);
    const contravalorAoa = montanteDivisa.times(taxaCambio).toFixed(2);

    const comissaoPercentual = decimal(parceiro.comissaoPercentual).dividedBy(100);
    const comissaoParceiroAoa = decimal(contravalorAoa).times(comissaoPercentual).toFixed(2);

    const opId = `OPP-${remessaId.replace("PED-REM-", "")}`;
    const operacao = this.parceirosRepo.criarOperacao({
      id: opId,
      parceiroId: parceiro.id,
      remessaId: rowRemessa.id,
      tipoOperacao: "remessa_saida",
      canal: canal.toLowerCase(),
      beneficiarioNome: rowRemessa.beneficiario_nome,
      beneficiarioPais: rowRemessa.beneficiario_pais,
      beneficiarioIban: rowRemessa.beneficiario_iban,
      beneficiarioBanco: rowRemessa.beneficiario_banco,
      beneficiarioSwift: rowRemessa.beneficiario_swift,
      moeda: rowRemessa.moeda_destino,
      montante: rowRemessa.montante_divisa,
      contravalorAoa,
      comissaoParceiroAoa,
      estado: "pendente",
    });

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "ADMIN_REMESSA_ATRIBUIDA_PARCEIRO",
      recurso: "operacoes_parceiros",
      recursoId: operacao.id,
      detalhes: {
        parceiroId: parceiro.id,
        parceiroCodigo: parceiro.codigo,
        remessaId: rowRemessa.id,
        canal,
      },
      ip: ip ?? null,
    });

    return operacao;
  }

  public impersonarParceiro(
    parceiroId: string,
    operador: { id: string; nome: string; funcao: string },
    ip?: string | null | undefined,
    userAgent?: string | null | undefined
  ): { parceiro: Parceiro; usuario: UsuarioParceiro; token: string } {
    const parceiro = this.obterParceiroAdministracao(parceiroId);
    if (parceiro.estado === "inativo") {
      throw new ErroValidacao("Não é permitido entrar na conta de um parceiro inativo.");
    }

    const rowUsuario = this.db
      .prepare("SELECT * FROM usuarios_parceiros WHERE parceiro_id = ? AND ativo = 1 LIMIT 1")
      .get(parceiroId) as any;

    if (!rowUsuario) {
      throw new ErroNaoEncontrado("Nenhum utilizador ativo encontrado para esta entidade parceira.");
    }

    const rawToken = randomBytes(32).toString("hex");
    this.parceirosRepo.criarSessao(
      parceiro.id,
      rowUsuario.id,
      rawToken,
      24,
      ip,
      `Impersonado por ${operador.nome} (${operador.funcao}) - ${userAgent ?? "Painel Admin"}`
    );

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "ADMIN_PARCEIRO_IMPERSONAR",
      recurso: "parceiros",
      recursoId: parceiro.id,
      detalhes: {
        parceiroCodigo: parceiro.codigo,
        parceiroNome: parceiro.nome,
        operadorId: operador.id,
      },
      ip: ip ?? null,
    });

    return {
      parceiro,
      usuario: {
        id: rowUsuario.id,
        parceiroId: rowUsuario.parceiro_id,
        nome: rowUsuario.nome,
        email: rowUsuario.email,
        senhaHash: "",
        funcao: rowUsuario.funcao,
        ativo: true,
        criadoEm: rowUsuario.criado_em,
        atualizadoEm: rowUsuario.atualizado_em,
      },
      token: rawToken,
    };
  }
}
