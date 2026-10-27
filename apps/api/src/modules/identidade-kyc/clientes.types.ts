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
  email?: string | null | undefined;
  morada: string;
  estado: EstadoCliente;
  estadoKyc: EstadoKyc;
  nivelRisco: NivelRisco;
  dataNascimento?: string | null | undefined;
  documentoEmissao?: string | null | undefined;
  documentoValidade?: string | null | undefined;
  profissao?: string | null | undefined;
  entidadeEmpregadora?: string | null | undefined;
  finalidadeConta?: string | null | undefined;
  paisResidencia?: string | null | undefined;
  pep?: boolean | number | undefined;
  avatarUrl?: string | null | undefined;
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

export interface DocumentoKyc {
  id: string;
  clienteId: string;
  tipoDocumento: string;
  nomeArquivo: string;
  caminhoSeguro: string;
  tamanhoBytes: number;
  mimeType: string;
  hashSha256: string;
  estadoValidacao: "pendente" | "valido" | "invalido";
  enviadoEm: string;
  enviadoPorId: string;
}

export const UploadDocumentoInputSchema = z.object({
  tipoDocumento: z.enum([
    "bi_frente",
    "bi_verso",
    "passaporte",
    "nif_empresa",
    "comprovativo_morada",
    "declaracao_rendimentos",
  ]),
  nomeArquivo: z.string().min(1, "Nome do ficheiro é obrigatório").max(255),
  conteudoBase64: z.string().min(1, "Conteúdo do ficheiro é obrigatório"),
});

export type UploadDocumentoInput = z.infer<typeof UploadDocumentoInputSchema>;

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
  dataNascimento: z.string().optional().nullable(),
  documentoEmissao: z.string().optional().nullable(),
  documentoValidade: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  entidadeEmpregadora: z.string().optional().nullable(),
  finalidadeConta: z.string().optional().nullable(),
  paisResidencia: z.string().optional().nullable(),
  pep: z.boolean().optional().default(false),
  avatarUrl: z.string().optional().nullable(),
});

export type CriarClienteInput = z.infer<typeof CriarClienteInputSchema>;

export const AtualizarClienteInputSchema = z.object({
  nome: z.string().min(3).optional(),
  telefone: z.string().min(7).optional(),
  email: z.string().email().optional().nullable(),
  morada: z.string().min(5).optional(),
  dataNascimento: z.string().optional().nullable(),
  documentoEmissao: z.string().optional().nullable(),
  documentoValidade: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  entidadeEmpregadora: z.string().optional().nullable(),
  finalidadeConta: z.string().optional().nullable(),
  paisResidencia: z.string().optional().nullable(),
  pep: z.boolean().optional(),
  avatarUrl: z.string().optional().nullable(),
  estado: EstadoClienteSchema.optional(),
  nivelRisco: NivelRiscoSchema.optional(),
});

export type AtualizarClienteInput = z.infer<typeof AtualizarClienteInputSchema>;

export const DecisaoKycInputSchema = z.object({
  estadoNovo: EstadoKycSchema,
  nivelRisco: NivelRiscoSchema.default("baixo"),
  motivo: z.string().min(5, "Motivo da decisão KYC é obrigatório para conformidade"),
});

export type DecisaoKycInput = z.infer<typeof DecisaoKycInputSchema>;
