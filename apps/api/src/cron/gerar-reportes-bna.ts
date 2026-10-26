import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import { obterEnv } from "../config/env.js";
import { criarConexaoBanco } from "../database/database.js";
import { BnaRepository } from "../modules/reportes-bna/bna.repository.js";
import { BnaService, type ContextoUsuario } from "../modules/reportes-bna/bna.service.js";
import { AuditoriaRepository } from "../modules/auditoria/auditoria.repository.js";

export interface ResultadoCronBna {
  dataHoje: string;
  recuperados: string[];
  geradosHoje: {
    cambioId: string;
    remessaId: string;
    cambioReporteZero: boolean;
    remessaReporteZero: boolean;
  };
  executadoEm: string;
  sucesso: boolean;
}

/**
 * Executa a rotina automática diária das 18:30 (fuso Africa/Luanda) para os reportes BNA.
 * 1. Recupera quaisquer dias anteriores que estejam com movimento sem reporte gerado.
 * 2. Gera os mapas do dia corrente (câmbio e remessas), com reporte a zero automático se não houver operações.
 * 3. Regista a execução completa na pista de auditoria para fins de compliance e supervisão.
 */
export async function executarRotinaDiariaBna(
  db: DatabaseSync,
  relogioReferencia: Date = new Date(),
  operador?: ContextoUsuario
): Promise<ResultadoCronBna> {
  const agoraIso = new Date().toISOString();
  const op: ContextoUsuario = operador || {
    id: "sistema_cron_bna",
    nome: "Agendador Automático BNA (cPanel)",
    funcao: "sistema",
    ip: "127.0.0.1",
  };

  const bnaRepo = new BnaRepository(db);
  const auditoriaRepo = new AuditoriaRepository(db);
  const bnaService = new BnaService(bnaRepo, auditoriaRepo);

  // 1. Recuperação de dias anteriores em atraso
  const atrasos = bnaService.recuperarDiasEmAtraso(op);

  // 2. Data de referência no fuso oficial de Luanda
  const dataHoje = bnaService.obterDataLuanda(relogioReferencia);

  // 3. Geração obrigatória dos mapas de hoje (com reporte a zero automático se vazio)
  const { cambio, remessa } = bnaService.gerarReportesData(dataHoje, op);

  // 4. Registo consolidado na auditoria do sistema
  auditoriaRepo.registar({
    autorId: op.id,
    autorNome: op.nome,
    autorFuncao: op.funcao,
    acao: "BNA_CRON_ROTINA_EXECUTADA",
    recurso: "bna_reportes_diarios",
    recursoId: `${dataHoje}_rotina_1830`,
    detalhes: {
      dataReferencia: dataHoje,
      diasRecuperados: atrasos.gerados,
      mapaCambioId: cambio.id,
      mapaCambioReporteZero: cambio.reporteZero,
      mapaRemessaId: remessa.id,
      mapaRemessaReporteZero: remessa.reporteZero,
      totalOperacoesCambio: cambio.totalOperacoes,
      totalOperacoesRemessa: remessa.totalOperacoes,
    },
    ip: op.ip,
  });

  return {
    dataHoje,
    recuperados: atrasos.gerados,
    geradosHoje: {
      cambioId: cambio.id,
      remessaId: remessa.id,
      cambioReporteZero: cambio.reporteZero,
      remessaReporteZero: remessa.reporteZero,
    },
    executadoEm: agoraIso,
    sucesso: true,
  };
}

async function cli() {
  try {
    const env = obterEnv();
    const db = criarConexaoBanco(env.DATABASE_PATH);
    console.log("[CRON BNA] A iniciar rotina das 18:30 (Africa/Luanda)...");

    const resultado = await executarRotinaDiariaBna(db);
    console.log(`[CRON BNA] Sucesso para a data ${resultado.dataHoje}:`);
    console.log(` - Dias em atraso recuperados: ${resultado.recuperados.length}`);
    console.log(` - Mapa Câmbio: ID ${resultado.geradosHoje.cambioId} (Reporte a zero: ${resultado.geradosHoje.cambioReporteZero})`);
    console.log(` - Mapa Remessas: ID ${resultado.geradosHoje.remessaId} (Reporte a zero: ${resultado.geradosHoje.remessaReporteZero})`);
    process.exit(0);
  } catch (erro) {
    console.error("[CRON BNA] Erro fatal na execução da rotina:", erro);
    process.exit(1);
  }
}

const arquivoAtual = fileURLToPath(import.meta.url);
const arquivoExecutado = process.argv[1] ? fileURLToPath(new URL(`file://${process.argv[1].replace(/\\/g, "/")}`)) : "";

if (arquivoAtual === arquivoExecutado) {
  cli();
}
