/**
 * Cotações (docs/10, §3; R-08).
 * Validade configurável (90 s por omissão). Se o pagamento chega depois da validade,
 * recota-se à taxa do momento da confirmação e registam-se as duas taxas.
 */
import type { Decimal } from "./dinheiro.js";

/** Validade por omissão (R-08). O valor em uso vem dos parâmetros. */
export const VALIDADE_COTACAO_SEGUNDOS = 90;

export type EstadoCotacao = "aberta" | "executada" | "expirada" | "cancelada";

export interface Cotacao {
  readonly taxa: Decimal;
  readonly criadaEm: Date;
  readonly expiraEm: Date;
}

export class ErroCotacao extends Error {
  override name = "ErroCotacao";
}

export function criarCotacao(taxa: Decimal, agora: Date, validadeSegundos = VALIDADE_COTACAO_SEGUNDOS): Cotacao {
  if (!Number.isInteger(validadeSegundos) || validadeSegundos <= 0) {
    throw new ErroCotacao(`Validade inválida: ${validadeSegundos}`);
  }
  return { taxa, criadaEm: agora, expiraEm: new Date(agora.getTime() + validadeSegundos * 1000) };
}

/** Válida até ao instante de expiração, exclusive. */
export function estaValida(c: Cotacao, agora: Date): boolean {
  return agora.getTime() < c.expiraEm.getTime();
}

export interface TaxaAplicada {
  /** Taxa usada na operação. */
  readonly taxa: Decimal;
  /** Taxa da cotação original (registada sempre, para prova). */
  readonly taxaCotada: Decimal;
  readonly recotada: boolean;
}

/**
 * Decide a taxa na confirmação do pagamento.
 * Dentro da validade aplica a cotação; fora dela aplica a taxa em vigor nesse momento.
 */
export function taxaNaConfirmacao(c: Cotacao, momentoConfirmacao: Date, taxaEmVigor: Decimal): TaxaAplicada {
  if (momentoConfirmacao.getTime() < c.criadaEm.getTime()) {
    throw new ErroCotacao("A confirmação não pode ser anterior à cotação");
  }
  if (estaValida(c, momentoConfirmacao)) {
    return { taxa: c.taxa, taxaCotada: c.taxa, recotada: false };
  }
  return { taxa: taxaEmVigor, taxaCotada: c.taxa, recotada: true };
}
