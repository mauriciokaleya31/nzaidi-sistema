
// --- Tipos Contábeis e Financeiros (Módulo D) ---
export interface ContaContabilItem {
  codigo: string;
  nome: string;
  natureza: 'devedora' | 'credora';
  tipo: 'ativo' | 'passivo' | 'patrimonio' | 'proveito' | 'custo';
  moeda: string;
  totalDebitoAoa?: string;
  totalCreditoAoa?: string;
  saldoAoa?: string;
}

export interface PartidaContabilItem {
  id: string;
  lancamentoId: string;
  contaCodigo: string;
  contaNome: string;
  tipo: 'D' | 'C';
  montanteOriginal: string;
  moeda: string;
  montanteAoa: string;
  descricaoLinha?: string | null;
  ordem?: number;
}

export interface LancamentoContabilItem {
  id: string;
  numeroLancamento: string;
  dataMovimento: string;
  origemTipo: string;
  origemId: string;
  descricao: string;
  moeda: string;
  montanteOriginal: string;
  taxaCambio?: string | null;
  contravalorAoa: string;
  estado: 'confirmado' | 'estornado';
  estornadoEm?: string | null;
  estornoLancamentoId?: string | null;
  motivoEstorno?: string | null;
  operadorNome: string;
  criadoEm: string;
  partidas?: PartidaContabilItem[];
}

export interface DivergenciaReconciliacaoItem {
  id: string;
  tipo: string;
  referenciaId: string;
  origem: string;
  valorEsperado: string;
  valorObservado: string;
  moeda: string;
  diferenca: string;
  estado: 'aberta' | 'em_analise' | 'resolvida' | 'desconsiderada_autorizada';
  motivoResolucao?: string | null;
  resolvidoPorNome?: string | null;
  resolvidoEm?: string | null;
  criadoEm: string;
}

export interface ResumoDiarioRelatorio {
  periodo: { dataInicio: string; dataFim: string };
  operacoesCambio: { tipo: string; moeda: string; quantidade: number; totalDivisa: string; totalAoa: string }[];
  remessas: { moeda: string; quantidade: number; totalDivisa: string; totalAoa: string; totalComissaoAoa: string }[];
  receitasApuradas: { contaCodigo: string; contaNome: string; totalAoa: string }[];
}

export interface PosicaoCambialRelatorio {
  periodo: { dataInicio: string; dataFim: string };
  posicao: {
    moeda: string;
    compras: { quantidade: number; totalDivisa: string; totalAoa: string; taxaMedia: string };
    vendas: { quantidade: number; totalDivisa: string; totalAoa: string; taxaMedia: string };
    posicaoLiquidaDivisa: string;
    margemBrutaEstimadaAoa: string;
  }[];
}


export interface ParceiroItem {
  id: string;
  codigo: string;
  nome: string;
  tipo: "remessas" | "pagamentos" | "cambio" | "correspondente";
  canaisSuportados: string[];
  comissaoPercentual: string;
  limiteDiarioAoa: string;
  estado: "ativo" | "suspenso" | "inativo";
  chaveApi?: string | null;
  webhookUrl?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarParceiroPayload {
  codigo: string;
  nome: string;
  tipo: "remessas" | "pagamentos" | "cambio" | "correspondente";
  canaisSuportados: string[];
  comissaoPercentual: string;
  limiteDiarioAoa: string;
  emailAdmin: string;
  nomeAdmin: string;
  senhaAdmin: string;
}

import type { MoedaDivisa } from "@nzaidi/dominio";

export type FuncaoUsuario = "atendente" | "compliance" | "tesouraria" | "gestao";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  funcao: FuncaoUsuario;
  permissoes: string[];
  impersonadoPor?: string | null;
  impersonadoNome?: string | null;
}

export interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  funcao: FuncaoUsuario;
  ativo: boolean;
  telefone?: string | null;
  avatarUrl?: string | null;
  bloqueadoEm?: string | null;
  bloqueadoMotivo?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  ultimoLoginEm?: string | null;
}

export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  senha: string;
  funcao: FuncaoUsuario;
}

export interface TaxaItem {
  moeda: MoedaDivisa;
  referencia: string;
  compra: string;
  venda: string;
  margemCompra: string;
  margemVenda: string;
  fonte: "demonstracao" | "oficial";
  aviso?: string | null;
  atualizadoEm: string;
}

export interface EventoAuditoria {
  id: string;
  momento: string;
  autorId?: string | null;
  autorNome?: string | null;
  autorFuncao?: string | null;
  acao: string;
  recurso: string;
  recursoId?: string | null;
  detalhesJson?: string | null;
  ip?: string | null;
}

export interface ClienteItem {
  id: string;
  tipo: "singular" | "colectivo";
  nome: string;
  tipoDocumento: "bi" | "passaporte" | "cartao_residente" | "nif_empresa";
  numeroDocumento: string;
  nif: string;
  nacionalidade: string;
  telefone: string;
  email?: string | null;
  morada: string;
  estado: "ativo" | "inativo" | "bloqueado";
  estadoKyc: "pendente" | "em_analise" | "aprovado" | "rejeitado" | "actualizacao_necessaria";
  nivelRisco: "baixo" | "medio" | "alto";
  criadoEm: string;
  atualizadoEm: string;
}

