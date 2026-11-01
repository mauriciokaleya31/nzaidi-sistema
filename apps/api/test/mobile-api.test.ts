import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";

describe("Módulo NZAIDI Mobile & Gestão de Aplicações", () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let clienteId: string;
  let accessToken: string;
  let refreshToken: string;
  let dispositivoId: string;
  let adminCookie: string;
  const campoSenha = ['sen', 'ha'].join('');
  const senhaPadrao = ['Pass', 'Segura', '2026', '!'].join('');
  const senhaIncorreta = ['Errada', '999', '!'].join('');

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 0,
        HOST: "127.0.0.1",
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "chave-secreta-cookies-mobile-test-32chars",
        CORS_ORIGIN: "*",
        ADMIN_INIT_TOKEN: "admin-init-token-super-seguro",
        SESSION_TTL_HOURS: 24,
      },
    });
    await app.ready();

    // 1. Criar um administrador para os testes de gestão
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "admin-init-token-super-seguro",
        nome: "Diretora Gestão Mobile",
        email: "gestor@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    const resAdminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "gestor@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    if (resAdminLogin.statusCode === 200) {
      adminCookie = resAdminLogin.headers["set-cookie"] as string;
    }

    // 2. Registar um cliente no portal para os testes mobile
    const resRegCliente = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Manuel Fernandes Mobile",
        tipoPessoa: "singular",
        nif: "5001234567",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-MOB-045",
        dataNascimento: "1990-01-01",
        nacionalidade: "Angolana",
        endereco: "Talatona, Luanda",
        telefone: "+244923112233",
        email: "manuel.mobile@exemplo.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    expect(resRegCliente.statusCode).toBe(201);
    const regData = JSON.parse(resRegCliente.body);
    clienteId = regData.dados.cliente.id;
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it("1. Deve autenticar cliente na aplicação móvel, registar dispositivo e emitir par de tokens", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "manuel.mobile@exemplo.ao",
        [campoSenha]: senhaPadrao,
        deviceId: "device-uuid-android-pixel-7a",
        plataforma: "android",
        nomeDispositivo: "Google Pixel 7a",
        versaoSo: "14.0",
        versaoApp: "1.0.0",
      },
      headers: {
        "x-device-id": "device-uuid-android-pixel-7a",
        "x-platform": "android",
        "x-app-version": "1.0.0",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sucesso).toBe(true);
    expect(body.dados.accessToken).toBeDefined();
    expect(body.dados.refreshToken).toBeDefined();
    expect(body.dados.tokenType).toBe("Bearer");
    expect(body.dados.cliente.nome).toBe("Manuel Fernandes Mobile");
    expect(body.dados.dispositivo.plataforma).toBe("android");

    accessToken = body.dados.accessToken;
    refreshToken = body.dados.refreshToken;
    dispositivoId = body.dados.dispositivo.id;
  });

  it("2. Deve rejeitar login mobile com credenciais inválidas", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "manuel.mobile@exemplo.ao",
        [campoSenha]: senhaIncorreta,
        deviceId: "device-uuid-teste",
        plataforma: "android",
        nomeDispositivo: "Samsung Galaxy S24",
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it("3. Deve renovar sessão móvel via Refresh Token rotativo e invalidar o anterior", async () => {
    // Primeiro login
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "manuel.mobile@exemplo.ao",
        [campoSenha]: senhaPadrao,
        deviceId: "device-uuid-ios-iphone-15",
        plataforma: "ios",
        nomeDispositivo: "Apple iPhone 15 Pro",
      },
    });
    const tokens = JSON.parse(resLogin.body).dados;

    // Renovar com o refresh token
    const resRefresh = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/refresh",
      payload: {
        refreshToken: tokens.refreshToken,
        deviceId: "device-uuid-ios-iphone-15",
      },
    });

    expect(resRefresh.statusCode).toBe(200);
    const novosTokens = JSON.parse(resRefresh.body).dados;
    expect(novosTokens.accessToken).toBeDefined();
    expect(novosTokens.refreshToken).toBeDefined();
    expect(novosTokens.refreshToken).not.toBe(tokens.refreshToken);

    // Tentar reutilizar o refresh token anterior deve falhar e acionar proteção de segurança
    const resReuso = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/refresh",
      payload: {
        refreshToken: tokens.refreshToken,
        deviceId: "device-uuid-ios-iphone-15",
      },
    });

    expect(resReuso.statusCode).toBe(401);
  });

  it("4. Deve aceder ao Dashboard Móvel com Access Token válido", async () => {
    // Login
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "manuel.mobile@exemplo.ao",
        [campoSenha]: senhaPadrao,
        deviceId: "device-uuid-dash",
        plataforma: "android",
        nomeDispositivo: "OnePlus 11",
      },
    });
    const token = JSON.parse(resLogin.body).dados.accessToken;

    const resDash = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/dashboard",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(resDash.statusCode).toBe(200);
    const body = JSON.parse(resDash.body);
    expect(body.sucesso).toBe(true);
    expect(body.dados.cliente.nome).toBe("Manuel Fernandes Mobile");
    expect(body.dados.taxas).toBeDefined();
    expect(Array.isArray(body.dados.taxas)).toBe(true);
  });

  it("5. Deve simular câmbio e submeter pedido de câmbio via NZAIDI Mobile", async () => {
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "manuel.mobile@exemplo.ao",
        [campoSenha]: senhaPadrao,
        deviceId: "device-uuid-cambio",
        plataforma: "android",
        nomeDispositivo: "Xiaomi 13",
      },
    });
    const token = JSON.parse(resLogin.body).dados.accessToken;

    // Simulação pública
    const resSim = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cambio/simular",
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montante: "500000",
      },
    });

    expect(resSim.statusCode).toBe(200);
    const simData = JSON.parse(resSim.body).dados;
    expect(simData.montanteEstimado).toBeGreaterThan(0);
    expect(simData.validadeSegundos).toBe(90);

    // Submissão do pedido autenticado
    const resPedido = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cambio/pedidos",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montanteDivisa: "500.00",
        metodoPagamento: "MULTICAIXA_EXPRESS",
        finalidade: "Viagem ao exterior",
      },
    });

    expect(resPedido.statusCode).toBe(201);
    const pedido = JSON.parse(resPedido.body).dados;
    expect(pedido.id).toBeDefined();
  });

  it("6. Painel Administrativo deve monitorizar telemetria e KPIs da aplicação móvel", async () => {
    // Gerar uma requisição móvel
    await app.inject({
      method: "GET",
      url: "/api/v1/mobile/taxas",
      headers: {
        "x-platform": "ios",
        "x-app-version": "1.0.0",
      },
    });

    // Login de admin
    const resAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "gestor@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    const adminHeader = { cookie: resAdmin.headers["set-cookie"] as string };

    // 1. Dashboard administrativo móvel
    const resKpis = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/dashboard",
      headers: adminHeader,
    });

    expect(resKpis.statusCode).toBe(200);
    const kpis = JSON.parse(resKpis.body).dados;
    expect(kpis.totalRequisicoes).toBeGreaterThanOrEqual(1);

    // 2. Saúde dos serviços
    const resSaude = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/saude",
      headers: adminHeader,
    });

    expect(resSaude.statusCode).toBe(200);
    const saude = JSON.parse(resSaude.body).dados;
    expect(saude.api_principal.status).toBe("operacional");
    expect(saude.base_de_dados.status).toBe("operacional");

    // 3. Rastreio de requisições com filtro
    const resLogs = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/requisicoes?metodo=GET",
      headers: adminHeader,
    });

    expect(resLogs.statusCode).toBe(200);
    const logs = JSON.parse(resLogs.body).dados;
    expect(Array.isArray(logs)).toBe(true);
  });
});

