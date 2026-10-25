# Módulo: Auditoria

**Pasta:** `apps/api/src/modules/auditoria`  
**Estado:** **Funcional e Testado (Fase 2)**.

## Responsabilidade
- Registo imutável (append-only) de todas as operações sensíveis do sistema: autenticações bem-sucedidas e falhadas, criação de utilizadores, alterações de taxas e acessos restritos.
- Fornece histórico cronológico com timestamp ISO, identificador e nome do autor, função, ação, recurso, IP e metadados.

## Regras de negócio
- Escrever-só (append-only): registos nunca são apagados nem alterados.
- Consulta de auditoria estritamente restrita aos perfis `compliance` e `gestao` (docs/07).

## Depende de
(nenhum)
