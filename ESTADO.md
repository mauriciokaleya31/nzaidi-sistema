# ESTADO DO SISTEMA NZAIDI

Atualizado em: **25/10/2026** (Conclusão da Prioridade 1: Reportes BNA, Remessas e Borderôs Atómicos)
Ramo de Trabalho: **`feat/melhorias-regulamentares-bna`**

---

## 1. O Que Já Existia (Base Consolidada)
* **Website Público & Simulador (`apps/site-publico`):** Website institucional responsivo publicado em `nzaidi.ao` com simulador cambial de 90 segundos sem números de vírgula flutuante (`decimal.js`).
* **Design System (`packages/design-system`):** Tokens de estilo, cores oficiais (Navy `#052D62`, Dourado `#CC9638`), tipografia e catálogo de componentes.
* **Núcleo de Domínio Financeiro (`packages/dominio`):** Dinheiro decimal exato, taxas de compra e venda com margem e cotações auditáveis.
* **API Central (`apps/api`):** Fastify 5, autenticação por cookies seguros HttpOnly, hash de senhas com `scrypt`, RBAC com 4 perfis (`gestao`, `compliance`, `tesouraria`, `atendente`), SQLite relacional em modo WAL com transações atómicas (`DatabaseSync`).
* **Módulos de Negócio Pré-existentes:** Clientes/KYC com upload de documentos e verificação de magic bytes SHA-256, Caixa/Tesouraria com abertura e fecho com conferência física, Operações Cambiais de balcão e Pista de Auditoria indelével.

---

## 2. O Que Foi Acrescentado (Prioridade 1: Regulatório e Integridade)
* **ADR 0005 & Decisão R-22:** Confirmação da stack TypeScript + Fastify + SQLite piloto; descarte de Laravel/PHP; documentação da migração obrigatória para servidor de base de dados dedicado antes de dados reais.
* **Numeração Sequencial Atómica de Borderôs (R-23):**
  * Tabela `contadores_sequenciais`.
  * Numeração (`BOR-AAAA-NNNNNN` e `OP-AAAA-NNNNNN`) atribuída na **mesma transação atómica** que grava o borderô.
  * Teste de rollback provando que falhas a meio não deixam buracos nem reutilizam números.
  * Borderôs anulados mantêm formalmente o seu número e o seu registo histórico (`estado = 'anulado'`).
* **Módulo Reportes BNA (`apps/api/src/modules/reportes-bna/`):**
  * Geração dos mapas diários de câmbio e remessas para as plataformas **Suptech** e **SSIF**.
  * **Reporte a Zero obrigatório:** geração automática em dias sem operações evitando sanções do regulador.
  * Lógica de fuso horário `Africa/Luanda` com rotina das 18:30 e recuperação automática de dias em atraso no arranque do servidor.
  * Alerta regulatório proativo caso às 18:35 o reporte do dia não tenha sido gerado.
  * Download direto de ficheiros CSV oficiais e registo de submissão nas plataformas do BNA.
  * Gerador com tabela de colunas configurável (`bna_config_colunas`).
* **Módulo Remessas Internacionais (`apps/api/src/modules/remessas/`):**
  * Pedido no balcão com validação obrigatória de cliente com KYC `aprovado`.
  * Chave de idempotência única impedindo duplicação de ordens ou cobranças.
  * Adaptadores simulados extensíveis para **MaxPay** e **Realtransfers**.
  * Retenção automática por critérios de risco.
  * Devolução e cancelamento por **lançamento contrário no caixa**, nunca por apagamento físico.
* **Painel Administrativo (`apps/admin`):**
  * Novas áreas no menu lateral: "Reportes BNA" e "Remessas".
  * Visão Geral atualizada com widget de supervisão diária do BNA e banner de alerta das 18:35.
* **Testes Automatizados:**
  * 8 novos testes específicos na suite `apps/api/test/prioridade1.test.ts`.
  * Total de testes no monorepo aumentado de 85 para **93 testes aprovados a 100%**.

---

## 3. O Que Está Por Fazer (Próximas Prioridades)

### Prioridade 2: Risco e Integridade (Avançar após aprovação)
* **2.1 Conformidade e Controlo de Risco (Compliance / AML):**
  * Adaptador simulado de sanções (recusa de conta) e PEP (revisão).
  * Regras por valor, soma diária e fracionamento em 24h (valores de teste: 5.000.000 Kz para revisão e 25.000.000 Kz para bloqueio).
  * Fila de casos de compliance no admin e estrutura do relatório à UIF.
* **2.2 Contabilidade e Tesouraria Rigorosas:**
  * Registo contabilístico de **dupla entrada** com tabela `lancamentos_contabeis` imutável com triggers SQLite contra `UPDATE` e `DELETE`.
  * Contas internas por moeda e por caixa com verificação de equilíbrio (débito = crédito).
  * Posição de divisas consolidada (USD, EUR, GBP, ZAR) na Visão Geral e na Tesouraria.
  * Conciliação bancária diária por importação manual de ficheiro.
* **2.3 Segurança Reforçada:**
  * Segundo fator (2FA / TOTP) obrigatório para administração.
  * Bloqueio temporário após 5 tentativas de login falhadas e sessão com 10 minutos de inatividade.
  * Cabeçalhos de segurança HTTP adicionais (`helmet`), rate-limiting refinado e proteção CSRF.
  * Cifra em repouso de documentos KYC com chave simétrica em variável de ambiente.
  * Cópia de segurança cifrada com RPO <= 1h e RTO <= 4h e procedimento de recuperação testado.
* **2.4 Auditoria Reforçada:**
  * Triggers SQLite proibindo alteração ou exclusão em `auditoria`.
  * Encadeamento de integridade SHA-256 entre os registos de auditoria.

### Prioridade 3: Ajustes ao Existente
* Alertas de caducidade de documentos de clientes.
* Interruptor de ativação no balcão para GBP e ZAR.
* Reforço de cadastro de pessoas coletivas (alvará, representantes, beneficiários efetivos).
* Estruturação de balcões e caixas por agência.

### Prioridade 4: Área Digital (Sob interruptores e adaptadores simulados)
* Portal do cliente, pagamentos em kwanzas (Multicaixa Express e referência) e conta Wise embedded com cartões.
