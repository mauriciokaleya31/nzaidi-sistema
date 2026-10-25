# Módulo: Taxas e cotações

**Pasta:** `apps/api/src/modules/taxas-cambio`
**Estado:** Confirmado. Histórico de alterações e alertas: proposta.

## Responsabilidade
Taxa de referência por moeda, margens de compra e de venda, cotação com validade de 90 segundos, recotação nos métodos lentos e tabela pública.

## Regras de negócio
Venda = referência + margem de venda. Compra = referência − margem de compra. Uma só fonte de taxas para balcão, aplicação e site.

## Depende de
configuracao, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
