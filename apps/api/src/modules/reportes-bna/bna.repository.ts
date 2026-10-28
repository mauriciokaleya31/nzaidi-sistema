import type { DatabaseSync } from "node:sqlite";
import type {
  BnaReporteDiario,
  BnaColunaConfig,
  TipoMapaBna,
  EstadoSubmissaoBna,
} from "./bna.types.js";

interface ReporteRow {
  id: string;
  data_referencia: string;
  tipo_mapa: string;
  formato: string;
  total_operacoes: number;
  volume_aoa: string;
  volume_divisa_usd: string;
  volume_divisa_eur: string;
  reporte_zero: number;
  estado_suptech: string;
  estado_ssif: string;
  conteudo_arquivo: string;
  nome_arquivo: string;
  hash_sha256: string;
  gerado_em: string;
  gerado_por_id: string;
  gerado_por_nome: string;
  submetido_suptech_em: string | null;
  submetido_suptech_por_id: string | null;
  submetido_ssif_em: string | null;
  submetido_ssif_por_id: string | null;
}

interface ColunaRow {
  id: string;
  tipo_mapa: string;
  ordem: number;
  nome_coluna: string;
  descricao: string;
  campo_origem: string;
  formato_dado: string;
  ativo: number;
}

function mapearReporte(r: ReporteRow): BnaReporteDiario {
  return {
    id: r.id,
    dataReferencia: r.data_referencia,
    tipoMapa: r.tipo_mapa as TipoMapaBna,
    formato: r.formato,
    totalOperacoes: r.total_operacoes,
    volumeAoa: r.volume_aoa,
    volumeDivisaUsd: r.volume_divisa_usd,
    volumeDivisaEur: r.volume_divisa_eur,
    reporteZero: r.reporte_zero === 1,
    estadoSuptech: r.estado_suptech as EstadoSubmissaoBna,
    estadoSsif: r.estado_ssif as EstadoSubmissaoBna,
    conteudoArquivo: r.conteudo_arquivo,
    nomeArquivo: r.nome_arquivo,
    hashSha256: r.hash_sha256,
    geradoEm: r.gerado_em,
    geradoPorId: r.gerado_por_id,
    geradoPorNome: r.gerado_por_nome,
    submetidoSuptechEm: r.submetido_suptech_em,
    submetidoSuptechPorId: r.submetido_suptech_por_id,
    submetidoSsifEm: r.submetido_ssif_em,
    submetidoSsifPorId: r.submetido_ssif_por_id,
  };
}

export class BnaRepository {
  constructor(private db: DatabaseSync) {}

  public salvarReporte(rep: BnaReporteDiario): void {
    const stmt = this.db.prepare(`
      INSERT INTO bna_reportes_diarios (
        id, data_referencia, tipo_mapa, formato, total_operacoes,
        volume_aoa, volume_divisa_usd, volume_divisa_eur, reporte_zero,
        estado_suptech, estado_ssif, conteudo_arquivo, nome_arquivo,
        hash_sha256, gerado_em, gerado_por_id, gerado_por_nome,
        submetido_suptech_em, submetido_suptech_por_id, submetido_ssif_em, submetido_ssif_por_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(data_referencia, tipo_mapa) DO UPDATE SET
        total_operacoes = excluded.total_operacoes,
        volume_aoa = excluded.volume_aoa,
        volume_divisa_usd = excluded.volume_divisa_usd,
        volume_divisa_eur = excluded.volume_divisa_eur,
        reporte_zero = excluded.reporte_zero,
        conteudo_arquivo = excluded.conteudo_arquivo,
        nome_arquivo = excluded.nome_arquivo,
        hash_sha256 = excluded.hash_sha256,
        gerado_em = excluded.gerado_em,
        gerado_por_id = excluded.gerado_por_id,
        gerado_por_nome = excluded.gerado_por_nome
    `);

    stmt.run(
      rep.id,
      rep.dataReferencia,
      rep.tipoMapa,
      rep.formato,
      rep.totalOperacoes,
      rep.volumeAoa,
      rep.volumeDivisaUsd,
      rep.volumeDivisaEur,
      rep.reporteZero ? 1 : 0,
      rep.estadoSuptech,
      rep.estadoSsif,
      rep.conteudoArquivo,
      rep.nomeArquivo,
      rep.hashSha256,
      rep.geradoEm,
      rep.geradoPorId,
      rep.geradoPorNome,
      rep.submetidoSuptechEm ?? null,
      rep.submetidoSuptechPorId ?? null,
      rep.submetidoSsifEm ?? null,
      rep.submetidoSsifPorId ?? null
    );
  }

  public buscarPorId(id: string): BnaReporteDiario | null {
    const stmt = this.db.prepare(`SELECT * FROM bna_reportes_diarios WHERE id = ?`);
    const row = stmt.get(id) as ReporteRow | undefined;
    return row ? mapearReporte(row) : null;
  }

  public buscarPorDataETipo(dataReferencia: string, tipoMapa: TipoMapaBna): BnaReporteDiario | null {
    const stmt = this.db.prepare(
      `SELECT * FROM bna_reportes_diarios WHERE data_referencia = ? AND tipo_mapa = ?`
    );
    const row = stmt.get(dataReferencia, tipoMapa) as ReporteRow | undefined;
    return row ? mapearReporte(row) : null;
  }

