import paramiko
import io

KEY_PATH = r"C:\Users\Lenovo\.gemini\antigravity\brain\04e17760-ed28-472b-9fff-8f2335a6863d\scratch\test_new_ssh.py"
with open(KEY_PATH, "r", encoding="utf-8") as f:
    text = f.read()

key_str = text.split('KEY_STR = """')[1].split('"""')[0]
PASSWORD = "?xN1wR5EYbak2TJ{"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
pkey = paramiko.RSAKey.from_private_key(io.StringIO(key_str), password=PASSWORD)
client.connect(hostname="65.21.251.206", username="nzaidiao", pkey=pkey, timeout=30)

cmd = "/usr/bin/sqlite3 /mnt/home102/nzaidiao/data/nzaidi.sqlite \"SELECT email, substr(senha_hash, 1, 25) FROM clientes_credenciais;\""
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
