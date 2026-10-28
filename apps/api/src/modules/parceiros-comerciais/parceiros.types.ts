import { z } from "zod";

export const TIPOS_PARCEIRO = ["remessas", "pagamentos", "cambio", "correspondente"] as const;
export type TipoParceiro = (typeof TIPOS_PARCEIRO)[number];

export const ESTADOS_PARCEIRO = ["ativo", "suspenso", "inativo"] as const;
export type EstadoParceiro = (typeof ESTADOS_PARCEIRO)[number];

export const FUNCOES_USUARIO_PARCEIRO = ["operador_parceiro", "gestor_parceiro"] as const;
export type FuncaoUsuarioParceiro = (typeof FUNCOES_USUARIO_PARCEIRO)[number];

export const ESTADOS_OPERACAO_PARCEIRO = [
  "pendente",
  "em_processamento",
  "liquidada",
  "devolvida",
  "cancelada",
] as const;
export type EstadoOperacaoParceiro = (typeof ESTADOS_OPERACAO_PARCEIRO)[number];

export interface Parceiro {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoParceiro;
  canaisSuportados: string[];
  comissaoPercentual: string;
  limiteDiarioAoa: string;
  estado: EstadoParceiro;
  chaveApi?: string | null | undefined;
  webhookUrl?: string | null | undefined;
  criadoEm: string;
  atualizadoEm: string;
}

export interface UsuarioParceiro {
  id: string;
  parceiroId: string;
  nome: string;
  email: string;
  senhaHash: string;
  funcao: FuncaoUsuarioParceiro;
  ativo: boolean;
  ultimoLoginEm?: string | null | undefined;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SessaoParceiro {
  id: string;
  parceiroId: string;
  usuarioParceiroId: string;
  expiraEm: string;
  revogadoEm?: string | null | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
  criadoEm: string;
}

export interface OperacaoParceiro {
  id: string;
  parceiroId: string;
  remessaId?: string | null | undefined;
  tipoOperacao: "remessa_saida" | "pagamento_local" | "liquidacao";
  canal: string;
  beneficiarioNome: string;
  beneficiarioPais: string;
  beneficiarioIban: string;
  beneficiarioBanco: string;
  beneficiarioSwift?: string | null | undefined;
  moeda: "USD" | "EUR" | "GBP" | "ZAR" | "AOA";
  montante: string;
  contravalorAoa: string;
  comissaoParceiroAoa: string;
  estado: EstadoOperacaoParceiro;
  referenciaExterna?: string | null | undefined;
  comprovativoHash?: string | null | undefined;
  comprovativoArquivo?: string | null | undefined;
  motivoDevolucao?: string | null | undefined;
  notas?: string | null | undefined;
  criadoEm: string;
  atualizadoEm: string;
  liquidadoEm?: string | null | undefined;
  chaveIdempotencia?: string | null | undefined;
}

export interface ResumoDashboardParceiro {
  parceiro: {
    id: string;
    codigo: string;
    nome: string;
    tipo: TipoParceiro;
    canaisSuportados: string[];
    comissaoPercentual: string;
    limiteDiarioAoa: string;
  };
  metricas: {
    totalRecebidas: number;
    pendentes: number;
    emProcessamento: number;
    concluidas: number;
    devolvidas: number;
    volumeTotalDivisa: Record<string, string>;
    volumeTotalAoa: string;
    comissaoAcumuladaAoa: string;
  };
  adaptadores: Array<{
    canal: string;
    nome: string;
    modo: "manual_assistido" | "automatico_api";
    configurado: boolean;
    status: string;
  }>;
  recentes: OperacaoParceiro[];
}

export interface ReconciliacaoItem {
  referencia: string;
  referenciaExterna?: string | null | undefined;
  montante: string;
  moeda: string;
  estadoNzaidi: string;
  estadoParceiro: string;
  conciliado: boolean;
  divergencia?: string | null | undefined;
}

export interface RelatorioReconciliacao {
  id: string;
  parceiroId: string;
  dataReferencia: string;
  totalInstrucoes: number;
  totalConciliadas: number;
  totalDivergentes: number;
  volumeTotal: string;
  detalhes: ReconciliacaoItem[];
  criadoEm: string;
}

// Schemas Zod de Validação
export const LoginParceiroSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido."),
  senha: z.string().min(8, "A palavra-passe deve conter pelo menos 8 caracteres."),
});

export const RecuperarSenhaParceiroSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido."),
});

export const ConfirmarRecepcaoSchema = z.object({
  notas: z.string().max(500).optional(),
});

export const LiquidarOperacaoSchema = z.object({
  referenciaExterna: z.string().min(3, "A referência externa de liquidação é obrigatória."),
  comprovativoArquivo: z.string().optional(),
  comprovativoHash: z.string().optional(),
  notas: z.string().max(1000).optional(),
  chaveIdempotencia: z.string().min(8, "Chave de idempotência obrigatória."),
});

export const DevolverOperacaoSchema = z.object({
  motivoDevolucao: z.string().min(5, "Indique detalhadamente o motivo da devolução da operação."),
  notas: z.string().max(1000).optional(),
});

export const SubmeterLoteReconciliacaoSchema = z.object({
  dataReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (AAAA-MM-DD)."),
  itens: z.array(
    z.object({
      referencia: z.string().min(1, "Referência da instrução obrigatória."),
      referenciaExterna: z.string().optional(),
      montante: z.string().min(1, "Montante obrigatório."),
      moeda: z.string().min(3, "Moeda obrigatória."),
      estadoReportado: z.enum(["pendente", "em_processamento", "liquidada", "rejeitada"]),
    })
  ).min(1, "Submeta pelo menos um item para reconciliação."),
});

// Schemas para Gestão Administrativa
export const CriarParceiroSchema = z.object({
  codigo: z.string().min(3, "Código do parceiro obrigatório (ex: PARC-MAXPAY)."),
  nome: z.string().min(3, "Nome da entidade parceira obrigatório."),
  tipo: z.enum(TIPOS_PARCEIRO),
  canaisSuportados: z.array(z.string()).min(1, "Indique pelo menos um canal suportado."),
  comissaoPercentual: z.string().default("0.50"),
  limiteDiarioAoa: z.string().default("50000000.00"),
  emailAdmin: z.string().email("E-mail para utilizador inicial obrigatório."),
  nomeAdmin: z.string().min(3, "Nome do utilizador inicial obrigatório."),
  senhaAdmin: z.string().min(8, "Palavra-passe inicial de pelo menos 8 caracteres."),
});

export const EditarParceiroSchema = z.object({
  nome: z.string().min(3).optional(),
  canaisSuportados: z.array(z.string()).optional(),
  comissaoPercentual: z.string().optional(),
  limiteDiarioAoa: z.string().optional(),
  webhookUrl: z.string().url().nullable().optional(),
});

export const AlterarStatusParceiroSchema = z.object({
  estado: z.enum(ESTADOS_PARCEIRO),
  motivo: z.string().optional(),
});

export const RegistoParceiroPortalSchema = z.object({
  nomeEntidade: z.string().min(3, "O nome da entidade parceira é obrigatório."),
  codigoSugerido: z.string().min(2).optional(),
  tipo: z.enum(TIPOS_PARCEIRO).default("remessas"),
  canaisSuportados: z.array(z.string()).default(["transferencia_bancaria", "sepa"]),
  nomeResponsavel: z.string().min(3, "O nome do responsável é obrigatório."),
  emailCorporativo: z.string().email("E-mail corporativo inválido."),
  senha: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres."),
});

export const AtribuirRemessaParceiroSchema = z.object({
  remessaId: z.string().min(1, "Identificador da remessa obrigatório."),
  canal: z.string().min(1, "Canal de envio obrigatório."),
});
