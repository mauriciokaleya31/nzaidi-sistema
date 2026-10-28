import type { DatabaseSync } from "node:sqlite";
import { D, decimal } from "@nzaidi/dominio";
import { randomUUID } from "node:crypto";
import type {
  ContaContabil,
  LancamentoContabil,
  PartidaContabil,
  PartidaContabilDTO,
  DivergenciaReconciliacao,
  TaxaHistorico,
} from "./contabilidade.types.js";
import { ErroValidacao } from "../../plugins/erros.js";

export class ContabilidadeRepository {
  constructor(private db: DatabaseSync) {}

  // 1. Inicialização do Plano de Contas Padrão para Casas de Câmbio
  public inicializarPlanoContasPadrao(): void {
    const contasPadrao: ContaContabil[] = [
      {
        codigo: "1.1.1",
        nome: "Caixa Geral — Kwanza (AOA)",
        natureza: "devedora",
        tipo: "ativo",
        moeda: "AOA",
        descricao: "Numerário em Kwanza em cofre e caixas operacionais",
        ativo: true,
      },
      {
        codigo: "1.1.2",
        nome: "Caixa Moeda Estrangeira — Dólar (USD)",
        natureza: "devedora",
        tipo: "ativo",
        moeda: "USD",
        descricao: "Numerário em Dólar Americano em caixa e tesouraria",
        ativo: true,
      },
      {
        codigo: "1.1.3",
        nome: "Caixa Moeda Estrangeira — Euro (EUR)",
        natureza: "devedora",
        tipo: "ativo",
        moeda: "EUR",
        descricao: "Numerário em Euro em caixa e tesouraria",
        ativo: true,
      },
      {
        codigo: "1.2.1",
        nome: "Depósitos à Ordem — Bancos Nacionais (AOA)",
        natureza: "devedora",
        tipo: "ativo",
        moeda: "AOA",
        descricao: "Contas bancárias comerciais para liquidações em Angola",
        ativo: true,
      },
      {
        codigo: "1.2.2",
        nome: "Depósitos Bancários — Divisas (USD/EUR)",
        natureza: "devedora",
        tipo: "ativo",
        moeda: "MULTI",
        descricao: "Contas à ordem em moeda estrangeira",
        ativo: true,
      },
      {
        codigo: "2.1.1",
        nome: "Clientes — Liquidações Cambiais Pendentes",
        natureza: "credora",
        tipo: "passivo",
        moeda: "MULTI",
        descricao: "Conta transitória de clientes para pedidos e liquidações",
        ativo: true,
      },
      {
        codigo: "2.1.2",
        nome: "Parceiros Comerciais — Remessas a Liquidar",
        natureza: "credora",
        tipo: "passivo",
        moeda: "MULTI",
        descricao: "Contas correntes de parceiros de remessas internacionais",
        ativo: true,
      },
      {
        codigo: "4.1.1",
        nome: "Proveitos — Margem e Spread Cambial",
        natureza: "credora",
        tipo: "proveito",
        moeda: "AOA",
        descricao: "Ganhos brutos obtidos no diferencial de taxas de compra e venda",
        ativo: true,
      },
      {
        codigo: "4.1.2",
        nome: "Proveitos — Comissões de Remessas",
        natureza: "credora",
        tipo: "proveito",
        moeda: "AOA",
        descricao: "Taxas de serviço e comissões cobradas aos clientes em transferências",
        ativo: true,
      },
      {
        codigo: "5.1.1",
        nome: "Custos — Comissões Pagas a Parceiros",
        natureza: "devedora",
        tipo: "custo",
        moeda: "AOA",
        descricao: "Encargos e remunerações repassadas a correspondentes internacionais",
        ativo: true,
      },
      {
        codigo: "5.1.2",
        nome: "Custos — Quebras e Ajustes de Caixa",
        natureza: "devedora",
        tipo: "custo",
        moeda: "AOA",
        descricao: "Diferenças negativas e faltas apuradas no fecho de caixa",
        ativo: true,
      },
      {
        codigo: "4.1.3",
        nome: "Proveitos — Sobras e Ajustes Positivos de Caixa",
        natureza: "credora",
        tipo: "proveito",
        moeda: "AOA",
        descricao: "Diferenças positivas apuradas no fecho de caixa",
        ativo: true,
      },
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO contas_contabeis (codigo, nome, natureza, tipo, moeda, descricao, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of contasPadrao) {
      stmt.run(c.codigo, c.nome, c.natureza, c.tipo, c.moeda, c.descricao ?? null, c.ativo ? 1 : 0);
    }
  }

  public listarContas(): ContaContabil[] {
    const rows = this.db.prepare("SELECT * FROM contas_contabeis WHERE ativo = 1 ORDER BY codigo ASC").all() as any[];
    return rows.map((r) => ({
      codigo: r.codigo,
      nome: r.nome,
      natureza: r.natureza,
      tipo: r.tipo,
      moeda: r.moeda,
      descricao: r.descricao,
      ativo: Boolean(r.ativo),
    }));
  }

  // 2. Inserção de Lançamento Contabilístico com Validação Estrita de Partidas Dobradas
  public criarLancamento(
    dados: {
      numeroLancamento: string;
      dataMovimento: string;
      origemTipo: LancamentoContabil["origemTipo"];
      origemId: string;
      descricao: string;
      moeda: LancamentoContabil["moeda"];
      montanteOriginal: string;
      taxaCambio?: string | null | undefined;
      contravalorAoa: string;
      operadorId: string;
      operadorNome: string;
    },
    partidas: PartidaContabilDTO[]
  ): LancamentoContabil {
    if (partidas.length < 2) {
      throw new ErroValidacao("Um lançamento contabilístico exige no mínimo duas partidas.");
    }

    // Validação matemática do Princípio das Partidas Dobradas: Soma(Débito) == Soma(Crédito)
    let totalDebito = new D(0);
    let totalCredito = new D(0);

    for (const p of partidas) {
      const valorAoa = decimal(p.montanteAoa);
      if (p.tipo === "D") {
        totalDebito = totalDebito.plus(valorAoa);
      } else {
        totalCredito = totalCredito.plus(valorAoa);
      }
    }

    if (!totalDebito.equals(totalCredito)) {
      throw new ErroValidacao(
        `Desequilíbrio contabilístico nas partidas dobradas: Débito (${totalDebito.toFixed(2)} AOA) != Crédito (${totalCredito.toFixed(2)} AOA).`
      );
    }

    const lancamentoId = `lc_${randomUUID()}`;
    const agora = new Date().toISOString();

    const stmtLancamento = this.db.prepare(`
      INSERT INTO lancamentos_contabeis (
        id, numero_lancamento, data_movimento, origem_tipo, origem_id,
        descricao, moeda, montante_original, taxa_cambio, contravalor_aoa,
        estado, operador_id, operador_nome, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', ?, ?, ?)
    `);

    stmtLancamento.run(
      lancamentoId,
      dados.numeroLancamento,
      dados.dataMovimento,
      dados.origemTipo,
      dados.origemId,
      dados.descricao,
      dados.moeda,
      dados.montanteOriginal,
      dados.taxaCambio ?? null,
      dados.contravalorAoa,
      dados.operadorId,
      dados.operadorNome,
      agora
    );

    const stmtPartida = this.db.prepare(`
      INSERT INTO partidas_contabeis (
        id, lancamento_id, conta_codigo, tipo, montante_original, moeda, montante_aoa, descricao_linha, ordem
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const partidasSalvas: PartidaContabil[] = [];
    let ordem = 1;

    for (const p of partidas) {
      const partidaId = `pt_${randomUUID()}`;
      stmtPartida.run(
        partidaId,
        lancamentoId,
        p.contaCodigo,
        p.tipo,
        p.montanteOriginal,
        p.moeda,
        p.montanteAoa,
        p.descricaoLinha ?? null,
        ordem++
      );

      partidasSalvas.push({
        id: partidaId,
        lancamentoId,
        contaCodigo: p.contaCodigo,
        tipo: p.tipo,
        montanteOriginal: p.montanteOriginal,
        moeda: p.moeda,
        montanteAoa: p.montanteAoa,
        descricaoLinha: p.descricaoLinha,
      });
    }

    return {
      id: lancamentoId,
      numeroLancamento: dados.numeroLancamento,
      dataMovimento: dados.dataMovimento,
      origemTipo: dados.origemTipo,
      origemId: dados.origemId,
      descricao: dados.descricao,
      moeda: dados.moeda,
      montanteOriginal: dados.montanteOriginal,
      taxaCambio: dados.taxaCambio,
      contravalorAoa: dados.contravalorAoa,
      estado: "confirmado",
      operadorId: dados.operadorId,
      operadorNome: dados.operadorNome,
      criadoEm: agora,
      partidas: partidasSalvas,
    };
  }

  // 3. Estorno / Reversão Contabilística Inviolável
  public estornarLancamento(
    lancamentoId: string,
    motivo: string,
    operadorId: string,
    operadorNome: string
  ): LancamentoContabil {
    const lancamento = this.buscarLancamentoPorId(lancamentoId);
    if (!lancamento) {
      throw new ErroValidacao("Lançamento original não encontrado.");
    }
    if (lancamento.estado === "estornado") {
      throw new ErroValidacao("Este lançamento já foi estornado anteriormente.");
    }

    const agora = new Date().toISOString();
    const numeroEstorno = `EST-${lancamento.numeroLancamento}`;
    const idEstorno = `lc_${randomUUID()}`;

    // Lançamento de reversão: inverte D e C de todas as partidas originais
    const partidasInvertidas: PartidaContabilDTO[] = (lancamento.partidas || []).map((p) => ({
      contaCodigo: p.contaCodigo,
      tipo: p.tipo === "D" ? "C" : "D",
      montanteOriginal: p.montanteOriginal,
      moeda: p.moeda,
      montanteAoa: p.montanteAoa,
      descricaoLinha: `Estorno de: ${p.descricaoLinha || lancamento.descricao}`,
    }));

    // Cria o lançamento inverso compensatório
    const estornoCriado = this.criarLancamento(
      {
        numeroLancamento: numeroEstorno,
        dataMovimento: agora.slice(0, 10),
        origemTipo: "estorno_operacao",
        origemId: lancamento.id,
        descricao: `Estorno de [${lancamento.numeroLancamento}]: ${motivo}`,
        moeda: lancamento.moeda,
        montanteOriginal: lancamento.montanteOriginal,
        taxaCambio: lancamento.taxaCambio,
        contravalorAoa: lancamento.contravalorAoa,
        operadorId,
        operadorNome,
      },
      partidasInvertidas
    );

    // Atualiza o lançamento original com referência cruzada indelével
    this.db
      .prepare(`
        UPDATE lancamentos_contabeis SET
          estado = 'estornado',
          estornado_em = ?,
          estorno_lancamento_id = ?,
          motivo_estorno = ?
        WHERE id = ?
      `)
      .run(agora, estornoCriado.id, motivo, lancamentoId);

    return estornoCriado;
  }

  public buscarLancamentoPorId(id: string): LancamentoContabil | null {
    const row = this.db.prepare("SELECT * FROM lancamentos_contabeis WHERE id = ?").get(id) as any;
    if (!row) return null;

    const partidasRows = this.db
      .prepare(`
        SELECT p.*, c.nome as conta_nome 
        FROM partidas_contabeis p
        JOIN contas_contabeis c ON c.codigo = p.conta_codigo
        WHERE p.lancamento_id = ?
        ORDER BY p.ordem ASC
      `)
      .all(id) as any[];

    return {
      id: row.id,
      numeroLancamento: row.numero_lancamento,
      dataMovimento: row.data_movimento,
      origemTipo: row.origem_tipo,
      origemId: row.origem_id,
      descricao: row.descricao,
      moeda: row.moeda,
      montanteOriginal: row.montante_original,
      taxaCambio: row.taxa_cambio,
      contravalorAoa: row.contravalor_aoa,
      estado: row.estado,
      estornadoEm: row.estornado_em,
      estornoLancamentoId: row.estorno_lancamento_id,
      motivoEstorno: row.motivo_estorno,
      operadorId: row.operador_id,
      operadorNome: row.operador_nome,
      criadoEm: row.criado_em,
      partidas: partidasRows.map((p) => ({
        id: p.id,
        lancamentoId: p.lancamento_id,
        contaCodigo: p.conta_codigo,
        contaNome: p.conta_nome,
        tipo: p.tipo,
        montanteOriginal: p.montante_original,
        moeda: p.moeda,
        montanteAoa: p.montante_aoa,
        descricaoLinha: p.descricao_linha,
        ordem: p.ordem,
      })),
    };
  }

  public listarLivroRazao(filtros: {
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
    contaCodigo?: string | undefined;
    origemTipo?: string | undefined;
    limite?: number | undefined;
    offset?: number | undefined;
  }): { itens: any[]; total: number } {
    let sql = `
      SELECT 
        l.id as lancamento_id,
        l.numero_lancamento,
        l.data_movimento,
        l.origem_tipo,
        l.origem_id,
        l.descricao,
        l.estado,
        p.id as partida_id,
        p.conta_codigo,
        c.nome as conta_nome,
        p.tipo,
        p.montante_original,
        p.moeda,
        p.montante_aoa,
        p.descricao_linha,
        l.operador_nome,
        l.criado_em
      FROM partidas_contabeis p
      JOIN lancamentos_contabeis l ON l.id = p.lancamento_id
      JOIN contas_contabeis c ON c.codigo = p.conta_codigo
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros.dataInicio) {
      sql += " AND l.data_movimento >= ?";
      params.push(filtros.dataInicio);
    }
    if (filtros.dataFim) {
      sql += " AND l.data_movimento <= ?";
      params.push(filtros.dataFim);
    }
    if (filtros.contaCodigo) {
      sql += " AND p.conta_codigo = ?";
      params.push(filtros.contaCodigo);
    }
    if (filtros.origemTipo) {
      sql += " AND l.origem_tipo = ?";
      params.push(filtros.origemTipo);
    }

    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const countRow = this.db.prepare(countSql).get(...params) as any;
    const total = countRow ? Number(countRow.total) : 0;

    sql += " ORDER BY l.data_movimento DESC, l.criado_em DESC, p.ordem ASC LIMIT ? OFFSET ?";
    params.push(filtros.limite ?? 50, filtros.offset ?? 0);

    const rows = this.db.prepare(sql).all(...params) as any[];

    return {
      itens: rows.map((r) => ({
        lancamentoId: r.lancamento_id,
        numeroLancamento: r.numero_lancamento,
        dataMovimento: r.data_movimento,
        origemTipo: r.origem_tipo,
        origemId: r.origem_id,
        descricao: r.descricao,
        estado: r.estado,
        partidaId: r.partida_id,
        contaCodigo: r.conta_codigo,
        contaNome: r.conta_nome,
        tipo: r.tipo,
        montanteOriginal: r.montante_original,
        moeda: r.moeda,
        montanteAoa: r.montante_aoa,
        descricaoLinha: r.descricao_linha,
        operadorNome: r.operador_nome,
        criadoEm: r.criado_em,
      })),
      total,
    };
  }

  public obterBalancete(): any[] {
    const contas = this.listarContas();
    const sql = `
      SELECT 
        p.conta_codigo,
        SUM(CASE WHEN p.tipo = 'D' THEN CAST(p.montante_aoa AS REAL) ELSE 0 END) as total_debito,
        SUM(CASE WHEN p.tipo = 'C' THEN CAST(p.montante_aoa AS REAL) ELSE 0 END) as total_credito
      FROM partidas_contabeis p
      JOIN lancamentos_contabeis l ON l.id = p.lancamento_id
      WHERE l.estado = 'confirmado'
      GROUP BY p.conta_codigo
    `;

    const saldosRows = this.db.prepare(sql).all() as any[];
    const mapa = new Map<string, { debito: number; credito: number }>();
    for (const s of saldosRows) {
      mapa.set(s.conta_codigo, {
        debito: Number(s.total_debito || 0),
        credito: Number(s.total_credito || 0),
      });
    }

    return contas.map((c) => {
      const s = mapa.get(c.codigo) || { debito: 0, credito: 0 };
      const saldoAoa =
        c.natureza === "devedora" ? s.debito - s.credito : s.credito - s.debito;

      return {
        codigo: c.codigo,
        nome: c.nome,
        tipo: c.tipo,
        natureza: c.natureza,
        moeda: c.moeda,
        totalDebitoAoa: s.debito.toFixed(2),
        totalCreditoAoa: s.credito.toFixed(2),
        saldoAoa: saldoAoa.toFixed(2),
      };
    });
  }

  // 4. Gestão de Divergências de Reconciliação
  public registrarDivergencia(div: {
    tipo: DivergenciaReconciliacao["tipo"];
    referenciaId: string;
    origem: string;
    valorEsperado: string;
    valorObservado: string;
    moeda: DivergenciaReconciliacao["moeda"];
    diferenca: string;
  }): DivergenciaReconciliacao {
    const id = `div_${randomUUID()}`;
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO divergencias_reconciliacao (
        id, tipo, referencia_id, origem, valor_esperado, valor_observado,
        moeda, diferenca, estado, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberta', ?)
    `);

    stmt.run(
      id,
      div.tipo,
      div.referenciaId,
      div.origem,
      div.valorEsperado,
      div.valorObservado,
      div.moeda,
      div.diferenca,
      agora
    );

    return {
      id,
      tipo: div.tipo,
      referenciaId: div.referenciaId,
      origem: div.origem,
      valorEsperado: div.valorEsperado,
      valorObservado: div.valorObservado,
      moeda: div.moeda,
      diferenca: div.diferenca,
      estado: "aberta",
      criadoEm: agora,
    };
  }

  public listarDivergencias(filtros: {
    tipo?: string | undefined;
    estado?: string | undefined;
    limite?: number | undefined;
    offset?: number | undefined;
  }): { itens: DivergenciaReconciliacao[]; total: number } {
    let sql = "SELECT * FROM divergencias_reconciliacao WHERE 1=1";
    const params: any[] = [];

    if (filtros.tipo) {
      sql += " AND tipo = ?";
      params.push(filtros.tipo);
    }
    if (filtros.estado) {
      sql += " AND estado = ?";
      params.push(filtros.estado);
    }

    const countRow = this.db.prepare(`SELECT COUNT(*) as total FROM (${sql})`).get(...params) as any;
    const total = countRow ? Number(countRow.total) : 0;

    sql += " ORDER BY criado_em DESC LIMIT ? OFFSET ?";
    params.push(filtros.limite ?? 50, filtros.offset ?? 0);

    const rows = this.db.prepare(sql).all(...params) as any[];

    return {
      itens: rows.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        referenciaId: r.referencia_id,
        origem: r.origem,
        valorEsperado: r.valor_esperado,
        valorObservado: r.valor_observado,
        moeda: r.moeda,
        diferenca: r.diferenca,
        estado: r.estado,
        motivoResolucao: r.motivo_resolucao,
        resolvidoPorId: r.resolvido_por_id,
        resolvidoPorNome: r.resolvido_por_nome,
        resolvidoEm: r.resolvido_em,
        criadoEm: r.criado_em,
      })),
      total,
    };
  }

  public resolverDivergencia(
    id: string,
    estado: "resolvida" | "desconsiderada_autorizada",
    motivo: string,
    operadorId: string,
    operadorNome: string
  ): void {
    const agora = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE divergencias_reconciliacao SET
          estado = ?,
          motivo_resolucao = ?,
          resolvido_por_id = ?,
          resolvido_por_nome = ?,
          resolvido_em = ?
        WHERE id = ?
      `)
      .run(estado, motivo, operadorId, operadorNome, agora, id);
  }

  // 5. Histórico e Auditoria de Taxas
  public salvarHistoricoTaxa(taxa: {
    moeda: "USD" | "EUR";
    referencia: string;
    margemCompra: string;
    margemVenda: string;
    taxaCompra: string;
    taxaVenda: string;
    fonte: string;
    alteradoPorId?: string | null;
    alteradoPorNome?: string | null;
    motivo?: string | null;
  }): void {
    const id = `txh_${randomUUID()}`;
    const agora = new Date().toISOString();

    this.db
      .prepare(`
        INSERT INTO taxas_historico (
          id, moeda, referencia, margem_compra, margem_venda, taxa_compra, taxa_venda,
          fonte, alterado_por_id, alterado_por_nome, motivo, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        taxa.moeda,
        taxa.referencia,
        taxa.margemCompra,
        taxa.margemVenda,
        taxa.taxaCompra,
        taxa.taxaVenda,
        taxa.fonte,
        taxa.alteradoPorId ?? null,
        taxa.alteradoPorNome ?? null,
        taxa.motivo ?? null,
        agora
      );
  }

  public listarHistoricoTaxas(moeda?: string, limite = 50): TaxaHistorico[] {
    let sql = "SELECT * FROM taxas_historico";
    const params: any[] = [];
    if (moeda) {
      sql += " WHERE moeda = ?";
      params.push(moeda);
    }
    sql += " ORDER BY criado_em DESC LIMIT ?";
    params.push(limite);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      moeda: r.moeda,
      referencia: r.referencia,
      margemCompra: r.margem_compra,
      margemVenda: r.margem_venda,
      taxaCompra: r.taxa_compra,
      taxaVenda: r.taxa_venda,
      fonte: r.fonte,
      alteradoPorId: r.alterado_por_id,
      alteradoPorNome: r.alterado_por_nome,
      motivo: r.motivo,
      criadoEm: r.criado_em,
    }));
  }
}
