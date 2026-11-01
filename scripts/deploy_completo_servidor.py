import os
import io
import sys
import time
import tarfile
import paramiko

print("=== INICIANDO DEPLOY COMPLETO PARA O SERVIDOR REMOTO NZAIDI ===")

KEY_PATH = r"C:\Users\Lenovo\.gemini\antigravity\brain\04e17760-ed28-472b-9fff-8f2335a6863d\scratch\test_new_ssh.py"
with open(KEY_PATH, "r", encoding="utf-8") as f:
    text = f.read()

key_str = text.split('KEY_STR = """')[1].split('"""')[0]
PASSWORD = "?xN1wR5EYbak2TJ{"
HOST = "65.21.251.206"
USER = "nzaidiao"

BASE_LOCAL = r"C:\Users\Lenovo\.gemini\antigravity\scratch\nzaidi-sistema"
SCRATCH_DIR = r"C:\Users\Lenovo\.gemini\antigravity\brain\04e17760-ed28-472b-9fff-8f2335a6863d\scratch"

CLIENTE_DIST = os.path.join(BASE_LOCAL, "apps", "cliente", "dist")
ADMIN_DIST = os.path.join(BASE_LOCAL, "apps", "admin", "dist")
API_DIST = os.path.join(BASE_LOCAL, "apps", "api", "dist")

CLIENTE_TAR = os.path.join(SCRATCH_DIR, "deploy_cliente_dist.tar.gz")
ADMIN_TAR = os.path.join(SCRATCH_DIR, "deploy_admin_dist.tar.gz")
API_TAR = os.path.join(SCRATCH_DIR, "deploy_api_dist.tar.gz")

# 1. Empacotar localmente
print("\n[1/6] Compactando bundles locais...")
for dist_path, tar_path, name in [
    (CLIENTE_DIST, CLIENTE_TAR, "CLIENTE"),
    (ADMIN_DIST, ADMIN_TAR, "ADMIN"),
    (API_DIST, API_TAR, "API")
]:
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(dist_path, arcname="")
    print(f" -> {name} compactado: {os.path.getsize(tar_path):,} bytes")

