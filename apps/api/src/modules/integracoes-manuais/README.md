# Módulo: Integrações Manuais e Portas de Conciliação

**Pasta:** `apps/api/src/modules/integracoes-manuais`  
**Ticket de Referência:** `TICKET_MODO_MANUAL_INTEGRACOES_NZAIDI.md`  
**Estado:** Confirmado (implementado e testado no ticket NZAIDI-MANUAL-01).

## Responsabilidade
Permite o registo, validação, aprovação (segregação de alçadas em 4 olhos) e conciliação de liquidações manuais de integrações externas (parceiros de remessa como MaxPay e Realtransfers, recebimentos bancários em kwanzas, e liquidações da Wise).

## Regras de Negócio
1. **Idempotência Financeira**: pedidos repetidos com a mesma chave retornam a execução existente sem duplicar efeitos financeiros.
2. **Unicidade de Referências Externas por Canal**: `UNIQUE(canal_origem, referencia_externa)` garante que uma referência de comprovativo/transferência não seja reutilizada indevidamente no mesmo canal.
3. **Não-Contaminação do Caixa Físico**: operações de liquidação bancária/externa afetam contas transitórias de compensação e não geram movimentação de notas de numerário nos caixas de balcão.
4. **Segregação de Funções**: liquidações em kwanzas a partir do limiar AML de teste de 5.000.000,00 AOA exigem que o aprovador seja um utilizador diferente do criador (`criador != aprovador`).
5. **Auditoria Imutável**: todos os passos são registados na pista de auditoria central.

## Depende de
- `autenticacao`: perfis e permissões (`integracoes:liquidar_manual`, `integracoes:consultar_manual`).
- `auditoria`: registo de eventos para inspeções do BNA.
- `contabilidade-tesouraria`: preservação das regras de conciliação.
