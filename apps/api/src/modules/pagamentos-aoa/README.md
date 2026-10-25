# Módulo: Pagamentos em kwanzas

**Pasta:** `apps/api/src/modules/pagamentos-aoa`
**Estado:** Confirmado (funcionamento). CONDICIONADO: fornecedor do meio de pagamento por escolher.

## Responsabilidade
Pedidos de pagamento por Multicaixa Express, referência Multicaixa e transferência bancária; confirmação automática; tratamento de pagamentos repetidos ou desconhecidos.

## Regras de negócio
Webhooks idempotentes. Pagamento confirmado dispara o câmbio, depois do controlo de risco. Fornecedor por escolher (adaptador substituível).

## Depende de
operacoes-cambio, taxas-cambio, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
