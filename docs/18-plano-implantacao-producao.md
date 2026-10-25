# Plano de Implantação em Produção — NZAIDI

## 1. Visão Geral

Este documento estabelece o guia oficial de requisitos, configuração de infraestrutura, procedimentos de entrada em operação, segurança operacional e plano de contingência para a plataforma **NZAIDI — Casa de Câmbios & Transferência, Lda.**

---

## 2. Requisitos de Infraestrutura

### 2.1 Servidor e Sistema Operativo
- **Ambiente Recomendado**: Servidor Linux (Ubuntu 24.04 LTS, Debian 12 ou CloudLinux OS v8+ com cPanel e suporte a Node.js 22+ via CloudLinux Node Selector / Passenger).
- **Processador**: 2 vCPUs dedicadas (mínimo).
- **Memória RAM**: 4 GB (mínimo) para suportar os serviços de API, Node.js e rotinas de backup.
- **Armazenamento**: Disco NVMe com pelo menos 40 GB livres, particionado com permissões estritas para a pasta de uploads (`storage/documentos_kyc/`).
- **Segurança de Rede**: Firewall configurado permitindo apenas portas 80 (HTTP com redirecionamento forçado para HTTPS), 443 (HTTPS) e porta SSH restrita por chaves RSA/ED25519 com autenticação por password desativada.

### 2.2 Requisitos de Software
- **Node.js**: Versão 22.x LTS (suporte nativo a `node:sqlite` e ESM).
- **NPM**: Versão 10.x+.
- **Python**: Versão 3.10+ (para execução do script de cópia de segurança e verificação de integridade `scripts/backup.py`).
- **Servidor Web / Reverse Proxy**: Nginx 1.24+ ou Apache 2.4 com `mod_proxy` e certificados SSL emitidos via Let's Encrypt / Certbot.

---

## 3. Arquitetura de Domínios e Distribuição

A plataforma está organizada em três componentes complementares:

| Domínio / Subdomínio | Aplicação | Tecnologia | Destino / Entrega |
| :--- | :--- | :--- | :--- |
| `https://nzaidi.ao` | Website Institucional & Simulador | HTML5 / Vite / TS | `public_html` (Ficheiros estáticos distribuídos com cache HTTP público) |
| `https://app.nzaidi.ao` | Backoffice & Painel Administrativo | SPA / Vite / TS | `subdomains/app` (SPA com rewrite de rotas para `index.html`) |
| `https://api.nzaidi.ao` | API Central e Regras de Negócio | Fastify / TS / Node 22 | Processo local (porta 3000) protegido por Reverse Proxy com proxy_pass |

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
DATABASE_PATH=/var/www/nzaidi/data/nzaidi.sqlite
STORAGE_KYC_PATH=/var/www/nzaidi/storage/documentos_kyc
```

> [!CAUTION]
> O token `ADMIN_INIT_TOKEN` deve ser eliminado ou invalidado imediatamente após a criação do primeiro utilizador com perfil `gestao`.

---

## 5. Procedimento de Implantação Passo a Passo

### Etapa 1: Preparação do Servidor e Código
```bash
# Clonar o repositório oficial
git clone https://github.com/mauriciokaleya31/nzaidi-sistema.git /var/www/nzaidi
cd /var/www/nzaidi

# Instalar dependências estritas
npm ci --omit=dev

# Compilar pacotes e aplicações
npm run build:site
npm run build:admin
npm run build:api
```

### Etapa 2: Estruturação dos Diretórios de Dados e Permissões
```bash
mkdir -p /var/www/nzaidi/data
mkdir -p /var/www/nzaidi/storage/documentos_kyc
mkdir -p /var/www/nzaidi/backups

# Atribuir posse ao utilizador da aplicação
chown -R nzaidi:nzaidi /var/www/nzaidi
chmod 700 /var/www/nzaidi/data
chmod 700 /var/www/nzaidi/storage/documentos_kyc
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

### Etapa 4: Configuração do Reverse Proxy (Nginx)
```nginx
# API Backend
server {
    server_name api.nzaidi.ao;
    listen 443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/api.nzaidi.ao/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nzaidi.ao/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Rotinas de Backup e Recuperação de Desastre (Disaster Recovery)

### 6.1 Agendamento Diário Automático (Cron)
Adicionar ao `crontab` do utilizador de sistema (`crontab -e`):
```cron
# Executa cópia de segurança diariamente às 02:00 UTC
0 2 * * * /usr/bin/python3 /var/www/nzaidi/scripts/backup.py --criar >> /var/log/nzaidi_backup.log 2>&1
```

### 6.2 Teste Periódico de Restauração
Mensalmente, a equipa de infraestrutura deve executar o autoteste de recuperação:
```bash
python3 /var/www/nzaidi/scripts/backup.py --testar
```

---

## 7. Procedimento de Rollback de Versão

Em caso de deteção de anomalia grave pós-publicação:

1. **Parar a API**: `pm2 stop nzaidi-api`.
2. **Restaurar a Base de Dados e Documentos**:
   ```bash
   python3 scripts/backup.py --restaurar backups/nzaidi_backup_ULTIMO_ESTAVEL.tar.gz --destino /var/www/nzaidi
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
