# 12. Plano de testes e critérios de aceitação

**Estado: Proposta.** As versões anteriores tiveram duas baterias (29 testes no núcleo contabilístico e 39 verificações na plataforma). Os resultados **não são reproduzíveis a partir deste repositório**: o código ainda não foi importado. Servem de referência do que cobrir, e devem ser refeitos.

## 1. Níveis de teste
| Nível | O que valida | Quando |
| --- | --- | --- |
| Unitário | Cálculo de taxas e margens, regras de risco, cotações, estados | Cada alteração |
| Integridade financeira | Débitos = créditos; saldos = soma dos lançamentos; lançamentos imutáveis; sem gasto duplo em operações simultâneas; estornos corretos | Cada alteração e antes de cada fase |
| Integração | Módulos entre si; base de dados; adaptadores com simulações | Cada alteração |
| Ponta a ponta | Fluxos completos (ver §2) | Antes de cada fase |
| Segurança | Ver §3 | Antes de cada fase e antes do piloto |
| Aceitação (UAT) | A equipa NZAIDI valida cada fluxo no ambiente de staging | Fim de cada fase |
| Parceiros (sandbox) | Wise, meio de pagamento, MaxPay, Realtransfers | Quando houver credenciais |

## 2. Fluxos de ponta a ponta
1. Registo de cliente, verificação limpa, em revisão (PEP) e recusada (sanções).
2. Ligação da conta Wise (simulada, depois sandbox).
3. Cotação, validade de 90 s, recotação em pagamento lento.
4. Pagamento por cada método: confirmado, repetido, desconhecido, expirado.
5. Operação acima do limite de revisão e do de bloqueio; fracionamento; decisão do compliance; reexecução.
6. Operação de balcão com alerta (o registo não é impedido).
7. Remessa: pedido, retenção por risco, envio, conclusão, devolução.
8. Cartão digital; cartão físico (chegada, levantamento com identidade, ativação).
9. Alteração de taxas pela gestão e efeito imediato no balcão, aplicação e site.
10. Reporte diário ao BNA, incluindo **reporte a zero**, e marcação da submissão.
11. Correção por lançamento contrário.

## 3. Testes de segurança
- Cada perfil só faz o que a matriz permite (`07`).
- Um cliente nunca acede aos dados de outro.
- Webhooks falsos e repetidos são recusados.
- Tentativas repetidas de entrada são limitadas.
- Valores inválidos, negativos e fora de intervalo são recusados.
- Nenhum segredo nem dado pessoal em logs ou no repositório (verificação automática).
- Verificação de dependências vulneráveis.
- **Teste de intrusão por terceiro antes do piloto.**
- Teste de recuperação de cópia de segurança.

## 4. Critérios de aceitação por fase
Ver `13-plano-de-execucao.md`. Uma fase só fecha quando: testes obrigatórios passam, a equipa NZAIDI valida em staging, a documentação está atualizada e as decisões pendentes dessa fase estão fechadas.

## 5. Dados de teste
Só fictícios. Nunca dados reais de clientes fora de produção.
