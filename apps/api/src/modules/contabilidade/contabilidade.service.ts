import type { DatabaseSync } from "node:sqlite";
import { D, decimal } from "@nzaidi/dominio";
import { randomUUID } from "node:crypto";
import type { ContabilidadeRepository } from "./contabilidade.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type {
  LancamentoContabil,
  PartidaContabilDTO,
  DivergenciaReconciliacao,
  MoedaContabil,
} from "./contabilidade.types.js";
import { ErroValidacao } from "../../plugins/erros.js";

export class ContabilidadeService {
  constructor(
    private db: DatabaseSync,
    private contabilidadeRepo: ContabilidadeRepository,
    private auditoriaRepo: AuditoriaRepository
  ) {
    // Garante que o plano de contas oficial existe
    this.contabilidadeRepo.inicializarPlanoContasPadrao();
  }

  // 1. Lançamento Automático de Operação de Câmbio (Balcão ou Online)
  public lancarOperacaoCambio(operacao: {
    id: string;
    numeroOperacao: string;
    tipo: "compra" | "venda";
    moedaDivisa: "USD" | "EUR";
    montanteDivisa: string;
    montanteAoa: string;
    taxaAplicada: string;
    taxaReferenciaBna: string;
    operadorId: string;
    operadorNome: string;
  }): LancamentoContabil {
    const dataHoje = new Date().toISOString().slice(0, 10);
    const numeroLancamento = `LC-CAMBIO-${operacao.numeroOperacao}`;

    const contaCaixaDivisa = operacao.moedaDivisa === "USD" ? "1.1.2" : "1.1.3";
    const contaCaixaAoa = "1.1.1";
    const contaSpread = "4.1.1";

    // Cálculo do spread/margem bruta: (taxaAplicada - taxaReferenciaBna) * montanteDivisa
    const montanteDivisaDec = decimal(operacao.montanteDivisa);
    const taxaAplicadaDec = decimal(operacao.taxaAplicada);
    const taxaRefDec = decimal(operacao.taxaReferenciaBna);
    const contravalorAoaDec = decimal(operacao.montanteAoa);

    const partidas: PartidaContabilDTO[] = [];

    if (operacao.tipo === "compra") {
      // Compra: Caixa recebe Divisa (D) e paga Kwanza (C)
      // Partida 1: Débito em Caixa Divisas pelo contravalor em AOA
      partidas.push({
        contaCodigo: contaCaixaDivisa,
        tipo: "D",
        montanteOriginal: operacao.montanteDivisa,
        moeda: operacao.moedaDivisa,
        montanteAoa: contravalorAoaDec.toFixed(2),
        descricaoLinha: `Entrada física de ${operacao.montanteDivisa} ${operacao.moedaDivisa} em caixa`,
      });

      // Partida 2: Crédito em Caixa Kwanza pela saída de numerário
      partidas.push({
        contaCodigo: contaCaixaAoa,
        tipo: "C",
        montanteOriginal: contravalorAoaDec.toFixed(2),
        moeda: "AOA",
        montanteAoa: contravalorAoaDec.toFixed(2),
        descricaoLinha: `Saída de numerário AOA para pagamento ao cliente`,
      });
    } else {
      // Venda: Caixa recebe Kwanza (D) e entrega Divisa (C)
      // Partida 1: Débito em Caixa Kwanza pela entrada de numerário
      partidas.push({
        contaCodigo: contaCaixaAoa,
        tipo: "D",
        montanteOriginal: contravalorAoaDec.toFixed(2),
        moeda: "AOA",
        montanteAoa: contravalorAoaDec.toFixed(2),
        descricaoLinha: `Recebimento em numerário AOA do cliente`,
      });

      // Partida 2: Crédito em Caixa Divisas pela saída das notas estrangeiras
      partidas.push({
        contaCodigo: contaCaixaDivisa,
        tipo: "C",
        montanteOriginal: operacao.montanteDivisa,
        moeda: operacao.moedaDivisa,
        montanteAoa: contravalorAoaDec.toFixed(2),
        descricaoLinha: `Saída física de ${operacao.montanteDivisa} ${operacao.moedaDivisa} entregue ao cliente`,
      });
    }

    const lancamento = this.contabilidadeRepo.criarLancamento(
      {
        numeroLancamento,
        dataMovimento: dataHoje,
        origemTipo: "cambio_balcao",
        origemId: operacao.id,
        descricao: `Operação cambial ${operacao.tipo.toUpperCase()} de ${operacao.montanteDivisa} ${operacao.moedaDivisa} @ ${operacao.taxaAplicada} (${operacao.numeroOperacao})`,
        moeda: operacao.moedaDivisa,
        montanteOriginal: operacao.montanteDivisa,
        taxaCambio: operacao.taxaAplicada,
        contravalorAoa: contravalorAoaDec.toFixed(2),
        operadorId: operacao.operadorId,
        operadorNome: operacao.operadorNome,
      },
      partidas
    );

    this.auditoriaRepo.registar({
      acao: "CONTABILIDADE_LANCAMENTO_CAMBIO",
      recurso: "contabilidade",
      recursoId: lancamento.id,
      detalhes: {
        numeroLancamento,
        numeroOperacao: operacao.numeroOperacao,
        tipo: operacao.tipo,
        contravalorAoa: operacao.montanteAoa,
      },
      autorId: operacao.operadorId,
      autorNome: operacao.operadorNome,
    });

    return lancamento;
  }

