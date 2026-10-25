import type { DatabaseSync } from "node:sqlite";
import { D, decimal, type Decimal } from "@nzaidi/dominio";
import type { Caixa, MovimentoCaixa, MoedaCaixa, SaldoCalculado } from "./caixa.types.js";

interface CaixaRow {
  id: string;
  numero_caixa: string;
  operador_id: string;
  operador_nome: string;
  agencia: string;
  aberto_em: string;
  fechado_em: string | null;
  estado: string;
  saldo_inicial_aoa: string;
  saldo_inicial_usd: string;
  saldo_inicial_eur: string;
  saldo_fecho_aoa_contado: string | null;
  saldo_fecho_usd_contado: string | null;
  saldo_fecho_eur_contado: string | null;
  diferenca_aoa: string | null;
  diferenca_usd: string | null;
  diferenca_eur: string | null;
  justificativa_diferenca: string | null;
  fechado_por_id: string | null;
}

interface MovimentoRow {
  id: string;
  caixa_id: string;
  tipo: string;
  moeda: string;
  montante: string;
  operacao_id: string | null;
  descricao: string;
  criado_em: string;
  operador_id: string;
}

function mapearCaixa(r: CaixaRow): Caixa {
  return {
    id: r.id,
    numeroCaixa: r.numero_caixa,
    operadorId: r.operador_id,
    operadorNome: r.operador_nome,
    agencia: r.agencia,
    abertoEm: r.aberto_em,
    fechadoEm: r.fechado_em,
    estado: r.estado as Caixa["estado"],
    saldoInicialAoa: r.saldo_inicial_aoa,
    saldoInicialUsd: r.saldo_inicial_usd,
    saldoInicialEur: r.saldo_inicial_eur,
    saldoFechoAoaContado: r.saldo_fecho_aoa_contado,
    saldoFechoUsdContado: r.saldo_fecho_usd_contado,
    saldoFechoEurContado: r.saldo_fecho_eur_contado,
    diferencaAoa: r.diferenca_aoa,
    diferencaUsd: r.diferenca_usd,
    diferencaEur: r.diferenca_eur,
    justificativaDiferenca: r.justificativa_diferenca,
    fechadoPorId: r.fechado_por_id,
  };
}

function mapearMovimento(r: MovimentoRow): MovimentoCaixa {
  return {
    id: r.id,
    caixaId: r.caixa_id,
    tipo: r.tipo as MovimentoCaixa["tipo"],
    moeda: r.moeda as MoedaCaixa,
    montante: r.montante,
    operacaoId: r.operacao_id,
    descricao: r.descricao,
    criadoEm: r.criado_em,
    operadorId: r.operador_id,
  };
}

export class CaixaRepository {
  constructor(private db: DatabaseSync) {}

  public inserirCaixa(caixa: Caixa): void {
    const stmt = this.db.prepare(`
      INSERT INTO caixas (
        id, numero_caixa, operador_id, operador_nome, agencia,
        aberto_em, fechado_em, estado, saldo_inicial_aoa,
        saldo_inicial_usd, saldo_inicial_eur
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      caixa.id,
      caixa.numeroCaixa,
      caixa.operadorId,
      caixa.operadorNome,
      caixa.agencia,
      caixa.abertoEm,
      caixa.fechadoEm ?? null,
      caixa.estado,
      caixa.saldoInicialAoa,
      caixa.saldoInicialUsd,
      caixa.saldoInicialEur
    );
  }

  public buscarCaixaAbertoPorOperador(operadorId: string): Caixa | null {
    const stmt = this.db.prepare(`
      SELECT * FROM caixas 
      WHERE operador_id = ? AND estado = 'aberto'
      ORDER BY aberto_em DESC LIMIT 1
    `);
    const row = stmt.get(operadorId) as CaixaRow | undefined;
    return row ? mapearCaixa(row) : null;
  }

  public buscarCaixaPorId(id: string): Caixa | null {
    const stmt = this.db.prepare(`SELECT * FROM caixas WHERE id = ?`);
    const row = stmt.get(id) as CaixaRow | undefined;
    return row ? mapearCaixa(row) : null;
  }

  public listarCaixas(limite = 50, offset = 0): Caixa[] {
    const stmt = this.db.prepare(`
      SELECT * FROM caixas ORDER BY aberto_em DESC LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limite, offset) as unknown as CaixaRow[];
    return rows.map(mapearCaixa);
  }

