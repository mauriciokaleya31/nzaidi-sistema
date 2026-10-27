# Módulo: Contabilidade e Reconciliação Financeira

**Pasta:** `apps/api/src/modules/contabilidade`  
**Estado:** **Funcional e Testado (Módulo D)**.

## Responsabilidade
- Livro Razão e Diário Geral de movimentos financeiros e operacionais com estrita partida dobrada (Débito = Crédito).
- Geração automática de partidas contabilísticas na confirmação de operações cambiais, suprimentos, sangrias, fechos de caixa e remessas.
- Imutabilidade de movimentos: estornos e correções são efetuados exclusivamente via lançamentos compensatórios vinculados.
- Motor de reconciliação de contas internas vs extratos e registo formal de divergências com resolução auditada.
- Emissão de relatórios diários de movimentos, posição cambial multimoeda e histórico cronológico de cotações.

## Regras de negócio
- Nenhum lançamento é persistido sem conferência exata de débito e crédito em moeda nacional (AOA).
- Qualquer anulação exige registo de estorno com motivo obrigatório e autorização do utilizador.
- Separação de funções para aprovação e encerramento de divergências regulamentares.

## Depende de
- auditoria
- autenticacao
- taxas-cambio
