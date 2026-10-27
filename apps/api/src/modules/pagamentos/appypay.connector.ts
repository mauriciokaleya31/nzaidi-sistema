export interface AppyPayConfig {
  ambiente: "sandbox" | "producao";
  endpoint: string;
  authUrl?: string | undefined;
  clientId: string;
  clientSecret?: string | undefined;
  apiKey?: string | undefined;
  resource?: string | undefined;
}

export interface AppyPayChargeResponse {
  sucesso: boolean;
  mensagem: string;
  chargeId?: string | undefined;
  referenciaEntidade?: string | undefined;
  referenciaNumero?: string | undefined;
  referenciaValidade?: string | undefined;
  estado?: string | undefined;
  dadosOriginais?: any | undefined;
}

export class AppyPayConnector {
  public static extrairConfiguracao(configJson: string | null): AppyPayConfig {
    if (!configJson) {
      return {
        ambiente: "sandbox",
        endpoint: "https://app-appypay-api-tst.azurewebsites.net/v1.2",
        authUrl: "https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token",
        clientId: "",
        clientSecret: "",
        resource: "https://appypaydev.onmicrosoft.com/api",
      };
    }

    try {
      const cfg = JSON.parse(configJson);
      return {
        ambiente: cfg.ambiente === "producao" ? "producao" : "sandbox",
        endpoint: cfg.endpoint || (cfg.ambiente === "producao" ? "https://api.appypay.co.ao/v1.2" : "https://app-appypay-api-tst.azurewebsites.net/v1.2"),
        authUrl: cfg.auth_url || (cfg.ambiente === "producao" ? "https://login.microsoftonline.com/appypay.co.ao/oauth2/token" : "https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token"),
        clientId: cfg.client_id || "",
        clientSecret: cfg.client_secret || "",
        apiKey: cfg.api_key || "",
        resource: cfg.resource || (cfg.ambiente === "producao" ? "https://appypay.co.ao/api" : "https://appypaydev.onmicrosoft.com/api"),
      };
    } catch {
      return {
        ambiente: "sandbox",
        endpoint: "https://app-appypay-api-tst.azurewebsites.net/v1.2",
        clientId: "",
      };
    }
  }

  public static async testarConexao(config: AppyPayConfig): Promise<{
    sucesso: boolean;
    mensagem: string;
    latenciaMs: number;
    detalhes?: any | undefined;
  }> {
    const inicio = Date.now();

    if (!config.clientId || (!config.clientSecret && !config.apiKey)) {
      return {
        sucesso: false,
        mensagem: "Credenciais de API AppyPay (Client ID e Secret/Key) não configuradas. O método permanece em estado de preparação.",
        latenciaMs: Date.now() - inicio,
      };
    }

    try {
      // 1. Tentar autenticação OAuth2 / Azure AD se client_secret estiver presente
      if (config.authUrl && config.clientSecret) {
        const body = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: config.clientId,
          client_secret: config.clientSecret,
          resource: config.resource || "",
        });

        const res = await fetch(config.authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          signal: AbortSignal.timeout(10000),
        });

        const latenciaMs = Date.now() - inicio;
        if (res.ok) {
          const dados = await res.json() as any;
          return {
            sucesso: true,
            mensagem: `Autenticação com a AppyPay efetuada com sucesso via OAuth2 (${config.ambiente.toUpperCase()}).`,
            latenciaMs,
            detalhes: { tokenType: dados.token_type, expiraEm: dados.expires_in },
          };
        } else {
          const erroTxt = await res.text();
          return {
            sucesso: false,
            mensagem: `Falha na autenticação AppyPay (HTTP ${res.status}): ${erroTxt.substring(0, 150)}`,
            latenciaMs,
          };
        }
      }

      // 2. Se for modo API-Key direto
      const url = `${config.endpoint.replace(/\/$/, "")}/default-applications`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Client-Id": config.clientId,
          "Api-Key": config.apiKey || "",
        },
        signal: AbortSignal.timeout(10000),
      });

      const latenciaMs = Date.now() - inicio;
      if (res.ok) {
        return {
          sucesso: true,
          mensagem: `Conexão validada com sucesso com a AppyPay (${config.ambiente.toUpperCase()}).`,
          latenciaMs,
        };
      }

      return {
        sucesso: false,
        mensagem: `A API da AppyPay respondeu com HTTP ${res.status}. Verifique as credenciais.`,
        latenciaMs,
      };
    } catch (err: any) {
      return {
        sucesso: false,
        mensagem: `Erro de rede ou timeout ao conectar à AppyPay: ${err.message}`,
        latenciaMs: Date.now() - inicio,
      };
    }
  }

  public static async criarCobranca(
    config: AppyPayConfig,
    dados: {
      merchantTxId: string;
      montanteAoa: number;
      descricao: string;
      metodo: "multicaixa_express" | "referencia";
      clienteNome: string;
      clienteTelefone: string;
      clienteEmail?: string | null | undefined;
    }
  ): Promise<AppyPayChargeResponse> {
    if (!config.clientId || (!config.clientSecret && !config.apiKey)) {
      return {
        sucesso: false,
        mensagem: "A integração automática AppyPay está em preparação e não possui credenciais ativas no momento.",
      };
    }

    try {
      const url = `${config.endpoint.replace(/\/$/, "")}/charges/key`;
      const paymentMethod = dados.metodo === "multicaixa_express" ? "GPO" : "REF";

      const payload: any = {
        amount: Number(dados.montanteAoa.toFixed(2)),
        currency: "AOA",
        description: dados.descricao,
        paymentMethod,
        merchantTransactionId: dados.merchantTxId,
      };

      if (paymentMethod === "GPO") {
        payload.paymentInfo = {
          phoneNumber: dados.clienteTelefone.replace(/\D/g, ""),
        };
      }

      if (dados.clienteEmail || dados.clienteNome) {
        payload.notify = {
          name: dados.clienteNome,
          telephone: dados.clienteTelefone,
          email: dados.clienteEmail || "",
          smsNotification: false,
          emailNotification: Boolean(dados.clienteEmail),
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Client-Id": config.clientId,
          "Api-Key": config.apiKey || "",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      const json = await res.json() as any;

      if (!res.ok) {
        return {
          sucesso: false,
          mensagem: json?.Message || json?.message || `Erro na API da AppyPay (HTTP ${res.status})`,
          dadosOriginais: json,
        };
      }

      const refData = json?.responseStatus?.reference;
      return {
        sucesso: true,
        mensagem: json?.responseStatus?.message || "Cobrança gerada com sucesso pela AppyPay.",
        chargeId: json?.id,
        referenciaEntidade: refData?.entity,
        referenciaNumero: refData?.referenceNumber,
        referenciaValidade: refData?.dueDate,
        estado: json?.responseStatus?.status || "pending",
        dadosOriginais: json,
      };
    } catch (err: any) {
      return {
        sucesso: false,
        mensagem: `Falha na comunicação com a AppyPay: ${err.message}`,
      };
    }
  }
}
