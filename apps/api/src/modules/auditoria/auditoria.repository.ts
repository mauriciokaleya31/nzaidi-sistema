import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface RegistroAuditoria {
  id: string;
  momento: string;
  autorId?: string | null | undefined;
  autorNome?: string | null | undefined;
  autorFuncao?: string | null | undefined;
  acao: string;
  recurso: string;
  recursoId?: string | null | undefined;
  detalhesJson?: string | null | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export interface CriarRegistroAuditoriaParams {
  autorId?: string | null | undefined;
  autorNome?: string | null | undefined;
  autorFuncao?: string | null | undefined;
  acao: string;
  recurso: string;
  recursoId?: string | null | undefined;
  detalhes?: Record<string, unknown> | null | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export class AuditoriaRepository {
  constructor(private db: DatabaseSync) {}

  public registar(params: CriarRegistroAuditoriaParams): RegistroAuditoria {
    const id = randomUUID();
    const momento = new Date().toISOString();
    const detalhesJson = params.detalhes ? JSON.stringify(params.detalhes) : null;

    const stmt = this.db.prepare(`
      INSERT INTO auditoria (
        id, momento, autor_id, autor_nome, autor_funcao, acao, recurso, recurso_id, detalhes_json, ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      momento,
      params.autorId ?? null,
      params.autorNome ?? null,
      params.autorFuncao ?? null,
      params.acao,
      params.recurso,
      params.recursoId ?? null,
      detalhesJson,
      params.ip ?? null,
      params.userAgent ?? null
    );

    return {
      id,
      momento,
      autorId: params.autorId ?? null,
      autorNome: params.autorNome ?? null,
      autorFuncao: params.autorFuncao ?? null,
      acao: params.acao,
      recurso: params.recurso,
      recursoId: params.recursoId ?? null,
      detalhesJson,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    };
  }

  public listar(limite = 50): RegistroAuditoria[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, momento, autor_id as autorId, autor_nome as autorNome, autor_funcao as autorFuncao,
        acao, recurso, recurso_id as recursoId, detalhes_json as detalhesJson,
        ip, user_agent as userAgent
      FROM auditoria
      ORDER BY momento DESC
      LIMIT ?
    `);

    return stmt.all(limite) as unknown as RegistroAuditoria[];
  }
}
