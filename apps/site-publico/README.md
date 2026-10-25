# Site público (`@nzaidi/site-publico`)

Website institucional da NZAIDI – Casa de Câmbios & Transferência, Lda. com o simulador de câmbio interativo do dia, tabela de taxas oficiais, serviços, conformidade regulamentar, sobre nós e contactos.

## Responsabilidades
- Apresentação da marca NZAIDI e proposta de valor (Confiança, Segurança e Agilidade).
- Tabela oficial de taxas do dia para Dólar Americano (USD) e Euro (EUR).
- **Simulador de câmbio**: cálculo exato de compra e venda de divisas utilizando `@nzaidi/dominio` e `decimal.js`, com validade de 90 segundos e recotação (R-08).
- Divulgação transparente dos serviços presenciais (balcão na Maianga, Luanda) e preparação de serviços digitais (`app.nzaidi.ao`).
- Cumprimento rigoroso da política de segurança e prevenção de branqueamento de capitais (Lei n.º 5/20 e normas do BNA).

## Arquitetura
- Desenvolvido em TypeScript estrito e HTML5 semântico.
- Estilizado com os tokens e componentes oficiais de `@nzaidi/design-system`.
- Bundler de produção: Vite.
- Testes unitários do simulador: Vitest.

## Comandos
```bash
# Executar em modo de desenvolvimento
npm --workspace=@nzaidi/site-publico run dev

# Compilar para produção
npm --workspace=@nzaidi/site-publico run build

# Executar testes unitários
npm test
```
