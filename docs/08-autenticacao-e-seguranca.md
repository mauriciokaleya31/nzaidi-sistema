# 08. Regras de autenticação e segurança

**Estado:** o que está nas versões anteriores (PIN com sessão que expira, acesso protegido do back-office, histórico imutável, validação no servidor, tokens da Wise cifrados, webhooks idempotentes) é **Confirmado**. O reforço abaixo é **Proposta** e deve ser aprovado antes da Fase 1.

## 1. Autenticação do cliente
- Confirmado: registo com nome, BI e PIN de 4 a 6 dígitos; sessão que expira por inatividade.
- Proposta: PIN guardado com função de proteção forte (nunca em claro nem em hash simples); bloqueio temporário após tentativas falhadas; confirmação de telemóvel e email; segundo fator para ações sensíveis (alterar PIN, ligar conta Wise, valores altos); recuperação segura de PIN.

## 2. Autenticação da administração
- Estado anterior: acesso por uma chave única. **Insuficiente** para produção.
- Proposta: contas individuais, segundo fator **obrigatório**, sessões curtas, perfis por função (ver `07`), aplicação separada do cliente, restrição de acesso (rede ou lista de dispositivos) a decidir, revisão trimestral de acessos.

## 3. Autenticação dos parceiros (Proposta, condicionada)
Contas individuais por pessoa do parceiro, segundo fator, limites por nível, desativação imediata em caso de suspensão.

## 4. Integrações (webhooks e chamadas)
- Confirmado: webhooks tratados de forma idempotente.
- Proposta: verificar a assinatura de **todos** os webhooks antes de processar; rejeitar pedidos antigos (proteção contra repetição); segredos por fornecedor e por ambiente.

## 5. Validação e integridade
- Todas as regras e validações correm **no servidor**. As aplicações nunca decidem.
- Valores monetários em decimal exato. Moeda sempre explícita.
- Idempotência em pagamentos, remessas e eventos externos (a mesma operação nunca se executa duas vezes).
- Lançamentos contabilísticos imutáveis. Correções por lançamento contrário.
- Cada acesso a dados de outro utilizador é recusado (o cliente só vê os seus dados).

## 6. Proteção de dados pessoais e documentos
- Minimizar: só recolher o necessário.
- Cifrar em repouso os dados sensíveis (tokens da Wise, documentos, identificação).
- Documentos de identidade fora da base de dados principal, com acesso restrito e registado.
- Logs sem dados pessoais nem segredos.
- Conformidade com a lei angolana de proteção de dados pessoais: **Pendente**, a confirmar com o advogado (incluindo registo junto da entidade competente e regras sobre alojamento fora do país).

## 7. Credenciais e segredos
- Nunca no Git (ver `SECURITY.md`). Modelo em `config/env.example`.
- Um segredo por ambiente. Rotação periódica e imediata em caso de suspeita.
- Quem sai da equipa perde acessos no mesmo dia.

## 8. Registo de auditoria
Confirmado: histórico imutável de operações, decisões, alterações de taxas e de parâmetros, com autor, data e hora. Consulta só para compliance e gestão (ver `07`).

## 9. Cópias de segurança e recuperação (Proposta)
- Cópia diária cifrada da base de dados, guardada fora do servidor principal.
- Teste de recuperação antes do piloto e depois periodicamente.
- Plano escrito: quanto tempo se aceita ficar parado e quanta informação se aceita perder. **Pendente**: definir.
- Interruptor para suspender câmbios em caso de incidente.

## 10. Testes de segurança
Ver `12-plano-de-testes.md`: autorização por perfil, acesso a dados de outro cliente, tentativas de repetição, webhooks falsos, dependências vulneráveis e teste de intrusão por terceiro antes do piloto.

## 11. Funcionalidades condicionadas
Tudo o que depende de autorizações legais, aprovação de parceiros financeiros ou serviços externos fica **atrás de interruptor** e marcado em `11-integracoes.md`.
