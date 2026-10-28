import type { DatabaseSync } from "node:sqlite";
import type {
  Parceiro,
  UsuarioParceiro,
  SessaoParceiro,
  OperacaoParceiro,
  EstadoOperacaoParceiro,
  EstadoParceiro,
  TipoParceiro,
  FuncaoUsuarioParceiro,
  ReconciliacaoItem,
  RelatorioReconciliacao,
} from "./parceiros.types.js";

export class ParceirosRepository {
  constructor(private db: DatabaseSync) {}

  // ==========================================
  // PARCEIROS COMERCIAIS
  // ==========================================

  public criarParceiro(dados: {
    id: string;
    codigo: string;
    nome: string;
    tipo: TipoParceiro;
    canaisSuportados: string[];
    comissaoPercentual: string;
    limiteDiarioAoa: string;
    estado: EstadoParceiro;
    chaveApi?: string | null | undefined;
    webhookUrl?: string | null | undefined;
  }): Parceiro {
    const agora = new Date().toISOString();
    const canaisJson = JSON.stringify(dados.canaisSuportados);

    this.db
      .prepare(
        `
        INSERT INTO parceiros (
          id, codigo, nome, tipo, canais_suportados, comissao_percentual,
          limite_diario_aoa, estado, chave_api, webhook_url, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        dados.id,
        dados.codigo.toUpperCase(),
        dados.nome,
        dados.tipo,
        canaisJson,
        dados.comissaoPercentual,
        dados.limiteDiarioAoa,
        dados.estado,
        dados.chaveApi ?? null,
        dados.webhookUrl ?? null,
        agora,
        agora
      );

    return {
      ...dados,
      codigo: dados.codigo.toUpperCase(),
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  public buscarParceiroPorId(id: string): Parceiro | null {
    const row = this.db
      .prepare("SELECT * FROM parceiros WHERE id = ?")
      .get(id) as any;

    if (!row) return null;
    return this.mapearParceiro(row);
  }

  public buscarParceiroPorCodigo(codigo: string): Parceiro | null {
    const row = this.db
      .prepare("SELECT * FROM parceiros WHERE codigo = ? COLLATE NOCASE")
      .get(codigo.toUpperCase()) as any;

    if (!row) return null;
    return this.mapearParceiro(row);
  }

  public listarParceiros(): Parceiro[] {
    const rows = this.db
      .prepare("SELECT * FROM parceiros ORDER BY criado_em DESC")
      .all() as any[];

    return rows.map((r) => this.mapearParceiro(r));
  }

  public atualizarParceiro(
    id: string,
    dados: {
      nome?: string | undefined;
      canaisSuportados?: string[] | undefined;
      comissaoPercentual?: string | undefined;
      limiteDiarioAoa?: string | undefined;
      webhookUrl?: string | null | undefined;
    }
  ): Parceiro | null {
    const atual = this.buscarParceiroPorId(id);
    if (!atual) return null;

    const agora = new Date().toISOString();
    const nome = dados.nome ?? atual.nome;
    const canais = dados.canaisSuportados ? JSON.stringify(dados.canaisSuportados) : JSON.stringify(atual.canaisSuportados);
    const comissao = dados.comissaoPercentual ?? atual.comissaoPercentual;
    const limite = dados.limiteDiarioAoa ?? atual.limiteDiarioAoa;
    const webhook = dados.webhookUrl !== undefined ? dados.webhookUrl : (atual.webhookUrl ?? null);

    this.db
      .prepare(
        `
        UPDATE parceiros
        SET nome = ?, canais_suportados = ?, comissao_percentual = ?, limite_diario_aoa = ?, webhook_url = ?, atualizado_em = ?
        WHERE id = ?
      `
      )
      .run(nome, canais, comissao, limite, webhook, agora, id);

    return this.buscarParceiroPorId(id);
  }

  public atualizarStatusParceiro(id: string, estado: EstadoParceiro): boolean {
    const agora = new Date().toISOString();
    const res = this.db
      .prepare("UPDATE parceiros SET estado = ?, atualizado_em = ? WHERE id = ?")
      .run(estado, agora, id);

    return res.changes > 0;
  }

  // ==========================================
  // UTILIZADORES DE PARCEIROS
  // ==========================================

  public criarUsuarioParceiro(dados: {
    id: string;
    parceiroId: string;
    nome: string;
    email: string;
    senhaHash: string;
    funcao?: FuncaoUsuarioParceiro | undefined;
  }): UsuarioParceiro {
    const agora = new Date().toISOString();
    const funcao = dados.funcao ?? "operador_parceiro";

    this.db
      .prepare(
        `
        INSERT INTO usuarios_parceiros (
          id, parceiro_id, nome, email, senha_hash, funcao, ativo, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `
      )
      .run(dados.id, dados.parceiroId, dados.nome, dados.email.toLowerCase(), dados.senhaHash, funcao, agora, agora);

    return {
      id: dados.id,
      parceiroId: dados.parceiroId,
      nome: dados.nome,
      email: dados.email.toLowerCase(),
      senhaHash: dados.senhaHash,
      funcao,
      ativo: true,
      ultimoLoginEm: null,
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  public buscarUsuarioPorEmail(email: string): UsuarioParceiro | null {
    const row = this.db
      .prepare("SELECT * FROM usuarios_parceiros WHERE email = ? COLLATE NOCASE")
      .get(email.toLowerCase()) as any;

    if (!row) return null;
    return this.mapearUsuarioParceiro(row);
  }

  public buscarUsuarioPorId(id: string): UsuarioParceiro | null {
    const row = this.db
      .prepare("SELECT * FROM usuarios_parceiros WHERE id = ?")
      .get(id) as any;

    if (!row) return null;
    return this.mapearUsuarioParceiro(row);
  }

  public atualizarUltimoLoginUsuario(id: string): void {
    const agora = new Date().toISOString();
    this.db.prepare("UPDATE usuarios_parceiros SET ultimo_login_em = ? WHERE id = ?").run(agora, id);
  }

  // ==========================================
  // SESSÕES DE PARCEIROS
  // ==========================================

  public criarSessao(
    parceiroId: string,
    usuarioParceiroId: string,
    token: string,
    horasValidade = 24,
    ip?: string | null | undefined,
    userAgent?: string | null | undefined
  ): SessaoParceiro {
    const agora = new Date();
    const expira = new Date(agora.getTime() + horasValidade * 3600 * 1000);

    const agoraIso = agora.toISOString();
    const expiraIso = expira.toISOString();

    this.db
      .prepare(
        `
        INSERT INTO sessoes_parceiros (id, parceiro_id, usuario_parceiro_id, expira_em, ip, user_agent, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(token, parceiroId, usuarioParceiroId, expiraIso, ip ?? null, userAgent ?? null, agoraIso);

    return {
      id: token,
      parceiroId,
      usuarioParceiroId,
      expiraEm: expiraIso,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      criadoEm: agoraIso,
    };
  }

  public buscarSessaoAtiva(token: string): {
    sessao: SessaoParceiro;
    usuario: UsuarioParceiro;
    parceiro: Parceiro;
  } | null {
    const agoraIso = new Date().toISOString();

    const row = this.db
      .prepare(
        `
        SELECT
          s.id as sessao_id, s.parceiro_id as sessao_parceiro_id, s.usuario_parceiro_id,
          s.expira_em, s.revogado_em, s.ip, s.user_agent, s.criado_em as sessao_criado_em,
          u.nome as usuario_nome, u.email as usuario_email, u.funcao as usuario_funcao, u.ativo as usuario_ativo,
          p.codigo as parceiro_codigo, p.nome as parceiro_nome, p.tipo as parceiro_tipo,
          p.canais_suportados as parceiro_canais, p.comissao_percentual as parceiro_comissao,
          p.limite_diario_aoa as parceiro_limite, p.estado as parceiro_estado,
          p.chave_api as parceiro_chave_api, p.webhook_url as parceiro_webhook,
          p.criado_em as parceiro_criado_em, p.atualizado_em as parceiro_atualizado_em
        FROM sessoes_parceiros s
        JOIN usuarios_parceiros u ON u.id = s.usuario_parceiro_id
        JOIN parceiros p ON p.id = s.parceiro_id
        WHERE s.id = ? AND s.revogado_em IS NULL AND s.expira_em > ? AND u.ativo = 1 AND p.estado = 'ativo'
      `
      )
      .get(token, agoraIso) as any;

    if (!row) return null;

    let canaisSuportados: string[] = [];
    try {
      canaisSuportados = JSON.parse(row.parceiro_canais);
    } catch {
      canaisSuportados = ["remessas"];
    }

    return {
      sessao: {
        id: row.sessao_id,
        parceiroId: row.sessao_parceiro_id,
        usuarioParceiroId: row.usuario_parceiro_id,
        expiraEm: row.expira_em,
        revogadoEm: row.revogado_em,
        ip: row.ip,
        userAgent: row.user_agent,
        criadoEm: row.sessao_criado_em,
      },
      usuario: {
        id: row.usuario_parceiro_id,
        parceiroId: row.sessao_parceiro_id,
        nome: row.usuario_nome,
        email: row.usuario_email,
        senhaHash: "",
        funcao: row.usuario_funcao as FuncaoUsuarioParceiro,
        ativo: Boolean(row.usuario_ativo),
        criadoEm: "",
        atualizadoEm: "",
      },
      parceiro: {
        id: row.sessao_parceiro_id,
        codigo: row.parceiro_codigo,
        nome: row.parceiro_nome,
        tipo: row.parceiro_tipo as TipoParceiro,
        canaisSuportados,
        comissaoPercentual: row.parceiro_comissao,
        limiteDiarioAoa: row.parceiro_limite,
        estado: row.parceiro_estado as EstadoParceiro,
        chaveApi: row.parceiro_chave_api,
        webhookUrl: row.parceiro_webhook,
        criadoEm: row.parceiro_criado_em,
        atualizadoEm: row.parceiro_atualizado_em,
      },
    };
  }

  public revogarSessao(token: string): void {
    const agoraIso = new Date().toISOString();
    this.db.prepare("UPDATE sessoes_parceiros SET revogado_em = ? WHERE id = ?").run(agoraIso, token);
  }

  // ==========================================
  // OPERAÇÕES DO PARCEIRO (MULTITENANCY ESTRITO)
  // ==========================================

  public criarOperacao(dados: {
    id: string;
    parceiroId: string;
    remessaId?: string | null | undefined;
    tipoOperacao: "remessa_saida" | "pagamento_local" | "liquidacao";
    canal: string;
    beneficiarioNome: string;
    beneficiarioPais: string;
    beneficiarioIban: string;
    beneficiarioBanco: string;
    beneficiarioSwift?: string | null | undefined;
    moeda: "USD" | "EUR" | "GBP" | "ZAR" | "AOA";
    montante: string;
    contravalorAoa: string;
    comissaoParceiroAoa: string;
    estado?: EstadoOperacaoParceiro | undefined;
    chaveIdempotencia?: string | null | undefined;
  }): OperacaoParceiro {
    const agora = new Date().toISOString();
    const estado = dados.estado ?? "pendente";

    this.db
      .prepare(
        `
        INSERT INTO operacoes_parceiros (
          id, parceiro_id, remessa_id, tipo_operacao, canal, beneficiario_nome,
          beneficiario_pais, beneficiario_iban, beneficiario_banco, beneficiario_swift,
          moeda, montante, contravalor_aoa, comissao_parceiro_aoa, estado,
          criado_em, atualizado_em, chave_idempotencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        dados.id,
        dados.parceiroId,
        dados.remessaId ?? null,
        dados.tipoOperacao,
        dados.canal,
        dados.beneficiarioNome,
        dados.beneficiarioPais,
        dados.beneficiarioIban,
        dados.beneficiarioBanco,
        dados.beneficiarioSwift ?? null,
        dados.moeda,
        dados.montante,
        dados.contravalorAoa,
        dados.comissaoParceiroAoa,
        estado,
        agora,
        agora,
        dados.chaveIdempotencia ?? null
      );

    return {
      ...dados,
      estado,
      referenciaExterna: null,
      comprovativoHash: null,
      comprovativoArquivo: null,
      motivoDevolucao: null,
      notas: null,
      criadoEm: agora,
      atualizadoEm: agora,
      liquidadoEm: null,
    };
  }

  public buscarOperacaoPorId(id: string, parceiroId?: string): OperacaoParceiro | null {
    let sql = "SELECT * FROM operacoes_parceiros WHERE id = ?";
    const params: any[] = [id];

    if (parceiroId) {
      sql += " AND parceiro_id = ?";
      params.push(parceiroId);
    }

    const row = this.db.prepare(sql).get(...params) as any;
    if (!row) return null;

    return this.mapearOperacaoParceiro(row);
  }

  public buscarOperacaoPorChaveIdempotencia(chave: string): OperacaoParceiro | null {
    const row = this.db
      .prepare("SELECT * FROM operacoes_parceiros WHERE chave_idempotencia = ?")
      .get(chave) as any;

    if (!row) return null;
    return this.mapearOperacaoParceiro(row);
  }

  public listarOperacoesPorParceiro(
    parceiroId: string,
    filtros: {
      estado?: string | undefined;
      canal?: string | undefined;
      moeda?: string | undefined;
      busca?: string | undefined;
      limite?: number | undefined;
      offset?: number | undefined;
    } = {}
  ): { total: number; itens: OperacaoParceiro[] } {
    let where = "WHERE parceiro_id = ?";
    const params: any[] = [parceiroId];

    if (filtros.estado) {
      where += " AND estado = ?";
      params.push(filtros.estado);
    }

    if (filtros.canal) {
      where += " AND canal = ?";
      params.push(filtros.canal);
    }

    if (filtros.moeda) {
      where += " AND moeda = ?";
      params.push(filtros.moeda);
    }

    if (filtros.busca) {
      where += " AND (id LIKE ? OR beneficiario_nome LIKE ? OR referencia_externa LIKE ? OR beneficiario_iban LIKE ?)";
      const like = `%${filtros.busca}%`;
      params.push(like, like, like, like);
    }

    const totalRow = this.db.prepare(`SELECT COUNT(*) as contagem FROM operacoes_parceiros ${where}`).get(...params) as any;
    const total = totalRow ? Number(totalRow.contagem) : 0;

    const limite = filtros.limite ?? 50;
    const offset = filtros.offset ?? 0;

    const rows = this.db
      .prepare(`SELECT * FROM operacoes_parceiros ${where} ORDER BY criado_em DESC LIMIT ? OFFSET ?`)
      .all(...params, limite, offset) as any[];

    return {
      total,
      itens: rows.map((r) => this.mapearOperacaoParceiro(r)),
    };
  }

  public atualizarEstadoOperacao(
    id: string,
    parceiroId: string,
    estado: EstadoOperacaoParceiro,
    dadosExtras: {
      referenciaExterna?: string | null | undefined;
      comprovativoHash?: string | null | undefined;
      comprovativoArquivo?: string | null | undefined;
      motivoDevolucao?: string | null | undefined;
      notas?: string | null | undefined;
      liquidadoEm?: string | null | undefined;
      chaveIdempotencia?: string | null | undefined;
    } = {}
  ): boolean {
    const agora = new Date().toISOString();

    const sql = `
      UPDATE operacoes_parceiros
      SET estado = ?,
          referencia_externa = COALESCE(?, referencia_externa),
          comprovativo_hash = COALESCE(?, comprovativo_hash),
          comprovativo_arquivo = COALESCE(?, comprovativo_arquivo),
          motivo_devolucao = COALESCE(?, motivo_devolucao),
          notas = COALESCE(?, notas),
          liquidado_em = COALESCE(?, liquidado_em),
          chave_idempotencia = COALESCE(?, chave_idempotencia),
          atualizado_em = ?
      WHERE id = ? AND parceiro_id = ?
    `;

    const res = this.db
      .prepare(sql)
      .run(
        estado,
        dadosExtras.referenciaExterna ?? null,
        dadosExtras.comprovativoHash ?? null,
        dadosExtras.comprovativoArquivo ?? null,
        dadosExtras.motivoDevolucao ?? null,
        dadosExtras.notas ?? null,
        dadosExtras.liquidadoEm ?? null,
        dadosExtras.chaveIdempotencia ?? null,
        agora,
        id,
        parceiroId
      );

    return res.changes > 0;
  }

  public obterMetricasDashboard(parceiroId: string): {
    totalRecebidas: number;
    pendentes: number;
    emProcessamento: number;
    concluidas: number;
    devolvidas: number;
    volumeTotalDivisa: Record<string, string>;
    volumeTotalAoa: string;
    comissaoAcumuladaAoa: string;
  } {
    const rows = this.db
      .prepare(
        `
        SELECT
          estado,
          moeda,
          SUM(CAST(montante as REAL)) as soma_montante,
          SUM(CAST(contravalor_aoa as REAL)) as soma_aoa,
          SUM(CAST(comissao_parceiro_aoa as REAL)) as soma_comissao,
          COUNT(*) as total
        FROM operacoes_parceiros
        WHERE parceiro_id = ?
        GROUP BY estado, moeda
      `
      )
      .all(parceiroId) as any[];

    let totalRecebidas = 0;
    let pendentes = 0;
    let emProcessamento = 0;
    let concluidas = 0;
    let devolvidas = 0;
    let somaAoaTotal = 0;
    let somaComissaoTotal = 0;
    const volumesPorMoeda: Record<string, number> = {};

    for (const r of rows) {
      const q = Number(r.total);
      totalRecebidas += q;

      if (r.estado === "pendente") pendentes += q;
      else if (r.estado === "em_processamento") emProcessamento += q;
      else if (r.estado === "liquidada") {
        concluidas += q;
        somaAoaTotal += Number(r.soma_aoa || 0);
        somaComissaoTotal += Number(r.soma_comissao || 0);

        const m = String(r.moeda);
        volumesPorMoeda[m] = (volumesPorMoeda[m] || 0) + Number(r.soma_montante || 0);
      } else if (r.estado === "devolvida") devolvidas += q;
    }

    const volumeTotalDivisaFormatado: Record<string, string> = {};
    for (const [moeda, val] of Object.entries(volumesPorMoeda)) {
      volumeTotalDivisaFormatado[moeda] = val.toFixed(2);
    }

    return {
      totalRecebidas,
      pendentes,
      emProcessamento,
      concluidas,
      devolvidas,
      volumeTotalDivisa: volumeTotalDivisaFormatado,
      volumeTotalAoa: somaAoaTotal.toFixed(2),
      comissaoAcumuladaAoa: somaComissaoTotal.toFixed(2),
    };
  }

  // ==========================================
  // RECONCILIAÇÃO
  // ==========================================

  public salvarReconciliacao(dados: {
    id: string;
    parceiroId: string;
    dataReferencia: string;
    totalInstrucoes: number;
    totalConciliadas: number;
    totalDivergentes: number;
    volumeTotal: string;
    detalhes: ReconciliacaoItem[];
  }): RelatorioReconciliacao {
    const agora = new Date().toISOString();
    const json = JSON.stringify(dados.detalhes);

    this.db
      .prepare(
        `
        INSERT INTO reconciliacoes_parceiros (
          id, parceiro_id, data_referencia, total_instrucoes, total_conciliadas,
          total_divergentes, volume_total, detalhes_json, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        dados.id,
        dados.parceiroId,
        dados.dataReferencia,
        dados.totalInstrucoes,
        dados.totalConciliadas,
        dados.totalDivergentes,
        dados.volumeTotal,
        json,
        agora
      );

    return {
      ...dados,
      criadoEm: agora,
    };
  }

  public listarReconciliacoesPorParceiro(parceiroId: string, limite = 20): RelatorioReconciliacao[] {
    const rows = this.db
      .prepare("SELECT * FROM reconciliacoes_parceiros WHERE parceiro_id = ? ORDER BY criado_em DESC LIMIT ?")
      .all(parceiroId, limite) as any[];

    return rows.map((r) => {
      let detalhes: ReconciliacaoItem[] = [];
      try {
        detalhes = JSON.parse(r.detalhes_json);
      } catch {}

      return {
        id: r.id,
        parceiroId: r.parceiro_id,
        dataReferencia: r.data_referencia,
        totalInstrucoes: Number(r.total_instrucoes),
        totalConciliadas: Number(r.total_conciliadas),
        totalDivergentes: Number(r.total_divergentes),
        volumeTotal: r.volume_total,
        detalhes,
        criadoEm: r.criado_em,
      };
    });
  }

  // ==========================================
  // MAPEAMENTOS
  // ==========================================

  private mapearParceiro(row: any): Parceiro {
    let canaisSuportados: string[] = [];
    try {
      canaisSuportados = JSON.parse(row.canais_suportados);
    } catch {
      canaisSuportados = ["remessas"];
    }

    return {
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      tipo: row.tipo,
      canaisSuportados,
      comissaoPercentual: row.comissao_percentual,
      limiteDiarioAoa: row.limite_diario_aoa,
      estado: row.estado,
      chaveApi: row.chave_api,
      webhookUrl: row.webhook_url,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }

  private mapearUsuarioParceiro(row: any): UsuarioParceiro {
    return {
      id: row.id,
      parceiroId: row.parceiro_id,
      nome: row.nome,
      email: row.email,
      senhaHash: row.senha_hash,
      funcao: row.funcao,
      ativo: Boolean(row.ativo),
      ultimoLoginEm: row.ultimo_login_em,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }

  private mapearOperacaoParceiro(row: any): OperacaoParceiro {
    return {
      id: row.id,
      parceiroId: row.parceiro_id,
      remessaId: row.remessa_id,
      tipoOperacao: row.tipo_operacao,
      canal: row.canal,
      beneficiarioNome: row.beneficiario_nome,
      beneficiarioPais: row.beneficiario_pais,
      beneficiarioIban: row.beneficiario_iban,
      beneficiarioBanco: row.beneficiario_banco,
      beneficiarioSwift: row.beneficiario_swift,
      moeda: row.moeda,
      montante: row.montante,
      contravalorAoa: row.contravalor_aoa,
      comissaoParceiroAoa: row.comissao_parceiro_aoa,
      estado: row.estado,
      referenciaExterna: row.referencia_externa,
      comprovativoHash: row.comprovativo_hash,
      comprovativoArquivo: row.comprovativo_arquivo,
      motivoDevolucao: row.motivo_devolucao,
      notas: row.notas,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
      liquidadoEm: row.liquidado_em,
      chaveIdempotencia: row.chave_idempotencia,
    };
  }
}
