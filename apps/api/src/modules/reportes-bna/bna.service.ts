import { createHash, randomUUID } from "node:crypto";
import { decimal, D } from "@nzaidi/dominio";
import type { BnaRepository } from "./bna.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type {
  BnaReporteDiario,
  TipoMapaBna,
  BnaColunaConfig,
} from "./bna.types.js";
import { ErroValidacao, ErroNaoEncontrado } from "../../plugins/erros.js";

export interface ContextoUsuario {
  id: string;
  nome: string;
  funcao?: string;
  ip?: string | null;
}

export class BnaService {
  constructor(
    private bnaRepo: BnaRepository,
    private auditoriaRepo: AuditoriaRepository
  ) {}

  /**
   * Obtém a data corrente no fuso horário de Angola (Africa/Luanda = UTC+1).
   */
  public obterDataLuanda(dataRef: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Luanda",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(dataRef); // Retorna YYYY-MM-DD
  }

  /**
   * Obtém a hora corrente em minutos a partir da meia-noite no fuso de Luanda.
   */
  public obterHoraMinutosLuanda(dataRef: Date = new Date()): { hora: number; minuto: number } {
    const formatter = new Intl.DateTimeFormat("pt-AO", {
      timeZone: "Africa/Luanda",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const partes = formatter.formatToParts(dataRef);
    const hora = parseInt(partes.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minuto = parseInt(partes.find((p) => p.type === "minute")?.value ?? "0", 10);
    return { hora, minuto };
  }

  /**
   * Gera o mapa diário de Câmbio ou de Remessa para uma data específica.
   */
  public gerarReporteDoDia(
    dataReferencia: string,
    tipoMapa: TipoMapaBna,
    operador: ContextoUsuario
  ): BnaReporteDiario {
    const colunas = this.bnaRepo.obterColunasConfig(tipoMapa);
    if (colunas.length === 0) {
      throw new ErroValidacao(`Nenhuma coluna configurada para o reporte BNA do tipo '${tipoMapa}'.`);
    }

    const agora = new Date().toISOString();
    let totalOperacoes = 0;
    let volumeAoa = "0.00";
    let volumeDivisaUsd = "0.00";
    let volumeDivisaEur = "0.00";
    let conteudoCsv = "";

    // 1. Cabeçalho do CSV oficial
    const nomesColunas = colunas.map((c) => c.nomeColuna);
    conteudoCsv += nomesColunas.join(";") + "\r\n";

    if (tipoMapa === "cambio") {
      const operacoes = this.bnaRepo.buscarOperacoesCambioPorData(dataReferencia);
      totalOperacoes = operacoes.length;

      if (totalOperacoes === 0) {
        // REPORTE A ZERO OBRIGATÓRIO (sem movimentação no dia)
        // Regista linha declarativa conforme exigência BNA para ausência de sanções
        const linhaZero = nomesColunas.map((col) => {
          if (col === "DATA_OPERACAO") return `${dataReferencia} 18:30:00`;
          if (col === "NUMERO_BORDERO") return "SEM_MOVIMENTO";
          if (col === "CLIENTE_NIF") return "5000000000"; // NIF Institucional NZAIDI
          if (col === "CLIENTE_NOME") return "NZAIDI - REPORTE A ZERO (SEM OPERAÇÕES)";
          if (col === "TIPO_OPERACAO") return "CAMBIO";
          if (col === "SENTIDO") return "COMPRA";
          if (col === "MOEDA_ESTRANGEIRA") return "USD";
          if (col === "MONTANTE_DIVISA") return "0.00";
          if (col === "TAXA_CAMBIO") return "0.0000";
          if (col === "CONTRAVALOR_AOA") return "0.00";
          if (col === "OPERADOR_BALCAO") return operador.nome;
          return "N/A";
        });
        conteudoCsv += linhaZero.join(";") + "\r\n";
      } else {
        let somatorioAoa = decimal("0.00");
        let somatorioUsd = decimal("0.00");
        let somatorioEur = decimal("0.00");

        for (const op of operacoes) {
          somatorioAoa = somatorioAoa.plus(decimal(op.montante_aoa));
          if (op.moeda_divisa === "USD") {
            somatorioUsd = somatorioUsd.plus(decimal(op.montante_divisa));
          } else if (op.moeda_divisa === "EUR") {
            somatorioEur = somatorioEur.plus(decimal(op.montante_divisa));
          }

          const valoresLinha = colunas.map((col) => {
            const valorBruto = this.extrairValorColuna(col, op);
            return this.formatarCampoCsv(valorBruto);
          });
          conteudoCsv += valoresLinha.join(";") + "\r\n";
        }

        volumeAoa = somatorioAoa.toFixed(2);
        volumeDivisaUsd = somatorioUsd.toFixed(2);
        volumeDivisaEur = somatorioEur.toFixed(2);
      }
    } else {
      // Tipo Remessa
      const remessas = this.bnaRepo.buscarRemessasPorData(dataReferencia);
      totalOperacoes = remessas.length;

      if (totalOperacoes === 0) {
        // REPORTE A ZERO OBRIGATÓRIO PARA REMESSAS
        const linhaZero = nomesColunas.map((col) => {
          if (col === "DATA_REMESSA") return `${dataReferencia} 18:30:00`;
          if (col === "NUMERO_REMESSA") return "SEM_MOVIMENTO";
          if (col === "REMETENTE_NIF") return "5000000000";
          if (col === "REMETENTE_NOME") return "NZAIDI - REPORTE A ZERO (SEM REMESSAS)";
          if (col === "BENEFICIARIO_NOME") return "N/A";
          if (col === "PAIS_DESTINO") return "AO";
          if (col === "PARCEIRO_EXECUTOR") return "NZAIDI";
          if (col === "MOEDA_DESTINO") return "USD";
          if (col === "VALOR_DIVISA") return "0.00";
          if (col === "VALOR_AOA") return "0.00";
          if (col === "COMISSAO_AOA") return "0.00";
          if (col === "ESTADO_REMESSA") return "SEM_MOVIMENTO";
          return "N/A";
        });
        conteudoCsv += linhaZero.join(";") + "\r\n";
      } else {
        let somatorioAoa = decimal("0.00");
        let somatorioUsd = decimal("0.00");
        let somatorioEur = decimal("0.00");

        for (const rem of remessas) {
          somatorioAoa = somatorioAoa.plus(decimal(rem.valor_aoa));
          if (rem.moeda === "USD") {
            somatorioUsd = somatorioUsd.plus(decimal(rem.valor_moeda));
          } else if (rem.moeda === "EUR") {
            somatorioEur = somatorioEur.plus(decimal(rem.valor_moeda));
          }

          const valoresLinha = colunas.map((col) => {
            const valorBruto = this.extrairValorColuna(col, rem);
            return this.formatarCampoCsv(valorBruto);
          });
          conteudoCsv += valoresLinha.join(";") + "\r\n";
        }

        volumeAoa = somatorioAoa.toFixed(2);
        volumeDivisaUsd = somatorioUsd.toFixed(2);
        volumeDivisaEur = somatorioEur.toFixed(2);
      }
    }

    const hashSha256 = createHash("sha256").update(conteudoCsv, "utf-8").digest("hex");
    const dataLimpa = dataReferencia.replace(/-/g, "");
    const nomeArquivo = `MAPA_BNA_${tipoMapa.toUpperCase()}_${dataLimpa}_NZAIDI.csv`;

    const reporte: BnaReporteDiario = {
      id: `rep_${randomUUID()}`,
      dataReferencia,
      tipoMapa,
      formato: "csv",
      totalOperacoes,
      volumeAoa,
      volumeDivisaUsd,
      volumeDivisaEur,
      reporteZero: totalOperacoes === 0,
      estadoSuptech: "gerado",
      estadoSsif: "gerado",
      conteudoArquivo: conteudoCsv,
      nomeArquivo,
      hashSha256,
      geradoEm: agora,
      geradoPorId: operador.id,
      geradoPorNome: operador.nome,
    };

    this.bnaRepo.salvarReporte(reporte);

    // Registo de Auditoria
    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "BNA_REPORTE_GERADO",
      recurso: "bna_reportes_diarios",
      recursoId: reporte.id,
      detalhes: {
        tipoMapa,
        dataReferencia,
        totalOperacoes,
        volumeAoa,
        reporteZero: reporte.reporteZero,
        nomeArquivo,
      },
      ip: operador.ip,
    });

    return reporte;
  }

  /**
   * Gera ambos os mapas (câmbio e remessa) para a data solicitada.
   */
  public gerarReportesData(dataReferencia: string, operador: ContextoUsuario): { cambio: BnaReporteDiario; remessa: BnaReporteDiario } {
    const cambio = this.gerarReporteDoDia(dataReferencia, "cambio", operador);
    const remessa = this.gerarReporteDoDia(dataReferencia, "remessa", operador);
    return { cambio, remessa };
  }

  /**
   * Ao arrancar o servidor, identifica datas passadas com movimentações ou dias úteis sem reporte e gera-os.
   */
  public recuperarDiasEmAtraso(operadorSistema: ContextoUsuario): { gerados: string[] } {
    const datasPendentesCambio = this.bnaRepo.listarDatasComMovimentoSemReporte("cambio");
    const datasPendentesRemessa = this.bnaRepo.listarDatasComMovimentoSemReporte("remessa");
    const todasDatas = Array.from(new Set([...datasPendentesCambio, ...datasPendentesRemessa])).sort();

    const gerados: string[] = [];
    for (const data of todasDatas) {
      if (datasPendentesCambio.includes(data)) {
        this.gerarReporteDoDia(data, "cambio", operadorSistema);
        gerados.push(`${data}:cambio`);
      }
      if (datasPendentesRemessa.includes(data)) {
        this.gerarReporteDoDia(data, "remessa", operadorSistema);
        gerados.push(`${data}:remessa`);
      }
    }
    return { gerados };
  }

  /**
   * Verifica se às 18:35 (ou posterior, no fuso de Luanda) o mapa de hoje ainda não foi gerado.
   * Utilizado para alimentar a Visão Geral (Dashboard) com alerta visual proativo.
   */
  public verificarAlertaReporteHoje(relogioReferencia: Date = new Date()): {
    alerta: boolean;
    horaLuanda: string;
    dataHojeLuanda: string;
    mapaCambioGerado: boolean;
    mapaRemessaGerado: boolean;
    mensagem?: string;
  } {
    const dataHojeLuanda = this.obterDataLuanda(relogioReferencia);
    const { hora, minuto } = this.obterHoraMinutosLuanda(relogioReferencia);
    const minutosDia = hora * 60 + minuto;
    const minutosCorteAlerta = 18 * 60 + 35; // 18:35

    const reporteCambio = this.bnaRepo.buscarPorDataETipo(dataHojeLuanda, "cambio");
    const reporteRemessa = this.bnaRepo.buscarPorDataETipo(dataHojeLuanda, "remessa");

    const mapaCambioGerado = !!reporteCambio;
    const mapaRemessaGerado = !!reporteRemessa;

    // Se já passou das 18:35 em Luanda e algum dos mapas não foi gerado, dispara ALERTA
    const passouHorarioCorte = minutosDia >= minutosCorteAlerta;
    const faltaGerar = !mapaCambioGerado || !mapaRemessaGerado;
    const alerta = passouHorarioCorte && faltaGerar;

    const horaStr = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

    let mensagem: string | undefined;
    if (alerta) {
      const faltantes: string[] = [];
      if (!mapaCambioGerado) faltantes.push("Câmbio");
      if (!mapaRemessaGerado) faltantes.push("Remessas");
      mensagem = `ALERTA REGULATÓRIO: São ${horaStr} em Luanda e o reporte diário ao BNA (${faltantes.join(" e ")}) de ${dataHojeLuanda} ainda não foi gerado!`;
    }

    const res: {
      alerta: boolean;
      horaLuanda: string;
      dataHojeLuanda: string;
      mapaCambioGerado: boolean;
      mapaRemessaGerado: boolean;
      mensagem?: string;
    } = {
      alerta,
      horaLuanda: horaStr,
      dataHojeLuanda,
      mapaCambioGerado,
      mapaRemessaGerado,
    };
    if (mensagem !== undefined) {
      res.mensagem = mensagem;
    }
    return res;
  }

  public listarReportes(limite = 50, offset = 0, tipoMapa?: TipoMapaBna) {
    return this.bnaRepo.listarReportes(limite, offset, tipoMapa);
  }

  public buscarPorId(id: string): BnaReporteDiario {
    const rep = this.bnaRepo.buscarPorId(id);
    if (!rep) {
      throw new ErroNaoEncontrado(`Reporte BNA não encontrado com o ID: ${id}`);
    }
    return rep;
  }

  public registarSubmissao(
    id: string,
    plataforma: "suptech" | "ssif" | "ambas",
    operador: ContextoUsuario
  ): BnaReporteDiario {
    const rep = this.buscarPorId(id);
    const agora = new Date().toISOString();

    this.bnaRepo.atualizarSubmissao(id, plataforma, agora, operador.id);

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "BNA_REPORTE_SUBMETIDO",
      recurso: "bna_reportes_diarios",
      recursoId: id,
      detalhes: {
        plataforma,
        dataReferencia: rep.dataReferencia,
        tipoMapa: rep.tipoMapa,
      },
      ip: operador.ip,
    });

    return this.buscarPorId(id);
  }

  private extrairValorColuna(col: BnaColunaConfig, registro: any): string {
    const campo = col.campoOrigem;
    const valor = registro[campo];
    if (valor === undefined || valor === null) return "";
    return String(valor);
  }

  private formatarCampoCsv(valor: string): string {
    if (valor.includes(";") || valor.includes('"') || valor.includes("\n")) {
      return `"${valor.replace(/"/g, '""')}"`;
    }
    return valor;
  }
}
