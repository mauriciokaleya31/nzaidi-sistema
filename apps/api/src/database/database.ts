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
}

export function criarConexaoBanco(caminho = ":memory:"): DatabaseSync {
  const db = new DatabaseSync(caminho);
  inicializarSchema(db);
  return db;
}
