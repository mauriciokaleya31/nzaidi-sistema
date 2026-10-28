# Módulo de Cartões Visa Virtuais com StroWallet

Este módulo implementa a unidade de negócio **NZAIDI Cartões**, permitindo a emissão e gestão de cartões virtuais Visa em USD com a API da StroWallet.

## Responsabilidade e Arquitetura

O módulo é composto pelos seguintes componentes principais:
- **`strowallet.connector.ts`**: Cliente HTTP de integração com a API da StroWallet (endpoints `/create-nfc-card`, `/fetch-nfccard-detail`, `/fund-withdraw-nfccard`, `/nfc-cards/status`, `/nfc-card-transactions` e `/api/wallet/balance/USD`).
- **`cartoes.types.ts`**: Definição de tipos TypeScript, DTOs e contratos de dados.
- **`cartoes.repository.ts`**: Camada de persistência das tabelas `cartoes_config`, `cartoes_parametros_comerciais`, `cartoes_clientes_adesao`, `cartoes_virtuais`, `cartoes_transacoes` e `cartoes_webhooks_auditoria`.
- **`cartoes.service.ts`**: Regras de negócio, cálculo segregado de taxas, margem cambial USD/AOA, limites operacionais, fluxo de KYC/adesão, revelação temporária de dados confidenciais (com janela de 30 segundos e auditoria) e webhooks com idempotência.
- **`cartoes.routes.ts`**: Endpoints do portal do cliente, rotas administrativas com RBAC e endpoint do webhook.

## Segurança e PCI-DSS

1. **Nunca armazenar PAN completo ou CVV**: A base de dados persiste unicamente os últimos 4 dígitos (`ultimos_4_digitos`), o identificador do fornecedor (`strowallet_card_id`), o titular e a validade.
2. **Revelação temporária**: A revelação de CVV ou PAN mascarado ocorre sob demanda, com auditoria de segurança imediata (`REVELACAO_TEMPORARIA_DADOS_CARTAO`) e expiração em 30 segundos.
3. **Controle de ativação e manutenção**: O serviço possui estados progressivos (`em_preparacao`, `em_testes`, `pronto_ativacao`, `ativo`, `suspenso`) e chave de manutenção independente.

## Endpoints Principais

### Portal do Cliente
- `GET /api/v1/cartoes/portal/status`: Estado do serviço e elegibilidade do cliente.
- `POST /api/v1/cartoes/portal/calcular-emissao`: Simulação com segregação de taxas.
- `POST /api/v1/cartoes/portal/calcular-carregamento`: Simulação de recarga em AOA.
- `POST /api/v1/cartoes/portal/aderir`: Solicitação de adesão ao serviço.
- `GET /api/v1/cartoes/portal/meus-cartoes`: Listagem dos cartões do titular.
- `POST /api/v1/cartoes/portal/solicitar`: Emissão de novo cartão Visa USD.
- `POST /api/v1/cartoes/portal/carregar`: Carregamento do cartão com validação de limites.
- `POST /api/v1/cartoes/portal/alterar-estado`: Congelar ou descongelar cartão.
- `GET /api/v1/cartoes/portal/:id/transacoes`: Histórico de movimentações.
- `POST /api/v1/cartoes/portal/:id/revelar-dados`: Revelação temporária de dados de segurança.

### Backoffice
- `GET /api/v1/cartoes/admin/dashboard`: Métricas executivas e saldo da conta mestre.
- `GET /api/v1/cartoes/admin/config` e `PUT /api/v1/cartoes/admin/config`: Configuração do fornecedor e serviço.
- `GET /api/v1/cartoes/admin/comercial` e `PUT /api/v1/cartoes/admin/comercial`: Parâmetros comerciais e taxas.
- `POST /api/v1/cartoes/admin/testar-conexao`: Diagnóstico de conectividade StroWallet.
- `GET /api/v1/cartoes/admin/cartoes`: Gestão e listagem de cartões.
- `POST /api/v1/cartoes/admin/cartoes/:id/alterar-status`: Ação de bloqueio/desbloqueio administrativo.
- `POST /api/v1/cartoes/admin/cartoes/:id/sincronizar`: Sincronização forçada com o fornecedor.
- `GET /api/v1/cartoes/admin/transacoes`: Consulta de transações consolidadas.
- `GET /api/v1/cartoes/admin/adesao` e `POST /api/v1/cartoes/admin/adesao/:clienteId/avaliar`: Análise de conformidade de adesões.

### Webhook
- `POST /api/v1/cartoes/webhook/strowallet`: Recepção de notificações com idempotência.
