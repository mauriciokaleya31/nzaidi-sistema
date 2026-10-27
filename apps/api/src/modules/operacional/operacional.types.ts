import { z } from "zod";

export const TIPOS_TAREFA_OPERACIONAL = [
  "kyc_dossie",
  "pedido_cambio",
  "pedido_remessa",
  "liquidacao_manual",
  "alerta_caixa",
] as const;

export type TipoTarefaOperacional = (typeof TIPOS_TAREFA_OPERACIONAL)[number];

export const ESTADOS_TAREFA_OPERACIONAL = [
  "pendente",
  "em_analise",
  "concluida",
  "rejeitada",
] as const;

export type EstadoTarefaOperacional = (typeof ESTADOS_TAREFA_OPERACIONAL)[number];

export const PRIORIDADES_TAREFA = ["urgente", "alta", "normal"] as const;
export type PrioridadeTarefa = (typeof PRIORIDADES_TAREFA)[number];

export interface ItemFilaOperacional {
  id: string;
  tipo: TipoTarefaOperacional;
  referenciaId: string;
  codigoVisual: string;
  titulo: string;
  descricao: string;
  clienteNome?: string | null | undefined;
  clienteId?: string | null | undefined;
  montante?: string | null | undefined;
  moeda?: string | null | undefined;
  prioridade: PrioridadeTarefa;
  estado: EstadoTarefaOperacional;
  responsavelId?: string | null | undefined;
  responsavelNome?: string | null | undefined;
  criadoEm: string;
  atualizadoEm: string;
  detalhes: Record<string, unknown>;
}

export interface AtividadeOperadorRecente {
  id: string;
  acao: string;
  recurso: string;
  recursoId?: string | null | undefined;
  detalhes?: unknown;
  criadoEm: string;
}

export interface ResumoDashboardOperacional {
  pedidosCambioPendentes: number;
  pedidosRemessasPendentes: number;
  kycPendentes: number;
  kycAprovados: number;
  kycRejeitados: number;
  liquidacoesManuaisPendentes: number;
  caixasAbertos: number;
  alertasDivergencia: number;
  minhasTarefasPendentes: number;
  totalTarefasPendentes: number;
  atividadesRecentes: AtividadeOperadorRecente[];
}

export interface FiltrosFilaOperacional {
  tipo?: TipoTarefaOperacional | undefined;
  estado?: EstadoTarefaOperacional | undefined;
  prioridade?: PrioridadeTarefa | undefined;
  responsavelId?: string | undefined;
  apenasMinhas?: boolean | undefined;
  busca?: string | undefined;
  limite?: number | undefined;
  offset?: number | undefined;
}

// Schemas Zod de Validação
export const AtribuirTarefaSchema = z.object({
  responsavelId: z.string().nullable().optional(),
  prioridade: z.enum(PRIORIDADES_TAREFA).optional(),
  notas: z.string().max(1000).optional(),
});

export const ProcessarPedidoCambioSchema = z.object({
  decisao: z.enum(["aprovar", "rejeitar"]),
  motivoRejeicao: z.string().min(5, "Indique o motivo da rejeição do pedido.").optional(),
  caixaId: z.string().optional(),
  notas: z.string().max(1000).optional(),
});

export const ProcessarPedidoRemessaSchema = z.object({
  decisao: z.enum(["atribuir_parceiro", "liquidar_direto", "rejeitar"]),
  parceiroId: z.string().optional(),
  referenciaExterna: z.string().optional(),
  motivoRejeicao: z.string().min(5, "Indique o motivo da rejeição.").optional(),
  notas: z.string().max(1000).optional(),
});

export const DecisaoDocumentoKycSchema = z.object({
  documentoId: z.string().min(1, "ID do documento obrigatório"),
  statusValidacao: z.enum(["aprovado", "rejeitado", "pendente_atualizacao"]),
  motivoRejeicao: z.string().min(5, "Indique o motivo da recusa do documento.").optional(),
});
