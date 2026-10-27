import type { DatabaseSync } from "node:sqlite";
import type {
  CartoesConfig,
  CartoesParametrosComerciais,
  CartaoClienteAdesao,
  CartaoVirtual,
  CartaoTransacao,
  ResumoDashboardCartoes,
  EstadoCartao,
  EstadoTransacaoCartao,
  EstadoAdesaoCliente,
  EstadoAtivacaoServico,
  AmbienteStroWallet,
} from "./cartoes.types.js";

export class CartoesRepository {
  constructor(private db: DatabaseSync) {}

  // ==========================================
  // CONFIGURAÇÃO GLOBAL
  // ==========================================
  public obterConfig(): CartoesConfig {
    const row = this.db
      .prepare(`SELECT * FROM cartoes_config WHERE id = 'config_padrao' LIMIT 1`)
      .get() as any;

    if (!row) {
      throw new Error("Configuração de cartões não encontrada.");
    }

    return {
      id: row.id,
      servico_ativo: Number(row.servico_ativo),
      visivel_portal: Number(row.visivel_portal),
      modo_manutencao: Number(row.modo_manutencao),
      mensagem_manutencao: row.mensagem_manutencao,
      estado_ativacao: row.estado_ativacao as EstadoAtivacaoServico,
      fornecedor: row.fornecedor,
      ambiente: row.ambiente as AmbienteStroWallet,
      public_key: row.public_key,
      secret_key: row.secret_key,
      webhook_secret: row.webhook_secret,
      base_url: row.base_url,
      saldo_alerta_minimo_usd: Number(row.saldo_alerta_minimo_usd || 100),
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      atualizado_por: row.atualizado_por,
    };
  }

  public atualizarConfig(
    dados: Partial<Omit<CartoesConfig, "id" | "criado_em">>,
    autorId?: string
  ): CartoesConfig {
    const atual = this.obterConfig();
    const agora = new Date().toISOString();

    const novo = {
      ...atual,
      ...dados,
      atualizado_em: agora,
      atualizado_por: autorId || atual.atualizado_por,
    };

    this.db
      .prepare(
        `UPDATE cartoes_config SET
          servico_ativo = ?,
          visivel_portal = ?,
          modo_manutencao = ?,
          mensagem_manutencao = ?,
          estado_ativacao = ?,
          fornecedor = ?,
          ambiente = ?,
          public_key = ?,
          secret_key = ?,
          webhook_secret = ?,
          base_url = ?,
          saldo_alerta_minimo_usd = ?,
          atualizado_em = ?,
          atualizado_por = ?
        WHERE id = 'config_padrao'`
      )
      .run(
        novo.servico_ativo,
        novo.visivel_portal,
        novo.modo_manutencao,
        novo.mensagem_manutencao,
        novo.estado_ativacao,
        novo.fornecedor,
        novo.ambiente,
        novo.public_key,
        novo.secret_key,
        novo.webhook_secret,
        novo.base_url,
        novo.saldo_alerta_minimo_usd,
        novo.atualizado_em,
        novo.atualizado_por
      );

    return this.obterConfig();
  }

  // ==========================================
  // PARÂMETROS COMERCIAIS
  // ==========================================
  public obterParametrosComerciais(): CartoesParametrosComerciais {
    const row = this.db
      .prepare(`SELECT * FROM cartoes_parametros_comerciais WHERE id = 'comercial_padrao' LIMIT 1`)
      .get() as any;

    if (!row) {
      throw new Error("Parâmetros comerciais de cartões não encontrados.");
    }

    return {
      id: row.id,
      taxa_emissao_usd: Number(row.taxa_emissao_usd),
      custo_emissao_fornecedor_usd: Number(row.custo_emissao_fornecedor_usd),
      comissao_carregamento_pct: Number(row.comissao_carregamento_pct),
      comissao_carregamento_fixa_usd: Number(row.comissao_carregamento_fixa_usd),
      custo_carregamento_fornecedor_pct: Number(row.custo_carregamento_fornecedor_pct),
      margem_cambial_pct: Number(row.margem_cambial_pct),
      taxa_manutencao_mensal_usd: Number(row.taxa_manutencao_mensal_usd),
      limite_min_carregamento_usd: Number(row.limite_min_carregamento_usd),
      limite_max_carregamento_usd: Number(row.limite_max_carregamento_usd),
      limite_diario_usd: Number(row.limite_diario_usd),
      limite_mensal_usd: Number(row.limite_mensal_usd),
      saldo_maximo_cartao_usd: Number(row.saldo_maximo_cartao_usd),
      atualizado_em: row.atualizado_em,
      atualizado_por: row.atualizado_por,
    };
  }

