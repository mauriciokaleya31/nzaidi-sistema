import { z } from "zod";

export const MobileDispositivoHeaderSchema = z.object({
  "x-device-id": z.string().min(5, "Identificador do dispositivo é obrigatório"),
  "x-platform": z.enum(["android", "ios"], { message: "Plataforma deve ser 'android' ou 'ios'" }),
  "x-app-version": z.string().min(1, "Versão do aplicativo é obrigatória"),
  "x-os-version": z.string().optional(),
  "x-device-name": z.string().optional(),
  "x-push-token": z.string().optional(),
  "x-correlation-id": z.string().optional(),
});

export const MobileLoginSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido"),
  senha: z.string().min(6, "A palavra-passe deve ter pelo menos 6 caracteres"),
  deviceId: z.string().min(5, "Identificador único do dispositivo é obrigatório"),
  plataforma: z.enum(["android", "ios"]),
  nomeDispositivo: z.string().min(1, "Nome do modelo do telemóvel"),
  versaoSo: z.string().default("14.0"),
  versaoApp: z.string().default("1.0.0"),
  tokenPush: z.string().optional(),
});

export type MobileLoginInput = z.infer<typeof MobileLoginSchema>;

export const MobileRefreshTokenSchema = z.object({
  refreshToken: z.string().min(20, "Refresh token inválido ou ausente"),
  deviceId: z.string().min(5, "Identificador do dispositivo é obrigatório"),
});

export type MobileRefreshTokenInput = z.infer<typeof MobileRefreshTokenSchema>;

export const MobileRecuperarSenhaSchema = z.object({
  email: z.string().email("E-mail inválido para recuperação de acesso"),
});

export const MobileRedefinirSenhaSchema = z.object({
  email: z.string().email(),
  codigoOtp: z.string().length(6, "O código de verificação deve ter 6 dígitos"),
  novaSenha: z.string().min(8, "A nova palavra-passe deve ter no mínimo 8 caracteres"),
});

export const MobileAtualizarPerfilSchema = z.object({
  telefone: z.string().min(9).optional(),
  email: z.string().email().optional(),
  morada: z.string().min(5).optional(),
  profissao: z.string().min(2).optional(),
  entidadeEmpregadora: z.string().optional(),
});

export const MobileSimulacaoCambioSchema = z.object({
  tipoOperacao: z.enum(["compra", "venda"]),
  moeda: z.enum(["USD", "EUR"]),
  montante: z.string().min(1, "Montante a simular é obrigatório"),
});

export const MobileCriarPedidoCambioSchema = z.object({
  tipoOperacao: z.enum(["compra", "venda"]),
  moeda: z.enum(["USD", "EUR"]),
  montanteDivisa: z.string().min(1),
  metodoPagamento: z.enum(["MULTICAIXA_EXPRESS", "REFERENCIA_MULTICAIXA", "TRANSFERENCIA_BANCARIA", "BALCAO"]).default("MULTICAIXA_EXPRESS"),
  finalidade: z.string().default("Operação cambial via NZAIDI Mobile"),
});

export const MobileCriarPedidoRemessaSchema = z.object({
  paisDestino: z.string().min(2, "País de destino é obrigatório"),
  moeda: z.enum(["EUR", "USD"]),
  valorEstrangeiro: z.number().positive("Valor deve ser superior a zero"),
  beneficiarioNome: z.string().min(3, "Nome completo do beneficiário"),
  beneficiarioIban: z.string().min(10, "IBAN ou conta do beneficiário"),
  finalidade: z.string().min(3, "Finalidade da transferência"),
  metodoPagamento: z.enum(["MULTICAIXA_EXPRESS", "REFERENCIA_MULTICAIXA", "TRANSFERENCIA_BANCARIA", "BALCAO"]).default("MULTICAIXA_EXPRESS"),
});

export interface MobileTokensResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  refreshToken: string;
  cliente: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    kycStatus: string;
    nivelKyc: number;
  };
  dispositivo: {
    id: string;
    deviceId: string;
    plataforma: "android" | "ios";
    status: string;
  };
}
