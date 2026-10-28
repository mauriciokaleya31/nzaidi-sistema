import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface Sessao {
  id: string;
  usuarioId: string;
  criadoEm: string;
  expiraEm: string;
  revogadoEm?: string | null | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
  impersonadoPor?: string | null | undefined;
  impersonadoNome?: string | null | undefined;
}

export class SessionsRepository {
  constructor(private db: DatabaseSync) {}

  public criarSessao(
    usuarioId: string,
    ttlHoras: number,
    ip?: string | null | undefined,
    userAgent?: string | null | undefined,
    impersonadoPor?: string | null | undefined,
    impersonadoNome?: string | null | undefined
  ): Sessao {
    const id = randomBytes(32).toString("hex");
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + ttlHoras * 3600 * 1000);

    const criadoEmIso = agora.toISOString();
    const expiraEmIso = expiraEm.toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sessoes (id, usuario_id, criado_em, expira_em, ip, user_agent, impersonado_por, impersonado_nome)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      usuarioId,
      criadoEmIso,
      expiraEmIso,
      ip ?? null,
      userAgent ?? null,
      impersonadoPor ?? null,
      impersonadoNome ?? null
    );

    return {
      id,
      usuarioId,
      criadoEm: criadoEmIso,
      expiraEm: expiraEmIso,
      revogadoEm: null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      impersonadoPor: impersonadoPor ?? null,
      impersonadoNome: impersonadoNome ?? null,
    };
  }

  public buscarSessaoAtiva(id: string, agora = new Date()): Sessao | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, usuario_id as usuarioId, criado_em as criadoEm,
        expira_em as expiraEm, revogado_em as revogadoEm,
        ip, user_agent as userAgent,
        impersonado_por as impersonadoPor,
        impersonado_nome as impersonadoNome
      FROM sessoes
      WHERE id = ? AND revogado_em IS NULL
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    const dataExpira = new Date(row.expiraEm);
    if (agora.getTime() >= dataExpira.getTime()) {
      return null; // Sessão expirou
    }

    return row as Sessao;
  }

  public listarSessoesAtivas(usuarioId: string): Sessao[] {
    const agoraIso = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT 
        id, usuario_id as usuarioId, criado_em as criadoEm,
        expira_em as expiraEm, revogado_em as revogadoEm,
        ip, user_agent as userAgent,
        impersonado_por as impersonadoPor,
        impersonado_nome as impersonadoNome
      FROM sessoes
      WHERE usuario_id = ? AND revogado_em IS NULL AND expira_em > ?
      ORDER BY criado_em DESC
    `);

    const rows = stmt.all(usuarioId, agoraIso) as any[];
    return rows as Sessao[];
  }

  public revogarSessao(id: string): void {
    const agoraIso = new Date().toISOString();
    this.db.prepare("UPDATE sessoes SET revogado_em = ? WHERE id = ?").run(agoraIso, id);
  }

  public revogarTodasDoUsuario(usuarioId: string): void {
    const agoraIso = new Date().toISOString();
    this.db.prepare("UPDATE sessoes SET revogado_em = ? WHERE usuario_id = ? AND revogado_em IS NULL").run(agoraIso, usuarioId);
  }
}
