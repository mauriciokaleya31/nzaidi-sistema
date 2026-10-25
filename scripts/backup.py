#!/usr/bin/env python3
"""
NZAIDI — Script de Cópia de Segurança e Recuperação de Desastre (Disaster Recovery)

Este script realiza:
1. Cópia de segurança atómica da base de dados SQLite (utilizando VACUUM INTO ou cópia segura).
2. Arquivo dos documentos KYC armazenados em disco (storage/documentos_kyc/).
3. Geração de manifesto de integridade com checksum SHA-256 de todos os elementos.
4. Compactação em arquivo tar.gz / zip com nome carimbado no tempo (ISO 8601).
5. Rotina de validação e restauração em ambiente isolado.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def calcular_sha256(caminho: Path) -> str:
    """Calcula o hash SHA-256 de um ficheiro em blocos de 64KB."""
    sha = hashlib.sha256()
    with caminho.open("rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def criar_backup(
    raiz_projeto: Path,
    caminho_sqlite: Path,
    pasta_storage: Path,
    pasta_destino: Path,
) -> Path:
    """Cria o arquivo de cópia de segurança com banco SQLite e documentos KYC."""
    agora = datetime.now(timezone.utc)
    timestamp_str = agora.strftime("%Y%m%d_%H%M%S")
    pasta_destino.mkdir(parents=True, exist_ok=True)

    nome_base = f"nzaidi_backup_{timestamp_str}"
    arquivo_final = pasta_destino / f"{nome_base}.tar.gz"

    with tempfile.TemporaryDirectory(prefix="nzaidi_bck_") as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        bck_db = tmp_dir / "nzaidi.sqlite"

        # 1. Backup consistente do SQLite (usando API de backup da biblioteca sqlite3)
        if caminho_sqlite.exists():
            con_origem = sqlite3.connect(caminho_sqlite)
            con_destino = sqlite3.connect(bck_db)
            con_origem.backup(con_destino)
            con_destino.close()
            con_origem.close()
            hash_db = calcular_sha256(bck_db)
        else:
            # Caso a base ainda não tenha sido criada no caminho indicado
            bck_db.touch()
            hash_db = calcular_sha256(bck_db)

        # 2. Copiar documentos KYC
        bck_docs = tmp_dir / "documentos_kyc"
        bck_docs.mkdir(parents=True, exist_ok=True)
        docs_hashes: dict[str, str] = {}

        if pasta_storage.exists():
            for item in pasta_storage.glob("*"):
                if item.is_file():
                    destino_item = bck_docs / item.name
                    shutil.copy2(item, destino_item)
                    docs_hashes[item.name] = calcular_sha256(destino_item)

        # 3. Gerar Manifesto
        manifesto = {
            "versao_formato": "1.0",
            "timestamp": agora.isoformat(),
            "projeto": "NZAIDI Casa de Cambios",
            "base_dados": {
                "ficheiro": "nzaidi.sqlite",
                "sha256": hash_db,
                "tamanho_bytes": bck_db.stat().st_size,
            },
            "documentos_kyc": {
                "quantidade": len(docs_hashes),
                "itens": docs_hashes,
            },
        }

        manifesto_path = tmp_dir / "manifesto.json"
        manifesto_path.write_text(json.dumps(manifesto, indent=2, ensure_ascii=False), encoding="utf-8")

        # 4. Compactar em arquivo tar.gz
        with tarfile.open(arquivo_final, "w:gz") as tar:
            tar.add(bck_db, arcname="nzaidi.sqlite")
            tar.add(bck_docs, arcname="documentos_kyc")
            tar.add(manifesto_path, arcname="manifesto.json")

    # Calcula hash do arquivo final
    hash_tar = calcular_sha256(arquivo_final)
    hash_file = pasta_destino / f"{nome_base}.sha256"
    hash_file.write_text(f"{hash_tar}  {arquivo_final.name}\n", encoding="utf-8")

    print(f"[OK] Cópia de segurança criada com sucesso:")
    print(f"     Arquivo: {arquivo_final}")
    print(f"     SHA-256: {hash_tar}")
    print(f"     Documentos incluídos: {len(docs_hashes)}")
    return arquivo_final


def restaurar_backup(arquivo_backup: Path, pasta_destino: Path) -> bool:
    """Verifica e restaura uma cópia de segurança para o destino pretendido."""
    if not arquivo_backup.exists():
        print(f"[ERRO] Ficheiro de backup inexistente: {arquivo_backup}", file=sys.stderr)
        return False

    print(f"[*] A restaurar backup: {arquivo_backup}")
    pasta_destino.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="nzaidi_rst_") as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)

        with tarfile.open(arquivo_backup, "r:gz") as tar:
            try:
                tar.extractall(path=tmp_dir, filter="data")
            except TypeError:
                tar.extractall(path=tmp_dir)

        manifesto_path = tmp_dir / "manifesto.json"
        if not manifesto_path.exists():
            print("[ERRO] Arquivo corrompido: manifesto.json não encontrado.", file=sys.stderr)
            return False

        manifesto = json.loads(manifesto_path.read_text(encoding="utf-8"))

        # Validação do SQLite
        db_extraido = tmp_dir / "nzaidi.sqlite"
        if not db_extraido.exists():
            print("[ERRO] Base de dados nzaidi.sqlite em falta no backup.", file=sys.stderr)
            return False

        hash_db_atual = calcular_sha256(db_extraido)
        if hash_db_atual != manifesto["base_dados"]["sha256"]:
            print(f"[ERRO] Falha de integridade SHA-256 na base de dados SQLite!", file=sys.stderr)
            return False

        # Validação dos ficheiros KYC
        pasta_docs = tmp_dir / "documentos_kyc"
        for nome_doc, sha_esperado in manifesto["documentos_kyc"]["itens"].items():
            doc_file = pasta_docs / nome_doc
            if not doc_file.exists():
                print(f"[ERRO] Ficheiro KYC em falta: {nome_doc}", file=sys.stderr)
                return False
            if calcular_sha256(doc_file) != sha_esperado:
                print(f"[ERRO] Corrupção detetada no ficheiro KYC: {nome_doc}", file=sys.stderr)
                return False

        # Aplicação no destino
        shutil.copy2(db_extraido, pasta_destino / "nzaidi.sqlite")

        destino_kyc = pasta_destino / "storage" / "documentos_kyc"
        destino_kyc.mkdir(parents=True, exist_ok=True)
        if pasta_docs.exists():
            for item in pasta_docs.glob("*"):
                shutil.copy2(item, destino_kyc / item.name)

        print(f"[OK] Restauração concluída e validada em: {pasta_destino}")
        return True


def executar_autoteste(raiz: Path) -> bool:
    """Executa um ciclo completo de cópia e restauração em sandbox temporária."""
    print("[*] Iniciando autoteste de cópia de segurança e recuperação...")
    with tempfile.TemporaryDirectory(prefix="nzaidi_test_") as tmp_str:
        tmp = Path(tmp_str)
        origem = tmp / "origem"
        origem.mkdir()
        storage = origem / "storage" / "documentos_kyc"
        storage.mkdir(parents=True)

        # 1. Cria base SQLite com dados de teste
        db_path = origem / "nzaidi.sqlite"
        con = sqlite3.connect(db_path)
        con.execute("CREATE TABLE teste (id TEXT PRIMARY KEY, valor TEXT);")
        con.execute("INSERT INTO teste VALUES ('1', 'registo_confidencial');")
        con.commit()
        con.close()

        # 2. Cria documento simulado
        doc_path = storage / "doc_test_123.bin"
        doc_path.write_bytes(b"%PDF-1.4\nTeste conteudo homologado de backup.")

        dest_backup = tmp / "backups"
        arquivo_criado = criar_backup(raiz, db_path, storage, dest_backup)

        # 3. Restaura em outro local
        recuperado = tmp / "recuperado"
        sucesso = restaurar_backup(arquivo_criado, recuperado)
        if not sucesso:
            return False

        # 4. Verifica dados recuperados
        con_rec = sqlite3.connect(recuperado / "nzaidi.sqlite")
        cur = con_rec.cursor()
        cur.execute("SELECT valor FROM teste WHERE id = '1'")
        linha = cur.fetchone()
        con_rec.close()

        if not linha or linha[0] != "registo_confidencial":
            print("[ERRO] Dado SQLite recuperado não confere!", file=sys.stderr)
            return False

        doc_rec = recuperado / "storage" / "documentos_kyc" / "doc_test_123.bin"
        if not doc_rec.exists() or doc_rec.read_bytes() != doc_path.read_bytes():
            print("[ERRO] Documento KYC recuperado corrompido!", file=sys.stderr)
            return False

        print("[OK] Autoteste de cópia de segurança e recuperação aprovado a 100%!")
        return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Gestão de Cópia de Segurança NZAIDI")
    parser.add_argument("--criar", action="store_true", help="Cria um novo backup")
    parser.add_argument("--restaurar", type=str, help="Caminho do arquivo .tar.gz a restaurar")
    parser.add_argument("--destino", type=str, default="./recuperacao", help="Pasta de destino para restauração")
    parser.add_argument("--testar", action="store_true", help="Executa o autoteste completo de integridade")

    args = parser.parse_args()
    raiz = Path(__file__).resolve().parent.parent

    if args.testar:
        return 0 if executar_autoteste(raiz) else 1

    caminho_db = raiz / "nzaidi.sqlite"
    caminho_kyc = raiz / "storage" / "documentos_kyc"
    pasta_backups = raiz / "backups"

    if args.criar:
        criar_backup(raiz, caminho_db, caminho_kyc, pasta_backups)
        return 0

    if args.restaurar:
        sucesso = restaurar_backup(Path(args.restaurar), Path(args.destino))
        return 0 if sucesso else 1

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
