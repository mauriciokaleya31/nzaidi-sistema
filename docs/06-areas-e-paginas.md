# 06. Áreas do sistema e mapa de páginas

**Estado:** funcionalidades marcadas como **Confirmado** ou **Proposta**. O detalhe operacional de cada funcionalidade está no PDF `02-negocio/referencias/Funcionamento_do_Sistema_NZAIDI.pdf`.

## 1. Área pública (`apps/site-publico`)
- **Finalidade:** apresentar a NZAIDI e a tabela de câmbio do dia.
- **Utilizadores:** qualquer pessoa, sem conta.
- **Dados a que acede:** só informação pública (taxas, serviços, contactos, termos).
- **Ações:** consultar. Nenhuma operação.
- **Segurança:** só leitura. Taxas vêm de uma rota pública da API. Sem dados pessoais.
- **Relações:** `taxas-cambio` (tabela pública).

| Página | Estado |
| --- | --- |
| Início | Confirmado |
| Tabela de câmbio do dia (compra, venda, referência, hora) | Confirmado |
| Serviços | Confirmado |
| Contactos e localização | Confirmado |
| Termos e condições e política de privacidade | Confirmado (texto por escrever) |
| Simulador sem registo | Proposta |
| Parceiros perto de ti | Proposta (depende da área de parceiros) |

## 2. Área do cliente (`apps/cliente`)
- **Finalidade:** o cliente abre conta, valida a identidade, carrega saldo, acompanha operações e gere cartões.
- **Utilizadores:** clientes (pessoas singulares). Empresas: **Pendente**.
- **Dados a que acede:** só os seus.
- **Ações:** registar-se, ligar a conta Wise, pedir cotação, pagar kwanzas, ver histórico e recibos, pedir cartões, gerir o perfil.
- **Segurança:** PIN com sessão que expira; validação no servidor; mensagens neutras em revisão ou recusa (Proposta).
- **Relações:** identidade-kyc, taxas-cambio, pagamentos-aoa, wise, cartoes.

| Página | Estado |
| --- | --- |
| Boas-vindas e registo (nome, BI, PIN) | Confirmado |
| Estado da verificação (verificado, em revisão, recusado) | Confirmado |
| Ligar conta Wise | Confirmado (Condicionado ao acordo com a Wise) |
| Início: saldos por moeda, atividade recente | Confirmado |
| Cotação e carregar saldo | Confirmado |
| Pagamento (Multicaixa Express, referência, transferência) e estado | Confirmado (Condicionado ao fornecedor) |
| Histórico e recibos | Confirmado |
| Cartões: lista, novo, estado, ativação | Confirmado (Condicionado à Wise) |
| Transferências e pagamentos internacionais (interface Wise) | Confirmado (Condicionado à Wise) |
| Perfil e sessão | Confirmado |
| Recuperar PIN, atualizar dados, encerrar conta | Proposta |
| Avisos, apoio e reclamações | Proposta |
| Pedir remessa pela aplicação; vender divisas | Proposta |

## 3. Área administrativa (`apps/admin`)
- **Finalidade:** a equipa decide, controla e reporta.
- **Utilizadores:** atendente, compliance, tesouraria, gestão (ver `07`).
- **Dados a que acede:** conforme o perfil (ver matriz em `07`).
- **Ações:** registar operações, fixar taxas, decidir casos, acompanhar pagamentos e cartões, gerar e submeter reportes.
- **Segurança:** perímetro próprio, autenticação reforçada (Proposta), registo de cada ação (Confirmado).
- **Relações:** todos os módulos.

| Página | Estado |
| --- | --- |
| Painel do dia (operações, casos, estado do reporte BNA) | Confirmado |
| Clientes: lista e ficha única | Confirmado (estado e risco). Ficha única: Proposta |
| Taxas e margens (com pré-visualização) | Confirmado |
| Balcão: registar câmbio e remessa | Confirmado |
| Caixa do balcão (abertura e fecho) | Proposta |
| Remessas | Confirmado (Condicionado aos parceiros) |
| Pagamentos em kwanzas e pagamentos não identificados | Confirmado. Ecrã de não identificados: Proposta |
| Cartões: chegadas, levantamentos | Confirmado (fluxo). Registo de chegada e levantamento: Proposta |
| Compliance: fila de casos e decisão | Confirmado |
| Tesouraria: contas, saldos, posição de divisas | Confirmado (base). Posição de divisas: Proposta |
| Reportes ao BNA: gerar, descarregar, marcar submissão | Confirmado |
| Relatórios de gestão e de compliance | Proposta |
| Parceiros de infraestrutura (fichas) | Confirmado |
| Parceiros comerciais | **Proposta** |
| Utilizadores e perfis | Proposta |
| Auditoria (consulta) | Confirmado |
| Definições e interruptores | Confirmado (princípio) |

## 4. Área dos parceiros (`apps/parceiros`): PROPOSTA, CONDICIONADA
- **Finalidade:** parceiros comerciais aderem, trazem ou apoiam clientes e acompanham os seus ganhos.
- **Utilizadores:** parceiros comerciais, por níveis: captação, apoio presencial, atendimento delegado.
- **Dados a que acede:** só o necessário dos seus clientes (nome, contacto, estado, valor das operações). Nunca alertas de risco, saldos nem documentos completos.
- **Ações:** candidatar-se, gerir perfil, receber e responder a pedidos, acompanhar clientes e consultar ganhos.
- **Segurança:** verificação do parceiro nas mesmas listas dos clientes; nunca fixa preços; limites por nível.
- **Condição:** só avança depois de decisão do negócio e de confirmação do BNA e do advogado para os níveis 2 e 3.

| Página | Estado |
| --- | --- |
| Candidatura | Proposta |
| Painel do parceiro | Proposta |
| Perfil e serviços apresentados | Proposta |
| Pedidos | Proposta |
| Clientes trazidos | Proposta |
| Operações autorizadas | Proposta |
| Ganhos e extrato | Proposta |
| Documentos e contrato | Proposta |

## 5. Como as áreas se ligam
Todas falam com a mesma API e partilham um único registo de clientes, taxas e operações. A administração está no centro: o cliente e o parceiro pedem e acompanham, e a administração decide, controla e reporta. Ver o desenho no PDF de funcionamento (secção 6).
