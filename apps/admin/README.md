# @nzaidi/admin — Painel Administrativo e Operacional

Painel de administração, tesouraria, conformidade regulatória e balcão cambial da **NZAIDI — Casa de Câmbios & Transferência, Lda.**

Aplicação SPA (Single Page Application) desenvolvida em TypeScript estrito, Vite e HTML/CSS institucional, integrada diretamente à API Fastify (`@nzaidi/api`).

---

## 1. Arquitectura e Princípios de Segurança

1. **Autenticação HttpOnly e Sessões no Servidor**:
   - A interface nunca armazena palavras-passe nem tokens de autenticação em `localStorage` ou `sessionStorage`.
   - O browser comunica com a API enviando cookies `HttpOnly`, `SameSite=Lax` e `Secure`, prevenindo vulnerabilidades de XSS e roubo de credenciais.

2. **RBAC Duplo (Servidor & Interface)**:
   - Embora a interface oculte menus e formulários inacessíveis ao utilizador, **todas as autorizações são rigorosamente verificadas e validadas no backend Fastify** (`@nzaidi/api`).
   - Um utilizador não consegue editar taxas ou consultar auditoria adulterando o DOM ou enviando requisições manuais.

3. **Conformidade Regulatória e Não-Repúdio (BNA)**:
   - Todas as operações críticas (ex: actualização de taxas de câmbio) exigem **motivo formal obrigatório**.
   - As alterações são gravadas na tabela indelével de auditoria com carimbo temporal, ID de utilizador, função e IP.

---

## 2. Perfis Operacionais e Matriz de Permissões

| Perfil | Descrição | Permissões no Admin |
| :--- | :--- | :--- |
| `gestao` | Direção Geral e Chefia Operacional | Consultar/editar taxas cambiais, consultar pista de auditoria, gerir utilizadores |
| `compliance` | Responsável de Compliance & Prevenção de Branqueamento | Consultar taxas cambiais, consultar pista de auditoria completa |
| `tesouraria` | Responsável de Caixa e Liquidação | Consultar taxas cambiais, gestão de saldos e fecho de caixas (Fase 4) |
| `atendente` | Operador de Balcão e Atendimento ao Público | Consultar taxas cambiais, emissão de borderôs de câmbio (Fase 4) |

---

## 3. Módulos e Vistas Implementadas

A interface usa o Design System v2 (`packages/design-system`). Estrutura: barra lateral por áreas, cabeçalho com trilho e pesquisa de páginas (Ctrl/Cmd + K), barra lateral compacta no tablet, gaveta e barra inferior no telemóvel.

| Rota | Vista | Permissão |
| --- | --- | --- |
| `#login` | Início de sessão | — |
| `#dashboard` | Visão geral: cotações, caixa do operador, fila KYC, últimas operações | sessão |
| `#balcao` | Balcão: operação de compra/venda com cotação de 90 s e borderô | `operacoes:registar` |
| `#operacoes` | Diário de operações (só leitura) | `operacoes:consultar` |
| `#caixa` | Caixa: abertura, suprimento, sangria e fecho com conferência | `caixa:consultar` |
| `#clientes` | Clientes, decisão KYC e dossiê documental | `clientes:consultar` |
| `#auditoria` | Pista de auditoria | `ver_auditoria` |
| `#taxas` | Taxas de câmbio (edição só para `alterar_taxas`) | `ver_taxas` |
| `#usuarios` | Equipa e acessos | `gerir_usuarios` |

Código de interface partilhado em `src/ui/`: `formatar.ts` (valores, datas, escape de HTML), `componentes.ts` (estados, cabeçalhos, estados vazios), `navegacao.ts` (mapa único do menu), `dialogo.ts` (confirmação e comportamento dos modais).

---

## 4. Scripts e Comandos

```bash
# Executar em modo desenvolvimento com servidor Vite
npm --workspace=@nzaidi/admin run dev

# Compilar para produção (gera ficheiros estáticos em apps/admin/dist)
npm --workspace=@nzaidi/admin run build

# Executar testes unitários e de integração
npm --workspace=@nzaidi/admin run test
```
