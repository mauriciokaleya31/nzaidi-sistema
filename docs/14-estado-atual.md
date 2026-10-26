# 14. Estado atual do projeto

Atualizado em **25/10/2026** (Fase 5, ramo `feat/fase-5-documentos-seguranca-homologacao`). Este ficheiro deve ser atualizado em cada alteração.

## 1. Repositório oficial
| Verificação | Resultado |
| --- | --- |
| Endereço | `github.com/mauriciokaleya31/nzaidi-sistema` |
| Visibilidade | **Privado** desde 25/10/2026 (D-01 fechada) |
| Ramos | `main` (padrão, Etapa 0), `feat/fase-1-fundacao` (Fase 1), `feat/fase-2-api-auth-taxas` (Fase 2), `feat/fase-3-painel-administrativo` (Fase 3), `feat/fase-4-operacoes-balcao-kyc-caixa` (Fase 4), `feat/fase-5-documentos-seguranca-homologacao` (Fase 5 concluída localmente) |
| Publicação | Etapa 0 na `main`. Fases 1 a 5 desenvolvidas em ramos dedicados com 76 testes aprovados e 0 falhas |

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
| **Plataforma v2** (KYC, taxas com margem editável, 3 meios de pagamento, AML com casos, back-office, reportes BNA Suptech e SSIF, persistência em disco) | Conversa de 10/07/2026 | Existe fora do repositório |
| **Núcleo contabilístico** (PostgreSQL, dupla entrada imutável, remessas MaxPay e Realtransfers, auditoria, idempotência) | Conversa de 08/07/2026 | Existe fora do repositório |

## 3. Estado das Peças Técnicas
| Peça | Estado | Verificado |
| --- | --- | --- |
| Monorepo npm (workspaces), TypeScript estrito, Vitest | Criado | `tsc -b` sem erros |
| `packages/design-system`: cores do logótipo, tipografia, componentes base, modo escuro, catálogo | Criado | Visual: abrir `packages/design-system/catalogo.html` |
| `packages/dominio`: dinheiro em decimal exato, taxas (R-07), cotação de 90 s e recotação (R-08) | Criado | 17 testes unitários passam |
| `apps/site-publico`: Website institucional responsivo e simulador de câmbio integrado com a API | **Criado e Publicado** | `vite build` aprovado; 5 testes unitários; online em `https://nzaidi.ao` |
| **`apps/api`**: API Fastify com Autenticação `scrypt`, RBAC, Taxas, Auditoria, Clientes, KYC, Documentos com Magic Bytes, Caixa e Operações Cambiais | **Criado e Homologado** | 40 testes de integração e homologação; `tsc -b` sem erros; persistência relacional com SQLite e transações atómicas |
| **`apps/admin`**: Painel Administrativo SPA com Balcão de Câmbios, Clientes/KYC com Dossiê Documental, Caixa/Tesouraria, Taxas e Auditoria | **Criado e Testado** | 14 testes automatizados; `vite build` aprovado; integração completa com a API |
| **`scripts/backup.py`**: Rotina de Cópia de Segurança e Recuperação de Desastre com Verificação SHA-256 | **Criado e Validado** | Autoteste de recuperação atómica aprovado a 100% |
| **`docs/18-plano-implantacao-producao.md`**: Plano de Produção, Checklist de Infraestrutura e Aviso Regulatório BNA | **Documentado** | Requisitos técnicos, segredos, rollback e limitações regulatórias |
| **Renovação visual do website** (25/10/2026): multipágina (Início, Sobre Nós, Serviços, Câmbios, Segurança, Contactos, FAQ, Termos, Privacidade, 404), layout partilhado, elementos 3D em CSS | **Criado, não publicado** | `vite build` gera as 10 páginas; sem ligações partidas; sem deslocamento horizontal a 375 px; simulador com os mesmos resultados |
| **Renovação visual do backoffice** (25/10/2026): CSS completo (antes 72 classes sem estilo, incluindo os modais), login em ecrã dividido, menu lateral no telemóvel | **Criado, não publicado** | 7 vistas abertas com a API local em memória; modais sobrepostos; 85 testes passam |
| Integração contínua (`infra/ci/verificar.yml`): tipos, testes, segredos | Criado, **inativo** | Ativa-se ao mover para `.github/workflows/` (precisa da permissão `workflow` no GitHub) |

## 4. O que **não** foi feito
- Nenhuma operação financeira real ou simulação de dinheiro externo executada (respeito estrito à segurança).
- Nenhuma credencial de produção de gateway ou parceiro gravada no repositório.
