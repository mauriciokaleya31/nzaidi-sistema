# 03. Arquitetura geral

**Estado:** Confirmado pelo dono do projeto em 25/10/2026 (R-22 e ADR 0005).

## 1. Necessidades reais que a arquitetura tem de cumprir
1. Operar dinheiro de clientes com **integridade absoluta**: nada se perde, nada se duplica, nada se apaga.
2. **Controlo de risco antes de qualquer movimento** de dinheiro, no balcão e no digital.
3. Prova de tudo para inspeções do BNA, e **reportes diários** com hora fixa (corte às 18:30 no fuso de Luanda).
4. Integrações externas com **adaptadores substituíveis** (Wise, pagamentos, parceiros de remessa MaxPay e Realtransfers).
5. Equipa pequena: monorepo com TypeScript em todas as camadas para máxima produtividade e consistência.
6. Três tipos de utilizador com riscos diferentes (cliente, equipa interna, parceiro).

## 2. Escolha: monólito modular com aplicações separadas por área
| Peça | Escolha | Porquê |
| --- | --- | --- |
| Servidor | **Um só servidor (API) organizado em módulos Fastify** | Equipa enxuta. Uma só base de dados facilita a integridade e a contabilidade. Microserviços aumentariam complexidade sem necessidade |
| Aplicações | **Administração, site público, cliente e parceiros separadas** | A administração tem um perímetro de segurança próprio. Cada aplicação evolui sem afetar as outras |
| Base de dados | **Relacional (SQLite piloto/desenvolvimento; PostgreSQL/MySQL em produção)** | SQLite com modo WAL e transações atómicas para piloto; migração obrigatória para base relacional dedicada antes de dados reais de clientes (ADR 0005) |
| Linguagem | **TypeScript (Node.js >= 22)** no servidor e nas aplicações | Monorepo npm workspaces. Decisão confirmada: Laravel/PHP expressamente descartado |
| Aplicações web | **Vite + TypeScript modular** | Interfaces rápidas, reativas e com design system bancário oficial |
| Integrações | **Adaptadores substituíveis** | MaxPay, Realtransfers, Wise e gateways externos desacoplados por interfaces |

Alternativas rejeitadas:
- Migração para Laravel/PHP: Descartada pelo dono do projeto em 25/10/2026.
- Microserviços: Complexidade e custo operacional desnecessários para a fase atual.

## 3. Camadas
```
Utilizadores:  Cliente | Equipa (balcão, compliance, tesouraria, gestão) | Parceiro | Público
Aplicações:    apps/admin | apps/site-publico | apps/cliente
Servidor:      apps/api  (todas as regras, validações Zod e permissões RBAC)
               módulos: identidade-kyc, autenticacao, taxas-cambio, operacoes-cambio,
                        contabilidade-tesouraria, reportes-bna, remessas, auditoria...
Adaptadores:   MaxPaySimulado | RealtransfersSimulado | Provedores futuros
Dados:         Base de dados relacional com isolamento estrito na camada de repositório
```

## 4. Regras de comunicação entre módulos
1. Cada módulo expõe uma interface pública. Nenhum módulo lê tabelas alheias diretamente.
2. Só o módulo `contabilidade-tesouraria` altera os movimentos e saldos do caixa.
3. Só o módulo `auditoria` grava eventos de auditoria (registo de acréscimo sem alteração nem apagamento).
4. Toda a operação passa pelo controlo de conformidade antes de ser executada.
5. As aplicações cliente e admin só falam com a API via endpoints autenticados.
6. Borderôs e remessas recebem numeração sequencial atómica na mesma transação da base de dados (sem gaps).
7. Reportes ao BNA são gerados pontualmente com corte às 18:30 (Africa/Luanda), com reporte a zero obrigatório em dias sem operações.
