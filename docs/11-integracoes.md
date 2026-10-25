# 11. Estado das integrações

**Regra:** nenhuma integração externa tem contrato fechado neste momento. Cada uma tem um adaptador **simulado** para desenvolver e testar, e um adaptador **real** que só se constrói quando houver contrato e documentação oficial. Tudo o que está **Condicionado** fica atrás de interruptor.

| Integração | Para quê | Estado do negócio | Estado do código conhecido | Condição |
| --- | --- | --- | --- | --- |
| **Wise Platform** (modelo embedded) | Conta, cartões, transferências e pagamentos do cliente; carregamento do saldo | Confirmado (modelo). Candidatura e acordo por fazer | Esqueleto não testado contra a Wise real | Acordo de parceria, credenciais de teste, aprovação de cartões e de entrega física na NZAIDI |
| **Meio de pagamento em kwanzas** (Multicaixa Express, referência, transferência) | Confirmar pagamentos de clientes | Confirmado (métodos). Fornecedor por escolher | Adaptador simulado | Escolher: gateway da EMIS via banco de apoio, ou agregador certificado |
| **MaxPay** | Executar remessas | Confirmado (parceiro). Acordo por fechar | Adaptador esboçado e testado com simulação | Especificações oficiais e contrato |
| **Realtransfers** | Executar remessas | Confirmado (parceiro). Acordo por fechar | Adaptador esboçado e testado com simulação | Especificações oficiais e contrato |
| **Verificação de listas** (sanções, PEP) | KYC e re-verificação | Confirmado (necessidade). Fornecedor por escolher | Simulação por palavras de teste | Contratar fornecedor |
| **BNA: Suptech e SSIF** | Reportes diários | Confirmado | Geração dos ficheiros testada | Submissão feita pela equipa nos portais. Automatizar só se o BNA o permitir (Pendente) |
| **UIF** | Comunicação de operações suspeitas | Confirmado (obrigação) | Relatório estruturado gerado | Canal oficial de submissão por definir |
| **Bancos** (contas em kwanzas) | Receção de transferências | Confirmado | Sem integração. Conciliação manual | Conciliação automática: Proposta |
| **Taxa de referência do BNA** | Base das taxas | Confirmado (cópia manual pela gestão) | Atualização manual na administração | Automatizar: Proposta |
| **Alojamento, domínio e email** | Publicar | Proposta anterior: domínio e site em fornecedor angolano, servidor noutro país. Não decidido | Nenhum | Decidir (ver `15`) |

## Regras para integrar
1. Ler a documentação oficial do parceiro antes de escrever o adaptador real. As suposições das versões anteriores (nomes de campos e endereços) **não são especificação**.
2. Cada adaptador implementa a interface do seu módulo. Trocar de fornecedor não toca no resto.
3. Testar sempre primeiro na sandbox do parceiro.
4. Webhooks: verificar assinatura, tratar repetições, responder depressa.
5. Credenciais só em variáveis de ambiente (modelo em `config/env.example`).
6. Registar em `14-estado-atual.md` quando uma integração passar de simulada a real.
