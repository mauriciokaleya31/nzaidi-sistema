# Módulo: Identidade e KYC

**Pasta:** `apps/api/src/modules/identidade-kyc`
**Estado:** Confirmado (funcionalidade base). Cliente de balcão ocasional: proposta.

## Responsabilidade
Registo de clientes, estado de verificação (verificado, em revisão, recusado), nível de risco e ficha do cliente. Inclui o cliente de balcão ocasional (proposta).

## Regras de negócio
Sem identidade verificada não há operações. Todo o cliente tem identificação, mesmo no balcão.

## Depende de
conformidade-aml, autenticacao, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
