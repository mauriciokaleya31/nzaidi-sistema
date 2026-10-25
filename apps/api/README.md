# API NZAIDI (`@nzaidi/api`)

Serviço backend único e modular da NZAIDI – Casa de Câmbios & Transferência, Lda. Construído com Node.js (>=22), TypeScript estrito, Fastify e Zod.

## Arquitetura e Módulos
- **Framework Web**: Fastify com plugins de segurança (`@fastify/helmet`, `@fastify/cors`, `@fastify/cookie`, `@fastify/rate-limit`).
- **Validação**: Esquemas estritos com Zod em variáveis de ambiente, parâmetros de rota, query strings e payloads.
- **Autenticação & Sessões**:
  - Hashing seguro de senhas com `scrypt` e salting de 32 bytes criptograficamente seguro (`apps/api/src/modules/autenticacao/hash.ts`).
  - Sessões em base de dados com identificadores de 64 caracteres hex, cookies `HttpOnly`, `SameSite: "lax"`, e revogação ativa no logout (`sessions.repository.ts`).
  - Proteção contra enumeração de contas e timing attacks.
  - Processo de inicialização do primeiro administrador de Gestão (`POST /api/v1/auth/primeiro-admin`), documentado e desativado automaticamente após a criação do primeiro utilizador.
- **Controlo de Acesso Baseado em Funções (RBAC)**:
  - Matriz formal em `apps/api/src/modules/autenticacao/matriz.ts` cobrindo as funções: `atendente`, `compliance`, `tesouraria` e `gestao`.
  - Validação rigorosa no servidor através do middleware `exigirPermissao(permissao)`.
  - R-07 e R-14: estritamente o perfil `gestao` possui permissão para alterar taxas e margens (`alterar_taxas`).
- **Taxas de Câmbio**:
  - Integração com `@nzaidi/dominio` (`calcularTaxas`, limites de margem) para USD e EUR.
  - Exposição de estados de cotação explícitos: `fonte: "demonstracao" | "oficial"`.
  - Histórico de auditoria de quem alterou a taxa e o motivo da alteração.
- **Auditoria Append-Only**:
  - Registo imutável de todas as ações sensíveis (logins, logouts, tentativas falhadas, alterações de taxas e criação de administradores) com timestamp ISO, identificação do utilizador e IP.
- **Base de Dados**:
  - Persistência desacoplada com SQLite relacional via `node:sqlite` nativo do Node 22, compatível com o ambiente local e de alojamento cPanel.

## Endpoints Disponíveis
- `GET /api/health` — Verificação de saúde operacional e status da base de dados.
- `GET /api/v1/taxas` — Tabela pública de taxas de câmbio (USD e EUR).
- `GET /api/v1/taxas/:moeda` — Consulta de taxa de moeda específica.
- `PUT /api/v1/taxas/:moeda` — Alteração de taxas de referência e margens (protegida, perfil `gestao`).
- `POST /api/v1/auth/login` — Autenticação de utilizadores internos.
- `POST /api/v1/auth/logout` — Encerramento e invalidação de sessão.
- `GET /api/v1/auth/me` — Consulta do utilizador autenticado e suas permissões ativas.
- `POST /api/v1/auth/primeiro-admin` — Bootstrap seguro do primeiro administrador.
- `GET /api/v1/auditoria` — Consulta do histórico imutável (protegida, perfis `compliance` e `gestao`).

## Execução Local
```bash
# Compilar TypeScript
npm --workspace=@nzaidi/api run build

# Iniciar servidor
npm --workspace=@nzaidi/api run start

# Executar testes unitários e de integração
npm test
```
