# 14. Estado atual do projeto

Atualizado em **25/10/2026** (início da Fase 1, ramo `feat/fase-1-fundacao`). Este ficheiro deve ser atualizado em cada alteração.

## 1. Repositório oficial
| Verificação | Resultado |
| --- | --- |
| Endereço | `github.com/mauriciokaleya31/nzaidi-sistema` |
| Visibilidade | **Privado** desde 25/10/2026 (D-01 fechada) |
| Ramos | `main` (padrão, Etapa 0), `estrutura-inicial` (igual à `main`), `feat/fase-1-fundacao` (este trabalho) |
| Publicação | Etapa 0 publicada na `main`. Fase 1 em pull request, à espera de revisão |

## 1A. Servidor e domínios (verificado a partir do exterior em 25/10/2026)
| Item | Resultado |
| --- | --- |
| `nzaidi.ao` (site) | Responde. Mostra a página padrão do alojamento ("conta configurada com sucesso") |
| `app.nzaidi.ao` (sistema) | Responde com **listagem de pastas aberta** ("Index of /") e PHP 7.2 (sem suporte de segurança desde 2020). Corrigir antes de publicar algo lá |
| Alojamento | cPanel partilhado da AngoWeb (`ws102.angoweb.net`), IP `65.21.251.206` numa rede de centro de dados fora de Angola |
| Acesso SSH a partir deste ambiente | **Não configurado.** Ver D-26 |
| Base de dados no servidor | **Não criada.** Falta saber se o plano tem PostgreSQL e Node.js (D-27) |

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

**Consequência:** o código mais avançado não pode ser verificado nem importado a partir do que existe aqui. A Fase 1 precisa que o dono do projeto forneça esses pacotes (v2 e núcleo contabilístico) para os rever e fundir.

## 3. Fase 1 em curso (ramo `feat/fase-1-fundacao`)
| Peça | Estado | Verificado |
| --- | --- | --- |
| Monorepo npm (workspaces), TypeScript estrito, Vitest | Criado | `tsc -b` sem erros |
| `packages/design-system`: cores do logótipo, tipografia, componentes base, modo escuro, catálogo | Criado | Visual: abrir `packages/design-system/catalogo.html` |
| `packages/dominio`: dinheiro em decimal exato, taxas (R-07), cotação de 90 s e recotação (R-08) | Criado | 17 testes unitários passam |
| Integração contínua (`.github/workflows/verificar.yml`): tipos, testes, segredos | Criado | Só corre no GitHub depois do envio |
| Base de dados, migrações, autenticação, auditoria, API | **Não iniciado.** Bloqueado por D-27 e pelos pacotes antigos (C-02) | — |

## 3A. O que foi criado na Etapa 0
- Estrutura de pastas e fichas dos 15 módulos.
- Documentação `docs/00` a `docs/16` e `docs/adr/`.
- `README.md`, `AGENTS.md`, `SECURITY.md`, `CHANGELOG.md`, `.gitignore`, `config/env.example`.
- `scripts/verificar-documentacao.py`.
- `CLAUDE.md` e `docs/17-passagem-para-claude-code.md`.

## 4. O que **não** foi feito
- Código antigo (v2 e núcleo contabilístico) não importado: os pacotes ainda não foram entregues.
- Nada instalado no servidor `app.nzaidi.ao` nem em `nzaidi.ao`.
- Nenhuma base de dados criada (nem local nem no servidor).
- Nenhuma integração externa testada.

## 5. Funcionalidades por estado
- **Confirmadas:** ver `16-registo-de-decisoes.md`.
- **Propostas:** perfis por função, conciliação diária, posição de divisas, caixa de balcão, mensagens neutras, avisos, recuperação de PIN, simulador, venda de divisas, remessa pela aplicação, relatórios de gestão, apoio e reclamações, e toda a área dos parceiros.
- **Condicionadas:** Wise, meio de pagamento, MaxPay, Realtransfers, verificação de listas, área dos parceiros.
- **Pendentes:** `15-decisoes-pendentes.md`.
