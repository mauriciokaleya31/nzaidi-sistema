# Registo de alterações

Formato: mais recente primeiro. Cada entrada diz o que mudou, porquê, e se alterou alguma decisão registada.
Regra: quem altera o repositório atualiza este ficheiro e `docs/14-estado-atual.md`.

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
- `package.json`: adicionado workspace `apps/site-publico` e script `build:site`.
- `tsconfig.json`: adicionada referência para `apps/site-publico`.
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

### Não alterado
- Nenhum código funcional foi criado ou importado nesta etapa.
- O repositório estava vazio. Nada foi apagado nem substituído.

### Decisões
- Nenhuma decisão de negócio foi tomada. As propostas estão marcadas como PROPOSTA.
