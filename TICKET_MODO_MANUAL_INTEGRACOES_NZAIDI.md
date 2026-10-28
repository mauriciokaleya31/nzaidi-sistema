# Ticket Técnico: NZAIDI-MANUAL-01 — Modo Manual e Portas de Integração

## 1. Âmbito e Contexto de Negócio

A NZAIDI – Casa de Câmbios & Transferência, Lda. opera serviços de câmbio de balcão e intermediação financeira sob supervisão do Banco Nacional de Angola (BNA).
Conforme documentado em `docs/11-integracoes.md`, os contratos definitivos com parceiros internacionais (Wise, MaxPay, Realtransfers) e provedores de pagamentos em kwanzas (EMIS / Multicaixa Express / agregadores bancários) encontram-se em fase de negociação jurídica ou formalização de credenciais de produção.

Para viabilizar a operação da instituição sem paragens e manter a rastreabilidade total exigida pelo BNA, o sistema necessita de um **Modo Manual de Execução e Conciliação de Integrações**.
Este modo permite que operadores autorizados (Tesouraria e Gestão) registem a liquidação de operações financeiras, anexem comprovativos, forneçam códigos de autorização bancária ou do parceiro e façam a conciliação contabilística, prevenindo qualquer duplicação de saldo ou perda de auditoria.

---

## 2. Decisões Técnicas e Arquitetura

1. **Stack Tecnológica Preservada**:
   - Backend: Node.js (>= 22) com TypeScript estrito, Fastify e SQLite com modo WAL (`node:sqlite`).
   - Frontend: SPA modular em TypeScript com Vite e componentes nativos do design system bancário oficial.
   - Domínio: Cálculo decimal exato via `@nzaidi/dominio`.
2. **Localização Modular**:
   - Criação da infraestrutura em `apps/api/src/modules/integracoes-manuais/`.
   - Extensão das interfaces nos módulos consumidores (`remessas`, `pagamentos-aoa`, `contabilidade-tesouraria`).
3. **Persistência Relacional**:
   - Tabela dedicada `execucoes_integracao_manual` para registrar todas as liquidações manuais de forma atómica e imutável.
   - Nenhuma tabela legada é apagada ou reescrita.
4. **Idempotência Financeira**:
   - Cada liquidação manual exige uma chave de idempotência (`chave_idempotencia`) e vincula-se a uma transação de negócio (`transacao_id`).
   - Restrição estrita de unicidade `UNIQUE(transacao_id, canal)` para que uma operação concluída nunca seja processada mais de uma vez.

---

## 3. Modelo de Dados e Estados

### 3.1 Tabela `execucoes_integracao_manual`
```sql
CREATE TABLE IF NOT EXISTS execucoes_integracao_manual (
  id TEXT PRIMARY KEY,
  transacao_id TEXT NOT NULL,
  tipo_integracao TEXT NOT NULL CHECK(tipo_integracao IN ('remessa_parceiro', 'recebimento_kwanza', 'liquidacao_wise', 'ajuste_conciliacao')),
  canal_origem TEXT NOT NULL, -- Ex: 'maxpay', 'realtransfers', 'multicaixa_express', 'banco_bai', 'banco_bfa', 'banco_bma'
  referencia_externa TEXT NOT NULL, -- Código de operação bancária ou ID do parceiro
  valor_moeda TEXT NOT NULL,
  moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR', 'GBP', 'ZAR')),
  estado TEXT NOT NULL CHECK(estado IN ('pendente', 'concluida', 'rejeitada', 'cancelada')) DEFAULT 'pendente',
  operador_id TEXT NOT NULL,
  operador_nome TEXT NOT NULL,
  operador_funcao TEXT NOT NULL,
  aprovador_id TEXT,
  aprovador_nome TEXT,
  momento_execucao TEXT NOT NULL,
  momento_aprovacao TEXT,
  comprovativo_arquivo TEXT,
  comprovativo_hash_sha256 TEXT,
  notas TEXT,
  chave_idempotencia TEXT NOT NULL UNIQUE,
  FOREIGN KEY (operador_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_execucoes_transacao ON execucoes_integracao_manual(transacao_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_ref_canal ON execucoes_integracao_manual(canal_origem, referencia_externa);
CREATE INDEX IF NOT EXISTS idx_execucoes_estado ON execucoes_integracao_manual(estado);
```

### 3.2 Regra de Unicidade de Referências Externas
- A referência externa **NÃO** é assumida como globalmente única isolada, pois diferentes bancos angolanos (BAI, BFA, BMA) ou parceiros internacionais podem emitir códigos numéricos coincidentes.
- A unicidade é garantida pela combinação: `UNIQUE(canal_origem, referencia_externa)`.
- Isso impede que a mesma transferência bancária ou mesmo comprovativo do MaxPay seja aproveitado para liquidar duas operações distintas dentro do mesmo canal.

---

