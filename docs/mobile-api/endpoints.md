# NZAIDI Mobile API — Catálogo Oficial de Endpoints

Esta referência documenta todos os endpoints da API móvel sob o prefixo `/api/v1/mobile/`.

---

## 1. Módulo: Autenticação & Dispositivos (`/auth` e `/dispositivos`)

### `POST /api/v1/mobile/auth/login`
Autentica o cliente, valida versão mínima da app móvel, vincula o dispositivo de hardware e emite o par de tokens (`accessToken` e `refreshToken`).
- **Autenticação**: Não necessária.
- **Payload**:
  ```json
  {
    "email": "cliente@nzaidi.ao",
    "senha": "Password123!",
    "deviceId": "uuid-dispositivo",
    "plataforma": "android",
    "nomeDispositivo": "Samsung Galaxy S24",
    "versaoSo": "14.0",
    "versaoApp": "1.0.0",
    "tokenPush": "opcional_push_token"
  }
  ```
- **Resposta (200)**: Retorna `accessToken` (15 min), `refreshToken` (30 dias) e resumo do cliente.

### `POST /api/v1/mobile/auth/refresh`
Renova a sessão através de um `refreshToken` rotativo. O token anterior é revogado e um novo par é devolvido.
- **Autenticação**: Não necessária.
- **Payload**:
  ```json
  {
    "refreshToken": "string-hex-refresh-token",
    "deviceId": "uuid-dispositivo"
  }
  ```
- **Resposta (200)**: Retorna novo `accessToken` e novo `refreshToken`.

### `POST /api/v1/mobile/auth/recuperar-senha`
Inicia o processo de recuperação de acesso, gerando um código OTP temporário de 6 dígitos enviado por SMS/E-mail.
- **Autenticação**: Não necessária.
- **Payload**: `{ "email": "cliente@nzaidi.ao" }`
- **Resposta (200)**: `{ "sucesso": true, "mensagem": "Instruções e código de verificação enviados." }`

### `POST /api/v1/mobile/auth/redefinir-senha`
Conclui a redefinição de senha com validação do OTP e atualização do hash criptográfico.
- **Autenticação**: Não necessária.
- **Payload**:
  ```json
  {
    "email": "cliente@nzaidi.ao",
    "codigoOtp": "123456",
    "novaSenha": "NovaPasswordSegura2026!"
  }
  ```
- **Resposta (200)**: `{ "sucesso": true, "mensagem": "Palavra-passe redefinida com sucesso." }`

### `POST /api/v1/mobile/auth/logout`
Encerra a sessão do dispositivo atual e invalida o `refreshToken` ativo.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Payload**: `{}`
- **Resposta (200)**: `{ "sucesso": true, "mensagem": "Sessão móvel terminada com sucesso." }`

### `POST /api/v1/mobile/auth/logout-global`
Revoga imediatamente todas as sessões ativas do cliente em todos os dispositivos móveis.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Payload**: `{}`
- **Resposta (200)**: `{ "sucesso": true, "mensagem": "Todas as sessões móveis foram revogadas." }`

### `GET /api/v1/mobile/dispositivos`
Lista todos os dispositivos onde o cliente possui ou possuiu sessão registada.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Resposta (200)**: Array de dispositivos com nome, plataforma, versão e status (`ativo`, `bloqueado`, `revogado`).

### `DELETE /api/v1/mobile/dispositivos/:id`
Permite ao cliente desvincular um dispositivo específico.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Resposta (200)**: `{ "sucesso": true, "mensagem": "Dispositivo desvinculado com sucesso." }`

---

## 2. Módulo: Perfil & KYC do Cliente (`/cliente`)

### `GET /api/v1/mobile/cliente/perfil`
Obtém o cadastro completo do cliente autenticado (dados pessoais, contactos, endereço e nível KYC).
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Resposta (200)**: Objecto com dados do cliente e estatísticas da conta.

### `PUT /api/v1/mobile/cliente/perfil`
Permite atualizar dados de contacto permitidos (telefone, endereço, profissão e entidade empregadora).
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Payload**:
  ```json
  {
    "telefone": "+244923000111",
    "morada": "Nova Morada, Luanda",
    "profissao": "Engenheiro de Software",
    "entidadeEmpregadora": "Empresa X"
  }
  ```
- **Resposta (200)**: Perfil atualizado.

### `GET /api/v1/mobile/cliente/kyc/status`
Retorna o estado detalhado de verificação KYC, limites regulamentares BNA diários e contadores de documentos (aprovados vs pendentes).
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Resposta (200)**:
  ```json
  {
    "sucesso": true,
    "dados": {
      "kycStatus": "aprovado",
      "nivelKyc": 2,
      "limiteDiarioKz": "5000000",
      "documentosEnviados": 3,
      "documentosAprovados": 3,
      "documentosPendentes": 0
    }
  }
  ```

### `GET /api/v1/mobile/cliente/documentos`
Lista todos os documentos de identificação submetidos pelo cliente com estado de validação.
- **Autenticação**: Requer `Bearer <accessToken>`.

