/**
 * NZAIDI — Dados e parâmetros de taxas para o website institucional (docs/10, R-07, R-14, R-15).
 * 
 * Fonte das taxas:
 * - Em modo institucional público inicial, utiliza parâmetros de referência do Banco Nacional de Angola (BNA)
 *   e as margens comerciais aprovadas pela gestão da NZAIDI.
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
  limites = LIMITES_MARGEM_PADRAO
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
    },
    EUR: {
      moeda: "EUR",
      nome: "Euro",
      bandeira: "🇪🇺",
      simbolo: "€",
      parametro: parametros.EUR,
      taxas: eurTaxas,
    },
  };
}