## 4. Contabilidade, Caixa e Tesouraria

> [!IMPORTANT]
> **Princípio Contabilístico da Não-Contaminação do Caixa Físico**:
> - Operações que representam **liquidação bancária** (ex.: entrada de kwanza por transferência bancária ou compensação externa do MaxPay) **NÃO** geram lançamentos de notas no caixa físico do balcão (`caixas`).
> - O caixa físico destina-se exclusivamente a numerário em notas movimentado no guichê de atendimento.
> - As liquidações bancárias manuais afetam a conta de compensação/bancária correspondente e a conta transitória da operação de câmbio/remessa.
> - Se houver pagamento em numerário no balcão que já tenha sido lançado pelo atendente no momento do registo da remessa, a confirmação manual do parceiro apenas move o estado da remessa de `pendente` para `enviada`/`concluida`, sem tocar no saldo do caixa físico.

---

## 5. Permissões, Separação de Funções e Segurança

### 5.1 Matriz de Permissões
- Permissão adicionada: `integracoes:executar_manual` e `integracoes:aprovar_manual`.
- **Atendente**: Sem permissão de liquidação manual. Pode apenas visualizar o estado (`V`).
- **Compliance**: Visualiza todas as execuções manuais (`V`) e alertas de risco associados.
- **Tesouraria**: Pode executar a liquidação manual (`C`) e conciliar.
- **Gestão**: Acesso total (`C`, `D`, `A`).

### 5.2 Regra de Separação de Funções (Segregação de Alçadas)
- Para operações com valor superior ao limiar de revisão AML de teste (`5.000.000,00 AOA`), exige-se o princípio dos quatro olhos:
  - O utilizador que submete a liquidação manual (`operador_id`) não pode ser o mesmo utilizador que a aprova (`aprovador_id`).
- Abaixo desse valor, a Tesouraria ou Gestão pode executar diretamente em passo único.

---

## 6. Armazenamento e Validação de Comprovativos

1. **Localização**: Ficheiros guardados na pasta privada `storage/comprovativos_manuais/` (fora do diretório público `public_html`).
2. **Restrições de Ficheiro**:
   - Formatos permitidos: `application/pdf`, `image/png`, `image/jpeg`.
   - Tamanho máximo: 5 MB por ficheiro.
3. **Anonimização e Hash**:
   - O ficheiro é renomeado para `<uuid>.<ext>` com cálculo obrigatório do hash SHA-256 no momento da gravação.
   - O download do ficheiro requer autenticação com sessão ativa e verificação de permissão (`contabilidade_tesouraria` ou `gestao`).

---

## 7. Pista de Auditoria

Cada evento gera registo imutável na tabela `auditoria`:
- `acao`: `INTEGRACAO_MANUAL_REGISTADA` | `INTEGRACAO_MANUAL_APROVADA` | `INTEGRACAO_MANUAL_REJEITADA`.
- `recurso`: `execucoes_integracao_manual`.
- `recurso_id`: identificador da execução.
- `detalhes_json`: tipo de integração, canal, referência externa, valor, moeda, e indicação do operador.
- Nenhum dado bancário confidencial (palavra-passe, PIN) é registrado.

---

## 8. Testes Obrigatórios

1. **Liquidação Manual Válida**: Registo bem-sucedido com referência bancária e anexo de comprovativo.
2. **Acesso Negado**: Atendente ou utilizador não autenticado tenta liquidar e recebe `HTTP 403 Forbidden`.
3. **Idempotência**: Segundo pedido com a mesma chave ou mesma transação retorna erro sem duplicar lançamentos.
4. **Reutilização de Referência Externa**: Tentativa de liquidar outra transação com o mesmo canal e mesma referência bancária é rejeitada (`HTTP 409 Conflict`).
5. **Rollback em Falha**: Erro intencional a meio da transação reverte todas as tabelas (integridade total).
6. **Proteção de Comprovativos**: Acesso não autorizado ao ficheiro de comprovativo é bloqueado.
7. **Consistência de Tesouraria**: Nenhum movimento indevido de caixa físico gerado por confirmações bancárias.
8. **Segregação de Funções**: Tentativa de o próprio operador aprovar uma operação acima do limiar sem segundo aprovador é bloqueada.
9. **Não-Regressão**: Os 101 testes existentes continuam a passar com 100% de sucesso.

---

## 9. Riscos e Decisões Pendentes Registadas

- **D-31 (Pendente)**: Plano de contas contabilístico detalhado para conciliação das contas bancárias (BAI, BFA, BIR). Na ausência de plano analítico aprovado, o sistema usa a conta transitória interna de compensação de parceiros sem inventar contas desconhecidas.
- **D-32 (Pendente)**: Definição formal do limiar de valor para exigência obrigatória de aprovação por dois operadores em liquidações bancárias manuais. Mantém-se o valor paramétrico de teste de `5.000.000,00 AOA`.
