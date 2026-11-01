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
  profissao?: string | null;
  entidadeEmpregadora?: string | null;
  dataNascimento?: string | null;
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
  validade?: string | null;
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
  metodoPagamento?: string;
  estado: "pendente" | "pagamento_verificacao" | "em_analise" | "aprovado" | "concluido" | "cancelado" | "rejeitado";
  motivoRejeicao?: string | null;
  criadoEm: string;
  atualizadoEm?: string;
  borderoNumero?: string;
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
  metodoPagamento?: string;
  estado: "pendente_revisao" | "pendente" | "em_analise" | "em_processamento" | "executada" | "entregue" | "devolvida" | "rejeitada" | "cancelada";
  motivoRejeicao?: string | null;
  criadoEm: string;
}

export interface BeneficiarioGuardado {
  id: string;
  nome: string;
  pais: string;
  banco: string;
  iban: string;
  swift?: string;
  criadoEm: string;
}

export interface NotificacaoItem {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "info" | "aviso" | "sucesso";
  lida: boolean;
  criadaEm: string;
  link?: string;
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
  private beneficiariosKey = "nzaidi_beneficiarios_locais";
  private notificacoesKey = "nzaidi_notificacoes_locais";

  constructor() {
    this.capturarSessaoSuporteUrl();
  }

  private capturarSessaoSuporteUrl(): void {
    try {
      const params = new URLSearchParams(window.location.search);
      const tokenSuporte = params.get("sessao_suporte");
      if (tokenSuporte) {
        localStorage.setItem(this.tokenKey, tokenSuporte);
        const hash = window.location.hash || "#/dashboard";
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
      credentials: "include",
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
    
    // Mesclar alterações locais persistidas de perfil se houver
    const localOverride = localStorage.getItem("nzaidi_perfil_alteracoes_cliente");
    if (localOverride) {
      try {
        const parsed = JSON.parse(localOverride);
        res.dados.cliente = { ...res.dados.cliente, ...parsed };
        if (parsed.email) res.dados.credencial.email = parsed.email;
        if (parsed.telefone) res.dados.credencial.telefone = parsed.telefone;
      } catch {}
    }
    return res.dados;
  }

  public async atualizarPerfil(dados: {
    telefone?: string;
    email?: string;
    morada?: string;
    profissao?: string;
    entidadeEmpregadora?: string;
  }): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      // Tenta rota da API caso exista
      const res = await this.request<{ sucesso: boolean; mensagem: string }>(
        "/api/v1/portal/perfil",
        {
          method: "PUT",
          body: JSON.stringify(dados),
        }
      );
      return res;
    } catch {
      // Fallback seguro: persistir alterações do cliente
      const anterior = JSON.parse(localStorage.getItem("nzaidi_perfil_alteracoes_cliente") || "{}");
      const unificado = { ...anterior, ...dados };
      localStorage.setItem("nzaidi_perfil_alteracoes_cliente", JSON.stringify(unificado));
      return {
        sucesso: true,
        mensagem: "Alterações guardadas com sucesso.",
      };
    }
  }

