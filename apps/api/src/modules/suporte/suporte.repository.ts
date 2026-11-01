import type { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import type {
  AtendimentoSuporte,
  MensagemSuporte,
  CriarAtendimentoInput,
  EstadoAtendimento,
} from "./suporte.types.js";

export class SuporteRepository {
  constructor(private db: DatabaseSync) {}

  public criarAtendimento(
    clienteId: string,
    input: CriarAtendimentoInput,
    clienteNome: string
  ): { atendimento: AtendimentoSuporte; mensagemInicial: MensagemSuporte } {
    const atendimentoId = crypto.randomUUID();
    const mensagemId = crypto.randomUUID();
    const agora = new Date().toISOString();

    const stmtAtendimento = this.db.prepare(`
      INSERT INTO suporte_atendimentos (
        id, cliente_id, operador_id, operador_nome, assunto, categoria, estado, prioridade, criado_em, atualizado_em
      ) VALUES (?, ?, NULL, NULL, ?, ?, 'pendente', 'normal', ?, ?);
    `);

    stmtAtendimento.run(
      atendimentoId,
      clienteId,
      input.assunto,
      input.categoria,
      agora,
      agora
    );

    const stmtMensagem = this.db.prepare(`
      INSERT INTO suporte_mensagens (
        id, atendimento_id, remetente_tipo, remetente_id, remetente_nome, mensagem,
        anexo_nome, anexo_tipo, anexo_base64, lida, criado_em
      ) VALUES (?, ?, 'cliente', ?, ?, ?, ?, ?, ?, 0, ?);
    `);

    stmtMensagem.run(
      mensagemId,
      atendimentoId,
      clienteId,
      clienteNome,
      input.mensagemInicial,
      input.anexoNome ?? null,
      input.anexoTipo ?? null,
      input.anexoBase64 ?? null,
      agora
    );

    const atendimento: AtendimentoSuporte = {
      id: atendimentoId,
      clienteId,
      clienteNome,
      assunto: input.assunto,
      categoria: input.categoria,
      estado: "pendente",
      prioridade: "normal",
      criadoEm: agora,
      atualizadoEm: agora,
    };

    const mensagem: MensagemSuporte = {
      id: mensagemId,
      atendimentoId,
      remetenteTipo: "cliente",
      remetenteId: clienteId,
      remetenteNome: clienteNome,
      mensagem: input.mensagemInicial,
      anexoNome: input.anexoNome ?? null,
      anexoTipo: input.anexoTipo ?? null,
      anexoBase64: input.anexoBase64 ?? null,
      lida: false,
      criadoEm: agora,
    };

    return { atendimento, mensagemInicial: mensagem };
  }

  public buscarAtendimentoPorId(id: string): AtendimentoSuporte | null {
    const stmt = this.db.prepare(`
      SELECT s.*, c.nome as cliente_nome, c.email as cliente_email
      FROM suporte_atendimentos s
      JOIN clientes c ON s.cliente_id = c.id
      WHERE s.id = ?;
    `);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      clienteId: row.cliente_id,
      clienteNome: row.cliente_nome,
      clienteEmail: row.cliente_email,
      operadorId: row.operador_id,
      operadorNome: row.operador_nome,
      assunto: row.assunto,
      categoria: row.categoria,
      estado: row.estado,
      prioridade: row.prioridade,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
      encerradoEm: row.encerrado_em,
    };
  }

  public listarAtendimentosCliente(clienteId: string): AtendimentoSuporte[] {
    const stmt = this.db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM suporte_mensagens m WHERE m.atendimento_id = s.id AND m.remetente_tipo = 'operador' AND m.lida = 0) as nao_lidas
      FROM suporte_atendimentos s
      WHERE s.cliente_id = ?
      ORDER BY s.atualizado_em DESC;
    `);
    const rows = stmt.all(clienteId) as any[];

    return rows.map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      operadorId: r.operador_id,
      operadorNome: r.operador_nome,
      assunto: r.assunto,
      categoria: r.categoria,
      estado: r.estado,
      prioridade: r.prioridade,
      mensagensNaoLidas: r.nao_lidas || 0,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
      encerradoEm: r.encerrado_em,
    }));
  }

  public listarAtendimentosAdmin(filtros?: {
    estado?: EstadoAtendimento | undefined;
    operadorId?: string | undefined;
    semOperador?: boolean | undefined;
  }): AtendimentoSuporte[] {
    let sql = `
      SELECT s.*, c.nome as cliente_nome, c.email as cliente_email,
        (SELECT COUNT(*) FROM suporte_mensagens m WHERE m.atendimento_id = s.id AND m.remetente_tipo = 'cliente' AND m.lida = 0) as nao_lidas
      FROM suporte_atendimentos s
      JOIN clientes c ON s.cliente_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros?.estado) {
      sql += " AND s.estado = ?";
      params.push(filtros.estado);
    }
    if (filtros?.operadorId) {
      sql += " AND s.operador_id = ?";
      params.push(filtros.operadorId);
    }
    if (filtros?.semOperador) {
      sql += " AND s.operador_id IS NULL";
    }

    sql += " ORDER BY CASE WHEN s.estado = 'pendente' THEN 1 WHEN s.estado = 'em_atendimento' THEN 2 ELSE 3 END, s.atualizado_em DESC;";

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      clienteNome: r.cliente_nome,
      clienteEmail: r.cliente_email,
      operadorId: r.operador_id,
      operadorNome: r.operador_nome,
      assunto: r.assunto,
      categoria: r.categoria,
      estado: r.estado,
      prioridade: r.prioridade,
      mensagensNaoLidas: r.nao_lidas || 0,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
      encerradoEm: r.encerrado_em,
    }));
  }

  public atribuirOperador(atendimentoId: string, operadorId: string, operadorNome: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE suporte_atendimentos
      SET operador_id = ?, operador_nome = ?, estado = 'em_atendimento', atualizado_em = ?
      WHERE id = ?;
    `);
    stmt.run(operadorId, operadorNome, agora, atendimentoId);
  }

  public alterarEstado(atendimentoId: string, novoEstado: EstadoAtendimento): void {
    const agora = new Date().toISOString();
    const encerradoEm = novoEstado === "encerrado" || novoEstado === "resolvido" ? agora : null;

    const stmt = this.db.prepare(`
      UPDATE suporte_atendimentos
      SET estado = ?, encerrado_em = COALESCE(?, encerrado_em), atualizado_em = ?
      WHERE id = ?;
    `);
    stmt.run(novoEstado, encerradoEm, agora, atendimentoId);
  }

  public adicionarMensagem(dados: {
    atendimentoId: string;
    remetenteTipo: "cliente" | "operador" | "sistema";
    remetenteId: string;
    remetenteNome: string;
    mensagem: string;
    anexoNome?: string | null | undefined;
    anexoTipo?: string | null | undefined;
    anexoBase64?: string | null | undefined;
  }): MensagemSuporte {
    const id = crypto.randomUUID();
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO suporte_mensagens (
        id, atendimento_id, remetente_tipo, remetente_id, remetente_nome,
        mensagem, anexo_nome, anexo_tipo, anexo_base64, lida, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);
    `);

    stmt.run(
      id,
      dados.atendimentoId,
      dados.remetenteTipo,
      dados.remetenteId,
      dados.remetenteNome,
      dados.mensagem,
      dados.anexoNome ?? null,
      dados.anexoTipo ?? null,
      dados.anexoBase64 ?? null,
      agora
    );

    // Atualizar data do atendimento
    this.db.prepare("UPDATE suporte_atendimentos SET atualizado_em = ? WHERE id = ?;").run(agora, dados.atendimentoId);

    return {
      id,
      atendimentoId: dados.atendimentoId,
      remetenteTipo: dados.remetenteTipo,
      remetenteId: dados.remetenteId,
      remetenteNome: dados.remetenteNome,
      mensagem: dados.mensagem,
      anexoNome: dados.anexoNome ?? null,
      anexoTipo: dados.anexoTipo ?? null,
      anexoBase64: dados.anexoBase64 ?? null,
      lida: false,
      criadoEm: agora,
    };
  }

  public listarMensagens(atendimentoId: string, marcarLidasPara?: "cliente" | "operador"): MensagemSuporte[] {
    if (marcarLidasPara) {
      const agora = new Date().toISOString();
      const tipoOposto = marcarLidasPara === "cliente" ? "operador" : "cliente";
      this.db
        .prepare(`UPDATE suporte_mensagens SET lida = 1, lida_em = ? WHERE atendimento_id = ? AND remetente_tipo = ? AND lida = 0;`)
        .run(agora, atendimentoId, tipoOposto);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM suporte_mensagens
      WHERE atendimento_id = ?
      ORDER BY criado_em ASC;
    `);
    const rows = stmt.all(atendimentoId) as any[];

    return rows.map((r) => ({
      id: r.id,
      atendimentoId: r.atendimento_id,
      remetenteTipo: r.remetente_tipo,
      remetenteId: r.remetente_id,
      remetenteNome: r.remetente_nome,
      mensagem: r.mensagem,
      anexoNome: r.anexo_nome,
      anexoTipo: r.anexo_tipo,
      anexoBase64: r.anexo_base64,
      lida: Boolean(r.lida),
      lidaEm: r.lida_em,
      criadoEm: r.criado_em,
    }));
  }
}
