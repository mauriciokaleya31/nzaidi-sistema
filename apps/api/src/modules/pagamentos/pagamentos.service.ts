import { createHash, randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PagamentosRepository } from "./pagamentos.repository.js";
import { AppyPayConnector, type AppyPayChargeResponse } from "./appypay.connector.js";
import type {
  MetodoPagamentoItem,
  MetodoPagamentoClienteDTO,
  TransacaoPagamentoItem,
  SubmeterPagamentoManualPayload,
  CriarCobrancaAppyPayPayload,
} from "./pagamentos.types.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";

export class PagamentosService {
  private readonly pastaComprovativos: string;

  constructor(
    private readonly repo: PagamentosRepository,
    private readonly auditoriaRepo?: AuditoriaRepository,
    pastaArmazenamento = "./storage/comprovativos_pagamentos"
  ) {
    this.pastaComprovativos = pastaArmazenamento;
    try {
      mkdirSync(this.pastaComprovativos, { recursive: true });
    } catch {}
  }

  public listarMetodos(apenasAtivos = false): MetodoPagamentoItem[] {
    return this.repo.listarMetodos(apenasAtivos);
  }

  public listarMetodosParaCliente(): MetodoPagamentoClienteDTO[] {
    return this.repo.listarMetodosParaCliente();
  }

  public obterMetodoPorId(id: string): MetodoPagamentoItem | null {
    return this.repo.obterMetodoPorId(id);
  }

  public atualizarMetodo(
    id: string,
    dados: {
      nome?: string | undefined;
      descricao?: string | null | undefined;
      ativo?: boolean | undefined;
      disponivelCliente?: boolean | undefined;
      instrucoes?: string | null | undefined;
      configJson?: string | null | undefined;
      estadoIntegracao?: string | undefined;
    },
    adminId: string,
    adminNome: string,
    ip?: string | null | undefined
  ): MetodoPagamentoItem {
    const atualizado = this.repo.atualizarMetodo(id, dados);
    if (!atualizado) {
      throw new Error("Método de pagamento não encontrado.");
    }

    this.auditoriaRepo?.registar({
      autorId: adminId,
      autorNome: adminNome,
      autorFuncao: "gestao",
      acao: "METODO_PAGAMENTO_ATUALIZADO",
      recurso: "metodos_pagamento",
      recursoId: id,
      detalhes: {
        ativo: atualizado.ativo,
        disponivelCliente: atualizado.disponivelCliente,
        estadoIntegracao: atualizado.estadoIntegracao,
      },
      ip: ip ?? null,
    });

    return atualizado;
  }

  public async testarConexaoAppyPay(metodoId = "auto_appypay_mcx"): Promise<{
    sucesso: boolean;
    mensagem: string;
    latenciaMs: number;
    detalhes?: any | undefined;
  }> {
    const metodo = this.repo.obterMetodoPorId(metodoId);
    if (!metodo) {
      return {
        sucesso: false,
        mensagem: "Método de pagamento AppyPay não localizado.",
        latenciaMs: 0,
      };
    }

    const config = AppyPayConnector.extrairConfiguracao(metodo.configJson);
    return AppyPayConnector.testarConexao(config);
  }

