# Módulo: Auditoria

**Pasta:** `apps/api/src/modules/auditoria`
**Estado:** Confirmado.

## Responsabilidade
Registo imutável de quem fez o quê e quando, para prova em inspeções.

## Regras de negócio
Escrever-só: nunca alterar nem apagar eventos.

## Depende de
(nenhum)

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
