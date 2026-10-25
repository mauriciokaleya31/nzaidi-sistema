# ADR 0003. Base de dados relacional e contabilidade de dupla entrada
**Estado:** Proposto
## Contexto
As versões anteriores tinham duas abordagens: núcleo com base de dados relacional e lançamentos imutáveis, e plataforma com dados em ficheiros.
## Decisão
Uma base de dados relacional como única fonte de verdade. Registo contabilístico de dupla entrada, imutável, com validação de que débitos igualam créditos. Auditoria só de acréscimo.
## Alternativas
Dados em ficheiros (não suportam concorrência nem transações). Base não relacional (menos garantias para contabilidade).
## Consequências
Resolve a contradição C-02 a favor da base relacional. Exige migrar a lógica da plataforma v2 na Fase 1.
