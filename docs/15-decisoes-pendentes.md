# 15. Decisões pendentes e contradições

Nada aqui foi decidido. Cada item deve ser fechado pelo dono do projeto e passado para `16-registo-de-decisoes.md`.

## A. Contradições encontradas no histórico
| ID | Contradição | Fontes | Proposta de resolução |
| --- | --- | --- | --- |
| C-01 | **Limites de risco**: plataforma v2 usa revisão a partir de 5 milhões e bloqueio a partir de 25 milhões de kwanzas por operação. O núcleo contabilístico usou 2,5 milhões por operação e 5 milhões por dia | Conversas de 08/07 e 10/07/2026 | Responsável de compliance aprova um só conjunto, com valores por operação **e** por dia. Ficam em parâmetros |
| C-02 | **Duas bases de código** não fundidas: núcleo contabilístico (base de dados relacional) e plataforma v2 (câmbio, pagamentos, AML, reportes, Wise). A v2 guarda dados em ficheiros | Conversas de 08/07 e 10/07/2026 | Base única relacional. Usar o núcleo contabilístico como fundação e portar os módulos da v2 (proposta). Decidir na Fase 1 |
| C-03 | **Morada da empresa**: uma conversa refere Soyo, as restantes Luanda (Maianga) | Conversa de 16/07/2026 | Confirmar com a certidão comercial |
| C-04 | **Contrapartida da cessão**: uma conversa diz só gestão e responsabilidade operacional, outra acrescenta injeção de capital. E há duas versões do contrato (um ou dois cedentes) | Conversas de 30/06 e 16/07/2026 | Confirmar com o contrato assinado |
| C-05 | **Aprovação do BNA**: o dono do projeto informou que já foi dada. A documentação jurídica descreve uma condição suspensiva pendente. Falta registo formal | Esta conversa e conversa de 16/07/2026 | Guardar fora do repositório a prova formal e registar em `16` |
| C-06 | **Denominação**: "Transferência" (registo) versus "Transferências" (num cabeçalho antigo) | Conversas de 08/07 e 30/06/2026 | Usar a denominação da certidão |
| C-07 | **Conta BIR** com dados incompletos (falta IBAN e agência) | Conversa de 12/08/2026 | Completar fora do repositório |

## B. Decisões de negócio pendentes
| ID | Decisão | Bloqueia |
| --- | --- | --- |
| D-01 | ~~Tornar o repositório privado~~ **Feito em 25/10/2026.** Falta só definir quem mais tem acesso | — |
| D-02 | Aprovar esta estrutura, a arquitetura e os ADR propostos | Fase 1 |
| D-03 | Limites de risco definitivos (por operação e por dia) | Fase 2 |
| D-04 | Alojamento e país do servidor; conformidade com a lei angolana de proteção de dados | Fase 1 |
| D-05 | Perfis de acesso da administração, quem ocupa cada um, autenticação reforçada | Fase 2 |
| D-06 | Margens por moeda; outras moedas além de dólar e euro | Fase 2 |
| D-07 | Comissão de remessa; preço e limite de cartões | Fases 2 e 3 |
| D-08 | Meio de pagamento em kwanzas (gateway da EMIS via banco ou agregador) | Fase 3 |
| D-09 | Fornecedor de verificação de listas de risco | Fase 2 |
| D-10 | Wise: acordo, mecanismo de carregamento do saldo, cartões físicos entregues na NZAIDI, cartões a clientes angolanos, co-branding | Fase 3 |
| D-11 | Parceiros de remessa: especificações oficiais e regra de escolha entre MaxPay e Realtransfers | Fase 2 |
| D-12 | Parceiros comerciais: se avançar, quando, níveis, comissão, e validação com o BNA e o advogado | Fase 4 |
| D-13 | Empresas como clientes | Fase 3 |
| D-14 | Procedimento de devolução quando o pagamento foi recebido e a operação ficou travada | Fase 3 |
| D-15 | Cliente pode vender divisas e receber kwanzas? Pode pedir remessa pela aplicação? | Fase 3 |
| D-16 | Mensagens neutras para clientes em revisão ou recusados | Fase 3 |
| D-17 | Apoio e reclamações: canais, responsável, prazo | Fase 3 |
| D-18 | Horário, regras com a Porto Cervo, loja arrendada ou própria | Fase 2 |
| D-19 | Capital em divisas a manter para carregar as contas Wise | Fase 3 |
| D-20 | Submissão ao BNA e à UIF: manual ou automática (se permitido) | Fase 2 |
| D-21 | Texto dos termos e condições (inclui recotação, divulgação da Wise e política de privacidade) | Fase 3 |
| D-22 | Objetivos de recuperação (tempo parado e informação perdida aceitáveis) | Fase 1 |
| D-23 | Automatizar a leitura da taxa de referência do BNA | Opcional |
| D-24 | Quem revê alterações antes de juntar à `main` | Fase 1 |
| D-25 | Arredondamento: taxas com 4 casas e montantes com 2 casas, ambos "metade para cima" (implementado como **Proposta** em `packages/dominio`). Confirmar com a tesouraria, incluindo se o arredondamento deve favorecer a NZAIDI | Fase 2 |
| D-26 | Acesso ao servidor por SSH: a chave enviada por chat em 25/10/2026 deve ser considerada **comprometida** e revogada no cPanel. Criar uma chave nova, só no computador do dono do projeto | Publicação no servidor |
| D-27 | Compatibilidade do alojamento: o cPanel partilhado da AngoWeb tem PostgreSQL e aplicações Node.js (Setup Node.js App)? A arquitetura proposta (ADR 0001 e 0003) precisa dos dois. Alternativas: plano VPS, ou outro alojamento para a API e base de dados mantendo o site no cPanel | Fase 1 (base de dados) |
| D-28 | Servidor fora de Angola (IP de centro de dados estrangeiro): validar com o advogado à luz da lei de proteção de dados (liga com D-04) | Produção |
| D-29 | Tipografia: Montserrat (títulos) e Inter (texto) propostas por semelhança com o logótipo. Confirmar ou indicar a fonte oficial da marca | Fase 2 |

## C. Lacunas
- Estudo de mercado, concorrência e volumes esperados: não tratados.
- Nomes das pessoas para atendimento, compliance e contabilidade.
- Formato e canal oficial do relatório à UIF.
