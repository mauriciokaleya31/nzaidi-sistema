import type { DatabaseSync } from "node:sqlite";
import type { Remessa, EstadoRemessa, MoedaRemessa, ParceiroRemessa } from "./remessas.types.js";

interface RemessaRow {
  id: string;
  numero_remessa: string;
  chave_idempotencia: string;
  cliente_remetente_id: string;
  remetente_nome: string;
  remetente_documento: string;
  remetente_nif: string;
  beneficiario_nome: string;
  beneficiario_pais: string;
  beneficiario_banco: string;
  beneficiario_conta_iban: string;
  moeda: string;
  valor_moeda: string;
  taxa_cambio: string;
  valor_aoa: string;
  comissao_aoa: string;
  total_cobrado_aoa: string;
  parceiro: string;
  estado: string;
  motivo_retencao: string | null;
  referencia_parceiro: string | null;
  criado_em: string;
  atualizado_em: string;
  operador_id: string;
  operador_nome: string;
  caixa_id: string | null;
  motivo_cancelamento: string | null;
  cancelado_em: string | null;
  cancelado_por_id: string | null;
}

function mapearRemessa(r: RemessaRow): Remessa {
  return {
    id: r.id,
    numeroRemessa: r.numero_remessa,
    chaveIdempotencia: r.chave_idempotencia,
    clienteRemetenteId: r.cliente_remetente_id,
    remetenteNome: r.remetente_nome,
    remetenteDocumento: r.remetente_documento,
    remetenteNif: r.remetente_nif,
    beneficiarioNome: r.beneficiario_nome,
    beneficiarioPais: r.beneficiario_pais,
    beneficiarioBanco: r.beneficiario_banco,
    beneficiarioContaIban: r.beneficiario_conta_iban,
    moeda: r.moeda as MoedaRemessa,
    valorMoeda: r.valor_moeda,
    taxaCambio: r.taxa_cambio,
    valorAoa: r.valor_aoa,
    comissaoAoa: r.comissao_aoa,
    totalCobradoAoa: r.total_cobrado_aoa,
    parceiro: r.parceiro as ParceiroRemessa,
    estado: r.estado as EstadoRemessa,
    motivoRetencao: r.motivo_retencao,
    referenciaParceiro: r.referencia_parceiro,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
    operadorId: r.operador_id,
    operadorNome: r.operador_nome,
    caixaId: r.caixa_id,
    motivoCancelamento: r.motivo_cancelamento,
    canceladoEm: r.cancelado_em,
    canceladoPorId: r.cancelado_por_id,
  };
}

export class RemessasRepository {
  constructor(private db: DatabaseSync) {}

  public inserir(rem: Remessa): void {
    const stmt = this.db.prepare(`
      INSERT INTO remessas (
        id, numero_remessa, chave_idempotencia, cliente_remetente_id,
        remetente_nome, remetente_documento, remetente_nif,
        beneficiario_nome, beneficiario_pais, beneficiario_banco, beneficiario_conta_iban,
        moeda, valor_moeda, taxa_cambio, valor_aoa, comissao_aoa, total_cobrado_aoa,
        parceiro, estado, motivo_retencao, referencia_parceiro,
        criado_em, atualizado_em, operador_id, operador_nome, caixa_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rem.id,
      rem.numeroRemessa,
      rem.chaveIdempotencia,
      rem.clienteRemetenteId,
      rem.remetenteNome,
      rem.remetenteDocumento,
      rem.remetenteNif,
      rem.beneficiarioNome,
      rem.beneficiarioPais,
      rem.beneficiarioBanco,
      rem.beneficiarioContaIban,
      rem.moeda,
      rem.valorMoeda,
      rem.taxaCambio,
      rem.valorAoa,
      rem.comissaoAoa,
      rem.totalCobradoAoa,
      rem.parceiro,
      rem.estado,
      rem.motivoRetencao ?? null,
      rem.referenciaParceiro ?? null,
      rem.criadoEm,
      rem.atualizadoEm,
      rem.operadorId,
      rem.operadorNome,
      rem.caixaId ?? null
    );
  }

  public buscarPorId(id: string): Remessa | null {
    const stmt = this.db.prepare(`SELECT * FROM remessas WHERE id = ?`);
    const row = stmt.get(id) as RemessaRow | undefined;
    return row ? mapearRemessa(row) : null;
  }

  public buscarPorChaveIdempotencia(chave: string): Remessa | null {
    const stmt = this.db.prepare(`SELECT * FROM remessas WHERE chave_idempotencia = ?`);
    const row = stmt.get(chave) as RemessaRow | undefined;
    return row ? mapearRemessa(row) : null;
  }

  public buscarPorNumero(numeroRemessa: string): Remessa | null {
    const stmt = this.db.prepare(`SELECT * FROM remessas WHERE numero_remessa = ?`);
    const row = stmt.get(numeroRemessa) as RemessaRow | undefined;
    return row ? mapearRemessa(row) : null;
  }

  public listar(
    limite = 50,
    offset = 0,
    estado?: EstadoRemessa,
    clienteId?: string
  ): { itens: Remessa[]; total: number } {
    let sqlCount = `SELECT COUNT(*) as total FROM remessas WHERE 1=1`;
    let sqlSelect = `SELECT * FROM remessas WHERE 1=1`;
    const params: (string | number)[] = [];

    if (estado) {
      sqlCount += ` AND estado = ?`;
      sqlSelect += ` AND estado = ?`;
      params.push(estado);
    }

    if (clienteId) {
      sqlCount += ` AND cliente_remetente_id = ?`;
      sqlSelect += ` AND cliente_remetente_id = ?`;
      params.push(clienteId);
    }

    const countStmt = this.db.prepare(sqlCount);
    const countRow = countStmt.get(...params) as { total: number } | undefined;
    const total = countRow?.total ?? 0;

    sqlSelect += ` ORDER BY criado_em DESC LIMIT ? OFFSET ?`;
    const selectParams = [...params, limite, offset];
    const selectStmt = this.db.prepare(sqlSelect);
    const rows = selectStmt.all(...selectParams) as unknown as RemessaRow[];

    return {
      itens: rows.map(mapearRemessa),
      total,
    };
  }

  public atualizarEstado(
    id: string,
    estado: EstadoRemessa,
    referenciaParceiro?: string,
    motivoRetencao?: string
  ): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE remessas SET
        estado = ?,
        referencia_parceiro = COALESCE(?, referencia_parceiro),
        motivo_retencao = COALESCE(?, motivo_retencao),
        atualizado_em = ?
      WHERE id = ?
    `);
    stmt.run(estado, referenciaParceiro ?? null, motivoRetencao ?? null, agora, id);
  }

  public cancelar(id: string, motivo: string, operadorId: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE remessas SET
        estado = 'cancelada',
        motivo_cancelamento = ?,
        cancelado_em = ?,
        cancelado_por_id = ?,
        atualizado_em = ?
      WHERE id = ?
    `);
    stmt.run(motivo, agora, operadorId, agora, id);
  }
}
