# NZAIDI — Casa de Câmbios & Transferência, Lda.

Sistema digital e operacional da **NZAIDI — Casa de Câmbios & Transferência, Lda.**, instituição financeira não bancária licenciada e supervisionada pelo **Banco Nacional de Angola (BNA)**.

O sistema integra operações presenciais de balcão de câmbio de divisas, remessas internacionais (MaxPay e Realtransfers), diligência regulamentar de clientes (KYC/AML), borderôs sequenciais auditáveis, controlo de caixa/tesouraria, relatórios diários oficiais ao BNA (Suptech e SSIF) e website institucional público.

---

## 1. Requisitos de Execução

* **Node.js:** `>= 22.0.0` (suporte ao `node:sqlite` nativo em modo WAL).
* **Gestor de Pacotes:** `npm >= 10.0.0`.
* **Python:** `3.10+` (para scripts utilitários de backup e validação documental).

---

## 2. Instalação e Arranque Rápido

1. **Instalar dependências de todos os workspaces:**
   ```bash
   npm install
   ```

2. **Validação Global Obrigatória (Tipos, Testes e Segurança):**
   ```bash
   npm run verificar
   ```
   *Verifica os tipos estritos em TypeScript (`tsc -b`), corre os 93 testes automatizados com o Vitest e valida a ausência de segredos ou chaves sensíveis.*

3. **Execução em Desenvolvimento:**
   * **API Fastify (Porta 3000):**
     ```bash
     npm --workspace=@nzaidi/api run dev
     ```
   * **Painel Administrativo SPA (Porta 5174):**
     ```bash
     npm --workspace=@nzaidi/admin run dev
     ```
   * **Website Institucional & Simulador (Porta 5173):**
     ```bash
     npm --workspace=@nzaidi/site-publico run dev
     ```

4. **Compilação de Produção:**
   ```bash
   npm run build:api
   npm run build:admin
   npm run build:site
   ```

---

## 3. Estrutura do Monorepo

```text
nzaidi-sistema/
├── apps/
│   ├── admin/          # Backoffice Administrativo (Balcão, KYC, Caixa, BNA, Remessas, Auditoria)
│   ├── api/            # API Fastify 5 com SQLite, RBAC, Zod e adaptadores simulados
│   └── site-publico/   # Website institucional em nzaidi.ao com simulador de 90s
├── packages/
│   ├── design-system/  # Tokens, cores corporativas da NZAIDI e catálogo HTML
│   └── dominio/        # Dinheiro exato (decimal.js), taxas BNA, cotações e spreads
├── docs/               # Documentação técnica e regulatória oficial
│   ├── adr/            # Registos de Decisão Arquitetural (ADR 0001 a 0005)
│   ├── 14-estado-atual.md
│   ├── 15-decisoes-pendentes.md
│   └── 16-registo-de-decisoes.md
└── scripts/            # Scripts de automação (backup atómico SHA-256 e auditoria)
```

---

## 4. Arquitetura e Decisões Técnicas

* **Decisão R-22 / ADR 0005:** Stack confirmada em TypeScript + Fastify + SQLite piloto (modo WAL com transações atómicas). Qualquer migração para PHP/Laravel foi descartada pelo dono do projeto.
* **Borderôs Sequenciais (R-23):** Numeração atómica sem falhas atribuída na mesma transação que grava a operação. Um borderô anulado mantém o seu número histórico para sempre.
* **Reportes Diários BNA (R-24):** Rotina diária de corte às 18:30 (Africa/Luanda), reporte a zero obrigatório quando não há movimento e alerta automático na Visão Geral após as 18:35 se o reporte do dia não tiver sido gerado.
* **Remessas Internacionais (R-10):** Adaptadores simulados extensíveis para MaxPay e Realtransfers com chave de idempotência e cancelamento via lançamento contrário de caixa.
