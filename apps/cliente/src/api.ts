export interface Cliente {
  id: string;
  tipo: "singular" | "colectivo";
  nome: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nif: string;
  nacionalidade: string;
  telefone: string;
  email?: string | null;
  morada: string;
  estado: string;
  estadoKyc: "pendente" | "em_analise" | "aprovado" | "rejeitado" | "actualizacao_necessaria";
  nivelRisco: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface TaxaItem {
  moeda: "USD" | "EUR";
  referencia: string;
  compra: string;
  venda: string;
  margemCompra: string;
  margemVenda: string;
  fonte: string;
  atualizadoEm: string;
}

export interface DocumentoKyc {
  id: string;
  clienteId: string;
  tipoDocumento: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  mimeType: string;
  hashSha256: string;
  estadoValidacao: "pendente" | "valido" | "invalido";
  enviadoEm: string;
}

export interface PedidoCambio {
  id: string;
  clienteId: string;
  tipoOperacao: "compra" | "venda";
  moeda: "USD" | "EUR";
  montanteDivisa: string;
  taxaProposta: string;
  totalAoaEstimado: string;
  finalidade: string;
  estado: "pendente" | "em_analise" | "aprovado" | "rejeitado" | "concluido" | "cancelado";
  motivoRejeicao?: string | null;
  criadoEm: string;
}

export interface PedidoRemessa {
  id: string;
  clienteId: string;
  beneficiarioNome: string;
  beneficiarioPais: string;
  beneficiarioIban: string;
  beneficiarioBanco: string;
  beneficiarioSwift?: string | null;
  moedaDestino: "USD" | "EUR";
  montanteDivisa: string;
  taxaCambio: string;
  comissaoAoa: string;
  totalAoa: string;
  finalidade: string;
  estado: "pendente_revisao" | "em_processamento" | "executada" | "rejeitada";
  motivoRejeicao?: string | null;
  criadoEm: string;
}

export interface PerfilResponse {
  cliente: Cliente;
  credencial: { email: string; telefone: string | null };
  estatisticas: {
    pedidosCambioTotal: number;
    pedidosRemessaTotal: number;
    documentosTotal: number;
  };
}

class ApiService {
  private tokenKey = "nzaidi_cliente_token";

  public setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: "include", // Garante envio dos cookies de sessão HttpOnly
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || data.mensagem || "Ocorreu um erro no servidor.");
    }

    return data;
  }

  // --- Auth ---

  public async login(email: string, senha: string): Promise<{ cliente: Cliente; token: string }> {
    const res = await this.request<{ sucesso: boolean; dados: { cliente: Cliente; token: string } }>(
      "/api/v1/portal/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      }
    );
    this.setToken(res.dados.token);
    return res.dados;
  }

  public async registo(dados: any): Promise<{ cliente: Cliente; token: string }> {
    const res = await this.request<{ sucesso: boolean; dados: { cliente: Cliente; token: string } }>(
      "/api/v1/portal/auth/registo",
      {
        method: "POST",
        body: JSON.stringify(dados),
      }
    );
    this.setToken(res.dados.token);
    return res.dados;
  }

  public async logout(): Promise<void> {
    try {
      await this.request("/api/v1/portal/auth/logout", { method: "POST" });
    } finally {
      this.clearToken();
    }
  }

  public async obterPerfil(): Promise<PerfilResponse> {
    const res = await this.request<{ sucesso: boolean; dados: PerfilResponse }>("/api/v1/portal/perfil");
    return res.dados;
  }

  // --- Taxas ---

  public async obterTaxas(): Promise<TaxaItem[]> {
    const res = await this.request<{ sucesso: boolean; dados: TaxaItem[] }>("/api/v1/taxas");
    return res.dados;
  }

  // --- Documentos KYC ---

  public async listarDocumentos(): Promise<DocumentoKyc[]> {
    const res = await this.request<{ sucesso: boolean; dados: DocumentoKyc[] }>("/api/v1/portal/documentos");
    return res.dados;
  }

  public async submeterDocumento(
    tipoDocumento: string,
    nomeArquivo: string,
    conteudoBase64: string
  ): Promise<DocumentoKyc> {
    const res = await this.request<{ sucesso: boolean; dados: DocumentoKyc }>("/api/v1/portal/documentos", {
      method: "POST",
      body: JSON.stringify({ tipoDocumento, nomeArquivo, conteudoBase64 }),
    });
    return res.dados;
  }

  public obterUrlDownload(docId: string): string {
    return `/api/v1/portal/documentos/${docId}/arquivo`;
  }

  // --- Pedidos de Câmbio ---

  public async listarPedidosCambio(): Promise<PedidoCambio[]> {
    const res = await this.request<{ sucesso: boolean; dados: PedidoCambio[] }>(
      "/api/v1/portal/pedidos/cambio"
    );
    return res.dados;
  }

  public async criarPedidoCambio(dados: {
    tipoOperacao: "compra" | "venda";
    moeda: "USD" | "EUR";
    montanteDivisa: string;
    finalidade: string;
  }): Promise<PedidoCambio> {
    const res = await this.request<{ sucesso: boolean; dados: PedidoCambio }>(
      "/api/v1/portal/pedidos/cambio",
      {
        method: "POST",
        body: JSON.stringify(dados),
      }
    );
    return res.dados;
  }

  // --- Pedidos de Remessas ---

  public async listarPedidosRemessas(): Promise<PedidoRemessa[]> {
    const res = await this.request<{ sucesso: boolean; dados: PedidoRemessa[] }>(
      "/api/v1/portal/pedidos/remessas"
    );
    return res.dados;
  }

  public async criarPedidoRemessa(dados: {
    beneficiarioNome: string;
    beneficiarioPais: string;
    beneficiarioIban: string;
    beneficiarioBanco: string;
    beneficiarioSwift?: string | undefined;
    moedaDestino: "USD" | "EUR";
    montanteDivisa: string;
    finalidade: string;
  }): Promise<PedidoRemessa> {
    const res = await this.request<{ sucesso: boolean; dados: PedidoRemessa }>(
      "/api/v1/portal/pedidos/remessas",
      {
        method: "POST",
        body: JSON.stringify(dados),
      }
    );
    return res.dados;
  }

  // --- Métodos de Pagamento e Liquidação Manual ---

  public async obterMetodosPagamento(): Promise<any[]> {
    const res = await this.request<{ sucesso: boolean; dados: any[] }>(
      "/api/v1/pagamentos/metodos"
    );
    return res.dados;
  }

  public async submeterComprovativoPagamento(dados: {
    metodoId: string;
    origemTipo: "pedido_cambio" | "pedido_remessa" | "deposito" | "outro";
    origemId: string;
    montanteAoa: number;
    referenciaExterna: string;
    comprovativoBase64?: string | null | undefined;
    comprovativoNome?: string | null | undefined;
    notasCliente?: string | null | undefined;
  }): Promise<any> {
    const res = await this.request<{ sucesso: boolean; mensagem: string; dados: any }>(
      "/api/v1/pagamentos/submeter",
      {
        method: "POST",
        body: JSON.stringify(dados),
      }
    );
    return res.dados;
  }

  // --- NZAIDI Cartões (Visa Virtual USD) ---

  public async obterStatusCartoesPortal(): Promise<any> {
    const res = await this.request<{ sucesso: boolean; dados: any }>(
      "/api/v1/cartoes/portal/status"
    );
    return res.dados;
  }

  public async calcularEmissaoCartao(montanteInicialUsd: number): Promise<any> {
    const res = await this.request<{ sucesso: boolean; dados: any }>(
      "/api/v1/cartoes/portal/calcular-emissao",
      {
        method: "POST",
        body: JSON.stringify({ montanteInicialUsd }),
      }
    );
    return res.dados;
  }

  public async calcularCarregamentoCartao(montanteUsd: number): Promise<any> {
    const res = await this.request<{ sucesso: boolean; dados: any }>(
      "/api/v1/cartoes/portal/calcular-carregamento",
      {
        method: "POST",
        body: JSON.stringify({ montanteUsd }),
      }
    );
    return res.dados;
  }

  public async aderirCartoesPortal(): Promise<any> {
    const res = await this.request<{ sucesso: boolean; mensagem: string; dados: any }>(
      "/api/v1/cartoes/portal/aderir",
      {
        method: "POST",
      }
    );
    return res.dados;
  }

  public async listarMeusCartoes(): Promise<any[]> {
    const res = await this.request<{ sucesso: boolean; dados: any[] }>(
      "/api/v1/cartoes/portal/meus-cartoes"
    );
    return res.dados;
  }

  public async solicitarCartaoVisa(montanteInicialUsd: number, rotulo?: string): Promise<any> {
    const res = await this.request<{ sucesso: boolean; mensagem: string; dados: any }>(
      "/api/v1/cartoes/portal/solicitar",
      {
        method: "POST",
        body: JSON.stringify({ montanteInicialUsd, rotulo }),
      }
    );
    return res.dados;
  }

  public async carregarCartaoVisa(cartaoId: string, montanteUsd: number): Promise<any> {
    const res = await this.request<{ sucesso: boolean; mensagem: string; dados: any }>(
      "/api/v1/cartoes/portal/carregar",
      {
        method: "POST",
        body: JSON.stringify({ cartaoId, montanteUsd }),
      }
    );
    return res.dados;
  }

  public async alterarEstadoCartaoVisa(cartaoId: string, novoEstado: "ativo" | "congelado"): Promise<any> {
    const res = await this.request<{ sucesso: boolean; mensagem: string; dados: any }>(
      "/api/v1/cartoes/portal/alterar-estado",
      {
        method: "POST",
        body: JSON.stringify({ cartaoId, novoEstado }),
      }
    );
    return res.dados;
  }

  public async listarTransacoesCartao(cartaoId: string): Promise<any[]> {
    const res = await this.request<{ sucesso: boolean; dados: any[] }>(
      `/api/v1/cartoes/portal/${cartaoId}/transacoes`
    );
    return res.dados;
  }

  public async revelarDadosCartao(cartaoId: string): Promise<any> {
    const res = await this.request<{ sucesso: boolean; dados: any }>(
      `/api/v1/cartoes/portal/${cartaoId}/revelar-dados`,
      {
        method: "POST",
      }
    );
    return res.dados;
  }
}

export const api = new ApiService();