export interface CaixaItem {
  id: string;
  numeroCaixa: string;
  operadorId: string;
  operadorNome: string;
  agencia: string;
  abertoEm: string;
  fechadoEm?: string | null;
  estado: "aberto" | "fechado" | "pendente_aprovacao";
  saldoInicialAoa: string;
  saldoInicialUsd: string;
  saldoInicialEur: string;
  saldoFechoAoaContado?: string | null;
  saldoFechoUsdContado?: string | null;
  saldoFechoEurContado?: string | null;
  diferencaAoa?: string | null;
  diferencaUsd?: string | null;
  diferencaEur?: string | null;
  justificativaDiferenca?: string | null;
}

export interface SaldoMoeda {
  moeda: "AOA" | "USD" | "EUR";
  saldoInicial: string;
  entradas: string;
  saidas: string;
  saldoEsperado: string;
}

export interface CaixaAtivoResposta {
  caixa: CaixaItem;
  saldos: Record<"AOA" | "USD" | "EUR", SaldoMoeda>;
}

export interface OperacaoItem {
  id: string;
  numeroOperacao: string;
  clienteId: string;
  caixaId: string;
  tipo: "compra" | "venda";
  moedaDivisa: MoedaDivisa;
  montanteDivisa: string;
  taxaAplicada: string;
  taxaReferenciaBna: string;
  margemAplicada: string;
  montanteAoa: string;
  fonteTaxa: "demonstracao" | "oficial";
  estado: "confirmada" | "cancelada" | "estornada";
  operadorNome: string;
  criadoEm: string;
  motivoEstorno?: string | null;
}

export interface BorderoItem {
  id: string;
  numeroBordero: string;
  operacaoId: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteNif: string;
  tipoOperacao: "compra" | "venda";
  moedaDivisa: MoedaDivisa;
  montanteDivisa: string;
  taxaCambio: string;
  totalAoa: string;
  operadorNome: string;
  emitidoEm: string;
  hashVerificacao: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
    public readonly detalhes?: unknown
  ) {
    super(mensagem);
    this.name = "ApiError";
  }
}


export interface ExecucaoIntegracaoManualItem {
  id: string;
  transacaoId: string;
  tipoIntegracao: string;
  canalOrigem: string;
  referenciaExterna: string;
  valorMoeda: string;
  moeda: string;
  estado: "pendente" | "concluida" | "rejeitada" | "cancelada";
  operadorId: string;
  operadorNome: string;
  operadorFuncao: string;
  aprovadorId?: string | null;
  aprovadorNome?: string | null;
  momentoExecucao: string;
  momentoAprovacao?: string | null;
  comprovativoArquivo?: string | null;
  comprovativoHashSha256?: string | null;
  notas?: string | null;
  chaveIdempotencia: string;
}

export interface CriarExecucaoManualPayload {
  transacaoId: string;
  tipoIntegracao: string;
  canalOrigem: string;
  referenciaExterna: string;
  valorMoeda: string;
  moeda: string;
  chaveIdempotencia: string;
  notas?: string | undefined;
  comprovativoArquivo?: string | undefined;
  comprovativoHashSha256?: string | undefined;
}

export interface ItemFilaOperacional {
  id: string;
  tipo: "kyc_dossie" | "pedido_cambio" | "pedido_remessa" | "liquidacao_manual" | "alerta_caixa";
  referenciaId: string;
  codigoVisual: string;
  titulo: string;
  descricao: string;
  clienteNome?: string | null;
  clienteId?: string | null;
  montante?: string | null;
  moeda?: string | null;
  prioridade: "urgente" | "alta" | "normal";
  estado: "pendente" | "em_analise" | "concluida" | "rejeitada";
  responsavelId?: string | null;
  responsavelNome?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  detalhes: Record<string, any>;
}

export interface AtividadeOperadorRecente {
  id: string;
  acao: string;
  recurso: string;
  recursoId?: string | null;
  detalhes?: any;
  criadoEm: string;
}

export interface ResumoDashboardOperacional {
  pedidosCambioPendentes: number;
  pedidosRemessasPendentes: number;
  kycPendentes: number;
  kycAprovados: number;
  kycRejeitados: number;
  liquidacoesManuaisPendentes: number;
  caixasAbertos: number;
  alertasDivergencia: number;
  minhasTarefasPendentes: number;
  totalTarefasPendentes: number;
  atividadesRecentes: AtividadeOperadorRecente[];
}

export interface FiltrosFilaOperacional {
  tipo?: "kyc_dossie" | "pedido_cambio" | "pedido_remessa" | "liquidacao_manual" | "alerta_caixa" | undefined;
  estado?: "pendente" | "em_analise" | "concluida" | "rejeitada" | undefined;
  prioridade?: "urgente" | "alta" | "normal" | undefined;
  responsavelId?: string | undefined;
  apenasMinhas?: boolean | undefined;
  busca?: string | undefined;
  limite?: number | undefined;
  offset?: number | undefined;
}

