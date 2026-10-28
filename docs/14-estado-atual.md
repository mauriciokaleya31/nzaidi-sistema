# 14. Estado atual do projeto

Atualizado em **26/10/2026** (Ticket NZAIDI-BASE-01, ramo `feat/base-unificada`). Este ficheiro deve ser atualizado em cada alteração.

## 1. Repositório oficial
| Verificação | Resultado |
| --- | --- |
| Endereço | `github.com/mauriciokaleya31/nzaidi-sistema` |
| Visibilidade | **Público** desde 26/10/2026 |
| Ramos | `main` (atualizado para produção), `feat/base-unificada` (base unificada com BNA, remessas e renovação visual), `feat/melhorias-regulamentares-bna`, `feat/acesso-paineis-gestao-usuarios` |
| Publicação | Base unificada pronta para fusão na `main` com 93 testes automatizados aprovados e 0 falhas |
| Visibilidade | **Privado** desde 25/10/2026 (D-01 fechada) |
| Ramos | `main` (padrão, Etapa 0), `feat/fase-1-fundacao` (Fase 1), `feat/fase-2-api-auth-taxas` (Fase 2), `feat/fase-3-painel-administrativo` (Fase 3), `feat/fase-4-operacoes-balcao-kyc-caixa` (Fase 4), `feat/fase-5-documentos-seguranca-homologacao` (Fase 5), `feat/modo-manual-integracoes` (Ticket NZAIDI-MANUAL-01) |
| Publicação | Etapa 0 na `main`. Fases 1 a 5 desenvolvidas em ramos dedicados com 76 testes aprovados e 0 falhas |

## 1A. Servidor e domínios (verificado e ativo em 26/10/2026)
| Item | Resultado |
| --- | --- |
| `nzaidi.ao` (site institucional) | **Publicado e online** (Status 200). Contém o website multipágina renovado com 10 páginas HTML, simulador de câmbio interativo e página 404 personalizada via `.htaccess` |
| `app.nzaidi.ao` (sistema) | **Publicado e operacional**. Painel administrativo com novo design bancário profissional, ecrã de login seguro, menu mobile e 10+ módulos funcionais |
| Alojamento | cPanel partilhado |
| Acesso SSH | SSH por chave |
| Node.js no servidor | **Node.js 22+ ativo** |
| Bases de dados | SQLite3 com persistência em disco |

## 2. O que existe e onde
| Item | Onde está | Estado |
| --- | --- | --- |
| Plano de negócio (PDF) | Guardado pela gestão. **Fora do repositório** (contém NIF e estrutura societária) | Existe |
| Funcionamento do sistema: administração, cliente, parceiros (PDF) | `docs/02-negocio/referencias/` | Cópia de trabalho |
| Plataforma digital completa NZAIDI (API Fastify, Admin SPA, Site Público) | Repositório oficial | **Implementado e Homologado** |
| Módulo de Reportes BNA (Suptech e SSIF) com corte 18:30, reporte a zero e rotina de cron | `apps/api/src/modules/reportes-bna/`, `apps/api/src/cron/` e `apps/admin/src/views/bna.view.ts` | **Implementado e Testado** |
| Módulo de Remessas Internacionais com parceiros MaxPay e Realtransfers | `apps/api/src/modules/remessas/` e `apps/admin/src/views/remessas.view.ts` | **Implementado e Testado** |
| Numeração Atómica de Borderôs sem saltos (consultas parametrizadas) | `apps/api/src/modules/operacoes-cambio/` e `apps/api/src/database/` | **Implementado e Testado** |
| Rotina Automática cPanel Cron (15 em 15 min, fuso Africa/Luanda, com regeneração e bloqueio pós-submissão) | `apps/api/src/cron/gerar-reportes-bna.ts` | **Implementado e Testado** |
| Arranque Seguro em Produção (validação estrita de segredos e recusa de localhost) | `apps/api/src/config/env.ts` e `apps/api/test/arranque-seguro.test.ts` | **Implementado e Testado** |

