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

    -- Módulo C: Gestão Operacional de Tarefas e Filas da Equipa
    CREATE TABLE IF NOT EXISTS tarefas_operacionais (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK(tipo IN ('kyc_dossie', 'pedido_cambio', 'pedido_remessa', 'liquidacao_manual', 'alerta_caixa')),
      referencia_id TEXT NOT NULL,
      responsavel_id TEXT,
      responsavel_nome TEXT,
      prioridade TEXT NOT NULL CHECK(prioridade IN ('urgente', 'alta', 'normal')) DEFAULT 'normal',
      estado TEXT NOT NULL CHECK(estado IN ('pendente', 'em_analise', 'concluida', 'rejeitada')) DEFAULT 'pendente',
      notas TEXT,
      atribuido_em TEXT,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tarefas_tipo_ref ON tarefas_operacionais(tipo, referencia_id);
    CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas_operacionais(responsavel_id);
    CREATE INDEX IF NOT EXISTS idx_tarefas_estado ON tarefas_operacionais(estado);

    -- Módulo D: Contabilidade, Livro de Movimentos e Reconciliação Financeira
    CREATE TABLE IF NOT EXISTS contas_contabeis (
      codigo TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      natureza TEXT NOT NULL CHECK(natureza IN ('devedora', 'credora')),
      tipo TEXT NOT NULL CHECK(tipo IN ('ativo', 'passivo', 'patrimonio', 'proveito', 'custo')),
      moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR', 'MULTI')),
      descricao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_contas_tipo ON contas_contabeis(tipo);

    CREATE TABLE IF NOT EXISTS lancamentos_contabeis (
      id TEXT PRIMARY KEY,
      numero_lancamento TEXT UNIQUE NOT NULL,
      data_movimento TEXT NOT NULL,
      origem_tipo TEXT NOT NULL CHECK(origem_tipo IN (
        'cambio_balcao', 'cambio_online', 'remessa_cliente', 'liquidacao_parceiro',
        'suprimento_caixa', 'sangria_caixa', 'quebra_fecho_caixa', 'sobra_fecho_caixa', 'estorno_operacao'
      )),
      origem_id TEXT NOT NULL,
      descricao TEXT NOT NULL,
      moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR')),
      montante_original TEXT NOT NULL,
      taxa_cambio TEXT,
      contravalor_aoa TEXT NOT NULL,
      estado TEXT NOT NULL CHECK(estado IN ('confirmado', 'estornado')) DEFAULT 'confirmado',
      estornado_em TEXT,
      estorno_lancamento_id TEXT,
      motivo_estorno TEXT,
      operador_id TEXT NOT NULL,
      operador_nome TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      FOREIGN KEY (operador_id) REFERENCES usuarios(id)
    );
    CREATE INDEX IF NOT EXISTS idx_lancamentos_origem ON lancamentos_contabeis(origem_tipo, origem_id);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos_contabeis(data_movimento);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_estado ON lancamentos_contabeis(estado);

    CREATE TABLE IF NOT EXISTS partidas_contabeis (
      id TEXT PRIMARY KEY,
      lancamento_id TEXT NOT NULL,
      conta_codigo TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('D', 'C')),
      montante_original TEXT NOT NULL,
      moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR')),
      montante_aoa TEXT NOT NULL,
      descricao_linha TEXT,
      ordem INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (lancamento_id) REFERENCES lancamentos_contabeis(id) ON DELETE CASCADE,
      FOREIGN KEY (conta_codigo) REFERENCES contas_contabeis(codigo)
    );
    CREATE INDEX IF NOT EXISTS idx_partidas_lancamento ON partidas_contabeis(lancamento_id);
    CREATE INDEX IF NOT EXISTS idx_partidas_conta ON partidas_contabeis(conta_codigo);

    CREATE TABLE IF NOT EXISTS divergencias_reconciliacao (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK(tipo IN (
        'cambio_vs_liquidacao', 'bordero_vs_movimento', 'remessa_vs_parceiro',
        'liquidacao_manual_vs_comprovativo', 'comissao_prevista_vs_apurada', 'caixa_vs_contagem'
      )),
      referencia_id TEXT NOT NULL,
      origem TEXT NOT NULL,
      valor_esperado TEXT NOT NULL,
      valor_observado TEXT NOT NULL,
      moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR')),
      diferenca TEXT NOT NULL,
      estado TEXT NOT NULL CHECK(estado IN ('aberta', 'em_analise', 'resolvida', 'desconsiderada_autorizada')) DEFAULT 'aberta',
      motivo_resolucao TEXT,
      resolvido_por_id TEXT,
      resolvido_por_nome TEXT,
      resolvido_em TEXT,
      criado_em TEXT NOT NULL,
      FOREIGN KEY (resolvido_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_divergencias_tipo ON divergencias_reconciliacao(tipo);
    CREATE INDEX IF NOT EXISTS idx_divergencias_ref ON divergencias_reconciliacao(referencia_id);
    CREATE INDEX IF NOT EXISTS idx_divergencias_estado ON divergencias_reconciliacao(estado);

    CREATE TABLE IF NOT EXISTS taxas_historico (
      id TEXT PRIMARY KEY,
      moeda TEXT NOT NULL CHECK(moeda IN ('USD', 'EUR')),
      referencia TEXT NOT NULL,
      margem_compra TEXT NOT NULL,
      margem_venda TEXT NOT NULL,
      taxa_compra TEXT NOT NULL,
      taxa_venda TEXT NOT NULL,
      fonte TEXT NOT NULL,
      alterado_por_id TEXT,
      alterado_por_nome TEXT,
      motivo TEXT,
      criado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_taxas_hist_moeda ON taxas_historico(moeda);
    CREATE INDEX IF NOT EXISTS idx_taxas_hist_criado ON taxas_historico(criado_em);

    -- =========================================================================
    -- Expansão Backoffice: Notificações, Comunicação, Impersonação e Configs
    -- =========================================================================

    CREATE TABLE IF NOT EXISTS impersonacoes_auditoria (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_nome TEXT NOT NULL,
      alvo_tipo TEXT NOT NULL CHECK(alvo_tipo IN ('usuario', 'cliente', 'parceiro')),
      alvo_id TEXT NOT NULL,
      alvo_nome TEXT NOT NULL,
      motivo TEXT NOT NULL,
      iniciado_em TEXT NOT NULL,
      terminado_em TEXT,
      ip TEXT,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_impersonacoes_admin ON impersonacoes_auditoria(admin_id);
    CREATE INDEX IF NOT EXISTS idx_impersonacoes_alvo ON impersonacoes_auditoria(alvo_id);

    CREATE TABLE IF NOT EXISTS notificacoes_sistema (
      id TEXT PRIMARY KEY,
      destinatario_tipo TEXT NOT NULL CHECK(destinatario_tipo IN ('admin_geral', 'usuario', 'cliente', 'parceiro')),
      destinatario_id TEXT,
      categoria TEXT NOT NULL CHECK(categoria IN ('kyc', 'cambio', 'remessa', 'caixa', 'seguranca', 'sistema', 'comunicacao')),
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      link_acao TEXT,
      lida INTEGER NOT NULL DEFAULT 0,
      lida_em TEXT,
      prioridade TEXT NOT NULL CHECK(prioridade IN ('baixa', 'normal', 'alta', 'critica')) DEFAULT 'normal',
      criado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notificacoes_dest ON notificacoes_sistema(destinatario_tipo, destinatario_id);
    CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes_sistema(lida);

    CREATE TABLE IF NOT EXISTS anuncios_comunicacao (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      imagem_url TEXT,
      destino TEXT NOT NULL CHECK(destino IN ('website', 'portal_cliente', 'portal_parceiro', 'todos')),
      publico_alvo TEXT NOT NULL DEFAULT 'todos',
      estado TEXT NOT NULL CHECK(estado IN ('rascunho', 'agendado', 'publicado', 'arquivado', 'desativado')) DEFAULT 'publicado',
      inicio_em TEXT,
      fim_em TEXT,
      criado_por_id TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_anuncios_destino ON anuncios_comunicacao(destino);
    CREATE INDEX IF NOT EXISTS idx_anuncios_estado ON anuncios_comunicacao(estado);

    CREATE TABLE IF NOT EXISTS dicas_informativas (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      categoria TEXT NOT NULL CHECK(categoria IN ('cambio', 'remessas', 'seguranca', 'educacao_financeira', 'geral')),
      estado TEXT NOT NULL CHECK(estado IN ('rascunho', 'publicado', 'arquivado')) DEFAULT 'publicado',
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_por_id TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dicas_categoria ON dicas_informativas(categoria);
    CREATE INDEX IF NOT EXISTS idx_dicas_estado ON dicas_informativas(estado);

    CREATE TABLE IF NOT EXISTS campanhas_email (
      id TEXT PRIMARY KEY,
      assunto TEXT NOT NULL,
      modelo_html TEXT NOT NULL,
      segmento_alvo TEXT NOT NULL CHECK(segmento_alvo IN ('todos', 'kyc_aprovado', 'kyc_pendente', 'empresas', 'parceiros')),
      estado TEXT NOT NULL CHECK(estado IN ('rascunho', 'agendada', 'enviada', 'cancelada')) DEFAULT 'rascunho',
      total_destinatarios INTEGER NOT NULL DEFAULT 0,
      total_enviados INTEGER NOT NULL DEFAULT 0,
      total_erros INTEGER NOT NULL DEFAULT 0,
      agendada_para TEXT,
      enviada_em TEXT,
      criado_por_id TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_campanhas_estado ON campanhas_email(estado);

    CREATE TABLE IF NOT EXISTS servicos_comunicacao_config (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK(tipo IN ('email', 'sms', 'whatsapp', 'webhook')),
      fornecedor TEXT NOT NULL,
      endpoint TEXT,
      credenciais_json TEXT NOT NULL,
      parametros_json TEXT,
      ambiente TEXT NOT NULL CHECK(ambiente IN ('teste', 'producao')) DEFAULT 'teste',
      ativo INTEGER NOT NULL DEFAULT 0,
      ultimo_teste_em TEXT,
      ultimo_teste_status TEXT,
      ultimo_teste_erro TEXT,
      atualizado_em TEXT NOT NULL,
      atualizado_por_id TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_servicos_tipo ON servicos_comunicacao_config(tipo);
  `);

  // Migrações seguras de colunas adicionais para tabelas existentes
  const migrarColuna = (tabela: string, coluna: string, tipo: string) => {
    try {
      db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo};`);
    } catch {
      // Ignora se a coluna já existir
    }
  };

  migrarColuna("usuarios", "telefone", "TEXT");
  migrarColuna("usuarios", "avatar_url", "TEXT");
  migrarColuna("usuarios", "bloqueado_em", "TEXT");
  migrarColuna("usuarios", "bloqueado_motivo", "TEXT");

  migrarColuna("sessoes", "impersonado_por", "TEXT");
  migrarColuna("sessoes", "impersonado_nome", "TEXT");

  migrarColuna("clientes", "data_nascimento", "TEXT");
  migrarColuna("clientes", "documento_emissao", "TEXT");
  migrarColuna("clientes", "documento_validade", "TEXT");
  migrarColuna("clientes", "profissao", "TEXT");
  migrarColuna("clientes", "entidade_empregadora", "TEXT");
  migrarColuna("clientes", "finalidade_conta", "TEXT");
  migrarColuna("clientes", "pais_residencia", "TEXT DEFAULT 'AO'");
  migrarColuna("clientes", "pep", "INTEGER DEFAULT 0");
  migrarColuna("clientes", "avatar_url", "TEXT");
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
