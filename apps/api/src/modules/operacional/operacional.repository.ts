import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type {
  ItemFilaOperacional,
  ResumoDashboardOperacional,
  FiltrosFilaOperacional,
  TipoTarefaOperacional,
  PrioridadeTarefa,
  EstadoTarefaOperacional,
  AtividadeOperadorRecente,
} from "./operacional.types.js";

export class OperacionalRepository {
  constructor(private db: DatabaseSync) {}

  public obterResumoDashboard(operadorId: string): ResumoDashboardOperacional {
    // 1. Pedidos Câmbio Pendentes
    const cambioRow = this.db
      .prepare("SELECT count(id) as total FROM pedidos_cambio WHERE estado IN ('pendente', 'em_analise')")
      .get() as { total: number };

    // 2. Pedidos Remessas Pendentes
    const remessaRow = this.db
      .prepare("SELECT count(id) as total FROM pedidos_remessas WHERE estado IN ('pendente_revisao', 'em_processamento', 'pendente')")
      .get() as { total: number };

    // 3. KYC Pendentes / Aprovados / Rejeitados
    const kycPendRow = this.db
      .prepare("SELECT count(id) as total FROM clientes WHERE estado_kyc IN ('pendente', 'em_analise', 'actualizacao_necessaria')")
      .get() as { total: number };

    const kycAprovRow = this.db
      .prepare("SELECT count(id) as total FROM clientes WHERE estado_kyc = 'aprovado'")
      .get() as { total: number };

    const kycRejRow = this.db
      .prepare("SELECT count(id) as total FROM clientes WHERE estado_kyc = 'rejeitado'")
      .get() as { total: number };

    // 4. Liquidações Manuais Pendentes de 4 Olhos
    const liqManRow = this.db
      .prepare("SELECT count(id) as total FROM execucoes_integracao_manual WHERE estado = 'pendente'")
      .get() as { total: number };

    // 5. Caixas Abertos
    const caixasAbertosRow = this.db
      .prepare("SELECT count(id) as total FROM caixas WHERE estado = 'aberto'")
      .get() as { total: number };

    // 6. Alertas de Divergência em Caixa
    const alertasRow = this.db
      .prepare(
        "SELECT count(id) as total FROM caixas WHERE estado = 'fechado' AND diferenca_aoa IS NOT NULL AND diferenca_aoa != '0.00' AND diferenca_aoa != '0'"
      )
      .get() as { total: number };

    // 7. Minhas Tarefas Atribuídas
    const minhasRow = this.db
      .prepare(
        "SELECT count(id) as total FROM tarefas_operacionais WHERE responsavel_id = ? AND estado IN ('pendente', 'em_analise')"
      )
      .get(operadorId) as { total: number };

    // 8. Atividades Recentes do Operador
    const auditRows = this.db
      .prepare(
        `SELECT id, acao, recurso, recurso_id as recursoId, detalhes_json as detalhes, momento as criadoEm
         FROM auditoria
         WHERE autor_id = ?
         ORDER BY momento DESC
         LIMIT 8`
      )
      .all(operadorId) as Array<{
        id: string;
        acao: string;
        recurso: string;
        recursoId: string | null;
        detalhes: string | null;
        criadoEm: string;
      }>;

    const atividadesRecentes: AtividadeOperadorRecente[] = auditRows.map((r) => {
      let detalhesParsed: unknown = null;
      if (r.detalhes) {
        try {
          detalhesParsed = JSON.parse(r.detalhes);
        } catch {
          detalhesParsed = r.detalhes;
        }
      }
      return {
        id: r.id,
        acao: r.acao,
        recurso: r.recurso,
        recursoId: r.recursoId,
        detalhes: detalhesParsed,
        criadoEm: r.criadoEm,
      };
    });

    const totalPendentes =
      cambioRow.total +
      remessaRow.total +
      kycPendRow.total +
      liqManRow.total;

    return {
      pedidosCambioPendentes: cambioRow.total,
      pedidosRemessasPendentes: remessaRow.total,
      kycPendentes: kycPendRow.total,
      kycAprovados: kycAprovRow.total,
      kycRejeitados: kycRejRow.total,
      liquidacoesManuaisPendentes: liqManRow.total,
      caixasAbertos: caixasAbertosRow.total,
      alertasDivergencia: alertasRow.total,
      minhasTarefasPendentes: minhasRow.total,
      totalTarefasPendentes: totalPendentes,
      atividadesRecentes,
    };
  }

  // ==========================================
  // FILA ÚNICA CONSOLIDADA DE OPERAÇÕES
  // ==========================================

