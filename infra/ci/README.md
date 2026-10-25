# Integração contínua

`verificar.yml` corre, em cada pull request e em cada envio para a `main`: verificação de tipos, testes e verificação de documentação e segredos.

**Estado: inativo.** O GitHub só aceita ficheiros em `.github/workflows/` enviados por um login com a permissão `workflow`.

Para ativar:
1. No computador do dono do projeto: `gh auth refresh -h github.com -s workflow` (abre o navegador para aprovar).
2. Mover o ficheiro: `git mv infra/ci/verificar.yml .github/workflows/verificar.yml`, fazer commit e enviar.
