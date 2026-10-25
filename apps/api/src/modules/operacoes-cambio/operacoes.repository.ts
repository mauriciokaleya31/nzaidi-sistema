import type { DatabaseSync } from "node:sqlite";
import type { OperacaoCambio, Bordero, TipoOperacao } from "./operacoes.types.js";
import type { MoedaDivisa } from "@nzaidi/dominio";

interface OperacaoRow {
  id: string;
  numero_operacao: string;
  chave_idempotencia: string | null;
  cliente_id: string;
  caixa_id: string;
  tipo: string;
  moeda_divisa: string;
  montante_divisa: string;
  taxa_aplicada: string;
  taxa_referencia_bna: string;
  margem_aplicada: string;
  montante_aoa: string;
  fonte_taxa: string;
  estado: string;
  operador_id: string;
  operador_nome: string;
  criado_em: string;
  motivo_estorno: string | null;
  estornado_em: string | null;
  estornado_por_id: string | null;
}

interface BorderoRow {
  id: string;
  numero_bordero: string;
  operacao_id: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_nif: string;
  tipo_operacao: string;
  moeda_divisa: string;
  montante_divisa: string;
  taxa_cambio: string;
  total_aoa: string;
  operador_nome: string;
  emitido_em: string;
  hash_verificacao: string;
}

function mapearOperacao(r: OperacaoRow): OperacaoCambio {
  return {
    id: r.id,
    numeroOperacao: r.numero_operacao,
    chaveIdempotencia: r.chave_idempotencia,
    clienteId: r.cliente_id,
    caixaId: r.caixa_id,
    tipo: r.tipo as TipoOperacao,
    moedaDivisa: r.moeda_divisa as MoedaDivisa,
    montanteDivisa: r.montante_divisa,
    taxaAplicada: r.taxa_aplicada,
    taxaReferenciaBna: r.taxa_referencia_bna,
    margemAplicada: r.margem_aplicada,
    montanteAoa: r.montante_aoa,
    fonteTaxa: r.fonte_taxa as "demonstracao" | "oficial",
    estado: r.estado as OperacaoCambio["estado"],
    operadorId: r.operador_id,
    operadorNome: r.operador_nome,
    criadoEm: r.criado_em,
    motivoEstorno: r.motivo_estorno,
    estornadoEm: r.estornado_em,
    estornadoPorId: r.estornado_por_id,
  };
}

function mapearBordero(r: BorderoRow): Bordero {
  return {
    id: r.id,
    numeroBordero: r.numero_bordero,
    operacaoId: r.operacao_id,
    clienteNome: r.cliente_nome,
    clienteDocumento: r.cliente_documento,
    clienteNif: r.cliente_nif,
    tipoOperacao: r.tipo_operacao as TipoOperacao,
    moedaDivisa: r.moeda_divisa as MoedaDivisa,
    montanteDivisa: r.montante_divisa,
    taxaCambio: r.taxa_cambio,
    totalAoa: r.total_aoa,
    operadorNome: r.operador_nome,
    emitidoEm: r.emitido_em,
    hashVerificacao: r.hash_verificacao,
  };
}

export class OperacoesRepository {
  constructor(private db: DatabaseSync) {}

  public inserirOperacao(op: OperacaoCambio): void {
    const stmt = this.db.prepare(`
      INSERT INTO operacoes_cambio (
        id, numero_operacao, chave_idempotencia, cliente_id, caixa_id,
        tipo, moeda_divisa, montante_divisa, taxa_aplicada, taxa_referencia_bna,
        margem_aplicada, montante_aoa, fonte_taxa, estado, operador_id,
        operador_nome, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      op.id,
      op.numeroOperacao,
      op.chaveIdempotencia ?? null,
      op.clienteId,
      op.caixaId,
      op.tipo,
      op.moedaDivisa,
      op.montanteDivisa,
      op.taxaAplicada,
      op.taxaReferenciaBna,
      op.margemAplicada,
      op.montanteAoa,
      op.fonteTaxa,
      op.estado,
      op.operadorId,
      op.operadorNome,
      op.criadoEm
    );
  }

  public buscarPorId(id: string): OperacaoCambio | null {
    const stmt = this.db.prepare(`SELECT * FROM operacoes_cambio WHERE id = ?`);
    const row = stmt.get(id) as OperacaoRow | undefined;
    return row ? mapearOperacao(row) : null;
  }

  public buscarPorChaveIdempotencia(chave: string): OperacaoCambio | null {
    const stmt = this.db.prepare(`SELECT * FROM operacoes_cambio WHERE chave_idempotencia = ?`);
    const row = stmt.get(chave) as OperacaoRow | undefined;
    return row ? mapearOperacao(row) : null;
  }

  public listarOperacoes(
    limite = 50,
    offset = 0,
    clienteId?: string,
    caixaId?: string
  ): { itens: OperacaoCambio[]; total: number } {
    let sqlCount = `SELECT COUNT(*) as total FROM operacoes_cambio WHERE 1=1`;
    let sqlSelect = `SELECT * FROM operacoes_cambio WHERE 1=1`;
    const params: (string | number)[] = [];

    if (clienteId) {
      sqlCount += ` AND cliente_id = ?`;
      sqlSelect += ` AND cliente_id = ?`;
      params.push(clienteId);
    }

    if (caixaId) {
      sqlCount += ` AND caixa_id = ?`;
      sqlSelect += ` AND caixa_id = ?`;
      params.push(caixaId);
    }

    const countStmt = this.db.prepare(sqlCount);
    const countRow = countStmt.get(...params) as { total: number } | undefined;
    const total = countRow?.total ?? 0;

    sqlSelect += ` ORDER BY criado_em DESC LIMIT ? OFFSET ?`;
    const selectParams = [...params, limite, offset];
    const selectStmt = this.db.prepare(sqlSelect);
    const rows = selectStmt.all(...selectParams) as unknown as OperacaoRow[];

    return {
      itens: rows.map(mapearOperacao),
      total,
    };
  }

  public estornarOperacao(id: string, motivo: string, agora: string, operadorId: string): void {
    const stmt = this.db.prepare(`
      UPDATE operacoes_cambio SET
        estado = 'estornada',
        motivo_estorno = ?,
        estornado_em = ?,
        estornado_por_id = ?
      WHERE id = ?
    `);
    stmt.run(motivo, agora, operadorId, id);
  }

  public inserirBordero(b: Bordero): void {
    const stmt = this.db.prepare(`
      INSERT INTO borderos (
        id, numero_bordero, operacao_id, cliente_nome, cliente_documento,
        cliente_nif, tipo_operacao, moeda_divisa, montante_divisa,
        taxa_cambio, total_aoa, operador_nome, emitido_em, hash_verificacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      b.id,
      b.numeroBordero,
      b.operacaoId,
      b.clienteNome,
      b.clienteDocumento,
      b.clienteNif,
      b.tipoOperacao,
      b.moedaDivisa,
      b.montanteDivisa,
      b.taxaCambio,
      b.totalAoa,
      b.operadorNome,
      b.emitidoEm,
      b.hashVerificacao
    );
  }

  public buscarBorderoPorOperacaoId(operacaoId: string): Bordero | null {
    const stmt = this.db.prepare(`SELECT * FROM borderos WHERE operacao_id = ?`);
    const row = stmt.get(operacaoId) as BorderoRow | undefined;
    return row ? mapearBordero(row) : null;
  }
}
