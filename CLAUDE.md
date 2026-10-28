# NZAIDI: Instruções para o Claude Code

@AGENTS.md

## Contexto e Estado Atual
- Projeto: Sistema digital da NZAIDI – Casa de Câmbios & Transferências licenciada pelo BNA em Luanda.
- **Ramo Oficial de Trabalho:** `feat/modo-manual-integracoes` (Todo o código funcional, auditado e publicado em homologação e produção reside neste ramo).
- **Estado Atual da Plataforma:** 
  - Todos os módulos de negócio estão 100% implementados e funcionais (Backoffice Administrativo, Portal do Cliente, Portal dos Parceiros, Caixa Físico, Balcão, Fila Operacional, Contabilidade de Dupla Entrada, Métodos de Pagamento manuais/AppyPay e Cartões Visa Virtuais com StroWallet).
  - Testes: 146/146 testes automatizados aprovados no Vitest em 18 suítes.
  - Verificação de tipos TypeScript (`tsc -b`): 0 erros.
- **Missão Atual para o Claude Code:** Refinamento estético, modernização visual (UI/UX) e harmonização de design dos 3 painéis (`apps/admin`, `apps/cliente` e `apps/parceiros`) segundo a identidade visual oficial da marca NZAIDI.
- **Regras Críticas:**
  - Preservar rigorosamente toda a lógica de negócio, chamadas à API, atributos de formulários, IDs e classes essenciais aos seletores de teste.
  - Proibição estrita de emojis: usar exclusivamente ícones SVG profissionais e vetoriais.
  - Manter acessibilidade (`@media (prefers-reduced-motion)`) e responsividade móvel em computadores, tablets e smartphones.
  - Validar sempre com `npm run verificar:tipos` e `npm run testes` antes de qualquer commit e push.
  - Língua de trabalho: Português (PT/AO).
