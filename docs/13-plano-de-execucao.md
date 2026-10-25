# 13. Plano de execução por fases

**Estado: Proposta.** Alinhado com as quatro fases do plano de negócio (Preparação, Loja aberta, Piloto digital, Abertura). Sem datas, porque dependem das respostas dos parceiros.

## Fase 0: Auditoria e estrutura (esta etapa)
- Feito: diagnóstico, estrutura de pastas, documentação oficial.
- Falta: **validação do dono do projeto**, repositório privado, publicação.
- Critério: estrutura e documentação aprovadas. Contradições de `15` identificadas.

## Fase 1: Fundação técnica
- Importar o código mais avançado já existente (ver `14`), **por revisão e num ramo próprio**.
- Ambientes, base de dados, integração contínua, configuração, auditoria, autenticação com perfis.
- Substituir o armazenamento em ficheiros por base de dados relacional.
- Decidir a base única de contabilidade (ver contradição C-02).
- Critério: testes de integridade financeira passam; segredos fora do Git; ambientes separados.
- Decisões a fechar antes: C-01, C-02, D-04, D-05.

## Fase 2: Loja aberta (câmbio e remessas no balcão)
- Identidade e KYC, taxas e margens, balcão, contabilidade, controlo de risco, reportes ao BNA, remessas.
- Administração com contas individuais e autenticação reforçada.
- Critério: reporte diário (incluindo zero) correto; balcão completo; compliance a decidir casos.
- **Condicionado:** parceiros de remessa (especificações), fornecedor de verificação de listas, aprovação dos limites de risco.

## Fase 3: Piloto digital (CONDICIONADA)
- Aplicação do cliente, pagamentos em kwanzas, ligação à Wise, carregamento de saldo, cartões.
- Piloto fechado com clientes convidados e limites baixos.
- Critério: ensaio completo em sandbox, teste de intrusão, procedimento de devolução escrito, termos e condições aprovados.
- **Condicionado:** acordo com a Wise, meio de pagamento escolhido, entrega de cartões físicos confirmada.

## Fase 4: Abertura e parceiros comerciais (CONDICIONADA)
- Abertura a todos os clientes, revisão das margens com dados reais.
- Área dos parceiros: **só** se a decisão do negócio e a confirmação do BNA e do advogado estiverem registadas.
- Começar pelo nível de captação.

## Regras de passagem de fase
1. Documentação e `CHANGELOG.md` atualizados.
2. Decisões da fase fechadas em `15` e passadas para `16`.
3. Aprovação explícita do dono do projeto.

## Próximo passo recomendado
1. Tornar o repositório privado.
2. Validar a estrutura e as decisões pendentes (`15`).
3. Enviar os pacotes de código já existentes (ver `14`) para a Fase 1.
4. Em paralelo, iniciar as frentes externas: candidatura à Wise, escolha do meio de pagamento, verificação de listas, parceiros de remessa.
