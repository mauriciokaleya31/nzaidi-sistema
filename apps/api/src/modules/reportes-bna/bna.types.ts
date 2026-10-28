import { z } from "zod";

export const TipoMapaBnaSchema = z.enum(["cambio", "remessa"]);
export type TipoMapaBna = z.infer<typeof TipoMapaBnaSchema>;

export const PlataformaBnaSchema = z.enum(["suptech", "ssif", "ambas"]);
export type PlataformaBna = z.infer<typeof PlataformaBnaSchema>;

export const EstadoSubmissaoBnaSchema = z.enum(["pendente", "gerado", "submetido", "erro"]);
export type EstadoSubmissaoBna = z.infer<typeof EstadoSubmissaoBnaSchema>;

export interface BnaReporteDiario {
  id: string;
  dataReferencia: string; // YYYY-MM-DD
  tipoMapa: TipoMapaBna;
  formato: string;
  totalOperacoes: number;
  volumeAoa: string;
  volumeDivisaUsd: string;
  volumeDivisaEur: string;
  reporteZero: boolean;
  estadoSuptech: EstadoSubmissaoBna;
  estadoSsif: EstadoSubmissaoBna;
  conteudoArquivo: string;
  nomeArquivo: string;
  hashSha256: string;
  geradoEm: string;
  geradoPorId: string;
  geradoPorNome: string;
  submetidoSuptechEm?: string | null;
  submetidoSuptechPorId?: string | null;
  submetidoSsifEm?: string | null;
  submetidoSsifPorId?: string | null;
}

export interface BnaColunaConfig {
  id: string;
  tipoMapa: TipoMapaBna;
  ordem: number;
  nomeColuna: string;
  descricao: string;
  campoOrigem: string;
  formatoDado: string;
  ativo: boolean;
}

export const GerarReporteInputSchema = z.object({
  dataReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD").optional(),
  tipoMapa: z.enum(["cambio", "remessa", "ambos"]).default("ambos"),
});

export type GerarReporteInput = z.infer<typeof GerarReporteInputSchema>;

export const RegistarSubmissaoInputSchema = z.object({
  plataforma: PlataformaBnaSchema,
  comprovativoProtocolo: z.string().optional(),
});

export type RegistarSubmissaoInput = z.infer<typeof RegistarSubmissaoInputSchema>;
