export interface ParceiroInfo {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  canaisSuportados: string[];
  comissaoPercentual: string;
  limiteDiarioAoa: string;
  estado: string;
}

export interface UsuarioInfo {
  id: string;
  parceiroId: string;
  nome: string;
  email: string;
  funcao: string;
  ativo: boolean;
}

export interface OperacaoItem {
  id: string;
  parceiroId: string;
  remessaId?: string | null | undefined;
  tipoOperacao: string;
  canal: string;
  beneficiarioNome: string;
  beneficiarioPais: string;
  beneficiarioIban: string;
  beneficiarioBanco: string;
  beneficiarioSwift?: string | null | undefined;
  moeda: string;
  montante: string;
  contravalorAoa: string;
  comissaoParceiroAoa: string;
  estado: "pendente" | "em_processamento" | "liquidada" | "devolvida" | "cancelada";
  referenciaExterna?: string | null | undefined;
  comprovativoHash?: string | null | undefined;
  comprovativoArquivo?: string | null | undefined;
  motivoDevolucao?: string | null | undefined;
  notas?: string | null | undefined;
  criadoEm: string;
  atualizadoEm: string;
  liquidadoEm?: string | null | undefined;
}

export interface DashboardResumo {
  parceiro: ParceiroInfo;
  metricas: {
    totalRecebidas: number;
    pendentes: number;
    emProcessamento: number;
    concluidas: number;
    devolvidas: number;
    volumeTotalDivisa: Record<string, string>;
    volumeTotalAoa: string;
    comissaoAcumuladaAoa: string;
  };
  adaptadores: Array<{
    canal: string;
    nome: string;
    modo: string;
    configurado: boolean;
    status: string;
  }>;
  recentes: OperacaoItem[];
}

export interface RelatorioReconciliacaoItem {
  id: string;
  parceiroId: string;
  dataReferencia: string;
  totalInstrucoes: number;
  totalConciliadas: number;
  totalDivergentes: number;
  volumeTotal: string;
  detalhes: Array<{
    referencia: string;
    referenciaExterna?: string | null | undefined;
    montante: string;
    moeda: string;
    estadoNzaidi: string;
    estadoParceiro: string;
    conciliado: boolean;
    divergencia?: string | null | undefined;
  }>;
  criadoEm: string;
}

class ParceiroApiClient {
  private baseUrl = "";
  private tokenKey = "nzaidi_parceiro_token";

  constructor() {
    this.capturarSessaoSuporteUrl();
  }

  private capturarSessaoSuporteUrl(): void {
    try {
      const params = new URLSearchParams(window.location.search);
      const tokenSuporte = params.get("sessao_suporte");
      if (tokenSuporte) {
        localStorage.setItem(this.tokenKey, tokenSuporte);
        const hash = window.location.hash || "#dashboard";
        window.history.replaceState({}, "", `${window.location.pathname}${hash}`);
      }
    } catch {}
  }

  public setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  public getToken(): string | null {
    this.capturarSessaoSuporteUrl();
    return localStorage.getItem(this.tokenKey);
  }

  public clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private async requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${caminho}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(opcoes.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const resposta = await fetch(url, {
      ...opcoes,
      headers,
      credentials: "include",
    });

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      const msg = dados?.erro || dados?.mensagem || `Erro HTTP ${resposta.status}`;
      throw new Error(msg);
    }

