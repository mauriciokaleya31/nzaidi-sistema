# Módulo: Contabilidade e tesouraria

**Pasta:** `apps/api/src/modules/contabilidade-tesouraria`
**Estado:** Confirmado (princípios). Posição de divisas e conciliação diária: proposta.

## Responsabilidade
Registo contabilístico de dupla entrada, contas internas, verificação de saldos, posição de divisas e conciliações.

## Regras de negócio
Débitos iguais a créditos. Lançamentos imutáveis. Este módulo é o único que escreve no registo contabilístico.

## Depende de
auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
