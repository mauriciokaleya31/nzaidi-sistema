# 16. Registo de decisões confirmadas

Só entram aqui decisões do dono do projeto, recuperadas do histórico. Cada linha diz de onde vem. O que não está aqui **não é decisão**.

| ID | Decisão | Fonte |
| --- | --- | --- |
| R-01 | A NZAIDI é uma casa de câmbios licenciada, com loja na Maianga (Luanda), partilhada com a Porto Cervo – Agência de Viagens. A Porto Cervo ocupa a zona da frente. O atendimento da NZAIDI faz-se por uma janela numa parede de pé-direito inteiro, com porta de acesso à casa de câmbios | Conversas de 06 e 08/07/2026 (planta) |
| R-02 | A gestão e a responsabilidade operacional passam para Lukeny Carvalho, com 80% da sociedade. Os sócios atuais mantêm 20% e a relação institucional com o BNA. Contratos jurídicos ficam **fora** do repositório | Conversas de 30/06 e 16/07/2026 |
| R-03 | O BNA aprovou a entrada (informação do dono do projeto). Falta registo formal (ver C-05) | Esta conversa |
| R-04 | Modelo Wise: **embedded**. O cliente tem conta Wise própria, ligada à aplicação da NZAIDI por autorização. Cartões, transferências e pagamentos internacionais são feitos pelo cliente. A NZAIDI é o canal de abertura e de câmbio, carrega o saldo e é o ponto de levantamento de cartões | Esta conversa |
| R-05 | Cartão digital: criado pelo cliente, uso imediato. Cartão físico: pedido na aplicação, enviado à NZAIDI, levantado com prova de identidade e ativado com os quatro últimos dígitos | Esta conversa |
| R-06 | A marca NZAIDI domina a experiência. Mostra-se o selo "Powered by Wise" e a divulgação, nos termos, de que a conta é gerida pela Wise. O nível exato de co-branding fixa-se no contrato com a Wise | Esta conversa |
| R-07 | A receita principal é a margem de câmbio. Venda = referência + margem de venda. Compra = referência − margem de compra. Margens por moeda, editáveis só pela gestão | Conversa de 10/07/2026 |
| R-08 | A cotação vale 90 segundos. Nos métodos lentos (referência, transferência), recota-se à taxa do momento da confirmação | Esta conversa e conversa de 10/07/2026 |
| R-09 | Pagamento dos kwanzas por Multicaixa Express, referência Multicaixa, transferência bancária e numerário no balcão | Esta conversa |
| R-10 | Remessas internacionais pedidas no balcão, executadas por MaxPay e Realtransfers | Conversa de 08/07/2026 |
| R-11 | Controlo de risco: verificação de sanções (recusa) e PEP (revisão); limites por valor, soma diária e fracionamento; fila de casos; decisão do compliance; relatório para a UIF. No balcão o alerta abre caso sem impedir o registo. **Valores dos limites: pendentes (C-01)** | Conversas de 08/07 e 10/07/2026 |
| R-12 | Reporte diário ao BNA nas plataformas Suptech e SSIF: mapa de câmbio e mapa de remessa, reporte a zero obrigatório, geração automática às 18:30 (hora de Luanda), estado de submissão com data e hora | Conversa de 10/07/2026 |
| R-13 | Contabilidade de dupla entrada com lançamentos imutáveis. Correções por lançamento contrário | Conversa de 08/07/2026 |
| R-14 | Uma só tabela de taxas alimenta balcão, aplicação e site público. O site mostra a taxa do dia automaticamente. Texto do site alterado a pedido, e não por edição direta | Conversa de 10/07/2026 |
| R-15 | Moedas de câmbio: dólar (USD) e euro (EUR) | Conversas de 08/07 e 10/07/2026 |
| R-16 | A área dos parceiros comerciais foi pedida, mas **todas as regras são proposta**. Ver `docs/02-negocio/referencias/Funcionamento_do_Sistema_NZAIDI.pdf` | Esta conversa |
| R-17 | Língua de trabalho e documentação: português de Angola | Todas as conversas |

## O que **não** é decisão
- Pilha tecnológica (TypeScript, React, base de dados relacional): foi usada nas versões anteriores, mas está como **Proposta** nos ADR.
- Alojamento (proposta anterior de domínio e site em fornecedor angolano e servidor noutro país): **Proposta**.
- Qualquer funcionalidade marcada como Proposta nos documentos 05, 06, 07 e 08.
