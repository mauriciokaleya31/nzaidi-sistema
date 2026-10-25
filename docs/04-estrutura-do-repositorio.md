# 04. Estrutura do repositório

**Estado: Criado nesta etapa (estrutura sem código).**

```
nzaidi-sistema/
├── README.md                    Visão e arranque
├── AGENTS.md                    Regras para agentes e programadores
├── SECURITY.md                  Regras de segurança do repositório
├── CHANGELOG.md                 Registo de alterações
├── .gitignore                   Bloqueia segredos, dados e cópias
├── config/
│   └── env.example              Modelo de variáveis (sem valores reais)
├── apps/
│   ├── api/                     Servidor com todas as regras de negócio
│   │   └── src/modules/         15 módulos (uma pasta cada, com README)
│   ├── cliente/                 Área do cliente
│   ├── admin/                   Área administrativa
│   ├── parceiros/               Área dos parceiros (PROPOSTA, condicionada)
│   └── site-publico/            Site institucional
├── packages/                    Código partilhado (tipos, validações)
├── infra/                       Ambientes, cópias de segurança, recuperação
├── scripts/
│   └── verificar-documentacao.py
├── tests/                       Aceitação, segurança, integridade financeira
└── docs/                        Documentação oficial (índice em docs/00-LEIA-ME.md)
    ├── 02-negocio/referencias/  PDF de funcionamento
    └── adr/                     Decisões de arquitetura (propostas)
```

## Regras
- Uma pasta por módulo da API. Uma ficha `README.md` em cada.
- Nada de código partilhado copiado entre aplicações: vai para `packages/`.
- Código antigo (ver `14-estado-atual.md`) só entra no repositório **com revisão**, numa fase própria (Fase 1), e nunca por cima de ficheiros existentes.
- Estrutura **Proposta**: pode ser ajustada na validação, antes da Fase 1.
