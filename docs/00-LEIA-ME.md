# Documentação oficial do projeto NZAIDI

Estes documentos são a referência permanente do projeto. Qualquer agente ou programador deve conseguir continuar o trabalho só com eles.

## Legenda de estados
| Estado | Significado |
| --- | --- |
| **Confirmado** | Decidido pelo dono do projeto e registado em `16-registo-de-decisoes.md` |
| **Proposta** | Sugerido, não aprovado. Não implementar |
| **Condicionado** | Depende de terceiros (Wise, BNA, fornecedores, advogado). Só atrás de interruptor |
| **Pendente** | Falta decidir. Está em `15-decisoes-pendentes.md` |
| **Existe** | Já existia antes desta etapa |
| **Criado** | Criado nesta etapa |

## Índice
| N.º | Documento | Conteúdo |
| --- | --- | --- |
| 01 | [Visão geral e objetivos](01-visao-geral-e-objetivos.md) | O que é a NZAIDI e o que o sistema faz |
| 02 | [Negócio](02-negocio/README.md) | Funcionamento do sistema (PDF de referência) |
| 03 | [Arquitetura geral](03-arquitetura-geral.md) | Camadas, comunicação, ambientes, justificação |
| 04 | [Estrutura do repositório](04-estrutura-do-repositorio.md) | Pastas e ficheiros |
| 05 | [Módulos e responsabilidades](05-modulos-e-responsabilidades.md) | Os 15 módulos da API |
| 06 | [Áreas e páginas](06-areas-e-paginas.md) | Pública, cliente, administração, parceiros |
| 07 | [Contas e permissões](07-contas-e-permissoes.md) | Tipos de conta e matriz de permissões |
| 08 | [Autenticação e segurança](08-autenticacao-e-seguranca.md) | Regras de acesso e proteção |
| 09 | [Modelo de dados](09-modelo-de-dados.md) | Entidades e relações |
| 10 | [Regras financeiras](10-regras-financeiras.md) | Taxas, cotações, estados, contabilidade |
| 11 | [Integrações](11-integracoes.md) | Estado de cada serviço externo |
| 12 | [Plano de testes](12-plano-de-testes.md) | Testes e critérios de aceitação |
| 13 | [Plano de execução](13-plano-de-execucao.md) | Fases e próximo passo |
| 14 | [Estado atual](14-estado-atual.md) | Diagnóstico e o que existe onde |
| 15 | [Decisões pendentes](15-decisoes-pendentes.md) | O que falta decidir e as contradições |
| 16 | [Registo de decisões](16-registo-de-decisoes.md) | O que já está decidido |
| — | [Decisões de arquitetura](adr/README.md) | ADR (propostos) |

## Regra de manutenção
Cada alteração ao projeto atualiza `../CHANGELOG.md` e `14-estado-atual.md`. Uma decisão nova entra primeiro em `15`, e passa para `16` quando o dono do projeto a aprova.
