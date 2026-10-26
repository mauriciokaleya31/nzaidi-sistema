# 14. Estado atual do projeto

Atualizado em **26/10/2026** (Ticket NZAIDI-BASE-01, ramo `feat/base-unificada`). Este ficheiro deve ser atualizado em cada alteração.

## 1. Repositório oficial
| Verificação | Resultado |
| --- | --- |
| Endereço | `github.com/mauriciokaleya31/nzaidi-sistema` |
| Visibilidade | **Público** desde 26/10/2026 |
| Ramos | `main` (atualizado para produção), `feat/base-unificada` (base unificada com BNA, remessas e renovação visual), `feat/melhorias-regulamentares-bna`, `feat/acesso-paineis-gestao-usuarios` |
| Publicação | Base unificada pronta para fusão na `main` com 93 testes automatizados aprovados e 0 falhas |

## 1A. Servidor e domínios (verificado e ativo em 26/10/2026)
| Item | Resultado |
| --- | --- |
| `nzaidi.ao` (site institucional) | **Publicado e online** (Status 200). Contém o website multipágina renovado com 10 páginas HTML, simulador de câmbio interativo e página 404 personalizada via `.htaccess` |
| `app.nzaidi.ao` (sistema) | **Publicado e operacional**. Painel administrativo com novo design bancário profissional, ecrã de login seguro, menu mobile e 10+ módulos funcionais |
| Alojamento | cPanel partilhado da AngoWeb (`ws102.angoweb.net`), IP `65.21.251.206` |
| Acesso SSH | **Configurado e testado com sucesso** via chave autorizada no cPanel |
| Node.js no servidor | **Node.js 22.23.4 e npm 10.9.9 ativos** via CloudLinux NodeJS Selector em `/opt/alt/alt-nodejs22/` |
| Bases de dados | SQLite3 com persistência em disco (`/mnt/home102/nzaidiao/data/nzaidi.sqlite`) |

## 2. O que existe e onde
| Item | Onde está | Estado |
| --- | --- | --- |
| Plano de negócio (PDF) | Guardado pela gestão. **Fora do repositório** (contém NIF e estrutura societária) | Existe |
| Funcionamento do sistema: administração, cliente, parceiros (PDF) | `docs/02-negocio/referencias/` | Cópia de trabalho |
| Plataforma digital completa NZAIDI (API Fastify, Admin SPA, Site Público) | Repositório oficial | **Implementado e Homologado** |
| Módulo de Reportes BNA (Suptech e SSIF) com corte 18:30 e reporte a zero | `apps/api/src/modules/reportes-bna/` e `apps/admin/src/views/bna.view.ts` | **Implementado e Testado** |
| Módulo de Remessas Internacionais com parceiros MaxPay e Realtransfers | `apps/api/src/modules/remessas/` e `apps/admin/src/views/remessas.view.ts` | **Implementado e Testado** |
| Numeração Atómica de Borderôs sem saltos | `apps/api/src/modules/operacoes-cambio/` | **Implementado e Testado** |

## 3. Estado das Peças Técnicas
| Peça | Estado | Verificado |
| --- | --- | --- |
| Monorepo npm (workspaces), TypeScript estrito, Vitest | Criado | `tsc -b` sem erros |
| `packages/design-system`: cores do logótipo, tipografia, componentes base, modo escuro | Criado | Ficheiros de build limpos (sem .tsbuildinfo no git) |
| `packages/dominio`: dinheiro em decimal exato, taxas, cotação de 90 s e recotação | Criado | 17 testes unitários passam |
| `apps/site-publico`: Website multipágina (10 páginas) e simulador integrado | **Publicado em Produção** | `https://nzaidi.ao` ativo e testado |
| `apps/api`: API Fastify, RBAC, KYC, Borderôs Atómicos, Reportes BNA e Remessas | **Homologado** | 93 testes automatizados (11 suites) passam a 100% |
| `apps/admin`: Backoffice SPA com design bancário, 10+ módulos e menu mobile | **Publicado em Produção** | `https://app.nzaidi.ao` ativo e testado |
| `scripts/verificar-documentacao.py`: Validação de links, segredos e ficheiros | **Aprovado** | 0 segredos detetados, 0 ligações quebradas |

## 4. O que **não** foi feito
- Nenhuma credencial de produção nem dados de identificação pessoal gravados no repositório.
- Nenhuma chamada real externa a gateways não contratados (adaptadores simulados para ambiente piloto).
