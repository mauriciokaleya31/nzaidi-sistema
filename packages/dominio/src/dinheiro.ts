/**
 * Valores monetários em decimal exato (docs/10, §1).
 * Nunca se aceitam números de vírgula flutuante: os montantes entram como texto.
 */
import { Decimal as DecimalJs } from "decimal.js";

/** Precisão alta para cálculos intermédios; o arredondamento é sempre explícito. */
const D = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_HALF_UP });
export { D };
export type Decimal = InstanceType<typeof D>;

/** Moeda base (AOA) e moedas de câmbio confirmadas (R-15). */
export const MOEDAS = ["AOA", "USD", "EUR"] as const;
export type Moeda = (typeof MOEDAS)[number];

/** Casas decimais dos montantes (docs/10, §1: duas casas). */
export const CASAS_MONTANTE = 2;

/**
 * Regra de arredondamento dos montantes.
 * PROPOSTA (D-25): metade para cima. Por confirmar com a tesouraria.
 */
export const ARREDONDAMENTO_MONTANTE = D.ROUND_HALF_UP;

export interface Valor {
  readonly moeda: Moeda;
  readonly montante: Decimal;
}

const RE_DECIMAL = /^-?\d+(\.\d+)?$/;

export class ErroDinheiro extends Error {
  override name = "ErroDinheiro";
}

export function eMoeda(x: string): x is Moeda {
  return (MOEDAS as readonly string[]).includes(x);
}

/** Converte texto ("1234.5") em decimal, recusando formatos ambíguos e números JS. */
export function decimal(texto: string): Decimal {
  if (typeof texto !== "string" || !RE_DECIMAL.test(texto.trim())) {
    throw new ErroDinheiro(`Valor decimal inválido: ${String(texto)}`);
  }
  return new D(texto.trim());
}

export function arredondarMontante(x: Decimal): Decimal {
  return x.toDecimalPlaces(CASAS_MONTANTE, ARREDONDAMENTO_MONTANTE);
}

/** Cria um valor monetário. Recusa mais de duas casas decimais (não arredonda em silêncio). */
export function valor(moeda: string, montante: string): Valor {
  if (!eMoeda(moeda)) throw new ErroDinheiro(`Moeda não suportada: ${moeda}`);
  const m = decimal(montante);
  if (m.decimalPlaces() > CASAS_MONTANTE) {
    throw new ErroDinheiro(`Montante com mais de ${CASAS_MONTANTE} casas decimais: ${montante}`);
  }
  return { moeda, montante: m };
}

export function somar(a: Valor, b: Valor): Valor {
  if (a.moeda !== b.moeda) throw new ErroDinheiro(`Moedas diferentes: ${a.moeda} e ${b.moeda}`);
  return { moeda: a.moeda, montante: a.montante.plus(b.montante) };
}

const SIMBOLO: Record<Moeda, { antes?: string; depois?: string }> = {
  AOA: { depois: " Kz" },
  USD: { antes: "US$ " },
  EUR: { depois: " €" },
};

/**
 * Formata para leitura em Angola: "1 234 567,89 Kz", "US$ 1 000,00", "250,00 €".
 * Agrupa milhares com espaço inseparável. Exato (não passa por Number).
 */
export function formatar(v: Valor): string {
  const fixo = arredondarMontante(v.montante).toFixed(CASAS_MONTANTE);
  const negativo = fixo.startsWith("-");
  const [inteira = "0", fracao = "00"] = (negativo ? fixo.slice(1) : fixo).split(".");
  const agrupada = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const s = SIMBOLO[v.moeda];
  return `${negativo ? "-" : ""}${s.antes ?? ""}${agrupada},${fracao}${s.depois ?? ""}`;
}
