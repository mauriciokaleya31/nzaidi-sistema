# Módulo: Reportes ao BNA

**Pasta:** `apps/api/src/modules/reportes-bna`
**Estado:** Confirmado.

## Responsabilidade
Geração diária dos mapas de câmbio e de remessa, reporte a zero, ficheiros para Suptech e SSIF, estado de submissão com data e hora.

## Regras de negócio
Geração automática às 18:30, hora de Luanda. Reporte a zero obrigatório quando não há operações.

## Depende de
operacoes-cambio, remessas, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
