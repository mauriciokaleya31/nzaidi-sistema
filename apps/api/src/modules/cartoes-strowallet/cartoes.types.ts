export type EstadoAtivacaoServico =
  | "em_preparacao"
  | "em_testes"
  | "pronto_ativacao"
  | "ativo"
  | "suspenso";

export type AmbienteStroWallet = "sandbox" | "live";

export type EstadoCartao = "ativo" | "congelado" | "bloqueado" | "cancelado";

export type EstadoAdesaoCliente = "pendente" | "aprovado" | "rejeitado";

export type TipoTransacaoCartao =
  | "emissao"
  | "carregamento"
  | "saque"
  | "manutencao"
  | "compra_online"
  | "estorno";

export type EstadoTransacaoCartao =
  | "pendente"
  | "confirmada"
  | "recusada"
  | "estornada";

export interface CartoesConfig {
  id: string;
  servico_ativo: number; // 0 ou 1
  visivel_portal: number; // 0 ou 1
  modo_manutencao: number; // 0 ou 1
  mensagem_manutencao: string | null;
  estado_ativacao: EstadoAtivacaoServico;
  fornecedor: string;
  ambiente: AmbienteStroWallet;
  public_key: string | null;
  secret_key: string | null;
  webhook_secret: string | null;
  base_url: string;
  saldo_alerta_minimo_usd: number;
  criado_em: string;
  atualizado_em: string;
  atualizado_por: string | null;
}

export interface CartoesParametrosComerciais {
  id: string;
  taxa_emissao_usd: number;
  custo_emissao_fornecedor_usd: number;
  comissao_carregamento_pct: number;
  comissao_carregamento_fixa_usd: number;
  custo_carregamento_fornecedor_pct: number;
  margem_cambial_pct: number;
  taxa_manutencao_mensal_usd: number;
  limite_min_carregamento_usd: number;
  limite_max_carregamento_usd: number;
  limite_diario_usd: number;
  limite_mensal_usd: number;
  saldo_maximo_cartao_usd: number;
  atualizado_em: string;
  atualizado_por: string | null;
}

export interface CartaoClienteAdesao {
  id: string;
  cliente_id: string;
  estado_adesao: EstadoAdesaoCliente;
  termos_aceites_em: string | null;
  strowallet_customer_id: string | null;
  motivo_rejeicao: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  criado_em: string;
  atualizado_em: string;
  // Campos enriquecidos da tabela clientes
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  kyc_estado?: string;
}

export interface CartaoVirtual {
  id: string;
  cliente_id: string;
  strowallet_card_id: string;
  titular_nome: string;
  ultimos_4_digitos: string;
  marca: string;
  moeda: string;
  mes_expiracao: string;
  ano_expiracao: string;
  estado: EstadoCartao;
  saldo_usd: number;
  rotulo: string | null;
  billing_address_json: string | null;
  criado_em: string;
  atualizado_em: string;
  // Campos enriquecidos
  cliente_nome?: string;
  cliente_email?: string;
}

export interface CartaoTransacao {
  id: string;
  cartao_id: string;
  cliente_id: string;
  tipo: TipoTransacaoCartao;
  montante_usd: number;
  taxa_cambio_aplicada: number | null;
  contravalor_aoa: number | null;
  comissao_aoa: number | null;
  margem_cambial_aoa: number | null;
  custo_fornecedor_usd: number | null;
  receita_liquida_aoa: number | null;
  saldo_apos_usd: number | null;
  descricao: string | null;
  referencia_transacao: string;
  estado: EstadoTransacaoCartao;
  strowallet_ref: string | null;
  detalhes_json: string | null;
  criado_em: string;
}

export interface ResumoDashboardCartoes {
  total_cartoes: number;
  cartoes_ativos: number;
  cartoes_congelados: number;
  cartoes_cancelados: number;
  volume_total_usd: number;
  volume_total_aoa: number;
  receita_taxas_emissao_aoa: number;
  receita_comissoes_carregamento_aoa: number;
  receita_margem_cambial_aoa: number;
  receita_total_liquida_aoa: number;
  custo_total_fornecedor_usd: number;
  saldo_mestre_strowallet_usd: number | null;
  estado_ativacao: EstadoAtivacaoServico;
  servico_ativo: boolean;
  visivel_portal: boolean;
  modo_manutencao: boolean;
  alerta_saldo_baixo: boolean;
}

export interface CalculoCarregamentoDTO {
  montante_usd: number;
  taxa_cambio_base: number; // Ex: 950 AOA/USD
  taxa_cambio_com_margem: number; // Ex: 978.5 AOA/USD (+3%)
  contravalor_base_aoa: number;
  margem_cambial_aoa: number;
  comissao_carregamento_fixa_aoa: number;
  comissao_carregamento_pct_aoa: number;
  comissao_total_aoa: number;
  total_a_pagar_aoa: number;
  custo_fornecedor_usd: number;
  receita_liquida_estimada_aoa: number;
}

export interface CalculoEmissaoDTO {
  taxa_emissao_usd: number;
  custo_fornecedor_usd: number;
  taxa_cambio_aplicada: number;
  taxa_emissao_aoa: number;
  carregamento_inicial_usd: number;
  calculo_carregamento: CalculoCarregamentoDTO;
  total_geral_aoa: number;
  receita_liquida_total_aoa: number;
}

export interface RevelacaoDadosCartao {
  cartao_id: string;
  ultimos_4_digitos: string;
  titular_nome: string;
  mes_expiracao: string;
  ano_expiracao: string;
  cvv_revelado?: string;
  pan_completo_revelado?: string;
  expira_em_segundos: number;
  billing_address?: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface StroWalletKycParams {
  first_name: string;
  last_name: string;
  id_number: string;
  id_type: string;
  id_front_image?: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  dial_code?: string;
  line1: string;
  city: string;
  state: string;
  postal_code?: string;
  country?: string;
}

export interface StroWalletApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  http_code?: number;
  raw_response?: string;
}
