# NZAIDI Mobile API — Guia de Arquitetura & Integração (Google AI Studio)

A **NZAIDI Mobile API** (`/api/v1/mobile`) foi concebida exclusivamente para alimentar a aplicação móvel **NZAIDI Mobile** (Android & iOS). Este documento serve como manual oficial de integração para desenvolvimento no **Google AI Studio**, clientes REST, geradores de código e SDKs.

---

## 1. Ambientes e URLs Base

| Ambiente | URL Base | Finalidade |
| :--- | :--- | :--- |
| **Homologação / Testes** | `https://homologacao.nzaidi.ao/api/v1/mobile` | Desenvolvimento ativo, testes e integração contínua. |
| **Produção** | `https://app.nzaidi.ao/api/v1/mobile` | Ambiente bancário em produção estrita (Luanda, Angola). |

---

## 2. Cabeçalhos Obrigatórios (HTTP Headers)

Todas as requisições enviadas pela aplicação móvel para a API devem incluir os seguintes cabeçalhos de contexto e rastreabilidade:

```http
Content-Type: application/json
Accept: application/json
X-Device-Id: <UUID_UNICO_DO_HARDWARE>
X-Platform: android | ios
X-App-Version: 1.0.0
X-Correlation-Id: <UUID_GERADO_POR_REQUISICAO>
```

### Detalhes dos Cabeçalhos:
- `X-Device-Id`: Identificador unívoco do dispositivo (ex.: gerado na primeira instalação e salvo no SecureStore/KeyChain).
- `X-Platform`: Plataforma móvel de execução (`android` ou `ios`).
- `X-App-Version`: Versão semântica da aplicação instalada (ex.: `1.0.0`). A API rejeita automaticamente acessos de versões inferiores à versão mínima estipulada no painel administrativo.
- `X-Correlation-Id`: Identificador único por chamada de rede para correlação de logs no Centro de Monitorização Administrativo.
- `Authorization`: `Bearer <ACCESS_TOKEN>` (obrigatório para todos os endpoints protegidos).
- `Idempotency-Key` (Opcional mas recomendado): UUID para evitar duplicações em transações financeiras (pedidos de câmbio e remessas).

---

## 3. Estrutura Padrão de Resposta

Todas as respostas da API seguem um envelope JSON uniforme:

### Resposta de Sucesso:
```json
{
  "sucesso": true,
  "mensagem": "Operação realizada com sucesso", // Opcional
  "dados": { ... } // Carga útil do endpoint
}
```

### Resposta de Erro:
```json
{
  "sucesso": false,
  "erro": "Descrição amigável do erro para o utilizador",
  "codigo": "CODIGO_DO_ERRO",
  "detalhes": [ ... ] // Opcional (ex.: erros de validação de campos)
}
```

---

## 4. Índice de Documentação

1. [Autenticação & Gestão de Sessões (`authentication.md`)](./authentication.md) — Rotação de Refresh Token, detecção de reúso malicioso, biometria e bloqueio de hardware.
2. [Catálogo de Endpoints (`endpoints.md`)](./endpoints.md) — Relação completa de todos os endpoints REST móveis com exemplos de requisição e resposta.
3. [Esquemas Zod & Contratos (`schemas.md`)](./schemas.md) — Definição dos tipos de dados, payloads e estruturas de dados.
4. [Tratamento de Erros & Códigos HTTP (`errors.md`)](./errors.md) — Tabela de status HTTP, envelope e códigos de erro de negócio.
5. [Guia de Integração React Native / Expo (`mobile-integration.md`)](./mobile-integration.md) — Exemplos prontos com `expo-secure-store`, interceptores Axios para rotação automática de tokens e autenticação biométrica com `expo-local-authentication`.
6. [Especificação OpenAPI 3.1 (`openapi.yaml`)](./openapi.yaml) — Contrato OpenAPI oficial para importação direta no Google AI Studio, Postman ou Insomnia.
