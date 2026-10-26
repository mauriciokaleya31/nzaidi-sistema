# Módulo Portal do Cliente (`portal-cliente`)

Módulo responsável pela interface digital com os clientes finais do NZAIDI, providenciando autenticação dedicada, submissão de documentos KYC com validação binária, acompanhamento do estado de verificação cadastral, consulta de taxas oficiais em tempo real, registo de pedidos de câmbio de divisas e solicitação de remessas internacionais.

---

## 1. Responsabilidades

- **Autenticação Segura de Clientes**:
  - Registo digital de clientes particulares e empresas.
  - Credenciais separadas de operadores de retalho (`clientes_credenciais` e `sessoes_clientes`).
  - Hashing com scrypt e cookies HttpOnly seguros (`nzaidi_cliente_sessao`).
- **Gestão Documental KYC**:
  - Submissão de identificação oficial com verificação estrita de magic bytes binários (PDF, PNG, JPEG).
  - Limite de 5 MB por documento com cálculo de hash SHA-256 de integridade criptográfica.
  - Acompanhamento do estado de validação (`pendente`, `valido`, `invalido`) e motivos de recusa.
- **Pedidos de Operação Cambial**:
  - Consulta de taxas de compra e venda em tempo real para USD e EUR com moeda base AOA.
  - Simulação instantânea de contravalor e limites.
  - Criação de pedido de câmbio prévio (`PED-CAM-`) sem movimentação prematura de caixa físico.
- **Pedidos de Remessas Internacionais**:
  - Formulário completo para envio para o estrangeiro com IBAN, banco e país de destino.
  - Cálculo de contravalor e comissão transparente de serviço NZAIDI.
  - Registo imutável de pedido de remessa (`PED-REM-`) para execução pela equipa autorizada.

---

## 2. Endpoints Disponíveis

| Método | Endpoint | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/portal/auth/registo` | Pública | Criar conta digital de cliente |
| `POST` | `/api/v1/portal/auth/login` | Pública | Iniciar sessão no portal do cliente |
| `POST` | `/api/v1/portal/auth/logout` | Cliente | Terminar sessão ativa |
| `GET` | `/api/v1/portal/perfil` | Cliente | Obter perfil cadastral e estatísticas da conta |
| `GET` | `/api/v1/portal/documentos` | Cliente | Listar documentos KYC submetidos |
| `POST` | `/api/v1/portal/documentos` | Cliente | Submeter ficheiro de documento KYC |
| `GET` | `/api/v1/portal/documentos/:docId/arquivo` | Cliente | Descarregar documento seguro |
| `GET` | `/api/v1/portal/pedidos/cambio` | Cliente | Listar pedidos de câmbio do cliente |
| `POST` | `/api/v1/portal/pedidos/cambio` | Cliente | Submeter novo pedido de câmbio |
| `GET` | `/api/v1/portal/pedidos/remessas` | Cliente | Listar pedidos de remessa internacional |
| `POST` | `/api/v1/portal/pedidos/remessas` | Cliente | Submeter novo pedido de remessa |
