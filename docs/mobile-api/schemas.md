# NZAIDI Mobile API — Esquemas Zod & Contratos de Dados

Este documento descreve os contratos formais de validação (Zod / JSON Schema) utilizados em cada camada da API móvel da NZAIDI.

---

## 1. Esquemas de Autenticação & Hardware

```typescript
// Login do Cliente Móvel
export const MobileLoginSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido"),
  senha: z.string().min(8, "A palavra-passe deve conter pelo menos 8 caracteres"),
  deviceId: z.string().min(5, "O identificador único do dispositivo (UUID) é obrigatório"),
  plataforma: z.enum(["android", "ios"]),
  nomeDispositivo: z.string().min(2, "Nome do modelo do telemóvel é obrigatório"),
  versaoSo: z.string().default("desconhecido"),
  versaoApp: z.string().default("1.0.0"),
  tokenPush: z.string().optional(),
});

// Renovação de Sessão (Refresh Token)
export const MobileRefreshTokenSchema = z.object({
  refreshToken: z.string().min(20, "Refresh token inválido ou ausente"),
  deviceId: z.string().min(5, "Identificador do dispositivo é obrigatório"),
});

// Recuperação de Acesso
export const MobileRecuperarSenhaSchema = z.object({
  email: z.string().email("E-mail inválido para recuperação"),
});

export const MobileRedefinirSenhaSchema = z.object({
  email: z.string().email(),
  codigoOtp: z.string().length(6, "O código de verificação deve ter exatamente 6 dígitos"),
  novaSenha: z.string().min(8, "A nova palavra-passe deve ter no mínimo 8 caracteres"),
});
```

---

## 2. Esquemas do Cliente & KYC

```typescript
// Atualização de Contacto e Morada
export const MobileAtualizarPerfilSchema = z.object({
  telefone: z.string().min(9).optional(),
  email: z.string().email().optional(),
  morada: z.string().min(5).optional(),
  profissao: z.string().min(2).optional(),
  entidadeEmpregadora: z.string().optional(),
});

// Submissão de Documento KYC
export const MobileUploadDocumentoSchema = z.object({
  tipo: z.enum(["bi", "passaporte", "cartao_residente", "nif_empresa"]),
  numero: z.string().min(5).max(30),
  dataEmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser AAAA-MM-DD").optional(),
  dataValidade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser AAAA-MM-DD").optional(),
  ficheiroBase64: z.string().min(50, "Ficheiro em formato base64 obrigatório"),
  nomeFicheiro: z.string().min(3),
});
```

---

## 3. Esquemas de Operações de Câmbio & Remessas

```typescript
// Simulação de Taxa de Câmbio
export const MobileSimulacaoCambioSchema = z.object({
  tipoOperacao: z.enum(["compra", "venda"]),
  moeda: z.enum(["USD", "EUR"]),
  montante: z.string().min(1, "Montante a simular é obrigatório"),
});

// Criação de Pedido de Câmbio
export const MobileCriarPedidoCambioSchema = z.object({
  tipoOperacao: z.enum(["compra", "venda"]),
  moeda: z.enum(["USD", "EUR"]),
  montanteDivisa: z.string().min(1, "Montante em moeda estrangeira é obrigatório"),
  metodoPagamento: z.string().default("MULTICAIXA_EXPRESS"),
  finalidade: z.string().min(3, "Indicação do motivo/finalidade da operação é obrigatório"),
});

// Criação de Remessa Internacional
export const MobileCriarPedidoRemessaSchema = z.object({
  beneficiarioNome: z.string().min(3, "Nome completo do beneficiário é obrigatório"),
  beneficiarioPais: z.string().min(2, "País de destino é obrigatório"),
  beneficiarioIban: z.string().min(8, "IBAN do destinatário é obrigatório").max(34),
  beneficiarioBanco: z.string().min(2, "Nome da instituição bancária de destino"),
  beneficiarioSwift: z.string().optional(),
  moedaDestino: z.enum(["USD", "EUR"]),
  montanteDivisa: z.string().min(1, "Montante a transferir"),
  finalidade: z.string().min(3, "Motivo da transferência regulamentada"),
});
```
