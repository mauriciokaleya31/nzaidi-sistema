import { z } from "zod";

export const TipoClienteSchema = z.enum(["singular", "colectivo"]);
export type TipoCliente = z.infer<typeof TipoClienteSchema>;

export const TipoDocumentoSchema = z.enum(["bi", "passaporte", "cartao_residente", "nif_empresa"]);
export type TipoDocumento = z.infer<typeof TipoDocumentoSchema>;

export const EstadoClienteSchema = z.enum(["ativo", "inativo", "bloqueado"]);
export type EstadoCliente = z.infer<typeof EstadoClienteSchema>;

export const EstadoKycSchema = z.enum([
  "pendente",
  "em_analise",
  "aprovado",
  "rejeitado",
  "actualizacao_necessaria",
]);
export type EstadoKyc = z.infer<typeof EstadoKycSchema>;

export const NivelRiscoSchema = z.enum(["baixo", "medio", "alto"]);
export type NivelRisco = z.infer<typeof NivelRiscoSchema>;

export interface Cliente {
  id: string;
  tipo: TipoCliente;
  nome: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nif: string;
  nacionalidade: string;
  telefone: string;
  email?: string | null;
  morada: string;
  estado: EstadoCliente;
  estadoKyc: EstadoKyc;
  nivelRisco: NivelRisco;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegistoKyc {
  id: string;
  clienteId: string;
  estadoAnterior: EstadoKyc;
  estadoNovo: EstadoKyc;
  nivelRisco: NivelRisco;
  decididoPorId: string;
  decididoPorNome: string;
  motivo?: string | null;
  momento: string;
}

export const CriarClienteInputSchema = z.object({
  tipo: TipoClienteSchema,
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  tipoDocumento: TipoDocumentoSchema,
  numeroDocumento: z.string().min(5, "Número de documento inválido"),
  nif: z.string().min(5, "NIF inválido"),
  nacionalidade: z.string().default("AO"),
  telefone: z.string().min(7, "Número de telefone inválido"),
  email: z.string().email("Correio electrónico inválido").optional().nullable(),
  morada: z.string().min(5, "Morada deve ser informada"),
});

export type CriarClienteInput = z.infer<typeof CriarClienteInputSchema>;

export const DecisaoKycInputSchema = z.object({
  estadoNovo: EstadoKycSchema,
  nivelRisco: NivelRiscoSchema.default("baixo"),
  motivo: z.string().min(5, "Motivo da decisão KYC é obrigatório para conformidade"),
});

export type DecisaoKycInput = z.infer<typeof DecisaoKycInputSchema>;
