import type { MoedaDivisa } from "@nzaidi/dominio";

export type FuncaoUsuario = "atendente" | "compliance" | "tesouraria" | "gestao";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  funcao: FuncaoUsuario;
  permissoes: string[];
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
      credentials: "include", // Envia cookies HttpOnly
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

  // --- Health ---
  public async verificarSaude(): Promise<any> {
    return this.requisitar("/api/health", { method: "GET" });
  }
}

export const api = new AdminApiClient();