  public listarFilaConsolidada(filtros: FiltrosFilaOperacional = {}): { itens: ItemFilaOperacional[]; total: number } {
    const itens: ItemFilaOperacional[] = [];

    // 1. Pedidos de Câmbio
    if (!filtros.tipo || filtros.tipo === "pedido_cambio") {
      const cambioRows = this.db
        .prepare(
          `SELECT p.*, c.nome as cliente_nome,
                  t.responsavel_id, t.responsavel_nome, t.prioridade as tarefa_prioridade, t.estado as tarefa_estado
           FROM pedidos_cambio p
           JOIN clientes c ON c.id = p.cliente_id
           LEFT JOIN tarefas_operacionais t ON t.tipo = 'pedido_cambio' AND t.referencia_id = p.id
           ORDER BY p.criado_em DESC`
        )
        .all() as any[];

      for (const r of cambioRows) {
        const estadoGeral = (r.estado === "aprovado" || r.estado === "concluido")
          ? "concluida"
          : r.estado === "rejeitado" || r.estado === "cancelado"
          ? "rejeitada"
          : r.tarefa_estado ?? (r.estado === "em_analise" ? "em_analise" : "pendente");

        itens.push({
          id: `task_pc_${r.id}`,
          tipo: "pedido_cambio",
          referenciaId: r.id,
          codigoVisual: `CAM-${r.id.slice(0, 8).toUpperCase()}`,
          titulo: `Câmbio Online: ${r.tipo_operacao === "compra" ? "Compra" : "Venda"} de ${r.montante_divisa} ${r.moeda}`,
          descricao: `Proposta de câmbio a taxa ${r.taxa_proposta} (Est. ${r.total_aoa_estimado} AOA). Finalidade: ${r.finalidade}`,
          clienteNome: r.cliente_nome,
          clienteId: r.cliente_id,
          montante: r.montante_divisa,
          moeda: r.moeda,
          prioridade: (r.tarefa_prioridade as PrioridadeTarefa) ?? "normal",
          estado: estadoGeral as EstadoTarefaOperacional,
          responsavelId: r.responsavel_id ?? null,
          responsavelNome: r.responsavel_nome ?? null,
          criadoEm: r.criado_em,
          atualizadoEm: r.atualizado_em ?? r.criado_em,
          detalhes: {
            tipoOperacao: r.tipo_operacao,
            taxaProposta: r.taxa_proposta,
            totalAoaEstimado: r.total_aoa_estimado,
            finalidade: r.finalidade,
            operacaoId: r.operacao_id,
            motivoRejeicao: r.motivo_rejeicao,
          },
        });
      }
    }

    // 2. Pedidos de Remessas
    if (!filtros.tipo || filtros.tipo === "pedido_remessa") {
      const remessaRows = this.db
        .prepare(
          `SELECT r.*, c.nome as cliente_nome,
                  t.responsavel_id, t.responsavel_nome, t.prioridade as tarefa_prioridade, t.estado as tarefa_estado
           FROM pedidos_remessas r
           JOIN clientes c ON c.id = r.cliente_id
           LEFT JOIN tarefas_operacionais t ON t.tipo = 'pedido_remessa' AND t.referencia_id = r.id
           ORDER BY r.criado_em DESC`
        )
        .all() as any[];

      for (const r of remessaRows) {
        const estadoGeral = (r.estado === "executada" || r.estado === "concluido")
          ? "concluida"
          : r.estado === "rejeitada" || r.estado === "cancelada"
          ? "rejeitada"
          : r.tarefa_estado ?? (r.estado === "em_processamento" ? "em_analise" : "pendente");

        itens.push({
          id: `task_rem_${r.id}`,
          tipo: "pedido_remessa",
          referenciaId: r.id,
          codigoVisual: `REM-${r.id.slice(0, 8).toUpperCase()}`,
          titulo: `Remessa Internacional: ${r.beneficiario_nome} (${r.beneficiario_pais})`,
          descricao: `Envio de ${r.montante_divisa} ${r.moeda_destino} (Contravalor: ${r.total_aoa} AOA). Banco: ${r.beneficiario_banco}`,
          clienteNome: r.cliente_nome,
          clienteId: r.cliente_id,
          montante: r.montante_divisa,
          moeda: r.moeda_destino,
          prioridade: (r.tarefa_prioridade as PrioridadeTarefa) ?? "alta",
          estado: estadoGeral as EstadoTarefaOperacional,
          responsavelId: r.responsavel_id ?? null,
          responsavelNome: r.responsavel_nome ?? null,
          criadoEm: r.criado_em,
          atualizadoEm: r.atualizado_em ?? r.criado_em,
          detalhes: {
            moedaDestino: r.moeda_destino,
            montanteDivisa: r.montante_divisa,
            taxaCambio: r.taxa_cambio,
            comissaoAoa: r.comissao_aoa,
            totalAoa: r.total_aoa,
            finalidade: r.finalidade,
            beneficiarioNome: r.beneficiario_nome,
            beneficiarioPais: r.beneficiario_pais,
            beneficiarioIban: r.beneficiario_iban,
            beneficiarioBanco: r.beneficiario_banco,
            beneficiarioSwift: r.beneficiario_swift,
            motivoRejeicao: r.motivo_rejeicao,
          },
        });
      }
    }

    // 3. Dossiês KYC
    if (!filtros.tipo || filtros.tipo === "kyc_dossie") {
      const kycRows = this.db
        .prepare(
          `SELECT c.id, c.nome, c.numero_documento, c.tipo_documento, c.estado_kyc, c.criado_em, c.atualizado_em,
                  COUNT(d.id) as total_docs,
                  t.responsavel_id, t.responsavel_nome, t.prioridade as tarefa_prioridade, t.estado as tarefa_estado
           FROM clientes c
           LEFT JOIN kyc_documentos d ON d.cliente_id = c.id
           LEFT JOIN tarefas_operacionais t ON t.tipo = 'kyc_dossie' AND t.referencia_id = c.id
           GROUP BY c.id
           ORDER BY c.criado_em DESC`
        )
        .all() as any[];

      for (const r of kycRows) {
        const estadoGeral = r.estado_kyc === "aprovado"
          ? "concluida"
          : r.estado_kyc === "rejeitado"
          ? "rejeitada"
          : r.tarefa_estado ?? (r.estado_kyc === "actualizacao_necessaria" ? "em_analise" : "pendente");

        itens.push({
          id: `task_kyc_${r.id}`,
          tipo: "kyc_dossie",
          referenciaId: r.id,
          codigoVisual: `KYC-${r.id.slice(0, 8).toUpperCase()}`,
          titulo: `Diligência KYC: ${r.nome} (${r.tipo_documento}: ${r.numero_documento})`,
          descricao: `Dossiê cadastral com ${r.total_docs} documento(s) anexado(s). Estado atual: ${r.estado_kyc}`,
          clienteNome: r.nome,
          clienteId: r.id,
          prioridade: (r.tarefa_prioridade as PrioridadeTarefa) ?? "alta",
          estado: estadoGeral as EstadoTarefaOperacional,
          responsavelId: r.responsavel_id ?? null,
          responsavelNome: r.responsavel_nome ?? null,
          criadoEm: r.criado_em,
          atualizadoEm: r.atualizado_em ?? r.criado_em,
          detalhes: {
            kycEstado: r.estado_kyc,
            totalDocs: r.total_docs,
            tipoDocumento: r.tipo_documento,
            numeroDocumento: r.numero_documento,
          },
        });
      }
    }

    // 4. Liquidações Manuais Pendentes de 4 Olhos
    if (!filtros.tipo || filtros.tipo === "liquidacao_manual") {
      const liqRows = this.db
        .prepare(
          `SELECT e.*,
                  e.operador_nome as criador_nome,
                  t.responsavel_id, t.responsavel_nome, t.prioridade as tarefa_prioridade, t.estado as tarefa_estado
           FROM execucoes_integracao_manual e
           LEFT JOIN tarefas_operacionais t ON t.tipo = 'liquidacao_manual' AND t.referencia_id = e.id
           ORDER BY e.momento_execucao DESC`
        )
        .all() as any[];

      for (const r of liqRows) {
        const estadoGeral = r.estado === "liquidado"
          ? "concluida"
          : r.estado === "rejeitado"
          ? "rejeitada"
          : r.tarefa_estado ?? (r.estado === "em_processamento" ? "em_analise" : "pendente");

        itens.push({
          id: `task_liq_${r.id}`,
          tipo: "liquidacao_manual",
          referenciaId: r.id,
          codigoVisual: `LIQ-${r.id.slice(0, 8).toUpperCase()}`,
          titulo: `Liquidação Manual AML (${r.tipo_integracao}): ${r.valor_moeda} ${r.moeda}`,
          descricao: `Canal ${r.canal_origem} | Ref Externa: ${r.referencia_externa} | Registado por: ${r.criador_nome ?? "Operador"}`,
          montante: r.valor_moeda,
          moeda: r.moeda,
          prioridade: (r.tarefa_prioridade as PrioridadeTarefa) ?? "urgente",
          estado: estadoGeral as EstadoTarefaOperacional,
          responsavelId: r.responsavel_id ?? null,
          responsavelNome: r.responsavel_nome ?? null,
          criadoEm: r.momento_execucao,
          atualizadoEm: r.momento_aprovacao ?? r.momento_execucao,
          detalhes: {
            transacaoId: r.transacao_id,
            tipoIntegracao: r.tipo_integracao,
            canalOrigem: r.canal_origem,
            referenciaExterna: r.referencia_externa,
            operadorCriacaoId: r.operador_id,
            operadorCriacaoNome: r.criador_nome,
            operadorAprovacaoId: r.aprovador_id,
            estadoInterno: r.estado,
          },
        });
      }
    }

    // 5. Sessões de Caixa e Alertas de Divergência
    if (!filtros.tipo || filtros.tipo === "alerta_caixa") {
      const caixaRows = this.db
        .prepare(
          `SELECT c.*,
                  t.responsavel_id, t.responsavel_nome, t.prioridade as tarefa_prioridade, t.estado as tarefa_estado
           FROM caixas c
           LEFT JOIN tarefas_operacionais t ON t.tipo = 'alerta_caixa' AND t.referencia_id = c.id
           WHERE c.estado = 'aberto' OR (c.estado = 'fechado' AND c.diferenca_aoa IS NOT NULL AND c.diferenca_aoa != '0.00' AND c.diferenca_aoa != '0')
           ORDER BY c.aberto_em DESC`
        )
        .all() as any[];

      for (const r of caixaRows) {
        const temQuebra = r.diferenca_aoa && r.diferenca_aoa !== "0.00" && r.diferenca_aoa !== "0";
        const estadoGeral = r.estado === "fechado" && !temQuebra
          ? "concluida"
          : temQuebra
          ? "em_analise"
          : "pendente";

        itens.push({
          id: `task_cx_${r.id}`,
          tipo: "alerta_caixa",
          referenciaId: r.id,
          codigoVisual: `CX-${r.id.slice(0, 8).toUpperCase()}`,
          titulo: temQuebra
            ? `Divergência de Fecho de Caixa: ${r.diferenca_aoa} AOA (${r.operador_nome})`
            : `Sessão de Caixa Ativa: ${r.operador_nome}`,
          descricao: temQuebra
            ? `Diferença apurada no fecho pelo operador ${r.operador_nome}. Requer conferência da tesouraria.`
            : `Caixa aberto em ${r.aberto_em} com saldo inicial ${r.saldo_inicial_aoa} AOA.`,
          montante: temQuebra ? r.diferenca_aoa : r.saldo_inicial_aoa,
          moeda: "AOA",
          prioridade: temQuebra ? "urgente" : "normal",
          estado: (r.tarefa_estado as EstadoTarefaOperacional) ?? estadoGeral,
          responsavelId: r.responsavel_id ?? null,
          responsavelNome: r.responsavel_nome ?? null,
          criadoEm: r.aberto_em,
          atualizadoEm: r.fechado_em ?? r.aberto_em,
          detalhes: {
            caixaEstado: r.estado,
            operadorId: r.operador_id,
            operadorNome: r.operador_nome,
            saldoInicialAoa: r.saldo_inicial_aoa,
            diferencaAoa: r.diferenca_aoa,
          },
        });
      }
    }

    // Filtragem em Memória
    let filtrados = itens;

    if (filtros.estado) {
      filtrados = filtrados.filter((i) => i.estado === filtros.estado);
    }

    if (filtros.prioridade) {
      filtrados = filtrados.filter((i) => i.prioridade === filtros.prioridade);
    }

    if (filtros.responsavelId) {
      filtrados = filtrados.filter((i) => i.responsavelId === filtros.responsavelId);
    }

    if (filtros.busca) {
      const b = filtros.busca.toLowerCase();
      filtrados = filtrados.filter(
        (i) =>
          i.codigoVisual.toLowerCase().includes(b) ||
          i.titulo.toLowerCase().includes(b) ||
          i.descricao.toLowerCase().includes(b) ||
          (i.clienteNome && i.clienteNome.toLowerCase().includes(b))
      );
    }

    // Ordenação: Urgentes primeiro, depois mais recentes
    filtrados.sort((a, b) => {
      const prioridadePeso: Record<PrioridadeTarefa, number> = {
        urgente: 3,
        alta: 2,
        normal: 1,
      };
      const pesoDiff = prioridadePeso[b.prioridade] - prioridadePeso[a.prioridade];
      if (pesoDiff !== 0) return pesoDiff;
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });

    const total = filtrados.length;
    const offset = filtros.offset ?? 0;
    const limite = filtros.limite ?? 50;
    const paginados = filtrados.slice(offset, offset + limite);

    return { itens: paginados, total };
  }

