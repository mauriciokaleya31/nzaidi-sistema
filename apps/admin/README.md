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

1. **Login Seguro (`#login`)**:
   - Autenticação por credenciais com controlo de tentativas e mensagens de erro normativas.
   - Pré-visualização dos perfis de demonstração para facilidade de testes em ambiente de homologação.

2. **Painel Geral de Controlo (`#dashboard`)**:
   - Resumo do operador autenticado e respetivos privilégios.
   - Cotações de USD e EUR em tempo real.
   - Estado de conexão à API e atalhos rápidos contextuais à função do utilizador.

3. **Gestão de Taxas de Câmbio (`#taxas`)**:
   - Consulta detalhada da tabela de taxas (taxa de referência BNA, margens de compra/venda, spread balcão).
   - Modal de edição de taxas exclusivo para o perfil `gestao`.
   - Validação estrita de motivo de alteração para envio à auditoria.

4. **Pista de Auditoria Regulatória (`#auditoria`)**:
   - Exclusivo para `compliance` e `gestao`.
   - Consulta cronológica dos últimos eventos do sistema (logins, alterações de taxas, tentativas de acesso).

5. **Balcão e Tesouraria (`#operacional` / `#tesouraria`)**:
   - Módulos operacionais integrados com aviso de transição para a Fase 4 (emissão de borderôs e fecho de caixa).

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
