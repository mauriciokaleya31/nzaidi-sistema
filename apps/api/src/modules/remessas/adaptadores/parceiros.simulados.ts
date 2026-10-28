import type {
  ParceiroRemessaAdapter,
  Remessa,
  RespostaEnvioParceiro,
} from "../remessas.types.js";
import { randomUUID } from "node:crypto";

/**
 * Adaptador SIMULADO para o parceiro MaxPay.
 * Mantém a interface pronta para substituição pelo adaptador real quando os contratos
 * e documentações oficiais do parceiro forem fornecidos pela administração.
 */
export class MaxPaySimuladoAdapter implements ParceiroRemessaAdapter {
  public readonly nome = "maxpay" as const;

  public async enviar(remessa: Remessa): Promise<RespostaEnvioParceiro> {
    // Simula validação de integridade pelo parceiro
    const ref = `MP-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Simula retenção automática se o valor for anormalmente alto ou se houver indicador de risco
    if (parseFloat(remessa.valorAoa) >= 20000000) {
      return {
        sucesso: true,
        referenciaParceiro: ref,
        status: "retida",
        motivo: "Retenção temporária no parceiro MaxPay para análise de AML/CFT.",
      };
    }

    return {
      sucesso: true,
      referenciaParceiro: ref,
      status: "enviada",
      mensagem: "Remessa transmitida com sucesso para processamento na rede MaxPay.",
    };
  }

  public async consultarStatus(referenciaParceiro: string): Promise<{ status: "enviada" | "concluida" | "cancelada" }> {
    return { status: "enviada" };
  }

  public async cancelar(referenciaParceiro: string, motivo: string): Promise<{ sucesso: boolean }> {
    return { sucesso: true };
  }
}

/**
 * Adaptador SIMULADO para o parceiro Realtransfers.
 */
export class RealtransfersSimuladoAdapter implements ParceiroRemessaAdapter {
  public readonly nome = "realtransfers" as const;

  public async enviar(remessa: Remessa): Promise<RespostaEnvioParceiro> {
    const ref = `RT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    if (parseFloat(remessa.valorAoa) >= 20000000) {
      return {
        sucesso: true,
        referenciaParceiro: ref,
        status: "retida",
        motivo: "Retenção no parceiro Realtransfers para verificação documental de destino.",
      };
    }

    return {
      sucesso: true,
      referenciaParceiro: ref,
      status: "enviada",
      mensagem: "Ordem de remessa despachada com sucesso pela rede Realtransfers.",
    };
  }

  public async consultarStatus(referenciaParceiro: string): Promise<{ status: "enviada" | "concluida" | "cancelada" }> {
    return { status: "enviada" };
  }

  public async cancelar(referenciaParceiro: string, motivo: string): Promise<{ sucesso: boolean }> {
    return { sucesso: true };
  }
}