## 3. Estado das Peças Técnicas
| Peça | Estado | Verificado |
| --- | --- | --- |
| Monorepo npm (workspaces), TypeScript estrito, Vitest | Criado | `tsc -b` sem erros |
| `packages/design-system`: cores do logótipo, tipografia, componentes base, modo escuro | Criado | Ficheiros de build limpos (sem .tsbuildinfo no git) |
| `packages/dominio`: dinheiro em decimal exato, taxas, cotação de 90 s e recotação | Criado | 17 testes unitários passam |
| `apps/site-publico`: Website multipágina (10 páginas) e simulador integrado | **Publicado em Produção** | `https://nzaidi.ao` ativo e testado |
| `apps/api`: API Fastify, RBAC, KYC, Borderôs Atómicos, Reportes BNA e Remessas | **Homologado** | 101 testes automatizados (12 suites) passam a 100% |
| `apps/admin`: Backoffice SPA com design bancário, 10+ módulos e menu mobile | **Publicado em Produção** | `https://app.nzaidi.ao` ativo e testado |
| `scripts/verificar-documentacao.py`: Validação de links, segredos e ficheiros | **Aprovado** | 0 segredos detetados, 0 ligações quebradas |
| `packages/design-system`: cores do logótipo, tipografia, componentes base, modo escuro, catálogo | Criado | Visual: abrir `packages/design-system/catalogo.html` |
| `packages/dominio`: dinheiro em decimal exato, taxas (R-07), cotação de 90 s e recotação (R-08) | Criado | 17 testes unitários passam |
| `apps/site-publico`: Website institucional responsivo e simulador de câmbio integrado com a API | **Criado e Publicado** | `vite build` aprovado; 5 testes unitários; online em `https://nzaidi.ao` |
| **`apps/api`**: API Fastify com Autenticação `scrypt`, RBAC, Taxas, Auditoria, Clientes, KYC, Documentos com Magic Bytes, Caixa e Operações Cambiais | **Criado e Homologado** | 40 testes de integração e homologação; `tsc -b` sem erros; persistência relacional com SQLite e transações atómicas |
| **`apps/admin`**: Painel Administrativo SPA com Balcão de Câmbios, Clientes/KYC com Dossiê Documental, Caixa/Tesouraria, Taxas e Auditoria | **Criado e Testado** | 14 testes automatizados; `vite build` aprovado; integração completa com a API |
| **`scripts/backup.py`**: Rotina de Cópia de Segurança e Recuperação de Desastre com Verificação SHA-256 | **Criado e Validado** | Autoteste de recuperação atómica aprovado a 100% |
| **`docs/18-plano-implantacao-producao.md`**: Plano de Produção, Checklist de Infraestrutura e Aviso Regulatório BNA | **Documentado** | Requisitos técnicos, segredos, rollback e limitações regulatórias |
| **Renovação visual do website** (25/10/2026): multipágina (Início, Sobre Nós, Serviços, Câmbios, Segurança, Contactos, FAQ, Termos, Privacidade, 404), layout partilhado, elementos 3D em CSS | **Criado, não publicado** | `vite build` gera as 10 páginas; sem ligações partidas; sem deslocamento horizontal a 375 px; simulador com os mesmos resultados |
| **Renovação visual do backoffice** (25/10/2026): CSS completo (antes 72 classes sem estilo, incluindo os modais), login em ecrã dividido, menu lateral no telemóvel | **Criado, não publicado** | 7 vistas abertas com a API local em memória; modais sobrepostos; 85 testes passam |
| **Modo Manual & Integrações** (`apps/api` e `apps/admin`): Execução assistida e conciliação manual de parceiros (Wise, MaxPay, Realtransfers, Multicaixa, bancos), idempotência estrita, segregação de funções (4 olhos para >= 5M AOA) e sem contaminação do caixa físico | **Criado e Validado** | 92 testes no total (7 testes dedicados em `apps/api/test/modo-manual.test.ts`); `tsc -b` e `vite build` aprovados |
| Integração contínua (`infra/ci/verificar.yml`): tipos, testes, segredos | Criado, **inativo** | Ativa-se ao mover para `.github/workflows/` (precisa da permissão `workflow` no GitHub) |

## 4. O que **não** foi feito
- Nenhuma credencial de produção nem dados de identificação pessoal gravados no repositório.
- Nenhuma chamada real externa a gateways não contratados (adaptadores simulados para ambiente piloto).
