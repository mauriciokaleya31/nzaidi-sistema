# Módulo: Configuração e parâmetros

**Pasta:** `apps/api/src/modules/configuracao`
**Estado:** Confirmado (princípio).

## Responsabilidade
Parâmetros do negócio editáveis (limites de risco, janelas, margens-limite) e interruptores das funcionalidades condicionadas.

## Regras de negócio
Valores sensíveis ficam na configuração do ambiente e na base de dados, nunca no código nem no Git.

## Depende de
auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
