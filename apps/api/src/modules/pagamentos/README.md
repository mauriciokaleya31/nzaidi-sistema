# Módulo: Métodos de Pagamento (Manual e AppyPay)

**Pasta:** `apps/api/src/modules/pagamentos`  
**Estado:** **Funcional e Testado (Fase K)**.

## Responsabilidade
- Gestão centralizada dos métodos de pagamento para liquidação de câmbios ao balcão e remessas internacionais.
- **Métodos Manuais (Fase Atual):**
  - Transferência Bancária Manual (BAI, BFA, BIC, BMA) e Depósito / Multicaixa Balcão.
  - Submissão de comprovativo pelo cliente com hash SHA-256 e referência de talão.
  - Estado `pendente_confirmacao` garantindo que o comprovativo nunca aprova pagamentos automaticamente.
  - Fluxo de validação humana e autorização por operadores da tesouraria (`contabilidade_tesouraria`), com confirmação ou rejeição fundamentada.
- **Métodos Automáticos (AppyPay / Multicaixa Express - Em Preparação):**
  - Conector com a API oficial da AppyPay Angola (`charges/key`, `/default-applications` e Azure AD OAuth2).
  - Gestão de ambientes (*Sandbox* vs *Produção*), credenciais e chaves de referência.
  - Endpoint de webhook com idempotência estrita (evitando duplicações de recebimento).
  - Bloqueio automático de cobranças caso não existam credenciais válidas configuradas.

## Regras de negócio
- Um comprovativo anexado pelo cliente permanece sob o estado `pendente_confirmacao` até validação manual por operador da tesouraria.
- O operador deve fundamentar formalmente qualquer rejeição de pagamento com motivo obrigatório.
- Confirmações de pagamento são estritamente idempotentes: repetições não duplicam créditos nem lançamentos.
- Credenciais da AppyPay nunca são transmitidas para as interfaces do cliente.

## Depende de
- auditoria
- autenticacao
