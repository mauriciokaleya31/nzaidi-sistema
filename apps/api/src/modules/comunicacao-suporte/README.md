# Módulo: Comunicação e suporte

**Pasta:** `apps/api/src/modules/comunicacao-suporte`
**Estado:** PROPOSTA.

## Responsabilidade
Avisos aos clientes, pedidos de apoio e reclamações com responsável e prazo.

## Regras de negócio
Mensagens neutras para clientes em revisão ou recusados.

## Depende de
identidade-kyc, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
