# Registo de alterações

Formato: mais recente primeiro. Cada entrada diz o que mudou, porquê, e se alterou alguma decisão registada.
Regra: quem altera o repositório atualiza este ficheiro e docs/14-estado-atual.md.

## [NZAIDI-BASE-01] — Arranque Seguro em Produção, Rotina BNA Autónoma (15 min) e Proteção Pós-Submissão
- **Arranque Seguro em Produção**: Implementada validação estrita em `apps/api/src/config/env.ts` e `apps/api/src/app.ts`. Com `NODE_ENV=production`, a API recusa terminantemente arrancar se `COOKIE_SECRET`, `ADMIN_INIT_TOKEN` ou `DATABASE_PATH` não estiverem definidos, se `DATABASE_PATH` for `":memory:"`, ou se `CORS_ORIGIN` contiver `localhost` ou `127.0.0.1`. Eliminados todos os valores por defeito sensíveis do código-fonte. 6 novos testes em `apps/api/test/arranque-seguro.test.ts` cobrem cada cenário de recusa.
- **Servidor de Produção Configurado e Reiniciado**: Variáveis de produção geradas com alta entropia criptográfica e gravadas em `.env` com permissões `600` no servidor. `index.js` desacoplado para leitura dinâmica sem dados sensíveis hardcoded. API online e operacional em `https://app.nzaidi.ao/api/health`.
- **Rotina BNA de 15 em 15 minutos (npm run cron:bna)**: A rotina opera no fuso `Africa/Luanda`. Antes das 18:30 não gera mapas de hoje (apenas recupera passados). A partir das 18:30 gera os mapas diários. Se o mapa não foi submetido e surgirem novas operações (ex: às 19:00), regenera-o automaticamente e audita o evento. Depois de submetido, o mapa permanece inviolável e qualquer operação posterior ativa alerta na Visão Geral.
- **Agendamento no cPanel**: Documentado em `docs/18-plano-implantacao-producao.md` o agendamento de 15 em 15 minutos (`*/15 * * * *`).

## [NZAIDI-BASE-01] — Segurança de Infraestrutura, Consultas Parametrizadas e Rotina Automática BNA 18:30
- **Higienização de Documentação**: Remoção rigorosa de IPs, nomes de servidores privados, caminhos absolutos do servidor e detalhes de SSH de todos os documentos (`docs/14`, `docs/18`, `CHANGELOG`, `README`). Os detalhes privados foram preservados fora do controlo de versões.
- **Validação Automática de Documentos**: Atualizado `scripts/verificar-documentacao.py` para bloquear automaticamente ficheiros com IPs públicos, nomes de servidores ou caminhos de alojamento.
- **Consultas Parametrizadas em `proximoNumeroSequencial`**: Refatoração do SQL para utilizar `db.prepare(...).run/get` com parâmetros vinculados (`?`), eliminando qualquer risco de interpolação e injeção SQL. Adicionado teste automatizado com injeção simulada.
- **Rotina Automática BNA das 18:30 (Africa/Luanda)**: Criação de `apps/api/src/cron/gerar-reportes-bna.ts` para execução via tarefa agendada do cPanel (`npm run cron:bna`). Recupera dias anteriores com movimento pendente, emite ambos os mapas (câmbio e remessas), gera reporte a zero obrigatório quando sem operações e grava evento consolidado na pista de auditoria. Coberto por teste automatizado com relógio simulado.

## [NZAIDI-BASE-01] — Junção da Base Unificada e Publicação em Produção (ramo eat/base-unificada)
Unificação integral do trabalho de desenvolvimento regulatório e da renovação visual num ramo consolidado.

