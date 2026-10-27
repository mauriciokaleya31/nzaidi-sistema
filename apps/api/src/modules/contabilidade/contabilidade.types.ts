import { z } from "zod";

export const MoedaContabilSchema = z.enum(["AOA", "USD", "EUR"]);
export type MoedaContabil = z.infer<typeof MoedaContabilSchema>;

export const NaturezaContaSchema = z.enum(["devedora", "credora"]);
export type NaturezaConta = z.infer<typeof NaturezaContaSchema>;

export const TipoContaSchema = z.enum(["ativo", "passivo", "patrimonio", "proveito", "custo"]);
export type TipoConta = z.infer<typeof TipoContaSchema>;

export const TipoOrigemLancamentoSchema = z.enum([
  "cambio_balcao",
  "cambio_online",
  "remessa_cliente",
  "liquidacao_parceiro",
  "suprimento_caixa",
  "sangria_caixa",
  "quebra_fecho_caixa",
  "sobra_fecho_caixa",
  "estorno_operacao",
]);
export type TipoOrigemLancamento = z.infer<typeof TipoOrigemLancamentoSchema>;

export const EstadoLancamentoSchema = z.enum(["confirmado", "estornado"]);
export type EstadoLancamento = z.infer<typeof EstadoLancamentoSchema>;

export const TipoPartidaSchema = z.enum(["D", "C"]);
export type TipoPartida = z.infer<typeof TipoPartidaSchema>;

export const EstadoDivergenciaSchema = z.enum([
  "aberta",
  "em_analise",
  "resolvida",
  "desconsiderada_autorizada",
]);
export type EstadoDivergencia = z.infer<typeof EstadoDivergenciaSchema>;

export const TipoDivergenciaSchema = z.enum([
  "cambio_vs_liquidacao",
  "bordero_vs_movimento",
  "remessa_vs_parceiro",
  "liquidacao_manual_vs_comprovativo",
  "comissao_prevista_vs_apurada",
  "caixa_vs_contagem",
]);
export type TipoDivergencia = z.infer<typeof TipoDivergenciaSchema>;

export interface ContaContabil {
  codigo: string;
  nome: string;
  natureza: NaturezaConta;
  tipo: TipoConta;
  moeda: "AOA" | "USD" | "EUR" | "MULTI";
  descricao?: string | null | undefined;
  ativo: boolean;
  saldoAtualAoa?: string | undefined;
}

export interface PartidaContabilDTO {
  contaCodigo: string;
  tipo: TipoPartida;
  montanteOriginal: string;
  moeda: MoedaContabil;
  montanteAoa: string;
  descricaoLinha?: string | null | undefined;
  ordem?: number | undefined;
}

export interface PartidaContabil extends PartidaContabilDTO {
  id: string;
  lancamentoId: string;
  contaNome?: string | undefined;
}

export interface LancamentoContabil {
  id: string;
  numeroLancamento: string;
  dataMovimento: string;
  origemTipo: TipoOrigemLancamento;
  origemId: string;
  descricao: string;
  moeda: MoedaContabil;
  montanteOriginal: string;
  taxaCambio?: string | null | undefined;
  contravalorAoa: string;
  estado: EstadoLancamento;
  estornadoEm?: string | null | undefined;
  estornoLancamentoId?: string | null | undefined;
  motivoEstorno?: string | null | undefined;
  operadorId: string;
  operadorNome: string;
  criadoEm: string;
  partidas?: PartidaContabil[] | undefined;
}

export interface DivergenciaReconciliacao {
  id: string;
  tipo: TipoDivergencia;
  referenciaId: string;
  origem: string;
  valorEsperado: string;
  valorObservado: string;
  moeda: MoedaContabil;
  diferenca: string;
  estado: EstadoDivergencia;
  motivoResolucao?: string | null | undefined;
  resolvidoPorId?: string | null | undefined;
  resolvidoPorNome?: string | null | undefined;
  resolvidoEm?: string | null | undefined;
  criadoEm: string;
}

export interface TaxaHistorico {
  id: string;
  moeda: "USD" | "EUR";
  referencia: string;
  margemCompra: string;
  margemVenda: string;
  taxaCompra: string;
  taxaVenda: string;
  fonte: string;
  alteradoPorId?: string | null | undefined;
  alteradoPorNome?: string | null | undefined;
  motivo?: string | null | undefined;
  criadoEm: string;
}

// Schemas de entrada para rotas
export const CriarLancamentoManualSchema = z.object({
  dataMovimento: z.string().optional(),
  origemTipo: TipoOrigemLancamentoSchema,
  origemId: z.string().min(1),
  descricao: z.string().min(5),
  moeda: MoedaContabilSchema,
  montanteOriginal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  taxaCambio: z.string().optional(),
  contravalorAoa: z.string().regex(/^\d+(\.\d{1,2})?$/),
  partidas: z.array(
    z.object({
      contaCodigo: z.string().min(1),
      tipo: TipoPartidaSchema,
      montanteOriginal: z.string().regex(/^\d+(\.\d{1,2})?$/),
      moeda: MoedaContabilSchema,
      montanteAoa: z.string().regex(/^\d+(\.\d{1,2})?$/),
      descricaoLinha: z.string().optional(),
    })
  ).min(2, "O lançamento deve conter pelo menos duas partidas (uma de débito e uma de crédito)"),
});

export const EstornarLancamentoSchema = z.object({
  motivo: z.string().min(5, "O motivo do estorno é obrigatório"),
});

export const ResolverDivergenciaSchema = z.object({
  estado: z.enum(["resolvida", "desconsiderada_autorizada"]),
  motivo: z.string().min(5, "A justificação da resolução é obrigatória"),
});

export const FiltrosRelatorioSchema = z.object({
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  moeda: z.string().optional(),
  operadorId: z.string().optional(),
  caixaId: z.string().optional(),
  parceiroId: z.string().optional(),
  formato: z.enum(["json", "csv"]).optional().default("json"),
});
