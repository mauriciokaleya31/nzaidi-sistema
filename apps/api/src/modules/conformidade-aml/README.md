# Módulo: Conformidade e risco (AML)

**Pasta:** `apps/api/src/modules/conformidade-aml`
**Estado:** Confirmado. CONDICIONADO: fornecedor de verificação de listas e valores dos limites por aprovar.

## Responsabilidade
Verificação de sanções e PEP, regras por valor, velocidade e fracionamento, fila de casos, decisão do compliance e relatório para a UIF.

## Regras de negócio
Dois níveis de reação: revisão e bloqueio. No balcão, o alerta abre caso sem impedir o registo. Limites parametrizáveis.

## Depende de
configuracao, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
