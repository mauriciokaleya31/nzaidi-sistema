# 05. Módulos e responsabilidades

**Estado: Proposta de organização. Funcionalidades marcadas como na legenda.** A ficha detalhada de cada módulo está em `../apps/api/src/modules/<modulo>/README.md`.

| Módulo | Responsabilidade | Depende de | Estado |
| --- | --- | --- | --- |
| `identidade-kyc` | Clientes, estado de verificação, risco, ficha do cliente | conformidade-aml, autenticacao | Confirmado |
| `autenticacao` | Entrada de clientes e da equipa, sessões, perfis e permissões | auditoria | Confirmado (PIN e sessão). Reforço e perfis: Proposta |
| `taxas-cambio` | Taxa de referência, margens, cotações de 90 s, recotação, tabela pública | configuracao | Confirmado |
| `operacoes-cambio` | Operações de câmbio (balcão e digital), classificação regulamentar, correções | taxas, conformidade, contabilidade, pagamentos, wise | Confirmado |
| `pagamentos-aoa` | Multicaixa Express, referência, transferência; confirmação automática | operacoes-cambio, taxas | Confirmado. Condicionado (fornecedor) |
| `remessas` | Remessas no balcão via MaxPay e Realtransfers; estados | identidade, conformidade, contabilidade | Confirmado. Condicionado (especificações) |
| `wise` | Ligação OAuth, saldos, carregamento, eventos da Wise | identidade, operacoes-cambio | Confirmado. Condicionado (acordo) |
| `cartoes` | Cartão digital e físico, chegada à NZAIDI, levantamento, ativação | wise, identidade | Confirmado. Condicionado (Wise) |
| `conformidade-aml` | Listas de risco, regras por valor, casos, relatório UIF | configuracao | Confirmado. Condicionado (fornecedor e limites) |
| `contabilidade-tesouraria` | Dupla entrada, contas internas, verificação de saldos | auditoria | Confirmado. Posição de divisas: Proposta |
| `reportes-bna` | Mapas diários, reporte a zero, Suptech e SSIF | operacoes-cambio, remessas | Confirmado |
| `parceiros-comerciais` | Adesão, perfil, pedidos, comissões | identidade, conformidade, contabilidade | **Proposta. Condicionado** |
| `auditoria` | Eventos imutáveis | nenhum | Confirmado |
| `configuracao` | Parâmetros e interruptores | auditoria | Confirmado (princípio) |
| `comunicacao-suporte` | Avisos, pedidos de apoio, reclamações | identidade | **Proposta** |

## Fluxo de uma operação digital (resumo)
1. `autenticacao` identifica o cliente. `identidade-kyc` confirma que está verificado.
2. `taxas-cambio` dá a cotação (90 s).
3. `pagamentos-aoa` gera o pedido de pagamento e espera a confirmação.
4. `conformidade-aml` avalia: permitir, rever ou bloquear.
5. Se permitido, `operacoes-cambio` regista e `contabilidade-tesouraria` lança os movimentos.
6. `wise` carrega o saldo do cliente. `auditoria` regista cada passo. `reportes-bna` inclui a operação nos mapas do dia.

## Fluxo de uma operação de balcão (resumo)
1. A equipa regista a operação (identificação do cliente obrigatória).
2. `conformidade-aml` avalia: se houver alerta, abre um caso e **não impede o registo**.
3. `operacoes-cambio` classifica (câmbio ou remessa; compra ou venda) e `contabilidade-tesouraria` lança.
4. `reportes-bna` inclui nos mapas do dia.
