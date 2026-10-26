import { DatabaseSync } from "node:sqlite";

export interface DatabaseContext {
  db: DatabaseSync;
}

export function inicializarSchema(db: DatabaseSync): void {
  // Ativa chaves estrangeiras e modo WAL
  db.exec("PRAGMA foreign_keys = ON;");

  // Tabela de contadores sequenciais atómicos (evita gaps e autoincremento para borderôs e reportes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS contadores_sequenciais (
      nome TEXT PRIMARY KEY,
      ultimo_valor INTEGER NOT NULL DEFAULT 0
    );
  `);

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
      moeda TEXT PRIMARY KEY CHECK(moeda IN ('USD', 'EUR', 'GBP', 'ZAR')),
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

  // Tabela de parâmetros editáveis do sistema (AML, comissões, interruptores)
  db.exec(`
    CREATE TABLE IF NOT EXISTS parametros_sistema (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('string', 'numero', 'boolean', 'json')),
      categoria TEXT NOT NULL,
      descricao TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      atualizado_por_id TEXT
    );
  `);

  // Inserção idempotente de parâmetros padrão regulamentares (valores de teste marcados)
  const parametrosPadrao: [string, string, string, string, string][] = [
    ["comissao_remessa_aoa", "2500.00", "numero", "remessas", "Comissão fixa por remessa internacional em kwanzas (Parâmetro)"],
    ["comissao_remessa_percentual", "1.50", "numero", "remessas", "Comissão percentual sobre o valor da remessa (Parâmetro)"],
    ["limite_aml_revisao_aoa", "5000000.00", "numero", "compliance", "Limite para caso em revisão AML por operação em kwanzas (Valor de Teste)"],
    ["limite_aml_bloqueio_aoa", "25000000.00", "numero", "compliance", "Limite para bloqueio automático AML por operação em kwanzas (Valor de Teste)"],
    ["moeda_balcao_gbp_ativo", "false", "boolean", "moedas", "Interruptor para permitir operações em GBP no balcão"],
    ["moeda_balcao_zar_ativo", "false", "boolean", "moedas", "Interruptor para permitir operações em ZAR no balcão"],
    ["hora_corte_bna_luanda", "18:30", "string", "bna", "Hora de corte oficial para geração do reporte diário ao BNA (Fuso Africa/Luanda)"],
  ];
  const stmtParametro = db.prepare(`
    INSERT INTO parametros_sistema (chave, valor, tipo, categoria, descricao, atualizado_em)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(chave) DO NOTHING;
  `);
  for (const [chave, valor, tipo, categoria, desc] of parametrosPadrao) {
    stmtParametro.run(chave, valor, tipo, categoria, desc);
  }

  // Clientes e KYC
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

  // Gestão de Caixa e Movimentos
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
      tipo TEXT NOT NULL CHECK(tipo IN ('abertura', 'cambio_entrada', 'cambio_saida', 'suprimento', 'sangria', 'fecho', 'remessa_entrada', 'remessa_saida')),
      moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR', 'GBP', 'ZAR')),
      montante TEXT NOT NULL,
      operacao_id TEXT,
      descricao TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      operador_id TEXT NOT NULL,
      FOREIGN KEY (caixa_id) REFERENCES caixas(id)
    );
    CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_id ON movimentos_caixa(caixa_id);
  `);

  // Operações Cambiais e Borderôs
  db.exec(`
    CREATE TABLE IF NOT EXISTS operacoes_cambio (
      id TEXT PRIMARY KEY,
      numero_operacao TEXT NOT NULL UNIQUE,
      chave_idempotencia TEXT UNIQUE,
      cliente_id TEXT NOT NULL,
      caixa_id TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('compra', 'venda')),
      tipo_operacao_bna TEXT NOT NULL CHECK(tipo_operacao_bna IN ('cambio', 'remessa')) DEFAULT 'cambio',
      sentido_bna TEXT NOT NULL CHECK(sentido_bna IN ('compra', 'venda')) DEFAULT 'compra',
      moeda_divisa TEXT NOT NULL CHECK(moeda_divisa IN ('USD', 'EUR', 'GBP', 'ZAR')),
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
      estado TEXT NOT NULL CHECK(estado IN ('emitido', 'anulado')) DEFAULT 'emitido',
      motivo_anulacao TEXT,
      anulado_em TEXT,
      anulado_por_id TEXT,
      FOREIGN KEY (operacao_id) REFERENCES operacoes_cambio(id)
    );
    CREATE INDEX IF NOT EXISTS idx_borderos_operacao ON borderos(operacao_id);
  `);

  // --- Prioridade 1: Reportes BNA (Suptech e SSIF) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS bna_reportes_diarios (
      id TEXT PRIMARY KEY,
      data_referencia TEXT NOT NULL,
      tipo_mapa TEXT NOT NULL CHECK(tipo_mapa IN ('cambio', 'remessa')),
      formato TEXT NOT NULL DEFAULT 'csv',
      total_operacoes INTEGER NOT NULL DEFAULT 0,
      volume_aoa TEXT NOT NULL DEFAULT '0.00',
      volume_divisa_usd TEXT NOT NULL DEFAULT '0.00',
      volume_divisa_eur TEXT NOT NULL DEFAULT '0.00',
      reporte_zero INTEGER NOT NULL DEFAULT 0,
      estado_suptech TEXT NOT NULL CHECK(estado_suptech IN ('pendente', 'gerado', 'submetido', 'erro')) DEFAULT 'gerado',
      estado_ssif TEXT NOT NULL CHECK(estado_ssif IN ('pendente', 'gerado', 'submetido', 'erro')) DEFAULT 'gerado',
      conteudo_arquivo TEXT NOT NULL,
      nome_arquivo TEXT NOT NULL,
      hash_sha256 TEXT NOT NULL,
      gerado_em TEXT NOT NULL,
      gerado_por_id TEXT NOT NULL,
      gerado_por_nome TEXT NOT NULL,
      submetido_suptech_em TEXT,
      submetido_suptech_por_id TEXT,
      submetido_ssif_em TEXT,
      submetido_ssif_por_id TEXT,
      UNIQUE(data_referencia, tipo_mapa)
    );
    CREATE INDEX IF NOT EXISTS idx_bna_data ON bna_reportes_diarios(data_referencia);

    CREATE TABLE IF NOT EXISTS bna_config_colunas (
      id TEXT PRIMARY KEY,
      tipo_mapa TEXT NOT NULL CHECK(tipo_mapa IN ('cambio', 'remessa')),
      ordem INTEGER NOT NULL,
      nome_coluna TEXT NOT NULL,
      descricao TEXT NOT NULL,
      campo_origem TEXT NOT NULL,
      formato_dado TEXT NOT NULL DEFAULT 'texto',
      ativo INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Inserção inicial de colunas configuráveis padrão para Suptech e SSIF
  const colunasCambioPadrao = [
    ["c_01", "cambio", 1, "DATA_OPERACAO", "Data e hora da operação no fuso de Luanda", "criado_em", "data_hora"],
    ["c_02", "cambio", 2, "NUMERO_BORDERO", "Identificador único sequencial do borderô", "numero_bordero", "texto"],
    ["c_03", "cambio", 3, "CLIENTE_NIF", "Número de Identificação Fiscal do cliente", "cliente_nif", "texto"],
    ["c_04", "cambio", 4, "CLIENTE_NOME", "Nome completo do cliente", "cliente_nome", "texto"],
    ["c_05", "cambio", 5, "TIPO_OPERACAO", "Tipo de transação regulamentar (CAMBIO)", "tipo_operacao_bna", "texto"],
    ["c_06", "cambio", 6, "SENTIDO", "Sentido da transação (COMPRA ou VENDA)", "sentido_bna", "texto"],
    ["c_07", "cambio", 7, "MOEDA_ESTRANGEIRA", "Código ISO da moeda estrangeira", "moeda_divisa", "texto"],
    ["c_08", "cambio", 8, "MONTANTE_DIVISA", "Montante transacionado em moeda estrangeira", "montante_divisa", "decimal"],
    ["c_09", "cambio", 9, "TAXA_CAMBIO", "Taxa de câmbio efetiva aplicada", "taxa_aplicada", "taxa"],
    ["c_10", "cambio", 10, "CONTRAVALOR_AOA", "Montante correspondente em Kwanzas", "montante_aoa", "decimal"],
    ["c_11", "cambio", 11, "OPERADOR_BALCAO", "Nome do operador responsável pelo atendimento", "operador_nome", "texto"]
  ];

  const colunasRemessaPadrao = [
    ["r_01", "remessa", 1, "DATA_REMESSA", "Data e hora do registo da remessa", "criado_em", "data_hora"],
    ["r_02", "remessa", 2, "NUMERO_REMESSA", "Identificador único sequencial da remessa", "numero_remessa", "texto"],
    ["r_03", "remessa", 3, "REMETENTE_NIF", "NIF do ordenante da remessa", "remetente_nif", "texto"],
    ["r_04", "remessa", 4, "REMETENTE_NOME", "Nome completo do ordenante", "remetente_nome", "texto"],
    ["r_05", "remessa", 5, "BENEFICIARIO_NOME", "Nome completo do beneficiário final", "beneficiario_nome", "texto"],
    ["r_06", "remessa", 6, "PAIS_DESTINO", "País de destino da remessa", "beneficiario_pais", "texto"],
    ["r_07", "remessa", 7, "PARCEIRO_EXECUTOR", "Operador parceiro executor (MAXPAY / REALTRANSFERS)", "parceiro", "texto"],
    ["r_08", "remessa", 8, "MOEDA_DESTINO", "Moeda de entrega no destino", "moeda", "texto"],
    ["r_09", "remessa", 9, "VALOR_DIVISA", "Valor a transferir na moeda de destino", "valor_moeda", "decimal"],
    ["r_10", "remessa", 10, "VALOR_AOA", "Contravalor debitado em Kwanzas", "valor_aoa", "decimal"],
    ["r_11", "remessa", 11, "COMISSAO_AOA", "Comissão de serviço cobrada em Kwanzas", "comissao_aoa", "decimal"],
    ["r_12", "remessa", 12, "ESTADO_REMESSA", "Estado regulamentar da remessa", "estado", "texto"]
  ];

  for (const c of [...colunasCambioPadrao, ...colunasRemessaPadrao]) {
    db.exec(`
      INSERT INTO bna_config_colunas (id, tipo_mapa, ordem, nome_coluna, descricao, campo_origem, formato_dado)
      VALUES ('${c[0]}', '${c[1]}', ${c[2]}, '${c[3]}', '${c[4]}', '${c[5]}', '${c[6]}')
      ON CONFLICT(id) DO NOTHING;
    `);
  }

  // --- Prioridade 1: Módulo Remessas Internacionais ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS remessas (
      id TEXT PRIMARY KEY,
      numero_remessa TEXT NOT NULL UNIQUE,
      chave_idempotencia TEXT UNIQUE NOT NULL,
      cliente_remetente_id TEXT NOT NULL,
      remetente_nome TEXT NOT NULL,
      remetente_documento TEXT NOT NULL,
      remetente_nif TEXT NOT NULL,
      beneficiario_nome TEXT NOT NULL,
      beneficiario_pais TEXT NOT NULL,
      beneficiario_banco TEXT NOT NULL,
      beneficiario_conta_iban TEXT NOT NULL,
      moeda TEXT NOT NULL CHECK(moeda IN ('USD', 'EUR', 'GBP', 'ZAR')),
      valor_moeda TEXT NOT NULL,
      taxa_cambio TEXT NOT NULL,
      valor_aoa TEXT NOT NULL,
      comissao_aoa TEXT NOT NULL,
      total_cobrado_aoa TEXT NOT NULL,
      parceiro TEXT NOT NULL CHECK(parceiro IN ('maxpay', 'realtransfers')),
      estado TEXT NOT NULL CHECK(estado IN ('pendente', 'retida', 'aprovada', 'enviada', 'concluida', 'cancelada')) DEFAULT 'pendente',
      motivo_retencao TEXT,
      referencia_parceiro TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      operador_id TEXT NOT NULL,
      operador_nome TEXT NOT NULL,
      caixa_id TEXT,
      motivo_cancelamento TEXT,
      cancelado_em TEXT,
      cancelado_por_id TEXT,
      FOREIGN KEY (cliente_remetente_id) REFERENCES clientes(id),
      FOREIGN KEY (caixa_id) REFERENCES caixas(id)
    );
    CREATE INDEX IF NOT EXISTS idx_remessas_remetente ON remessas(cliente_remetente_id);
    CREATE INDEX IF NOT EXISTS idx_remessas_estado ON remessas(estado);
    CREATE INDEX IF NOT EXISTS idx_remessas_criado_em ON remessas(criado_em);
  `);
}

/**
 * Gera um número sequencial atómico e sem gaps na mesma transação.
 * Se a transação falhar, o contador não avança nem é reutilizado.
 */
export function proximoNumeroSequencial(
  db: DatabaseSync,
  nome: string,
  prefixo: string,
  ano: number = new Date().getFullYear()
): string {
  const chave = `${nome}_${ano}`;
  const insertStmt = db.prepare(
    "INSERT INTO contadores_sequenciais (nome, ultimo_valor) VALUES (?, 0) ON CONFLICT(nome) DO NOTHING;"
  );
  insertStmt.run(chave);
  const updateStmt = db.prepare(
    "UPDATE contadores_sequenciais SET ultimo_valor = ultimo_valor + 1 WHERE nome = ?;"
  );
  updateStmt.run(chave);
  const selectStmt = db.prepare("SELECT ultimo_valor FROM contadores_sequenciais WHERE nome = ?;");
  const res = selectStmt.get(chave) as { ultimo_valor: number };
  const seq = String(res.ultimo_valor).padStart(6, "0");
  return `${prefixo}-${ano}-${seq}`;
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
