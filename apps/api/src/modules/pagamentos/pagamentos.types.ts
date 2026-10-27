export type TipoMetodoPagamento = "manual" | "automatico";
export type CanalPagamento = "transferencia_bancaria" | "deposito_multicaixa" | "appypay_express" | "appypay_referencia" | "outro";
export type EstadoIntegracaoMetodo = "ativo" | "inativo" | "em_preparacao" | "pendente_credenciais";
export type EstadoTransacaoPagamento = "pendente_confirmacao" | "confirmado" | "rejeitado" | "cancelado" | "expirado";

export interface MetodoPagamentoItem {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoMetodoPagamento;
  canal: CanalPagamento;
  ativo: boolean;
  disponivelCliente: boolean;
  instrucoes: string | null;
  configJson: string | null;
  estadoIntegracao: EstadoIntegracaoMetodo;
  criadoEm: string;
  atualizadoEm: string;
}

export interface MetodoPagamentoClienteDTO {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoMetodoPagamento;
  canal: CanalPagamento;
  instrucoes: string | null;
  dadosBancarios?: {
    titular?: string | undefined;
    bancos?: Array<{ nome: string; iban: string }> | undefined;
  } | undefined;
}

export interface TransacaoPagamentoItem {
  id: string;
  metodoId: string;
  metodoNome?: string | undefined;
  tipoMetodo: TipoMetodoPagamento;
  origemTipo: string;
  origemId: string;
  clienteId: string | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  clienteEmail: string | null;
  montanteAoa: number;
  moeda: string;
  referenciaTransacao: string;
  referenciaExterna: string | null;
  comprovativoUrl: string | null;
  comprovativoHash: string | null;
  notasCliente: string | null;
  estado: EstadoTransacaoPagamento;
  motivoRejeicao: string | null;
  confirmadoPorId: string | null;
  confirmadoPorNome: string | null;
  confirmadoEm: string | null;
  notasInternas: string | null;
  appypayChargeId: string | null;
  appypayRawResponse: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SubmeterPagamentoManualPayload {
  metodoId: string;
  origemTipo: "pedido_cambio" | "pedido_remessa" | "deposito" | "outro";
  origemId: string;
  clienteId?: string | null | undefined;
  clienteNome?: string | null | undefined;
  clienteTelefone?: string | null | undefined;
  clienteEmail?: string | null | undefined;
  montanteAoa: number;
  referenciaExterna: string;
  comprovativoBase64?: string | null | undefined;
  comprovativoNome?: string | null | undefined;
  notasCliente?: string | null | undefined;
}

export interface CriarCobrancaAppyPayPayload {
  origemTipo: "pedido_cambio" | "pedido_remessa" | "deposito" | "outro";
  origemId: string;
  clienteId?: string | null | undefined;
  clienteNome: string;
  clienteTelefone: string;
  clienteEmail?: string | null | undefined;
  montanteAoa: number;
  metodoOpcao: "multicaixa_express" | "referencia";
}
