import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type { OperacionalRepository } from "./operacional.repository.js";
import type {
  ResumoDashboardOperacional,
  FiltrosFilaOperacional,
  TipoTarefaOperacional,
  PrioridadeTarefa,
  ProcessarPedidoCambioSchema,
  ProcessarPedidoRemessaSchema,
} from "./operacional.types.js";
import { z } from "zod";
import { ErroNaoEncontrado, ErroValidacao, ErroPermissao } from "../../plugins/erros.js";
import type { DocumentosKycService } from "../identidade-kyc/documentos.service.js";
import type { ClientesRepository } from "../identidade-kyc/clientes.repository.js";
import type { UsersRepository } from "../autenticacao/users.repository.js";
import type { ParceirosRepository } from "../parceiros-comerciais/parceiros.repository.js";

export interface ContextoOperador {
  id: string;
  nome: string;
  funcao: string;
  ip?: string | null | undefined;
}

export class OperacionalService {
  constructor(
    private db: DatabaseSync,
    private operacionalRepo: OperacionalRepository,
    private auditoriaRepo: AuditoriaRepository,
    private documentosService: DocumentosKycService,
    private clientesRepo: ClientesRepository,
    private usersRepo: UsersRepository,
    private parceirosRepo: ParceirosRepository
  ) {}

  public obterDashboard(operador: ContextoOperador): ResumoDashboardOperacional {
    return this.operacionalRepo.obterResumoDashboard(operador.id);
  }

  public listarFila(filtros: FiltrosFilaOperacional, operador: ContextoOperador) {
    if (filtros.apenasMinhas) {
      filtros.responsavelId = operador.id;
    }
    return this.operacionalRepo.listarFilaConsolidada(filtros);
  }

