# Módulo: Parceiros comerciais

**Pasta:** `apps/api/src/modules/parceiros-comerciais`
**Estado:** PROPOSTA. CONDICIONADO: decisão do negócio e confirmação regulatória.

## Responsabilidade
Adesão, perfil, pedidos, operações autorizadas por nível, acompanhamento e comissões dos parceiros que entram na plataforma.

## Regras de negócio
Começar pelo nível de captação. Níveis com dinheiro só com autorização do BNA. O parceiro nunca fixa preços.

## Depende de
identidade-kyc, conformidade-aml, contabilidade-tesouraria, auditoria

## Notas para quem implementar
- Ler primeiro `docs/05-modulos-e-responsabilidades.md` e `docs/10-regras-financeiras.md`.
- Este módulo só se comunica com os outros através da sua interface pública. Nunca ler tabelas de outro módulo diretamente.
- Qualquer decisão nova vai para `docs/15-decisoes-pendentes.md` antes de ser implementada.
- Estado desta pasta: **sem código** (etapa de estrutura).
