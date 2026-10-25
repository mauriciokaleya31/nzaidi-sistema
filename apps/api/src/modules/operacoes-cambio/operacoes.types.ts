import { z } from "zod";
import type { MoedaDivisa } from "@nzaidi/dominio";

export const TipoOperacaoSchema = z.enum(["compra", "venda"]);
export type TipoOperacao = z.infer<typeof TipoOperacaoSchema>;

export const MoedaDivisaSchema = z.enum(["USD", "EUR"]);

export const EstadoOperacaoSchema = z.enum(["confirmada", "cancelada", "estornada"]);
export type EstadoOperacao = z.infer<typeof EstadoOperacaoSchema>;

export interface OperacaoCambio {
  id: string;
  numeroOperacao: string;
  chaveIdempotencia?: string | null;
  clienteId: string;
  caixaId: string;
  tipo: TipoOperacao;
  moedaDivisa: MoedaDivisa;
  montanteDivisa: string;
  taxaAplicada: string;
  taxaReferenciaBna: string;
  margemAplicada: string;
  montanteAoa: string;
  fonteTaxa: "demonstracao" | "oficial";
  estado: EstadoOperacao;
  operadorId: string;
  operadorNome: string;
  criadoEm: string;
  motivoEstorno?: string | null;
  estornadoEm?: string | null;
  estornadoPorId?: string | null;
}

export interface Bordero {
  id: string;
  numeroBordero: string;
  operacaoId: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteNif: string;
  tipoOperacao: TipoOperacao;
  moedaDivisa: MoedaDivisa;
  montanteDivisa: string;
  taxaCambio: string;
  totalAoa: string;
  operadorNome: string;
  emitidoEm: string;
  hashVerificacao: string;
}

export const CriarOperacaoInputSchema = z.object({
  chaveIdempotencia: z.string().min(5, "Chave de idempotência é necessária"),
  clienteId: z.string().min(1, "ID do cliente é obrigatório"),
  tipo: TipoOperacaoSchema,
  moedaDivisa: MoedaDivisaSchema,
  montanteDivisa: z.string().regex(/^\d+(\.\d{1,2})?$/, "Montante da divisa deve ser numérico positivo"),
  cotacaoCriadaEm: z.string().datetime({ message: "Carimbo de data/hora da cotação inválido" }),
});

export type CriarOperacaoInput = z.infer<typeof CriarOperacaoInputSchema>;

export const EstornarOperacaoInputSchema = z.object({
  motivo: z.string().min(10, "Motivo do estorno deve ter pelo menos 10 caracteres para auditoria"),
});

export type EstornarOperacaoInput = z.infer<typeof EstornarOperacaoInputSchema>;
