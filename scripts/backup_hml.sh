#!/bin/bash
set -euo pipefail

DB_FILE="/mnt/home102/nzaidiao/storage_hml/nzaidi_hml.sqlite"
BACKUP_DIR="/mnt/home102/nzaidiao/storage_hml/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nzaidi_hml_${TIMESTAMP}.sqlite"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Backup online atómico SQLite (não bloqueia leituras ou escritas)
sqlite3 "${DB_FILE}" ".backup '${BACKUP_FILE}'"
chmod 600 "${BACKUP_FILE}"

# Compactar com gzip para poupar espaço
gzip -9 "${BACKUP_FILE}"

# Manter os últimos 14 backups diários, removendo os mais antigos
find "${BACKUP_DIR}" -name "nzaidi_hml_*.sqlite.gz" -type f -mtime +14 -delete

echo "[OK] Backup criado com sucesso: ${BACKUP_FILE}.gz"
