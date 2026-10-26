export interface ResultadoConsultaAdaptador {
  referencia: string;
  referenciaExterna?: string | null;
  estado: "pendente" | "em_processamento" | "liquidada" | "rejeitada" | "nao_encontrada";
  dataHora?: string | null;
  mensagem?: string | null;
}

export interface ResultadoSubmissaoAdaptador {
  sucesso: boolean;
  referenciaExterna?: string | null;
  modoExecucao: "manual_assistido" | "automatico_api";
  mensagem: string;
  payloadSubmetido?: any;
}

export interface AdaptadorIntegracaoParceiro {
  readonly canal: string;
  readonly nome: string;
  readonly modo: "manual_assistido" | "automatico_api";
  readonly configurado: boolean;

  consultarEstado(referencia: string, referenciaExterna?: string | null): Promise<ResultadoConsultaAdaptador>;
  submeterInstrucao(instrucao: {
    id: string;
    beneficiarioNome: string;
    beneficiarioPais: string;
    beneficiarioIban: string;
    beneficiarioBanco: string;
    beneficiarioSwift?: string | null;
    moeda: string;
    montante: string;
    finalidade?: string | null;
  }): Promise<ResultadoSubmissaoAdaptador>;
}
