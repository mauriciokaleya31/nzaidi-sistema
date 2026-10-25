# Módulo: Cartões

**Pasta:** `apps/api/src/modules/cartoes`
**Estado:** Confirmado. CONDICIONADO: Wise tem de confirmar a entrega na NZAIDI.

## Responsabilidade
Pedidos de cartão digital e físico, chegada dos físicos à NZAIDI, levantamento presencial e ativação.

## Regras de negócio
Cartão digital criado pelo cliente. Cartão físico enviado à NZAIDI e levantado com prova de identidade. Gestão fina do cartão na conta Wise.

## Depende de
wise, identidade-kyc, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
