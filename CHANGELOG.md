# Registo de alterações

Formato: mais recente primeiro. Cada entrada diz o que mudou, porquê, e se alterou alguma decisão registada.
Regra: quem altera o repositório atualiza este ficheiro e `docs/14-estado-atual.md`.

## [Não publicado] — Fase 4: operações de balcão, clientes, KYC, borderôs e fecho de caixa (ramo `feat/fase-4-operacoes-balcao-kyc-caixa`)
### Adicionado
- **Módulo de Clientes e KYC (`apps/api/src/modules/identidade-kyc`)**:
  - Cadastro de clientes particulares (pessoas singulares) e empresas (pessoas colectivas) com identificação oficial (BI, Passaporte, Cartão de Residente, NIF).
  - Deteção e impedimento automático de registos duplicados por documento.
  - Ciclo de vida KYC com estados `pendente`, `em_analise`, `aprovado`, `rejeitado` e `actualizacao_necessaria`.
  - Classificação de risco AML (`baixo`, `medio`, `alto`).
  - Segregação estrita de funções: Apenas perfis de `compliance` e `gestao` podem aprovar ou rejeitar diligências KYC com parecer obrigatório registado em auditoria.
- **Módulo de Contabilidade e Caixa (`apps/api/src/modules/contabilidade-tesouraria`)**:
  - Abertura de caixas operacionais por operador com fundos iniciais em Kwanza (AOA), Dólar (USD) e Euro (EUR).
  - Regra de unicidade: O operador só pode manter um caixa aberto ativo em simultâneo.
  - Saldos apurados por movimentos atómicos imutáveis (abertura, câmbio entrada/saída, suprimento, sangria). O saldo não é livremente editável.
  - Fecho de caixa com conferência física das notas, apuramento de quebras/sobras e exigência de justificação formal se houver divergência.
- **Módulo de Operações Cambiais de Balcão e Borderôs (`apps/api/src/modules/operacoes-cambio`)**:
  - Compra e venda de USD e EUR contra Kwanza AOA calculadas pelo pacote `@nzaidi/dominio` com arredondamento bancário e precisão `decimal.js`.
  - Validação da cotação de 90 segundos do BNA: Operações com cotações expiradas são estritamente rejeitadas no backend.
  - Validação prévia de saldo em caixa para liquidação imediata da contrapartida (AOA na compra, Divisa na venda).
  - Idempotência obrigatória com `chaveIdempotencia` única para prevenir transações duplicadas.
  - Emissão automática de **Borderô de Câmbio** numerado sequencialmente com hash SHA-256 inviolável e layout pronto para impressão/PDF.
  - Estorno auditado de operações cambiais pela Tesouraria/Gestão com reversão atómica de saldos em caixa.
  - Transações atómicas com rollback (`comTransacao`) em `node:sqlite`.
- **Expansão do RBAC**:
  - Novas permissões granulares mapeadas na matriz de segurança: `clientes:criar`, `clientes:consultar`, `clientes:editar`, `kyc:analisar`, `kyc:aprovar`, `caixa:abrir`, `caixa:movimentar`, `caixa:fechar`, `caixa:consultar`, `operacoes:registar`, `operacoes:consultar`, `operacoes:estornar`.
- **Painel Administrativo (`apps/admin`)**:
  - Nova vista de **Gestão de Clientes & KYC** (`#clientes`): busca em tempo real, cadastro de particulares/empresas e modal de decisão KYC.
  - Nova vista de **Tesouraria & Caixa** (`#caixa`): ecrã de abertura de caixa, saldos esperados por divisa, suprimentos/sangrias e fecho com contagem física.
  - Nova vista de **Balcão Operacional de Câmbios** (`#balcao`): seleção de cliente KYC aprovado, simulador em tempo real com contador de 90s, liquidação e emissão/impressão de borderô oficial.
  - Atualização do menu lateral e atalhos operacionais do dashboard.
- **Testes Automatizados**:
  - 20 novos testes automatizados (17 testes de integração na API em `fase4.test.ts` e 3 novos testes no Admin em `admin.test.ts`), elevando o repositório para **60 testes aprovados** (100% de sucesso).

## [Não publicado] — Fase 3: painel administrativo e integração com a API (ramo `feat/fase-3-painel-administrativo`)
### Adicionado
- **Aplicação Administrativa (`apps/admin`)**: Single Page Application profissional com Vite, TypeScript estrito e design institucional da NZAIDI (`@nzaidi/admin`).
- **Autenticação HttpOnly e Gestão de Sessão**:
  - Integração com `GET /api/v1/auth/me`, `POST /api/v1/auth/login` e `POST /api/v1/auth/logout`.
  - Sessão persistida em cookies seguros do servidor com zero credenciais ou tokens em `localStorage`/`sessionStorage`.
  - Estado de autenticação in-memory reativo (`AuthState`) com suporte a subscrição de eventos.
- **Controlo de Acesso Baseado em Funções (RBAC)**:
  - Suporte completo aos 4 perfis operacionais: `gestao`, `compliance`, `tesouraria` e `atendente`.
  - Menus laterais, cabeçalhos e permissões filtrados dinamicamente na UI, com garantia de validação e autorização mandatórias no servidor Fastify.
- **Módulo de Gestão de Taxas de Câmbio (`#taxas`)**:
  - Tabela com cotações de compra e venda em tempo real para USD e EUR, taxas de referência BNA e estado de demonstração/oficial.
  - Modal de edição de taxas exclusivo para o perfil `gestao`.
  - Validação rigorosa no cliente e no servidor com obrigatoriedade de justificação formal para a pista de auditoria.
- **Pista de Auditoria Regulatória (`#auditoria`)**:
  - Interface de consulta cronológica dos últimos eventos do sistema, exclusiva para `compliance` e `gestao`.
  - Exibição de carimbo temporal, utilizador operador, função, ação, recurso afetado, detalhes estruturados e IP de origem.
- **Vistas Operacionais e Tesouraria (`#operacional` / `#tesouraria`)**:
  - Telas contextuais com fluxos previstos de KYC, borderôs e fecho de caixa, preparando a transição suave para a Fase 4.
- **Testes Automatizados do Admin**:
  - 11 novos testes unitários e de integração (`apps/admin/test/admin.test.ts` e `apps/admin/test/auth.state.test.ts`), cobrindo o cliente HTTP, tratamento de erros 401/403, RBAC e mutações de estado, elevando o repositório para **40 testes automatizados** (100% de sucesso).
- **Scripts de Compilação do Monorepo**:
  - Adicionado script `npm run build:admin` no `package.json` raiz.
  - Referência do projeto adicionada a `tsconfig.json`.

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