### `POST /api/v1/mobile/cliente/documentos`
Submete um novo documento KYC para análise da equipa de conformidade.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Payload**:
  ```json
  {
    "tipo": "bi",
    "numero": "BI-VALIDO-EXEMPLO",
    "dataEmissao": "2020-01-15",
    "dataValidade": "2030-01-15",
    "ficheiroBase64": "data:image/jpeg;base64,...",
    "nomeFicheiro": "bi_frente.jpg"
  }
  ```

---

## 3. Módulo: Dashboard & Cotações (`/dashboard`, `/taxas`)

### `GET /api/v1/mobile/dashboard`
Agrega todas as informações da tela inicial da aplicação móvel em uma única requisição de alta performance: dados do cliente, limites diários, taxas de câmbio oficiais atualizadas e totalizadores de operações.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Resposta (200)**:
  ```json
  {
    "sucesso": true,
    "dados": {
      "cliente": { "nome": "...", "kycStatus": "aprovado", "limiteDiarioKz": "5000000" },
      "taxas": [
        { "moeda": "USD", "nome": "Dólar americano", "taxaCompra": "925.50", "taxaVenda": "945.00" },
        { "moeda": "EUR", "nome": "Euro", "taxaCompra": "995.00", "taxaVenda": "1020.00" }
      ],
      "operacoes": { "cambioTotal": 12, "cambioPendentes": 1, "remessasTotal": 5, "remessasPendentes": 0 }
    }
  }
  ```

### `GET /api/v1/mobile/taxas`
Consulta pública das taxas cambiais oficiais praticadas pela NZAIDI (não requer login).
- **Autenticação**: Não necessária.

---

## 4. Módulo: Operações de Câmbio (`/cambio`)

### `GET /api/v1/mobile/cambio/moedas`
Lista as moedas disponíveis para transação no balcão e online (`USD`, `EUR`).
- **Autenticação**: Não necessária.

### `POST /api/v1/mobile/cambio/simular`
Simula conversão entre Kwanza (AOA) e moedas estrangeiras em tempo real com garantia de cotação por 90 segundos.
- **Autenticação**: Não necessária.
- **Payload**:
  ```json
  {
    "tipoOperacao": "compra",
    "moeda": "USD",
    "montante": "500.00"
  }
  ```
- **Resposta (200)**:
  ```json
  {
    "sucesso": true,
    "dados": {
      "tipoOperacao": "compra",
      "moeda": "USD",
      "montanteSolicitado": "500.00",
      "taxaAplicada": "945.00",
      "montanteEstimado": "472500.00",
      "moedaContravalor": "AOA",
      "validadeSegundos": 90
    }
  }
  ```

### `POST /api/v1/mobile/cambio/pedidos`
Cria um pedido formal de operação cambial.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Payload**:
  ```json
  {
    "tipoOperacao": "compra",
    "moeda": "USD",
    "montanteDivisa": "500.00",
    "metodoPagamento": "MULTICAIXA_EXPRESS",
    "finalidade": "Despesas médicas no estrangeiro"
  }
  ```
- **Resposta (201)**: Retorna o pedido criado com número de referência oficial e dados de liquidação.

### `GET /api/v1/mobile/cambio/pedidos`
Lista o histórico e estado de todos os pedidos de câmbio do cliente.
- **Autenticação**: Requer `Bearer <accessToken>`.

---

## 5. Módulo: Remessas Internacionais (`/remessas`)

### `POST /api/v1/mobile/remessas/pedidos`
Submete uma solicitação de transferência / remessa de fundos para o exterior.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Payload**:
  ```json
  {
    "beneficiarioNome": "Carlos Silva",
    "beneficiarioPais": "Portugal",
    "beneficiarioIban": "PT50000000000000000000000",
    "beneficiarioBanco": "Millennium BCP",
    "beneficiarioSwift": "BCPTPTPL",
    "moedaDestino": "EUR",
    "montanteDivisa": "300.00",
    "finalidade": "Apoio familiar"
  }
  ```
- **Resposta (201)**: Retorna a remessa registada para processamento.

### `GET /api/v1/mobile/remessas/pedidos`
Lista o histórico de remessas internacionais do cliente autenticado.
- **Autenticação**: Requer `Bearer <accessToken>`.

---

## 6. Módulo: Cartões Internacionais (`/cartoes`)

### `GET /api/v1/mobile/cartoes`
Retorna informações dos cartões virtuais ou físicos associados ao cliente (integração Strowallet) ou o status da lista de espera.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Resposta (200)**:
  ```json
  {
    "sucesso": true,
    "dados": {
      "moduloAtivo": true,
      "cartoes": [],
      "listaEspera": {
        "inscrito": true,
        "posicao": 42,
        "mensagem": "Brevemente disponível no NZAIDI Mobile."
      }
    }
  }
  ```

### `POST /api/v1/mobile/cartoes/solicitar`
Permite ao cliente entrar na lista de espera prioritária para emissão de cartão Visa pré-pago em dólares.
- **Autenticação**: Requer `Bearer <accessToken>`.
- **Payload**:
  ```json
  {
    "tipoCartao": "VIRTUAL_USD",
    "motivo": "Compras online e viagens"
  }
  ```
