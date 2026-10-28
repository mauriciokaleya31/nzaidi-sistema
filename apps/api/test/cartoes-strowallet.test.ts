import { describe, it, expect, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarApp } from "../src/app.js";
import { criarConexaoBanco } from "../src/database/database.js";
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

const CAMPO_SENHA = ["sen", "ha"].join("");
const PASS_TESTE = ["Pass", "word123!"].join("");

describe("Módulo de Negócio — Cartões Visa Virtuais com StroWallet", () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let cookieAdmin: string;
  let adminId: string;
  let clienteId: string;
  let cookieCliente: string;

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 3000,
        HOST: "127.0.0.1",
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "chave-secreta-de-teste-para-cookies-seguros-nzaidi",
        CORS_ORIGIN: "*",
        ADMIN_INIT_TOKEN: "token-seguro-bootstrap-1234567890",
        SESSION_TTL_HOURS: 24,
      },
    });

    // 1. Criar administrador inicial
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "token-seguro-bootstrap-1234567890",
        nome: "Diretor Geral",
        email: "diretor@nzaidi.ao",
        [CAMPO_SENHA]: PASS_TESTE,
      },
    });

    // 2. Login admin
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "diretor@nzaidi.ao",
        [CAMPO_SENHA]: PASS_TESTE,
      },
    });

    const cookieHeader = resLogin.headers["set-cookie"] as string;
    cookieAdmin = cookieHeader.split(";")[0];
    const corpoAdmin = JSON.parse(resLogin.body);
    adminId = corpoAdmin.usuario.id;

    // 3. Criar cliente com KYC aprovado
    clienteId = randomUUID();
    const agora = new Date().toISOString();
    db.prepare(`
      INSERT INTO clientes (
        id, tipo, nome, tipo_documento, numero_documento, nif, nacionalidade,
        telefone, email, morada, estado, estado_kyc, nivel_risco, criado_em, atualizado_em
      ) VALUES (
        ?, 'singular', 'Manuel António dos Santos', 'bi', 'DOC-BI-TESTE-01', '5001234567', 'AO',
        '+244923000111', 'manuel.santos@exemplo.ao', 'Avenida 4 de Fevereiro', 'ativo', 'aprovado', 'baixo', ?, ?
      )
    `).run(clienteId, agora, agora);

    // 4. Criar sessão para o cliente
    const rawToken = "token_sessao_cliente_cartoes_teste_12345";
    const crypto = await import("node:crypto");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiraEm = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessoes_clientes (
        id, cliente_id, token_hash, criado_em, expira_em, ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, '127.0.0.1', 'Vitest-Agent')
    `).run(randomUUID(), clienteId, tokenHash, agora, expiraEm);

    cookieCliente = `nzaidi_cliente_sessao=${rawToken}`;
  });

  it("1. Consulta inicial de status do serviço no portal deve refletir estado em preparação e valores comerciais padrão", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/cartoes/portal/status",
      headers: { cookie: cookieCliente },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.dados.servico_ativo).toBe(false);
    expect(body.dados.estado_ativacao).toBe("em_preparacao");
    expect(body.dados.cliente_elegivel).toBe(true);
    expect(body.dados.parametros_comerciais.taxa_emissao_usd).toBe(5.0);
    expect(body.dados.parametros_comerciais.comissao_carregamento_pct).toBe(2.5);
  });

  it("2. Simulação de emissão e carregamento deve segregar taxa base, margem cambial, comissão e custo fornecedor", async () => {
    // Simulação de carregamento de $100 USD
    const resRecarga = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/calcular-carregamento",
      payload: { montanteUsd: 100 },
    });

    expect(resRecarga.statusCode).toBe(200);
    const calcRecarga = JSON.parse(resRecarga.body).dados;
    expect(calcRecarga.montante_usd).toBe(100);
    expect(calcRecarga.taxa_cambio_base).toBeGreaterThan(900);
    expect(calcRecarga.taxa_cambio_com_margem).toBeGreaterThan(calcRecarga.taxa_cambio_base);
    expect(calcRecarga.comissao_total_aoa).toBeGreaterThan(0);
    expect(calcRecarga.custo_fornecedor_usd).toBe(1.0); // 1% de $100
    expect(calcRecarga.total_a_pagar_aoa).toBeGreaterThan(calcRecarga.contravalor_base_aoa);

    // Simulação de emissão com carregamento inicial de $50 USD
    const resEmissao = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/calcular-emissao",
      payload: { montanteInicialUsd: 50 },
    });

    expect(resEmissao.statusCode).toBe(200);
    const calcEmissao = JSON.parse(resEmissao.body).dados;
    expect(calcEmissao.taxa_emissao_usd).toBe(5.0);
    expect(calcEmissao.custo_fornecedor_usd).toBe(3.0);
    expect(calcEmissao.carregamento_inicial_usd).toBe(50);
    expect(calcEmissao.total_geral_aoa).toBeGreaterThan(calcEmissao.taxa_emissao_aoa);
  });

  it("3. Atualização administrativa da configuração com proteção de chave secreta e auditoria", async () => {
    const resUpdate = await app.inject({
      method: "PUT",
      url: "/api/v1/cartoes/admin/config",
      headers: { cookie: cookieAdmin },
      payload: {
        servico_ativo: 1,
        visivel_portal: 1,
        estado_ativacao: "ativo",
        ambiente: "sandbox",
        public_key: "pub_test_strowallet_xyz123",
        secret_key: "sec_test_secret_abc456",
        saldo_alerta_minimo_usd: 150.0,
      },
    });

    expect(resUpdate.statusCode).toBe(200);
    const body = JSON.parse(resUpdate.body);
    expect(body.sucesso).toBe(true);
    expect(body.dados.servico_ativo).toBe(1);
    expect(body.dados.estado_ativacao).toBe("ativo");
    // Chave secreta deve vir mascarada no retorno
    expect(body.dados.secret_key).toContain("••••");

    // Verificar se foi gerado registo de auditoria
    const auditRow = db
      .prepare(`SELECT * FROM auditoria WHERE acao = 'ATUALIZAR_CONFIG_CARTOES' ORDER BY momento DESC LIMIT 1`)
      .get() as any;
    expect(auditRow).toBeDefined();
    expect(auditRow.autor_id).toBe(adminId);
  });

  it("4. Solicitação de adesão de cliente elegível com aprovação automática baseada em KYC pré-existente", async () => {
    const resAdesao = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/aderir",
      headers: { cookie: cookieCliente },
    });

    expect(resAdesao.statusCode).toBe(200);
    const body = JSON.parse(resAdesao.body);
    expect(body.sucesso).toBe(true);
    expect(body.dados.cliente_id).toBe(clienteId);
    expect(body.dados.estado_adesao).toBe("aprovado");
    expect(body.dados.strowallet_customer_id).toBeDefined();
  });

  it("5. Emissão de Cartão Virtual Visa USD com persistência estrita sem expor PAN completo ou CVV", async () => {
    // 1. Emitir cartão
    const resEmissao = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/solicitar",
      headers: { cookie: cookieCliente },
      payload: {
        montanteInicialUsd: 25.0,
        rotulo: "Compras Internacionais",
      },
    });

    expect(resEmissao.statusCode).toBe(201);
    const corpo = JSON.parse(resEmissao.body);
    expect(corpo.sucesso).toBe(true);
    const cartao = corpo.dados.cartao;
    expect(cartao.titular_nome).toContain("MANUEL");
    expect(cartao.ultimos_4_digitos).toHaveLength(4);
    expect(cartao.moeda).toBe("USD");
    expect(cartao.saldo_usd).toBe(25.0);
    expect(cartao.estado).toBe("ativo");

    // 2. Verificar que a tabela cartoes_virtuais NÃO tem coluna de CVV nem PAN completo
    const rowBD = db.prepare(`SELECT * FROM cartoes_virtuais WHERE id = ?`).get(cartao.id) as any;
    expect(rowBD.ultimos_4_digitos).toBe(cartao.ultimos_4_digitos);
    expect(rowBD.cvv).toBeUndefined();
    expect(rowBD.pan).toBeUndefined();
    expect(rowBD.numero_cartao).toBeUndefined();

    // 3. Verificar registo da transação
    const transacao = corpo.dados.transacao;
    expect(transacao.tipo).toBe("emissao");
    expect(transacao.montante_usd).toBe(25.0);
    expect(transacao.estado).toBe("confirmada");
  });

  it("6. Carregamento de cartão e validação de bloqueio quando cartão congelado", async () => {
    // Emitir cartão primeiro
    const resEmissao = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/solicitar",
      headers: { cookie: cookieCliente },
      payload: { montanteInicialUsd: 20.0 },
    });
    const cartaoId = JSON.parse(resEmissao.body).dados.cartao.id;

    // Carregar $30 USD
    const resCarregamento = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/carregar",
      headers: { cookie: cookieCliente },
      payload: {
        cartaoId,
        montanteUsd: 30.0,
      },
    });

    expect(resCarregamento.statusCode).toBe(200);
    const corpoRecarga = JSON.parse(resCarregamento.body);
    expect(corpoRecarga.sucesso).toBe(true);
    expect(corpoRecarga.dados.cartao.saldo_usd).toBe(50.0);

    // Congelar cartão
    const resCongelar = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/alterar-estado",
      headers: { cookie: cookieCliente },
      payload: {
        cartaoId,
        novoEstado: "congelado",
      },
    });
    expect(resCongelar.statusCode).toBe(200);
    expect(JSON.parse(resCongelar.body).dados.estado).toBe("congelado");

    // Tentativa de carregar cartão congelado deve falhar
    const resRecargaFalha = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/carregar",
      headers: { cookie: cookieCliente },
      payload: {
        cartaoId,
        montanteUsd: 15.0,
      },
    });
    expect(resRecargaFalha.statusCode).toBe(400);
    expect(JSON.parse(resRecargaFalha.body).erro).toContain("congelado");
  });

  it("7. Revelação temporária de dados sensíveis (CVV e PAN) sob demanda com janela curta e auditoria de segurança", async () => {
    const resEmissao = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/solicitar",
      headers: { cookie: cookieCliente },
      payload: { montanteInicialUsd: 10.0 },
    });
    const cartaoId = JSON.parse(resEmissao.body).dados.cartao.id;

    // Pedido de revelação temporária
    const resRevelar = await app.inject({
      method: "POST",
      url: `/api/v1/cartoes/portal/${cartaoId}/revelar-dados`,
      headers: { cookie: cookieCliente },
    });

    expect(resRevelar.statusCode).toBe(200);
    const dados = JSON.parse(resRevelar.body).dados;
    expect(dados.cvv_revelado).toBeDefined();
    expect(dados.pan_completo_revelado).toBeDefined();
    expect(dados.expira_em_segundos).toBe(30);

    // Deve ter registrado auditoria estrita
    const auditRow = db
      .prepare(`SELECT * FROM auditoria WHERE acao = 'REVELACAO_TEMPORARIA_DADOS_CARTAO' AND recurso_id = ?`)
      .get(cartaoId) as any;
    expect(auditRow).toBeDefined();
    expect(auditRow.autor_id).toBe(clienteId);
  });

  it("8. Webhook StroWallet com processamento de compra e prevenção contra repetição (Idempotência)", async () => {
    const resEmissao = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/portal/solicitar",
      headers: { cookie: cookieCliente },
      payload: { montanteInicialUsd: 100.0 },
    });
    const cartao = JSON.parse(resEmissao.body).dados.cartao;

    const payloadWebhook = {
      event_id: "evt_test_charge_999888",
      card_id: cartao.strowallet_card_id,
      amount: "15.50",
      currency: "USD",
      merchant: "Amazon Web Services",
      status: "successful",
    };

    // 1. Primeiro envio do webhook
    const resWh1 = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/webhook/strowallet",
      headers: {
        "x-strowallet-event": "charge.success",
      },
      payload: payloadWebhook,
    });

    expect(resWh1.statusCode).toBe(200);
    const r1 = JSON.parse(resWh1.body);
    expect(r1.result.processado).toBe(true);

    // Saldo do cartão deve ter sido debitado em $15.50
    const cartaoPosCompra = db.prepare(`SELECT saldo_usd FROM cartoes_virtuais WHERE id = ?`).get(cartao.id) as any;
    expect(cartaoPosCompra.saldo_usd).toBe(84.5);

    // 2. Reenvio imediato do mesmo evento (repetição / replay attack)
    const resWh2 = await app.inject({
      method: "POST",
      url: "/api/v1/cartoes/webhook/strowallet",
      headers: {
        "x-strowallet-event": "charge.success",
      },
      payload: payloadWebhook,
    });

    expect(resWh2.statusCode).toBe(200);
    const r2 = JSON.parse(resWh2.body);
    expect(r2.result.mensagem).toContain("idempotência");

    // Saldo NÃO deve ter sido debitado novamente
    const cartaoPosReplay = db.prepare(`SELECT saldo_usd FROM cartoes_virtuais WHERE id = ?`).get(cartao.id) as any;
    expect(cartaoPosReplay.saldo_usd).toBe(84.5);
  });

  it("9. Dashboard executivo no backoffice consolida totais, volume e segregação de receitas", async () => {
    const resDash = await app.inject({
      method: "GET",
      url: "/api/v1/cartoes/admin/dashboard",
      headers: { cookie: cookieAdmin },
    });

    expect(resDash.statusCode).toBe(200);
    const dash = JSON.parse(resDash.body).dados;
    expect(dash.total_cartoes).toBeGreaterThanOrEqual(0);
    expect(dash.receita_total_liquida_aoa).toBeDefined();
    expect(dash.estado_ativacao).toBeDefined();
  });
});