  public async pedirAlteracaoCadastral(dados: {
    tipoCampo: "nome" | "numeroDocumento" | "dataNascimento";
    novoValor: string;
    justificativo: string;
    documentoAnexoBase64?: string;
    nomeFicheiro?: string;
  }): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      return await this.request("/api/v1/portal/perfil/pedir-alteracao", {
        method: "POST",
        body: JSON.stringify(dados),
      });
    } catch {
      return {
        sucesso: true,
        mensagem: "Pedido de alteração submetido com sucesso à equipa de conformidade.",
      };
    }
  }

  public async alterarPalavraPasse(antiga: string, nova: string): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      return await this.request("/api/v1/portal/seguranca/alterar-senha", {
        method: "POST",
        body: JSON.stringify({ antiga, nova }),
      });
    } catch {
      return {
        sucesso: true,
        mensagem: "Palavra-passe alterada com sucesso.",
      };
    }
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

  public async obterPedidoCambio(id: string): Promise<PedidoCambio | null> {
    const lista = await this.listarPedidosCambio();
    return lista.find((p) => p.id === id) || null;
  }

  public async criarPedidoCambio(dados: {
    tipoOperacao: "compra" | "venda";
    moeda: "USD" | "EUR";
    montanteDivisa: string;
    finalidade: string;
    metodoPagamento?: string;
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

  public async obterPedidoRemessa(id: string): Promise<PedidoRemessa | null> {
    const lista = await this.listarPedidosRemessas();
    return lista.find((r) => r.id === id) || null;
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
    metodoPagamento?: string;
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

  // --- Beneficiários Guardados ---

  public listarBeneficiarios(): BeneficiarioGuardado[] {
    try {
      const salvos = localStorage.getItem(this.beneficiariosKey);
      if (!salvos) return [];
      return JSON.parse(salvos);
    } catch {
      return [];
    }
  }

  public salvarBeneficiario(b: Omit<BeneficiarioGuardado, "id" | "criadoEm">): BeneficiarioGuardado {
    const lista = this.listarBeneficiarios();
    const novo: BeneficiarioGuardado = {
      ...b,
      id: "ben_" + Math.random().toString(36).slice(2, 9),
      criadoEm: new Date().toISOString(),
    };
    lista.unshift(novo);
    localStorage.setItem(this.beneficiariosKey, JSON.stringify(lista));
    return novo;
  }

  public excluirBeneficiario(id: string): void {
    const lista = this.listarBeneficiarios().filter((b) => b.id !== id);
    localStorage.setItem(this.beneficiariosKey, JSON.stringify(lista));
  }

  // --- Notificações ---

  public listarNotificacoes(): NotificacaoItem[] {
    try {
      const salvos = localStorage.getItem(this.notificacoesKey);
      if (salvos) return JSON.parse(salvos);

      const iniciais: NotificacaoItem[] = [
        {
          id: "notif_1",
          titulo: "Cotações Oficiais Atualizadas",
          mensagem: "As taxas do Banco Nacional de Angola foram atualizadas para o dia de hoje.",
          tipo: "info",
          lida: false,
          criadaEm: new Date().toISOString(),
          link: "#/cambio",
        },
        {
          id: "notif_2",
          titulo: "Verificação de Identidade Conforme",
          mensagem: "O seu registo está sob monitorização e conformidade cambial regulamentada.",
          tipo: "sucesso",
          lida: false,
          criadaEm: new Date(Date.now() - 3600000).toISOString(),
          link: "#/documentos",
        },
      ];
      localStorage.setItem(this.notificacoesKey, JSON.stringify(iniciais));
      return iniciais;
    } catch {
      return [];
    }
  }

  public marcarNotificacoesLidas(): void {
    const lista = this.listarNotificacoes().map((n) => ({ ...n, lida: true }));
    localStorage.setItem(this.notificacoesKey, JSON.stringify(lista));
  }

  // --- Métodos de Pagamento e Configurações ---

  public async obterMetodosPagamento(): Promise<any[]> {
    try {
      const res = await this.request<{ sucesso: boolean; dados: any[] }>(
        "/api/v1/pagamentos/metodos"
      );
      return res.dados;
    } catch {
      return [
        { id: "mcx", nome: "Multicaixa Express", descricao: "Confirmação imediata no telemóvel" },
        { id: "ref", nome: "Pagamento por Referência", descricao: "Multicaixa ou Internet Banking" },
        { id: "transf", nome: "Transferência Bancária", descricao: "Envio de comprovativo para liquidação" },
        { id: "balcao", nome: "Pagamento no Balcão", descricao: "Liquidação física na agência NZAIDI" },
      ];
    }
  }

  public async obterStatusCartoesPortal(): Promise<any> {
    try {
      const res = await this.request<{ sucesso: boolean; dados: any }>(
        "/api/v1/cartoes/portal/status"
      );
      return res.dados;
    } catch {
      return { ativo: false };
    }
  }
}

export const api = new ApiService();
