# Módulo: Remessas internacionais

**Pasta:** `apps/api/src/modules/remessas`
**Estado:** Confirmado. CONDICIONADO: especificações dos parceiros por receber.

## Responsabilidade
Pedido de remessa no balcão, escolha do parceiro (MaxPay ou Realtransfers), estados da remessa e acompanhamento até ao beneficiário.

## Regras de negócio
Remetente verificado. Sem envio duplicado. Retenção por risco. Devolução por lançamentos contrários.

## Depende de
identidade-kyc, conformidade-aml, contabilidade-tesouraria, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
