import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  ExecucaoIntegracaoManual,
  CriarExecucaoManualDTO,
  EstadoExecucaoManual,
  CanalOrigemManual,
  TipoIntegracaoManual,
} from "./integracoes-manuais.types.js";

interface ExecucaoRow {
  id: string;
  transacao_id: string;
  tipo_integracao: string;
  canal_origem: string;
  referencia_externa: string;
  valor_moeda: string;
  moeda: string;
  estado: string;
  operador_id: string;
  operador_nome: string;
  operador_funcao: string;
  aprovador_id: string | null;
  aprovador_nome: string | null;
  momento_execucao: string;
  momento_aprovacao: string | null;
  comprovativo_arquivo: string | null;
  comprovativo_hash_sha256: string | null;
  notas: string | null;
  chave_idempotencia: string;
}

function mapearExecucao(r: ExecucaoRow): ExecucaoIntegracaoManual {
  return {
    id: r.id,
    transacaoId: r.transacao_id,
    tipoIntegracao: r.tipo_integracao as TipoIntegracaoManual,
    canalOrigem: r.canal_origem as CanalOrigemManual,
    referenciaExterna: r.referencia_externa,
    valorMoeda: r.valor_moeda,
    moeda: r.moeda as "AOA" | "USD" | "EUR" | "GBP" | "ZAR",
    estado: r.estado as EstadoExecucaoManual,
    operadorId: r.operador_id,
    operadorNome: r.operador_nome,
    operadorFuncao: r.operador_funcao,
    aprovadorId: r.aprovador_id,
    aprovadorNome: r.aprovador_nome,
    momentoExecucao: r.momento_execucao,
    momentoAprovacao: r.momento_aprovacao,
    comprovativoArquivo: r.comprovativo_arquivo,
    comprovativoHashSha256: r.comprovativo_hash_sha256,
    notas: r.notas,
    chaveIdempotencia: r.chave_idempotencia,
  };
}

export class IntegracoesManuaisRepository {
  constructor(private db: DatabaseSync) {
    this.inicializarSchema();
  }

  private inicializarSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS execucoes_integracao_manual (
        id TEXT PRIMARY KEY,
        transacao_id TEXT NOT NULL,
        tipo_integracao TEXT NOT NULL CHECK(tipo_integracao IN ('remessa_parceiro', 'recebimento_kwanza', 'liquidacao_wise', 'ajuste_conciliacao')),
        canal_origem TEXT NOT NULL,
        referencia_externa TEXT NOT NULL,
        valor_moeda TEXT NOT NULL,
        moeda TEXT NOT NULL CHECK(moeda IN ('AOA', 'USD', 'EUR', 'GBP', 'ZAR')),
        estado TEXT NOT NULL CHECK(estado IN ('pendente', 'concluida', 'rejeitada', 'cancelada')) DEFAULT 'pendente',
        operador_id TEXT NOT NULL,
        operador_nome TEXT NOT NULL,
        operador_funcao TEXT NOT NULL,
        aprovador_id TEXT,
        aprovador_nome TEXT,
        momento_execucao TEXT NOT NULL,
        momento_aprovacao TEXT,
        comprovativo_arquivo TEXT,
        comprovativo_hash_sha256 TEXT,
        notas TEXT,
        chave_idempotencia TEXT NOT NULL UNIQUE,
        UNIQUE(canal_origem, referencia_externa),
        FOREIGN KEY (operador_id) REFERENCES usuarios(id)
      );

