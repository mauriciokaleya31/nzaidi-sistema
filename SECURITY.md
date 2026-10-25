# Segurança

Este projeto trata de serviços financeiros e dados pessoais. As regras abaixo valem para todo o repositório.

## O que nunca entra no Git
- Palavras-passe, PIN, tokens (Wise, pagamentos, remessas), chaves privadas, segredos de webhook.
- Ficheiros `.env` com valores reais.
- Documentos de identidade, fotografias, dados reais de clientes, extratos.
- IBAN e números de conta completos, números de BI, NIF de pessoas.
- Cópias da base de dados e ficheiros de reportes reais.

Se algo disto for publicado por engano: considerar o segredo comprometido, **trocá-lo de imediato** e só depois limpar o histórico.

## Repositório
- Deve ser **privado**.
- Ramo `main` protegido: alterações só por revisão.
- Ativar verificação de segredos e de dependências no repositório.

## Como comunicar um problema de segurança
Falar diretamente com a gestão da NZAIDI. Não abrir uma issue pública com detalhes.

## Regras técnicas
Ver `docs/08-autenticacao-e-seguranca.md`.
