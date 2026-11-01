# Módulo NZAIDI Mobile & Gestão de Aplicações

## Responsabilidade
Este módulo gere toda a interface com a aplicação móvel **NZAIDI Mobile** (Android e iOS) e as ferramentas administrativas de monitorização e segurança na retaguarda.

## Componentes Principais
1. **`mobile.routes.ts`**: Endpoints sob `/api/v1/mobile/*` para autenticação, perfil, dashboard, câmbios, remessas e cartões.
2. **`mobile-admin.routes.ts`**: Endpoints sob `/api/v1/admin/mobile/*` para telemetria em tempo real, gestão de dispositivos, bloqueio remoto e auditoria.
3. **`mobile.service.ts`**: Lógica de negócio, rotação atómica de refresh tokens, detecção de reúso malicioso e diagnóstico de saúde dos serviços.
4. **`mobile.repository.ts`**: Persistência SQLite nas tabelas `dispositivos_moveis`, `sessoes_mobile`, `api_requisicoes_log`, `mobile_config` e `mobile_alertas`.
5. **`mobile.types.ts`**: Esquemas de validação Zod e contratos de tipagem TypeScript.
