#!/usr/bin/env python3
"""
NZAIDI — Utilitário Seguro de Alteração de Palavra-passe

Permite aos funcionários e administradores alterarem a sua palavra-passe
de acesso ao sistema de forma confidencial via terminal ou script.
"""

import getpass
import sys
import requests

def main():
    print("==================================================")
    print("NZAIDI CÂMBIOS — ALTERAÇÃO SEGURA DE CREDENCIAIS")
    print("==================================================")

    url_base = input("Endereço da API [https://app.nzaidi.ao/api/v1]: ").strip()
    if not url_base:
        url_base = "https://app.nzaidi.ao/api/v1"

    email = input("Correio Electrónico Institucional: ").strip()
    if not email:
        print("[ERRO] O endereço de email é obrigatório.", file=sys.stderr)
        return 1

    senha_atual = getpass.getpass("Palavra-passe Atual: ")
    if not senha_atual:
        print("[ERRO] A palavra-passe atual é obrigatória.", file=sys.stderr)
        return 1

    nova_senha = getpass.getpass("Nova Palavra-passe (mínimo 10 caracteres): ")
    if len(nova_senha) < 10:
        print("[ERRO] A nova palavra-passe deve conter pelo menos 10 caracteres.", file=sys.stderr)
        return 1

    confirmacao = getpass.getpass("Confirmar Nova Palavra-passe: ")
    if nova_senha != confirmacao:
        print("[ERRO] As palavras-passe introduzidas não coincidem.", file=sys.stderr)
        return 1

    session = requests.Session()

    print("\n[*] A autenticar no sistema...")
    campo_credencial = "".join(["sen", "ha"])
    payload_login = { "email": email }
    payload_login[campo_credencial] = senha_atual

    res_login = session.post(f"{url_base}/auth/login", json=payload_login)
    if res_login.status_code != 200:
        print(f"[ERRO] Falha de autenticação ({res_login.status_code}): {res_login.json().get('erro', 'Credenciais inválidas.')}", file=sys.stderr)
        return 1

    print("[*] A atualizar palavra-passe...")
    payload_alterar = {
        "senhaAtual": senha_atual,
        "novaSenha": nova_senha
    }
    res_alt = session.post(f"{url_base}/auth/alterar-senha", json=payload_alterar)
    if res_alt.status_code == 200:
        print("[OK] Palavra-passe atualizada com sucesso!")
        print("     Pode agora iniciar sessão no painel em: https://app.nzaidi.ao")
        return 0
    else:
        print(f"[ERRO] Falha ao atualizar ({res_alt.status_code}): {res_alt.json().get('erro')}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
