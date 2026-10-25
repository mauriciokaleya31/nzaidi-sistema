# NZAIDI — Casa de Câmbios & Transferência

Sistema digital da NZAIDI: câmbio de divisas, remessas internacionais, conta e cartões Wise para clientes, e administração da operação, sob supervisão do Banco Nacional de Angola (BNA).

> **Aviso importante:** este repositório contém regras de risco, estratégia e estrutura de um serviço financeiro. É **privado** desde 25/10/2026 e deve continuar assim.

## Estado
**Fase 1 (fundação técnica) em curso.** Já existem o sistema de design e as regras de dinheiro, taxas e cotação, com testes. Ainda não há API, base de dados nem aplicações. Ver `docs/14-estado-atual.md`.

## Arranque
Requer Node.js 22 ou superior e Python 3.

```
npm install
npm run verificar
```

`npm run verificar` corre a verificação de tipos, os testes e a verificação de documentação e segredos.

Endereços previstos: site em `nzaidi.ao`, sistema em `app.nzaidi.ao` (R-18).

## Por onde começar
1. `docs/00-LEIA-ME.md`: índice e legenda (Confirmado, Proposta, Condicionado, Pendente).
2. `docs/01-visao-geral-e-objetivos.md`: o que é o projeto.
3. `docs/13-plano-de-execucao.md`: fases e próximo passo.
4. `AGENTS.md` e `CLAUDE.md`: regras para qualquer agente ou programador que trabalhe aqui.
5. `docs/17-passagem-para-claude-code.md`: resumo para continuar o trabalho no Claude Code.

## Áreas do sistema
| Área | Pasta | Estado |
| --- | --- | --- |
| Servidor (regras de negócio) | `apps/api` | Estrutura criada |
| Área do cliente | `apps/cliente` | Estrutura criada |
| Área administrativa | `apps/admin` | Estrutura criada |
| Site público | `apps/site-publico` | Estrutura criada |
| Área dos parceiros | `apps/parceiros` | PROPOSTA, condicionada |

## Regras de ouro
- Não inventar decisões de negócio. O que não está confirmado é proposta.
- Nunca guardar palavras-passe, tokens, chaves ou dados reais de clientes no Git.
- Todo o dinheiro passa pelo controlo de risco e pelo registo contabilístico.
- Cada alteração atualiza `CHANGELOG.md` e `docs/14-estado-atual.md`.
