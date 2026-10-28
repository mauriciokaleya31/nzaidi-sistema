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
  telefone?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  bloqueadoEm?: string | null | undefined;
  bloqueadoMotivo?: string | null | undefined;
  criadoEm: string;
  atualizadoEm: string;
  ultimoLoginEm?: string | null | undefined;
}

export interface CriarUsuarioDTO {
  nome: string;
  email: string;
  senhaHash: string;
  funcao: FuncaoUsuario;
  telefone?: string | null | undefined;
  avatarUrl?: string | null | undefined;
}

export interface AtualizarPerfilDTO {
  nome?: string | undefined;
  email?: string | undefined;
  telefone?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  funcao?: FuncaoUsuario | undefined;
}

export class UsersRepository {
  constructor(private db: DatabaseSync) {}

  public criar(dto: CriarUsuarioDTO): Usuario {
    const id = randomUUID();
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, funcao, ativo, telefone, avatar_url, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `);

    stmt.run(id, dto.nome, dto.email, dto.senhaHash, dto.funcao, dto.telefone ?? null, dto.avatarUrl ?? null, agora, agora);

    return {
      id,
      nome: dto.nome,
      email: dto.email,
      senhaHash: dto.senhaHash,
      funcao: dto.funcao,
      ativo: true,
      telefone: dto.telefone ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      bloqueadoEm: null,
      bloqueadoMotivo: null,
      criadoEm: agora,
      atualizadoEm: agora,
      ultimoLoginEm: null,
    };
  }

  public buscarPorEmail(email: string): Usuario | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, nome, email, senha_hash as senhaHash, funcao,
        ativo, telefone, avatar_url as avatarUrl,
        bloqueado_em as bloqueadoEm, bloqueado_motivo as bloqueadoMotivo,
        criado_em as criadoEm, atualizado_em as atualizadoEm,
        ultimo_login_em as ultimoLoginEm
      FROM usuarios
      WHERE email = ? COLLATE NOCASE
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
        ativo, telefone, avatar_url as avatarUrl,
        bloqueado_em as bloqueadoEm, bloqueado_motivo as bloqueadoMotivo,
        criado_em as criadoEm, atualizado_em as atualizadoEm,
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
        telefone, avatar_url as avatarUrl,
        bloqueado_em as bloqueadoEm, bloqueado_motivo as bloqueadoMotivo,
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

  public bloquear(id: string, motivo: string): void {
    const agora = new Date().toISOString();
    this.db.prepare(`
      UPDATE usuarios 
      SET ativo = 0, bloqueado_em = ?, bloqueado_motivo = ?, atualizado_em = ? 
      WHERE id = ?
    `).run(agora, motivo, agora, id);
  }

  public desbloquear(id: string): void {
    const agora = new Date().toISOString();
    this.db.prepare(`
      UPDATE usuarios 
      SET ativo = 1, bloqueado_em = NULL, bloqueado_motivo = NULL, atualizado_em = ? 
      WHERE id = ?
    `).run(agora, id);
  }

  public atualizarPerfil(id: string, dados: AtualizarPerfilDTO): void {
    const agora = new Date().toISOString();
    const campos: string[] = ["atualizado_em = ?"];
    const valores: any[] = [agora];

    if (dados.nome !== undefined) {
      campos.push("nome = ?");
      valores.push(dados.nome);
    }
    if (dados.email !== undefined) {
      campos.push("email = ?");
      valores.push(dados.email);
    }
    if (dados.telefone !== undefined) {
      campos.push("telefone = ?");
      valores.push(dados.telefone);
    }
    if (dados.avatarUrl !== undefined) {
      campos.push("avatar_url = ?");
      valores.push(dados.avatarUrl);
    }
    if (dados.funcao !== undefined) {
      campos.push("funcao = ?");
      valores.push(dados.funcao);
    }

    valores.push(id);
    const sql = `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`;
    this.db.prepare(sql).run(...valores);
  }

  public atualizarSenha(id: string, novaSenhaHash: string): void {
    const agora = new Date().toISOString();
    this.db.prepare("UPDATE usuarios SET senha_hash = ?, atualizado_em = ? WHERE id = ?").run(novaSenhaHash, agora, id);
  }

  public buscarDetalhesCompletos(id: string): {
    usuario: Omit<Usuario, "senhaHash">;
    estatisticas: {
      totalAuditorias: number;
      totalKycAprovados: number;
      totalKycRejeitados: number;
      totalCaixasOperados: number;
    };
  } | null {
    const user = this.buscarPorId(id);
    if (!user) return null;

    const countAuditoria = this.db.prepare("SELECT COUNT(*) as total FROM auditoria WHERE autor_id = ?").get(id) as any;
    const countKycAprovados = this.db.prepare("SELECT COUNT(*) as total FROM kyc_registos WHERE decidido_por_id = ? AND estado_novo = 'aprovado'").get(id) as any;
    const countKycRejeitados = this.db.prepare("SELECT COUNT(*) as total FROM kyc_registos WHERE decidido_por_id = ? AND estado_novo = 'rejeitado'").get(id) as any;
    const countCaixas = this.db.prepare("SELECT COUNT(*) as total FROM caixas WHERE operador_id = ?").get(id) as any;

    const { senhaHash: _, ...usuarioSemSenha } = user;

    return {
      usuario: usuarioSemSenha,
      estatisticas: {
        totalAuditorias: Number(countAuditoria?.total ?? 0),
        totalKycAprovados: Number(countKycAprovados?.total ?? 0),
        totalKycRejeitados: Number(countKycRejeitados?.total ?? 0),
        totalCaixasOperados: Number(countCaixas?.total ?? 0),
      },
    };
  }
}