  public atualizarParametrosComerciais(
    dados: Partial<Omit<CartoesParametrosComerciais, "id">>,
    autorId?: string
  ): CartoesParametrosComerciais {
    const atual = this.obterParametrosComerciais();
    const agora = new Date().toISOString();

    const novo = {
      ...atual,
      ...dados,
      atualizado_em: agora,
      atualizado_por: autorId || atual.atualizado_por,
    };

    this.db
      .prepare(
        `UPDATE cartoes_parametros_comerciais SET
          taxa_emissao_usd = ?,
          custo_emissao_fornecedor_usd = ?,
          comissao_carregamento_pct = ?,
          comissao_carregamento_fixa_usd = ?,
          custo_carregamento_fornecedor_pct = ?,
          margem_cambial_pct = ?,
          taxa_manutencao_mensal_usd = ?,
          limite_min_carregamento_usd = ?,
          limite_max_carregamento_usd = ?,
          limite_diario_usd = ?,
          limite_mensal_usd = ?,
          saldo_maximo_cartao_usd = ?,
          atualizado_em = ?,
          atualizado_por = ?
        WHERE id = 'comercial_padrao'`
      )
      .run(
        novo.taxa_emissao_usd,
        novo.custo_emissao_fornecedor_usd,
        novo.comissao_carregamento_pct,
        novo.comissao_carregamento_fixa_usd,
        novo.custo_carregamento_fornecedor_pct,
        novo.margem_cambial_pct,
        novo.taxa_manutencao_mensal_usd,
        novo.limite_min_carregamento_usd,
        novo.limite_max_carregamento_usd,
        novo.limite_diario_usd,
        novo.limite_mensal_usd,
        novo.saldo_maximo_cartao_usd,
        novo.atualizado_em,
        novo.atualizado_por
      );

    return this.obterParametrosComerciais();
  }

  // ==========================================
  // ADESÃO DE CLIENTES
  // ==========================================
  public obterAdesaoPorClienteId(clienteId: string): CartaoClienteAdesao | null {
    const row = this.db
      .prepare(
        `SELECT a.*, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone, c.estado_kyc as kyc_estado
         FROM cartoes_clientes_adesao a
         JOIN clientes c ON c.id = a.cliente_id
         WHERE a.cliente_id = ?
         LIMIT 1`
      )
      .get(clienteId) as any;

    if (!row) return null;

    return {
      id: row.id,
      cliente_id: row.cliente_id,
      estado_adesao: row.estado_adesao as EstadoAdesaoCliente,
      termos_aceites_em: row.termos_aceites_em,
      strowallet_customer_id: row.strowallet_customer_id,
      motivo_rejeicao: row.motivo_rejeicao,
      aprovado_por: row.aprovado_por,
      aprovado_em: row.aprovado_em,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      cliente_nome: row.cliente_nome,
      cliente_email: row.cliente_email,
      cliente_telefone: row.cliente_telefone,
      kyc_estado: row.kyc_estado,
    };
  }

