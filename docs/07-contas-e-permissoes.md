# 07. Tipos de conta e matriz de permissões

**Estado:** a regra "só a gestão altera taxas e margens" é **Confirmada**. Os perfis internos e o resto da matriz são **Proposta** (os perfis por função ainda não foram aprovados).

## Tipos de conta
| Tipo | Quem | Entrada | Estado |
| --- | --- | --- | --- |
| Cliente | Pessoa singular com conta na aplicação | PIN com sessão | Confirmado |
| Cliente de balcão ocasional | Pessoa que só troca divisas, sem aplicação | Sem conta digital. Ficha simples | Proposta |
| Atendente | Equipa do balcão | Acesso à administração | Função confirmada. Perfil: Proposta |
| Compliance | Responsável de compliance | Acesso à administração | Função confirmada. Perfil: Proposta |
| Tesouraria | Contabilidade e tesouraria | Acesso à administração | Função confirmada. Perfil: Proposta |
| Gestão | Direção | Acesso à administração | Confirmado |
| Parceiro comercial | Utilizador de um parceiro | Acesso à área dos parceiros | **Proposta, condicionada** |
| Sistema (integrações) | Serviços externos que chamam a API (webhooks) | Assinatura e segredo, sem login | Confirmado (princípio) |

Pessoas coletivas (empresas) como clientes: **Pendente**.

## Matriz de permissões (Proposta, exceto onde indicado)
Legenda: **V** ver, **C** criar/registar, **D** decidir/aprovar, **A** alterar, **—** sem acesso, **(p)** só os seus dados.

| Recurso | Cliente | Atendente | Compliance | Tesouraria | Gestão | Parceiro |
| --- | --- | --- | --- | --- | --- | --- |
| Dados do próprio perfil | V A (p) | — | — | — | — | V A (p) |
| Ficha do cliente | — | V | V | V | V | só nome, contacto e estado dos seus clientes |
| Registar cliente de balcão | — | C | — | — | C | — |
| Taxas do dia | V | V | V | V | V | V |
| **Alterar taxas e margens** | — | — | — | — | **A (Confirmado)** | — |
| Cotação e pedido de câmbio | C (p) | — | — | — | — | — |
| Registar operação de balcão | — | C | — | — | C | — |
| Operações (todas) | V (p) | V (dia) | V | V | V | só estado e valor dos seus clientes |
| Remessas | — | C V | V | V | V | — |
| Pagamentos em kwanzas | V (p) | V | — | V D | V | — |
| Cartões (lista e estado) | V C (p) | V | — | — | V | — |
| Registar chegada e entrega de cartão | — | C | — | — | C | — |
| Alertas e casos de risco | — | só aviso "em revisão" | V D | V | V | — |
| Aprovar ou recusar cliente em revisão | — | — | D | — | D | — |
| Comunicar à UIF | — | — | D | — | D | — |
| Registo contabilístico e tesouraria | — | — | V | V C | V | — |
| Reportes ao BNA | — | V | V | V C | V C | — |
| Parceiros de infraestrutura | — | — | — | — | V A | — |
| Parceiros comerciais (aprovar, níveis, comissões) | — | — | V | V | D A | V (p) |
| Utilizadores e perfis | — | — | — | — | A | — |
| Auditoria (consulta) | — | — | V | — | V | — |
| Definições e limites de risco | — | — | propõe | — | D A | — |

## Regras
1. Uma pessoa, uma conta. Acessos nunca são partilhados.
2. **Separação de funções:** quem regista uma operação não decide o caso de risco dessa operação. Quem altera taxas não é o atendente.
3. Casos graves: duas pessoas (Proposta).
4. Cada ação sensível fica na auditoria com autor, data e hora (Confirmado).
5. O parceiro nunca vê alertas de risco, saldos nem documentos completos.
6. Qualquer alteração à matriz passa por `15-decisoes-pendentes.md`.
