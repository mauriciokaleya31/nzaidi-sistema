/**
 * Taxas de câmbio (docs/10, §2; R-07).
 *   venda (a NZAIDI vende divisa ao cliente)  = referência × (1 + margem de venda)
 *   compra (a NZAIDI compra divisa ao cliente) = referência × (1 − margem de compra)
 * A margem favorece sempre a NZAIDI. Taxas expressas em kwanzas por 1 unidade de divisa.
 */
import { D, type Decimal, type Moeda, ErroDinheiro, arredondarMontante, decimal } from "./dinheiro.js";

/**
 * Casas decimais das taxas.
 * PROPOSTA (D-25): 4 casas, metade para cima. Por confirmar com a tesouraria.
 */
export const CASAS_TAXA = 4;

export type MoedaDivisa = Exclude<Moeda, "AOA">;

export interface ParametroTaxa {
  readonly moeda: MoedaDivisa;
  /** Taxa de referência do BNA do dia, em Kz por unidade (copiada pela gestão). */
  readonly referencia: string;
  /** Margens como fração: "0.02" = 2 %. */
  readonly margemCompra: string;
  readonly margemVenda: string;
}

/** Intervalo aceite para as margens. Os valores vêm de parâmetros, nunca do código. */
export interface LimitesMargem {
  readonly minima: string;
  readonly maxima: string;
}

export interface TaxasCalculadas {
  readonly moeda: MoedaDivisa;
  readonly referencia: Decimal;
  readonly compra: Decimal;
  readonly venda: Decimal;
}

export class ErroTaxa extends Error {
  override name = "ErroTaxa";
}

function validarMargem(nome: string, margem: Decimal, limites: LimitesMargem): void {
  const min = decimal(limites.minima);
  const max = decimal(limites.maxima);
  if (margem.lessThan(min) || margem.greaterThan(max)) {
    throw new ErroTaxa(`${nome} fora do intervalo permitido [${limites.minima}, ${limites.maxima}]: ${margem.toString()}`);
  }
}

export function calcularTaxas(p: ParametroTaxa, limites: LimitesMargem): TaxasCalculadas {
  let referencia: Decimal, mc: Decimal, mv: Decimal;
  try {
    referencia = decimal(p.referencia);
    mc = decimal(p.margemCompra);
    mv = decimal(p.margemVenda);
  } catch (e) {
    throw new ErroTaxa(e instanceof ErroDinheiro ? e.message : String(e));
  }
  if (referencia.lessThanOrEqualTo(0)) throw new ErroTaxa("A taxa de referência tem de ser positiva");
  if (decimal(limites.minima).isNegative()) throw new ErroTaxa("A margem mínima não pode ser negativa");
  validarMargem("Margem de compra", mc, limites);
  validarMargem("Margem de venda", mv, limites);
  if (mc.greaterThanOrEqualTo(1)) throw new ErroTaxa("A margem de compra tem de ser inferior a 100 %");

  return {
    moeda: p.moeda,
    referencia,
    venda: referencia.times(new D(1).plus(mv)).toDecimalPlaces(CASAS_TAXA, D.ROUND_HALF_UP),
    compra: referencia.times(new D(1).minus(mc)).toDecimalPlaces(CASAS_TAXA, D.ROUND_HALF_UP),
  };
}

/** O cliente compra divisa: quantos Kz paga por `montanteDivisa`. */
export function kwanzasParaComprarDivisa(taxas: TaxasCalculadas, montanteDivisa: string): Decimal {
  const m = decimal(montanteDivisa);
  if (m.lessThanOrEqualTo(0)) throw new ErroTaxa("O montante tem de ser positivo");
  return arredondarMontante(m.times(taxas.venda));
}

/** O cliente vende divisa: quantos Kz recebe por `montanteDivisa`. */
export function kwanzasAoVenderDivisa(taxas: TaxasCalculadas, montanteDivisa: string): Decimal {
  const m = decimal(montanteDivisa);
  if (m.lessThanOrEqualTo(0)) throw new ErroTaxa("O montante tem de ser positivo");
  return arredondarMontante(m.times(taxas.compra));
}
