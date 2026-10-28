import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type {
  MetodoPagamentoItem,
  MetodoPagamentoClienteDTO,
  TransacaoPagamentoItem,
  SubmeterPagamentoManualPayload,
} from "./pagamentos.types.js";

export class PagamentosRepository {
  constructor(private readonly db: DatabaseSync) {}

  public listarMetodos(apenasAtivos = false, apenasCliente = false): MetodoPagamentoItem[] {
    let sql = "SELECT * FROM metodos_pagamento WHERE 1=1";
    const params: any[] = [];

    if (apenasAtivos) {
      sql += " AND ativo = 1";
    }
    if (apenasCliente) {
      sql += " AND disponivel_cliente = 1";
    }

    sql += " ORDER BY tipo ASC, canal ASC";
    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao,
      tipo: r.tipo,
      canal: r.canal,
      ativo: Boolean(r.ativo),
      disponivelCliente: Boolean(r.disponivel_cliente),
      instrucoes: r.instrucoes,
      configJson: r.config_json,
      estadoIntegracao: r.estado_integracao,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    }));
  }

  public listarMetodosParaCliente(): MetodoPagamentoClienteDTO[] {
    const metodos = this.listarMetodos(true, true);
    return metodos.map((m) => {
      let dadosBancarios: any = undefined;
      if (m.configJson) {
        try {
          const cfg = JSON.parse(m.configJson);
          dadosBancarios = {
            titular: cfg.titular,
            bancos: cfg.bancos,
          };
        } catch {}
      }

      return {
        id: m.id,
        nome: m.nome,
        descricao: m.descricao,
        tipo: m.tipo,
        canal: m.canal,
        instrucoes: m.instrucoes,
        dadosBancarios,
      };
    });
  }

  public obterMetodoPorId(id: string): MetodoPagamentoItem | null {
    const row = this.db.prepare("SELECT * FROM metodos_pagamento WHERE id = ?").get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      tipo: row.tipo,
      canal: row.canal,
      ativo: Boolean(row.ativo),
      disponivelCliente: Boolean(row.disponivel_cliente),
      instrucoes: row.instrucoes,
      configJson: row.config_json,
      estadoIntegracao: row.estado_integracao,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }

  public atualizarMetodo(
    id: string,
    dados: {
      nome?: string | undefined;
      descricao?: string | null | undefined;
      ativo?: boolean | undefined;
      disponivelCliente?: boolean | undefined;
      instrucoes?: string | null | undefined;
      configJson?: string | null | undefined;
      estadoIntegracao?: string | undefined;
    }
  ): MetodoPagamentoItem | null {
    const metodo = this.obterMetodoPorId(id);
    if (!metodo) return null;

    const agora = new Date().toISOString();
    const nome = dados.nome ?? metodo.nome;
    const descricao = dados.descricao !== undefined ? dados.descricao : metodo.descricao;
    const ativo = dados.ativo !== undefined ? (dados.ativo ? 1 : 0) : (metodo.ativo ? 1 : 0);
    const disponivelCliente = dados.disponivelCliente !== undefined ? (dados.disponivelCliente ? 1 : 0) : (metodo.disponivelCliente ? 1 : 0);
    const instrucoes = dados.instrucoes !== undefined ? dados.instrucoes : metodo.instrucoes;
    const configJson = dados.configJson !== undefined ? dados.configJson : metodo.configJson;
    const estadoIntegracao = dados.estadoIntegracao ?? metodo.estadoIntegracao;

    this.db.prepare(`
      UPDATE metodos_pagamento SET
        nome = ?,
        descricao = ?,
        ativo = ?,
        disponivel_cliente = ?,
        instrucoes = ?,
        config_json = ?,
        estado_integracao = ?,
        atualizado_em = ?
      WHERE id = ?
    `).run(nome, descricao, ativo, disponivelCliente, instrucoes, configJson, estadoIntegracao, agora, id);

    return this.obterMetodoPorId(id);
  }

  public criarTransacaoPagamento(dados: {
    metodoId: string;
    tipoMetodo: "manual" | "automatico";
    origemTipo: string;
    origemId: string;
    clienteId?: string | null | undefined;
    clienteNome?: string | null | undefined;
    clienteTelefone?: string | null | undefined;
    clienteEmail?: string | null | undefined;
    montanteAoa: number;
    referenciaTransacao: string;
    referenciaExterna?: string | null | undefined;
    comprovativoUrl?: string | null | undefined;
    comprovativoHash?: string | null | undefined;
    notasCliente?: string | null | undefined;
    estado?: "pendente_confirmacao" | "confirmado" | "rejeitado" | "cancelado" | "expirado" | undefined;
    appypayChargeId?: string | null | undefined;
    appypayRawResponse?: string | null | undefined;
  }): TransacaoPagamentoItem {
    const id = randomUUID();
    const agora = new Date().toISOString();
    const estado = dados.estado ?? "pendente_confirmacao";

    this.db.prepare(`
      INSERT INTO pagamentos_transacoes (
        id, metodo_id, tipo_metodo, origem_tipo, origem_id,
        cliente_id, cliente_nome, cliente_telefone, cliente_email,
        montante_aoa, moeda, referencia_transacao, referencia_externa,
        comprovativo_url, comprovativo_hash, notas_cliente, estado,
        appypay_charge_id, appypay_raw_response, criado_em, atualizado_em
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 'AOA', ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      id, dados.metodoId, dados.tipoMetodo, dados.origemTipo, dados.origemId,
      dados.clienteId ?? null, dados.clienteNome ?? null, dados.clienteTelefone ?? null, dados.clienteEmail ?? null,
      dados.montanteAoa, dados.referenciaTransacao, dados.referenciaExterna ?? null,
      dados.comprovativoUrl ?? null, dados.comprovativoHash ?? null, dados.notasCliente ?? null, estado,
      dados.appypayChargeId ?? null, dados.appypayRawResponse ?? null, agora, agora
    );

    return this.obterTransacaoPorId(id)!;
  }

  public obterTransacaoPorId(id: string): TransacaoPagamentoItem | null {
    const row = this.db.prepare(`
      SELECT p.*, m.nome as metodo_nome 
      FROM pagamentos_transacoes p
      LEFT JOIN metodos_pagamento m ON m.id = p.metodo_id
      WHERE p.id = ?
    `).get(id) as any;

    if (!row) return null;
    return this.mapearTransacao(row);
  }

  public obterTransacaoPorReferenciaTransacao(ref: string): TransacaoPagamentoItem | null {
    const row = this.db.prepare(`
      SELECT p.*, m.nome as metodo_nome 
      FROM pagamentos_transacoes p
      LEFT JOIN metodos_pagamento m ON m.id = p.metodo_id
      WHERE p.referencia_transacao = ?
    `).get(ref) as any;

    if (!row) return null;
    return this.mapearTransacao(row);
  }

  public obterTransacaoPorChargeId(chargeId: string): TransacaoPagamentoItem | null {
    const row = this.db.prepare(`
      SELECT p.*, m.nome as metodo_nome 
      FROM pagamentos_transacoes p
      LEFT JOIN metodos_pagamento m ON m.id = p.metodo_id
      WHERE p.appypay_charge_id = ?
    `).get(chargeId) as any;

    if (!row) return null;
    return this.mapearTransacao(row);
  }

  public listarTransacoes(filtros?: {
    estado?: string | undefined;
    metodoId?: string | undefined;
    tipoMetodo?: string | undefined;
    origemId?: string | undefined;
    limite?: number | undefined;
  }): TransacaoPagamentoItem[] {
    let sql = `
      SELECT p.*, m.nome as metodo_nome 
      FROM pagamentos_transacoes p
      LEFT JOIN metodos_pagamento m ON m.id = p.metodo_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros?.estado) {
      sql += " AND p.estado = ?";
      params.push(filtros.estado);
    }
    if (filtros?.metodoId) {
      sql += " AND p.metodo_id = ?";
      params.push(filtros.metodoId);
    }
    if (filtros?.tipoMetodo) {
      sql += " AND p.tipo_metodo = ?";
      params.push(filtros.tipoMetodo);
    }
    if (filtros?.origemId) {
      sql += " AND p.origem_id = ?";
      params.push(filtros.origemId);
    }

    sql += " ORDER BY p.criado_em DESC";
    if (filtros?.limite) {
      sql += " LIMIT ?";
      params.push(filtros.limite);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapearTransacao(r));
  }

  public confirmarTransacaoManual(
    id: string,
    adminId: string,
    adminNome: string,
    notasInternas?: string | undefined
  ): TransacaoPagamentoItem | null {
    const tx = this.obterTransacaoPorId(id);
    if (!tx) return null;
    if (tx.estado === "confirmado") return tx; // Idempotente

    const agora = new Date().toISOString();
    this.db.prepare(`
      UPDATE pagamentos_transacoes SET
        estado = 'confirmado',
        confirmado_por_id = ?,
        confirmado_por_nome = ?,
        confirmado_em = ?,
        notas_internas = ?,
        atualizado_em = ?
      WHERE id = ?
    `).run(adminId, adminNome, agora, notasInternas ?? null, agora, id);

    return this.obterTransacaoPorId(id);
  }

  public rejeitarTransacaoManual(
    id: string,
    adminId: string,
    adminNome: string,
    motivo: string,
    notasInternas?: string | undefined
  ): TransacaoPagamentoItem | null {
    const tx = this.obterTransacaoPorId(id);
    if (!tx) return null;

    const agora = new Date().toISOString();
    this.db.prepare(`
      UPDATE pagamentos_transacoes SET
        estado = 'rejeitado',
        motivo_rejeicao = ?,
        confirmado_por_id = ?,
        confirmado_por_nome = ?,
        confirmado_em = ?,
        notas_internas = ?,
        atualizado_em = ?
      WHERE id = ?
    `).run(motivo, adminId, adminNome, agora, notasInternas ?? null, agora, id);

    return this.obterTransacaoPorId(id);
  }

  public atualizarEstadoAppyPay(
    id: string,
    novoEstado: "confirmado" | "rejeitado" | "cancelado" | "expirado",
    rawPayload: string
  ): TransacaoPagamentoItem | null {
    const agora = new Date().toISOString();
    this.db.prepare(`
      UPDATE pagamentos_transacoes SET
        estado = ?,
        appypay_raw_response = ?,
        atualizado_em = ?
      WHERE id = ?
    `).run(novoEstado, rawPayload, agora, id);

    return this.obterTransacaoPorId(id);
  }

  private mapearTransacao(row: any): TransacaoPagamentoItem {
    return {
      id: row.id,
      metodoId: row.metodo_id,
      metodoNome: row.metodo_nome,
      tipoMetodo: row.tipo_metodo,
      origemTipo: row.origem_tipo,
      origemId: row.origem_id,
      clienteId: row.cliente_id,
      clienteNome: row.cliente_nome,
      clienteTelefone: row.cliente_telefone,
      clienteEmail: row.cliente_email,
      montanteAoa: Number(row.montante_aoa),
      moeda: row.moeda,
      referenciaTransacao: row.referencia_transacao,
      referenciaExterna: row.referencia_externa,
      comprovativoUrl: row.comprovativo_url,
      comprovativoHash: row.comprovativo_hash,
      notasCliente: row.notas_cliente,
      estado: row.estado,
      motivoRejeicao: row.motivo_rejeicao,
      confirmadoPorId: row.confirmado_por_id,
      confirmadoPorNome: row.confirmado_por_nome,
      confirmadoEm: row.confirmado_em,
      notasInternas: row.notas_internas,
      appypayChargeId: row.appypay_charge_id,
      appypayRawResponse: row.appypay_raw_response,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }
}
