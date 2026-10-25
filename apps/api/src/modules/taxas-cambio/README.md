# Módulo: Taxas e cotações

**Pasta:** `apps/api/src/modules/taxas-cambio`  
**Estado:** **Funcional e Testado (Fase 2)**.

## Responsabilidade
- Fornece a tabela oficial de taxas de câmbio para as moedas suportadas (USD e EUR em Kwanzas).
- Cálculo das taxas de compra e venda reutilizando as funções do `@nzaidi/dominio` (`calcularTaxas`) com aritmética exata.
- Estados de cotação explícitos: distinção entre fonte oficial e demonstração.
- Alteração segura de taxas de referência e margens, restrita à função `gestao` e registada na auditoria com motivo e autor.

## Regras de negócio
- Venda = referência + margem de venda. Compra = referência − margem de compra (R-07).
- Fonte única de taxas para balcão, simulador e sistema digital (R-14).

## Depende de
configuracao, auditoria
