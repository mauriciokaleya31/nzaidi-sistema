# Módulo: Conta Wise do cliente

**Pasta:** `apps/api/src/modules/wise`
**Estado:** Confirmado (modelo embedded). CONDICIONADO: acordo com a Wise e mecanismo de carregamento por confirmar.

## Responsabilidade
Ligação OAuth da conta Wise do cliente, leitura de saldos, carregamento do saldo com divisas e receção de eventos da Wise.

## Regras de negócio
A conta é do cliente. A NZAIDI só atua dentro da autorização dada. Selo Powered by Wise e divulgação nos termos.

## Depende de
identidade-kyc, operacoes-cambio, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