  public submeterPagamentoManual(
    payload: SubmeterPagamentoManualPayload,
    ip?: string | null | undefined
  ): TransacaoPagamentoItem {
    const metodo = this.repo.obterMetodoPorId(payload.metodoId);
    if (!metodo || !metodo.ativo) {
      throw new Error("O método de pagamento selecionado não se encontra ativo.");
    }
    if (metodo.tipo !== "manual") {
      throw new Error("O método selecionado não aceita submissão de comprovativo manual.");
    }

    // Salvar comprovativo se fornecido
    let comprovativoUrl: string | null = null;
    let comprovativoHash: string | null = null;

    if (payload.comprovativoBase64) {
      const buffer = Buffer.from(payload.comprovativoBase64, "base64");
      comprovativoHash = createHash("sha256").update(buffer).digest("hex");

      const nomeSeguro = (payload.comprovativoNome || "comprovativo.bin")
        .replace(/^.*[\\/]/, "")
        .replace(/\.{2,}/g, ".")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const idFicheiro = randomUUID();
      const nomeSalvo = `${idFicheiro}_${nomeSeguro}`;
      const caminhoCompleto = join(this.pastaComprovativos, nomeSalvo);

      try {
        writeFileSync(caminhoCompleto, buffer);
        comprovativoUrl = `/storage/comprovativos/${nomeSalvo}`;
      } catch {
        comprovativoUrl = `mock_storage://${nomeSalvo}`;
      }
    }

    const refTransacao = `NZ-MAN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const tx = this.repo.criarTransacaoPagamento({
      metodoId: metodo.id,
      tipoMetodo: "manual",
      origemTipo: payload.origemTipo,
      origemId: payload.origemId,
      clienteId: payload.clienteId ?? null,
      clienteNome: payload.clienteNome ?? null,
      clienteTelefone: payload.clienteTelefone ?? null,
      clienteEmail: payload.clienteEmail ?? null,
      montanteAoa: payload.montanteAoa,
      referenciaTransacao: refTransacao,
      referenciaExterna: payload.referenciaExterna,
      comprovativoUrl,
      comprovativoHash,
      notasCliente: payload.notasCliente ?? null,
      estado: "pendente_confirmacao",
    });

    this.auditoriaRepo?.registar({
      autorId: payload.clienteId ?? "cliente_anonimo",
      autorNome: payload.clienteNome ?? "Cliente",
      autorFuncao: "cliente",
      acao: "PAGAMENTO_MANUAL_SUBMETIDO",
      recurso: "pagamentos_transacoes",
      recursoId: tx.id,
      detalhes: {
        referenciaTransacao: tx.referenciaTransacao,
        montanteAoa: tx.montanteAoa,
        metodo: metodo.nome,
        referenciaExterna: tx.referenciaExterna,
      },
      ip: ip ?? null,
    });

    return tx;
  }

  public listarTransacoes(filtros?: {
    estado?: string | undefined;
    metodoId?: string | undefined;
    tipoMetodo?: string | undefined;
    origemId?: string | undefined;
    limite?: number | undefined;
  }): TransacaoPagamentoItem[] {
    return this.repo.listarTransacoes(filtros);
  }

  public obterTransacaoPorId(id: string): TransacaoPagamentoItem | null {
    return this.repo.obterTransacaoPorId(id);
  }

  public confirmarPagamentoManual(
    id: string,
    adminId: string,
    adminNome: string,
    notasInternas?: string | undefined,
    ip?: string | null | undefined
  ): TransacaoPagamentoItem {
    const tx = this.repo.obterTransacaoPorId(id);
    if (!tx) {
      throw new Error("Transação de pagamento não encontrada.");
    }
    if (tx.estado === "confirmado") {
      return tx; // Idempotente
    }
    if (tx.estado === "rejeitado" || tx.estado === "cancelado") {
      throw new Error(`Não é possível confirmar um pagamento com estado '${tx.estado}'.`);
    }

    const confirmada = this.repo.confirmarTransacaoManual(id, adminId, adminNome, notasInternas);
    if (!confirmada) {
      throw new Error("Falha ao registrar confirmação do pagamento.");
    }

    this.auditoriaRepo?.registar({
      autorId: adminId,
      autorNome: adminNome,
      autorFuncao: "tesouraria",
      acao: "PAGAMENTO_MANUAL_CONFIRMADO",
      recurso: "pagamentos_transacoes",
      recursoId: id,
      detalhes: {
        referenciaTransacao: tx.referenciaTransacao,
        montanteAoa: tx.montanteAoa,
        notasInternas: notasInternas ?? null,
      },
      ip: ip ?? null,
    });

    return confirmada;
  }

  public rejeitarPagamentoManual(
    id: string,
    adminId: string,
    adminNome: string,
    motivo: string,
    notasInternas?: string | undefined,
    ip?: string | null | undefined
  ): TransacaoPagamentoItem {
    const tx = this.repo.obterTransacaoPorId(id);
    if (!tx) {
      throw new Error("Transação de pagamento não encontrada.");
    }
    if (tx.estado === "confirmado") {
      throw new Error("Não é possível rejeitar um pagamento já confirmado e conciliado.");
    }

    const rejeitada = this.repo.rejeitarTransacaoManual(id, adminId, adminNome, motivo, notasInternas);
    if (!rejeitada) {
      throw new Error("Falha ao rejeitar pagamento.");
    }

    this.auditoriaRepo?.registar({
      autorId: adminId,
      autorNome: adminNome,
      autorFuncao: "tesouraria",
      acao: "PAGAMENTO_MANUAL_REJEITADO",
      recurso: "pagamentos_transacoes",
      recursoId: id,
      detalhes: {
        referenciaTransacao: tx.referenciaTransacao,
        motivo,
      },
      ip: ip ?? null,
    });

    return rejeitada;
  }

  public async iniciarCobrancaAppyPay(
    payload: CriarCobrancaAppyPayPayload,
    ip?: string | null | undefined
  ): Promise<{
    sucesso: boolean;
    mensagem: string;
    transacao?: TransacaoPagamentoItem | undefined;
    appypayResponse?: AppyPayChargeResponse | undefined;
  }> {
    const metodoId = payload.metodoOpcao === "multicaixa_express" ? "auto_appypay_mcx" : "auto_appypay_ref";
    const metodo = this.repo.obterMetodoPorId(metodoId);

    if (!metodo || !metodo.ativo || !metodo.disponivelCliente) {
      return {
        sucesso: false,
        mensagem: "O método de pagamento automático AppyPay não está ativo nem disponível para transações no momento (em preparação).",
      };
    }

    const config = AppyPayConnector.extrairConfiguracao(metodo.configJson);
    const refTransacao = `NZ-APAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const resAppyPay = await AppyPayConnector.criarCobranca(config, {
      merchantTxId: refTransacao,
      montanteAoa: payload.montanteAoa,
      descricao: `NZAIDI Câmbios - ${payload.origemTipo.toUpperCase()} #${payload.origemId}`,
      metodo: payload.metodoOpcao,
      clienteNome: payload.clienteNome,
      clienteTelefone: payload.clienteTelefone,
      clienteEmail: payload.clienteEmail,
    });

    const tx = this.repo.criarTransacaoPagamento({
      metodoId: metodo.id,
      tipoMetodo: "automatico",
      origemTipo: payload.origemTipo,
      origemId: payload.origemId,
      clienteId: payload.clienteId ?? null,
      clienteNome: payload.clienteNome,
      clienteTelefone: payload.clienteTelefone,
      clienteEmail: payload.clienteEmail ?? null,
      montanteAoa: payload.montanteAoa,
      referenciaTransacao: refTransacao,
      referenciaExterna: resAppyPay.referenciaNumero ?? null,
      estado: resAppyPay.sucesso ? "pendente_confirmacao" : "rejeitado",
      appypayChargeId: resAppyPay.chargeId ?? null,
      appypayRawResponse: JSON.stringify(resAppyPay.dadosOriginais ?? {}),
    });

    this.auditoriaRepo?.registar({
      autorId: payload.clienteId ?? "cliente_anonimo",
      autorNome: payload.clienteNome,
      autorFuncao: "cliente",
      acao: "PAGAMENTO_APPYPAY_INICIADO",
      recurso: "pagamentos_transacoes",
      recursoId: tx.id,
      detalhes: {
        sucesso: resAppyPay.sucesso,
        chargeId: resAppyPay.chargeId,
        refTransacao,
      },
      ip: ip ?? null,
    });

    return {
      sucesso: resAppyPay.sucesso,
      mensagem: resAppyPay.mensagem,
      transacao: tx,
      appypayResponse: resAppyPay,
    };
  }

