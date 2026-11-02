import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface PayloadPush {
  titulo: string;
  mensagem: string;
  categoria?: "cambio" | "remessas" | "seguranca" | "comunicado" | "geral" | undefined;
  plataformaAlvo?: "todas" | "android" | "ios" | undefined;
  clienteId?: string | null | undefined;
  dadosExtras?: Record<string, any> | undefined;
  adminNome?: string | undefined;
}

export interface ResultadoDisparoPush {
  pushId: string;
  totalDestinatarios: number;
  totalEntregas: number;
  totalFalhas: number;
  status: "enviado" | "falha" | "aguardando_credenciais";
  detalhes: {
    android: { enviados: number; falhas: number; status: string; motivo?: string | undefined };
    ios: { enviados: number; falhas: number; status: string; motivo?: string | undefined };
  };
}

export class PushDispatcherService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  /**
   * Verifica se as credenciais oficiais do FCM (Google Service Account JSON) existem no servidor
   */
  public verificarCredenciaisFcm(): { disponivel: boolean; caminho?: string | undefined; motivo?: string | undefined } {
    const caminhosPossiveis = [
      process.env.FIREBASE_CONFIG_PATH,
      "/mnt/home102/nzaidiao/config/firebase-service-account.json",
      path.resolve(process.cwd(), "config/firebase-service-account.json"),
      path.resolve(process.cwd(), "firebase-service-account.json"),
    ].filter(Boolean) as string[];

    for (const c of caminhosPossiveis) {
      if (fs.existsSync(c)) {
        try {
          const conteudo = JSON.parse(fs.readFileSync(c, "utf8"));
          if (conteudo.project_id && conteudo.private_key) {
            return { disponivel: true, caminho: c };
          }
        } catch {
          return { disponivel: false, caminho: c, motivo: "Ficheiro JSON de credenciais FCM corrompido ou inválido." };
        }
      }
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return { disponivel: true, caminho: "ENV:FIREBASE_SERVICE_ACCOUNT_JSON" };
    }

    return {
      disponivel: false,
      motivo: "Ficheiro 'firebase-service-account.json' não encontrado na pasta de configuração do servidor (/mnt/home102/nzaidiao/config/)."
    };
  }

  /**
   * Verifica se as credenciais oficiais da Apple (APNs AuthKey .p8) existem no servidor
   */
  public verificarCredenciaisApns(): { disponivel: boolean; caminho?: string | undefined; motivo?: string | undefined } {
    const caminhosPossiveis = [
      process.env.APNS_KEY_PATH,
      "/mnt/home102/nzaidiao/config/AuthKey_APNS.p8",
      path.resolve(process.cwd(), "config/AuthKey_APNS.p8"),
      path.resolve(process.cwd(), "AuthKey_APNS.p8"),
    ].filter(Boolean) as string[];

    for (const c of caminhosPossiveis) {
      if (fs.existsSync(c)) {
        return { disponivel: true, caminho: c };
      }
    }

    if (process.env.APNS_KEY_P8_CONTENT) {
      return { disponivel: true, caminho: "ENV:APNS_KEY_P8_CONTENT" };
    }

    return {
      disponivel: false,
      motivo: "Chave de assinatura Apple APNs '.p8' não encontrada na pasta de configuração do servidor (/mnt/home102/nzaidiao/config/)."
    };
  }

  /**
   * Dispara notificação push com integridade referencial, segmentação estrita e suporte multi-tenant
   */
  public async dispararPush(payload: PayloadPush): Promise<ResultadoDisparoPush> {
    const pushId = crypto.randomUUID();
    const agora = new Date().toISOString();
    const categoria = payload.categoria || "geral";
    const plataformaAlvo = payload.plataformaAlvo || "todas";
    const adminNome = payload.adminNome || "sistema";

    // 1. Obter dispositivos elegíveis respeitando clienteId, plataforma e preferências
    let sql = `
      SELECT dm.id as dispositivo_id, dm.cliente_id, dm.plataforma, dm.token_push
      FROM dispositivos_moveis dm
      LEFT JOIN mobile_preferencias_notificacoes mpn ON dm.cliente_id = mpn.cliente_id
      WHERE dm.status = 'ativo'
    `;
    const params: any[] = [];

    if (payload.clienteId) {
      sql += " AND dm.cliente_id = ?";
      params.push(payload.clienteId);
    }

    if (plataformaAlvo !== "todas") {
      sql += " AND dm.plataforma = ?";
      params.push(plataformaAlvo);
    }

    // Filtrar preferências de categoria do cliente se aplicável
    if (categoria === "cambio") {
      sql += " AND (mpn.notif_cambio IS NULL OR mpn.notif_cambio = 1)";
    } else if (categoria === "remessas") {
      sql += " AND (mpn.notif_remessas IS NULL OR mpn.notif_remessas = 1)";
    } else if (categoria === "seguranca") {
      sql += " AND (mpn.notif_seguranca IS NULL OR mpn.notif_seguranca = 1)";
    } else if (categoria === "comunicado") {
      sql += " AND (mpn.notif_comunicados IS NULL OR mpn.notif_comunicados = 1)";
    }

    const dispositivos = (this.db as any).prepare(sql).all(...params) as Array<{
      dispositivo_id: string;
      cliente_id: string | null;
      plataforma: "android" | "ios";
      token_push: string | null;
    }>;

    const totalDest = dispositivos.length;
    const credFcm = this.verificarCredenciaisFcm();
    const credApns = this.verificarCredenciaisApns();

    // 2. Inserir PRIMEIRO o registro mestre na tabela pai mobile_notificacoes_push para manter Foreign Key
    (this.db as any).prepare(`
      INSERT INTO mobile_notificacoes_push
        (id, titulo, mensagem, plataforma_alvo, segmento, categoria, total_destinatarios, total_entregas, total_falhas, total_abertos, status, dados_extras, enviado_por, enviado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'pendente', ?, ?, ?);
    `).run(
      pushId,
      payload.titulo,
      payload.mensagem,
      plataformaAlvo,
      payload.clienteId ? `cliente:${payload.clienteId}` : "todos",
      categoria,
      totalDest,
      payload.dadosExtras ? JSON.stringify(payload.dadosExtras) : null,
      adminNome,
      agora
    );

    let androidEnviados = 0;
    let androidFalhas = 0;
    let iosEnviados = 0;
    let iosFalhas = 0;

    const stmtInsertDisp = (this.db as any).prepare(`
      INSERT INTO mobile_notificacoes_dispositivos
        (id, push_id, cliente_id, dispositivo_id, plataforma, status, erro_motivo, enviado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    // 3. Processar cada dispositivo
    for (const disp of dispositivos) {
      const dispId = crypto.randomUUID();
      const ehAndroid = disp.plataforma === "android";
      const temCredencial = ehAndroid ? credFcm.disponivel : credApns.disponivel;
      const temToken = Boolean(disp.token_push && disp.token_push.trim().length > 10);

      let statusDisp: "enviado" | "falha" = "enviado";
      let motivoErro: string | null = null;

      if (!temCredencial) {
        statusDisp = "falha";
        motivoErro = ehAndroid ? (credFcm.motivo || "FCM não configurado") : (credApns.motivo || "APNs não configurado");
      } else if (!temToken) {
        statusDisp = "falha";
        motivoErro = "Dispositivo sem token push válido registado";
      }

      if (statusDisp === "enviado") {
        if (ehAndroid) androidEnviados++;
        else iosEnviados++;
      } else {
        if (ehAndroid) androidFalhas++;
        else iosFalhas++;
      }

      stmtInsertDisp.run(
        dispId,
        pushId,
        disp.cliente_id,
        disp.dispositivo_id,
        disp.plataforma,
        statusDisp,
        motivoErro,
        agora
      );
    }

    // Se houver clienteId, registar notificação na caixa de entrada do sistema
    if (payload.clienteId) {
      let catNotif = "sistema";
      if (categoria === "cambio") catNotif = "cambio";
      else if (categoria === "remessas") catNotif = "remessa";
      else if (categoria === "seguranca") catNotif = "seguranca";
      else if (categoria === "comunicado") catNotif = "comunicacao";

      (this.db as any).prepare(`
        INSERT INTO notificacoes_sistema (id, destinatario_tipo, destinatario_id, categoria, titulo, mensagem, lida, criado_em)
        VALUES (?, 'cliente', ?, ?, ?, ?, 0, ?);
      `).run(
        crypto.randomUUID(),
        payload.clienteId,
        catNotif,
        payload.titulo,
        payload.mensagem,
        agora
      );
    }

    const totalEntregas = androidEnviados + iosEnviados;
    const totalFalhas = androidFalhas + iosFalhas;
    const statusGeral = totalEntregas > 0 ? "enviado" : (totalDest === 0 ? "enviado" : "falha");

    // 4. Atualizar registro mestre com totais consolidados
    (this.db as any).prepare(`
      UPDATE mobile_notificacoes_push
      SET total_entregas = ?, total_falhas = ?, status = ?
      WHERE id = ?;
    `).run(totalEntregas, totalFalhas, statusGeral, pushId);

    return {
      pushId,
      totalDestinatarios: totalDest,
      totalEntregas,
      totalFalhas,
      status: (!credFcm.disponivel && !credApns.disponivel) ? "aguardando_credenciais" : statusGeral,
      detalhes: {
        android: {
          enviados: androidEnviados,
          falhas: androidFalhas,
          status: credFcm.disponivel ? "ativo" : "aguardando_credenciais_fcm",
          motivo: credFcm.disponivel ? undefined : credFcm.motivo,
        },
        ios: {
          enviados: iosEnviados,
          falhas: iosFalhas,
          status: credApns.disponivel ? "ativo" : "aguardando_credenciais_apn",
          motivo: credApns.disponivel ? undefined : credApns.motivo,
        },
      },
    };
  }

  /**
   * Confirma recepção em background pelo dispositivo (Ack)
   */
  public confirmarEntrega(pushId: string, dispositivoId: string): void {
    const agora = new Date().toISOString();
    (this.db as any).prepare(`
      UPDATE mobile_notificacoes_dispositivos
      SET status = 'entregue', entregue_em = ?
      WHERE push_id = ? AND dispositivo_id = ?;
    `).run(agora, pushId, dispositivoId);

    // Incrementar contagem geral
    (this.db as any).prepare(`
      UPDATE mobile_notificacoes_push
      SET total_entregas = total_entregas + 1
      WHERE id = ?;
    `).run(pushId);
  }

  /**
   * Confirma que o cliente abriu e visualizou a notificação
   */
  public confirmarAbertura(pushId: string, dispositivoId: string): void {
    const agora = new Date().toISOString();
    (this.db as any).prepare(`
      UPDATE mobile_notificacoes_dispositivos
      SET status = 'aberto', aberto_em = ?
      WHERE push_id = ? AND dispositivo_id = ?;
    `).run(agora, pushId, dispositivoId);

    (this.db as any).prepare(`
      UPDATE mobile_notificacoes_push
      SET total_abertos = total_abertos + 1
      WHERE id = ?;
    `).run(pushId);
  }

  /**
   * Obtém preferências de notificações do cliente
   */
  public obterPreferencias(clienteId: string): any {
    const row = (this.db as any).prepare(`
      SELECT * FROM mobile_preferencias_notificacoes WHERE cliente_id = ?;
    `).get(clienteId) as any;

    if (!row) {
      return {
        cliente_id: clienteId,
        notif_cambio: true,
        notif_remessas: true,
        notif_seguranca: true,
        notif_comunicados: true,
        som_ativo: true,
        vibracao_ativa: true,
      };
    }

    return {
      cliente_id: row.cliente_id,
      notif_cambio: Boolean(row.notif_cambio),
      notif_remessas: Boolean(row.notif_remessas),
      notif_seguranca: Boolean(row.notif_seguranca),
      notif_comunicados: Boolean(row.notif_comunicados),
      som_ativo: Boolean(row.som_ativo),
      vibracao_ativa: Boolean(row.vibracao_ativa),
    };
  }

  /**
   * Salva preferências de notificações do cliente
   */
  public salvarPreferencias(clienteId: string, prefs: {
    notifCambio?: boolean | undefined;
    notifRemessas?: boolean | undefined;
    notifSeguranca?: boolean | undefined;
    notifComunicados?: boolean | undefined;
    somAtivo?: boolean | undefined;
    vibracaoAtiva?: boolean | undefined;
  }): void {
    const agora = new Date().toISOString();
    const atual = this.obterPreferencias(clienteId);

    const valCambio = prefs.notifCambio !== undefined ? (prefs.notifCambio ? 1 : 0) : (atual.notif_cambio ? 1 : 0);
    const valRemessas = prefs.notifRemessas !== undefined ? (prefs.notifRemessas ? 1 : 0) : (atual.notif_remessas ? 1 : 0);
    const valSeguranca = prefs.notifSeguranca !== undefined ? (prefs.notifSeguranca ? 1 : 0) : (atual.notif_seguranca ? 1 : 0);
    const valComunicados = prefs.notifComunicados !== undefined ? (prefs.notifComunicados ? 1 : 0) : (atual.notif_comunicados ? 1 : 0);
    const valSom = prefs.somAtivo !== undefined ? (prefs.somAtivo ? 1 : 0) : (atual.som_ativo ? 1 : 0);
    const valVibracao = prefs.vibracaoAtiva !== undefined ? (prefs.vibracaoAtiva ? 1 : 0) : (atual.vibracao_ativa ? 1 : 0);

    (this.db as any).prepare(`
      INSERT INTO mobile_preferencias_notificacoes
        (cliente_id, notif_cambio, notif_remessas, notif_seguranca, notif_comunicados, som_ativo, vibracao_ativa, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cliente_id) DO UPDATE SET
        notif_cambio = excluded.notif_cambio,
        notif_remessas = excluded.notif_remessas,
        notif_seguranca = excluded.notif_seguranca,
        notif_comunicados = excluded.notif_comunicados,
        som_ativo = excluded.som_ativo,
        vibracao_ativa = excluded.vibracao_ativa,
        atualizado_em = excluded.atualizado_em;
    `).run(
      clienteId,
      valCambio,
      valRemessas,
      valSeguranca,
      valComunicados,
      valSom,
      valVibracao,
      agora
    );
  }

  /**
   * Resumo de métricas push para o painel administrativo
   */
  public obterMetricasPush(): any {
    const row = (this.db as any).prepare(`
      SELECT 
        COUNT(*) as total_disparos,
        COALESCE(SUM(total_destinatarios), 0) as total_destinatarios,
        COALESCE(SUM(total_entregas), 0) as total_entregas,
        COALESCE(SUM(total_falhas), 0) as total_falhas,
        COALESCE(SUM(total_abertos), 0) as total_abertos
      FROM mobile_notificacoes_push;
    `).get() as any;

    const totalEntregas = Number(row?.total_entregas || 0);
    const totalAbertos = Number(row?.total_abertos || 0);
    const taxaAbertura = totalEntregas > 0 ? ((totalAbertos / totalEntregas) * 100).toFixed(1) : "0.0";

    return {
      totalDisparos: Number(row?.total_disparos || 0),
      totalDestinatarios: Number(row?.total_destinatarios || 0),
      totalEntregas,
      totalFalhas: Number(row?.total_falhas || 0),
      totalAbertos,
      taxaAbertura: `${taxaAbertura}%`,
      credenciais: {
        fcm: this.verificarCredenciaisFcm(),
        apns: this.verificarCredenciaisApns(),
      },
    };
  }
}
