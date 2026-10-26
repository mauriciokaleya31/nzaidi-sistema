/**
 * NZAIDI — Tipos do Módulo de Integrações Manuais (Ticket NZAIDI-MANUAL-01)
 * Suporte a conciliação assistida e liquidação manual de parceiros e bancos angolanos.
 */

export const TIPOS_INTEGRACAO_MANUAL = [
  "remessa_parceiro",
  "recebimento_kwanza",
  "liquidacao_wise",
  "ajuste_conciliacao",
] as const;

export type TipoIntegracaoManual = (typeof TIPOS_INTEGRACAO_MANUAL)[number];

export const CANAIS_ORIGEM_MANUAL = [
  "wise",
  "maxpay",
  "realtransfers",
  "multicaixa_gpo",
  "banco_bai",
  "banco_bfa",
  "banco_bma",
  "banco_bir",
  "outro",
] as const;

export type CanalOrigemManual = (typeof CANAIS_ORIGEM_MANUAL)[number];

export const ESTADOS_EXECUCAO_MANUAL = [
  "pendente",
  "concluida",
  "rejeitada",
  "cancelada",
] as const;

export type EstadoExecucaoManual = (typeof ESTADOS_EXECUCAO_MANUAL)[number];

export interface ExecucaoIntegracaoManual {
  id: string;
  transacaoId: string;
  tipoIntegracao: TipoIntegracaoManual;
  canalOrigem: CanalOrigemManual;
  referenciaExterna: string;
  valorMoeda: string;
  moeda: "AOA" | "USD" | "EUR" | "GBP" | "ZAR";
  estado: EstadoExecucaoManual;
  operadorId: string;
  operadorNome: string;
  operadorFuncao: string;
  aprovadorId?: string | null | undefined;
  aprovadorNome?: string | null | undefined;
  momentoExecucao: string;
  momentoAprovacao?: string | null | undefined;
  comprovativoArquivo?: string | null | undefined;
  comprovativoHashSha256?: string | null | undefined;
  notas?: string | null | undefined;
  chaveIdempotencia: string;
}

export interface CriarExecucaoManualDTO {
  transacaoId: string;
  tipoIntegracao: TipoIntegracaoManual;
  canalOrigem: CanalOrigemManual;
  referenciaExterna: string;
  valorMoeda: string;
  moeda: "AOA" | "USD" | "EUR" | "GBP" | "ZAR";
  chaveIdempotencia: string;
  notas?: string | null | undefined;
  comprovativoArquivo?: string | null | undefined;
  comprovativoHashSha256?: string | null | undefined;
}

export interface ContextoOperador {
  id: string;
  nome: string;
  funcao: string;
  ip: string;
}
