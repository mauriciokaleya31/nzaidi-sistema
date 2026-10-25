import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { FuncaoUsuario } from "./matriz.js";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  funcao: FuncaoUsuario;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  ultimoLoginEm?: string | null | undefined;
}

export interface CriarUsuarioDTO {
  nome: string;
  email: string;
  senhaHash: string;
  funcao: FuncaoUsuario;
}

export class UsersRepository {
  constructor(private db: DatabaseSync) {}

  public criar(dto: CriarUsuarioDTO): Usuario {
    const id = randomUUID();
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, funcao, ativo, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    stmt.run(id, dto.nome, dto.email, dto.senhaHash, dto.funcao, agora, agora);

    return {
      id,
      nome: dto.nome,
      email: dto.email,
      senhaHash: dto.senhaHash,
      funcao: dto.funcao,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
      ultimoLoginEm: null,
    };
  }

  public buscarPorEmail(email: string): Usuario | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, nome, email, senha_hash as senhaHash, funcao,
        ativo, criado_em as criadoEm, atualizado_em as atualizadoEm,
        ultimo_login_em as ultimoLoginEm
      FROM usuarios
      WHERE email = ?
    `);

    const row = stmt.get(email) as any;
    if (!row) return null;

    return {
      ...row,
      ativo: Boolean(row.ativo),
    };
  }

  public buscarPorId(id: string): Usuario | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, nome, email, senha_hash as senhaHash, funcao,
        ativo, criado_em as criadoEm, atualizado_em as atualizadoEm,
        ultimo_login_em as ultimoLoginEm
      FROM usuarios
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      ativo: Boolean(row.ativo),
    };
  }

  public totalUsuarios(): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as total FROM usuarios");
    const row = stmt.get() as any;
    return Number(row?.total ?? 0);
  }

  public atualizarUltimoLogin(id: string): void {
    const agora = new Date().toISOString();
    this.db.prepare("UPDATE usuarios SET ultimo_login_em = ? WHERE id = ?").run(agora, id);
  }

  public listar(): Omit<Usuario, "senhaHash">[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, nome, email, funcao, ativo,
        criado_em as criadoEm, atualizado_em as atualizadoEm,
        ultimo_login_em as ultimoLoginEm
      FROM usuarios
      ORDER BY criado_em ASC
    `);

    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      ...r,
      ativo: Boolean(r.ativo),
    }));
  }

  public atualizarStatus(id: string, ativo: boolean): void {
    const agora = new Date().toISOString();
    this.db.prepare("UPDATE usuarios SET ativo = ?, atualizado_em = ? WHERE id = ?").run(ativo ? 1 : 0, agora, id);
  }

  public atualizarSenha(id: string, novaSenhaHash: string): void {
    const agora = new Date().toISOString();
    this.db.prepare("UPDATE usuarios SET senha_hash = ?, atualizado_em = ? WHERE id = ?").run(novaSenhaHash, agora, id);
  }
}