  public fecharCaixa(
    caixaId: string,
    dados: {
      fechadoEm: string;
      saldoFechoAoaContado: string;
      saldoFechoUsdContado: string;
      saldoFechoEurContado: string;
      diferencaAoa: string;
      diferencaUsd: string;
      diferencaEur: string;
      justificativaDiferenca?: string | null;
      fechadoPorId: string;
      estado: "fechado" | "pendente_aprovacao";
    }
  ): void {
    const stmt = this.db.prepare(`
      UPDATE caixas SET
        fechado_em = ?,
        saldo_fecho_aoa_contado = ?,
        saldo_fecho_usd_contado = ?,
        saldo_fecho_eur_contado = ?,
        diferenca_aoa = ?,
        diferenca_usd = ?,
        diferenca_eur = ?,
        justificativa_diferenca = ?,
        fechado_por_id = ?,
        estado = ?
      WHERE id = ?
    `);

    stmt.run(
      dados.fechadoEm,
      dados.saldoFechoAoaContado,
      dados.saldoFechoUsdContado,
      dados.saldoFechoEurContado,
      dados.diferencaAoa,
      dados.diferencaUsd,
      dados.diferencaEur,
      dados.justificativaDiferenca ?? null,
      dados.fechadoPorId,
      dados.estado,
      caixaId
    );
  }

  public inserirMovimento(m: MovimentoCaixa): void {
    const stmt = this.db.prepare(`
      INSERT INTO movimentos_caixa (
        id, caixa_id, tipo, moeda, montante, operacao_id, descricao, criado_em, operador_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      m.id,
      m.caixaId,
      m.tipo,
      m.moeda,
      m.montante,
      m.operacaoId ?? null,
      m.descricao,
      m.criadoEm,
      m.operadorId
    );
  }

  public listarMovimentosDoCaixa(caixaId: string): MovimentoCaixa[] {
    const stmt = this.db.prepare(`
      SELECT * FROM movimentos_caixa 
      WHERE caixa_id = ? 
      ORDER BY criado_em ASC
    `);
    const rows = stmt.all(caixaId) as unknown as MovimentoRow[];
    return rows.map(mapearMovimento);
  }

  public calcularSaldos(caixa: Caixa): Record<MoedaCaixa, SaldoCalculado> {
    const movimentos = this.listarMovimentosDoCaixa(caixa.id);

    const moedas: MoedaCaixa[] = ["AOA", "USD", "EUR"];
    const resultado = {} as Record<MoedaCaixa, SaldoCalculado>;

    for (const moeda of moedas) {
      let saldoInicial: Decimal;
      if (moeda === "AOA") saldoInicial = decimal(caixa.saldoInicialAoa);
      else if (moeda === "USD") saldoInicial = decimal(caixa.saldoInicialUsd);
      else saldoInicial = decimal(caixa.saldoInicialEur);

      let entradas = new D(0);
      let saidas = new D(0);

      const movsMoeda = movimentos.filter((m) => m.moeda === moeda);
      for (const m of movsMoeda) {
        // Ignora o movimento inicial de abertura no cálculo de entradas para evitar dupla contagem com o saldoInicial
        if (m.tipo === "abertura") continue;

        const valor = decimal(m.montante);
        if (valor.isPositive()) {
          entradas = entradas.plus(valor);
        } else {
          saidas = saidas.plus(valor.abs());
        }
      }

      const saldoEsperado = saldoInicial.plus(entradas).minus(saidas);

      resultado[moeda] = {
        moeda,
        saldoInicial: saldoInicial.toFixed(2),
        entradas: entradas.toFixed(2),
        saidas: saidas.toFixed(2),
        saldoEsperado: saldoEsperado.toFixed(2),
      };
    }

    return resultado;
  }
}
