import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import { obterEnv } from "../config/env.js";
import { criarConexaoBanco } from "../database/database.js";
import { BnaRepository } from "../modules/reportes-bna/bna.repository.js";
import { BnaService, type ContextoUsuario } from "../modules/reportes-bna/bna.service.js";
import { AuditoriaRepository } from "../modules/auditoria/auditoria.repository.js";
import type { TipoMapaBna } from "../modules/reportes-bna/bna.types.js";

export interface StatusMapaCron {
  tipoMapa: TipoMapaBna;
  id: string;
  acao: "gerado" | "regenerado" | "inalterado" | "ignorado_submetido";
  reporteZero: boolean;
  totalOperacoes: number;
}

export interface ResultadoCronBna {
  dataHoje: string;
  horaLuanda: string;
  jaPassou1830: boolean;
  recuperados: string[];
  mapasHoje: StatusMapaCron[];
  executadoEm: string;
  sucesso: boolean;
  mensagem: string;
}

/**
 * Executa a rotina inteligente dos reportes BNA (agendada no cPanel para cada 15 minutos).
 * 
 * Regras:
 * 1. A data e a hora vêm exclusivamente de Africa/Luanda (UTC+1), nunca do fuso do servidor.
 * 2. Antes das 18:30 de Luanda:
 *    - Apenas recupera dias passados pendentes com operações concluídas sem mapa gerado.
 *    - Não gera o mapa do dia de hoje.
 * 3. A partir das 18:30 de Luanda:
 *    - Recupera dias passados pendentes.
 *    - Se o mapa de hoje não existir: gera-o (com reporte a zero automático se sem operações).
 *    - Se o mapa de hoje já existir e não tiver sido submetido, mas tiverem entrado novas operações
 *      concluídas desde que foi gerado: regenera-o e regista BNA_REPORTE_REGENERADO na auditoria.
 *    - Se o mapa de hoje já tiver sido submetido em Suptech ou SSIF: NUNCA o altera.
 * 4. Imprime no ecrã os identificadores reais que ficaram gravados.
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

  // 1. Apurar data e hora oficiais em Africa/Luanda
  const dataHoje = bnaService.obterDataLuanda(relogioReferencia);
  const { hora, minuto } = bnaService.obterHoraMinutosLuanda(relogioReferencia);
  const minutosDia = hora * 60 + minuto;
  const minutosCorte = 18 * 60 + 30; // 18:30
  const jaPassou1830 = minutosDia >= minutosCorte;
  const horaFormatada = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

  // 2. Recuperação de dias anteriores em atraso (executada em qualquer horário)
  const atrasos = bnaService.recuperarDiasEmAtraso(op);

  const mapasHoje: StatusMapaCron[] = [];

  // 3. Processamento do dia corrente
  if (!jaPassou1830) {
    // Antes das 18:30 de Luanda, NÃO gera o mapa de hoje
    return {
      dataHoje,
      horaLuanda: horaFormatada,
      jaPassou1830: false,
      recuperados: atrasos.gerados,
      mapasHoje: [],
      executadoEm: agoraIso,
      sucesso: true,
      mensagem: `Hora atual em Luanda: ${horaFormatada}. A geração do dia corrente só ocorre após as 18:30. Apenas dias anteriores foram verificados.`,
    };
  }

  // A partir das 18:30 em Luanda:
  const tipos: TipoMapaBna[] = ["cambio", "remessa"];

  for (const tipo of tipos) {
    const mapaExistente = bnaRepo.buscarPorDataETipo(dataHoje, tipo);

    if (!mapaExistente) {
      // Caso 1: Não existe mapa para hoje -> Gera novo
      const novo = bnaService.gerarReporteDoDia(dataHoje, tipo, op, relogioReferencia);
      mapasHoje.push({
        tipoMapa: tipo,
        id: novo.id,
        acao: "gerado",
        reporteZero: novo.reporteZero,
        totalOperacoes: novo.totalOperacoes,
      });
    } else {
      // Caso 2: Já existe mapa para hoje
      const foiSubmetido =
        mapaExistente.estadoSuptech !== "gerado" ||
        mapaExistente.estadoSsif !== "gerado";

      if (foiSubmetido) {
        // Se já foi submetido, NUNCA ALTERA
        mapasHoje.push({
          tipoMapa: tipo,
          id: mapaExistente.id,
          acao: "ignorado_submetido",
          reporteZero: mapaExistente.reporteZero,
          totalOperacoes: mapaExistente.totalOperacoes,
        });
      } else {
        // Não foi submetido: verificar se houve novas operações após mapaExistente.geradoEm
        const novasOperacoes = bnaRepo.buscarNovasOperacoesApos(
          dataHoje,
          tipo,
          mapaExistente.geradoEm
        );

        if (novasOperacoes.length > 0) {
          // Regenerar mapa e registar na auditoria
          const regenerado = bnaService.regenerarReporteDoDia(
            dataHoje,
            tipo,
            op,
            `Detetadas ${novasOperacoes.length} novas operações após geração anterior`,
            relogioReferencia
          );
          mapasHoje.push({
            tipoMapa: tipo,
            id: regenerado.id,
            acao: "regenerado",
            reporteZero: regenerado.reporteZero,
            totalOperacoes: regenerado.totalOperacoes,
          });
        } else {
          // Não houve novas operações -> Mantém intacto
          mapasHoje.push({
            tipoMapa: tipo,
            id: mapaExistente.id,
            acao: "inalterado",
            reporteZero: mapaExistente.reporteZero,
            totalOperacoes: mapaExistente.totalOperacoes,
          });
        }
      }
    }
  }

  // 4. Registo consolidado na auditoria do sistema se houve alterações
  auditoriaRepo.registar({
    autorId: op.id,
    autorNome: op.nome,
    autorFuncao: op.funcao,
    acao: "BNA_CRON_ROTINA_EXECUTADA",
    recurso: "bna_reportes_diarios",
    recursoId: `${dataHoje}_rotina_1830`,
    detalhes: {
      dataReferencia: dataHoje,
      horaLuanda: horaFormatada,
      diasRecuperados: atrasos.gerados,
      mapasHoje,
    },
    ip: op.ip,
  });

  return {
    dataHoje,
    horaLuanda: horaFormatada,
    jaPassou1830: true,
    recuperados: atrasos.gerados,
    mapasHoje,
    executadoEm: agoraIso,
    sucesso: true,
    mensagem: `Rotina concluída com sucesso para a data ${dataHoje} (Hora de Luanda: ${horaFormatada}).`,
  };
}

async function cli() {
  try {
    const env = obterEnv();
    const db = criarConexaoBanco(env.DATABASE_PATH);

    const resultado = await executarRotinaDiariaBna(db);
    console.log(`[CRON BNA] Execução concluída com sucesso!`);
    console.log(` - Data de referência (Africa/Luanda): ${resultado.dataHoje}`);
    console.log(` - Hora oficial em Luanda: ${resultado.horaLuanda}`);
    console.log(` - Janela após 18:30 ativa: ${resultado.jaPassou1830}`);

    if (resultado.recuperados.length > 0) {
      console.log(` - Mapas passados recuperados (${resultado.recuperados.length}):`);
      for (const rec of resultado.recuperados) {
        console.log(`   * ${rec}`);
      }
    } else {
      console.log(` - Nenhum mapa anterior pendente de recuperação.`);
    }

    if (resultado.mapasHoje.length > 0) {
      console.log(` - Mapas do dia ${resultado.dataHoje}:`);
      for (const m of resultado.mapasHoje) {
        console.log(
          `   * [${m.tipoMapa.toUpperCase()}] ID guardado: ${m.id} | Ação: ${m.acao} | Operações: ${m.totalOperacoes} | Reporte Zero: ${m.reporteZero}`
        );
      }
    } else {
      console.log(` - ${resultado.mensagem}`);
    }

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
