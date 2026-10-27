import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface Anuncio {
  id: string;
  titulo: string;
  conteudo: string;
  imagemUrl?: string | null | undefined;
  destino: "website" | "portal_cliente" | "portal_parceiro" | "todos";
  publicoAlvo: string;
  estado: "rascunho" | "agendado" | "publicado" | "arquivado" | "desativado";
  inicioEm?: string | null | undefined;
  fimEm?: string | null | undefined;
  criadoPorId: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface DicaInformativa {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: "cambio" | "remessas" | "seguranca" | "educacao_financeira" | "geral";
  estado: "rascunho" | "publicado" | "arquivado";
  ordem: number;
  criadoPorId: string;
  criadoEm: string;
}

export interface CampanhaEmail {
  id: string;
  assunto: string;
  modeloHtml: string;
  segmentoAlvo: "todos" | "kyc_aprovado" | "kyc_pendente" | "empresas" | "parceiros";
  estado: "rascunho" | "agendada" | "enviada" | "cancelada";
  totalDestinatarios: number;
  totalEnviados: number;
  totalErros: number;
  agendadaPara?: string | null | undefined;
  enviadaEm?: string | null | undefined;
  criadoPorId: string;
  criadoEm: string;
}

export interface ServicoComunicacaoConfig {
  id: string;
  tipo: "email" | "sms" | "whatsapp" | "webhook";
  fornecedor: string;
  endpoint?: string | null | undefined;
  credenciaisJson: string;
  parametrosJson?: string | null | undefined;
  ambiente: "teste" | "producao";
  ativo: boolean;
  ultimoTesteEm?: string | null | undefined;
  ultimoTesteStatus?: string | null | undefined;
  ultimoTesteErro?: string | null | undefined;
  atualizadoEm: string;
  atualizadoPorId: string;
}

export class ComunicacaoRepository {
  constructor(private db: DatabaseSync) {}

  // --- ANÚNCIOS ---
  public criarAnuncio(dados: Omit<Anuncio, "id" | "criadoEm" | "atualizadoEm">): Anuncio {
    const id = randomUUID();
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO anuncios_comunicacao (
        id, titulo, conteudo, imagem_url, destino, publico_alvo, estado,
        inicio_em, fim_em, criado_por_id, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dados.titulo,
      dados.conteudo,
      dados.imagemUrl ?? null,
      dados.destino,
      dados.publicoAlvo,
      dados.estado,
      dados.inicioEm ?? null,
      dados.fimEm ?? null,
      dados.criadoPorId,
      agora,
      agora
    );

    return {
      id,
      ...dados,
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  public listarAnuncios(destino?: string | undefined, estado?: string | undefined): Anuncio[] {
    let sql = `
      SELECT 
        id, titulo, conteudo, imagem_url as imagemUrl, destino, publico_alvo as publicoAlvo,
        estado, inicio_em as inicioEm, fim_em as fimEm, criado_por_id as criadoPorId,
        criado_em as criadoEm, atualizado_em as atualizadoEm
      FROM anuncios_comunicacao
      WHERE 1=1
    `;
    const params: any[] = [];

    if (destino && destino !== "todos") {
      sql += " AND (destino = ? OR destino = 'todos')";
      params.push(destino);
    }
    if (estado) {
      sql += " AND estado = ?";
      params.push(estado);
    }

    sql += " ORDER BY criado_em DESC";
    return this.db.prepare(sql).all(...params) as any[];
  }

  public atualizarAnuncio(id: string, dados: Partial<Anuncio>): void {
    const agora = new Date().toISOString();
    const campos: string[] = ["atualizado_em = ?"];
    const valores: any[] = [agora];

    if (dados.titulo !== undefined) {
      campos.push("titulo = ?");
      valores.push(dados.titulo);
    }
    if (dados.conteudo !== undefined) {
      campos.push("conteudo = ?");
      valores.push(dados.conteudo);
    }
    if (dados.imagemUrl !== undefined) {
      campos.push("imagem_url = ?");
      valores.push(dados.imagemUrl);
    }
    if (dados.destino !== undefined) {
      campos.push("destino = ?");
      valores.push(dados.destino);
    }
    if (dados.publicoAlvo !== undefined) {
      campos.push("publico_alvo = ?");
      valores.push(dados.publicoAlvo);
    }
    if (dados.estado !== undefined) {
      campos.push("estado = ?");
      valores.push(dados.estado);
    }
    if (dados.inicioEm !== undefined) {
      campos.push("inicio_em = ?");
      valores.push(dados.inicioEm);
    }
    if (dados.fimEm !== undefined) {
      campos.push("fim_em = ?");
      valores.push(dados.fimEm);
    }

    valores.push(id);
    this.db.prepare(`UPDATE anuncios_comunicacao SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
  }

  public removerAnuncio(id: string): void {
    this.db.prepare("DELETE FROM anuncios_comunicacao WHERE id = ?").run(id);
  }

  // --- DICAS INFORMATIVAS ---
  public criarDica(dados: Omit<DicaInformativa, "id" | "criadoEm">): DicaInformativa {
    const id = randomUUID();
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO dicas_informativas (id, titulo, conteudo, categoria, estado, ordem, criado_por_id, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, dados.titulo, dados.conteudo, dados.categoria, dados.estado, dados.ordem, dados.criadoPorId, agora);

    return {
      id,
      ...dados,
      criadoEm: agora,
    };
  }

  public listarDicas(categoria?: string | undefined): DicaInformativa[] {
    let sql = `
      SELECT id, titulo, conteudo, categoria, estado, ordem, criado_por_id as criadoPorId, criado_em as criadoEm
      FROM dicas_informativas
      WHERE 1=1
    `;
    const params: any[] = [];
    if (categoria) {
      sql += " AND categoria = ?";
      params.push(categoria);
    }
    sql += " ORDER BY ordem ASC, criado_em DESC";
    return this.db.prepare(sql).all(...params) as any[];
  }

  public atualizarDica(id: string, dados: Partial<DicaInformativa>): void {
    const campos: string[] = [];
    const valores: any[] = [];

    if (dados.titulo !== undefined) {
      campos.push("titulo = ?");
      valores.push(dados.titulo);
    }
    if (dados.conteudo !== undefined) {
      campos.push("conteudo = ?");
      valores.push(dados.conteudo);
    }
    if (dados.categoria !== undefined) {
      campos.push("categoria = ?");
      valores.push(dados.categoria);
    }
    if (dados.estado !== undefined) {
      campos.push("estado = ?");
      valores.push(dados.estado);
    }
    if (dados.ordem !== undefined) {
      campos.push("ordem = ?");
      valores.push(dados.ordem);
    }

    if (campos.length > 0) {
      valores.push(id);
      this.db.prepare(`UPDATE dicas_informativas SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
    }
  }

  public removerDica(id: string): void {
    this.db.prepare("DELETE FROM dicas_informativas WHERE id = ?").run(id);
  }

  // --- CAMPANHAS DE EMAIL ---
  public criarCampanha(dados: Omit<CampanhaEmail, "id" | "totalEnviados" | "totalErros" | "criadoEm">): CampanhaEmail {
    const id = randomUUID();
    const agora = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO campanhas_email (
        id, assunto, modelo_html, segmento_alvo, estado, total_destinatarios,
        total_enviados, total_erros, agendada_para, enviada_em, criado_por_id, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dados.assunto,
      dados.modeloHtml,
      dados.segmentoAlvo,
      dados.estado,
      dados.totalDestinatarios,
      dados.agendadaPara ?? null,
      dados.enviadaEm ?? null,
      dados.criadoPorId,
      agora
    );

    return {
      id,
      ...dados,
      totalEnviados: 0,
      totalErros: 0,
      criadoEm: agora,
    };
  }

  public listarCampanhas(): CampanhaEmail[] {
    const sql = `
      SELECT 
        id, assunto, modelo_html as modeloHtml, segmento_alvo as segmentoAlvo,
        estado, total_destinatarios as totalDestinatarios, total_enviados as totalEnviados,
        total_erros as totalErros, agendada_para as agendadaPara, enviada_em as enviadaEm,
        criado_por_id as criadoPorId, criado_em as criadoEm
      FROM campanhas_email
      ORDER BY criado_em DESC
    `;
    return this.db.prepare(sql).all() as any[];
  }

  public atualizarCampanha(id: string, dados: Partial<CampanhaEmail>): void {
    const campos: string[] = [];
    const valores: any[] = [];

    if (dados.assunto !== undefined) {
      campos.push("assunto = ?");
      valores.push(dados.assunto);
    }
    if (dados.modeloHtml !== undefined) {
      campos.push("modelo_html = ?");
      valores.push(dados.modeloHtml);
    }
    if (dados.segmentoAlvo !== undefined) {
      campos.push("segmento_alvo = ?");
      valores.push(dados.segmentoAlvo);
    }
    if (dados.estado !== undefined) {
      campos.push("estado = ?");
      valores.push(dados.estado);
    }
    if (dados.totalDestinatarios !== undefined) {
      campos.push("total_destinatarios = ?");
      valores.push(dados.totalDestinatarios);
    }
    if (dados.totalEnviados !== undefined) {
      campos.push("total_enviados = ?");
      valores.push(dados.totalEnviados);
    }
    if (dados.totalErros !== undefined) {
      campos.push("total_erros = ?");
      valores.push(dados.totalErros);
    }
    if (dados.enviadaEm !== undefined) {
      campos.push("enviada_em = ?");
      valores.push(dados.enviadaEm);
    }

    if (campos.length > 0) {
      valores.push(id);
      this.db.prepare(`UPDATE campanhas_email SET ${campos.join(", ")} WHERE id = ?`).run(...valores);
    }
  }

  // --- CONFIGURAÇÃO DE SERVIÇOS E PROVEDORES ---
  public obterConfigsServicos(): ServicoComunicacaoConfig[] {
    const sql = `
      SELECT 
        id, tipo, fornecedor, endpoint, credenciais_json as credenciaisJson,
        parametros_json as parametrosJson, ambiente, ativo,
        ultimo_teste_em as ultimoTesteEm, ultimo_teste_status as ultimoTesteStatus,
        ultimo_teste_erro as ultimoTesteErro, atualizado_em as atualizadoEm,
        atualizado_por_id as atualizadoPorId
      FROM servicos_comunicacao_config
      ORDER BY tipo ASC
    `;
    const rows = this.db.prepare(sql).all() as any[];
    return rows.map((r) => ({
      ...r,
      ativo: Boolean(r.ativo),
    }));
  }

  public salvarConfigServico(dados: {
    tipo: ServicoComunicacaoConfig["tipo"];
    fornecedor: string;
    endpoint?: string | null | undefined;
    credenciaisJson: string;
    parametrosJson?: string | null | undefined;
    ambiente: "teste" | "producao";
    ativo: boolean;
    atualizadoPorId: string;
  }): void {
    const agora = new Date().toISOString();
    const id = `svc_${dados.tipo}`;

    const stmt = this.db.prepare(`
      INSERT INTO servicos_comunicacao_config (
        id, tipo, fornecedor, endpoint, credenciais_json, parametros_json,
        ambiente, ativo, atualizado_em, atualizado_por_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        fornecedor = excluded.fornecedor,
        endpoint = excluded.endpoint,
        credenciais_json = excluded.credenciais_json,
        parametros_json = excluded.parametros_json,
        ambiente = excluded.ambiente,
        ativo = excluded.ativo,
        atualizado_em = excluded.atualizado_em,
        atualizado_por_id = excluded.atualizado_por_id
    `);

    stmt.run(
      id,
      dados.tipo,
      dados.fornecedor,
      dados.endpoint ?? null,
      dados.credenciaisJson,
      dados.parametrosJson ?? null,
      dados.ambiente,
      dados.ativo ? 1 : 0,
      agora,
      dados.atualizadoPorId
    );
  }

  public registrarResultadoTeste(
    tipo: string,
    status: "sucesso" | "erro",
    erroMsg?: string | null | undefined
  ): void {
    const agora = new Date().toISOString();
    const id = `svc_${tipo}`;
    this.db.prepare(`
      UPDATE servicos_comunicacao_config
      SET ultimo_teste_em = ?, ultimo_teste_status = ?, ultimo_teste_erro = ?
      WHERE id = ?
    `).run(agora, status, erroMsg ?? null, id);
  }
}
