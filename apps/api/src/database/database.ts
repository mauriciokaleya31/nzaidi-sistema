import { DatabaseSync } from "node:sqlite";

export interface DatabaseContext {
  db: DatabaseSync;
}

export function inicializarSchema(db: DatabaseSync): void {
  // Ativa chaves estrangeiras
  db.exec("PRAGMA foreign_keys = ON;");

  // Tabela de utilizadores internos
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      senha_hash TEXT NOT NULL,
      funcao TEXT NOT NULL CHECK(funcao IN ('atendente', 'compliance', 'tesouraria', 'gestao')),
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      ultimo_login_em TEXT
    );
  `);

  // Tabela de sessões de autenticação
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessoes (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      expira_em TEXT NOT NULL,
      revogado_em TEXT,
      ip TEXT,
      user_agent TEXT,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);
  `);

  // Tabela de auditoria imutável (append-only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id TEXT PRIMARY KEY,
      momento TEXT NOT NULL,
      autor_id TEXT,
      autor_nome TEXT,
      autor_funcao TEXT,
      acao TEXT NOT NULL,
      recurso TEXT NOT NULL,
      recurso_id TEXT,
      detalhes_json TEXT,
      ip TEXT,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_auditoria_momento ON auditoria(momento);
    CREATE INDEX IF NOT EXISTS idx_auditoria_recurso ON auditoria(recurso);
    CREATE INDEX IF NOT EXISTS idx_auditoria_autor ON auditoria(autor_id);
  `);

  // Tabela de configuração e histórico de taxas
  db.exec(`
    CREATE TABLE IF NOT EXISTS taxas_config (
      moeda TEXT PRIMARY KEY CHECK(moeda IN ('USD', 'EUR')),
      referencia TEXT NOT NULL,
      margem_compra TEXT NOT NULL,
      margem_venda TEXT NOT NULL,
      fonte TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      atualizado_por_id TEXT,
      atualizado_por_nome TEXT,
      motivo TEXT
    );
  `);

  // --- Fase 4: Clientes e KYC ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK(tipo IN ('singular', 'colectivo')),
      nome TEXT NOT NULL,
      tipo_documento TEXT NOT NULL CHECK(tipo_documento IN ('bi', 'passaporte', 'cartao_residente', 'nif_empresa')),
      numero_documento TEXT NOT NULL,
      nif TEXT NOT NULL,
      nacionalidade TEXT NOT NULL DEFAULT 'AO',
      telefone TEXT NOT NULL,
      email TEXT,
      morada TEXT NOT NULL,
      estado TEXT NOT NULL CHECK(estado IN ('ativo', 'inativo', 'bloqueado')) DEFAULT 'ativo',
      estado_kyc TEXT NOT NULL CHECK(estado_kyc IN ('pendente', 'em_analise', 'aprovado', 'rejeitado', 'actualizacao_necessaria')) DEFAULT 'pendente',
      nivel_risco TEXT NOT NULL CHECK(nivel_risco IN ('baixo', 'medio', 'alto')) DEFAULT 'baixo',
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      UNIQUE(tipo_documento, numero_documento)
    );
    CREATE INDEX IF NOT EXISTS idx_clientes_nif ON clientes(nif);
    CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
    CREATE INDEX IF NOT EXISTS idx_clientes_estado_kyc ON clientes(estado_kyc);

    CREATE TABLE IF NOT EXISTS kyc_registos (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      estado_anterior TEXT NOT NULL,
      estado_novo TEXT NOT NULL,
      nivel_risco TEXT NOT NULL,
      decidido_por_id TEXT NOT NULL,
      decidido_por_nome TEXT NOT NULL,
      motivo TEXT,
      momento TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_kyc_registos_cliente ON kyc_registos(cliente_id);

    CREATE TABLE IF NOT EXISTS kyc_documentos (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      tipo_documento TEXT NOT NULL,
      nome_arquivo TEXT NOT NULL,
      caminho_seguro TEXT NOT NULL,
      tamanho_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      hash_sha256 TEXT NOT NULL,
      estado_validacao TEXT NOT NULL DEFAULT 'pendente' CHECK(estado_validacao IN ('pendente', 'valido', 'invalido')),
      enviado_em TEXT NOT NULL,
      enviado_por_id TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_kyc_documentos_cliente ON kyc_documentos(cliente_id);
  `);

  // --- Fase 4: Gestão de Caixa e Movimentos ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS caixas (
      id TEXT PRIMARY KEY,
      numero_caixa TEXT NOT NULL UNIQUE,
      operador_id TEXT NOT NULL,
      operador_nome TEXT NOT NULL,
      agencia TEXT NOT NULL DEFAULT 'Balcão Maianga - Sede',
      aberto_em TEXT NOT NULL,
      fechado_em TEXT,
      estado TEXT NOT NULL CHECK(estado IN ('aberto', 'fechado', 'pendente_aprovacao')) DEFAULT 'aberto',
      saldo_inicial_aoa TEXT NOT NULL,
      saldo_inicial_usd TEXT NOT NULL,
      saldo_inicial_eur TEXT NOT NULL,
      saldo_fecho_aoa_contado TEXT,
      saldo_fecho_usd_contado TEXT,
      saldo_fecho_eur_contado TEXT,
      diferenca_aoa TEXT,
      diferenca_usd TEXT,
      diferenca_eur TEXT,
      justificativa_diferenca TEXT,
      fechado_por_id TEXT,
      FOREIGN KEY (operador_id) REFERENCES usuarios(id)
    );
    CREATE INDEX IF NOT EXISTS idx_caixas_operador ON caixas(operador_id);
    CREATE INDEX IF NOT EXISTS idx_caixas_estado ON caixas(estado);

    CREATE TABLE IF NOT EXISTS movimentos_caixa (
      id TEXT PRIMARY KEY,
      caixa_id TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('abertura', 'cambio_entrada', 'cambio_saida', 'suprimento', 'sangria', 'fecho')),
      moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR')),
      montante TEXT NOT NULL,
      operacao_id TEXT,
      descricao TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      operador_id TEXT NOT NULL,
      FOREIGN KEY (caixa_id) REFERENCES caixas(id)
    );
    CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_id ON movimentos_caixa(caixa_id);
  `);

  // --- Fase 4: Operações Cambiais e Borderôs ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS operacoes_cambio (
      id TEXT PRIMARY KEY,
      numero_operacao TEXT NOT NULL UNIQUE,
      chave_idempotencia TEXT UNIQUE,
      cliente_id TEXT NOT NULL,
      caixa_id TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('compra', 'venda')),
      moeda_divisa TEXT NOT NULL CHECK(moeda_divisa IN ('USD', 'EUR')),
      montante_divisa TEXT NOT NULL,
      taxa_aplicada TEXT NOT NULL,
      taxa_referencia_bna TEXT NOT NULL,
      margem_aplicada TEXT NOT NULL,
      montante_aoa TEXT NOT NULL,
      fonte_taxa TEXT NOT NULL CHECK(fonte_taxa IN ('demonstracao', 'oficial')),
      estado TEXT NOT NULL CHECK(estado IN ('confirmada', 'cancelada', 'estornada')) DEFAULT 'confirmada',
      operador_id TEXT NOT NULL,
      operador_nome TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      motivo_estorno TEXT,
      estornado_em TEXT,
      estornado_por_id TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (caixa_id) REFERENCES caixas(id)
    );
    CREATE INDEX IF NOT EXISTS idx_operacoes_cliente ON operacoes_cambio(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_operacoes_caixa ON operacoes_cambio(caixa_id);
    CREATE INDEX IF NOT EXISTS idx_operacoes_criado_em ON operacoes_cambio(criado_em);

    CREATE TABLE IF NOT EXISTS borderos (
      id TEXT PRIMARY KEY,
      numero_bordero TEXT NOT NULL UNIQUE,
      operacao_id TEXT NOT NULL UNIQUE,
      cliente_nome TEXT NOT NULL,
      cliente_documento TEXT NOT NULL,
      cliente_nif TEXT NOT NULL,
      tipo_operacao TEXT NOT NULL,
      moeda_divisa TEXT NOT NULL,
      montante_divisa TEXT NOT NULL,
      taxa_cambio TEXT NOT NULL,
      total_aoa TEXT NOT NULL,
      operador_nome TEXT NOT NULL,
      emitido_em TEXT NOT NULL,
      hash_verificacao TEXT NOT NULL,
      FOREIGN KEY (operacao_id) REFERENCES operacoes_cambio(id)
    );
    CREATE INDEX IF NOT EXISTS idx_borderos_operacao ON borderos(operacao_id);

    -- --- Fase 6: Portal do Cliente (Credenciais, Sessões, Pedidos e Remessas) ---
    CREATE TABLE IF NOT EXISTS clientes_credenciais (
      cliente_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      telefone TEXT,
      senha_hash TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_clientes_credenciais_email ON clientes_credenciais(email);

    CREATE TABLE IF NOT EXISTS sessoes_clientes (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      criado_em TEXT NOT NULL,
      expira_em TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessoes_clientes_token ON sessoes_clientes(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessoes_clientes_cliente ON sessoes_clientes(cliente_id);

    CREATE TABLE IF NOT EXISTS pedidos_cambio (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      tipo_operacao TEXT NOT NULL CHECK(tipo_operacao IN ('compra', 'venda')),
      moeda TEXT NOT NULL CHECK(moeda IN ('USD', 'EUR')),
      montante_divisa TEXT NOT NULL,
      taxa_proposta TEXT NOT NULL,
      total_aoa_estimado TEXT NOT NULL,
      finalidade TEXT NOT NULL,
      estado TEXT NOT NULL CHECK(estado IN ('pendente', 'em_analise', 'aprovado', 'rejeitado', 'concluido', 'cancelado')) DEFAULT 'pendente',
      motivo_rejeicao TEXT,
      operacao_id TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_pedidos_cambio_cliente ON pedidos_cambio(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_pedidos_cambio_estado ON pedidos_cambio(estado);

    CREATE TABLE IF NOT EXISTS pedidos_remessas (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      beneficiario_nome TEXT NOT NULL,
      beneficiario_pais TEXT NOT NULL,
      beneficiario_iban TEXT NOT NULL,
      beneficiario_banco TEXT NOT NULL,
      beneficiario_swift TEXT,
      moeda_destino TEXT NOT NULL CHECK(moeda_destino IN ('USD', 'EUR')),
      montante_divisa TEXT NOT NULL,
      taxa_cambio TEXT NOT NULL,
      comissao_aoa TEXT NOT NULL,
      total_aoa TEXT NOT NULL,
      finalidade TEXT NOT NULL,
      estado TEXT NOT NULL CHECK(estado IN ('pendente_revisao', 'em_processamento', 'executada', 'rejeitada')) DEFAULT 'pendente_revisao',
      motivo_rejeicao TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_pedidos_remessas_cliente ON pedidos_remessas(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_pedidos_remessas_estado ON pedidos_remessas(estado);

    -- Módulo de Parceiros Comerciais
    CREATE TABLE IF NOT EXISTS parceiros (
      id TEXT PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('remessas', 'pagamentos', 'cambio', 'correspondente')),
      canais_suportados TEXT NOT NULL,
      comissao_percentual TEXT NOT NULL DEFAULT '0.50',
      limite_diario_aoa TEXT NOT NULL DEFAULT '50000000.00',
      estado TEXT NOT NULL CHECK(estado IN ('ativo', 'suspenso', 'inativo')) DEFAULT 'ativo',
      chave_api TEXT,
      webhook_url TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_parceiros_codigo ON parceiros(codigo);
    CREATE INDEX IF NOT EXISTS idx_parceiros_estado ON parceiros(estado);

    CREATE TABLE IF NOT EXISTS usuarios_parceiros (
      id TEXT PRIMARY KEY,
      parceiro_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      senha_hash TEXT NOT NULL,
      funcao TEXT NOT NULL CHECK(funcao IN ('operador_parceiro', 'gestor_parceiro')) DEFAULT 'operador_parceiro',
      ativo INTEGER NOT NULL DEFAULT 1,
      ultimo_login_em TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_usuarios_parceiros_parceiro ON usuarios_parceiros(parceiro_id);
    CREATE INDEX IF NOT EXISTS idx_usuarios_parceiros_email ON usuarios_parceiros(email);

    CREATE TABLE IF NOT EXISTS sessoes_parceiros (
      id TEXT PRIMARY KEY,
      parceiro_id TEXT NOT NULL,
      usuario_parceiro_id TEXT NOT NULL,
      expira_em TEXT NOT NULL,
      revogado_em TEXT,
      ip TEXT,
      user_agent TEXT,
      criado_em TEXT NOT NULL,
      FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_parceiro_id) REFERENCES usuarios_parceiros(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessoes_parceiros_parceiro ON sessoes_parceiros(parceiro_id);
    CREATE INDEX IF NOT EXISTS idx_sessoes_parceiros_expira ON sessoes_parceiros(expira_em);

    CREATE TABLE IF NOT EXISTS operacoes_parceiros (
      id TEXT PRIMARY KEY,
      parceiro_id TEXT NOT NULL,
      remessa_id TEXT,
      tipo_operacao TEXT NOT NULL CHECK(tipo_operacao IN ('remessa_saida', 'pagamento_local', 'liquidacao')),
      canal TEXT NOT NULL,
      beneficiario_nome TEXT NOT NULL,
      beneficiario_pais TEXT NOT NULL,
      beneficiario_iban TEXT NOT NULL,
      beneficiario_banco TEXT NOT NULL,
      beneficiario_swift TEXT,
      moeda TEXT NOT NULL CHECK(moeda IN ('USD', 'EUR', 'GBP', 'ZAR', 'AOA')),
      montante TEXT NOT NULL,
      contravalor_aoa TEXT NOT NULL,
      comissao_parceiro_aoa TEXT NOT NULL DEFAULT '0.00',
      estado TEXT NOT NULL CHECK(estado IN ('pendente', 'em_processamento', 'liquidada', 'devolvida', 'cancelada')) DEFAULT 'pendente',
      referencia_externa TEXT,
      comprovativo_hash TEXT,
      comprovativo_arquivo TEXT,
      motivo_devolucao TEXT,
      notas TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      liquidado_em TEXT,
      chave_idempotencia TEXT UNIQUE,
      FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE CASCADE,
      FOREIGN KEY (remessa_id) REFERENCES pedidos_remessas(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_operacoes_parceiros_parceiro ON operacoes_parceiros(parceiro_id);
    CREATE INDEX IF NOT EXISTS idx_operacoes_parceiros_estado ON operacoes_parceiros(estado);
    CREATE INDEX IF NOT EXISTS idx_operacoes_parceiros_canal ON operacoes_parceiros(canal);

    CREATE TABLE IF NOT EXISTS reconciliacoes_parceiros (
      id TEXT PRIMARY KEY,
      parceiro_id TEXT NOT NULL,
      data_referencia TEXT NOT NULL,
      total_instrucoes INTEGER NOT NULL,
      total_conciliadas INTEGER NOT NULL,
      total_divergentes INTEGER NOT NULL,
      volume_total TEXT NOT NULL,
      detalhes_json TEXT,
      criado_em TEXT NOT NULL,
      FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reconciliacoes_parceiros_parceiro ON reconciliacoes_parceiros(parceiro_id);

  `);
}

export function comTransacao<T>(db: DatabaseSync, acao: () => T): T {
  db.exec("BEGIN IMMEDIATE;");
  try {
    const resultado = acao();
    db.exec("COMMIT;");
    return resultado;
  } catch (erro) {
    db.exec("ROLLBACK;");
    throw erro;
  }
}

export function criarConexaoBanco(caminho = ":memory:"): DatabaseSync {
  const db = new DatabaseSync(caminho);
  inicializarSchema(db);
  return db;
}
