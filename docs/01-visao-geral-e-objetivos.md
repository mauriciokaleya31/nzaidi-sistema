# 01. Visão geral e objetivos

**Estado: Confirmado** (resumo das decisões em `16-registo-de-decisoes.md`).

## O que é
A NZAIDI – Casa de Câmbios & Transferência, Lda é uma casa de câmbios licenciada, com loja na Maianga (Luanda), partilhada com a Porto Cervo – Agência de Viagens. Está sujeita à supervisão do Banco Nacional de Angola (BNA).

## O que o sistema faz
1. **Câmbio** de dólar e euro por kwanzas, no balcão e pela aplicação.
2. **Remessas internacionais** pedidas no balcão, executadas por parceiros (MaxPay e Realtransfers).
3. **Conta Wise do cliente** (modelo embedded): o cliente tem conta própria na Wise, ligada à aplicação da NZAIDI. A NZAIDI abre a conta com o cliente, troca os kwanzas por divisas e carrega o saldo.
4. **Cartões Wise**: digital (o cliente cria sozinho) e físico (enviado à NZAIDI e levantado na loja).
5. **Transferências e pagamentos internacionais** feitos pelo próprio cliente, a partir do saldo Wise.
6. **Pagamento dos kwanzas** por Multicaixa Express, referência Multicaixa, transferência bancária ou numerário.
7. **Administração**: taxas e margens, operações de balcão, pagamentos, cartões, compliance, tesouraria e reportes ao BNA.

## Objetivos do sistema
- Operar a casa de câmbios com controlo de risco antes de mover dinheiro.
- Cumprir os reportes diários ao BNA (Suptech e SSIF), incluindo reporte a zero.
- Dar ao cliente autonomia sem perder a loja como ponto de confiança.
- Manter prova de tudo o que acontece (auditoria imutável).

## Fora do âmbito desta etapa
Implementação funcional. Esta etapa só organiza a estrutura, a arquitetura e a documentação.

## Como a receita é gerada
Principalmente pela margem de câmbio. Remessas, cartões e parcerias ainda não têm valores acordados (ver `15-decisoes-pendentes.md`).
