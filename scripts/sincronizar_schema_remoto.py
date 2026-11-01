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

for db_path in ["/mnt/home102/nzaidiao/api/dados.sqlite", "/mnt/home102/nzaidiao/api_homologacao/dados.sqlite"]:
    try:
        db = sqlite3.connect(db_path)
        cur = db.cursor()

        cur.execute("DROP TABLE IF EXISTS mobile_banners;")
        cur.execute('''
        CREATE TABLE IF NOT EXISTS mobile_banners (
            id TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            imagem_url TEXT NOT NULL,
            link_acao TEXT,
            ordem INTEGER NOT NULL DEFAULT 0,
            ativo INTEGER NOT NULL DEFAULT 1,
            criado_em TEXT NOT NULL,
            atualizado_em TEXT NOT NULL
        );
        ''')

        cur.execute("DROP TABLE IF EXISTS mobile_avisos;")
        cur.execute('''
        CREATE TABLE IF NOT EXISTS mobile_avisos (
            id TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            categoria TEXT NOT NULL CHECK(categoria IN ('informativo', 'importante', 'urgente')),
            posicao TEXT NOT NULL CHECK(posicao IN ('dashboard', 'ecra_inicial', 'notificacao', 'todos')),
            prioridade INTEGER NOT NULL DEFAULT 1,
            inicio_em TEXT NOT NULL,
            fim_em TEXT NOT NULL,
            ativo INTEGER NOT NULL DEFAULT 1,
            criado_por TEXT,
            criado_em TEXT NOT NULL
        );
        ''')

        cur.execute("DROP TABLE IF EXISTS mobile_localizacoes;")
        cur.execute('''
        CREATE TABLE IF NOT EXISTS mobile_localizacoes (
            id TEXT PRIMARY KEY,
            cliente_id TEXT NOT NULL,
            dispositivo_id TEXT,
            consentimento INTEGER NOT NULL DEFAULT 1,
            cidade TEXT,
            regiao TEXT,
            pais TEXT DEFAULT 'Angola',
            latitude REAL,
            longitude REAL,
            ip TEXT,
            precisao_metros REAL,
            criado_em TEXT NOT NULL,
            atualizado_em TEXT NOT NULL
        );
        ''')

        cur.execute("DROP TABLE IF EXISTS mobile_notificacoes_push;")
        cur.execute('''
        CREATE TABLE IF NOT EXISTS mobile_notificacoes_push (
            id TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            plataforma_alvo TEXT NOT NULL CHECK(plataforma_alvo IN ('todas', 'android', 'ios')),
            segmento TEXT NOT NULL DEFAULT 'todos',
            total_destinatarios INTEGER NOT NULL DEFAULT 0,
            total_entregas INTEGER NOT NULL DEFAULT 0,
            total_falhas INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL CHECK(status IN ('pendente', 'enviado', 'falha')),
            enviado_por TEXT NOT NULL,
            enviado_em TEXT NOT NULL
        );
        ''')

        cur.execute("DROP TABLE IF EXISTS mobile_auditoria_config;")
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

        db.commit()
        db.close()
        print(f"Schema sincronizado com sucesso em {db_path}!")
    except Exception as e:
        print(f"Erro em {db_path}: {e}")
EOF
"""

stdin, stdout, stderr = client.exec_command(py_script)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
client.close()
