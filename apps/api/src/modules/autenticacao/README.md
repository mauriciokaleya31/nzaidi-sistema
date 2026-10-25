# Módulo: Autenticação e permissões

**Pasta:** `apps/api/src/modules/autenticacao`
**Estado:** Confirmado (PIN e sessão). Perfis e autenticação reforçada: proposta.

## Responsabilidade
Entrada de clientes (PIN com sessão que expira), entrada de utilizadores internos, perfis por função e matriz de permissões.

## Regras de negócio
Só a gestão altera taxas e margens (confirmado). Perfis por função e autenticação reforçada nas áreas sensíveis (proposta).

## Depende de
auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
