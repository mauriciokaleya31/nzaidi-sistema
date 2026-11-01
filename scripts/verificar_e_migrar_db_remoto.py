import io
import sys
import paramiko

KEY_PATH = r"C:\Users\Lenovo\.gemini\antigravity\brain\04e17760-ed28-472b-9fff-8f2335a6863d\scratch\test_new_ssh.py"
with open(KEY_PATH, "r", encoding="utf-8") as f:
    text = f.read()

key_str = text.split('KEY_STR = """')[1].split('"""')[0]
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
pkey = paramiko.RSAKey.from_private_key(io.StringIO(key_str), password="?xN1wR5EYbak2TJ{")
client.connect(hostname="65.21.251.206", username="nzaidiao", pkey=pkey, timeout=15)

py_script = """python3 - << 'EOF'
import sqlite3
import datetime

db = sqlite3.connect("/mnt/home102/nzaidiao/api/dados.sqlite")
cur = db.cursor()

cur.execute('''
CREATE TABLE IF NOT EXISTS mobile_config (
    chave TEXT PRIMARY KEY,
    secao TEXT NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    atualizado_em TEXT NOT NULL,
    atualizado_por TEXT
);
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS mobile_banners (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    imagem_url TEXT NOT NULL,
    link_destino TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
);
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS mobile_avisos (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'informativo',
    destinatario TEXT NOT NULL DEFAULT 'todos',
    cliente_id TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    data_inicio TEXT,
    data_fim TEXT,
    criado_em TEXT NOT NULL
);
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS mobile_localizacoes (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    dispositivo_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    cidade TEXT,
    pais TEXT DEFAULT 'AO',
    ip TEXT,
    consentimento INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
);
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS mobile_notificacoes_push (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    destinatario_tipo TEXT NOT NULL,
    cliente_id TEXT,
    plataforma TEXT NOT NULL DEFAULT 'todas',
    agendamento TEXT,
    enviado INTEGER NOT NULL DEFAULT 0,
    enviado_em TEXT,
    sucessos INTEGER NOT NULL DEFAULT 0,
    falhas INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL,
    criado_por TEXT
);
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS mobile_auditoria_config (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    usuario_nome TEXT NOT NULL,
    secao TEXT NOT NULL,
    chave TEXT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    criado_em TEXT NOT NULL
);
''')

cur.execute("SELECT count(*) FROM mobile_config")
count = cur.fetchone()[0]
print("Contagem inicial de mobile_config:", count)

if count == 0:
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    configsIniciais = [
        ("visual_nome_app", "visual", "NZAIDI Mobile", "Nome oficial exibido no cabecalho e ecrã de entrada."),
        ("visual_logo_url", "visual", "/logotipo.png", "URL ou caminho do logotipo institucional."),
        ("visual_cor_primaria", "visual", "#08264F", "Azul NZAIDI Institucional."),
        ("visual_cor_secundaria", "visual", "#D5983E", "Dourado Ouro NZAIDI."),
        ("visual_msg_boas_vindas", "visual", "Bem-vindo a NZAIDI Cambios", "Mensagem de boas-vindas do ecra inicial."),
        ("contactos_telefone", "contactos", "+244 923 123 456", "Linha telefonica principal."),
        ("contactos_whatsapp", "contactos", "+244 923 123 456", "Canal de suporte WhatsApp."),
        ("contactos_email", "contactos", "apoio@nzaidi.ao", "Email de suporte ao cliente."),
        ("contactos_endereco", "contactos", "Rua Rainha Ginga, Maianga, Luanda - Angola", "Endereco fisico Maianga."),
        ("contactos_horario", "contactos", "Segunda a Sexta: 08:30 - 16:30 | Sabados: 09:00 - 13:00", "Horario de atendimento."),
        ("conteudos_sobre", "conteudos", "A NZAIDI e uma instituicao financeira supervisionada pelo BNA.", "Texto Sobre a Instituicao."),
        ("conteudos_termos", "conteudos", "Termos e Condicoes oficiais para utilizacao dos servicos NZAIDI.", "Termos de Uso."),
        ("conteudos_privacidade", "conteudos", "A sua privacidade e os seus dados sao tratados com total sigilo bancario.", "Politica de Privacidade."),
        ("func_cambio_ativo", "funcionalidades", "true", "Disponibilidade de simulacao e pedidos de cambio."),
        ("func_remessas_ativo", "funcionalidades", "true", "Disponibilidade de envio de remessas internacionais."),
        ("func_cartoes_ativo", "funcionalidades", "true", "Disponibilidade da consulta de cartoes Visa."),
        ("func_taxas_ativo", "funcionalidades", "true", "Disponibilidade de consulta de taxas em tempo real."),
        ("func_kyc_ativo", "funcionalidades", "true", "Disponibilidade de submissao de documentos KYC."),
        ("func_suporte_ativo", "funcionalidades", "true", "Disponibilidade do chat de suporte."),
        ("func_notificacoes_ativo", "funcionalidades", "true", "Disponibilidade da central de avisos e notificacoes."),
        ("func_manutencao_geral", "funcionalidades", "false", "Modo de Manutencao Geral (bloqueia o app para todos)."),
        ("func_motivo_manutencao", "funcionalidades", "Estamos a efetuar uma atualizacao no sistema.", "Motivo da manutencao."),
        ("func_previsao_retorno", "funcionalidades", "30 minutos", "Tempo previsto para retorno."),
        ("versoes_android_minima", "versoes", "1.0.0", "Versao minima suportada no Android."),
        ("versoes_android_atual", "versoes", "1.0.0", "Versao mais recente no Google Play Store."),
        ("versoes_android_force_update", "versoes", "false", "Forcar atualizacao no Android."),
        ("versoes_android_store_url", "versoes", "https://play.google.com/store/apps/details?id=ao.nzaidi.mobile", "URL Google Play."),
        ("versoes_ios_minima", "versoes", "1.0.0", "Versao minima suportada no iOS."),
        ("versoes_ios_atual", "versoes", "1.0.0", "Versao mais recente na Apple App Store."),
        ("versoes_ios_force_update", "versoes", "false", "Forcar atualizacao no iOS."),
        ("versoes_ios_store_url", "versoes", "https://apps.apple.com/app/nzaidi-mobile/id123456789", "URL Apple Store."),
        ("versoes_changelog", "versoes", "Lancamento inicial da aplicacao movel NZAIDI.", "Registo de novidades da versao.")
    ]
    cur.executemany("INSERT INTO mobile_config (chave, secao, valor, descricao, atualizado_em, atualizado_por) VALUES (?, ?, ?, ?, ?, ?)", [(c[0], c[1], c[2], c[3], agora, 'sistema') for c in configsIniciais])
    db.commit()
    print("Configuracoes inseridas com sucesso!")

cur.execute("SELECT count(*) FROM mobile_config")
print("Total final de mobile_config:", cur.fetchone()[0])
db.close()
EOF
"""

stdin, stdout, stderr = client.exec_command(py_script)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

# Reiniciar a API para garantir que o Fastify lê os novos dados
client.exec_command("touch /mnt/home102/nzaidiao/api/tmp/restart.txt")
client.close()
print("Sucesso!")
