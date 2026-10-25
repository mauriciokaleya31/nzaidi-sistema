# Módulo: Autenticação e permissões

**Pasta:** `apps/api/src/modules/autenticacao`  
**Estado:** **Funcional e Testado (Fase 2)**.

## Responsabilidade
- Autenticação de utilizadores internos através de palavras-passe com hash `scrypt` e salting de 32 bytes (`hash.ts`).
- Sessões em base de dados com cookies `HttpOnly`, expiração e revogação ativa no logout (`sessions.repository.ts`).
- Controlo de acesso baseado em funções (RBAC) com matriz formal de permissões (`matriz.ts`) cobrindo `atendente`, `compliance`, `tesouraria` e `gestao`.
- Bootstrap seguro do primeiro administrador (`POST /api/v1/auth/primeiro-admin`), desativado automaticamente após a primeira utilização.

## Regras de negócio
- Uma pessoa, uma conta. Acessos individuais nunca são partilhados.
- Separação de funções rigorosa: apenas a função `gestao` tem permissão de alterar taxas e margens (R-07, R-14).
- Proteção contra enumeração de contas e ataques de temporização.

## Depende de
auditoria
