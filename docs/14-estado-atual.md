# 14. Estado atual do projeto

Atualizado em **25/10/2026** (Etapa 0). Este ficheiro deve ser atualizado em cada alteração.

## 1. Diagnóstico do repositório oficial
| Verificação | Resultado |
| --- | --- |
| Endereço | `github.com/mauriciokaleya31/nzaidi-sistema` (o indicado) |
| Conteúdo | **Vazio**: sem commits, sem ficheiros, sem ramos além de `main` |
| Visibilidade | **PÚBLICO**. Foi clonado sem credenciais |
| Alterações existentes a preservar | Nenhuma |
| Publicação | **Nada foi publicado.** O trabalho desta etapa está num clone local |

**Risco:** um repositório público de um serviço financeiro expõe estratégia, estrutura e regras de risco. **Recomendação: torná-lo privado antes de qualquer publicação.** A titularidade do repositório (conta `mauriciokaleya31`) deve ser confirmada pelo dono do projeto: quem tem acesso de escrita?

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

## 3. O que foi criado nesta etapa (no clone local)
- Estrutura de pastas e fichas dos 15 módulos.
- Documentação `docs/00` a `docs/16` e `docs/adr/`.
- `README.md`, `AGENTS.md`, `SECURITY.md`, `CHANGELOG.md`, `.gitignore`, `config/env.example`.
- `scripts/verificar-documentacao.py`.

## 4. O que **não** foi feito
- Nenhum código funcional criado ou importado.
- Nada publicado no GitHub.
- Nenhuma integração externa testada.

## 5. Funcionalidades por estado
- **Confirmadas:** ver `16-registo-de-decisoes.md`.
- **Propostas:** perfis por função, conciliação diária, posição de divisas, caixa de balcão, mensagens neutras, avisos, recuperação de PIN, simulador, venda de divisas, remessa pela aplicação, relatórios de gestão, apoio e reclamações, e toda a área dos parceiros.
- **Condicionadas:** Wise, meio de pagamento, MaxPay, Realtransfers, verificação de listas, área dos parceiros.
- **Pendentes:** `15-decisoes-pendentes.md`.
