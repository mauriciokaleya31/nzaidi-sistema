# 10. Regras das operações financeiras

**Estado:** o que vem das versões anteriores e foi aceite é **Confirmado**. Os valores dos limites de risco estão **Pendentes** (ver `15`).

## 1. Princípios
1. Moeda base: kwanza (AOA). Moedas de câmbio: dólar (USD) e euro (EUR). Outras moedas: **Pendente**.
2. Valores em decimal exato, duas casas, com a moeda sempre indicada.
3. Nenhuma operação move dinheiro sem passar pelo controlo de risco.
4. Nada se apaga. Corrige-se por lançamento contrário.

## 2. Taxas
- Venda de divisa ao cliente = referência × (1 + margem de venda).
- Compra de divisa ao cliente = referência × (1 − margem de compra).
- A margem funciona sempre a favor da NZAIDI, nos dois sentidos.
- Referência: taxa do BNA do dia, copiada pela gestão (Confirmado). Automatização: Proposta.
- Só a gestão altera taxas e margens (Confirmado). Uma única tabela alimenta balcão, aplicação e site.
- O sistema recusa margens fora de um intervalo razoável.
- O cliente vê a taxa de referência e a taxa que paga (Confirmado).

## 3. Cotação
- Validade: **90 segundos** (Confirmado).
- Se o pagamento chega depois da validade (referência, transferência), recota-se à taxa do **momento da confirmação** e registam-se as duas taxas (Confirmado). A regra tem de constar dos termos e condições (texto por escrever).

## 4. Estados
| Processo | Estados |
| --- | --- |
| Cotação | aberta, executada, expirada, cancelada |
| Pedido de pagamento | à espera, pago, expirado, falhado |
| Operação de câmbio | pendente, concluída, falhada |
| Remessa | pendente, retida (risco), aprovada, enviada, concluída, cancelada |
| Cliente | em verificação, verificado, em revisão (PEP), recusado (sanções) |
| Caso de conformidade | aberto, em revisão, fechado como limpo, fechado e reportado |
| Reporte ao BNA | gerado, submetido no Suptech, submetido no SSIF, submetido em ambos |
| Cartão | pedido, em fabrico, chegado à loja, levantado, ativo |
| Comissão (proposta) | a apurar, confirmada, paga |

## 5. Controlo de risco (AML)
- **Dois níveis:** revisão (a operação espera pela decisão) e bloqueio (a operação não avança).
- **Regras:** valor por operação, soma diária, fracionamento (várias operações perto do limite em 24 h), correspondência em sanções ou PEP.
- Sanções: conta recusada. PEP: conta em revisão.
- **No balcão:** o alerta abre um caso e **não impede o registo** do valor já recebido.
- Decisão do caso: fechar como limpo (a operação segue) ou fechar e reportar à UIF.
- Valores dos limites: **Pendente** (dois conjuntos usados em versões anteriores; ver `15`). Ficam em parâmetros, não no código.

## 6. Pagamentos em kwanzas
- Métodos: Multicaixa Express (quase imediato), referência Multicaixa (até 48 h, compensação em lote), transferência bancária (IBAN e código único), numerário no balcão.
- Confirmação automática do pagamento dispara o câmbio, depois do controlo de risco.
- Pagamento repetido ou desconhecido: nunca se aplica duas vezes. Regista-se para investigação.
- Falha ao carregar a Wise: os kwanzas ficam registados como pendentes para resolução manual.
- Pagamento recebido e operação travada pelo risco: o compliance decide entre devolver e executar. **Procedimento por escrever (Pendente).**

## 7. Remessas
Remetente verificado, retenção por risco, sem envio duplicado, acompanhamento até ao beneficiário, devolução por lançamentos contrários. Comissão de remessa: **Pendente**.

## 8. Contabilidade
- Dupla entrada: débitos iguais a créditos em cada movimento.
- Contas internas (liquidação, comissões, contrapartida) separadas por moeda.
- Verificação regular de que cada saldo corresponde à soma dos lançamentos.
- Conciliação diária com bancos e meio de pagamento: Proposta.
- Posição de divisas (quanto USD e EUR a NZAIDI tem, incluindo a conta Wise de negócio): Proposta.

## 9. Reportes ao BNA
- Dois mapas por dia: câmbio e remessa. Cada operação com tipo e sentido (câmbio ou remessa; compra ou venda).
- **Reporte a zero** obrigatório quando não há operações.
- Geração automática às **18:30, hora de Luanda**, e a pedido para qualquer data.
- Submissão nas plataformas Suptech e SSIF, com estado, data e hora como prova.

## 10. Idempotência
Pagamentos, remessas e eventos externos têm chave própria. A mesma operação nunca se executa duas vezes, mesmo com repetição de pedidos.

## 11. Parceiros comerciais (Proposta)
Comissão sobre a **margem realizada**, só de operações concluídas e sem devolução, depois de um prazo de segurança. Percentagem, prazo e limites: **Pendente**.
