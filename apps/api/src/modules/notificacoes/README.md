# Módulo: Notificações do Sistema

**Pasta:** `apps/api/src/modules/notificacoes`  
**Estado:** **Funcional e Testado**.

## Responsabilidade
- Centralização de alertas, avisos e eventos operacionais para utilizadores internos e administradores.
- Controlo de estado de leitura individual e em massa.
- Classificação por prioridade (baixa, normal, alta, urgente) e categoria (operacional, seguranca, compliance, financeiro, sistema).
- Contadores em tempo real para alimentação de distintivos no cabeçalho e dropdowns rápidos.

## Regras de negócio
- Notificações de segurança e compliance têm prioridade elevada.
- Cada utilizador apenas marca como lida as suas próprias notificações ou notificações globais atribuídas.

## Depende de
- autenticacao