  public listarReportes(
    limite = 50,
    offset = 0,
    tipoMapa?: TipoMapaBna
  ): { itens: BnaReporteDiario[]; total: number } {
    let sqlCount = `SELECT COUNT(*) as total FROM bna_reportes_diarios WHERE 1=1`;
    let sqlSelect = `SELECT * FROM bna_reportes_diarios WHERE 1=1`;
    const params: (string | number)[] = [];

    if (tipoMapa) {
      sqlCount += ` AND tipo_mapa = ?`;
      sqlSelect += ` AND tipo_mapa = ?`;
      params.push(tipoMapa);
    }

    const countStmt = this.db.prepare(sqlCount);
    const countRow = countStmt.get(...params) as { total: number } | undefined;
    const total = countRow?.total ?? 0;

    sqlSelect += ` ORDER BY data_referencia DESC, tipo_mapa ASC LIMIT ? OFFSET ?`;
    const selectParams = [...params, limite, offset];
    const selectStmt = this.db.prepare(sqlSelect);
    const rows = selectStmt.all(...selectParams) as unknown as ReporteRow[];

    return {
      itens: rows.map(mapearReporte),
      total,
    };
  }

  public atualizarSubmissao(
    id: string,
    plataforma: "suptech" | "ssif" | "ambas",
    momento: string,
    operadorId: string
  ): void {
    if (plataforma === "suptech" || plataforma === "ambas") {
      const stmt = this.db.prepare(`
        UPDATE bna_reportes_diarios SET
          estado_suptech = 'submetido',
          submetido_suptech_em = ?,
          submetido_suptech_por_id = ?
        WHERE id = ?
      `);
      stmt.run(momento, operadorId, id);
    }

    if (plataforma === "ssif" || plataforma === "ambas") {
      const stmt = this.db.prepare(`
        UPDATE bna_reportes_diarios SET
          estado_ssif = 'submetido',
          submetido_ssif_em = ?,
          submetido_ssif_por_id = ?
        WHERE id = ?
      `);
      stmt.run(momento, operadorId, id);
    }
  }

  public obterColunasConfig(tipoMapa: TipoMapaBna): BnaColunaConfig[] {
    const stmt = this.db.prepare(
      `SELECT * FROM bna_config_colunas WHERE tipo_mapa = ? AND ativo = 1 ORDER BY ordem ASC`
    );
    const rows = stmt.all(tipoMapa) as unknown as ColunaRow[];
    return rows.map((r) => ({
      id: r.id,
      tipoMapa: r.tipo_mapa as TipoMapaBna,
      ordem: r.ordem,
      nomeColuna: r.nome_coluna,
      descricao: r.descricao,
      campoOrigem: r.campo_origem,
      formatoDado: r.formato_dado,
      ativo: r.ativo === 1,
    }));
  }

  public buscarOperacoesCambioPorData(dataReferencia: string): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        o.id,
        o.numero_operacao,
        o.tipo,
        o.tipo_operacao_bna,
        o.sentido_bna,
        o.moeda_divisa,
        o.montante_divisa,
        o.taxa_aplicada,
        o.taxa_referencia_bna,
        o.montante_aoa,
        o.criado_em,
        o.operador_nome,
        c.nome as cliente_nome,
        c.nif as cliente_nif,
        c.tipo_documento,
        c.numero_documento,
        b.numero_bordero
      FROM operacoes_cambio o
      JOIN clientes c ON o.cliente_id = c.id
      LEFT JOIN borderos b ON o.id = b.operacao_id
      WHERE o.criado_em LIKE ? AND o.estado = 'confirmada'
      ORDER BY o.criado_em ASC
    `);
    return stmt.all(`${dataReferencia}%`) as any[];
  }

  public buscarRemessasPorData(dataReferencia: string): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        r.id,
        r.numero_remessa,
        r.remetente_nif,
        r.remetente_nome,
        r.beneficiario_nome,
        r.beneficiario_pais,
        r.beneficiario_banco,
        r.beneficiario_conta_iban,
        r.parceiro,
        r.moeda,
        r.valor_moeda,
        r.taxa_cambio,
        r.valor_aoa,
        r.comissao_aoa,
        r.total_cobrado_aoa,
        r.estado,
        r.criado_em,
        r.operador_nome
      FROM remessas r
      WHERE r.criado_em LIKE ? AND r.estado NOT IN ('cancelada')
      ORDER BY r.criado_em ASC
    `);
    return stmt.all(`${dataReferencia}%`) as any[];
  }

  public listarDatasComMovimentoSemReporte(tipoMapa: TipoMapaBna): string[] {
    // Busca datas de operações que ainda não têm reporte gerado
    const tabela = tipoMapa === "cambio" ? "operacoes_cambio" : "remessas";
    const stmt = this.db.prepare(`
      SELECT DISTINCT substr(criado_em, 1, 10) as data_mov
      FROM ${tabela}
      WHERE substr(criado_em, 1, 10) NOT IN (
        SELECT data_referencia FROM bna_reportes_diarios WHERE tipo_mapa = ?
      )
      ORDER BY data_mov ASC
    `);
    const rows = stmt.all(tipoMapa) as { data_mov: string }[];
    return rows.map((r) => r.data_mov);
  }
  public buscarNovasOperacoesApos(
    dataReferencia: string,
    tipoMapa: TipoMapaBna,
    aposMomentoIso: string
  ): any[] {
    if (tipoMapa === "cambio") {
      const stmt = this.db.prepare(`
        SELECT id, criado_em FROM operacoes_cambio
        WHERE criado_em LIKE ? AND datetime(criado_em) > datetime(?) AND estado = 'confirmada'
      `);
      return stmt.all(`${dataReferencia}%`, aposMomentoIso) as any[];
    } else {
      const stmt = this.db.prepare(`
        SELECT id, criado_em FROM remessas
        WHERE criado_em LIKE ? AND datetime(criado_em) > datetime(?) AND estado NOT IN ('cancelada')
      `);
      return stmt.all(`${dataReferencia}%`, aposMomentoIso) as any[];
    }
  }
}
