import { z } from "zod";

export const RegistoClienteSchema = z.object({
  nome: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  tipoPessoa: z.enum(["singular", "colectivo"]),
  nif: z.string().min(5, "NIF inválido").max(20),
  tipoDocumento: z.enum(["bi", "passaporte", "cartao_residente", "nif_empresa"]),
  numeroDocumento: z.string().min(5, "Número de documento inválido").max(30),
  dataNascimento: z.string().optional(),
  nacionalidade: z.string().default("ANGOLANA"),
  endereco: z.string().min(3, "Endereço deve ser fornecido"),
  telefone: z.string().min(6, "Telefone inválido"),
  email: z.string().email("Endereço de e-mail inválido"),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export type RegistoClienteInput = z.infer<typeof RegistoClienteSchema>;

export const LoginClienteSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido"),
  senha: z.string().min(1, "A senha é obrigatória"),
});

export type LoginClienteInput = z.infer<typeof LoginClienteSchema>;

export const CriarPedidoCambioSchema = z.object({
  tipoOperacao: z.enum(["compra", "venda"]),
  moeda: z.enum(["USD", "EUR"]),
  montanteDivisa: z.string().regex(/^\d+(\.\d{1,2})?$/, "Montante inválido (ex: 500.00)"),
  finalidade: z.string().min(3, "Finalidade deve ter pelo menos 3 caracteres"),
});

export type CriarPedidoCambioInput = z.infer<typeof CriarPedidoCambioSchema>;

export const CriarPedidoRemessaSchema = z.object({
  beneficiarioNome: z.string().min(3, "Nome do beneficiário deve ter pelo menos 3 caracteres"),
  beneficiarioPais: z.string().min(2, "País de destino é obrigatório"),
  beneficiarioIban: z.string().min(8, "IBAN inválido").max(34),
  beneficiarioBanco: z.string().min(2, "Nome do banco é obrigatório"),
  beneficiarioSwift: z.string().optional().default(""),
  moedaDestino: z.enum(["USD", "EUR"]),
  montanteDivisa: z.string().regex(/^\d+(\.\d{1,2})?$/, "Montante inválido (ex: 500.00)"),
  finalidade: z.string().min(3, "Finalidade deve ter pelo menos 3 caracteres"),
});

export type CriarPedidoRemessaInput = z.infer<typeof CriarPedidoRemessaSchema>;

export interface ClienteCredencial {
  clienteId: string;
  email: string;
  telefone: string | null;
  senhaHash: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SessaoCliente {
  id: string;
  clienteId: string;
  tokenHash: string;
  criadoEm: string;
  expiraEm: string;
  ip: string | null;
  userAgent: string | null;
}

export interface PedidoCambio {
  id: string;
  clienteId: string;
  tipoOperacao: "compra" | "venda";
  moeda: "USD" | "EUR";
  montanteDivisa: string;
  taxaProposta: string;
  totalAoaEstimado: string;
  finalidade: string;
  estado: "pendente" | "em_analise" | "aprovado" | "rejeitado" | "concluido" | "cancelado";
  motivoRejeicao?: string | null;
  operacaoId?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PedidoRemessa {
  id: string;
  clienteId: string;
  beneficiarioNome: string;
  beneficiarioPais: string;
  beneficiarioIban: string;
  beneficiarioBanco: string;
  beneficiarioSwift?: string | null;
  moedaDestino: "USD" | "EUR";
  montanteDivisa: string;
  taxaCambio: string;
  comissaoAoa: string;
  totalAoa: string;
  finalidade: string;
  estado: "pendente_revisao" | "em_processamento" | "executada" | "rejeitada";
  motivoRejeicao?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}