  // ==========================================
  // ATRIBUIÇÃO E GESTÃO DE TAREFAS
  // ==========================================

  public salvarAtribuicaoTarefa(
    tipo: TipoTarefaOperacional,
    referenciaId: string,
    responsavelId: string | null,
    responsavelNome: string | null,
    prioridade?: PrioridadeTarefa,
    notas?: string
  ): void {
    const agora = new Date().toISOString();
    const existente = this.db
      .prepare("SELECT id FROM tarefas_operacionais WHERE tipo = ? AND referencia_id = ?")
      .get(tipo, referenciaId) as { id: string } | undefined;

    if (existente) {
      this.db
        .prepare(
          `UPDATE tarefas_operacionais
           SET responsavel_id = ?,
               responsavel_nome = ?,
               prioridade = COALESCE(?, prioridade),
               notas = COALESCE(?, notas),
               atribuido_em = CASE WHEN ? IS NOT NULL THEN ? ELSE atribuido_em END,
               atualizado_em = ?
           WHERE id = ?`
        )
        .run(
          responsavelId,
          responsavelNome,
          prioridade ?? null,
          notas ?? null,
          responsavelId,
          agora,
          agora,
          existente.id
        );
    } else {
      const novoId = `task_${randomUUID()}`;
      this.db
        .prepare(
          `INSERT INTO tarefas_operacionais (
            id, tipo, referencia_id, responsavel_id, responsavel_nome, prioridade, estado, notas, atribuido_em, atualizado_em
          ) VALUES (?, ?, ?, ?, ?, ?, 'em_analise', ?, ?, ?)`
        )
        .run(
          novoId,
          tipo,
          referenciaId,
          responsavelId,
          responsavelNome,
          prioridade ?? "normal",
          notas ?? null,
          responsavelId ? agora : null,
          agora
        );
    }
  }

