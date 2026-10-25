/**
 * NZAIDI — Dados e parâmetros de taxas para o website institucional (docs/10, R-07, R-14, R-15).
 * 
 * Fonte das taxas:
 * - Em modo institucional público inicial, utiliza parâmetros de referência do Banco Nacional de Angola (BNA)
 *   e as margens comerciais aprovadas pela gestão da NZAIDI.
 * - Integra com o endpoint `GET /api/v1/taxas` com fallback transparente e seguro.
 * - Todos os cálculos utilizam a função pura `calcularTaxas` de `@nzaidi/dominio`.
 */
import {
  calcularTaxas,
  type ParametroTaxa,
  type LimitesMargem,
  type TaxasCalculadas,
  type MoedaDivisa,
} from "@nzaidi/dominio";

export interface InfoTaxaMoeda {
  readonly moeda: MoedaDivisa;
  readonly nome: string;
  readonly bandeira: string;
  readonly simbolo: string;
  readonly parametro: ParametroTaxa;
  readonly taxas: TaxasCalculadas;
  readonly fonte: "demonstracao" | "oficial";
  readonly aviso?: string | null;
  readonly atualizadoEm?: string;
}

/**
 * Limites regulamentares aceites para margens comerciais (parâmetros de governança).
 */
export const LIMITES_MARGEM_PADRAO: LimitesMargem = {
  minima: "0.005", // 0.5%
  maxima: "0.100", // 10.0%
};

/**
 * Parâmetros de taxas do dia para o site público.
 * Nota: Os valores de referência correspondem às cotações indicativas de mercado em Luanda.
 * A NZAIDI actualiza diariamente com base no BNA e fixa as margens de compra e venda.
 */
export const PARAMETROS_INICIAIS: Record<MoedaDivisa, ParametroTaxa> = {
  USD: {
    moeda: "USD",
    referencia: "915.5000",
    margemCompra: "0.0200", // 2.0% abaixo da referência (compra ao cliente)
    margemVenda: "0.0250",  // 2.5% acima da referência (venda ao cliente)
  },
  EUR: {
    moeda: "EUR",
    referencia: "985.2000",
    margemCompra: "0.0200", // 2.0% abaixo da referência
    margemVenda: "0.0250",  // 2.5% acima da referência
  },
};

/**
 * Retorna as informações completas de taxas calculadas para as moedas suportadas.
 */
export function obterTabelaTaxas(
  parametros = PARAMETROS_INICIAIS,
  limites = LIMITES_MARGEM_PADRAO,
  fonte: "demonstracao" | "oficial" = "demonstracao",
  aviso: string | null = "Cotação indicativa de demonstração. Não utilizar para liquidação financeira real."
): Record<MoedaDivisa, InfoTaxaMoeda> {
  const usdTaxas = calcularTaxas(parametros.USD, limites);
  const eurTaxas = calcularTaxas(parametros.EUR, limites);

  return {
    USD: {
      moeda: "USD",
      nome: "Dólar Americano",
      bandeira: "🇺🇸",
      simbolo: "US$",
      parametro: parametros.USD,
      taxas: usdTaxas,
      fonte,
      aviso,
      atualizadoEm: new Date().toISOString(),
    },
    EUR: {
      moeda: "EUR",
      nome: "Euro",
      bandeira: "🇪🇺",
      simbolo: "€",
      parametro: parametros.EUR,
      taxas: eurTaxas,
      fonte,
      aviso,
      atualizadoEm: new Date().toISOString(),
    },
  };
}

/**
 * Camada de serviço de integração para consultar `GET /api/v1/taxas`.
 * Falha de forma graciosa sem quebrar a interface em caso de indisponibilidade da API.
 */
export async function buscarTaxasDaApi(url = "/api/v1/taxas"): Promise<Record<MoedaDivisa, InfoTaxaMoeda> | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const json = await res.json();
    if (!json.sucesso || !Array.isArray(json.dados)) return null;

    const usdItem = json.dados.find((d: any) => d.moeda === "USD");
    const eurItem = json.dados.find((d: any) => d.moeda === "EUR");

    if (!usdItem || !eurItem) return null;

    const novosParametros: Record<MoedaDivisa, ParametroTaxa> = {
      USD: {
        moeda: "USD",
        referencia: usdItem.referencia,
        margemCompra: usdItem.margemCompra,
        margemVenda: usdItem.margemVenda,
      },
      EUR: {
        moeda: "EUR",
        referencia: eurItem.referencia,
        margemCompra: eurItem.margemCompra,
        margemVenda: eurItem.margemVenda,
      },
    };

    const fonteGeral = usdItem.fonte === "oficial" && eurItem.fonte === "oficial" ? "oficial" : "demonstracao";
    const aviso = fonteGeral === "oficial" ? null : (usdItem.aviso ?? "Taxas de demonstração");

    return obterTabelaTaxas(novosParametros, LIMITES_MARGEM_PADRAO, fonteGeral, aviso);
  } catch {
    return null; // Fallback para modo offline/local
  }
}
