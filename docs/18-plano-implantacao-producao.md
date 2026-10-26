# Plano de Implantação em Produção — NZAIDI

## 1. Visão Geral

Este documento estabelece o guia oficial de requisitos, configuração de infraestrutura, procedimentos de entrada em operação, segurança operacional e plano de contingência para a plataforma **NZAIDI — Casa de Câmbios & Transferência, Lda.**

---

## 2. Requisitos de Infraestrutura

### 2.1 Servidor e Sistema Operativo
- **Ambiente**: alojamento: cPanel partilhado.
- **Processador**: 2 vCPUs (mínimo).
- **Memória RAM**: 4 GB (mínimo) para suportar os serviços de API, Node.js e rotinas de backup.
- **Armazenamento**: Disco rápido particionado com permissões estritas para a pasta de uploads (`storage/documentos_kyc/`).
- **Acesso Remoto**: SSH por chave.

### 2.2 Requisitos de Software
- **Node.js**: Versão 22.x LTS (suporte nativo a `node:sqlite` e ESM).
- **NPM**: Versão 10.x+.
- **Python**: Versão 3.10+ (para execução do script de cópia de segurança e verificação de integridade `scripts/backup.py`).
- **Servidor Web / Reverse Proxy**: Nginx ou Apache com certificados SSL emitidos.

---

## 3. Arquitetura de Domínios e Distribuição

A plataforma está organizada em três componentes complementares:

| Domínio / Subdomínio | Aplicação | Tecnologia | Destino / Entrega |
| :--- | :--- | :--- | :--- |
| `https://nzaidi.ao` | Website Institucional & Simulador | HTML5 / Vite / TS | Diretório do website público (Ficheiros estáticos distribuídos com cache HTTP público) |
| `https://app.nzaidi.ao` | Backoffice & Painel Administrativo | SPA / Vite / TS | Subdomínio de gestão (SPA com rewrite de rotas para `index.html`) |
| `https://api.nzaidi.ao` | API Central e Regras de Negócio | Fastify / TS / Node 22 | Processo local protegido por Reverse Proxy com proxy_pass |

---

## 4. Variáveis de Ambiente e Segredos

As variáveis de ambiente devem ser configuradas exclusivamente através de ficheiro `.env` com permissões de leitura estritas (`chmod 600 .env`):

```bash
# Ambiente
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# Segurança e Sessão
COOKIE_SECRET=gere_uma_chave_aleatoria_com_pelo_menos_64_caracteres_hexadecimais
SESSION_TTL_HOURS=8

# Bootstrap e Inicialização
ADMIN_INIT_TOKEN=token_seguro_temporario_utilizado_apenas_para_criar_o_primeiro_admin

# CORS (origens autorizadas com envio de credenciais)
CORS_ORIGIN=https://nzaidi.ao,https://app.nzaidi.ao

# Armazenamento e Base de Dados
DATABASE_PATH=./data/nzaidi.sqlite
STORAGE_KYC_PATH=./storage/documentos_kyc
```

> [!CAUTION]
> O token `ADMIN_INIT_TOKEN` deve ser eliminado ou invalidado imediatamente após a criação do primeiro utilizador com perfil `gestao`.

---

## 5. Procedimento de Implantação Passo a Passo

### Etapa 1: Preparação do Código
```bash
# Clonar o repositório oficial
git clone https://github.com/mauriciokaleya31/nzaidi-sistema.git app
cd app

# Instalar dependências estritas
npm ci --omit=dev

# Compilar pacotes e aplicações
npm run build:site
npm run build:admin
npm run build:api
```

### Etapa 2: Estruturação dos Diretórios de Dados e Permissões
```bash
mkdir -p data
mkdir -p storage/documentos_kyc
mkdir -p backups

chmod 700 data
chmod 700 storage/documentos_kyc
```