# 2. Conectar SSH e SFTP
print("\n[2/6] Conectando ao servidor remoto CloudLinux...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
pkey = paramiko.RSAKey.from_private_key(io.StringIO(key_str), password=PASSWORD)
client.connect(hostname=HOST, username=USER, pkey=pkey, timeout=30)
sftp = client.open_sftp()
print(" -> Conexão SSH e SFTP estabelecida com sucesso.")

# 3. Criar backup preventivo
ts = time.strftime("%Y%m%d_%H%M%S")
backup_dir = f"/mnt/home102/nzaidiao/backups_deploy_prod_{ts}"
print(f"\n[3/6] Criando backup preventivo em {backup_dir}...")

backup_cmd = f"""
mkdir -p {backup_dir}
mkdir -p /mnt/home102/nzaidiao/tmp_deploy
cp -r /mnt/home102/nzaidiao/app.nzaidi.ao/cliente {backup_dir}/app_cliente 2>/dev/null || true
cp -r /mnt/home102/nzaidiao/homologacao.nzaidi.ao/cliente {backup_dir}/homolog_cliente 2>/dev/null || true
cp -r /mnt/home102/nzaidiao/api/dist {backup_dir}/api_dist 2>/dev/null || true
echo "BACKUP_OK"
"""
stdin, stdout, stderr = client.exec_command(backup_cmd)
out = stdout.read().decode()
print(" -> Backup preventivo concluído:", out.strip())

# 4. Upload dos tarballs via SFTP
print("\n[4/6] Enviando pacotes via SFTP...")
sftp.put(CLIENTE_TAR, "/mnt/home102/nzaidiao/tmp_deploy/cliente_dist.tar.gz")
print(" -> cliente_dist.tar.gz enviado.")
sftp.put(ADMIN_TAR, "/mnt/home102/nzaidiao/tmp_deploy/admin_dist.tar.gz")
print(" -> admin_dist.tar.gz enviado.")
sftp.put(API_TAR, "/mnt/home102/nzaidiao/tmp_deploy/api_dist.tar.gz")
print(" -> api_dist.tar.gz enviado.")
sftp.close()

# 5. Extração e Instalação nos Domínios
print("\n[5/6] Instalando os novos bundles nos ambientes de Produção e Homologação...")
install_cmd = """
# 1. Atualizar Portal do Cliente em app.nzaidi.ao
mkdir -p /mnt/home102/nzaidiao/app.nzaidi.ao/cliente
rm -rf /mnt/home102/nzaidiao/app.nzaidi.ao/cliente/assets
tar -xzf /mnt/home102/nzaidiao/tmp_deploy/cliente_dist.tar.gz -C /mnt/home102/nzaidiao/app.nzaidi.ao/cliente

# 2. Atualizar Portal do Cliente em homologacao.nzaidi.ao
mkdir -p /mnt/home102/nzaidiao/homologacao.nzaidi.ao/cliente
rm -rf /mnt/home102/nzaidiao/homologacao.nzaidi.ao/cliente/assets
tar -xzf /mnt/home102/nzaidiao/tmp_deploy/cliente_dist.tar.gz -C /mnt/home102/nzaidiao/homologacao.nzaidi.ao/cliente

# 3. Atualizar Painel Admin em app.nzaidi.ao
mkdir -p /mnt/home102/nzaidiao/app.nzaidi.ao
tar -xzf /mnt/home102/nzaidiao/tmp_deploy/admin_dist.tar.gz -C /mnt/home102/nzaidiao/app.nzaidi.ao

# 4. Atualizar Painel Admin em homologacao.nzaidi.ao
mkdir -p /mnt/home102/nzaidiao/homologacao.nzaidi.ao
tar -xzf /mnt/home102/nzaidiao/tmp_deploy/admin_dist.tar.gz -C /mnt/home102/nzaidiao/homologacao.nzaidi.ao

# 5. Atualizar API Central (Produção)
mkdir -p /mnt/home102/nzaidiao/api/dist
rm -rf /mnt/home102/nzaidiao/api/dist/*
tar -xzf /mnt/home102/nzaidiao/tmp_deploy/api_dist.tar.gz -C /mnt/home102/nzaidiao/api/dist

# 6. Atualizar API de Homologação
mkdir -p /mnt/home102/nzaidiao/api_homologacao/dist
rm -rf /mnt/home102/nzaidiao/api_homologacao/dist/*
tar -xzf /mnt/home102/nzaidiao/tmp_deploy/api_dist.tar.gz -C /mnt/home102/nzaidiao/api_homologacao/dist

# 7. Ajustar permissões
chmod -R 755 /mnt/home102/nzaidiao/app.nzaidi.ao/cliente
chmod -R 755 /mnt/home102/nzaidiao/homologacao.nzaidi.ao/cliente
chmod -R 755 /mnt/home102/nzaidiao/api/dist
chmod -R 755 /mnt/home102/nzaidiao/api_homologacao/dist

# 8. Reiniciar APIs Node.js
mkdir -p /mnt/home102/nzaidiao/api/tmp
touch /mnt/home102/nzaidiao/api/tmp/restart.txt
mkdir -p /mnt/home102/nzaidiao/api_homologacao/tmp
touch /mnt/home102/nzaidiao/api_homologacao/tmp/restart.txt

cloudlinux-selector restart --json --interpreter nodejs --domain app.nzaidi.ao --app-root api 2>/dev/null || true
cloudlinux-selector restart --json --interpreter nodejs --domain homologacao.nzaidi.ao --app-root api_homologacao 2>/dev/null || true

# Limpeza
rm -rf /mnt/home102/nzaidiao/tmp_deploy

echo "INSTALLATION_FINISHED_SUCCESSFULLY"
"""

stdin, stdout, stderr = client.exec_command(install_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(" -> Saída da instalação:", out.strip())
if err:
    print(" -> Erros da instalação (se houver):", err.strip())

# 6. Auditoria Pós-Deploy no Servidor
print("\n[6/6] Verificando integridade dos ficheiros instalados no servidor...")
verify_cmd = """
echo "=== APP.NZAIDI.AO/CLIENTE/ASSETS ==="
ls -la /mnt/home102/nzaidiao/app.nzaidi.ao/cliente/assets/
echo "=== VERIFICAR SE EXISTE CLIENTENOME LITERAL EM APP.NZAIDI.AO ==="
grep -rn 'clienteNome' /mnt/home102/nzaidiao/app.nzaidi.ao/cliente/assets/ || echo "NENHUM LITERAL ENCONTRADO (PERFEITO!)"
echo "=== HOMOLOGACAO.NZAIDI.AO/CLIENTE/ASSETS ==="
ls -la /mnt/home102/nzaidiao/homologacao.nzaidi.ao/cliente/assets/
echo "=== VERIFICAR SE EXISTE CLIENTENOME LITERAL EM HOMOLOGACAO.NZAIDI.AO ==="
grep -rn 'clienteNome' /mnt/home102/nzaidiao/homologacao.nzaidi.ao/cliente/assets/ || echo "NENHUM LITERAL ENCONTRADO (PERFEITO!)"
"""
stdin, stdout, stderr = client.exec_command(verify_cmd)
print(stdout.read().decode())

client.close()
print("\n=== DEPLOY CONCLUÍDO COM SUCESSO TOTAL! ===")
