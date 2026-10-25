import { z } from "zod";

export const MoedaCaixaSchema = z.enum(["AOA", "USD", "EUR"]);
export type MoedaCaixa = z.infer<typeof MoedaCaixaSchema>;

export const TipoMovimentoSchema = z.enum([
  "abertura",
  "cambio_entrada",
  "cambio_saida",
  "suprimento",
  "sangria",
  "fecho",
]);
export type TipoMovimento = z.infer<typeof TipoMovimentoSchema>;

export const EstadoCaixaSchema = z.enum(["aberto", "fechado", "pendente_aprovacao"]);
export type EstadoCaixa = z.infer<typeof EstadoCaixaSchema>;

export interface Caixa {
  id: string;
  numeroCaixa: string;
  operadorId: string;
  operadorNome: string;
  agencia: string;
  abertoEm: string;
  fechadoEm?: string | null;
  estado: EstadoCaixa;
  saldoInicialAoa: string;
  saldoInicialUsd: string;
  saldoInicialEur: string;
  saldoFechoAoaContado?: string | null;
  saldoFechoUsdContado?: string | null;
  saldoFechoEurContado?: string | null;
  diferencaAoa?: string | null;
  diferencaUsd?: string | null;
  diferencaEur?: string | null;
  justificativaDiferenca?: string | null;
  fechadoPorId?: string | null;
}

export interface MovimentoCaixa {
  id: string;
  caixaId: string;
  tipo: TipoMovimento;
  moeda: MoedaCaixa;
  montante: string; // Positivo para entrada, negativo para saída
  operacaoId?: string | null;
  descricao: string;
  criadoEm: string;
  operadorId: string;
}

export interface SaldoCalculado {
  moeda: MoedaCaixa;
  saldoInicial: string;
  entradas: string;
  saidas: string;
  saldoEsperado: string;
}

export const AbrirCaixaInputSchema = z.object({
  saldoInicialAoa: z.string().regex(/^\d+(\.\d{1,2})?$/, "Saldo inicial AOA deve ser numérico válido"),
  saldoInicialUsd: z.string().regex(/^\d+(\.\d{1,2})?$/, "Saldo inicial USD deve ser numérico válido"),
  saldoInicialEur: z.string().regex(/^\d+(\.\d{1,2})?$/, "Saldo inicial EUR deve ser numérico válido"),
  agencia: z.string().default("Balcão Maianga - Sede"),
});

export type AbrirCaixaInput = z.infer<typeof AbrirCaixaInputSchema>;

export const FecharCaixaInputSchema = z.object({
  saldoContadoAoa: z.string().regex(/^\d+(\.\d{1,2})?$/, "Contagem AOA deve ser numérica válida"),
  saldoContadoUsd: z.string().regex(/^\d+(\.\d{1,2})?$/, "Contagem USD deve ser numérica válida"),
  saldoContadoEur: z.string().regex(/^\d+(\.\d{1,2})?$/, "Contagem EUR deve ser numérica válida"),
  justificativaDiferenca: z.string().optional(),
});

export type FecharCaixaInput = z.infer<typeof FecharCaixaInputSchema>;

export const MovimentoManualInputSchema = z.object({
  tipo: z.enum(["suprimento", "sangria"]),
  moeda: MoedaCaixaSchema,
  montante: z.string().regex(/^\d+(\.\d{1,2})?$/, "Montante deve ser numérico positivo"),
  descricao: z.string().min(5, "Descrição do movimento deve ser informada"),
});

export type MovimentoManualInput = z.infer<typeof MovimentoManualInputSchema>;
