# Módulo: Painel Operacional e Filas de Trabalho

**Pasta:** `apps/api/src/modules/operacional`  
**Estado:** **Funcional e Testado (Módulo C e Dashboard Executivo)**.

## Responsabilidade
- Fila única de trabalho consolidada para pedidos de câmbio, remessas, dossiês KYC e liquidações manuais.
- Atribuição de tarefas com nível de prioridade, notas internas e rastreabilidade total de operador.
- Dashboard Operacional e Dashboard Executivo multimoeda consolidando saldos de tesouraria (AOA, USD, EUR), fluxos diários e mensais, margens cambiais e pendências críticas.
- Séries temporais para gráficos SVG e exportação de relatórios executivos.

## Regras de negócio
- Tarefas atribuídas a um operador não podem ser concluídas por operadores sem a devida permissão ou perfil atribuído.
- Todas as transições de estado nas filas de trabalho são registradas em trilha de auditoria.

## Depende de
- auditoria
- autenticacao
- identidade-kyc
- contabilidade
