import { z } from "zod";

export const MoedaRemessaSchema = z.enum(["USD", "EUR", "GBP", "ZAR"]);
export type MoedaRemessa = z.infer<typeof MoedaRemessaSchema>;

export const ParceiroRemessaSchema = z.enum(["maxpay", "realtransfers"]);
export type ParceiroRemessa = z.infer<typeof ParceiroRemessaSchema>;

export const EstadoRemessaSchema = z.enum([
  "pendente",
  "retida",
  "aprovada",
  "enviada",
  "concluida",
  "cancelada",
]);
export type EstadoRemessa = z.infer<typeof EstadoRemessaSchema>;

export interface Remessa {
  id: string;
  numeroRemessa: string;
  chaveIdempotencia: string;
  clienteRemetenteId: string;
  remetenteNome: string;
  remetenteDocumento: string;
  remetenteNif: string;
  beneficiarioNome: string;
  beneficiarioPais: string;
  beneficiarioBanco: string;
  beneficiarioContaIban: string;
  moeda: MoedaRemessa;
  valorMoeda: string;
  taxaCambio: string;
  valorAoa: string;
  comissaoAoa: string;
  totalCobradoAoa: string;
  parceiro: ParceiroRemessa;
  estado: EstadoRemessa;
  motivoRetencao?: string | null;
  referenciaParceiro?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  operadorId: string;
  operadorNome: string;
  caixaId?: string | null;
  motivoCancelamento?: string | null;
  canceladoEm?: string | null;
  canceladoPorId?: string | null;
}

export const CriarRemessaInputSchema = z.object({
  chaveIdempotencia: z.string().min(5, "Chave de idempotência é obrigatória para evitar envios duplicados"),
  clienteRemetenteId: z.string().min(1, "ID do remetente é obrigatório"),
  beneficiarioNome: z.string().min(3, "Nome do beneficiário deve ter no mínimo 3 caracteres"),
  beneficiarioPais: z.string().length(2, "Código do país deve ter 2 caracteres (ISO-3166, ex: PT, US, ZA)"),
  beneficiarioBanco: z.string().min(2, "Nome do banco do beneficiário é obrigatório"),
  beneficiarioContaIban: z.string().min(5, "Conta ou IBAN do beneficiário é obrigatório"),
  moeda: MoedaRemessaSchema,
  valorMoeda: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor na moeda de destino deve ser positivo"),
  parceiro: ParceiroRemessaSchema,
});

export type CriarRemessaInput = z.infer<typeof CriarRemessaInputSchema>;

export const CancelarRemessaInputSchema = z.object({
  motivo: z.string().min(10, "Motivo do cancelamento/devolução deve ter no mínimo 10 caracteres para auditoria"),
});

export type CancelarRemessaInput = z.infer<typeof CancelarRemessaInputSchema>;

export interface RespostaEnvioParceiro {
  sucesso: boolean;
  referenciaParceiro: string;
  status: "enviada" | "retida" | "erro";
  mensagem?: string;
  motivo?: string;
}

export interface ParceiroRemessaAdapter {
  nome: ParceiroRemessa;
  enviar(remessa: Remessa): Promise<RespostaEnvioParceiro>;
  consultarStatus(referenciaParceiro: string): Promise<{ status: "enviada" | "concluida" | "cancelada" }>;
  cancelar(referenciaParceiro: string, motivo: string): Promise<{ sucesso: boolean }>;
}
