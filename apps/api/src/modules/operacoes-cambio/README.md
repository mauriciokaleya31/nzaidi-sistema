# Módulo de Operações de Câmbio e Borderôs (`operacoes-cambio`)

Módulo central responsável pela execução de operações cambiais físicas de balcão (compra e venda de divisas USD e EUR contra Kwanzas AOA), garantia da validade de cotação (regra dos 90 segundos do BNA), liquidação atómica em caixa, controlo de idempotência e emissão formal de borderôs de câmbio invioláveis.

---

## 1. Princípios e Regras de Negócio

1. **Cálculo Rigoroso com o Pacote `@nzaidi/dominio`**:
   - Venda de Divisa: `kwanzasParaComprarDivisa(taxas, montanteDivisa)` com taxa de venda.
   - Compra de Divisa: `kwanzasAoVenderDivisa(taxas, montanteDivisa)` com taxa de compra.
   - Arredondamento bancário formal e precisão com `decimal.js`.

2. **Validação da Cotação (90 Segundos)**:
   - Toda a operação exige o envio de `cotacaoCriadaEm`.
   - Se o tempo decorrido até à submissão exceder 90 segundos (`estaValida`), a operação é recusada, exigindo nova cotação pelo operador.

3. **Verificação de Limites e KYC**:
   - Apenas clientes com `estadoKyc === "aprovado"` e cadastro ativo podem efetuar transações.

4. **Liquidação e Contrapartidas em Caixa**:
   - Toda a operação é vinculada ao caixa ativo do operador.
   - O sistema valida a disponibilidade prévia do saldo a entregar (Kwanza na compra; Divisa na venda).
   - A operação gera simultaneamente dois movimentos de caixa (um a crédito e um a débito).

5. **Idempotência**:
   - Submissões com a mesma `chaveIdempotencia` retornam o borderô e a operação já registados sem reprocessamento ou duplicação financeira.

6. **Inviolabilidade do Borderô**:
   - Cada borderô é emitido com um hash criptográfico SHA-256 combinando número, cliente, taxas, montantes e carimbo de tempo.

---

## 2. Endpoints Disponíveis

| Método | Endpoint | Permissão Mínima | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/operacoes` | `operacoes:registar` | Submeter e liquidar operação de balcão com emissão de borderô |
| `GET` | `/api/v1/operacoes` | `operacoes:consultar` | Listar histórico de operações cambiais |
| `GET` | `/api/v1/operacoes/:id` | `operacoes:consultar` | Consultar detalhes da operação e borderô |
| `POST` | `/api/v1/operacoes/:id/estornar` | `operacoes:estornar` | Estorno auditado de operação com reversão em caixa |
| `GET` | `/api/v1/borderos/:operacaoId` | `operacoes:consultar` | Obter dados completos do borderô para impressão |
