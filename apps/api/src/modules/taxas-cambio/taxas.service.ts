import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  calcularTaxas,
  type ParametroTaxa,
  type LimitesMargem,
  type MoedaDivisa,
  type TaxasCalculadas,
} from "@nzaidi/dominio";

export interface TaxaConfigDB {
  moeda: MoedaDivisa;
  referencia: string;
  margemCompra: string;
  margemVenda: string;
  fonte: string;
  atualizadoEm: string;
  atualizadoPorId?: string | null | undefined;
  atualizadoPorNome?: string | null | undefined;
  motivo?: string | null | undefined;
}

export interface TaxaRespostaPublica {
  moeda: MoedaDivisa;
  referencia: string;
  compra: string;
  venda: string;
  margemCompra: string;
  margemVenda: string;
  fonte: "demonstracao" | "oficial";
  aviso?: string | null | undefined;
  atualizadoEm: string;
}

export const LIMITES_MARGEM_OFICIAIS: LimitesMargem = {
  minima: "0.005", // 0.5%
  maxima: "0.100", // 10.0%
};

const TAXAS_INICIAIS: Record<MoedaDivisa, Omit<TaxaConfigDB, "atualizadoEm">> = {
  USD: {
    moeda: "USD",
    referencia: "915.5000",
    margemCompra: "0.0200",
    margemVenda: "0.0250",
    fonte: "demonstracao",
    motivo: "Parâmetros padrão de inicialização",
  },
  EUR: {
    moeda: "EUR",
    referencia: "985.2000",
    margemCompra: "0.0200",
    margemVenda: "0.0250",
    fonte: "demonstracao",
    motivo: "Parâmetros padrão de inicialização",
  },
};

export class TaxasRepository {
  constructor(private db: DatabaseSync) {
    this.assegurarTaxasIniciais();
  }

  private assegurarTaxasIniciais(): void {
    const moedas: MoedaDivisa[] = ["USD", "EUR"];
    for (const m of moedas) {
      const row = this.buscar(m);
      if (!row) {
        const init = TAXAS_INICIAIS[m];
        this.salvar({
          ...init,
          atualizadoEm: new Date().toISOString(),
          atualizadoPorId: "sistema",
          atualizadoPorNome: "Inicialização do Sistema",
        });
      }
    }
  }

  public buscar(moeda: MoedaDivisa): TaxaConfigDB | null {
    const stmt = this.db.prepare(`
      SELECT 
        moeda, referencia, margem_compra as margemCompra,
        margem_venda as margemVenda, fonte,
        atualizado_em as atualizadoEm,
        atualizado_por_id as atualizadoPorId,
        atualizado_por_nome as atualizadoPorNome,
        motivo
      FROM taxas_config
      WHERE moeda = ?
    `);

    const row = stmt.get(moeda) as any;
    return row ? (row as TaxaConfigDB) : null;
  }

  public listar(): TaxaConfigDB[] {
    const stmt = this.db.prepare(`
      SELECT 
        moeda, referencia, margem_compra as margemCompra,
        margem_venda as margemVenda, fonte,
        atualizado_em as atualizadoEm,
        atualizado_por_id as atualizadoPorId,
        atualizado_por_nome as atualizadoPorNome,
        motivo
      FROM taxas_config
      ORDER BY moeda ASC
    `);

    return stmt.all() as unknown as TaxaConfigDB[];
  }