      CREATE INDEX IF NOT EXISTS idx_execucoes_transacao ON execucoes_integracao_manual(transacao_id);
      CREATE INDEX IF NOT EXISTS idx_execucoes_ref_canal ON execucoes_integracao_manual(canal_origem, referencia_externa);
      CREATE INDEX IF NOT EXISTS idx_execucoes_estado ON execucoes_integracao_manual(estado);
      CREATE INDEX IF NOT EXISTS idx_execucoes_chave_idemp ON execucoes_integracao_manual(chave_idempotencia);
    `);
  }

  public criar(
    dto: CriarExecucaoManualDTO,
    operador: { id: string; nome: string; funcao: string },
    estadoInicial: EstadoExecucaoManual = "pendente",
    aprovador?: { id: string; nome: string }
  ): ExecucaoIntegracaoManual {
    const id = `man_${randomUUID()}`;
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO execucoes_integracao_manual (
        id, transacao_id, tipo_integracao, canal_origem, referencia_externa,
        valor_moeda, moeda, estado, operador_id, operador_nome, operador_funcao,
        aprovador_id, aprovador_nome, momento_execucao, momento_aprovacao,
        comprovativo_arquivo, comprovativo_hash_sha256, notas, chave_idempotencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.transacaoId,
      dto.tipoIntegracao,
      dto.canalOrigem,
      dto.referenciaExterna,
      dto.valorMoeda,
      dto.moeda,
      estadoInicial,
      operador.id,
      operador.nome,
      operador.funcao,
      aprovador?.id ?? null,
      aprovador?.nome ?? null,
      agora,
      aprovador ? agora : null,
      dto.comprovativoArquivo ?? null,
      dto.comprovativoHashSha256 ?? null,
      dto.notas ?? null,
      dto.chaveIdempotencia
    );

    return {
      id,
      transacaoId: dto.transacaoId,
      tipoIntegracao: dto.tipoIntegracao,
      canalOrigem: dto.canalOrigem,
      referenciaExterna: dto.referenciaExterna,
      valorMoeda: dto.valorMoeda,
      moeda: dto.moeda,
      estado: estadoInicial,
      operadorId: operador.id,
      operadorNome: operador.nome,
      operadorFuncao: operador.funcao,
      aprovadorId: aprovador?.id ?? null,
      aprovadorNome: aprovador?.nome ?? null,
      momentoExecucao: agora,
      momentoAprovacao: aprovador ? agora : null,
      comprovativoArquivo: dto.comprovativoArquivo ?? null,
      comprovativoHashSha256: dto.comprovativoHashSha256 ?? null,
      notas: dto.notas ?? null,
      chaveIdempotencia: dto.chaveIdempotencia,
    };
  }

  public buscarPorId(id: string): ExecucaoIntegracaoManual | null {
    const stmt = this.db.prepare(`SELECT * FROM execucoes_integracao_manual WHERE id = ?`);
    const row = stmt.get(id) as ExecucaoRow | undefined;
    return row ? mapearExecucao(row) : null;
  }

  public buscarPorChaveIdempotencia(chave: string): ExecucaoIntegracaoManual | null {
    const stmt = this.db.prepare(
      `SELECT * FROM execucoes_integracao_manual WHERE chave_idempotencia = ?`
    );
    const row = stmt.get(chave) as ExecucaoRow | undefined;
    return row ? mapearExecucao(row) : null;
  }

  public buscarPorCanalEReferencia(
    canal: CanalOrigemManual,
    referencia: string
  ): ExecucaoIntegracaoManual | null {
    const stmt = this.db.prepare(
      `SELECT * FROM execucoes_integracao_manual WHERE canal_origem = ? AND referencia_externa = ?`
    );
    const row = stmt.get(canal, referencia) as ExecucaoRow | undefined;
    return row ? mapearExecucao(row) : null;
  }

  public buscarPorTransacaoId(transacaoId: string): ExecucaoIntegracaoManual[] {
    const stmt = this.db.prepare(
      `SELECT * FROM execucoes_integracao_manual WHERE transacao_id = ? ORDER BY momento_execucao DESC`
    );
    const rows = stmt.all(transacaoId) as unknown as ExecucaoRow[];
    return rows.map(mapearExecucao);
  }

  public atualizarEstado(
    id: string,
    novoEstado: EstadoExecucaoManual,
    aprovador?: { id: string; nome: string }
  ): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE execucoes_integracao_manual
      SET estado = ?,
          aprovador_id = COALESCE(?, aprovador_id),
          aprovador_nome = COALESCE(?, aprovador_nome),
          momento_aprovacao = CASE WHEN ? = 'concluida' THEN ? ELSE momento_aprovacao END
      WHERE id = ?
    `);

    stmt.run(
      novoEstado,
      aprovador?.id ?? null,
      aprovador?.nome ?? null,
      novoEstado,
      agora,
      id
    );
  }

  public listar(limite = 50, offset = 0, estado?: EstadoExecucaoManual): ExecucaoIntegracaoManual[] {
    let sql = `SELECT * FROM execucoes_integracao_manual WHERE 1=1`;
    const params: (string | number)[] = [];

    if (estado) {
      sql += ` AND estado = ?`;
      params.push(estado);
    }

    sql += ` ORDER BY momento_execucao DESC LIMIT ? OFFSET ?`;
    params.push(limite, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as unknown as ExecucaoRow[];
    return rows.map(mapearExecucao);
  }
}
