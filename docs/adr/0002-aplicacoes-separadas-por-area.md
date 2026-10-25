# ADR 0002. Aplicações separadas por área
**Estado:** Proposto
## Contexto
Três tipos de utilizador com riscos muito diferentes: cliente, equipa interna, parceiro.
## Decisão
Aplicações separadas: `cliente`, `admin`, `site-publico` e (futuro) `parceiros`. Todas falam só com a API e não decidem regras.
## Alternativas
Uma única aplicação com ecrãs por perfil (mistura perímetros de segurança e aumenta o risco de expor funções de administração).
## Consequências
A administração tem acesso reforçado sem afetar o cliente. Mais pastas a manter, compensado por `packages/` para o que é partilhado.