  // 2. Lançamento Automático de Remessa Internacional
  public lancarRemessaCliente(remessa: {
    id: string;
    clienteNome: string;
    moedaDestino: "USD" | "EUR";
    montanteDivisa: string;
    totalAoa: string;
    comissaoAoa: string;
    operadorId: string;
    operadorNome: string;
  }): LancamentoContabil {
    const dataHoje = new Date().toISOString().slice(0, 10);
    const numeroLancamento = `LC-REM-${remessa.id.slice(0, 8).toUpperCase()}`;

    const totalAoaDec = decimal(remessa.totalAoa);
    const comissaoAoaDec = decimal(remessa.comissaoAoa);
    const contravalorLiquidoAoa = totalAoaDec.minus(comissaoAoaDec);

    const partidas: PartidaContabilDTO[] = [
      // D: Entrada em Caixa ou Banco do Kwanza recebido do cliente
      {
        contaCodigo: "1.2.1", // Depósitos Bancários / Recebimento Kwanza
        tipo: "D",
        montanteOriginal: totalAoaDec.toFixed(2),
        moeda: "AOA",
        montanteAoa: totalAoaDec.toFixed(2),
        descricaoLinha: `Recebimento de fundos para remessa de ${remessa.clienteNome}`,
      },
      // C: Conta Corrente do Parceiro (obrigação de liquidar no destino)
      {
        contaCodigo: "2.1.2", // Parceiros Comerciais - Remessas a Liquidar
        tipo: "C",
        montanteOriginal: contravalorLiquidoAoa.toFixed(2),
        moeda: "AOA",
        montanteAoa: contravalorLiquidoAoa.toFixed(2),
        descricaoLinha: `Provisão de liquidação de remessa ${remessa.montanteDivisa} ${remessa.moedaDestino}`,
      },
      // C: Receita de Comissão de Remessa auferida pelo NZAIDI
      {
        contaCodigo: "4.1.2", // Proveitos — Comissões de Remessas
        tipo: "C",
        montanteOriginal: comissaoAoaDec.toFixed(2),
        moeda: "AOA",
        montanteAoa: comissaoAoaDec.toFixed(2),
        descricaoLinha: `Comissão contratual de remessa cobrada ao cliente`,
      },
    ];

    return this.contabilidadeRepo.criarLancamento(
      {
        numeroLancamento,
        dataMovimento: dataHoje,
        origemTipo: "remessa_cliente",
        origemId: remessa.id,
        descricao: `Remessa internacional de ${remessa.montanteDivisa} ${remessa.moedaDestino} para ${remessa.clienteNome}`,
        moeda: remessa.moedaDestino,
        montanteOriginal: remessa.montanteDivisa,
        contravalorAoa: totalAoaDec.toFixed(2),
        operadorId: remessa.operadorId,
        operadorNome: remessa.operadorNome,
      },
      partidas
    );
  }

