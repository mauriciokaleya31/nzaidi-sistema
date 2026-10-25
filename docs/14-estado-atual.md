# 14. Estado atual do projeto

Atualizado em **25/10/2026** (Fase 1, ramo `feat/fase-1-fundacao`). Este ficheiro deve ser atualizado em cada alteração.

## 1. Repositório oficial
| Verificação | Resultado |
| --- | --- |
| Endereço | `github.com/mauriciokaleya31/nzaidi-sistema` |
| Visibilidade | **Privado** desde 25/10/2026 (D-01 fechada) |
| Ramos | `main` (padrão, Etapa 0), `estrutura-inicial` (igual à `main`), `feat/fase-1-fundacao` (este trabalho) |
| Publicação | Etapa 0 publicada na `main`. Fase 1 em pull request, com o website institucional e o simulador concluídos |

## 1A. Servidor e domínios (verificado e configurado em 25/10/2026)
| Item | Resultado |
| --- | --- |
| `nzaidi.ao` (site institucional) | **Publicado e online** (Status 200). Contém o website institucional completo com o simulador de câmbio interativo (90s) |
| `app.nzaidi.ao` (sistema) | **Protegido**. Listagem de pastas desativada (`Options -Indexes`) e página de aviso institucional ativa |
| Alojamento | cPanel partilhado da AngoWeb (`ws102.angoweb.net`), IP `65.21.251.206` |
| Acesso SSH | **Configurado e testado com sucesso** via chave autorizada no cPanel (D-26 concluída) |
| Node.js no servidor | **Node.js 22.23.4 e npm 10.9.9 ativos** via CloudLinux NodeJS Selector em `/opt/alt/alt-nodejs22/` (D-27 resolvida) |
| Bases de dados | MySQL/MariaDB e SQLite3 disponíveis nativamente |

## 2. O que existe e onde
| Item | Onde está | Estado |
| --- | --- | --- |
| Plano de negócio (PDF) | Guardado pela gestão. **Fora do repositório** (contém NIF e estrutura societária) | Existe |
| Funcionamento do sistema: administração, cliente, parceiros (PDF) | `docs/02-negocio/referencias/` | Criado nesta etapa (cópia) |
| Especificação técnica e funcional da Wise (Word, julho de 2026) | Ficheiro de trabalho fora do repositório | Parcialmente ultrapassada (modelo passou de correspondente a embedded) |
| **Plataforma v1** (esqueleto com Wise OAuth, câmbio, AML, pagamentos AOA, cartões; armazenamento em memória; nunca compilada nem testada) | Pacote de trabalho (`nzaidi-platform-completo.zip`) fora do repositório | **Existe. Não importada.** Ultrapassada pela v2 |
| **Plataforma v2** (KYC, taxas com margem editável, 3 meios de pagamento, AML com casos, back-office, reportes BNA Suptech e SSIF, persistência em disco; 39 verificações aprovadas na altura) | Conversa de 10/07/2026 ("Teste e validação de código funcional") | **Existe só nessa conversa. Não está acessível neste ambiente. Não importada** |
| **Núcleo contabilístico** (PostgreSQL, dupla entrada imutável, remessas MaxPay e Realtransfers, auditoria, idempotência; 29 testes aprovados na altura) | Conversa de 08/07/2026 ("Arquitetura de core banking para casas de câmbio") | **Existe só nessa conversa. Não está acessível neste ambiente. Não importado** |
| Protótipos de aplicação (HTML e React) e site institucional | Pacotes de trabalho | Existem. Não importados |
| Planta da loja (PDF) | Conversas de 06 e 08/07/2026 | Existe. Não faz parte do repositório |
| Contratos de cessão de quotas, procuração, dados bancários | Conversas de junho a agosto de 2026 | Documentação jurídica e administrativa. **Fora do repositório por segurança** |

## 3. Fase 1 em curso (ramo `feat/fase-1-fundacao`)
| Peça | Estado | Verificado |
| --- | --- | --- |
| Monorepo npm (workspaces), TypeScript estrito, Vitest | Criado | `tsc -b` sem erros |
| `packages/design-system`: cores do logótipo, tipografia, componentes base, modo escuro, catálogo | Criado | Visual: abrir `packages/design-system/catalogo.html` |
| `packages/dominio`: dinheiro em decimal exato, taxas (R-07), cotação de 90 s e recotação (R-08) | Criado | 17 testes unitários passam |
| **`apps/site-publico`**: Website institucional responsivo e simulador de câmbio integrado | **Criado e Publicado** | `vite build` com sucesso; 5 testes unitários adicionais; online em `https://nzaidi.ao` |
| Integração contínua (`infra/ci/verificar.yml`): tipos, testes, segredos | Criado, **inativo** | Ativa-se ao mover para `.github/workflows/` (precisa da permissão `workflow` no GitHub) |
| Base de dados, migrações, autenticação, auditoria, API (`apps/api`) | **Próxima etapa** | Preparação com Node.js 22 e arquitetura modular |

## 4. O que foi criado na Etapa 0
- Estrutura de pastas e fichas dos 15 módulos.
- Documentação `docs/00` a `docs/16` e `docs/adr/`.
- `README.md`, `AGENTS.md`, `SECURITY.md`, `CHANGELOG.md`, `.gitignore`, `config/env.example`.
- `scripts/verificar-documentacao.py`.
- `CLAUDE.md` e `docs/17-passagem-para-claude-code.md`.

## 5. O que **não** foi feito
- Código antigo (v2 e núcleo contabilístico) não importado: os pacotes ainda não foram entregues.
- Nenhuma base de dados relacional criada no servidor (preparada para a próxima etapa da API).
- Nenhuma integração externa com credenciais reais testada (modo sandbox/simulado mantido).