    return dados;
  }

  // --- Auth Parceiro ---

  public async login(email: string, senha: string): Promise<{ usuario: UsuarioInfo; parceiro: ParceiroInfo; token: string }> {
    const res = await this.requisitar<{
      sucesso: boolean;
      dados: { usuario: UsuarioInfo; parceiro: ParceiroInfo; token: string };
    }>("/api/v1/parceiro/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });

    this.setToken(res.dados.token);
    return res.dados;
  }

  public async registo(payload: {
    nomeEntidade: string;
    codigoSugerido?: string;
    tipo: string;
    canaisSuportados: string[];
    nomeResponsavel: string;
    emailCorporativo: string;
    senha: string;
  }): Promise<{ usuario: UsuarioInfo; parceiro: ParceiroInfo; token: string }> {
    const res = await this.requisitar<{
      sucesso: boolean;
      dados: { usuario: UsuarioInfo; parceiro: ParceiroInfo; token: string };
    }>("/api/v1/parceiro/auth/registo", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    this.setToken(res.dados.token);
    return res.dados;
  }

  public async obterMe(): Promise<{ parceiro: ParceiroInfo; usuario: UsuarioInfo }> {
    const res = await this.requisitar<{
      sucesso: boolean;
      dados: { parceiro: ParceiroInfo; usuario: UsuarioInfo };
    }>("/api/v1/parceiro/auth/me", { method: "GET" });

    return res.dados;
  }

  public async logout(): Promise<void> {
    try {
      await this.requisitar("/api/v1/parceiro/auth/logout", { method: "POST" });
    } finally {
      this.clearToken();
    }
  }

  public async recuperarSenha(email: string): Promise<string> {
    const res = await this.requisitar<{ sucesso: boolean; mensagem: string }>(
      "/api/v1/parceiro/auth/recuperar-senha",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      }
    );
    return res.mensagem;
  }

  // --- Dashboard & Operações ---

  public async obterDashboardResumo(): Promise<DashboardResumo> {
    const res = await this.requisitar<{ sucesso: boolean; dados: DashboardResumo }>(
      "/api/v1/parceiro/dashboard/resumo",
      { method: "GET" }
    );
    return res.dados;
  }

  public async listarOperacoes(filtros: {
    estado?: string | undefined;
    canal?: string | undefined;
    moeda?: string | undefined;
    busca?: string | undefined;
    limite?: number | undefined;
    offset?: number | undefined;
  } = {}): Promise<{ total: number; dados: OperacaoItem[] }> {
    const params = new URLSearchParams();
    if (filtros.estado && filtros.estado !== "todos") params.set("estado", filtros.estado);
    if (filtros.canal) params.set("canal", filtros.canal);
    if (filtros.moeda) params.set("moeda", filtros.moeda);
    if (filtros.busca) params.set("busca", filtros.busca);
    if (filtros.limite) params.set("limite", String(filtros.limite));
    if (filtros.offset) params.set("offset", String(filtros.offset));

    const res = await this.requisitar<{ sucesso: boolean; total: number; dados: OperacaoItem[] }>(
      `/api/v1/parceiro/operacoes?${params.toString()}`,
      { method: "GET" }
    );
    return res;
  }

  public async obterOperacao(id: string): Promise<OperacaoItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: OperacaoItem }>(
      `/api/v1/parceiro/operacoes/${id}`,
      { method: "GET" }
    );
    return res.dados;
  }

  public async confirmarRecepcao(id: string, notas?: string | undefined): Promise<OperacaoItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: OperacaoItem }>(
      `/api/v1/parceiro/operacoes/${id}/confirmar-recepcao`,
      {
        method: "POST",
        body: JSON.stringify({ notas }),
      }
    );
    return res.dados;
  }

  public async liquidarOperacao(
    id: string,
    payload: {
      referenciaExterna: string;
      comprovativoArquivo?: string | undefined;
      comprovativoHash?: string | undefined;
      notas?: string | undefined;
      chaveIdempotencia: string;
    }
  ): Promise<OperacaoItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: OperacaoItem }>(
      `/api/v1/parceiro/operacoes/${id}/liquidar`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  public async devolverOperacao(
    id: string,
    payload: {
      motivoDevolucao: string;
      notas?: string | undefined;
    }
  ): Promise<OperacaoItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: OperacaoItem }>(
      `/api/v1/parceiro/operacoes/${id}/devolver`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  // --- Reconciliação ---

  public async processarReconciliacao(lote: {
    dataReferencia: string;
    itens: Array<{
      referencia: string;
      referenciaExterna?: string | undefined;
      montante: string;
      moeda: string;
      estadoReportado: "pendente" | "em_processamento" | "liquidada" | "rejeitada";
    }>;
  }): Promise<RelatorioReconciliacaoItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: RelatorioReconciliacaoItem }>(
      "/api/v1/parceiro/reconciliacao/processar",
      {
        method: "POST",
        body: JSON.stringify(lote),
      }
    );
    return res.dados;
  }

  public async listarHistoricoReconciliacao(): Promise<RelatorioReconciliacaoItem[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: RelatorioReconciliacaoItem[] }>(
      "/api/v1/parceiro/reconciliacao/historico",
      { method: "GET" }
    );
    return res.dados;
  }
}

export const api = new ParceiroApiClient();
