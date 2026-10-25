# Módulo de Contabilidade e Tesouraria (`contabilidade-tesouraria`)

Módulo responsável pela gestão de caixas operacionais, fundos de abertura em multimoeda (AOA, USD, EUR), controlo estrito de saldos por partidas dobradas/movimentações imutáveis e fecho diário de caixas com apuramento de quebras e sobras.

---

## 1. Princípios de Segurança e Integridade

- **Saldo Calculado por Movimentos**: O saldo de caixa não é um valor estático livremente editável; é apurado em tempo real pela soma algébrica dos movimentos de abertura, câmbio (entradas/saídas), suprimentos e sangrias.
- **Unicidade de Caixa Operacional**: Cada operador só pode manter **um único caixa aberto** em simultâneo. Tentativas de abertura concorrente resultam em `CAIXA_JA_ABERTO`.
- **Fecho Obrigatório com Justificação**: No encerramento do caixa, o operador introduz a contagem física das notas. Se houver discrepância em relação ao saldo esperado do sistema, o fecho exige justificação formal obrigatória e transita para `pendente_aprovacao`.
- **Transações Atómicas com Rollback**: Todas as operações de abertura, fecho e liquidação cambial são executadas sob transações atómicas (`comTransacao`), impedindo inconsistências entre o saldo de caixa e a operação cambial.

---

## 2. Endpoints Disponíveis

| Método | Endpoint | Permissão Mínima | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/caixa/abrir` | `caixa:abrir` | Abertura de caixa com fundos iniciais por divisa |
| `GET` | `/api/v1/caixa/ativo` | `caixa:consultar` | Obter o caixa ativo do operador autenticado com saldos em tempo real |
| `GET` | `/api/v1/caixa/:id` | `caixa:consultar` | Obter detalhe de um caixa e seus saldos calculados |
| `POST` | `/api/v1/caixa/:id/movimento` | `caixa:movimentar` | Registar suprimento (entrada de cofre) ou sangria (recolha) |
| `POST` | `/api/v1/caixa/:id/fechar` | `caixa:fechar` | Fechar caixa com contagem física e apuramento de diferenças |
| `GET` | `/api/v1/caixa` | `caixa:consultar` | Histórico de caixas (abertos e fechados) |
| `GET` | `/api/v1/caixa/:id/movimentos` | `caixa:consultar` | Listar todos os movimentos de um caixa |
