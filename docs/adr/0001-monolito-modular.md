# ADR 0001. Servidor único organizado em módulos
**Estado:** Proposto
## Contexto
Equipa pequena, dinheiro de clientes, necessidade de integridade e de prova para o BNA.
## Decisão
Um só servidor (`apps/api`) com 15 módulos de fronteiras claras. Cada módulo expõe uma interface pública e não lê dados de outro.
## Alternativas
Microserviços (custo e complexidade operacional altos para a equipa, mais pontos de falha numa operação financeira). Funções isoladas sem estado (dificultam transações financeiras).
## Consequências
Uma base de dados e transações simples. Se um módulo crescer demais, pode ser separado mais tarde, porque as fronteiras já existem.
