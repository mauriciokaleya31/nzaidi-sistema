# 03. Arquitetura geral

**Estado: Proposta, para validação.** As decisões de negócio que a sustentam estão em `16-registo-de-decisoes.md`. As escolhas técnicas abaixo são recomendações justificadas, e ficam em `adr/` com estado "Proposto".

## 1. Necessidades reais que a arquitetura tem de cumprir
1. Operar dinheiro de clientes com **integridade absoluta**: nada se perde, nada se duplica, nada se apaga.
2. **Controlo de risco antes de qualquer movimento** de dinheiro, no balcão e no digital.
3. Prova de tudo para inspeções do BNA, e **reportes diários** com hora fixa.
4. Integrações externas que **ainda não estão fechadas** (Wise, meio de pagamento, parceiros de remessa, verificação de listas) e que podem mudar de fornecedor.
5. Equipa pequena: poucas pessoas têm de conseguir manter o sistema.
6. Três tipos de utilizador com riscos diferentes (cliente, equipa interna, parceiro).

## 2. Escolha: monólito modular com aplicações separadas por área
| Peça | Escolha | Porquê |
| --- | --- | --- |
| Servidor | **Um só servidor (API) organizado em módulos** | Equipa pequena. Uma só base de dados facilita a integridade e a contabilidade. Microserviços aumentariam custo e risco sem necessidade |
| Aplicações | **Cliente, administração, site público e (futuro) parceiros, separadas** | A administração tem um perímetro de segurança próprio e uma superfície de ataque menor. Cada área evolui sem afetar as outras |
| Base de dados | **Relacional (PostgreSQL)** | Contabilidade de dupla entrada exige transações e restrições na própria base de dados |
| Linguagem | **TypeScript** no servidor e nas aplicações | Já é a linguagem do código das versões anteriores. Um só idioma reduz a equipa necessária |
| Aplicações web | **React** | Já usado nos protótipos. Aplicação do cliente como PWA primeiro; app nativa só depois do piloto |
| Integrações | **Adaptadores substituíveis** | Wise, pagamentos, remessas e verificação de listas ainda não estão fechados |

Alternativas rejeitadas: microserviços (custo operacional alto para esta equipa), servidor sem estado em funções isoladas (dificulta transações financeiras), uma única aplicação para todas as áreas (mistura perímetros de segurança).

**Continuidade:** esta escolha mantém a pilha tecnológica das duas versões já construídas e testadas (ver `14-estado-atual.md`). Mudar de pilha obrigaria a reescrever e a repetir todos os testes.

## 3. Camadas
```
Utilizadores:  Cliente | Equipa (balcão, compliance, tesouraria, gestão) | Parceiro (futuro) | Público
Aplicações:    apps/cliente | apps/admin | apps/parceiros | apps/site-publico   (só apresentam e pedem)
Servidor:      apps/api  (todas as regras, validações e permissões)
               módulos: identidade, autenticação, taxas, câmbio, pagamentos, remessas,
                        wise, cartões, conformidade, contabilidade, reportes, parceiros...
Adaptadores:   Wise | Meio de pagamento | MaxPay | Realtransfers | Verificação de listas
Dados:         Base de dados relacional (fonte única de verdade)
```

## 4. Regras de comunicação entre módulos
1. Cada módulo expõe uma **interface pública**. Nenhum módulo lê as tabelas de outro.
2. **Só o módulo `contabilidade-tesouraria` escreve no registo contabilístico.**
3. **Só o módulo `auditoria` escreve eventos de auditoria**, e só acrescenta.
4. Toda a operação de dinheiro passa pelo `conformidade-aml` **antes** de ser executada. Não há atalho.
5. As aplicações (cliente, administração, parceiros) **só falam com a API**. Nenhuma regra financeira vive nelas.
6. Os adaptadores externos ficam atrás de uma interface: trocar de fornecedor não toca nos módulos.
7. Uma funcionalidade **Condicionada** só fica ativa atrás de um interruptor em `configuracao`.

## 5. Dados
Resumo em `09-modelo-de-dados.md`. Princípios: valores monetários em decimal exato; lançamentos imutáveis; estados explícitos para cada processo; chaves de idempotência para pagamentos, remessas e eventos externos.

## 6. Configuração e ambientes
| Ambiente | Finalidade | Dados |
| --- | --- | --- |
| Desenvolvimento | Trabalho de cada programador | Fictícios |
| Teste | Testes automáticos | Fictícios |
| Staging | Ensaio completo com as sandboxes dos parceiros | Fictícios |
| Produção | Operação real | Reais |

Regras: configuração por variáveis de ambiente (modelo em `config/env.example`); segredos fora do Git; limites de risco e margens ficam em parâmetros editáveis, não no código; produção separada de todos os outros.

## 7. Integrações previstas
Ver `11-integracoes.md`. Todas as integrações **Condicionadas** têm um adaptador simulado (para desenvolver e testar) e um adaptador real (só quando houver contrato).

## 8. Segurança e controlo de acessos
Ver `07-contas-e-permissoes.md` e `08-autenticacao-e-seguranca.md`.

## 9. Testes e critérios de aceitação
Ver `12-plano-de-testes.md`.

## 10. Documentação para continuidade
Ver `00-LEIA-ME.md`, `14-estado-atual.md` e `AGENTS.md`.

## 11. Pontos de arquitetura ainda abertos
- Onde alojar a produção (proposta anterior: domínio e site em fornecedor angolano, servidor noutro país). Pendente, ver `15`.
- Se a administração e a área dos parceiros partilham o mesmo servidor ou se a dos parceiros ganha um perímetro próprio. Decidir antes da Fase 4.
