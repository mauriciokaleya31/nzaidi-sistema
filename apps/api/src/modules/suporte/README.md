# Módulo de Suporte e Atendimento ao Cliente (`suporte`)

Módulo responsável pela comunicação bidirecional e atendimento em tempo real entre os clientes do NZAIDI e os funcionários/operadores da equipa de atendimento no Backoffice Administrativo.

---

## 1. Responsabilidades

- **Atendimento ao Cliente**:
  - Abertura de conversas e pedidos de assistência categorizados (`cambio`, `remessas`, `cartoes`, `kyc`, `duvida_geral`, `reclamacao`).
  - Troca de mensagens entre cliente e equipa de suporte com persistência em base de dados SQLite (`suporte_atendimentos` e `suporte_mensagens`).
  - Suporte a envio de anexos (comprovativos e imagens de suporte).
  - Notificações automáticas ao cliente sobre novas respostas e alterações de estado.
- **Gestão Operacional no Backoffice**:
  - Fila unificada de atendimentos pendentes com ordenação por prioridade (`normal`, `urgente`, `critica`).
  - Atribuição direta de conversas ("Assumir Atendimento") e transferência auditada entre operadores.
  - Ciclo de vida completo dos tickets de suporte (`pendente`, `em_atendimento`, `resolvido`, `encerrado`).
  - Rastreabilidade e auditoria de todas as interações.

---

## 2. Endpoints Disponíveis

### Área do Cliente (`/api/v1/portal/suporte/...`)

| Método | Endpoint | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/portal/suporte/atendimentos` | Cliente | Listar atendimentos do próprio cliente |
| `POST` | `/api/v1/portal/suporte/atendimentos` | Cliente | Criar novo atendimento com mensagem inicial |
| `GET` | `/api/v1/portal/suporte/atendimentos/:id` | Cliente | Obter detalhes e mensagens do atendimento |
| `GET` | `/api/v1/portal/suporte/atendimentos/:id/mensagens` | Cliente | Listar mensagens de um atendimento |
| `POST` | `/api/v1/portal/suporte/atendimentos/:id/mensagens` | Cliente | Enviar nova mensagem pelo cliente |

### Área Administrativa (`/api/v1/admin/suporte/...`)

| Método | Endpoint | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/suporte/atendimentos` | Admin / Operador | Listar fila de atendimentos com filtros de estado e categoria |
| `GET` | `/api/v1/admin/suporte/atendimentos/:id` | Admin / Operador | Obter detalhes completos do atendimento |
| `POST` | `/api/v1/admin/suporte/atendimentos/:id/assumir` | Admin / Operador | Assumir a responsabilidade pelo atendimento |
| `POST` | `/api/v1/admin/suporte/atendimentos/:id/transferir` | Admin / Operador | Transferir atendimento para outro funcionário |
| `PATCH` | `/api/v1/admin/suporte/atendimentos/:id/estado` | Admin / Operador | Atualizar estado (ex: `resolvido`, `encerrado`) |
| `GET` | `/api/v1/admin/suporte/atendimentos/:id/mensagens` | Admin / Operador | Listar mensagens do atendimento |
| `POST` | `/api/v1/admin/suporte/atendimentos/:id/mensagens` | Admin / Operador | Enviar resposta oficial do suporte |
| `GET` | `/api/v1/admin/suporte/operadores` | Admin / Operador | Listar operadores disponíveis para transferência |