  // 3. Lançamento Automático de Suprimento (Reforço) ou Sangria de Caixa
  public lancarMovimentoTesourariaCaixa(mov: {
    caixaId: string;
    numeroCaixa: string;
    tipo: "suprimento" | "sangria";
    moeda: MoedaContabil;
    montante: string;
    descricao: string;
    operadorId: string;
    operadorNome: string;
  }): LancamentoContabil {
    const dataHoje = new Date().toISOString().slice(0, 10);
    const idSufixo = randomUUID().slice(0, 6).toUpperCase();
    const numeroLancamento = `LC-TES-${mov.tipo.toUpperCase()}-${idSufixo}`;

    const contaCaixa = mov.moeda === "AOA" ? "1.1.1" : mov.moeda === "USD" ? "1.1.2" : "1.1.3";
    const contaBancoOuCofre = mov.moeda === "AOA" ? "1.2.1" : "1.2.2";

    const montanteDec = decimal(mov.montante);
    const partidas: PartidaContabilDTO[] = [];

    if (mov.tipo === "suprimento") {
      // Suprimento: Dinheiro sai do cofre/banco (C) e entra no caixa físico (D)
      partidas.push({
        contaCodigo: contaCaixa,
        tipo: "D",
        montanteOriginal: montanteDec.toFixed(2),
        moeda: mov.moeda,
        montanteAoa: montanteDec.toFixed(2),
        descricaoLinha: `Reforço de caixa ${mov.numeroCaixa} (+${mov.montante} ${mov.moeda})`,
      });
      partidas.push({
        contaCodigo: contaBancoOuCofre,
        tipo: "C",
        montanteOriginal: montanteDec.toFixed(2),
        moeda: mov.moeda,
        montanteAoa: montanteDec.toFixed(2),
        descricaoLinha: `Saída da tesouraria central / cofre para suprimento de caixa`,
      });
    } else {
      // Sangria: Dinheiro sai do caixa físico (C) e é recolhido para o cofre/banco (D)
      partidas.push({
        contaCodigo: contaBancoOuCofre,
        tipo: "D",
        montanteOriginal: montanteDec.toFixed(2),
        moeda: mov.moeda,
        montanteAoa: montanteDec.toFixed(2),
        descricaoLinha: `Recolha de excedente de caixa para cofre/tesouraria central`,
      });
      partidas.push({
        contaCodigo: contaCaixa,
        tipo: "C",
        montanteOriginal: montanteDec.toFixed(2),
        moeda: mov.moeda,
        montanteAoa: montanteDec.toFixed(2),
        descricaoLinha: `Sangria no caixa ${mov.numeroCaixa} (-${mov.montante} ${mov.moeda})`,
      });
    }

    return this.contabilidadeRepo.criarLancamento(
      {
        numeroLancamento,
        dataMovimento: dataHoje,
        origemTipo: mov.tipo === "suprimento" ? "suprimento_caixa" : "sangria_caixa",
        origemId: mov.caixaId,
        descricao: `${mov.tipo === "suprimento" ? "Suprimento/Reforço" : "Sangria"} de Caixa ${mov.numeroCaixa}: ${mov.descricao}`,
        moeda: mov.moeda,
        montanteOriginal: montanteDec.toFixed(2),
        contravalorAoa: montanteDec.toFixed(2),
        operadorId: mov.operadorId,
        operadorNome: mov.operadorNome,
      },
      partidas
    );
  }

