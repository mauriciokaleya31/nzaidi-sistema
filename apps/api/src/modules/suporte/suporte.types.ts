import { z } from "zod";

export const CategoriaAtendimentoSchema = z.enum([
  "duvida",
  "cambio",
  "remessa",
  "cartao",
  "kyc",
  "reclamacao",
  "outro",
]);
export type CategoriaAtendimento = z.infer<typeof CategoriaAtendimentoSchema>;

export const EstadoAtendimentoSchema = z.enum([
  "pendente",
  "em_atendimento",
  "resolvido",
  "encerrado",
]);
export type EstadoAtendimento = z.infer<typeof EstadoAtendimentoSchema>;

export const PrioridadeAtendimentoSchema = z.enum(["baixa", "normal", "alta", "urgente"]);
export type PrioridadeAtendimento = z.infer<typeof PrioridadeAtendimentoSchema>;

export const CriarAtendimentoInputSchema = z.object({
  assunto: z.string().min(4, "Assunto deve ter pelo menos 4 caracteres").max(200),
  categoria: CategoriaAtendimentoSchema.default("duvida"),
  mensagemInicial: z.string().min(5, "Mensagem inicial deve ter pelo menos 5 caracteres"),
  anexoNome: z.string().optional(),
  anexoTipo: z.string().optional(),
  anexoBase64: z.string().optional(),
});
export type CriarAtendimentoInput = z.infer<typeof CriarAtendimentoInputSchema>;

export const EnviarMensagemInputSchema = z.object({
  mensagem: z.string().min(1, "Mensagem não pode estar vazia"),
  anexoNome: z.string().optional(),
  anexoTipo: z.string().optional(),
  anexoBase64: z.string().optional(),
});
export type EnviarMensagemInput = z.infer<typeof EnviarMensagemInputSchema>;

export interface AtendimentoSuporte {
  id: string;
  clienteId: string;
  clienteNome?: string;
  clienteEmail?: string;
  operadorId?: string | null;
  operadorNome?: string | null;
  assunto: string;
  categoria: CategoriaAtendimento;
  estado: EstadoAtendimento;
  prioridade: PrioridadeAtendimento;
  mensagensNaoLidas?: number;
  criadoEm: string;
  atualizadoEm: string;
  encerradoEm?: string | null;
}

export interface MensagemSuporte {
  id: string;
  atendimentoId: string;
  remetenteTipo: "cliente" | "operador" | "sistema";
  remetenteId: string;
  remetenteNome: string;
  mensagem: string;
  anexoNome?: string | null;
  anexoTipo?: string | null;
  anexoBase64?: string | null;
  lida: boolean;
  lidaEm?: string | null;
  criadoEm: string;
}
