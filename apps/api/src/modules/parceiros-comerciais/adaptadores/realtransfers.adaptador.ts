import type {
  AdaptadorIntegracaoParceiro,
  ResultadoConsultaAdaptador,
  ResultadoSubmissaoAdaptador,
} from "./adaptador.interface.js";

/**
 * Adaptador de Integração Comercial: Realtransfers
 * Opera em modo "manual_assistido" para remessas e pagamentos a parceiros.
 * Integração automática identificada explicitamente como Não Configurada até autorização regulatória e chaves institucionais.
 */
export class RealtransfersAdaptador implements AdaptadorIntegracaoParceiro {
  public readonly canal = "realtransfers";
  public readonly nome = "Real Transfers Remittances";
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
        mensagem: "Instrução aguardando atribuição de referência externa no Realtransfers.",
      };
    }

    return {
      referencia,
      referenciaExterna,
      estado: "em_processamento",
      mensagem: "Consulta de estado via canal assistido Realtransfers. Requer liquidação pelo operador parceiro.",
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
    const payloadFormatado = {
      agency: "REALTRANSFERS_AO",
      transactionReference: instrucao.id,
      recipient: {
        fullName: instrucao.beneficiarioNome,
        destinationCountry: instrucao.beneficiarioPais,
        accountIban: instrucao.beneficiarioIban,
        bankName: instrucao.beneficiarioBanco,
        bicSwift: instrucao.beneficiarioSwift ?? undefined,
      },
      remittance: {
        targetCurrency: instrucao.moeda,
        targetAmount: instrucao.montante,
        nature: instrucao.finalidade ?? "Apoio Familiar",
      },
    };

    return {
      sucesso: true,
      referenciaExterna: null,
      modoExecucao: "manual_assistido",
      mensagem:
        "Instrução preparada e disponibilizada para liquidação assistida. API direta Realtransfers não configurada no piloto.",
      payloadSubmetido: payloadFormatado,
    };
  }
}
