import type { DatabaseSync } from "node:sqlite";
import type { Cliente, RegistoKyc, EstadoKyc, NivelRisco } from "./clientes.types.js";

interface ClienteRow {
  id: string;
  tipo: string;
  nome: string;
  tipo_documento: string;
  numero_documento: string;
  nif: string;
  nacionalidade: string;
  telefone: string;
  email: string | null;
  morada: string;
  estado: string;
  estado_kyc: string;
  nivel_risco: string;
  criado_em: string;
  atualizado_em: string;
}

interface RegistoKycRow {
  id: string;
  cliente_id: string;
  estado_anterior: string;
  estado_novo: string;
  nivel_risco: string;
  decidido_por_id: string;
  decidido_por_nome: string;
  motivo: string | null;
  momento: string;
}

function mapearCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    tipo: row.tipo as Cliente["tipo"],
    nome: row.nome,
    tipoDocumento: row.tipo_documento as Cliente["tipoDocumento"],
    numeroDocumento: row.numero_documento,
    nif: row.nif,
    nacionalidade: row.nacionalidade,
    telefone: row.telefone,
    email: row.email,
    morada: row.morada,
    estado: row.estado as Cliente["estado"],
    estadoKyc: row.estado_kyc as Cliente["estadoKyc"],
    nivelRisco: row.nivel_risco as Cliente["nivelRisco"],
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

export class ClientesRepository {
  constructor(private db: DatabaseSync) {}

  public inserir(cliente: Cliente): void {
    const stmt = this.db.prepare(`
      INSERT INTO clientes (
        id, tipo, nome, tipo_documento, numero_documento, nif,
        nacionalidade, telefone, email, morada, estado, estado_kyc,
        nivel_risco, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cliente.id,
      cliente.tipo,
      cliente.nome,
      cliente.tipoDocumento,
      cliente.numeroDocumento,
      cliente.nif,
      cliente.nacionalidade,
      cliente.telefone,
      cliente.email ?? null,
      cliente.morada,
      cliente.estado,
      cliente.estadoKyc,
      cliente.nivelRisco,
      cliente.criadoEm,
      cliente.atualizadoEm
    );
  }

  public buscarPorId(id: string): Cliente | null {
    const stmt = this.db.prepare(`SELECT * FROM clientes WHERE id = ?`);
    const row = stmt.get(id) as ClienteRow | undefined;
    return row ? mapearCliente(row) : null;
  }

  public buscarPorDocumento(tipoDoc: string, numeroDoc: string): Cliente | null {
    const stmt = this.db.prepare(`
      SELECT * FROM clientes 
      WHERE tipo_documento = ? AND numero_documento = ? COLLATE NOCASE
    `);
    const row = stmt.get(tipoDoc, numeroDoc) as ClienteRow | undefined;
    return row ? mapearCliente(row) : null;
  }

  public buscarPorNif(nif: string): Cliente | null {
    const stmt = this.db.prepare(`
      SELECT * FROM clientes WHERE nif = ? COLLATE NOCASE
    `);
    const row = stmt.get(nif) as ClienteRow | undefined;
    return row ? mapearCliente(row) : null;
  }

  public listar(
    busca?: string,
    estadoKyc?: string,
    limite = 50,
    offset = 0
  ): { itens: Cliente[]; total: number } {
    let sqlCount = `SELECT COUNT(*) as total FROM clientes WHERE 1=1`;
    let sqlSelect = `SELECT * FROM clientes WHERE 1=1`;
    const params: (string | number)[] = [];

    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      sqlCount += ` AND (nome LIKE ? OR numero_documento LIKE ? OR nif LIKE ? OR telefone LIKE ?)`;
      sqlSelect += ` AND (nome LIKE ? OR numero_documento LIKE ? OR nif LIKE ? OR telefone LIKE ?)`;
      params.push(termo, termo, termo, termo);
    }

    if (estadoKyc && estadoKyc.trim()) {
      sqlCount += ` AND estado_kyc = ?`;
      sqlSelect += ` AND estado_kyc = ?`;
      params.push(estadoKyc.trim());
    }

    const countStmt = this.db.prepare(sqlCount);
    const countRow = countStmt.get(...params) as { total: number } | undefined;
    const total = countRow?.total ?? 0;

    sqlSelect += ` ORDER BY criado_em DESC LIMIT ? OFFSET ?`;
    const selectParams = [...params, limite, offset];
    const selectStmt = this.db.prepare(sqlSelect);
    const rows = selectStmt.all(...selectParams) as unknown as ClienteRow[];

    return {
      itens: rows.map(mapearCliente),
      total,
    };
  }

  public atualizarEstadoKyc(
    clienteId: string,
    novoEstado: EstadoKyc,
    nivelRisco: NivelRisco,
    agora: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE clientes 
      SET estado_kyc = ?, nivel_risco = ?, atualizado_em = ?
      WHERE id = ?
    `);
    stmt.run(novoEstado, nivelRisco, agora, clienteId);
  }

  public inserirRegistoKyc(registo: RegistoKyc): void {
    const stmt = this.db.prepare(`
      INSERT INTO kyc_registos (
        id, cliente_id, estado_anterior, estado_novo, nivel_risco,
        decidido_por_id, decidido_por_nome, motivo, momento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      registo.id,
      registo.clienteId,
      registo.estadoAnterior,
      registo.estadoNovo,
      registo.nivelRisco,
      registo.decididoPorId,
      registo.decididoPorNome,
      registo.motivo ?? null,
      registo.momento
    );
  }

  public obterHistoricoKyc(clienteId: string): RegistoKyc[] {
    const stmt = this.db.prepare(`
      SELECT * FROM kyc_registos 
      WHERE cliente_id = ? 
      ORDER BY momento DESC
    `);
    const rows = stmt.all(clienteId) as unknown as RegistoKycRow[];

    return rows.map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      estadoAnterior: r.estado_anterior as EstadoKyc,
      estadoNovo: r.estado_novo as EstadoKyc,
      nivelRisco: r.nivel_risco as NivelRisco,
      decididoPorId: r.decidido_por_id,
      decididoPorNome: r.decidido_por_nome,
      motivo: r.motivo,
      momento: r.momento,
    }));
  }
}
