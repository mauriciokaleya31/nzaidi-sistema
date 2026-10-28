import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface Notificacao {
  id: string;
  destinatarioTipo: "admin_geral" | "usuario" | "cliente" | "parceiro";
  destinatarioId?: string | null | undefined;
  categoria: "kyc" | "cambio" | "remessa" | "caixa" | "seguranca" | "sistema" | "comunicacao";
  titulo: string;
  mensagem: string;
  linkAcao?: string | null | undefined;
  lida: boolean;
  lidaEm?: string | null | undefined;
  prioridade: "baixa" | "normal" | "alta" | "critica";
  criadoEm: string;
}

export interface CriarNotificacaoDTO {
  destinatarioTipo: Notificacao["destinatarioTipo"];
  destinatarioId?: string | null | undefined;
  categoria: Notificacao["categoria"];
  titulo: string;
  mensagem: string;
  linkAcao?: string | null | undefined;
  prioridade?: Notificacao["prioridade"] | undefined;
}

export class NotificacoesRepository {
  constructor(private db: DatabaseSync) {}

  public criar(dados: CriarNotificacaoDTO): Notificacao {
    const id = randomUUID();
    const agora = new Date().toISOString();
    const prioridade = dados.prioridade ?? "normal";

    const stmt = this.db.prepare(`
      INSERT INTO notificacoes_sistema (
        id, destinatario_tipo, destinatario_id, categoria, titulo,
        mensagem, link_acao, lida, prioridade, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      id,
      dados.destinatarioTipo,
      dados.destinatarioId ?? null,
      dados.categoria,
      dados.titulo,
      dados.mensagem,
      dados.linkAcao ?? null,
      prioridade,
      agora
    );

    return {
      id,
      destinatarioTipo: dados.destinatarioTipo,
      destinatarioId: dados.destinatarioId ?? null,
      categoria: dados.categoria,
      titulo: dados.titulo,
      mensagem: dados.mensagem,
      linkAcao: dados.linkAcao ?? null,
      lida: false,
      lidaEm: null,
      prioridade,
      criadoEm: agora,
    };
  }

  public listar(
    usuarioId: string,
    apenasNaoLidas = false,
    categoria?: string | undefined,
    limite = 50
  ): { itens: Notificacao[]; totalNaoLidas: number } {
    let sql = `
      SELECT 
        id, destinatario_tipo as destinatarioTipo, destinatario_id as destinatarioId,
        categoria, titulo, mensagem, link_acao as linkAcao,
        lida, lida_em as lidaEm, prioridade, criado_em as criadoEm
      FROM notificacoes_sistema
      WHERE (destinatario_tipo = 'admin_geral' OR (destinatario_tipo = 'usuario' AND destinatario_id = ?))
    `;
    const params: any[] = [usuarioId];

    if (apenasNaoLidas) {
      sql += " AND lida = 0";
    }

    if (categoria && categoria.trim()) {
      sql += " AND categoria = ?";
      params.push(categoria.trim());
    }

    sql += " ORDER BY criado_em DESC LIMIT ?";
    params.push(limite);

    const rows = this.db.prepare(sql).all(...params) as any[];

    const countNaoLidas = this.db.prepare(`
      SELECT COUNT(*) as total 
      FROM notificacoes_sistema 
      WHERE (destinatario_tipo = 'admin_geral' OR (destinatario_tipo = 'usuario' AND destinatario_id = ?))
        AND lida = 0
    `).get(usuarioId) as any;

    return {
      itens: rows.map((r) => ({
        ...r,
        lida: Boolean(r.lida),
      })),
      totalNaoLidas: Number(countNaoLidas?.total ?? 0),
    };
  }

  public marcarComoLida(id: string): void {
    const agora = new Date().toISOString();
    this.db.prepare("UPDATE notificacoes_sistema SET lida = 1, lida_em = ? WHERE id = ?").run(agora, id);
  }

  public marcarTodasComoLidas(usuarioId: string): void {
    const agora = new Date().toISOString();
    this.db.prepare(`
      UPDATE notificacoes_sistema 
      SET lida = 1, lida_em = ? 
      WHERE (destinatario_tipo = 'admin_geral' OR (destinatario_tipo = 'usuario' AND destinatario_id = ?))
        AND lida = 0
    `).run(agora, usuarioId);
  }
}
