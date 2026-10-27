# Módulo: Comunicação e Campanhas

**Pasta:** `apps/api/src/modules/comunicacao`  
**Estado:** **Funcional e Testado**.

## Responsabilidade
- Gestão de anúncios e comunicados institucionais com agendamento e canais de destino (painel interno, portal do cliente e website).
- Gestão de dicas informativas e operacionais para educação financeira e combate a fraudes.
- Gestão e disparo de campanhas de correio eletrónico segmentadas por perfil ou estado KYC com métricas de entrega e visualização.
- Configuração de gateways de comunicação (Email, SMS, WhatsApp Business, Webhooks) e testes diagnósticos com medição de latência.

## Regras de negócio
- Credenciais sensíveis e tokens de API devem ser armazenados de forma encriptada ou mascarada.
- Todos os envios e alterações de campanhas são auditados com identificação do utilizador operador.
- Anúncios desativados ou expirados não devem ser exibidos nas interfaces públicas.

## Depende de
- auditoria
- autenticacao
