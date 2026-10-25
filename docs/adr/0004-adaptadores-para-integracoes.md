# ADR 0004. Adaptadores substituíveis para integrações externas
**Estado:** Proposto
## Contexto
Wise, meio de pagamento, MaxPay, Realtransfers e verificação de listas ainda não têm contrato. Os fornecedores podem mudar.
## Decisão
Cada integração fica atrás de uma interface do seu módulo. Em desenvolvimento usa-se um adaptador simulado. O adaptador real só é escrito com documentação oficial e credenciais de teste. Funcionalidades condicionadas ficam atrás de interruptor.
## Alternativas
Chamar os fornecedores diretamente dos módulos (cria dependência e dificulta a troca).
## Consequências
Trocar de fornecedor não altera as regras de negócio. Os testes correm sem depender de terceiros.
