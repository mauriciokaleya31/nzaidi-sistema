# Registo de alterações

Formato: mais recente primeiro. Cada entrada diz o que mudou, porquê, e se alterou alguma decisão registada.
Regra: quem altera o repositório atualiza este ficheiro e `docs/14-estado-atual.md`.

## [Não publicado] — Fase 2: fundação da API, autenticação e taxas (ramo `feat/fase-2-api-auth-taxas`)
### Adicionado
- **Fundação da API (`apps/api`)**: servidor Fastify com TypeScript estrito, validação com Zod, cookies seguros, rate limiting e cabeçalhos de segurança (`@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/cookie`).
- **Autenticação e Sessões (`apps/api/src/modules/autenticacao`)**:
  - Hashing de palavras-passe com `scrypt` e salting de 32 bytes criptograficamente seguro (`hash.ts`).
  - Sessões em base de dados com cookies `HttpOnly`, `SameSite: "lax"`, expiração e revogação ativa no logout (`sessions.repository.ts`).
  - Proteção contra enumeração de contas e timing attacks.
  - Endpoint de inicialização segura do primeiro administrador de Gestão (`POST /api/v1/auth/primeiro-admin`), desativado automaticamente após a criação do primeiro utilizador.
  - Endpoints `POST /api/v1/auth/login`, `POST /api/v1/auth/logout` e `GET /api/v1/auth/me`.
- **Controlo de Acesso Baseado em Funções (RBAC)**:
  - Matriz formal de permissões (`matriz.ts`) para `atendente`, `compliance`, `tesouraria` e `gestao`.
  - Validação no servidor via middleware `exigirPermissao(permissao)`.
  - Garantia de que apenas a função `gestao` pode alterar taxas e margens (R-07, R-14).
- **Módulo de Taxas de Câmbio (`apps/api/src/modules/taxas-cambio`)**:
  - `GET /api/v1/taxas` e `GET /api/v1/taxas/:moeda` com estados explícitos de cotação (`fonte: "demonstracao" | "oficial"`).
  - `PUT /api/v1/taxas/:moeda` com proteção por perfil (`gestao`), validação financeira via `@nzaidi/dominio` e registo obrigatório de auditoria (quem alterou, quando e motivo).
- **Auditoria Imutável (`apps/api/src/modules/auditoria`)**:
  - Registo append-only de ações sensíveis com timestamp ISO, autor, IP e detalhes higienizados.
  - `GET /api/v1/auditoria` com acesso restrito a `compliance` e `gestao`.
- **Camada de Serviço do Website Público**:
  - `buscarTaxasDaApi()` em `apps/site-publico/src/dados-taxas.ts` que consome `GET /api/v1/taxas` e faz fallback seguro em caso de indisponibilidade.
- **Testes da API**:
  - 7 novos testes de integração cobrindo health, taxas públicas, bootstrap de admin, login, logout, expiração e RBAC, totalizando 29 testes unitários e de integração no monorepo (100% de sucesso).

## [Não publicado] — Fase 1: fundação técnica (ramo `feat/fase-1-fundacao`)
### Adicionado
- `apps/site-publico`: Website institucional completo, moderno e responsivo da NZAIDI (`@nzaidi/site-publico`) construído com HTML5 semântico, TypeScript estrito e Vite.
- **Simulador de Câmbio Interativo**: cálculo rigoroso de compra e venda de divisas (USD e EUR em Kwanzas) reutilizando as funções do `@nzaidi/dominio` e `decimal.js`, cotação com temporizador de 90 segundos e fluxo de recotação (R-08).
- 5 testes unitários para o simulador (`apps/site-publico/src/simulador.test.ts`), totalizando 22 testes unitários no projeto (100% de aprovação).
- Secções institucionais do website público: tabela de câmbio oficial do dia, serviços (balcão e preparação de serviços digitais), processo passo a passo, conformidade e AML (Lei n.º 5/20 e BNA), sobre a NZAIDI e balcão na Maianga, contactos e FAQ interativo.
- Deploy de produção do website institucional em `public_html/` (`https://nzaidi.ao`) e proteção do subdomínio `app.nzaidi.ao` com página de espera e bloqueio de listagem aberta (`Options -Indexes`).
- Monorepo com workspaces npm, TypeScript estrito (`tsconfig.base.json`) e Vitest.
- `packages/design-system`: tokens de cor extraídos do logótipo, tipografia, espaçamentos, componentes base (botões, campos, cartões, indicadores, tabelas financeiras, estados, aviso de demonstração), modo claro e escuro, logótipo, símbolo e favicon, `catalogo.html`.
- `packages/dominio`: dinheiro em decimal exato (`decimal.js`), formatação em Kz, US$ e €, cálculo de taxas de compra e venda (R-07), cotação com validade configurável de 90 s e recotação (R-08). 17 testes iniciais.
- `infra/ci/verificar.yml`: integração contínua (tipos, testes e verificação de segredos em cada pull request). Guardado fora de `.github/workflows/` até o login do GitHub ter a permissão `workflow`; ver `infra/ci/README.md`.

### Alterado
- `package.json`: adicionado workspace `apps/*` e scripts da API e site.
- `tsconfig.json`: adicionadas referências para `apps/site-publico` e `apps/api`.
- `.gitignore`: adicionadas entradas para `dist-ts/` e `*.tsbuildinfo`.
- `scripts/verificar-documentacao.py`: ignora `dist/` e `.webp`; deteta também chaves privadas OpenSSH.
- `docs/14`, `docs/15` (D-01 fechada; novas D-25 a D-29), `docs/16` (R-18 a R-21), `README.md`.

### Decisões
- D-26 e D-27 validadas: acesso SSH configurado com nova chave autorizada; Node.js 22.23.4 e npm 10.9.9 confirmados no servidor cPanel/CloudLinux.

## [Publicado na `main`] — Etapa 0: auditoria e estrutura
### Adicionado
- Estrutura de pastas (`apps/`, `packages/`, `docs/`, `infra/`, `scripts/`, `tests/`, `config/`).
- Documentação oficial `docs/00` a `docs/16`, mais `docs/adr/` (decisões de arquitetura propostas).
- Fichas de responsabilidade para os 15 módulos da API.
- Documento de funcionamento do sistema em `docs/02-negocio/referencias/` (PDF). O plano de negócio ficou de fora de propósito (dados societários).
- `README.md`, `AGENTS.md`, `SECURITY.md`, `.gitignore`, `config/env.example`.
- `scripts/verificar-documentacao.py` (verifica ligações e segredos).
- `CLAUDE.md` e `docs/17-passagem-para-claude-code.md` (passagem para o Claude Code).
