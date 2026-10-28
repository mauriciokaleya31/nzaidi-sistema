# ADR 0005. Manutenção da Stack TypeScript, Fastify e SQLite Piloto

**Estado:** Confirmado pelo dono do projeto em 25/10/2026

## Contexto
O projeto foi desenvolvido em TypeScript com Node.js (workspaces), Fastify, Zod e base de dados SQLite relacional via `node:sqlite` nativo do Node.js 22. Foi avaliada a possibilidade de migração de tecnologia (como Laravel/PHP), havendo a necessidade de clarificar a arquitetura definitiva do sistema e as garantias de persistência.

## Decisão
1. **Manutenção Integral da Stack Existente:** O sistema continuará a ser desenvolvido exclusivamente em TypeScript, Fastify e monorepo npm. Qualquer migração para PHP ou Laravel foi expressamente **descartada**.
2. **SQLite Restrito a Desenvolvimento e Piloto:** O motor SQLite (`node:sqlite` nativo do Node.js 22 em modo WAL) é adotado exclusivamente para as fases de desenvolvimento, testes automatizados e ambiente piloto/homologação.
3. **Migração Obrigatória para Base de Dados Dedicada em Produção:** Antes de o sistema entrar em operação financeira efetiva com dados reais e clientes em produção, é **obrigatória** a migração para um servidor de base de dados relacional robusto e concorrente (PostgreSQL ou MySQL/MariaDB).
4. **Isolamento de SQL na Camada de Repositório:** Nenhuma instrução SQL direta ou dependência específica do dialeto SQLite é permitida fora dos ficheiros da camada de persistência (`*.repository.ts` e `database.ts`), garantindo portabilidade reversível.
5. **Requisito de Versão do Node.js:** O projeto fixa a versão mínima do Node.js em `>=22.0.0` (definida no `package.json`), reconhecendo formalmente que `node:sqlite` é uma funcionalidade experimental na linha Node 22 e que os repositórios abstratos garantem independência tecnológica.

## Consequências
- Preserva 100% do código já homologado e testado.
- Garante testes rápidos em memória (`:memory:`) e persistência atómica local sem necessidade de infraestrutura pesada durante o desenvolvimento.
- Desacopla as regras de negócio das particularidades do motor SQLite.
