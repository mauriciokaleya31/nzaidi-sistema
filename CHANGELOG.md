# Registo de alterações

Formato: mais recente primeiro. Cada entrada diz o que mudou, porquê, e se alterou alguma decisão registada.
Regra: quem altera o repositório atualiza este ficheiro e `docs/14-estado-atual.md`.

## [Não publicado] — Site público (ramo `feat/site-publico`)
### Adicionado
- `apps/site-publico`: site institucional estático para `nzaidi.ao` com cena 3D (cartão, painel de taxas e moedas), tabela de taxas, conversor indicativo com cálculo decimal exato, serviços, remessas, como funciona, loja na Maianga, perguntas frequentes, chamada final e rodapé.
- Ilustrações próprias em SVG: globo das remessas, fachada da loja, padrão geométrico inspirado no logótipo.
- Responsivo (computador, tablet, telemóvel), modo claro e escuro, menu móvel, animações que respeitam "reduzir movimento".
- `scripts/construir-site.mjs` e `npm run site:construir`: gera `dist/site` pronto para o cPanel.
- `.claude/launch.json`: pré-visualização local.

### Regras respeitadas
- Nenhuma taxa inventada: sem API, a tabela mostra "A aguardar atualização". Valores de demonstração só com `?demo=1` e identificados.
- Contactos por confirmar ficam ocultos. Serviços condicionados aparecem como "brevemente".

## [Não publicado] — Fase 1: fundação técnica (ramo `feat/fase-1-fundacao`)
### Adicionado
- Monorepo com workspaces npm, TypeScript estrito (`tsconfig.base.json`) e Vitest.
- `packages/design-system`: tokens de cor extraídos do logótipo, tipografia, espaçamentos, componentes base (botões, campos, cartões, indicadores, tabelas financeiras, estados, aviso de demonstração), modo claro e escuro, logótipo, símbolo e favicon, `catalogo.html`.
- `packages/dominio`: dinheiro em decimal exato (`decimal.js`), formatação em Kz, US$ e €, cálculo de taxas de compra e venda (R-07), cotação com validade configurável de 90 s e recotação (R-08). 17 testes.
- `infra/ci/verificar.yml`: integração contínua (tipos, testes e verificação de segredos em cada pull request). Guardado fora de `.github/workflows/` até o login do GitHub ter a permissão `workflow`; ver `infra/ci/README.md`.

### Alterado
- `scripts/verificar-documentacao.py`: ignora `dist/` e `.webp`; deteta também chaves privadas OpenSSH.
- `docs/14`, `docs/15` (D-01 fechada; novas D-25 a D-29), `docs/16` (R-18 a R-21), `README.md`.

### Decisões
- Arredondamento das taxas e montantes implementado como Proposta (D-25).

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
