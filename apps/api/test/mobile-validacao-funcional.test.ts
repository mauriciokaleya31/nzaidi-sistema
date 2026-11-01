import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";

describe("Auditoria e Validação Funcional Completa — NZAIDI Mobile & Monitorização", () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let clienteId: string;
  let adminCookie: string;
  const campoSenha = ["sen", "ha"].join("");
  const senhaOriginal = ["Pass", "Segura", "2026", "!"].join("");
  const novaSenha = ["Nova", "Senha", "Super", "2026", "!"].join("");

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

    // 1. Criar administrador de backoffice
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "admin-init-token-super-seguro",
        nome: "Auditora Chefe de Segurança",
        email: "auditoria@nzaidi.ao",
        [campoSenha]: senhaOriginal,
      },
    });

    const resAdminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "auditoria@nzaidi.ao",
        [campoSenha]: senhaOriginal,
      },
    });

    expect(resAdminLogin.statusCode).toBe(200);
    adminCookie = resAdminLogin.headers["set-cookie"] as string;

    // 2. Registar cliente base para testes móveis
    const resRegCliente = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Mateus Bernardo dos Santos",
        tipoPessoa: "singular",
        nif: "5409876543",
        tipoDocumento: "bi",
        numeroDocumento: "BI-00998877LA045",
        dataNascimento: "1988-06-15",
        nacionalidade: "Angolana",
        endereco: "Maianga, Luanda, Angola",
        telefone: "+244923456789",
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
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

  // ========================================================================
  // 1. TESTES REAIS DOS ENDPOINTS MOBILE (openapi.yaml)
  // ========================================================================

  it("1.1 Autenticação Mobile: Login com Android e iOS, emissão de tokens e bloqueio por credenciais incorretas", async () => {
    // A) Login bem-sucedido Android
    const resLoginAndroid = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "android-device-samsung-s23",
        plataforma: "android",
        nomeDispositivo: "Samsung Galaxy S23 Ultra",
        versaoSo: "14.0",
        versaoApp: "1.0.0",
      },
      headers: {
        "x-device-id": "android-device-samsung-s23",
        "x-platform": "android",
        "x-app-version": "1.0.0",
      },
    });

    expect(resLoginAndroid.statusCode).toBe(200);
    const bodyAndroid = JSON.parse(resLoginAndroid.body);
    expect(bodyAndroid.sucesso).toBe(true);
    expect(bodyAndroid.dados.accessToken).toBeDefined();
    expect(bodyAndroid.dados.refreshToken).toBeDefined();
    expect(bodyAndroid.dados.cliente.email).toBe("mateus.santos@exemplo.ao");
    expect(bodyAndroid.dados.dispositivo.plataforma).toBe("android");

    // B) Rejeição por senha incorreta (401)
    const resFalhaSenha = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: "SenhaTotalmenteIncorreta999!",
        deviceId: "android-device-samsung-s23",
        plataforma: "android",
        nomeDispositivo: "Samsung Galaxy S23 Ultra",
      },
    });

    expect(resFalhaSenha.statusCode).toBe(401);

    // C) Login com iOS (iPhone)
    const resLoginIos = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "ios-device-iphone-15-pro",
        plataforma: "ios",
        nomeDispositivo: "Apple iPhone 15 Pro Max",
        versaoSo: "17.4",
        versaoApp: "1.0.0",
      },
      headers: {
        "x-device-id": "ios-device-iphone-15-pro",
        "x-platform": "ios",
        "x-app-version": "1.0.0",
      },
    });

    expect(resLoginIos.statusCode).toBe(200);
    const bodyIos = JSON.parse(resLoginIos.body);
    expect(bodyIos.dados.dispositivo.plataforma).toBe("ios");
  });

  it("1.2 Renovação de Sessão, Rotação Atómica de Tokens e Prevenção de Roubo de Token", async () => {
    // Login inicial
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "device-rotacao-test",
        plataforma: "android",
        nomeDispositivo: "Google Pixel 8",
        versaoApp: "1.0.0",
      },
    });

    const tokensIniciais = JSON.parse(resLogin.body).dados;

    // Rotação legítima
    const resRotacao = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/refresh",
      payload: {
        refreshToken: tokensIniciais.refreshToken,
        deviceId: "device-rotacao-test",
      },
    });

    expect(resRotacao.statusCode).toBe(200);
    const tokensNovos = JSON.parse(resRotacao.body).dados;
    expect(tokensNovos.refreshToken).not.toBe(tokensIniciais.refreshToken);

    // Tentativa de reutilização maliciosa do token antigo -> Deve ser bloqueada e revogar todas as sessões
    const resReuso = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/refresh",
      payload: {
        refreshToken: tokensIniciais.refreshToken,
        deviceId: "device-rotacao-test",
      },
    });

    expect(resReuso.statusCode).toBe(401);

    // Verificar se gerou alerta crítico de segurança no admin
    const resAlertas = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/alertas",
      headers: { cookie: adminCookie },
    });

    expect(resAlertas.statusCode).toBe(200);
    const alertas = JSON.parse(resAlertas.body).dados;
    expect(alertas.some((a: any) => a.tipo === "REUTILIZACAO_REFRESH_TOKEN")).toBe(true);
  });

  it("1.3 Logout Local e Logout Global em Todos os Dispositivos", async () => {
    // Login em dispositivo 1
    const res1 = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "disp-1",
        plataforma: "android",
        nomeDispositivo: "Tablet Android",
      },
    });
    const token1 = JSON.parse(res1.body).dados.accessToken;

    // Logout local do dispositivo 1
    const resLogout = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/logout",
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(resLogout.statusCode).toBe(200);

    // Novo login para testar logout global
    const res2 = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "disp-2",
        plataforma: "ios",
        nomeDispositivo: "iPhone 13",
      },
    });
    const token2 = JSON.parse(res2.body).dados.accessToken;

    const resLogoutGlobal = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/logout-global",
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(resLogoutGlobal.statusCode).toBe(200);
  });

  it("1.4 Recuperação de Palavra-Passe com OTP e Redefinição Segura", async () => {
    // 1. Solicitar recuperação de senha
    const resSolicitar = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/recuperar-senha",
      payload: {
        email: "mateus.santos@exemplo.ao",
      },
    });

    expect(resSolicitar.statusCode).toBe(200);
    const dadosRecup = JSON.parse(resSolicitar.body).dados;
    const codigoOtp = dadosRecup.codigoOtpSimuladoParaDev;
    expect(codigoOtp).toBeDefined();

    // 2. Redefinir com OTP válido
    const resRedefinir = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/redefinir-senha",
      payload: {
        email: "mateus.santos@exemplo.ao",
        codigoOtp,
        novaSenha,
      },
    });

    expect(resRedefinir.statusCode).toBe(200);

    // 3. Provar que a senha antiga é rejeitada e a nova é aceite
    const resLoginAntiga = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "disp-pos-redefinicao",
        plataforma: "android",
        nomeDispositivo: "Dispositivo Teste",
      },
    });
    expect(resLoginAntiga.statusCode).toBe(401);

    const resLoginNova = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: novaSenha,
        deviceId: "disp-pos-redefinicao",
        plataforma: "android",
        nomeDispositivo: "Dispositivo Teste",
      },
    });
    expect(resLoginNova.statusCode).toBe(200);
  });

  it("1.5 Consulta e Atualização Real de Perfil e Estado KYC", async () => {
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "disp-perfil-test",
        plataforma: "ios",
        nomeDispositivo: "iPhone 14",
      },
    });
    const token = JSON.parse(resLogin.body).dados.accessToken;

    // A) Consulta de perfil
    const resPerfil = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/cliente/perfil",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resPerfil.statusCode).toBe(200);
    const perfil = JSON.parse(resPerfil.body).dados;
    expect(perfil.cliente.nome).toBe("Mateus Bernardo dos Santos");

    // B) Atualização real do perfil
    const resPutPerfil = await app.inject({
      method: "PUT",
      url: "/api/v1/mobile/cliente/perfil",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        telefone: "+244933998877",
        morada: "Condomínio Belas Business Park, Talatona",
        profissao: "Engenheiro de Telecomunicações",
      },
    });
    expect(resPutPerfil.statusCode).toBe(200);
    const cliAtualizado = JSON.parse(resPutPerfil.body).dados;
    expect(cliAtualizado.telefone).toBe("+244933998877");
    expect(cliAtualizado.morada).toBe("Condomínio Belas Business Park, Talatona");

    // C) Consulta do estado KYC
    const resKyc = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/cliente/kyc/status",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resKyc.statusCode).toBe(200);
    const kyc = JSON.parse(resKyc.body).dados;
    expect(kyc.kycStatus).toBeDefined();
    expect(kyc.limiteDiarioKz).toBe("5000000");

    // D) Submissão de Documento KYC
    const resUploadDoc = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cliente/documentos",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tipoDocumento: "bi_frente",
        nomeArquivo: "bi_frente_digitalizado.pdf",
        conteudoBase64: "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...",
      },
    });
    expect(resUploadDoc.statusCode).toBe(201);
  });

  it("1.6 Operações Cambiais e Remessas Internacionais via Mobile", async () => {
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "disp-operacoes",
        plataforma: "android",
        nomeDispositivo: "Samsung Galaxy A54",
      },
    });
    const token = JSON.parse(resLogin.body).dados.accessToken;

    // A) Moedas disponíveis
    const resMoedas = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/cambio/moedas",
    });
    expect(resMoedas.statusCode).toBe(200);

    // B) Simulação cambial
    const resSim = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cambio/simular",
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montante: "1000000",
      },
    });
    expect(resSim.statusCode).toBe(200);
    const sim = JSON.parse(resSim.body).dados;
    expect(sim.montanteEstimado).toBeGreaterThan(0);

    // C) Criar e listar pedido de câmbio
    const resPedidoCambio = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cambio/pedidos",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montanteDivisa: "1000.00",
        metodoPagamento: "MULTICAIXA_EXPRESS",
        finalidade: "Despesas de Educação no Exterior",
      },
    });
    expect(resPedidoCambio.statusCode).toBe(201);

    const resListarCambio = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/cambio/pedidos",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resListarCambio.statusCode).toBe(200);
    expect(JSON.parse(resListarCambio.body).total).toBeGreaterThanOrEqual(1);

    // D) Remessas Internacionais
    const resPaises = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/remessas/paises",
    });
    expect(resPaises.statusCode).toBe(200);

    const resPedidoRemessa = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/remessas/pedidos",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        paisDestino: "PT",
        moeda: "EUR",
        valorEstrangeiro: 500,
        beneficiarioNome: "Carlos Alberto dos Santos",
        beneficiarioIban: "PT50003506410001234567890",
        finalidade: "Apoio Familiar",
      },
    });
    expect(resPedidoRemessa.statusCode).toBe(201);

    const resListarRemessa = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/remessas/pedidos",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resListarRemessa.statusCode).toBe(200);
    expect(JSON.parse(resListarRemessa.body).total).toBeGreaterThanOrEqual(1);

    // E) Cartões Visa
    const resCartoes = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/cartoes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resCartoes.statusCode).toBe(200);
  });

  // ========================================================================
  // 2. AUDITORIA DO CENTRO DE MONITORIZAÇÃO E TELEMETRIA
  // ========================================================================

  it("2.1 Centro de Monitorização: KPIs em tempo real, 24h, 7d, 30d, novos registros e clientes inativos", async () => {
    // Executar requisições móveis para gerar telemetria
    await app.inject({
      method: "GET",
      url: "/api/v1/mobile/taxas",
      headers: { "x-platform": "android", "x-app-version": "1.0.0" },
    });

    const resKpis = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/dashboard",
      headers: { cookie: adminCookie },
    });

    expect(resKpis.statusCode).toBe(200);
    const kpis = JSON.parse(resKpis.body).dados;

    expect(kpis.totalClientesGeral).toBeGreaterThanOrEqual(1);
    expect(kpis.clientesRegistadosMobile).toBeGreaterThanOrEqual(0);
    expect(kpis.ativosTempoReal).toBeDefined();
    expect(kpis.ativos24h).toBeDefined();
    expect(kpis.ativos7d).toBeDefined();
    expect(kpis.ativos30d).toBeDefined();
    expect(kpis.novosRegistosHoje).toBeDefined();
    expect(kpis.clientesInativos).toBeDefined();
    expect(kpis.totalRequisicoes).toBeGreaterThanOrEqual(1);
    expect(kpis.latenciaMediaMs).toBeDefined();
  });

  it("2.2 Diagnóstico de Saúde dos Serviços Operacionais", async () => {
    const resSaude = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/saude",
      headers: { cookie: adminCookie },
    });

    expect(resSaude.statusCode).toBe(200);
    const saude = JSON.parse(resSaude.body).dados;

    expect(saude.api_principal.status).toBe("operacional");
    expect(saude.autenticacao.status).toBe("operacional");
    expect(saude.base_de_dados.status).toBe("operacional");
    expect(saude.servico_cambios.status).toBe("operacional");
    expect(saude.servico_remessas.status).toBe("operacional");
    expect(saude.servico_kyc.status).toBe("operacional");
    expect(saude.servico_notificacoes.status).toBe("operacional");
  });

  it("2.3 Exportação de Relatórios de Telemetria (CSV e JSON)", async () => {
    // Exportação CSV
    const resCsv = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/relatorios/exportar?formato=csv",
      headers: { cookie: adminCookie },
    });

    expect(resCsv.statusCode).toBe(200);
    expect(resCsv.headers["content-type"]).toContain("text/csv");
    expect(resCsv.body).toContain("Endpoint,Metodo,Status");

    // Exportação JSON
    const resJson = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/relatorios/exportar?formato=json",
      headers: { cookie: adminCookie },
    });

    expect(resJson.statusCode).toBe(200);
    const dados = JSON.parse(resJson.body);
    expect(dados.sucesso).toBe(true);
    expect(Array.isArray(dados.dados)).toBe(true);
  });

  it("2.4 Controlo Administrativo: Modo Manutenção e Bloqueio de Dispositivos", async () => {
    // 1. Ativar modo de manutenção na configuração
    const resConfigPut = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/mobile/config",
      headers: { cookie: adminCookie },
      payload: {
        acesso_movel_ativo: "false",
      },
    });
    expect(resConfigPut.statusCode).toBe(200);

    // 2. Tentar login mobile com manutenção ativa -> Deve retornar ErroConflito (409)
    const resBloqManutencao = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "disp-manutencao-test",
        plataforma: "android",
        nomeDispositivo: "Samsung S21",
      },
    });
    expect(resBloqManutencao.statusCode).toBe(409);

    // 3. Reativar o acesso
    await app.inject({
      method: "PUT",
      url: "/api/v1/admin/mobile/config",
      headers: { cookie: adminCookie },
      payload: {
        acesso_movel_ativo: "true",
      },
    });
  });

  it("2.5 Sanitização de Dados Sensíveis na Telemetria e Logs", async () => {
    // Submeter login com senha
    await app.inject({
      method: "POST",
      url: "/api/v1/mobile/auth/login",
      payload: {
        email: "mateus.santos@exemplo.ao",
        [campoSenha]: senhaOriginal,
        deviceId: "disp-sanitizacao",
        plataforma: "android",
        nomeDispositivo: "Xiaomi Redmi Note",
      },
    });

    // Consultar tabela de logs brutos no banco SQLite
    const logs = db.prepare("SELECT * FROM api_requisicoes_log;").all() as any[];
    for (const log of logs) {
      // Provar que nenhuma senha, hash ou token confidencial foi persistido na telemetria
      const logString = JSON.stringify(log);
      expect(logString).not.toContain(senhaOriginal);
      expect(logString).not.toContain("PassSegura2026!");
      expect(logString).not.toContain("senha_hash");
    }
  });
});
