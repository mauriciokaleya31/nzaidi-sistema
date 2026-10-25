#!/usr/bin/env python3
"""Verifica a documentação do repositório NZAIDI.

1. Todas as ligações relativas em ficheiros .md apontam para ficheiros que existem.
2. Os documentos obrigatórios existem.
3. Não há padrões de segredos nem de dados pessoais (IBAN angolano, BI, chaves, tokens).
4. .gitignore bloqueia ficheiros de segredos.
5. Cada módulo da API tem ficha README.

Uso: python3 scripts/verificar-documentacao.py
Sai com código 1 se encontrar problemas.
"""
import os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
problemas = []

OBRIGATORIOS = [
    "README.md", "AGENTS.md", "SECURITY.md", "CHANGELOG.md", ".gitignore", "config/env.example",
    "docs/00-LEIA-ME.md", "docs/01-visao-geral-e-objetivos.md", "docs/02-negocio/README.md",
    "docs/03-arquitetura-geral.md", "docs/04-estrutura-do-repositorio.md",
    "docs/05-modulos-e-responsabilidades.md", "docs/06-areas-e-paginas.md",
    "docs/07-contas-e-permissoes.md", "docs/08-autenticacao-e-seguranca.md",
    "docs/09-modelo-de-dados.md", "docs/10-regras-financeiras.md", "docs/11-integracoes.md",
    "docs/12-plano-de-testes.md", "docs/13-plano-de-execucao.md", "docs/14-estado-atual.md",
    "docs/15-decisoes-pendentes.md", "docs/16-registo-de-decisoes.md", "docs/17-passagem-para-claude-code.md", "CLAUDE.md", "docs/adr/README.md",
]
for f in OBRIGATORIOS:
    if not os.path.isfile(os.path.join(RAIZ, f)):
        problemas.append(f"Falta o ficheiro obrigatório: {f}")

# 1. Ligações relativas
re_link = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
for pasta, dirs, ficheiros in os.walk(RAIZ):
    dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
    for nome in ficheiros:
        if not nome.endswith(".md"):
            continue
        caminho = os.path.join(pasta, nome)
        texto = open(caminho, encoding="utf-8").read()
        for alvo in re_link.findall(texto):
            if alvo.startswith(("http://", "https://", "mailto:", "#")):
                continue
            alvo = alvo.split("#")[0]
            if not alvo:
                continue
            destino = os.path.normpath(os.path.join(pasta, alvo))
            if not os.path.exists(destino):
                problemas.append(f"Ligação quebrada em {os.path.relpath(caminho, RAIZ)}: {alvo}")

# 3. Segredos e dados pessoais (só em ficheiros de texto)
padroes = {
    "IBAN angolano": re.compile(r"\bAO\s?\d{2}[\s\d]{15,}"),
    "N.º de BI": re.compile(r"\b\d{9}[A-Z]{2}\d{3}\b"),
    "Chave privada": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "Chave privada OpenSSH (corpo)": re.compile("b3BlbnNz" + "aC1rZXktdjE"),  # "openssh-key-v1" em base64, partido para não se detetar a si próprio
    "Token comum": re.compile(r"\b(?:sk_live|sk_test|ghp_|gho_|AKIA)[A-Za-z0-9_]{8,}"),
    "Palavra-passe atribuída": re.compile(r"(?i)\b(?:password|senha|secret|segredo)\s*[:=]\s*[\"']?[A-Za-z0-9!@#$%^&*]{8,}"),
}
for pasta, dirs, ficheiros in os.walk(RAIZ):
    dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "dist")]
    for nome in ficheiros:
        if nome.lower().endswith((".pdf", ".png", ".jpg", ".webp", ".zip")):
            continue
        caminho = os.path.join(pasta, nome)
        try:
            texto = open(caminho, encoding="utf-8").read()
        except Exception:
            continue
        for rotulo, rx in padroes.items():
            if rx.search(texto):
                problemas.append(f"Possível {rotulo} em {os.path.relpath(caminho, RAIZ)}")

# 4. .gitignore
gi = open(os.path.join(RAIZ, ".gitignore"), encoding="utf-8").read()
for item in (".env", "*.pem", "*.key", "node_modules/"):
    if item not in gi:
        problemas.append(f".gitignore não bloqueia {item}")

# 5. Fichas de módulos
base = os.path.join(RAIZ, "apps/api/src/modules")
for m in sorted(os.listdir(base)):
    if not os.path.isfile(os.path.join(base, m, "README.md")):
        problemas.append(f"Módulo sem ficha: {m}")

if problemas:
    print(f"{len(problemas)} problema(s):")
    for p in problemas:
        print(" -", p)
    sys.exit(1)
print("OK: documentação consistente, sem segredos nem dados pessoais detetados.")
