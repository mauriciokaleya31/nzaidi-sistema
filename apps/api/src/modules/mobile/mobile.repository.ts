import type { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

export interface DispositivoMovel {
  id: string;
  cliente_id: string;
  device_id: string;
  nome_dispositivo: string;
  plataforma: "android" | "ios";
  versao_so: string;
  versao_app: string;
  token_push?: string | null | undefined;
  status: "ativo" | "bloqueado" | "revogado";
  ultimo_ip?: string | null | undefined;
  ultimo_acesso: string;
  criado_em: string;
  atualizado_em: string;
  cliente_nome?: string;
  cliente_email?: string;
}

export interface SessaoMobile {
  id: string;
  cliente_id: string;
  dispositivo_id: string;
  access_token_jti: string;
  refresh_token_hash: string;
  expira_em: string;
  revogado_em?: string | null;
  ip?: string | null | undefined;
  user_agent?: string | null | undefined;
  criado_em: string;
}

export interface RequisicaoLog {
  id: string;
  cliente_id?: string | null;
  dispositivo_id?: string | null;
  endpoint: string;
  metodo: string;
  codigo_status: number;
  duracao_ms: number;
  ip?: string | null | undefined;
  plataforma?: string | null | undefined;
  versao_app?: string | null;
  correlation_id?: string | null;
  erro_mensagem?: string | null;
  criado_em: string;
  cliente_nome?: string | null;
  dispositivo_nome?: string | null;
}

export class MobileRepository {
  constructor(private db: DatabaseSync) {}

  public hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  // --- Dispositivos Móveis ---

  public registarOuAtualizarDispositivo(dados: {
    clienteId: string;
    deviceId: string;
    nomeDispositivo: string;
    plataforma: "android" | "ios";
    versaoSo: string;
    versaoApp: string;
    tokenPush?: string | null | undefined;
    ip?: string | null | undefined;
  }): DispositivoMovel {
    const agora = new Date().toISOString();

    const selectStmt = this.db.prepare(
      "SELECT * FROM dispositivos_moveis WHERE cliente_id = ? AND device_id = ?;"
    );
    const existente = selectStmt.get(dados.clienteId, dados.deviceId) as DispositivoMovel | undefined;

    if (existente) {
      if (existente.status === "bloqueado") {
        throw new Error("Este dispositivo encontra-se bloqueado pela segurança institucional.");
      }

      const updateStmt = this.db.prepare(`
        UPDATE dispositivos_moveis
        SET nome_dispositivo = ?, plataforma = ?, versao_so = ?, versao_app = ?,
            token_push = COALESCE(?, token_push), ultimo_ip = ?, ultimo_acesso = ?,
            status = 'ativo', atualizado_em = ?
        WHERE id = ?;
      `);
      updateStmt.run(
        dados.nomeDispositivo,
        dados.plataforma,
        dados.versaoSo,
        dados.versaoApp,
        dados.tokenPush ?? null,
        dados.ip ?? null,
        agora,
        agora,
        existente.id
      );

      return {
        ...existente,
        nome_dispositivo: dados.nomeDispositivo,
        plataforma: dados.plataforma,
        versao_so: dados.versaoSo,
        versao_app: dados.versaoApp,
        token_push: dados.tokenPush ?? existente.token_push ?? null,
        ultimo_ip: dados.ip ?? existente.ultimo_ip ?? null,
        ultimo_acesso: agora,
        status: "ativo",
        atualizado_em: agora,
      };
    }

    const id = crypto.randomUUID();
    const insertStmt = this.db.prepare(`
      INSERT INTO dispositivos_moveis (
        id, cliente_id, device_id, nome_dispositivo, plataforma,
        versao_so, versao_app, token_push, status, ultimo_ip,
        ultimo_acesso, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?, ?, ?);
    `);

    insertStmt.run(
      id,
      dados.clienteId,
      dados.deviceId,
      dados.nomeDispositivo,
      dados.plataforma,
      dados.versaoSo,
      dados.versaoApp,
      dados.tokenPush ?? null,
      dados.ip ?? null,
      agora,
      agora,
      agora
    );

    return {
      id,
      cliente_id: dados.clienteId,
      device_id: dados.deviceId,
      nome_dispositivo: dados.nomeDispositivo,
      plataforma: dados.plataforma,
      versao_so: dados.versaoSo,
      versao_app: dados.versaoApp,
      token_push: dados.tokenPush ?? null,
      status: "ativo",
      ultimo_ip: dados.ip ?? null,
      ultimo_acesso: agora,
      criado_em: agora,
      atualizado_em: agora,
    };
  }

  public buscarDispositivoPorId(id: string): DispositivoMovel | null {
    const stmt = this.db.prepare("SELECT * FROM dispositivos_moveis WHERE id = ?;");
    const res = stmt.get(id) as DispositivoMovel | undefined;
    return res || null;
  }

  public buscarDispositivoPorHardware(clienteId: string, deviceId: string): DispositivoMovel | null {
    const stmt = this.db.prepare(
      "SELECT * FROM dispositivos_moveis WHERE cliente_id = ? AND device_id = ?;"
    );
    const res = stmt.get(clienteId, deviceId) as DispositivoMovel | undefined;
    return res || null;
  }

  public listarDispositivosCliente(clienteId: string): DispositivoMovel[] {
    const stmt = this.db.prepare(
      "SELECT * FROM dispositivos_moveis WHERE cliente_id = ? ORDER BY ultimo_acesso DESC;"
    );
    return stmt.all(clienteId) as unknown as DispositivoMovel[];
  }

  public alterarStatusDispositivo(
    id: string,
    novoStatus: "ativo" | "bloqueado" | "revogado"
  ): boolean {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(
      "UPDATE dispositivos_moveis SET status = ?, atualizado_em = ? WHERE id = ?;"
    );
    stmt.run(novoStatus, agora, id);

    if (novoStatus === "bloqueado" || novoStatus === "revogado") {
      this.revogarTodasSessoesDispositivo(id);
    }
    return true;
  }

  // --- Sessões Móveis & Tokens Rotativos ---

  public criarSessao(dados: {
    clienteId: string;
    dispositivoId: string;
    accessTokenJti: string;
    refreshToken: string;
    expiraEmHoras: number;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): SessaoMobile {
    const id = crypto.randomUUID();
    const agora = new Date();
    const expira = new Date(agora.getTime() + dados.expiraEmHoras * 3600 * 1000);
    const refreshHash = this.hashToken(dados.refreshToken);

    const stmt = this.db.prepare(`
      INSERT INTO sessoes_mobile (
        id, cliente_id, dispositivo_id, access_token_jti,
        refresh_token_hash, expira_em, ip, user_agent, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      dados.clienteId,
      dados.dispositivoId,
      dados.accessTokenJti,
      refreshHash,
      expira.toISOString(),
      dados.ip ?? null,
      dados.userAgent ?? null,
      agora.toISOString()
    );

    return {
      id,
      cliente_id: dados.clienteId,
      dispositivo_id: dados.dispositivoId,
      access_token_jti: dados.accessTokenJti,
      refresh_token_hash: refreshHash,
      expira_em: expira.toISOString(),
      ip: dados.ip ?? null,
      user_agent: dados.userAgent ?? null,
      criado_em: agora.toISOString(),
    };
  }

  public buscarSessaoAtivaPorRefresh(refreshToken: string): SessaoMobile | null {
    const hash = this.hashToken(refreshToken);
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM sessoes_mobile
      WHERE refresh_token_hash = ? AND revogado_em IS NULL AND expira_em > ?;
    `);
    const res = stmt.get(hash, agora) as SessaoMobile | undefined;
    return res || null;
  }

  public buscarSessaoPorHashSemFiltro(refreshToken: string): SessaoMobile | null {
    const hash = this.hashToken(refreshToken);
    const stmt = this.db.prepare("SELECT * FROM sessoes_mobile WHERE refresh_token_hash = ?;");
    const res = stmt.get(hash) as SessaoMobile | undefined;
    return res || null;
  }

  public revogarSessao(id: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare("UPDATE sessoes_mobile SET revogado_em = ? WHERE id = ?;");
    stmt.run(agora, id);
  }

  public revogarTodasSessoesDispositivo(dispositivoId: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(
      "UPDATE sessoes_mobile SET revogado_em = ? WHERE dispositivo_id = ? AND revogado_em IS NULL;"
    );
    stmt.run(agora, dispositivoId);
  }

  public revogarTodasSessoesCliente(clienteId: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(
      "UPDATE sessoes_mobile SET revogado_em = ? WHERE cliente_id = ? AND revogado_em IS NULL;"
    );
    stmt.run(agora, clienteId);
  }

  // --- Log de Requisições da API ---

  public registarRequisicao(dados: {
    clienteId?: string | null | undefined;
    dispositivoId?: string | null | undefined;
    endpoint: string;
    metodo: string;
    codigoStatus: number;
    duracaoMs: number;
    ip?: string | null | undefined;
    plataforma?: string | null | undefined;
    versaoApp?: string | null | undefined;
    correlationId?: string | null | undefined;
    erroMensagem?: string | null | undefined;
  }): void {
    const id = crypto.randomUUID();
    const criadoEm = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO api_requisicoes_log (
        id, cliente_id, dispositivo_id, endpoint, metodo,
        codigo_status, duracao_ms, ip, plataforma, versao_app,
        correlation_id, erro_mensagem, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      dados.clienteId ?? null,
      dados.dispositivoId ?? null,
      dados.endpoint,
      dados.metodo,
      dados.codigoStatus,
      dados.duracaoMs,
      dados.ip ?? null,
      dados.plataforma ?? null,
      dados.versaoApp ?? null,
      dados.correlationId ?? null,
      dados.erroMensagem ?? null,
      criadoEm
    );
  }

  public listarRequisicoes(filtros: {
    limite?: number | undefined;
    offset?: number | undefined;
    endpoint?: string | undefined;
    metodo?: string | undefined;
    codigoStatus?: number | undefined;
    plataforma?: string | undefined;
    clienteId?: string | undefined;
  }): { total: number; logs: RequisicaoLog[] } {
    const limite = filtros.limite || 50;
    const offset = filtros.offset || 0;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (filtros.endpoint) {
      whereClause += " AND r.endpoint LIKE ?";
      params.push(`%${filtros.endpoint}%`);
    }
    if (filtros.metodo) {
      whereClause += " AND r.metodo = ?";
      params.push(filtros.metodo);
    }
    if (filtros.codigoStatus) {
      whereClause += " AND r.codigo_status = ?";
      params.push(filtros.codigoStatus);
    }
    if (filtros.plataforma) {
      whereClause += " AND r.plataforma = ?";
      params.push(filtros.plataforma);
    }
    if (filtros.clienteId) {
      whereClause += " AND r.cliente_id = ?";
      params.push(filtros.clienteId);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM api_requisicoes_log r ${whereClause};`);
    const totalRow = countStmt.get(...params) as { total: number };

    const selectStmt = this.db.prepare(`
      SELECT r.*, c.nome as cliente_nome, d.nome_dispositivo as dispositivo_nome
      FROM api_requisicoes_log r
      LEFT JOIN clientes c ON r.cliente_id = c.id
      LEFT JOIN dispositivos_moveis d ON r.dispositivo_id = d.id
      ${whereClause}
      ORDER BY r.criado_em DESC
      LIMIT ? OFFSET ?;
    `);

    const logs = selectStmt.all(...params, limite, offset) as unknown as RequisicaoLog[];
    return { total: totalRow.total, logs };
  }

  // --- Indicadores e Monitorização Administrativa ---

  public obterKpis(): {
    totalClientesGeral: number;
    clientesRegistadosMobile: number;
    ativosTempoReal: number;
    ativos24h: number;
    ativos7d: number;
    ativos30d: number;
    novosRegistosHoje: number;
    clientesInativos: number;
    totalRequisicoes: number;
    requisicoesSucesso: number;
    requisicoesErro: number;
    requisicoesBloqueadas: number;
    dispositivosAtivos: number;
    dispositivosAndroid: number;
    dispositivosIos: number;
    sessoesAtivas: number;
    latenciaMediaMs: number;
  } {
    const totalCliStmt = this.db.prepare("SELECT COUNT(*) as total FROM clientes;");
    const totalCli = totalCliStmt.get() as any;

    const reqsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN codigo_status >= 200 AND codigo_status < 400 THEN 1 ELSE 0 END) as sucesso,
        SUM(CASE WHEN codigo_status >= 400 AND codigo_status != 429 THEN 1 ELSE 0 END) as erro,
        SUM(CASE WHEN codigo_status = 429 THEN 1 ELSE 0 END) as bloqueadas,
        AVG(duracao_ms) as latencia_media
      FROM api_requisicoes_log;
    `);
    const reqs = reqsStmt.get() as any;

    const dispStmt = this.db.prepare(`
      SELECT
        COUNT(DISTINCT id) as total_ativos,
        SUM(CASE WHEN plataforma = 'android' THEN 1 ELSE 0 END) as android,
        SUM(CASE WHEN plataforma = 'ios' THEN 1 ELSE 0 END) as ios,
        COUNT(DISTINCT cliente_id) as total_clientes
      FROM dispositivos_moveis
      WHERE status = 'ativo';
    `);
    const disp = dispStmt.get() as any;

    const agora = new Date().toISOString();
    const sessoesStmt = this.db.prepare(`
      SELECT COUNT(*) as ativas
      FROM sessoes_mobile
      WHERE revogado_em IS NULL AND expira_em > ?;
    `);
    const sessoes = sessoesStmt.get(agora) as any;

    // Métricas temporais de utilizadores activos
    const ativos15mStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT cliente_id) as total
      FROM api_requisicoes_log
      WHERE cliente_id IS NOT NULL AND criado_em >= datetime('now', '-15 minutes');
    `);
    const ativos15m = (ativos15mStmt.get() as any)?.total || 0;

    const ativos24hStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT cliente_id) as total
      FROM api_requisicoes_log
      WHERE cliente_id IS NOT NULL AND criado_em >= datetime('now', '-24 hours');
    `);
    const ativos24h = (ativos24hStmt.get() as any)?.total || 0;

    const ativos7dStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT cliente_id) as total
      FROM api_requisicoes_log
      WHERE cliente_id IS NOT NULL AND criado_em >= datetime('now', '-7 days');
    `);
    const ativos7d = (ativos7dStmt.get() as any)?.total || 0;

    const ativos30dStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT cliente_id) as total
      FROM api_requisicoes_log
      WHERE cliente_id IS NOT NULL AND criado_em >= datetime('now', '-30 days');
    `);
    const ativos30d = (ativos30dStmt.get() as any)?.total || 0;

    const novosHojeStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM dispositivos_moveis
      WHERE criado_em >= datetime('now', 'start of day');
    `);
    const novosHoje = (novosHojeStmt.get() as any)?.total || 0;

    const totalMobClientes = disp?.total_clientes || 0;
    const inativos = Math.max(0, totalMobClientes - ativos30d);

    return {
      totalClientesGeral: totalCli?.total || 0,
      clientesRegistadosMobile: totalMobClientes,
      ativosTempoReal: Math.max(ativos15m, sessoes?.ativas || 0),
      ativos24h: Math.max(ativos24h, sessoes?.ativas || 0),
      ativos7d,
      ativos30d,
      novosRegistosHoje: novosHoje,
      clientesInativos: inativos,
      totalRequisicoes: reqs?.total || 0,
      requisicoesSucesso: reqs?.sucesso || 0,
      requisicoesErro: reqs?.erro || 0,
      requisicoesBloqueadas: reqs?.bloqueadas || 0,
      dispositivosAtivos: disp?.total_ativos || 0,
      dispositivosAndroid: disp?.android || 0,
      dispositivosIos: disp?.ios || 0,
      sessoesAtivas: sessoes?.ativas || 0,
      latenciaMediaMs: Math.round((reqs?.latencia_media || 0) * 10) / 10,
    };
  }

  public listarDispositivosAdmin(): DispositivoMovel[] {
    const stmt = this.db.prepare(`
      SELECT d.*, c.nome as cliente_nome, c.email as cliente_email
      FROM dispositivos_moveis d
      LEFT JOIN clientes c ON d.cliente_id = c.id
      ORDER BY d.ultimo_acesso DESC;
    `);
    return stmt.all() as unknown as DispositivoMovel[];
  }

  public obterConfiguracoes(): Record<string, string> {
    const stmt = this.db.prepare("SELECT chave, valor FROM mobile_config;");
    const rows = stmt.all() as unknown as { chave: string; valor: string }[];
    const res: Record<string, string> = {};
    rows.forEach((r) => {
      res[r.chave] = r.valor;
    });
    return res;
  }

  public atualizarConfiguracao(chave: string, valor: string, operadorId: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO mobile_config (chave, valor, atualizado_em, atualizado_por)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por;
    `);
    stmt.run(chave, valor, agora, operadorId);
  }

  public criarAlerta(tipo: string, titulo: string, mensagem: string, severidade: "info" | "aviso" | "erro" | "critico"): void {
    const id = crypto.randomUUID();
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO mobile_alertas (id, tipo, titulo, mensagem, severidade, resolvido, criado_em)
      VALUES (?, ?, ?, ?, ?, 0, ?);
    `);
    stmt.run(id, tipo, titulo, mensagem, severidade, agora);
  }

  public listarAlertas(): any[] {
    const stmt = this.db.prepare("SELECT * FROM mobile_alertas ORDER BY criado_em DESC LIMIT 50;");
    return stmt.all() as any[];
  }
  // --- Recuperação de Senha & OTP ---

  public criarOtpRecuperacao(clienteId: string, email: string, codigoOtp: string, expiraEmMinutos: number = 15): void {
    const id = crypto.randomUUID();
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + expiraEmMinutos * 60 * 1000).toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO clientes_recuperacao_senha (id, cliente_id, email, codigo_otp, expira_em, criado_em)
      VALUES (?, ?, ?, ?, ?, ?);
    `);
    stmt.run(id, clienteId, email.toLowerCase().trim(), codigoOtp, expiraEm, agora.toISOString());
  }

  public buscarOtpRecuperacaoValido(email: string, codigoOtp: string): { id: string; cliente_id: string } | null {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT id, cliente_id FROM clientes_recuperacao_senha
      WHERE email = ? COLLATE NOCASE AND codigo_otp = ? AND usado_em IS NULL AND expira_em > ?
      ORDER BY criado_em DESC LIMIT 1;
    `);
    const res = stmt.get(email.toLowerCase().trim(), codigoOtp.trim(), agora) as any;
    return res || null;
  }

  public marcarOtpUsado(id: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare("UPDATE clientes_recuperacao_senha SET usado_em = ? WHERE id = ?;");
    stmt.run(agora, id);
  }

  public atualizarSenhaHash(clienteId: string, novaSenhaHash: string): void {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare("UPDATE clientes_credenciais SET senha_hash = ?, atualizado_em = ? WHERE cliente_id = ?;");
    stmt.run(novaSenhaHash, agora, clienteId);
  }


  public atualizarPushToken(dispositivoId: string, tokenPush: string): void {
    const stmt = this.db.prepare(`
      UPDATE dispositivos_moveis
      SET token_push = ?, atualizado_em = ?
      WHERE id = ?;
    `);
    stmt.run(tokenPush, new Date().toISOString(), dispositivoId);
  }

  public listarNotificacoes(clienteId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT id, titulo, mensagem, categoria, prioridade, lida, criado_em, link_acao
      FROM notificacoes_sistema
      WHERE destinatario_tipo = 'cliente' AND (destinatario_id = ? OR destinatario_id IS NULL)
      ORDER BY criado_em DESC
      LIMIT 50;
    `);
    return stmt.all(clienteId);
  }

  public contarNotificacoesNaoLidas(clienteId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM notificacoes_sistema
      WHERE destinatario_tipo = 'cliente' AND (destinatario_id = ? OR destinatario_id IS NULL) AND lida = 0;
    `);
    const row = stmt.get(clienteId) as { total: number } | undefined;
    return row?.total ?? 0;
  }

  public marcarNotificacaoLida(id: string, clienteId: string): void {
    const stmt = this.db.prepare(`
      UPDATE notificacoes_sistema
      SET lida = 1, lida_em = ?
      WHERE id = ? AND destinatario_tipo = 'cliente' AND (destinatario_id = ? OR destinatario_id IS NULL);
    `);
    stmt.run(new Date().toISOString(), id, clienteId);
  }

  public marcarTodasNotificacoesLidas(clienteId: string): void {
    const stmt = this.db.prepare(`
      UPDATE notificacoes_sistema
      SET lida = 1, lida_em = ?
      WHERE destinatario_tipo = 'cliente' AND (destinatario_id = ? OR destinatario_id IS NULL) AND lida = 0;
    `);
    stmt.run(new Date().toISOString(), clienteId);
  }

}