### Etapa 3: Gestão de Processos com PM2 / Systemd
Exemplo de configuração para `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [{
    name: 'nzaidi-api',
    script: 'apps/api/dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env',
    max_memory_restart: '500M',
    restart_delay: 3000,
  }]
};
```
Iniciar o processo:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Etapa 4: Configuração do Reverse Proxy
```nginx
# API Backend
server {
    server_name api.nzaidi.ao;
    listen 443 ssl http2;

    ssl_certificate /caminho/para/certificados/fullchain.pem;
    ssl_certificate_key /caminho/para/certificados/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Rotinas de Backup e Recuperação de Desastre (Disaster Recovery)

### 6.1 Agendamento Diário Automático (Cron)
Adicionar ao agendador de tarefas:
```cron
# Executa cópia de segurança diariamente às 02:00 UTC
0 2 * * * python3 scripts/backup.py --criar >> logs/nzaidi_backup.log 2>&1
```

### 6.2 Teste Periódico de Restauração
Mensalmente, a equipa de infraestrutura deve executar o autoteste de recuperação:
```bash
python3 scripts/backup.py --testar
```

### 6.3 Agendamento Automático dos Reportes BNA às 18:30 (cPanel / Cron)

Conforme a regulamentação cambial do Banco Nacional de Angola (BNA), a casa de câmbios deve apurar o fecho diário de câmbio e de remessas e submeter os respetivos mapas às plataformas Suptech e SSIF até à hora de corte oficial (18:30, horário de Luanda / Africa/Luanda).

No cPanel (menu **Cron Jobs / Tarefas Agendadas**), configure a execução diária às 18:30:

- **Minuto**: `30`
- **Hora**: `18`
- **Dia do Mês**: `*`
- **Mês**: `*`
- **Dia da Semana**: `*`
- **Comando**:
```bash
cd /caminho/do/projeto && npm run cron:bna >> storage/logs/cron_bna.log 2>&1
```

**Comportamento da Rotina Automática**:
1. **Recuperação de Dias em Atraso**: Ao iniciar, verifica se existem datas anteriores com operações concluídas sem mapas gerados e procede à geração imediata.
2. **Geração dos Mapas de Câmbio e Remessa**: Extrai todas as transações da data de corte e compõe os ficheiros formatados.
3. **Reporte a Zero Obrigatório**: Se não houver operações no dia, gera automaticamente mapas declarativos com montante zero, prevenindo sanções e processos de contraordenação do supervisor.
4. **Registo na Pista de Auditoria**: Cada execução é gravada com `autor_id = sistema_cron_bna` e ação `BNA_CRON_ROTINA_EXECUTADA`.
5. **Monitorização Visual**: Se às 18:35 o mapa do dia ainda não tiver sido emitido, a Visão Geral (Dashboard) ativa um aviso de emergência regulatória visível aos operadores e à gestão.

---

## 7. Procedimento de Rollback de Versão

Em caso de deteção de anomalia grave pós-publicação:

1. **Parar a API**: `pm2 stop nzaidi-api`.
2. **Restaurar a Base de Dados e Documentos**:
   ```bash
   python3 scripts/backup.py --restaurar backups/nzaidi_backup_ULTIMO_ESTAVEL.tar.gz --destino ./
   ```
3. **Reverter a Versão Git**:
   ```bash
   git checkout <TAG_OU_COMMIT_ANTERIOR>
   npm run build:site
   npm run build:admin
   ```
4. **Reiniciar a API e Verificar Logs**:
   ```bash
   pm2 restart nzaidi-api --update-env
   pm2 logs nzaidi-api --lines 50
   ```

---

## 8. Ressalvas Regulatórias e Limitações Legais

> [!IMPORTANT]
> **Aviso de Conformidade Regulatória**:
> 1. A existência e correto funcionamento do código-fonte, das rotinas de cálculo cambial e das validações KYC **não outorgam, por si só, autorização legal ou licença para exercício de atividade cambial**.
> 2. O início de operações comerciais depende obrigatoriamente de:
>    - Licenciamento formal e registo prévio junto do **Banco Nacional de Angola (BNA)** nos termos da Lei cambial e regulamentos aplicáveis.
>    - Notificação e enquadramento junto da **Unidade de Informação Financeira (UIF)** de Angola.
>    - Aprovação e promulgação do **Manual Interno de Prevenção ao Branqueamento de Capitais e Combate ao Financiamento do Terrorismo (PLD/CFT)**.
>    - Nomeação e homologação do Oficial de Conformidade (Compliance Officer).
>    - Vistoria e certificação física das instalações, cofres e balcões de atendimento.
