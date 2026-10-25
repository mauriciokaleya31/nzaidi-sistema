# Módulo de Identidade e KYC (`identidade-kyc`)

Módulo responsável pela gestão cadastral de clientes (particulares e empresas), registo documental, classificação de risco e diligência prévia (KYC) em conformidade com as normas do BNA e a Lei n.º 5/20 (AML/CFT).

---

## 1. Responsabilidades

- **Cadastro de Clientes**:
  - Pessoas singulares e colectivas.
  - Identificação oficial por Bilhete de Identidade (BI), Passaporte, Cartão de Residente ou NIF empresarial.
  - Deteção e impedimento automático de registos duplicados (`(tipo_documento, numero_documento)`).
- **Ciclo de Vida KYC**:
  - Estados: `pendente`, `em_analise`, `aprovado`, `rejeitado`, `actualizacao_necessaria`.
  - Níveis de risco configuráveis: `baixo`, `medio`, `alto`.
  - Segregação estrita de funções: Apenas perfis de `compliance` e `gestao` podem emitir decisão formal de aprovação ou rejeição de KYC.
- **Histórico e Auditoria**:
  - Todas as decisões KYC são gravadas na tabela `kyc_registos` e na pista imutável de auditoria com autor, data/hora, motivo e IP de origem.

---

## 2. Endpoints Disponíveis

| Método | Endpoint | Permissão Mínima | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/clientes` | `clientes:criar` | Registar novo cliente com verificação de duplicados |
| `GET` | `/api/v1/clientes` | `clientes:consultar` | Listar clientes com filtros, busca textual e paginação |
| `GET` | `/api/v1/clientes/:id` | `clientes:consultar` | Obter ficha detalhada do cliente |
| `POST` | `/api/v1/clientes/:id/kyc` | `kyc:analisar` | Submeter decisão de aprovação, recusa ou revisão KYC |
| `GET` | `/api/v1/clientes/:id/kyc/historico`| `clientes:consultar` | Consultar histórico de decisões KYC do cliente |
| `POST` | `/api/v1/clientes/:id/documentos` | `clientes:criar` | Carregar ficheiro de documento KYC com verificação de magic bytes (PDF, PNG, JPEG, máx. 5MB) |
| `GET` | `/api/v1/clientes/:id/documentos` | `clientes:consultar` | Listar ficheiros documentais associados ao cliente com hashes SHA-256 |
| `GET` | `/api/v1/clientes/:id/documentos/:docId/download` | `clientes:consultar` | Transferência segura de documento com verificação de integridade criptográfica |