  public processarWebhookAppyPay(
    payload: any,
    ip?: string | null | undefined
  ): { sucesso: boolean; mensagem: string; transacaoId?: string | undefined } {
    if (!payload || typeof payload !== "object") {
      return { sucesso: false, mensagem: "Payload de webhook inválido." };
    }

    const merchantTxId = payload.merchantTransactionId;
    const chargeId = payload.id;

    let tx: TransacaoPagamentoItem | null = null;
    if (merchantTxId) {
      tx = this.repo.obterTransacaoPorReferenciaTransacao(merchantTxId);
    }
    if (!tx && chargeId) {
      tx = this.repo.obterTransacaoPorChargeId(chargeId);
    }

    if (!tx) {
      return {
        sucesso: false,
        mensagem: `Nenhuma transação correspondente encontrada para txId '${merchantTxId}' ou chargeId '${chargeId}'.`,
      };
    }

    // IDEMPOTÊNCIA: se já estiver pago, ignora duplicação
    if (tx.estado === "confirmado") {
      return {
        sucesso: true,
        mensagem: "Transação já se encontra confirmada anteriormente (processamento idempotente).",
        transacaoId: tx.id,
      };
    }

    const resStatus = payload.responseStatus || {};
    const statusTxt = String(resStatus.status || "").toLowerCase();
    const ehSucesso = resStatus.successful === true || statusTxt === "success" || statusTxt === "paid";

    const novoEstado = ehSucesso ? "confirmado" : statusTxt === "canceled" ? "cancelado" : "rejeitado";

    this.repo.atualizarEstadoAppyPay(tx.id, novoEstado, JSON.stringify(payload));

    this.auditoriaRepo?.registar({
      autorId: "appypay_webhook",
      autorNome: "AppyPay Gateway Webhook",
      autorFuncao: "sistema",
      acao: "PAGAMENTO_APPYPAY_WEBHOOK_RECEBIDO",
      recurso: "pagamentos_transacoes",
      recursoId: tx.id,
      detalhes: {
        novoEstado,
        chargeId,
        merchantTxId,
      },
      ip: ip ?? null,
    });

    return {
      sucesso: true,
      mensagem: `Transação ${tx.referenciaTransacao} atualizada para '${novoEstado}' via webhook AppyPay.`,
      transacaoId: tx.id,
    };
  }
}