  // 4. Lançamento Automático de Quebra ou Sobra de Fecho de Caixa
  public lancarDiferencaFechoCaixa(fecho: {
    caixaId: string;
    numeroCaixa: string;
    moeda: MoedaContabil;
    diferenca: string; // Positivo = sobra, Negativo = falta/quebra
    justificativa?: string | null | undefined;
    operadorId: string;
    operadorNome: string;
  }): LancamentoContabil | null {
    const difDec = decimal(fecho.diferenca);
    if (difDec.isZero()) return null;

    const dataHoje = new Date().toISOString().slice(0, 10);
    const numeroLancamento = `LC-FECHO-DIF-${fecho.numeroCaixa}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const contaCaixa = fecho.moeda === "AOA" ? "1.1.1" : fecho.moeda === "USD" ? "1.1.2" : "1.1.3";

    const partidas: PartidaContabilDTO[] = [];

    if (difDec.isNegative()) {
      // Falta/Quebra de Caixa: Custo de Quebra (D) e Ajuste negativo no Caixa (C)
      const valorAbs = difDec.abs().toFixed(2);
      partidas.push({
        contaCodigo: "5.1.2", // Custos — Quebras e Ajustes de Caixa
        tipo: "D",
        montanteOriginal: valorAbs,
        moeda: fecho.moeda,
        montanteAoa: valorAbs,
        descricaoLinha: `Reconhecimento de quebra/falta no fecho do caixa ${fecho.numeroCaixa}`,
      });
      partidas.push({
        contaCodigo: contaCaixa,
        tipo: "C",
        montanteOriginal: valorAbs,
        moeda: fecho.moeda,
        montanteAoa: valorAbs,
        descricaoLinha: `Ajuste para conciliar saldo físico com o sistema`,
      });

      return this.contabilidadeRepo.criarLancamento(
        {
          numeroLancamento,
          dataMovimento: dataHoje,
          origemTipo: "quebra_fecho_caixa",
          origemId: fecho.caixaId,
          descricao: `Quebra de caixa apurada no fecho do caixa ${fecho.numeroCaixa}: ${fecho.justificativa || "Sem justificativa formal"}`,
          moeda: fecho.moeda,
          montanteOriginal: valorAbs,
          contravalorAoa: valorAbs,
          operadorId: fecho.operadorId,
          operadorNome: fecho.operadorNome,
        },
        partidas
      );
    } else {
      // Sobra de Caixa: Entrada no Caixa (D) e Proveito extraordinário (C)
      const valorAbs = difDec.toFixed(2);
      partidas.push({
        contaCodigo: contaCaixa,
        tipo: "D",
        montanteOriginal: valorAbs,
        moeda: fecho.moeda,
        montanteAoa: valorAbs,
        descricaoLinha: `Entrada física da sobra apurada no fecho do caixa ${fecho.numeroCaixa}`,
      });
      partidas.push({
        contaCodigo: "4.1.3", // Proveitos — Sobras e Ajustes de Caixa
        tipo: "C",
        montanteOriginal: valorAbs,
        moeda: fecho.moeda,
        montanteAoa: valorAbs,
        descricaoLinha: `Reconhecimento da sobra física de numerário`,
      });

      return this.contabilidadeRepo.criarLancamento(
        {
          numeroLancamento,
          dataMovimento: dataHoje,
          origemTipo: "sobra_fecho_caixa",
          origemId: fecho.caixaId,
          descricao: `Sobra de caixa apurada no fecho do caixa ${fecho.numeroCaixa}: ${fecho.justificativa || "Sobra física verificada"}`,
          moeda: fecho.moeda,
          montanteOriginal: valorAbs,
          contravalorAoa: valorAbs,
          operadorId: fecho.operadorId,
          operadorNome: fecho.operadorNome,
        },
        partidas
      );
    }
  }

  // 5. Motor de Reconciliação Geral e Deteção de Divergências
  public executarReconciliacaoGeral(): { totalVerificadas: number; novasDivergencias: number } {
    let novasDivergencias = 0;
    let totalVerificadas = 0;

    // Regra 1: Verificar se todas as operações de câmbio confirmadas possuem borderô emitido
    const operacoesSemBordero = this.db
      .prepare(`
        SELECT o.id, o.numero_operacao, o.montante_aoa, o.moeda_divisa
        FROM operacoes_cambio o
        LEFT JOIN borderos b ON b.operacao_id = o.id
        WHERE o.estado = 'confirmada' AND b.id IS NULL
      `)
      .all() as any[];

    for (const op of operacoesSemBordero) {
      totalVerificadas++;
      // Verificar se já existe divergência aberta para esta operação
      const existente = this.db
        .prepare(`
          SELECT id FROM divergencias_reconciliacao 
          WHERE referencia_id = ? AND tipo = 'bordero_vs_movimento' AND estado = 'aberta'
        `)
        .get(op.id);

      if (!existente) {
        this.contabilidadeRepo.registrarDivergencia({
          tipo: "bordero_vs_movimento",
          referenciaId: op.id,
          origem: `Operação Cambial ${op.numero_operacao}`,
          valorEsperado: op.montante_aoa,
          valorObservado: "0.00",
          moeda: "AOA",
          diferenca: op.montante_aoa,
        });
        novasDivergencias++;
      }
    }

    // Regra 2: Verificar se todas as operações de câmbio confirmadas possuem lançamento contabilístico
    const operacoesSemContabilidade = this.db
      .prepare(`
        SELECT o.id, o.numero_operacao, o.montante_aoa, o.moeda_divisa
        FROM operacoes_cambio o
        LEFT JOIN lancamentos_contabeis l ON l.origem_id = o.id AND l.origem_tipo = 'cambio_balcao'
        WHERE o.estado = 'confirmada' AND l.id IS NULL
      `)
      .all() as any[];

    for (const op of operacoesSemContabilidade) {
      totalVerificadas++;
      const existente = this.db
        .prepare(`
          SELECT id FROM divergencias_reconciliacao 
          WHERE referencia_id = ? AND tipo = 'cambio_vs_liquidacao' AND estado = 'aberta'
        `)
        .get(op.id);

      if (!existente) {
        this.contabilidadeRepo.registrarDivergencia({
          tipo: "cambio_vs_liquidacao",
          referenciaId: op.id,
          origem: `Operação Cambial ${op.numero_operacao}`,
          valorEsperado: op.montante_aoa,
          valorObservado: "0.00",
          moeda: "AOA",
          diferenca: op.montante_aoa,
        });
        novasDivergencias++;
      }
    }

    // Regra 3: Verificar fechos de caixa com divergência de contagem (quebra ou sobra não nula)
    const caixasComDiferenca = this.db
      .prepare(`
        SELECT id, numero_caixa, diferenca_aoa
        FROM caixas 
        WHERE estado IN ('fechado', 'pendente_aprovacao')
          AND diferenca_aoa IS NOT NULL 
          AND diferenca_aoa != '0.00' 
          AND diferenca_aoa != '0'
      `)
      .all() as any[];

    for (const cx of caixasComDiferenca) {
      totalVerificadas++;
      const existente = this.db
        .prepare(`
          SELECT id FROM divergencias_reconciliacao 
          WHERE referencia_id = ? AND tipo = 'caixa_vs_contagem' AND estado = 'aberta'
        `)
        .get(cx.id);

      if (!existente) {
        this.contabilidadeRepo.registrarDivergencia({
          tipo: "caixa_vs_contagem",
          referenciaId: cx.id,
          origem: `Caixa Fechado ${cx.numero_caixa}`,
          valorEsperado: "0.00",
          valorObservado: cx.diferenca_aoa,
          moeda: "AOA",
          diferenca: cx.diferenca_aoa,
        });
        novasDivergencias++;
      }
    }

    return { totalVerificadas, novasDivergencias };
  }

  // 6. Relatórios Analíticos
  public obterResumoDiario(filtros: { dataInicio?: string; dataFim?: string }) {
    const dataInicio = filtros.dataInicio || new Date().toISOString().slice(0, 10);
    const dataFim = filtros.dataFim || dataInicio;

    // Totais de Operações Cambiais no Período
    const cambiodados = this.db
      .prepare(`
        SELECT 
          tipo,
          moeda_divisa,
          COUNT(*) as qtd,
          SUM(CAST(montante_divisa AS REAL)) as total_divisa,
          SUM(CAST(montante_aoa AS REAL)) as total_aoa
        FROM operacoes_cambio
        WHERE estado = 'confirmada' 
          AND substr(criado_em, 1, 10) >= ? AND substr(criado_em, 1, 10) <= ?
        GROUP BY tipo, moeda_divisa
      `)
      .all(dataInicio, dataFim) as any[];

    // Totais de Remessas
    const remessasDados = this.db
      .prepare(`
        SELECT 
          moeda_destino,
          COUNT(*) as qtd,
          SUM(CAST(montante_divisa AS REAL)) as total_divisa,
          SUM(CAST(total_aoa AS REAL)) as total_aoa,
          SUM(CAST(comissao_aoa AS REAL)) as total_comissao_aoa
        FROM pedidos_remessas
        WHERE estado = 'executada'
          AND substr(criado_em, 1, 10) >= ? AND substr(criado_em, 1, 10) <= ?
        GROUP BY moeda_destino
      `)
      .all(dataInicio, dataFim) as any[];

    // Totais Contabilísticos de Receitas no Período
    const receitasDados = this.db
      .prepare(`
        SELECT 
          p.conta_codigo,
          c.nome as conta_nome,
          SUM(CAST(p.montante_aoa AS REAL)) as receita_aoa
        FROM partidas_contabeis p
        JOIN lancamentos_contabeis l ON l.id = p.lancamento_id
        JOIN contas_contabeis c ON c.codigo = p.conta_codigo
        WHERE l.estado = 'confirmado'
          AND c.tipo = 'proveito'
          AND p.tipo = 'C'
          AND l.data_movimento >= ? AND l.data_movimento <= ?
        GROUP BY p.conta_codigo
      `)
      .all(dataInicio, dataFim) as any[];

    return {
      periodo: { dataInicio, dataFim },
      operacoesCambio: cambiodados.map((r) => ({
        tipo: r.tipo,
        moeda: r.moeda_divisa,
        quantidade: Number(r.qtd),
        totalDivisa: Number(r.total_divisa || 0).toFixed(2),
        totalAoa: Number(r.total_aoa || 0).toFixed(2),
      })),
      remessas: remessasDados.map((r) => ({
        moeda: r.moeda_destino,
        quantidade: Number(r.qtd),
        totalDivisa: Number(r.total_divisa || 0).toFixed(2),
        totalAoa: Number(r.total_aoa || 0).toFixed(2),
        totalComissaoAoa: Number(r.total_comissao_aoa || 0).toFixed(2),
      })),
      receitasApuradas: receitasDados.map((r) => ({
        contaCodigo: r.conta_codigo,
        contaNome: r.conta_nome,
        totalAoa: Number(r.receita_aoa || 0).toFixed(2),
      })),
    };
  }

  public obterPosicaoCambial(filtros: { dataInicio?: string; dataFim?: string }) {
    const dataInicio = filtros.dataInicio || "2026-01-01";
    const dataFim = filtros.dataFim || new Date().toISOString().slice(0, 10);

    const moedas = ["USD", "EUR"];
    const posicao = [];

    for (const moeda of moedas) {
      const compras = this.db
        .prepare(`
          SELECT 
            COUNT(*) as qtd,
            SUM(CAST(montante_divisa AS REAL)) as divisa,
            SUM(CAST(montante_aoa AS REAL)) as aoa
          FROM operacoes_cambio
          WHERE estado = 'confirmada' AND tipo = 'compra' AND moeda_divisa = ?
            AND substr(criado_em, 1, 10) >= ? AND substr(criado_em, 1, 10) <= ?
        `)
        .get(moeda, dataInicio, dataFim) as any;

      const vendas = this.db
        .prepare(`
          SELECT 
            COUNT(*) as qtd,
            SUM(CAST(montante_divisa AS REAL)) as divisa,
            SUM(CAST(montante_aoa AS REAL)) as aoa
          FROM operacoes_cambio
          WHERE estado = 'confirmada' AND tipo = 'venda' AND moeda_divisa = ?
            AND substr(criado_em, 1, 10) >= ? AND substr(criado_em, 1, 10) <= ?
        `)
        .get(moeda, dataInicio, dataFim) as any;

      const totalCompraDivisa = Number(compras?.divisa || 0);
      const totalCompraAoa = Number(compras?.aoa || 0);
      const totalVendaDivisa = Number(vendas?.divisa || 0);
      const totalVendaAoa = Number(vendas?.aoa || 0);

      const taxaMediaCompra = totalCompraDivisa > 0 ? (totalCompraAoa / totalCompraDivisa).toFixed(4) : "0.0000";
      const taxaMediaVenda = totalVendaDivisa > 0 ? (totalVendaAoa / totalVendaDivisa).toFixed(4) : "0.0000";
      const saldoDivisa = (totalCompraDivisa - totalVendaDivisa).toFixed(2);
      const margemBrutaAoa = (totalVendaAoa - (totalVendaDivisa * Number(taxaMediaCompra))).toFixed(2);

      posicao.push({
        moeda,
        compras: {
          quantidade: Number(compras?.qtd || 0),
          totalDivisa: totalCompraDivisa.toFixed(2),
          totalAoa: totalCompraAoa.toFixed(2),
          taxaMedia: taxaMediaCompra,
        },
        vendas: {
          quantidade: Number(vendas?.qtd || 0),
          totalDivisa: totalVendaDivisa.toFixed(2),
          totalAoa: totalVendaAoa.toFixed(2),
          taxaMedia: taxaMediaVenda,
        },
        posicaoLiquidaDivisa: saldoDivisa,
        margemBrutaEstimadaAoa: margemBrutaAoa,
      });
    }

    return {
      periodo: { dataInicio, dataFim },
      posicao,
    };
  }

  // 7. Utilitário de Exportação para Formato CSV (RFC 4180)
  public exportarParaCsv(colunas: string[], linhas: (string | number)[][]): string {
    const escapar = (val: string | number) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = colunas.map(escapar).join(",");
    const body = linhas.map((linha) => linha.map(escapar).join(",")).join("\r\n");

    return `${header}\r\n${body}`;
  }
}
