# NZAIDI Mobile API — Tratamento de Erros & Códigos HTTP

A API móvel da NZAIDI adota um formato uniforme e previsível de respostas de erro, garantindo que o cliente mobile consiga tanto apresentar mensagens claras ao utilizador quanto tomar decisões programáticas de segurança.

---

## 1. Envelope Uniforme de Erro

```json
{
  "sucesso": false,
  "erro": "Mensagem descritiva em português de Angola adequada para o utilizador.",
  "codigo": "CODIGO_DO_ERRO",
  "detalhes": []
}
```

---

## 2. Tabela de Códigos de Status HTTP

| Status HTTP | Nome | Quando Ocorre | Ação Esperada no Mobile |
| :--- | :--- | :--- | :--- |
| **400 Bad Request** | Requisição Inválida | JSON malformado ou campos obrigatórios ausentes | Exibir mensagem de validação no formulário |
| **401 Unauthorized** | Não Autorizado | Access token expirado, inválido ou sessão revogada | Chamar `/auth/refresh` ou redirecionar para tela de login |
| **403 Forbidden** | Acesso Proibido | Conta bloqueada pelo compliance ou dispositivo restrito | Bloquear ações sensíveis e exibir modal de suporte |
| **404 Not Found** | Não Encontrado | Rota ou recurso (pedido, cliente) inexistente | Informar recurso não localizado |
| **409 Conflict** | Conflito de Estado | E-mail já cadastrado, violação de unicidade | Alertar duplicidade de dados |
| **422 Unprocessable** | Erro de Negócio | Montante acima do limite diário BNA, fundos insuficientes | Orientar adequação dos valores solicitados |
| **429 Too Many Req** | Taxa Excedida | Mais requisições do que o limite por minuto configurado | Aplicar backoff exponencial e alertar utilizador |
| **500 Server Error** | Erro Interno | Falha inesperada de infraestrutura | Apresentar mensagem amigável de indisponibilidade |
| **503 Unavailable** | Em Manutenção | Flag `acesso_movel_ativo = false` no painel de controlo | Exibir tela institucional de manutenção programada |

---

## 3. Códigos de Erro Padronizados (`codigo`)

- `AUTH_CREDENCIAIS_INVALIDAS`: E-mail ou palavra-passe incorretos.
- `AUTH_TOKEN_EXPIRADO`: O token de acesso expirou (requer refresh).
- `AUTH_TOKEN_INVALIDO`: Assinatura JWT corrompida.
- `AUTH_REUSO_REFRESH_TOKEN`: Detecção de fraude ou clonagem de token. Todas as sessões do telemóvel são revogadas.
- `DISPOSITIVO_BLOQUEADO`: O dispositivo de hardware foi bloqueado por um operador no painel administrativo.
- `APP_VERSAO_OBSOLETA`: A versão do aplicativo instalado é menor que a versão mínima permitida. A app deve forçar atualização pela App Store / Google Play.
- `MANUTENCAO_SISTEMA`: O acesso móvel foi temporariamente desativado via backoffice.
- `LIMITE_BNA_EXCEDIDO`: A operação excede o montante máximo legal estabelecido para o nível de KYC do cliente.
