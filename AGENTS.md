# Instruções para agentes de programação e programadores

Lê isto antes de tocar em qualquer ficheiro.

## 1. Ordem de leitura
1. `docs/00-LEIA-ME.md` e `docs/14-estado-atual.md` (onde estamos).
2. `docs/15-decisoes-pendentes.md` e `docs/16-registo-de-decisoes.md` (o que está decidido e o que não está).
3. O documento da área ou do módulo em que vais trabalhar.

## 2. Legenda de estados (usar sempre)
- **Confirmado**: decidido pelo dono do projeto e registado em `docs/16-registo-de-decisoes.md`.
- **Proposta**: sugerido, ainda não aprovado. Não implementar.
- **Condicionado**: depende de terceiros (Wise, BNA, fornecedores, advogado). Só implementar atrás de um interruptor e com adaptador substituível.
- **Pendente**: falta decidir. Está em `docs/15-decisoes-pendentes.md`.

## 3. Regras de trabalho
- Não implementes nada que esteja como Proposta ou Pendente sem aprovação registada.
- Se encontrares contradição ou lacuna, regista em `docs/15-decisoes-pendentes.md` e pára nesse ponto.
- Antes de mudar ou apagar algo existente, percebe a sua finalidade e regista o risco.
- Uma alteração por ramo (`feat/...`, `fix/...`, `docs/...`) e uma revisão antes de juntar a `main`.
- Atualiza `CHANGELOG.md` e `docs/14-estado-atual.md` em cada alteração.
- Não declares que algo foi publicado ou testado sem verificares o resultado.

## 4. Segurança (inegociável)
- Nunca commits de segredos, `.env`, chaves, dados reais de clientes, IBAN completos ou documentos de identidade. Ver `SECURITY.md`.
- Valida tudo no servidor. A aplicação do cliente e a da administração nunca decidem regras.
- Dinheiro em decimal exato, nunca em número de vírgula flutuante.
- Operações financeiras: idempotentes, auditadas e com lançamentos imutáveis.

## 5. Estrutura
Ver `docs/04-estrutura-do-repositorio.md`. Cada módulo da API tem a sua ficha em `apps/api/src/modules/<modulo>/README.md`.