  public atribuirTarefa(
    tipo: TipoTarefaOperacional,
    referenciaId: string,
    responsavelId: string | null | undefined,
    prioridade: PrioridadeTarefa | undefined,
    notas: string | undefined,
    operador: ContextoOperador
  ) {
    let responsavelNome: string | null = null;
    if (responsavelId) {
      const usuario = this.usersRepo.buscarPorId(responsavelId);
      if (!usuario) {
        throw new ErroNaoEncontrado("Colaborador responsável não encontrado.");
      }
      responsavelNome = usuario.nome;
    }

    this.operacionalRepo.salvarAtribuicaoTarefa(
      tipo,
      referenciaId,
      responsavelId ?? null,
      responsavelNome,
      prioridade,
      notas
    );

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "TAREFA_OPERACIONAL_ATRIBUIDA",
      recurso: tipo,
      recursoId: referenciaId,
      detalhes: {
        tipo,
        referenciaId,
        responsavelId,
        responsavelNome,
        prioridade,
        notas,
      },
      ip: operador.ip ?? null,
    });

    return { sucesso: true, responsavelId, responsavelNome };
  }

  public processarPedidoCambio(
    pedidoId: string,
    dados: z.infer<typeof ProcessarPedidoCambioSchema>,
    operador: ContextoOperador
  ) {
    const pedido = this.operacionalRepo.buscarPedidoCambioCompleto(pedidoId);
    if (!pedido) {
      throw new ErroNaoEncontrado("Pedido de câmbio não encontrado.");
    }

    const agora = new Date().toISOString();

    if (dados.decisao === "rejeitar") {
      this.db
        .prepare(
          `UPDATE pedidos_cambio
           SET estado = 'rejeitado', motivo_rejeicao = ?, atualizado_em = ?
           WHERE id = ?`
        )
        .run(dados.motivoRejeicao ?? "Não cumpre os requisitos operacionais.", agora, pedidoId);

      this.operacionalRepo.atualizarEstadoTarefa("pedido_cambio", pedidoId, "rejeitada");

      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "PEDIDO_CAMBIO_REJEITADO",
        recurso: "pedidos_cambio",
        recursoId: pedidoId,
        detalhes: { motivo: dados.motivoRejeicao, notas: dados.notas },
        ip: operador.ip ?? null,
      });

      return { sucesso: true, estado: "rejeitado" };
    }

    // Aprovação
    this.db
      .prepare(
        `UPDATE pedidos_cambio
         SET estado = 'aprovado', atualizado_em = ?
         WHERE id = ?`
      )
      .run(agora, pedidoId);

    this.operacionalRepo.atualizarEstadoTarefa("pedido_cambio", pedidoId, "concluida");

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "PEDIDO_CAMBIO_APROVADO",
      recurso: "pedidos_cambio",
      recursoId: pedidoId,
      detalhes: { notas: dados.notas },
      ip: operador.ip ?? null,
    });

    return { sucesso: true, estado: "aprovado" };
  }

  public processarPedidoRemessa(
    remessaId: string,
    dados: z.infer<typeof ProcessarPedidoRemessaSchema>,
    operador: ContextoOperador
  ) {
    const remessa = this.operacionalRepo.buscarPedidoRemessaCompleto(remessaId);
    if (!remessa) {
      throw new ErroNaoEncontrado("Pedido de remessa não encontrado.");
    }

    const agora = new Date().toISOString();

    if (dados.decisao === "rejeitar") {
      this.db
        .prepare(
          `UPDATE pedidos_remessas
           SET estado = 'rejeitada', motivo_rejeicao = ?, atualizado_em = ?
           WHERE id = ?`
        )
        .run(dados.motivoRejeicao ?? "Remessa recusada pela conformidade.", agora, remessaId);

      this.operacionalRepo.atualizarEstadoTarefa("pedido_remessa", remessaId, "rejeitada");

      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "PEDIDO_REMESSA_REJEITADO",
        recurso: "pedidos_remessas",
        recursoId: remessaId,
        detalhes: { motivo: dados.motivoRejeicao, notas: dados.notas },
        ip: operador.ip ?? null,
      });

      return { sucesso: true, estado: "rejeitada" };
    }

    if (dados.decisao === "atribuir_parceiro") {
      if (!dados.parceiroId) {
        throw new ErroValidacao("Indique a entidade parceira comercial para encaminhar a remessa.");
      }

      const parceiro = this.parceirosRepo.buscarParceiroPorId(dados.parceiroId);
      if (!parceiro || parceiro.estado !== "ativo") {
        throw new ErroValidacao("A entidade parceira selecionada não se encontra ativa.");
      }

      // Criar operação no parceiro
      const opParceiroId = `op_parc_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      this.db
        .prepare(
          `INSERT INTO operacoes_parceiros (
            id, parceiro_id, remessa_id, tipo_operacao, canal, beneficiario_nome, beneficiario_pais,
            beneficiario_iban, beneficiario_banco, beneficiario_swift, moeda, montante, contravalor_aoa,
            comissao_parceiro_aoa, estado, criado_em, atualizado_em
          ) VALUES (?, ?, ?, 'remessa_saida', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`
        )
        .run(
          opParceiroId,
          parceiro.id,
          remessaId,
          remessa.canal ?? "remessa_parceiro",
          remessa.beneficiario_nome,
          remessa.beneficiario_pais,
          remessa.beneficiario_iban,
          remessa.beneficiario_banco,
          remessa.beneficiario_swift ?? null,
          remessa.moeda_destino,
          remessa.montante_divisa,
          remessa.total_aoa,
          remessa.comissao_aoa ?? "0.00",
          agora,
          agora
        );

      this.db
        .prepare(
          `UPDATE pedidos_remessas
           SET estado = 'em_processamento', atualizado_em = ?
           WHERE id = ?`
        )
        .run(agora, remessaId);

      this.operacionalRepo.atualizarEstadoTarefa("pedido_remessa", remessaId, "em_analise");

      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "PEDIDO_REMESSA_ATRIBUIDO_PARCEIRO",
        recurso: "pedidos_remessas",
        recursoId: remessaId,
        detalhes: {
          parceiroId: parceiro.id,
          parceiroNome: parceiro.nome,
          operacaoParceiroId: opParceiroId,
        },
        ip: operador.ip ?? null,
      });

      return { sucesso: true, estado: "em_processamento", parceiroNome: parceiro.nome };
    }

    // Liquidação Direta
    this.db
      .prepare(
        `UPDATE pedidos_remessas
         SET estado = 'executada', atualizado_em = ?
         WHERE id = ?`
      )
      .run(agora, remessaId);

    this.operacionalRepo.atualizarEstadoTarefa("pedido_remessa", remessaId, "concluida");

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "PEDIDO_REMESSA_LIQUIDADA_DIRETA",
      recurso: "pedidos_remessas",
      recursoId: remessaId,
      detalhes: { referenciaExterna: dados.referenciaExterna, notas: dados.notas },
      ip: operador.ip ?? null,
    });

    return { sucesso: true, estado: "executada" };
  }

  public validarDocumentoKyc(
    documentoId: string,
    status: "aprovado" | "rejeitado" | "pendente_atualizacao",
    motivo: string | undefined,
    operador: ContextoOperador
  ) {
    const doc = this.db.prepare("SELECT * FROM kyc_documentos WHERE id = ?").get(documentoId) as any;
    if (!doc) {
      throw new ErroNaoEncontrado("Documento KYC não encontrado.");
    }

    const agora = new Date().toISOString();
    const estadoDoc = status === "aprovado" ? "valido" : status === "rejeitado" ? "invalido" : "pendente";

    this.db
      .prepare(
        `UPDATE kyc_documentos
         SET estado_validacao = ?
         WHERE id = ?`
      )
      .run(estadoDoc, documentoId);

    // Se aprovado, verificar se todos os documentos do cliente estão aprovados para sugerir/atualizar
    if (status === "aprovado") {
      const pendentes = this.db
        .prepare(
          "SELECT count(id) as total FROM kyc_documentos WHERE cliente_id = ? AND estado_validacao != 'valido'"
        )
        .get(doc.cliente_id) as { total: number };

      if (pendentes.total === 0) {
        this.clientesRepo.atualizarEstadoKyc(doc.cliente_id, "aprovado", "baixo", agora);
        this.operacionalRepo.atualizarEstadoTarefa("kyc_dossie", doc.cliente_id, "concluida");
      }
    } else if (status === "rejeitado") {
      this.clientesRepo.atualizarEstadoKyc(doc.cliente_id, "rejeitado", "alto", agora);
      this.operacionalRepo.atualizarEstadoTarefa("kyc_dossie", doc.cliente_id, "rejeitada");
    }

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "KYC_DOCUMENTO_VALIDADO",
      recurso: "kyc_documentos",
      recursoId: documentoId,
      detalhes: {
        clienteId: doc.cliente_id,
        tipoDocumento: doc.tipo_documento,
        status,
        motivo,
      },
      ip: operador.ip ?? null,
    });

    return { sucesso: true, status };
  }

  public obterDetalhesItem(tipo: TipoTarefaOperacional, referenciaId: string) {
    switch (tipo) {
      case "pedido_cambio":
        return this.operacionalRepo.buscarPedidoCambioCompleto(referenciaId);
      case "pedido_remessa":
        return this.operacionalRepo.buscarPedidoRemessaCompleto(referenciaId);
      case "kyc_dossie":
        return this.operacionalRepo.buscarDossieKycCompleto(referenciaId);
      case "liquidacao_manual":
        return this.operacionalRepo.buscarExecucaoManualCompleta(referenciaId);
      case "alerta_caixa": {
        const caixas = this.operacionalRepo.buscarSessoesCaixaDetalhadas();
        return caixas.find((c) => c.id === referenciaId) ?? null;
      }
      default:
        return null;
    }
  }

  public obterSessoesCaixa() {
    return this.operacionalRepo.buscarSessoesCaixaDetalhadas();
  }
}
