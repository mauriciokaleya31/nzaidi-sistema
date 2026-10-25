# 17. Passagem para o Claude Code

**Para quem é:** o Claude Code (ou qualquer agente) que vai continuar o trabalho que começou no claude.ai. As duas ferramentas não partilham conversas, por isso este documento resume o que importa.

## 1. Em que ponto estamos
- Etapa 0 (auditoria e estrutura) concluída. O repositório estava vazio. Nada de código funcional foi criado ou importado aqui.
- O dono do projeto valida a estrutura e responde às decisões pendentes antes de a Fase 1 começar.
- Próxima fase: **Fase 1, fundação técnica** (ver `13-plano-de-execucao.md`).

## 2. O que foi feito nas conversas anteriores (resumo)
| Quando | O que foi produzido | Onde está |
| --- | --- | --- |
| Junho a agosto de 2026 | Documentos jurídicos e administrativos (cessão de quotas, procuração, dados bancários, planta da loja) | Fora do repositório, de propósito |
| 08/07/2026 | **Núcleo contabilístico**: base de dados relacional, dupla entrada imutável, remessas, adaptadores MaxPay e Realtransfers, auditoria, idempotência (29 testes aprovados na altura) | Só na conversa "Arquitetura de core banking para casas de câmbio". **Código não está neste repositório** |
| 10/07/2026 | **Plataforma v2**: KYC, taxas com margem editável, 3 meios de pagamento, AML com casos, back-office, reportes BNA (Suptech e SSIF), site institucional (39 verificações aprovadas na altura) | Só na conversa "Teste e validação de código funcional". **Código não está neste repositório** |
| 25/10/2026 | Plano de negócio e documento de funcionamento (administração, cliente, parceiros) | PDF de funcionamento em `docs/02-negocio/referencias/`. O plano de negócio fica com a gestão |
| 25/10/2026 | Esta estrutura e documentação | Este repositório |

Também existe uma **plataforma v1** (esqueleto com OAuth da Wise, câmbio, AML, pagamentos e cartões, em memória, nunca compilada). Está **ultrapassada** pela v2. Não a uses como base.

## 3. O que o Claude Code deve fazer primeiro (Fase 1)
1. Pedir ao dono do projeto os pacotes `.zip` da **v2** e do **núcleo contabilístico**. Sem eles, não há código para importar.
2. **Não importar por cima de nada.** Trabalhar num ramo próprio, com revisão.
3. Resolver a contradição **C-02**: duas bases de código. Proposta (ADR 0003): base de dados relacional única, com o núcleo contabilístico como fundação, e portar os módulos da v2.
4. Resolver **C-01** (limites de risco) com o responsável de compliance antes de fixar valores. Valores em parâmetros, nunca no código.
5. Compilar, correr os testes que existirem e **refazer** as baterias de teste (os resultados antigos não são reproduzíveis).
6. Montar ambientes, integração contínua e verificação de segredos.
7. Atualizar `CHANGELOG.md` e `docs/14-estado-atual.md` em cada passo.

## 4. Armadilhas conhecidas
- **Sinal da margem.** Na primeira versão, a margem favorecia o cliente. Foi corrigido na v2. Regra certa: venda = referência × (1 + margem de venda); compra = referência × (1 − margem de compra).
- **Wise.** Os endereços e campos da API usados nas versões anteriores foram **suposições** da documentação pública, nunca testadas contra a Wise real. O mecanismo de carregar o saldo do cliente a partir da conta de negócio é o ponto mais frágil. Confirmar com a Wise antes de implementar.
- **Cartões físicos entregues na NZAIDI:** a Wise ainda tem de confirmar que é possível.
- **Meio de pagamento em kwanzas:** fornecedor por escolher. Usar adaptador simulado.
- **Cotação:** 90 segundos. Nos métodos lentos, recotar à taxa da confirmação e registar as duas taxas.
- **No balcão,** o alerta de risco abre um caso e **não** impede o registo.
- **Pagamento já recebido e operação travada:** procedimento de devolução ainda por escrever (D-14).
- **Reporte ao BNA:** reporte a zero obrigatório, às 18:30 de Luanda.
- A área dos **parceiros comerciais** é inteira proposta. Não construir sem decisão e confirmação do BNA.

## 5. Segurança
- Nada de segredos, tokens, BI, IBAN ou dados reais de clientes no Git.
- O repositório foi encontrado **público** em 25/10/2026. Confirma que já é privado antes de qualquer publicação.
- Exportações das conversas contêm dados pessoais: guardar fora do repositório.

## 6. Primeira instrução sugerida para colar no Claude Code
> Lê `CLAUDE.md`, `docs/17-passagem-para-claude-code.md`, `docs/14-estado-atual.md` e `docs/15-decisoes-pendentes.md`. Resume-me, em português, o estado do projeto, as decisões pendentes que bloqueiam a Fase 1 e o que precisas de mim para começar. Não escrevas código nem alteres ficheiros até eu aprovar.