export class AdminApiClient {
  constructor(private baseUrl = "") {}

  private async requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${caminho}`;
    const headers = new Headers(opcoes.headers);

    if (opcoes.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Accept", "application/json");

    const resposta = await fetch(url, {
      ...opcoes,
      headers,
      credentials: "include",
    });

    const ehJson = resposta.headers.get("content-type")?.includes("application/json");
    const dados = ehJson ? await resposta.json() : null;

    if (!resposta.ok) {
      const codigo = dados?.codigo ?? `HTTP_${resposta.status}`;
      const msg = dados?.erro ?? "Ocorreu um erro na comunicação com o servidor.";
      throw new ApiError(resposta.status, codigo, msg, dados?.detalhes);
    }

    return dados as T;
  }

  public async inicializarPrimeiroAdmin(payload: {
    tokenInicializacao: string;
    nome: string;
    email: string;
    senha: string;
  }): Promise<{ sucesso: boolean; mensagem: string; usuario: UsuarioSessao }> {
    return this.requisitar<{ sucesso: boolean; mensagem: string; usuario: UsuarioSessao }>(
      "/api/v1/auth/primeiro-admin",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  public async get<T>(caminho: string): Promise<T> {
    const url = caminho.startsWith("/api/v1") ? caminho : `/api/v1${caminho.startsWith("/") ? "" : "/"}${caminho}`;
    return this.requisitar<T>(url, { method: "GET" });
  }

  public async post<T>(caminho: string, body?: unknown): Promise<T> {
    const url = caminho.startsWith("/api/v1") ? caminho : `/api/v1${caminho.startsWith("/") ? "" : "/"}${caminho}`;
    const opcoes: RequestInit = { method: "POST" };
    if (body !== undefined) {
      opcoes.body = JSON.stringify(body);
    }
    return this.requisitar<T>(url, opcoes);
  }

  // --- Autenticação ---
  public async login(email: string, senha: string): Promise<{ sucesso: boolean; usuario: UsuarioSessao }> {
    return this.requisitar<{ sucesso: boolean; usuario: UsuarioSessao }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
  }

  public async logout(): Promise<{ sucesso: boolean; mensagem: string }> {
    return this.requisitar<{ sucesso: boolean; mensagem: string }>("/api/v1/auth/logout", {
      method: "POST",
    });
  }

  public async obterSessaoAtual(): Promise<UsuarioSessao | null> {
    try {
      const res = await this.requisitar<{ sucesso: boolean; usuario: UsuarioSessao }>("/api/v1/auth/me", {
        method: "GET",
      });
      return res.usuario;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      throw err;
    }
  }

  // --- Taxas de Câmbio ---
  public async listarTaxas(): Promise<TaxaItem[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: TaxaItem[] }>("/api/v1/taxas", {
      method: "GET",
    });
    return res.dados;
  }

  public async obterTaxa(moeda: MoedaDivisa): Promise<TaxaItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: TaxaItem }>(`/api/v1/taxas/${moeda}`, {
      method: "GET",
    });
    return res.dados;
  }

  public async atualizarTaxa(
    moeda: MoedaDivisa,
    payload: {
      referencia: string;
      margemCompra: string;
      margemVenda: string;
      motivo: string;
      fonte?: "demonstracao" | "oficial";
    }
  ): Promise<TaxaItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: TaxaItem }>(`/api/v1/taxas/${moeda}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  // --- Auditoria ---
  public async listarAuditoria(limite = 50): Promise<EventoAuditoria[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: EventoAuditoria[] }>(
      `/api/v1/auditoria?limite=${limite}`,
      { method: "GET" }
    );
    return res.dados;
  }

  // --- Clientes & KYC ---
  public async listarClientes(busca?: string, estadoKyc?: string): Promise<ClienteItem[]> {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    if (estadoKyc) params.set("estadoKyc", estadoKyc);
    const res = await this.requisitar<{ sucesso: boolean; dados: ClienteItem[] }>(
      `/api/v1/clientes?${params.toString()}`,
      { method: "GET" }
    );
    return res.dados;
  }

  public async criarCliente(payload: {
    tipo: "singular" | "colectivo";
    nome: string;
    tipoDocumento: "bi" | "passaporte" | "cartao_residente" | "nif_empresa";
    numeroDocumento: string;
    nif: string;
    nacionalidade: string;
    telefone: string;
    email?: string | null;
    morada: string;
  }): Promise<ClienteItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: ClienteItem }>("/api/v1/clientes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async decidirKyc(
    clienteId: string,
    payload: {
      estadoNovo: "aprovado" | "rejeitado" | "em_analise" | "actualizacao_necessaria";
      nivelRisco: "baixo" | "medio" | "alto";
      motivo: string;
    }
  ): Promise<ClienteItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: ClienteItem }>(
      `/api/v1/clientes/${clienteId}/kyc`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  // --- Documentos KYC ---
  public async carregarDocumentoKyc(
    clienteId: string,
    payload: {
      tipoDocumento: string;
      nomeArquivo: string;
      conteudoBase64: string;
    }
  ): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
      `/api/v1/clientes/${clienteId}/documentos`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  public async listarDocumentosKyc(clienteId: string): Promise<any[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>(
      `/api/v1/clientes/${clienteId}/documentos`,
      { method: "GET" }
    );
    return res.dados;
  }

  public obterUrlDownloadDocumento(clienteId: string, docId: string): string {
    return `${this.baseUrl}/api/v1/clientes/${clienteId}/documentos/${docId}/download`;
  }

  public async impersonarCliente(
    clienteId: string,
    motivo: string = "Acesso de suporte administrativo"
  ): Promise<{ sucesso: boolean; dados?: any; urlRedirecionamento?: string; redirectUrl?: string; token?: string; erro?: string; mensagem?: string }> {
    try {
      const res = await this.requisitar<any>(`/api/v1/clientes/${clienteId}/impersonar`, {
        method: "POST",
        body: JSON.stringify({ motivo }),
      });
      return { sucesso: true, dados: res, urlRedirecionamento: res.urlRedirecionamento, redirectUrl: res.urlRedirecionamento, token: res.token };
    } catch (err: any) {
      return { sucesso: false, erro: err.message || "Falha ao personificar conta de cliente." };
    }
  }

  // --- Caixa & Tesouraria ---
  public async obterCaixaAtivo(): Promise<CaixaAtivoResposta | null> {
    const res = await this.requisitar<{ sucesso: boolean; dados: CaixaAtivoResposta | null }>("/api/v1/caixa/ativo", {
      method: "GET",
    });
    return res.dados;
  }

  public async abrirCaixa(payload: {
    saldoInicialAoa: string;
    saldoInicialUsd: string;
    saldoInicialEur: string;
    agencia?: string;
  }): Promise<CaixaItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: CaixaItem }>("/api/v1/caixa/abrir", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async movimentarCaixa(
    caixaId: string,
    payload: {
      tipo: "suprimento" | "sangria";
      moeda: "AOA" | "USD" | "EUR";
      montante: string;
      descricao: string;
    }
  ): Promise<void> {
    await this.requisitar(`/api/v1/caixa/${caixaId}/movimento`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async fecharCaixa(
    caixaId: string,
    payload: {
      saldoContadoAoa: string;
      saldoContadoUsd: string;
      saldoContadoEur: string;
      justificativaDiferenca?: string;
    }
  ): Promise<CaixaItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: CaixaItem }>(`/api/v1/caixa/${caixaId}/fechar`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  // --- Operações Cambiais & Borderôs ---
  public async criarOperacao(payload: {
    chaveIdempotencia: string;
    clienteId: string;
    tipo: "compra" | "venda";
    moedaDivisa: MoedaDivisa;
    montanteDivisa: string;
    cotacaoCriadaEm: string;
  }): Promise<{ operacao: OperacaoItem; bordero: BorderoItem }> {
    const res = await this.requisitar<{
      sucesso: boolean;
      dados: { operacao: OperacaoItem; bordero: BorderoItem };
    }>("/api/v1/operacoes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async listarOperacoes(limite = 50): Promise<OperacaoItem[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: OperacaoItem[] }>(
      `/api/v1/operacoes?limite=${limite}`,
      { method: "GET" }
    );
    return res.dados;
  }

  public async obterBordero(operacaoId: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/borderos/${operacaoId}`, {
      method: "GET",
    });
    return res.dados;
  }

  public async estornarOperacao(operacaoId: string, motivo: string): Promise<OperacaoItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: OperacaoItem }>(
      `/api/v1/operacoes/${operacaoId}/estornar`,
      {
        method: "POST",
        body: JSON.stringify({ motivo }),
      }
    );
    return res.dados;
  }

  // --- Gestão de Utilizadores Internos (Exclusivo Gestão) ---
  public async listarUsuarios(): Promise<UsuarioItem[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: UsuarioItem[] }>("/api/v1/usuarios", {
      method: "GET",
    });
    return res.dados;
  }

  public async criarUsuario(payload: CriarUsuarioPayload): Promise<UsuarioItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: UsuarioItem }>("/api/v1/usuarios", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async alternarStatusUsuario(id: string, ativo: boolean): Promise<void> {
    await this.requisitar<{ sucesso: boolean; mensagem: string }>(`/api/v1/usuarios/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ ativo }),
    });
  }

  // --- Integrações Manuais & Conciliação (Ticket NZAIDI-MANUAL-01) ---
  public async listarIntegracoesManuais(
    limite = 50,
    offset = 0,
    estado?: string
  ): Promise<{ total: number; itens: ExecucaoIntegracaoManualItem[] }> {
    const params = new URLSearchParams();
    params.set("limite", String(limite));
    params.set("offset", String(offset));
    if (estado) params.set("estado", estado);

    return this.requisitar<{ total: number; itens: ExecucaoIntegracaoManualItem[] }>(
      `/api/v1/integracoes-manuais/execucoes?${params.toString()}`,
      { method: "GET" }
    );
  }

  public async obterIntegracaoManual(id: string): Promise<ExecucaoIntegracaoManualItem> {
    const res = await this.requisitar<{ sucesso: boolean; execucao: ExecucaoIntegracaoManualItem }>(
      `/api/v1/integracoes-manuais/execucoes/${id}`,
      { method: "GET" }
    );
    return res.execucao;
  }

  // --- Gestão de Parceiros Comerciais (Módulo B) ---
  public async listarParceirosAdmin(): Promise<ParceiroItem[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: ParceiroItem[] }>("/api/v1/admin/parceiros", {
      method: "GET",
    });
    return res.dados;
  }

  public async criarParceiroAdmin(payload: CriarParceiroPayload): Promise<{ parceiro: ParceiroItem }> {
    const res = await this.requisitar<{ sucesso: boolean; dados: { parceiro: ParceiroItem } }>("/api/v1/admin/parceiros", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async alterarStatusParceiroAdmin(id: string, estado: "ativo" | "suspenso" | "inativo", motivo?: string): Promise<ParceiroItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: ParceiroItem }>(
      "/api/v1/admin/parceiros/" + id + "/status",
      {
        method: "PATCH",
        body: JSON.stringify({ estado, motivo }),
      }
    );
    return res.dados;
  }

  public async atribuirRemessaParceiroAdmin(id: string, remessaId: string, canal: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
      "/api/v1/admin/parceiros/" + id + "/atribuir-remessa",
      {
        method: "POST",
        body: JSON.stringify({ remessaId, canal }),
      }
    );
    return res.dados;
  }

  public async impersonarParceiroAdmin(id: string): Promise<{ sucesso: boolean; dados?: any; erro?: string }> {
    try {
      const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
        "/api/v1/admin/parceiros/" + id + "/impersonar",
        {
          method: "POST",
        }
      );
      return { sucesso: true, dados: res.dados };
    } catch (err: any) {
      return { sucesso: false, erro: err.message || "Falha ao personificar entidade parceira." };
    }
  }


  public async criarIntegracaoManual(
    payload: CriarExecucaoManualPayload
  ): Promise<ExecucaoIntegracaoManualItem> {
    const res = await this.requisitar<{ sucesso: boolean; execucao: ExecucaoIntegracaoManualItem }>(
      "/api/v1/integracoes-manuais/execucoes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.execucao;
  }

  public async aprovarIntegracaoManual(
    id: string,
    notasAprovacao?: string
  ): Promise<ExecucaoIntegracaoManualItem> {
    const res = await this.requisitar<{ sucesso: boolean; execucao: ExecucaoIntegracaoManualItem }>(
      `/api/v1/integracoes-manuais/execucoes/${id}/aprovar`,
      {
        method: "POST",
        body: JSON.stringify({ notasAprovacao }),
      }
    );
    return res.execucao;
  }

  public async rejeitarIntegracaoManual(
    id: string,
    motivo: string
  ): Promise<ExecucaoIntegracaoManualItem> {
    const res = await this.requisitar<{ sucesso: boolean; execucao: ExecucaoIntegracaoManualItem }>(
      `/api/v1/integracoes-manuais/execucoes/${id}/rejeitar`,
      {
        method: "POST",
        body: JSON.stringify({ motivo }),
      }
    );
    return res.execucao;
  }

  // ==========================================
  // MÓDULO C — PAINEL OPERACIONAL DA EQUIPA
  // ==========================================

  public async obterDashboardOperacional(): Promise<ResumoDashboardOperacional> {
    const res = await this.requisitar<{ sucesso: boolean; dados: ResumoDashboardOperacional }>(
      "/api/v1/operacional/dashboard"
    );
    return res.dados;
  }

  public async listarFilaOperacional(
    filtros: FiltrosFilaOperacional = {}
  ): Promise<{ itens: ItemFilaOperacional[]; total: number }> {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set("tipo", filtros.tipo);
    if (filtros.estado) params.set("estado", filtros.estado);
    if (filtros.prioridade) params.set("prioridade", filtros.prioridade);
    if (filtros.responsavelId) params.set("responsavelId", filtros.responsavelId);
    if (filtros.apenasMinhas) params.set("apenasMinhas", "true");
    if (filtros.busca) params.set("busca", filtros.busca);
    if (filtros.limite) params.set("limite", String(filtros.limite));
    if (filtros.offset) params.set("offset", String(filtros.offset));

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await this.requisitar<{ sucesso: boolean; total: number; dados: ItemFilaOperacional[] }>(
      `/api/v1/operacional/fila${qs}`
    );
    return { itens: res.dados, total: res.total };
  }

  public async obterDetalhesItemOperacional(tipo: string, id: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
      `/api/v1/operacional/fila/${tipo}/${id}`
    );
    return res.dados;
  }

  public async atribuirTarefaOperacional(
    tipo: string,
    id: string,
    payload: { responsavelId?: string | null | undefined; prioridade?: "urgente" | "alta" | "normal" | undefined; notas?: string | undefined }
  ): Promise<{ sucesso: boolean; responsavelId?: string | null; responsavelNome?: string | null }> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
      `/api/v1/operacional/fila/${tipo}/${id}/atribuir`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  public async processarPedidoCambioOperacional(
    id: string,
    payload: { decisao: "aprovar" | "rejeitar"; motivoRejeicao?: string | undefined; caixaId?: string | undefined; notas?: string | undefined }
  ): Promise<{ sucesso: boolean; estado: string }> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
      `/api/v1/operacional/pedidos-cambio/${id}/processar`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  public async processarPedidoRemessaOperacional(
    id: string,
    payload: { decisao: "atribuir_parceiro" | "liquidar_direto" | "rejeitar"; parceiroId?: string | undefined; motivoRejeicao?: string | undefined; notas?: string | undefined }
  ): Promise<{ sucesso: boolean; estado: string; parceiroNome?: string }> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
      `/api/v1/operacional/pedidos-remessas/${id}/processar`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  public async decidirDocumentoKycOperacional(
    id: string,
    payload: { statusValidacao: "aprovado" | "rejeitado" | "pendente_atualizacao"; motivoRejeicao?: string | undefined }
  ): Promise<{ sucesso: boolean; status: string }> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(
      `/api/v1/operacional/kyc/documentos/${id}/decisao`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.dados;
  }

  public async listarCaixasOperacional(): Promise<any[]> {
    const res = await this.requisitar<{ sucesso: boolean; total: number; dados: any[] }>(
      "/api/v1/operacional/caixas"
    );
    return res.dados;
  }

  // --- Módulo D: Contabilidade, Livro Razão e Reconciliação ---
  public async obterContasContabeis(): Promise<ContaContabilItem[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: ContaContabilItem[] }>('/api/v1/contabilidade/contas');
    return res.dados;
  }

  public async obterBalanceteContabil(): Promise<ContaContabilItem[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: ContaContabilItem[] }>('/api/v1/contabilidade/balancete');
    return res.dados;
  }

  public async listarLivroRazao(filtros: {
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
    contaCodigo?: string | undefined;
    origemTipo?: string | undefined;
    limite?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ itens: any[]; total: number }> {
    const params = new URLSearchParams();
    if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
    if (filtros.contaCodigo) params.set('contaCodigo', filtros.contaCodigo);
    if (filtros.origemTipo) params.set('origemTipo', filtros.origemTipo);
    if (filtros.limite) params.set('limite', String(filtros.limite));
    if (filtros.offset) params.set('offset', String(filtros.offset));

    const res = await this.requisitar<{ sucesso: boolean; dados: { itens: any[]; total: number } }>(
      `/api/v1/contabilidade/livro-razao?${params.toString()}`
    );
    return res.dados;
  }

  public async obterLancamentoContabil(id: string): Promise<LancamentoContabilItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: LancamentoContabilItem }>(
      `/api/v1/contabilidade/lancamentos/${id}`
    );
    return res.dados;
  }

  public async estornarLancamentoContabil(id: string, motivo: string): Promise<LancamentoContabilItem> {
    const res = await this.requisitar<{ sucesso: boolean; dados: LancamentoContabilItem }>(
      `/api/v1/contabilidade/lancamentos/${id}/estorno`,
      {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }
    );
    return res.dados;
  }

  public async listarDivergencias(filtros: {
    tipo?: string | undefined;
    estado?: string | undefined;
    limite?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ itens: DivergenciaReconciliacaoItem[]; total: number }> {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.limite) params.set('limite', String(filtros.limite));
    if (filtros.offset) params.set('offset', String(filtros.offset));

    const res = await this.requisitar<{ sucesso: boolean; dados: { itens: DivergenciaReconciliacaoItem[]; total: number } }>(
      `/api/v1/contabilidade/reconciliacao/divergencias?${params.toString()}`
    );
    return res.dados;
  }

  public async executarReconciliacaoGeral(): Promise<{ totalVerificadas: number; novasDivergencias: number }> {
    const res = await this.requisitar<{ sucesso: boolean; dados: { totalVerificadas: number; novasDivergencias: number } }>(
      '/api/v1/contabilidade/reconciliacao/executar',
      { method: 'POST' }
    );
    return res.dados;
  }

  public async resolverDivergencia(id: string, estado: 'resolvida' | 'desconsiderada_autorizada', motivo: string): Promise<void> {
    await this.requisitar<{ sucesso: boolean }>(
      `/api/v1/contabilidade/reconciliacao/divergencias/${id}/resolver`,
      {
        method: 'POST',
        body: JSON.stringify({ estado, motivo }),
      }
    );
  }

  public async obterRelatorioResumoDiario(filtros: { dataInicio?: string | undefined; dataFim?: string | undefined }): Promise<ResumoDiarioRelatorio> {
    const params = new URLSearchParams();
    if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.set('dataFim', filtros.dataFim);

    const res = await this.requisitar<{ sucesso: boolean; dados: ResumoDiarioRelatorio }>(
      `/api/v1/contabilidade/relatorios/resumo-diario?${params.toString()}`
    );
    return res.dados;
  }

  public async obterRelatorioPosicaoCambial(filtros: { dataInicio?: string | undefined; dataFim?: string | undefined }): Promise<PosicaoCambialRelatorio> {
    const params = new URLSearchParams();
    if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.set('dataFim', filtros.dataFim);

    const res = await this.requisitar<{ sucesso: boolean; dados: PosicaoCambialRelatorio }>(
      `/api/v1/contabilidade/relatorios/posicao-cambial?${params.toString()}`
    );
    return res.dados;
  }

  public async obterHistoricoTaxas(moeda?: string | undefined): Promise<any[]> {
    const url = moeda ? `/api/v1/contabilidade/taxas/historico?moeda=${moeda}` : '/api/v1/contabilidade/taxas/historico';
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>(url);
    return res.dados;
  }


  public async encerrarImpersonacao(): Promise<void> {
    await this.requisitar('/api/v1/auth/encerrar-impersonacao', { method: 'POST' });
  }

  public async impersonarUsuario(id: string, motivo: string): Promise<any> {
    const res = await this.requisitar<any>(`/api/v1/usuarios/${id}/impersonar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
    return res;
  }

  public async bloquearUsuario(id: string, motivo: string): Promise<void> {
    await this.requisitar(`/api/v1/usuarios/${id}/bloquear`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }

  public async desbloquearUsuario(id: string): Promise<void> {
    await this.requisitar(`/api/v1/usuarios/${id}/desbloquear`, { method: 'POST' });
  }

  public async terminarSessoesUsuario(id: string): Promise<void> {
    await this.requisitar(`/api/v1/usuarios/${id}/terminar-sessoes`, { method: 'POST' });
  }

  public async obterDetalhesUsuario(id: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/usuarios/${id}`);
    return res.dados;
  }

  public async atualizarUsuario(id: string, payload: any): Promise<void> {
    await this.requisitar(`/api/v1/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async obterPerfilProprio(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/usuarios/me');
    return res.dados;
  }

  public async atualizarPerfilProprio(payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/usuarios/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async alterarSenhaPropria(payload: any): Promise<void> {
    await this.requisitar('/api/v1/usuarios/me/senha', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listarSessoesProprias(): Promise<any[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>('/api/v1/usuarios/me/sessoes');
    return res.dados;
  }

  public async revogarSessaoPropria(sessaoId: string): Promise<void> {
    await this.requisitar(`/api/v1/usuarios/me/sessoes/${sessaoId}`, { method: 'DELETE' });
  }

  public async obterDetalhesCliente(id: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/clientes/${id}/detalhes`);
    return res.dados;
  }

  public async atualizarCliente(id: string, payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/clientes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async bloquearCliente(id: string, motivo: string): Promise<void> {
    await this.requisitar(`/api/v1/clientes/${id}/bloquear`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }

  public async desbloquearCliente(id: string): Promise<void> {
    await this.requisitar(`/api/v1/clientes/${id}/desbloquear`, { method: 'POST' });
  }

  public async terminarSessoesCliente(id: string): Promise<void> {
    await this.requisitar(`/api/v1/clientes/${id}/terminar-sessoes`, { method: 'POST' });
  }



  public async solicitarDocumentosKyc(id: string, mensagem: string): Promise<void> {
    await this.requisitar(`/api/v1/clientes/${id}/kyc/solicitar-documentos`, {
      method: 'POST',
      body: JSON.stringify({ mensagem }),
    });
  }

  public async obterEstatisticasKyc(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/kyc/estatisticas');
    return res.dados;
  }

  public async obterDashboardExecutivo(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/dashboard/executivo');
    return res.dados;
  }

  public async listarNotificacoes(apenasNaoLidas?: boolean, categoria?: string): Promise<{ itens: any[]; totalNaoLidas: number }> {
    const params = new URLSearchParams();
    if (apenasNaoLidas) params.set('apenasNaoLidas', 'true');
    if (categoria) params.set('categoria', categoria);
    const res = await this.requisitar<{ sucesso: boolean; dados: any[]; totalNaoLidas: number }>(`/api/v1/notificacoes?${params.toString()}`);
    return { itens: res.dados, totalNaoLidas: res.totalNaoLidas };
  }

  public async marcarNotificacaoLida(id: string): Promise<void> {
    await this.requisitar(`/api/v1/notificacoes/${id}/lida`, { method: 'PATCH' });
  }

  public async marcarTodasNotificacoesLidas(): Promise<void> {
    await this.requisitar('/api/v1/notificacoes/marcar-todas-lidas', { method: 'POST' });
  }

  public async listarAnuncios(destino?: string, estado?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (destino) params.set('destino', destino);
    if (estado) params.set('estado', estado);
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>(`/api/v1/comunicacao/anuncios?${params.toString()}`);
    return res.dados;
  }

  public async criarAnuncio(payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/comunicacao/anuncios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async atualizarAnuncio(id: string, payload: any): Promise<void> {
    await this.requisitar(`/api/v1/comunicacao/anuncios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async removerAnuncio(id: string): Promise<void> {
    await this.requisitar(`/api/v1/comunicacao/anuncios/${id}`, { method: 'DELETE' });
  }

  public async listarDicas(categoria?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (categoria) params.set('categoria', categoria);
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>(`/api/v1/comunicacao/dicas?${params.toString()}`);
    return res.dados;
  }

  public async criarDica(payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/comunicacao/dicas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async removerDica(id: string): Promise<void> {
    await this.requisitar(`/api/v1/comunicacao/dicas/${id}`, { method: 'DELETE' });
  }

  public async listarCampanhas(): Promise<any[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>('/api/v1/comunicacao/campanhas');
    return res.dados;
  }

  public async criarCampanha(payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/comunicacao/campanhas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async dispararCampanha(id: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; mensagem: string; dados: any }>(`/api/v1/comunicacao/campanhas/${id}/disparar`, {
      method: 'POST',
    });
    return res.dados;
  }

  public async obterProvedoresComunicacao(): Promise<any[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>('/api/v1/comunicacao/provedores');
    return res.dados;
  }

  public async salvarProvedorComunicacao(payload: any): Promise<void> {
    await this.requisitar('/api/v1/comunicacao/provedores', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async testarProvedorComunicacao(tipo: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/comunicacao/provedores/${tipo}/testar`, {
      method: 'POST',
    });
    return res.dados;
  }

  // --- MÉTODOS DE PAGAMENTO (MANUAL E APPYPAY) ---
  public async listarMetodosPagamentoAdmin(): Promise<any[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>('/api/v1/pagamentos/admin/metodos');
    return res.dados;
  }

  public async atualizarMetodoPagamentoAdmin(id: string, payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/pagamentos/admin/metodos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async testarConexaoAppyPay(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; mensagem: string; dados: any }>('/api/v1/pagamentos/admin/metodos/appypay/testar', {
      method: 'POST',
    });
    return res.dados;
  }

  public async listarTransacoesPagamentoAdmin(filtros?: { estado?: string; limite?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set('estado', filtros.estado);
    if (filtros?.limite) params.set('limite', filtros.limite.toString());
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>(`/api/v1/pagamentos?${params.toString()}`);
    return res.dados;
  }

  public async confirmarPagamentoManual(id: string, notasInternas?: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/pagamentos/${id}/confirmar`, {
      method: 'POST',
      body: JSON.stringify({ notasInternas }),
    });
    return res.dados;
  }

  public async rejeitarPagamentoManual(id: string, motivo: string, notasInternas?: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/pagamentos/${id}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify({ motivo, notasInternas }),
    });
    return res.dados;
  }

  // --- MÓDULO CARTOES VISA VIRTUAIS COM STROWALLET ---
  public async obterDashboardCartoes(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/cartoes/admin/dashboard');
    return res.dados;
  }

  public async obterConfigCartoes(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/cartoes/admin/config');
    return res.dados;
  }

  public async atualizarConfigCartoes(payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/cartoes/admin/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async obterComercialCartoes(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/cartoes/admin/comercial');
    return res.dados;
  }

  public async atualizarComercialCartoes(payload: any): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/cartoes/admin/comercial', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.dados;
  }

  public async testarConexaoStroWallet(): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>('/api/v1/cartoes/admin/testar-conexao', {
      method: 'POST',
    });
    return res.dados;
  }

  public async listarCartoesAdmin(filtros?: { estado?: string; busca?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set('estado', filtros.estado);
    if (filtros?.busca) params.set('busca', filtros.busca);
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>(`/api/v1/cartoes/admin/cartoes?${params.toString()}`);
    return res.dados;
  }

  public async obterDetalhesCartaoAdmin(id: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/cartoes/admin/cartoes/${id}`);
    return res.dados;
  }

  public async alterarStatusCartaoAdmin(id: string, novoEstado: 'ativo' | 'congelado'): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/cartoes/admin/cartoes/${id}/alterar-status`, {
      method: 'POST',
      body: JSON.stringify({ novoEstado }),
    });
    return res.dados;
  }

  public async sincronizarCartaoAdmin(id: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any }>(`/api/v1/cartoes/admin/cartoes/${id}/sincronizar`, {
      method: 'POST',
    });
    return res.dados;
  }

  public async listarTransacoesCartoesAdmin(filtros?: { tipo?: string; estado?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.tipo) params.set('tipo', filtros.tipo);
    if (filtros?.estado) params.set('estado', filtros.estado);
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>(`/api/v1/cartoes/admin/transacoes?${params.toString()}`);
    return res.dados;
  }

  public async listarAdesoesCartoesAdmin(): Promise<any[]> {
    const res = await this.requisitar<{ sucesso: boolean; dados: any[] }>('/api/v1/cartoes/admin/adesao');
    return res.dados;
  }

  public async avaliarAdesaoCartaoAdmin(clienteId: string, aprovado: boolean, motivo?: string): Promise<any> {
    const res = await this.requisitar<{ sucesso: boolean; mensagem: string }>(`/api/v1/cartoes/admin/adesao/${clienteId}/avaliar`, {
      method: 'POST',
      body: JSON.stringify({ aprovado, motivo }),
    });
    return res;
  }
}

export const api = new AdminApiClient();