  public criarAdesao(
    id: string,
    clienteId: string,
    termosAceites = true
  ): CartaoClienteAdesao {
    const agora = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO cartoes_clientes_adesao (
          id, cliente_id, estado_adesao, termos_aceites_em, criado_em, atualizado_em
        ) VALUES (?, ?, 'pendente', ?, ?, ?)`
      )
      .run(id, clienteId, termosAceites ? agora : null, agora, agora);

    return this.obterAdesaoPorClienteId(clienteId)!;
  }

  public atualizarEstadoAdesao(
    clienteId: string,
    estado: EstadoAdesaoCliente,
    opcoes?: {
      motivoRejeicao?: string;
      strowalletCustomerId?: string;
      aprovadoPor?: string;
    }
  ): void {
    const agora = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE cartoes_clientes_adesao SET
          estado_adesao = ?,
          motivo_rejeicao = ?,
          strowallet_customer_id = COALESCE(?, strowallet_customer_id),
          aprovado_por = ?,
          aprovado_em = ?,
          atualizado_em = ?
        WHERE cliente_id = ?`
      )
      .run(
        estado,
        opcoes?.motivoRejeicao || null,
        opcoes?.strowalletCustomerId || null,
        opcoes?.aprovadoPor || null,
        estado === "aprovado" ? agora : null,
        agora,
        clienteId
      );
  }

  public listarAdesoesPendentes(): CartaoClienteAdesao[] {
    const rows = this.db
      .prepare(
        `SELECT a.*, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone, c.estado_kyc as kyc_estado
         FROM cartoes_clientes_adesao a
         JOIN clientes c ON c.id = a.cliente_id
         ORDER BY a.criado_em DESC`
      )
      .all() as any[];

    return rows.map((row) => ({
      id: row.id,
      cliente_id: row.cliente_id,
      estado_adesao: row.estado_adesao as EstadoAdesaoCliente,
      termos_aceites_em: row.termos_aceites_em,
      strowallet_customer_id: row.strowallet_customer_id,
      motivo_rejeicao: row.motivo_rejeicao,
      aprovado_por: row.aprovado_por,
      aprovado_em: row.aprovado_em,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      cliente_nome: row.cliente_nome,
      cliente_email: row.cliente_email,
      cliente_telefone: row.cliente_telefone,
      kyc_estado: row.kyc_estado,
    }));
  }

  // ==========================================
  // CARTÕES VIRTUAIS
  // ==========================================
  public criarCartao(cartao: {
    id: string;
    cliente_id: string;
    strowallet_card_id: string;
    titular_nome: string;
    ultimos_4_digitos: string;
    marca?: string;
    moeda?: string;
    mes_expiracao: string;
    ano_expiracao: string;
    estado?: EstadoCartao;
    saldo_usd?: number;
    rotulo?: string;
    billing_address_json?: string;
  }): CartaoVirtual {
    const agora = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO cartoes_virtuais (
          id, cliente_id, strowallet_card_id, titular_nome, ultimos_4_digitos,
          marca, moeda, mes_expiracao, ano_expiracao, estado, saldo_usd,
          rotulo, billing_address_json, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        cartao.id,
        cartao.cliente_id,
        cartao.strowallet_card_id,
        cartao.titular_nome,
        cartao.ultimos_4_digitos,
        cartao.marca || "visa",
        cartao.moeda || "USD",
        cartao.mes_expiracao,
        cartao.ano_expiracao,
        cartao.estado || "ativo",
        cartao.saldo_usd || 0.0,
        cartao.rotulo || null,
        cartao.billing_address_json || null,
        agora,
        agora
      );

    return this.obterCartaoPorId(cartao.id)!;
  }

  public obterCartaoPorId(id: string): CartaoVirtual | null {
    const row = this.db
      .prepare(
        `SELECT cv.*, c.nome as cliente_nome, c.email as cliente_email
         FROM cartoes_virtuais cv
         JOIN clientes c ON c.id = cv.cliente_id
         WHERE cv.id = ?
         LIMIT 1`
      )
      .get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      cliente_id: row.cliente_id,
      strowallet_card_id: row.strowallet_card_id,
      titular_nome: row.titular_nome,
      ultimos_4_digitos: row.ultimos_4_digitos,
      marca: row.marca,
      moeda: row.moeda,
      mes_expiracao: row.mes_expiracao,
      ano_expiracao: row.ano_expiracao,
      estado: row.estado as EstadoCartao,
      saldo_usd: Number(row.saldo_usd),
      rotulo: row.rotulo,
      billing_address_json: row.billing_address_json,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      cliente_nome: row.cliente_nome,
      cliente_email: row.cliente_email,
    };
  }

  public obterCartaoPorStroWalletId(strowalletCardId: string): CartaoVirtual | null {
    const row = this.db
      .prepare(
        `SELECT cv.*, c.nome as cliente_nome, c.email as cliente_email
         FROM cartoes_virtuais cv
         JOIN clientes c ON c.id = cv.cliente_id
         WHERE cv.strowallet_card_id = ?
         LIMIT 1`
      )
      .get(strowalletCardId) as any;

    if (!row) return null;

    return {
      id: row.id,
      cliente_id: row.cliente_id,
      strowallet_card_id: row.strowallet_card_id,
      titular_nome: row.titular_nome,
      ultimos_4_digitos: row.ultimos_4_digitos,
      marca: row.marca,
      moeda: row.moeda,
      mes_expiracao: row.mes_expiracao,
      ano_expiracao: row.ano_expiracao,
      estado: row.estado as EstadoCartao,
      saldo_usd: Number(row.saldo_usd),
      rotulo: row.rotulo,
      billing_address_json: row.billing_address_json,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      cliente_nome: row.cliente_nome,
      cliente_email: row.cliente_email,
    };
  }

  public listarCartoesPorCliente(clienteId: string): CartaoVirtual[] {
    const rows = this.db
      .prepare(
        `SELECT cv.*, c.nome as cliente_nome, c.email as cliente_email
         FROM cartoes_virtuais cv
         JOIN clientes c ON c.id = cv.cliente_id
         WHERE cv.cliente_id = ?
         ORDER BY cv.criado_em DESC`
      )
      .all(clienteId) as any[];

    return rows.map((row) => ({
      id: row.id,
      cliente_id: row.cliente_id,
      strowallet_card_id: row.strowallet_card_id,
      titular_nome: row.titular_nome,
      ultimos_4_digitos: row.ultimos_4_digitos,
      marca: row.marca,
      moeda: row.moeda,
      mes_expiracao: row.mes_expiracao,
      ano_expiracao: row.ano_expiracao,
      estado: row.estado as EstadoCartao,
      saldo_usd: Number(row.saldo_usd),
      rotulo: row.rotulo,
      billing_address_json: row.billing_address_json,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      cliente_nome: row.cliente_nome,
      cliente_email: row.cliente_email,
    }));
  }

  public listarTodosCartoes(filtros?: {
    estado?: EstadoCartao;
    busca?: string;
    limite?: number;
    offset?: number;
  }): CartaoVirtual[] {
    let sql = `
      SELECT cv.*, c.nome as cliente_nome, c.email as cliente_email
      FROM cartoes_virtuais cv
      JOIN clientes c ON c.id = cv.cliente_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros?.estado) {
      sql += ` AND cv.estado = ?`;
      params.push(filtros.estado);
    }

    if (filtros?.busca) {
      sql += ` AND (cv.titular_nome LIKE ? OR cv.ultimos_4_digitos LIKE ? OR c.nome LIKE ? OR c.email LIKE ?)`;
      const termo = `%${filtros.busca}%`;
      params.push(termo, termo, termo, termo);
    }

    sql += ` ORDER BY cv.criado_em DESC`;

    if (filtros?.limite) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(filtros.limite, filtros.offset || 0);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      cliente_id: row.cliente_id,
      strowallet_card_id: row.strowallet_card_id,
      titular_nome: row.titular_nome,
      ultimos_4_digitos: row.ultimos_4_digitos,
      marca: row.marca,
      moeda: row.moeda,
      mes_expiracao: row.mes_expiracao,
      ano_expiracao: row.ano_expiracao,
      estado: row.estado as EstadoCartao,
      saldo_usd: Number(row.saldo_usd),
      rotulo: row.rotulo,
      billing_address_json: row.billing_address_json,
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
      cliente_nome: row.cliente_nome,
      cliente_email: row.cliente_email,
    }));
  }

  public atualizarEstadoCartao(id: string, novoEstado: EstadoCartao): void {
    const agora = new Date().toISOString();
    this.db
      .prepare(`UPDATE cartoes_virtuais SET estado = ?, atualizado_em = ? WHERE id = ?`)
      .run(novoEstado, agora, id);
  }

  public atualizarSaldoCartao(id: string, novoSaldoUsd: number): void {
    const agora = new Date().toISOString();
    this.db
      .prepare(`UPDATE cartoes_virtuais SET saldo_usd = ?, atualizado_em = ? WHERE id = ?`)
      .run(novoSaldoUsd, agora, id);
  }

  // ==========================================
  // TRANSAÇÕES DE CARTÕES
  // ==========================================
  public criarTransacao(t: {
    id: string;
    cartao_id: string;
    cliente_id: string;
    tipo: CartaoTransacao["tipo"];
    montante_usd: number;
    taxa_cambio_aplicada?: number | null;
    contravalor_aoa?: number | null;
    comissao_aoa?: number | null;
    margem_cambial_aoa?: number | null;
    custo_fornecedor_usd?: number | null;
    receita_liquida_aoa?: number | null;
    saldo_apos_usd?: number | null;
    descricao?: string | null;
    referencia_transacao: string;
    estado?: EstadoTransacaoCartao;
    strowallet_ref?: string | null;
    detalhes_json?: string | null;
  }): CartaoTransacao {
    const agora = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO cartoes_transacoes (
          id, cartao_id, cliente_id, tipo, montante_usd, taxa_cambio_aplicada,
          contravalor_aoa, comissao_aoa, margem_cambial_aoa, custo_fornecedor_usd,
          receita_liquida_aoa, saldo_apos_usd, descricao, referencia_transacao,
          estado, strowallet_ref, detalhes_json, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        t.id,
        t.cartao_id,
        t.cliente_id,
        t.tipo,
        t.montante_usd,
        t.taxa_cambio_aplicada ?? null,
        t.contravalor_aoa ?? null,
        t.comissao_aoa ?? null,
        t.margem_cambial_aoa ?? null,
        t.custo_fornecedor_usd ?? null,
        t.receita_liquida_aoa ?? null,
        t.saldo_apos_usd ?? null,
        t.descricao ?? null,
        t.referencia_transacao,
        t.estado || "pendente",
        t.strowallet_ref ?? null,
        t.detalhes_json ?? null,
        agora
      );

    return this.obterTransacaoPorId(t.id)!;
  }

  public obterTransacaoPorId(id: string): CartaoTransacao | null {
    const row = this.db
      .prepare(`SELECT * FROM cartoes_transacoes WHERE id = ? LIMIT 1`)
      .get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      cartao_id: row.cartao_id,
      cliente_id: row.cliente_id,
      tipo: row.tipo,
      montante_usd: Number(row.montante_usd),
      taxa_cambio_aplicada: row.taxa_cambio_aplicada !== null ? Number(row.taxa_cambio_aplicada) : null,
      contravalor_aoa: row.contravalor_aoa !== null ? Number(row.contravalor_aoa) : null,
      comissao_aoa: row.comissao_aoa !== null ? Number(row.comissao_aoa) : null,
      margem_cambial_aoa: row.margem_cambial_aoa !== null ? Number(row.margem_cambial_aoa) : null,
      custo_fornecedor_usd: row.custo_fornecedor_usd !== null ? Number(row.custo_fornecedor_usd) : null,
      receita_liquida_aoa: row.receita_liquida_aoa !== null ? Number(row.receita_liquida_aoa) : null,
      saldo_apos_usd: row.saldo_apos_usd !== null ? Number(row.saldo_apos_usd) : null,
      descricao: row.descricao,
      referencia_transacao: row.referencia_transacao,
      estado: row.estado as EstadoTransacaoCartao,
      strowallet_ref: row.strowallet_ref,
      detalhes_json: row.detalhes_json,
      criado_em: row.criado_em,
    };
  }

  public obterTransacaoPorRef(ref: string): CartaoTransacao | null {
    const row = this.db
      .prepare(`SELECT * FROM cartoes_transacoes WHERE referencia_transacao = ? LIMIT 1`)
      .get(ref) as any;

    if (!row) return null;
    return this.obterTransacaoPorId(row.id);
  }

  public atualizarEstadoTransacao(
    id: string,
    estado: EstadoTransacaoCartao,
    strowalletRef?: string,
    saldoApos?: number
  ): void {
    this.db
      .prepare(
        `UPDATE cartoes_transacoes SET
          estado = ?,
          strowallet_ref = COALESCE(?, strowallet_ref),
          saldo_apos_usd = COALESCE(?, saldo_apos_usd)
        WHERE id = ?`
      )
      .run(estado, strowalletRef || null, saldoApos ?? null, id);
  }

  public listarTransacoesPorCartao(cartaoId: string, limite = 50): CartaoTransacao[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM cartoes_transacoes WHERE cartao_id = ? ORDER BY criado_em DESC LIMIT ?`
      )
      .all(cartaoId, limite) as any[];

    return rows.map((row) => ({
      id: row.id,
      cartao_id: row.cartao_id,
      cliente_id: row.cliente_id,
      tipo: row.tipo,
      montante_usd: Number(row.montante_usd),
      taxa_cambio_aplicada: row.taxa_cambio_aplicada !== null ? Number(row.taxa_cambio_aplicada) : null,
      contravalor_aoa: row.contravalor_aoa !== null ? Number(row.contravalor_aoa) : null,
      comissao_aoa: row.comissao_aoa !== null ? Number(row.comissao_aoa) : null,
      margem_cambial_aoa: row.margem_cambial_aoa !== null ? Number(row.margem_cambial_aoa) : null,
      custo_fornecedor_usd: row.custo_fornecedor_usd !== null ? Number(row.custo_fornecedor_usd) : null,
      receita_liquida_aoa: row.receita_liquida_aoa !== null ? Number(row.receita_liquida_aoa) : null,
      saldo_apos_usd: row.saldo_apos_usd !== null ? Number(row.saldo_apos_usd) : null,
      descricao: row.descricao,
      referencia_transacao: row.referencia_transacao,
      estado: row.estado as EstadoTransacaoCartao,
      strowallet_ref: row.strowallet_ref,
      detalhes_json: row.detalhes_json,
      criado_em: row.criado_em,
    }));
  }

  public listarTodasTransacoes(filtros?: {
    tipo?: CartaoTransacao["tipo"];
    estado?: EstadoTransacaoCartao;
    limite?: number;
    offset?: number;
  }): CartaoTransacao[] {
    let sql = `SELECT * FROM cartoes_transacoes WHERE 1=1`;
    const params: any[] = [];

    if (filtros?.tipo) {
      sql += ` AND tipo = ?`;
      params.push(filtros.tipo);
    }

    if (filtros?.estado) {
      sql += ` AND estado = ?`;
      params.push(filtros.estado);
    }

    sql += ` ORDER BY criado_em DESC`;

    if (filtros?.limite) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(filtros.limite, filtros.offset || 0);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      cartao_id: row.cartao_id,
      cliente_id: row.cliente_id,
      tipo: row.tipo,
      montante_usd: Number(row.montante_usd),
      taxa_cambio_aplicada: row.taxa_cambio_aplicada !== null ? Number(row.taxa_cambio_aplicada) : null,
      contravalor_aoa: row.contravalor_aoa !== null ? Number(row.contravalor_aoa) : null,
      comissao_aoa: row.comissao_aoa !== null ? Number(row.comissao_aoa) : null,
      margem_cambial_aoa: row.margem_cambial_aoa !== null ? Number(row.margem_cambial_aoa) : null,
      custo_fornecedor_usd: row.custo_fornecedor_usd !== null ? Number(row.custo_fornecedor_usd) : null,
      receita_liquida_aoa: row.receita_liquida_aoa !== null ? Number(row.receita_liquida_aoa) : null,
      saldo_apos_usd: row.saldo_apos_usd !== null ? Number(row.saldo_apos_usd) : null,
      descricao: row.descricao,
      referencia_transacao: row.referencia_transacao,
      estado: row.estado as EstadoTransacaoCartao,
      strowallet_ref: row.strowallet_ref,
      detalhes_json: row.detalhes_json,
      criado_em: row.criado_em,
    }));
  }

  // ==========================================
  // RESUMO DASHBOARD & MÉTRICAS
  // ==========================================
  public obterResumoMetricas(): ResumoDashboardCartoes {
    const config = this.obterConfig();

    const statsCartoes = this.db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'ativo' THEN 1 ELSE 0 END) as ativos,
          SUM(CASE WHEN estado = 'congelado' THEN 1 ELSE 0 END) as congelados,
          SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados
        FROM cartoes_virtuais`
      )
      .get() as any;

    const statsFinanceiras = this.db
      .prepare(
        `SELECT
          SUM(CASE WHEN tipo IN ('emissao', 'carregamento') AND estado = 'confirmada' THEN montante_usd ELSE 0 END) as volume_usd,
          SUM(CASE WHEN tipo IN ('emissao', 'carregamento') AND estado = 'confirmada' THEN COALESCE(contravalor_aoa, 0) ELSE 0 END) as volume_aoa,
          SUM(CASE WHEN tipo = 'emissao' AND estado = 'confirmada' THEN COALESCE(comissao_aoa, 0) ELSE 0 END) as receita_taxas_emissao,
          SUM(CASE WHEN tipo = 'carregamento' AND estado = 'confirmada' THEN COALESCE(comissao_aoa, 0) ELSE 0 END) as receita_comissoes_carregamento,
          SUM(CASE WHEN estado = 'confirmada' THEN COALESCE(margem_cambial_aoa, 0) ELSE 0 END) as receita_margem_cambial,
          SUM(CASE WHEN estado = 'confirmada' THEN COALESCE(receita_liquida_aoa, 0) ELSE 0 END) as receita_total_liquida,
          SUM(CASE WHEN estado = 'confirmada' THEN COALESCE(custo_fornecedor_usd, 0) ELSE 0 END) as custo_total_fornecedor
        FROM cartoes_transacoes`
      )
      .get() as any;

    return {
      total_cartoes: Number(statsCartoes?.total || 0),
      cartoes_ativos: Number(statsCartoes?.ativos || 0),
      cartoes_congelados: Number(statsCartoes?.congelados || 0),
      cartoes_cancelados: Number(statsCartoes?.cancelados || 0),
      volume_total_usd: Number(statsFinanceiras?.volume_usd || 0),
      volume_total_aoa: Number(statsFinanceiras?.volume_aoa || 0),
      receita_taxas_emissao_aoa: Number(statsFinanceiras?.receita_taxas_emissao || 0),
      receita_comissoes_carregamento_aoa: Number(statsFinanceiras?.receita_comissoes_carregamento || 0),
      receita_margem_cambial_aoa: Number(statsFinanceiras?.receita_margem_cambial || 0),
      receita_total_liquida_aoa: Number(statsFinanceiras?.receita_total_liquida || 0),
      custo_total_fornecedor_usd: Number(statsFinanceiras?.custo_total_fornecedor || 0),
      saldo_mestre_strowallet_usd: null, // Preenchido pelo serviço sob consulta
      estado_ativacao: config.estado_ativacao,
      servico_ativo: config.servico_ativo === 1,
      visivel_portal: config.visivel_portal === 1,
      modo_manutencao: config.modo_manutencao === 1,
      alerta_saldo_baixo: false,
    };
  }

  // ==========================================
  // WEBHOOKS E AUDITORIA
  // ==========================================
  public registrarWebhook(
    id: string,
    eventoTipo: string,
    payload: any,
    ip?: string
  ): void {
    const agora = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO cartoes_webhooks_auditoria (
          id, evento_tipo, payload_json, processado, ip_origem, recebido_em
        ) VALUES (?, ?, ?, 0, ?, ?)`
      )
      .run(id, eventoTipo, JSON.stringify(payload), ip || null, agora);
  }

  public marcarWebhookProcessado(id: string, resultado: string): void {
    this.db
      .prepare(
        `UPDATE cartoes_webhooks_auditoria SET processado = 1, resultado = ? WHERE id = ?`
      )
      .run(resultado, id);
  }

  public webhookJaProcessado(id: string): boolean {
    const row = this.db
      .prepare(`SELECT processado FROM cartoes_webhooks_auditoria WHERE id = ? LIMIT 1`)
      .get(id) as any;
    return row?.processado === 1;
  }
}