  public salvar(config: TaxaConfigDB): void {
    const stmt = this.db.prepare(`
      INSERT INTO taxas_config (
        moeda, referencia, margem_compra, margem_venda, fonte,
        atualizado_em, atualizado_por_id, atualizado_por_nome, motivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(moeda) DO UPDATE SET
        referencia = excluded.referencia,
        margem_compra = excluded.margem_compra,
        margem_venda = excluded.margem_venda,
        fonte = excluded.fonte,
        atualizado_em = excluded.atualizado_em,
        atualizado_por_id = excluded.atualizado_por_id,
        atualizado_por_nome = excluded.atualizado_por_nome,
        motivo = excluded.motivo
    `);

    stmt.run(
      config.moeda,
      config.referencia,
      config.margemCompra,
      config.margemVenda,
      config.fonte,
      config.atualizadoEm,
      config.atualizadoPorId ?? null,
      config.atualizadoPorNome ?? null,
      config.motivo ?? null
    );

    try {
      const calculadas = calcularTaxas(
        {
          moeda: config.moeda,
          referencia: config.referencia,
          margemCompra: config.margemCompra,
          margemVenda: config.margemVenda,
        },
        LIMITES_MARGEM_OFICIAIS
      );
      const histStmt = this.db.prepare(`
        INSERT INTO taxas_historico (
          id, moeda, referencia, margem_compra, margem_venda, taxa_compra, taxa_venda,
          fonte, alterado_por_id, alterado_por_nome, motivo, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      histStmt.run(
        `txh_${randomUUID()}`,
        config.moeda,
        config.referencia,
        config.margemCompra,
        config.margemVenda,
        calculadas.compra.toFixed(4),
        calculadas.venda.toFixed(4),
        config.fonte,
        config.atualizadoPorId ?? null,
        config.atualizadoPorNome ?? null,
        config.motivo ?? null,
        config.atualizadoEm
      );
    } catch {
      // Tabela de histórico opcional em bootstrap
    }
  }
}

export class TaxasService {
  constructor(private repo: TaxasRepository) {}

  public obterTaxaCalculada(moeda: MoedaDivisa): TaxaRespostaPublica {
    const conf = this.repo.buscar(moeda);
    if (!conf) {
      throw new Error(`Taxa para moeda ${moeda} não configurada`);
    }

    const param: ParametroTaxa = {
      moeda: conf.moeda,
      referencia: conf.referencia,
      margemCompra: conf.margemCompra,
      margemVenda: conf.margemVenda,
    };

    const calculadas: TaxasCalculadas = calcularTaxas(param, LIMITES_MARGEM_OFICIAIS);
    const ehDemonstracao = conf.fonte === "demonstracao";

    return {
      moeda: conf.moeda,
      referencia: calculadas.referencia.toFixed(4),
      compra: calculadas.compra.toFixed(4),
      venda: calculadas.venda.toFixed(4),
      margemCompra: conf.margemCompra,
      margemVenda: conf.margemVenda,
      fonte: ehDemonstracao ? "demonstracao" : "oficial",
      aviso: ehDemonstracao
        ? "Cotação indicativa de demonstração. Não utilizar para liquidação financeira real."
        : null,
      atualizadoEm: conf.atualizadoEm,
    };
  }

  public listarTaxas(): TaxaRespostaPublica[] {
    const moedas: MoedaDivisa[] = ["USD", "EUR"];
    return moedas.map((m) => this.obterTaxaCalculada(m));
  }

  public atualizarTaxa(
    moeda: MoedaDivisa,
    params: {
      referencia: string;
      margemCompra: string;
      margemVenda: string;
      fonte?: "demonstracao" | "oficial" | undefined;
      autorId: string;
      autorNome: string;
      motivo: string;
    }
  ): TaxaRespostaPublica {
    // Valida com @nzaidi/dominio antes de gravar
    const param: ParametroTaxa = {
      moeda,
      referencia: params.referencia,
      margemCompra: params.margemCompra,
      margemVenda: params.margemVenda,
    };

    calcularTaxas(param, LIMITES_MARGEM_OFICIAIS); // Lança ErroTaxa se fora do intervalo ou inválido

    const novoRegistro: TaxaConfigDB = {
      moeda,
      referencia: params.referencia,
      margemCompra: params.margemCompra,
      margemVenda: params.margemVenda,
      fonte: params.fonte ?? "demonstracao",
      atualizadoEm: new Date().toISOString(),
      atualizadoPorId: params.autorId,
      atualizadoPorNome: params.autorNome,
      motivo: params.motivo,
    };

    this.repo.salvar(novoRegistro);
    return this.obterTaxaCalculada(moeda);
  }
}
