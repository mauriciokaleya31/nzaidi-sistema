# Módulo: Operações de câmbio

**Pasta:** `apps/api/src/modules/operacoes-cambio`
**Estado:** Confirmado.

## Responsabilidade
Registo e execução das operações de câmbio (balcão e digital), classificação regulamentar (câmbio ou remessa, compra ou venda) e correções por lançamento contrário.

## Regras de negócio
Nenhuma operação avança sem passar pelo controlo de risco. Nada se apaga; corrige-se por contrapartida.

## Depende de
taxas-cambio, conformidade-aml, contabilidade-tesouraria, pagamentos-aoa, wise

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
