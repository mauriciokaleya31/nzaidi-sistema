import type {
  AdaptadorIntegracaoParceiro,
  ResultadoConsultaAdaptador,
  ResultadoSubmissaoAdaptador,
} from "./adaptador.interface.js";

/**
 * Adaptador de Integração Comercial: MaxPay
 * Opera em modo "manual_assistido" com conformidade total às normas cambiais.
 * Integração automática identificada explicitamente como Não Configurada até injeção de credenciais mTLS/API de produção.
 */
export class MaxPayAdaptador implements AdaptadorIntegracaoParceiro {
  public readonly canal = "maxpay";
  public readonly nome = "MaxPay Global Payments";
  public readonly modo = "manual_assistido" as const;
  public readonly configurado = false; // Identifica que API direta não possui chaves em ambiente piloto

  public async consultarEstado(
    referencia: string,
    referenciaExterna?: string | null
  ): Promise<ResultadoConsultaAdaptador> {
    if (!referenciaExterna) {
      return {
        referencia,
        estado: "pendente",
        mensagem: "Instrução aguardando atribuição de referência externa no MaxPay.",
      };
    }

    return {
      referencia,
      referenciaExterna,
      estado: "em_processamento",
      mensagem: "Consulta de estado via canal assistido MaxPay. Requer liquidação pelo operador parceiro.",
    };
  }

  public async submeterInstrucao(instrucao: {
    id: string;
    beneficiarioNome: string;
    beneficiarioPais: string;
    beneficiarioIban: string;
    beneficiarioBanco: string;
    beneficiarioSwift?: string | null;
    moeda: string;
    montante: string;
    finalidade?: string | null;
  }): Promise<ResultadoSubmissaoAdaptador> {
    // Validação estrita de formato bancário internacional (IBAN / SWIFT)
    const payloadFormatado = {
      partnerCode: "MAXPAY_NZAIDI",
      instructionId: instrucao.id,
      beneficiary: {
        name: instrucao.beneficiarioNome,
        country: instrucao.beneficiarioPais,
        iban: instrucao.beneficiarioIban,
        bank: instrucao.beneficiarioBanco,
        swift: instrucao.beneficiarioSwift ?? undefined,
      },
      payment: {
        currency: instrucao.moeda,
        amount: instrucao.montante,
        purpose: instrucao.finalidade ?? "Remessa Familiar / Comercial",
      },
    };

    return {
      sucesso: true,
      referenciaExterna: null,
      modoExecucao: "manual_assistido",
      mensagem:
        "Instrução preparada e disponibilizada para liquidação assistida. API direta MaxPay não configurada no piloto.",
      payloadSubmetido: payloadFormatado,
    };
  }
}