  public atualizarEstadoTarefa(tipo: TipoTarefaOperacional, referenciaId: string, estado: EstadoTarefaOperacional): void {
    const agora = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE tarefas_operacionais
         SET estado = ?, atualizado_em = ?
         WHERE tipo = ? AND referencia_id = ?`
      )
      .run(estado, agora, tipo, referenciaId);
  }

  // ==========================================
  // DETALHES COMPLETOS PARA OS MODAIS
  // ==========================================

  public buscarPedidoCambioCompleto(id: string) {
    const row = this.db
      .prepare(
        `SELECT p.*, c.nome as cliente_nome, c.numero_documento, c.tipo_documento, c.email as cliente_email, c.telefone as cliente_telefone, c.estado_kyc
         FROM pedidos_cambio p
         JOIN clientes c ON c.id = p.cliente_id
         WHERE p.id = ?`
      )
      .get(id) as any;
    return row ?? null;
  }

  public buscarPedidoRemessaCompleto(id: string) {
    const row = this.db
      .prepare(
        `SELECT r.*, c.nome as cliente_nome, c.numero_documento, c.tipo_documento, c.email as cliente_email, c.telefone as cliente_telefone, c.estado_kyc
         FROM pedidos_remessas r
         JOIN clientes c ON c.id = r.cliente_id
         WHERE r.id = ?`
      )
      .get(id) as any;
    return row ?? null;
  }

  public buscarDossieKycCompleto(clienteId: string) {
    const cliente = this.db.prepare("SELECT * FROM clientes WHERE id = ?").get(clienteId) as any;
    if (!cliente) return null;

    const documentos = this.db
      .prepare("SELECT * FROM kyc_documentos WHERE cliente_id = ? ORDER BY enviado_em DESC")
      .all(clienteId) as any[];

    const historico = this.db
      .prepare("SELECT * FROM kyc_registos WHERE cliente_id = ? ORDER BY momento DESC")
      .all(clienteId) as any[];

    return { cliente, documentos, historico };
  }

  public buscarExecucaoManualCompleta(id: string) {
    const row = this.db
      .prepare(
        `SELECT e.*,
                e.operador_nome as criador_nome,
                e.aprovador_nome
         FROM execucoes_integracao_manual e
         WHERE e.id = ?`
      )
      .get(id) as any;
    return row ?? null;
  }

  public buscarSessoesCaixaDetalhadas() {
    return this.db
      .prepare(
        `SELECT c.*,
                (SELECT count(m.id) FROM movimentos_caixa m WHERE m.caixa_id = c.id) as total_movimentos
         FROM caixas c
         ORDER BY c.aberto_em DESC`
      )
      .all() as any[];
  }
}
