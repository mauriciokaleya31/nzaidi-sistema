import type { MoedaDivisa } from "@nzaidi/dominio";

export type FuncaoUsuario = "atendente" | "compliance" | "tesouraria" | "gestao";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  funcao: FuncaoUsuario;
  permissoes: string[];
}

export interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  funcao: FuncaoUsuario;
  ativo: boolean;
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
}

export const api = new AdminApiClient();
