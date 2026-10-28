import type {
  StroWalletApiResponse,
  StroWalletKycParams,
  AmbienteStroWallet,
} from "./cartoes.types.js";

export interface StroWalletConfig {
  publicKey: string;
  secretKey?: string;
  mode: AmbienteStroWallet;
  baseUrl?: string;
}

export class StroWalletConnector {
  private publicKey: string;
  private secretKey: string;
  private mode: AmbienteStroWallet;
  private baseUrl: string;

  constructor(config: StroWalletConfig) {
    this.publicKey = (config.publicKey || "").trim();
    this.secretKey = (config.secretKey || "").trim();
    this.mode = config.mode === "live" ? "live" : "sandbox";
    this.baseUrl = (config.baseUrl || "https://strowallet.com/api/bitvcard").replace(/\/$/, "");
  }

  public estaConfigurado(): boolean {
    return this.publicKey.length > 0;
  }

  private async request<T = any>(
    endpoint: string,
    method: "GET" | "POST",
    data: Record<string, any> = {}
  ): Promise<StroWalletApiResponse<T>> {
    if (!this.estaConfigurado()) {
      return {
        success: false,
        message: "Chave de API pública (public_key) da StroWallet não configurada.",
      };
    }

    const urlEndpoint = `${this.baseUrl}/${endpoint.replace(/^\//, "")}`;
    const params = {
      public_key: this.publicKey,
      mode: this.mode,
      ...data,
    };

    try {
      let finalUrl = urlEndpoint;
      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "NZAIDI-Cartoes/1.0",
      };

      if (this.secretKey) {
        headers["Authorization"] = `Bearer ${this.secretKey}`;
        headers["X-Secret-Key"] = this.secretKey;
      }

      let body: string | URLSearchParams | undefined;

      if (method === "GET") {
        const query = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null) {
            query.append(k, String(v));
          }
        }
        finalUrl += `?${query.toString()}`;
      } else {
        const form = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null) {
            form.append(k, String(v));
          }
        }
        body = form;
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      const options: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(15000),
      };
      if (body) {
        options.body = body;
      }

      const res = await fetch(finalUrl, options);

      const httpCode = res.status;
      const rawText = await res.text();

      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        return {
          success: false,
          http_code: httpCode,
          message: `Resposta não-JSON da StroWallet (HTTP ${httpCode})`,
          raw_response: rawText,
        };
      }

      const ok = (httpCode >= 200 && httpCode < 300) && (json.success !== false && json.status !== false);
      return {
        success: ok,
        http_code: httpCode,
        message: json.message || (ok ? "Operação concluída com sucesso" : "Erro retornado pela StroWallet"),
        data: json,
        raw_response: rawText,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na requisição HTTP StroWallet: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * 1. Consultar Saldo da Conta Mestre / Agência na StroWallet
   * Endpoint oficial: https://strowallet.com/api/wallet/balance/USD?public_key=...
   */
  public async obterSaldoMestre(moeda = "USD"): Promise<StroWalletApiResponse<{ balance: number }>> {
    if (!this.estaConfigurado()) {
      return {
        success: false,
        message: "StroWallet não configurada.",
      };
    }

    try {
      const url = `https://strowallet.com/api/wallet/balance/${moeda.toUpperCase()}?public_key=${encodeURIComponent(
        this.publicKey
      )}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": "NZAIDI-Cartoes/1.0" },
        signal: AbortSignal.timeout(10000),
      });

      const httpCode = res.status;
      const rawText = await res.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        return {
          success: false,
          http_code: httpCode,
          message: `Resposta não-JSON ao consultar saldo (HTTP ${httpCode})`,
        };
      }

      if (httpCode === 200 && json) {
        const saldo = parseFloat(json.balance ?? json.amount ?? 0);
        return {
          success: true,
          http_code: 200,
          data: { balance: isNaN(saldo) ? 0 : saldo },
        };
      }

      return {
        success: false,
        http_code: httpCode,
        message: json.message || `Erro ao consultar saldo mestre: HTTP ${httpCode}`,
        data: json,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro ao obter saldo mestre: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * 2. Submeter KYC do Cliente Titular
   * Endpoint: /cardkyc (POST)
   */
  public async submeterKyc(params: StroWalletKycParams): Promise<StroWalletApiResponse> {
    return this.request("cardkyc", "POST", {
      first_name: params.first_name,
      last_name: params.last_name,
      id_number: params.id_number,
      id_type: params.id_type,
      id_front_image: params.id_front_image || "",
      email: params.email,
      phone_number: params.phone_number,
      date_of_birth: params.date_of_birth,
      dial_code: params.dial_code || "+244",
      line1: params.line1,
      city: params.city,
      state: params.state,
      postal_code: params.postal_code || "1000",
      country: params.country || "AGO",
    });
  }

  /**
   * 3. Consultar Status do KYC
   * Endpoint: /cardkyc-status (GET)
   */
  public async consultarStatusKyc(customerId: string): Promise<StroWalletApiResponse> {
    return this.request("cardkyc-status", "GET", {
      customer_id: customerId,
    });
  }

  /**
   * 4. Emitir Cartão Virtual Visa USD
   * Endpoint: /create-nfc-card (POST)
   */
  public async emitirCartaoVisa(
    nomeTitular: string,
    customerId: string,
    montanteInicialUsd: number
  ): Promise<StroWalletApiResponse> {
    return this.request("create-nfc-card", "POST", {
      name: nomeTitular,
      customer_id: customerId,
      amount: String(montanteInicialUsd),
    });
  }

  /**
   * 5. Consultar Detalhes do Cartão
   * Endpoint: /fetch-nfccard-detail (GET)
   */
  public async consultarDetalhesCartao(cardId: string): Promise<StroWalletApiResponse> {
    return this.request("fetch-nfccard-detail", "GET", {
      card_id: cardId,
    });
  }

  /**
   * 6. Carregar ou Retirar Saldo do Cartão
   * Endpoint: /fund-withdraw-nfccard (POST)
   */
  public async carregarCartao(cardId: string, montanteUsd: number): Promise<StroWalletApiResponse> {
    return this.request("fund-withdraw-nfccard", "POST", {
      card_id: cardId,
      amount: String(montanteUsd),
      type: "fund",
    });
  }

  /**
   * 7. Congelar ou Ativar Cartão
   * Endpoint: /nfc-cards/status (POST)
   * status: 'active' | 'frozen'
   */
  public async alterarStatusCartao(cardId: string, status: "active" | "frozen"): Promise<StroWalletApiResponse> {
    return this.request("nfc-cards/status", "POST", {
      card_id: cardId,
      status,
    });
  }

  /**
   * 8. Consultar Histórico de Transações do Cartão
   * Endpoint: /nfc-card-transactions (GET)
   */
  public async consultarTransacoesCartao(cardId: string): Promise<StroWalletApiResponse> {
    return this.request("nfc-card-transactions", "GET", {
      card_id: cardId,
    });
  }

  /**
   * Teste de conectividade com a API da StroWallet
   */
  public async testarConexao(): Promise<{
    conectado: boolean;
    mensagem: string;
    ambiente: AmbienteStroWallet;
    saldo_mestre_usd?: number;
    detalhes?: any;
  }> {
    if (!this.estaConfigurado()) {
      return {
        conectado: false,
        ambiente: this.mode,
        mensagem: "A chave pública (public_key) da StroWallet não está configurada.",
      };
    }

    // Tentar consultar saldo da carteira mestre
    const resSaldo = await this.obterSaldoMestre("USD");
    if (resSaldo.success) {
      const resp: {
        conectado: boolean;
        mensagem: string;
        ambiente: AmbienteStroWallet;
        saldo_mestre_usd?: number;
        detalhes?: any;
      } = {
        conectado: true,
        ambiente: this.mode,
        mensagem: `Conexão bem-sucedida à StroWallet (${this.mode.toUpperCase()}). Saldo mestre disponível.`,
      };
      if (resSaldo.data?.balance !== undefined) {
        resp.saldo_mestre_usd = resSaldo.data.balance;
      }
      if (resSaldo.data !== undefined) {
        resp.detalhes = resSaldo.data;
      }
      return resp;
    }

    return {
      conectado: false,
      ambiente: this.mode,
      mensagem: resSaldo.message || "Falha na comunicação com a StroWallet.",
      detalhes: resSaldo.raw_response,
    };
  }
}