### Unificação e Resolução de Conflitos
- Fusão limpa de eat/melhorias-regulamentares-bna e eat/acesso-paineis-gestao-usuarios.
- Resolução do conflito em pps/admin/src/views/dashboard.view.ts: preservou-se o novo design bancário profissional, os cartões de atalhos rápidos (com suporte à permissão er_auditoria), os botões de ação e os indicadores regulatórios do BNA (banner de alerta das 18:35 e estado dos mapas diários Suptech & SSIF).
- Remoção dos ficheiros *.tsbuildinfo do histórico do Git em packages/design-system e packages/dominio, garantindo que o .gitignore os bloqueia definitivamente.
- Teste em clone limpo: execução direta de 
pm ci e 
pm run verificar aprovada sem passos manuais (93 testes unitários e de integração aprovados com 0 falhas).

### Publicação em Produção
- Publicado nos domínios oficiais https://nzaidi.ao (website multipágina com 10 páginas HTML e .htaccess 404) e https://app.nzaidi.ao (backoffice com novo design bancário).
- Repositório tornado público no GitHub (https://github.com/mauriciokaleya31/nzaidi-sistema).

# Registo de alterações

Formato: mais recente primeiro. Cada entrada diz o que mudou, porquê, e se alterou alguma decisão registada.
Regra: quem altera o repositório atualiza este ficheiro e `docs/14-estado-atual.md`.

## [Não publicado] — Modo Manual e Portas de Integração (Ticket NZAIDI-MANUAL-01, ramo `feat/modo-manual-integracoes`)
Implementação da camada de execução e conciliação manual para integrações externas (Wise, MaxPay, Realtransfers, Multicaixa/GPO e bancos comerciais angolanos).

### Adicionado
- **Documento do Ticket (`TICKET_MODO_MANUAL_INTEGRACOES_NZAIDI.md`)**:
  - Especificação detalhada de arquitetura, estados operacionais, idempotência financeira, alçadas AML, prevenção de duplicados e critérios de aceitação.
- **Módulo de Integrações Manuais na API (`apps/api/src/modules/integracoes-manuais/`)**:
  - `integracoes-manuais.types.ts`: Tipos estritos e enums de canais (`wise`, `maxpay`, `realtransfers`, `multicaixa_gpo`, `banco_bai`, etc.) e estados (`pendente`, `concluida`, `rejeitada`, `cancelada`).
  - `integracoes-manuais.repository.ts`: Tabela SQLite `execucoes_integracao_manual` com restrições `UNIQUE(canal_origem, referencia_externa)` e `UNIQUE(chave_idempotencia)`.
  - `integracoes-manuais.service.ts`: Lógica de negócio com alçada de 4 olhos (valores >= 5.000.000 AOA exigem aprovação por segundo operador), segregação estrita de funções (criador != aprovador), garantia de não afetação do caixa físico de notas e registo na pista de auditoria regulatória.
  - `integracoes-manuais.routes.ts`: Endpoints com autenticação de sessão e RBAC (`POST /api/v1/integracoes-manuais/execucoes`, `POST /api/v1/integracoes-manuais/execucoes/:id/aprovar`, `POST /api/v1/integracoes-manuais/execucoes/:id/rejeitar`, `GET /api/v1/integracoes-manuais/execucoes`, `GET /api/v1/integracoes-manuais/execucoes/:id`).
  - `README.md`: Ficha técnica do módulo.
- **Matriz de Permissões RBAC (`apps/api/src/modules/autenticacao/matriz.ts`)**:
  - Novas permissões: `integracoes:liquidar_manual` (Tesouraria, Gestão) e `integracoes:consultar_manual` (Atendente, Compliance, Tesouraria, Gestão).
- **Interface no Painel Administrativo (`apps/admin`)**:
  - `apps/admin/src/views/integracoes.view.ts`: Ecrã completo de liquidações manuais e conciliação, formulário com gerador de chave de idempotência, listagem com badges de estado, botões de ação e modais de confirmação 4-olhos.
  - Atualização do menu lateral (`menu-lateral.ts`) e roteamento (`main.ts`).
  - Métodos no cliente da API (`cliente.ts`).
- **Testes Automatizados (`apps/api/test/modo-manual.test.ts`)**:
  - 7 testes dedicados cobrindo autorização, segregação de funções, idempotência, bloqueio de referências duplicadas por canal, alçadas e não contaminação de caixa físico. Monorepo com 92 testes aprovados.

## [Não publicado] — Renovação visual do website e do backoffice (ramo `feat/acesso-paineis-gestao-usuarios`)
Só apresentação. Não altera a API, o modelo de dados, as regras financeiras, a autenticação nem as permissões.

### Website (`apps/site-publico`)
- Passa a multipágina: `sobre`, `servicos`, `cambios`, `seguranca`, `contactos`, `faq`, `termos`, `privacidade` e `404`, além do início. Vite compila todas as páginas.
- `src/layout.ts`: cabeçalho, menu móvel e rodapé partilhados, com indicação da página actual, revelação ao rolar e inclinação 3D.
- `src/estilo.css` reescrito: cenas 3D em CSS (cartão, esfera, anéis, moedas metálicas, escudo), sem bibliotecas novas. Respeita "reduzir movimento".
- Simulador e tabela de taxas: lógica e identificadores preservados; só correm nas páginas que os têm.
- Ilustrações SVG próprias em `public/img/`; `public/.htaccess` com a página 404.
- **Conteúdo corrigido para não afirmar o que não está confirmado:** remessas passam de "Ativo no Balcão" a "Em preparação" (acordos por fechar, `docs/11`); o horário passa a "a confirmar" (D-18); "Fundada em Luanda" retirado; meios de pagamento ao balcão limitados a numerário. Termos e privacidade publicados como "em preparação" (D-21).

### Backoffice (`apps/admin`)
- `src/estilo.css` reescrito: cobre todas as classes usadas pelas vistas. Antes, 72 não tinham estilo, entre elas `modal-overlay`, `modal-container`, `form-row`, `col-*`, `form-select`, `form-textarea` e `loading-state`. Os modais apareciam no meio da página.
- Login em ecrã dividido com painel da marca e cena 3D; os identificadores e a lógica de autenticação mantêm-se.
- Menu lateral acessível no telemóvel (botão no cabeçalho e fundo escurecido). Antes ficava escondido sem forma de o abrir.
- Logótipo real no menu e no ecrã de carregamento; iniciais do utilizador no cabeçalho; favicon corrigido (apontava para um ficheiro inexistente).
- Impressão do borderô: com o modal aberto, imprime só o borderô.

### Corrigido: nomes de permissões no painel
- O painel verificava `taxas:consultar`, `taxas:editar` e `auditoria:consultar`, que não existem na matriz da API. Passa a usar os nomes que a API envia e exige nas rotas: `ver_taxas`, `alterar_taxas` e `ver_auditoria`. Nenhuma permissão nova foi dada: a matriz da API (`matriz.ts`) não foi alterada. Os testes do painel passam a usar os mesmos nomes.
- Resultado verificado com a API local: a Gestão vê "Taxas de Câmbio" e "Pista de Auditoria" no menu, tem o botão de editar taxas e abre a auditoria.

### Problemas encontrados e não alterados (precisam de decisão)
- `ADMIN_INIT_TOKEN` e `COOKIE_SECRET` têm valores por omissão escritos em `apps/api/src/config/env.ts`. Em produção têm de ser definidos no ambiente.

## [Não publicado] — Fase 5: documentos KYC, segurança, persistência e homologação (ramo `feat/fase-5-documentos-seguranca-homologacao`)
### Adicionado
- **Gestão Documental KYC Segura (`apps/api/src/modules/identidade-kyc/documentos.service.ts`)**:
  - Upload e armazenamento seguro de ficheiros de identidade (BI, Passaporte, NIF, Alvará comercial).
  - Validação rigorosa de magic bytes binários contra ficheiros maliciosos disfarçados (PDF `%PDF-`, PNG `0x89PNG`, JPEG `0xFF, 0xD8, 0xFF`).
  - Limite estrito de tamanho de 5 MB por ficheiro.
  - Armazenamento com nomes em UUID criptográfico fora da raiz pública web (`storage/documentos_kyc/doc_{uuid}.bin`).
  - Geração e verificação de integridade através de checksum criptográfico SHA-256 no carregamento e no descarregamento.
  - Endpoints dedicados: `POST /api/v1/clientes/:id/documentos`, `GET /api/v1/clientes/:id/documentos` e `GET /api/v1/clientes/:id/documentos/:docId/download` com cabeçalhos de segurança (`X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`).
- **Interface de Dossiê Documental no Painel Administrativo (`apps/admin`)**:
  - Modal "Dossiê Docs" na vista de clientes (`#clientes`), permitindo submissão direta de ficheiros codificados em Base64 através do browser.
  - Listagem dos documentos anexados com indicação de tipo, tamanho, data de envio e botão de transferência segura.
- **Suite de Homologação Ponta a Ponta (`apps/api/test/homologacao.test.ts`)**:
  - 16 testes exaustivos cobrindo o fluxo operacional completo:
    1. Autenticação, proteção contra enumeração e revogação de sessão no logout.
    2. Upload de documento genuíno, rejeição de magic bytes falsos, rejeição de payloads >5MB, integridade SHA-256 e aprovação de KYC por Compliance.
    3. Contabilidade de caixa, rejeição de caixas simultâneos e bloqueio de sangrias a descoberto.
    4. Cotação expirada (>90s) rejeitada, compra de divisas com débitos/créditos atómicos e borderô SHA-256, idempotência de transação e rollback atómico em caso de erro no SQLite.
    5. Estorno de operação cambial pela Tesouraria com compensação em caixa.
    6. Segregação de funções e bloqueio de acesso de atendentes à auditoria regulatória.
- **Script de Cópia de Segurança e Recuperação (`scripts/backup.py`)**:
  - Cópia consistente da base SQLite e dos ficheiros KYC com carimbo ISO 8601.
  - Geração de manifesto com hashes SHA-256 de cada elemento e do arquivo compactado (`tar.gz`).
  - Rotina de verificação e restauração atómica com opção de autoteste (`--testar`).
- **Guia de Implantação e Produção (`docs/18-plano-implantacao-producao.md`)**:
  - Requisitos de infraestrutura (Node.js 22 LTS, CloudLinux/cPanel, Ubuntu/Debian, Nginx, HTTPS/SSL).
  - Variáveis de ambiente de produção, procedimentos de publicação, gestão de processos PM2, rotinas de contingência/DR e aviso regulatório formal do BNA/UIF.
- **Total de Testes Automatizados**:
  - 76 testes aprovados em 9 suites de teste (100% de sucesso).

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
- D-26 e D-27 validadas: acesso SSH por chave configurado; Node.js 22 e npm confirmados no alojamento cPanel partilhado.

## [Publicado na `main`] — Etapa 0: auditoria e estrutura
### Adicionado
- Estrutura de pastas (`apps/`, `packages/`, `docs/`, `infra/`, `scripts/`, `tests/`, `config/`).
- Documentação oficial `docs/00` a `docs/16`, mais `docs/adr/` (decisões de arquitetura propostas).
- Fichas de responsabilidade para os 15 módulos da API.
- Documento de funcionamento do sistema em `docs/02-negocio/referencias/` (PDF). O plano de negócio ficou de fora de propósito (dados societários).
- `README.md`, `AGENTS.md`, `SECURITY.md`, `.gitignore`, `config/env.example`.
- `scripts/verificar-documentacao.py` (verifica ligações e segredos).
- `CLAUDE.md` e `docs/17-passagem-para-claude-code.md` (passagem para o Claude Code).
