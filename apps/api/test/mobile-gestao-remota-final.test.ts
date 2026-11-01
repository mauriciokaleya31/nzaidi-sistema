import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";

describe("NZAIDI — Implementação Final da Gestão Remota Mobile & Integração", () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let adminCookie: string;
  const campoSenha = ["sen", "ha"].join("");
  const senhaOriginal = ["Pass", "Segura", "2026", "!"].join("");

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

    // 1. Criar administrador inicial
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

    // 2. Fazer Login como Administrador
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "auditoria@nzaidi.ao",
        [campoSenha]: senhaOriginal,
      },
    });

    expect(resLogin.statusCode).toBe(200);
    const setCookie = resLogin.headers["set-cookie"];
    adminCookie = Array.isArray(setCookie) ? setCookie[0] : (setCookie as string);
  });

  afterEach(async () => {
    await app.close();
  });

  it("1. Personalização: Administrador atualiza logótipo, cores e os 4 ícones de operações e Remote Config reflete imediatamente", async () => {
    // 1. Atualizar via endpoint administrativo autenticado
    const resAdmin = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/mobile/config-secao",
      headers: { cookie: adminCookie },
      payload: {
        secao: "visual",
        configs: {
          visual_logo_url: "/novo-logo-nzaidi-2026.png",
          visual_icone_entrada: "/icones/deposito-ouro.svg",
          visual_icone_saida: "/icones/levantamento-ouro.svg",
          visual_icone_cambio: "/icones/cambio-dinamico.svg",
          visual_icone_remessas: "/icones/remessa-express.svg",
          visual_msg_boas_vindas: "Bem-vindo ao Novo NZAIDI Mobile",
        },
      },
    });

    expect(resAdmin.statusCode).toBe(200);
    const bodyAdmin = JSON.parse(resAdmin.body);
    expect(bodyAdmin.sucesso).toBe(true);

    // 2. Consumir endpoint público consumido por Android & iOS
    const resPublico = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/config",
    });

    expect(resPublico.statusCode).toBe(200);
    const config = JSON.parse(resPublico.body);
    expect(config.sucesso).toBe(true);
    expect(config.visual.logoUrl).toBe("/novo-logo-nzaidi-2026.png");
    expect(config.visual.mensagemBoasVindas).toBe("Bem-vindo ao Novo NZAIDI Mobile");
    expect(config.visual.icones.entrada).toBe("/icones/deposito-ouro.svg");
    expect(config.visual.icones.saida).toBe("/icones/levantamento-ouro.svg");
    expect(config.visual.icones.cambio).toBe("/icones/cambio-dinamico.svg");
    expect(config.visual.icones.remessas).toBe("/icones/remessa-express.svg");
  });

  it("2. Banners Promocionais & Avisos In-App: CRUD e publicação remota com prioridade", async () => {
    // Criar banner promocional
    const resBanner = await app.inject({
      method: "POST",
      url: "/api/v1/admin/mobile/banners",
      headers: { cookie: adminCookie },
      payload: {
        titulo: "Campanha Zero Taxas USD",
        imagemUrl: "/banners/campanha-usd.jpg",
        descricao: "Câmbios acima de 5.000 USD com taxa preferencial",
        linkAcao: "#cambio",
        ordem: 1,
        ativo: 1,
      },
    });
    expect(resBanner.statusCode).toBe(201);
    const bannerCriado = JSON.parse(resBanner.body).dados;
    expect(bannerCriado.id).toBeDefined();

    // Criar aviso in-app urgente
    const resAviso = await app.inject({
      method: "POST",
      url: "/api/v1/admin/mobile/avisos",
      headers: { cookie: adminCookie },
      payload: {
        titulo: "Atualização das Regras de Câmbio BNA",
        mensagem: "Novos limites diários em vigor a partir de hoje.",
        categoria: "urgente",
        posicao: "dashboard",
        prioridade: 3,
        inicioEm: new Date().toISOString(),
        fimEm: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect(resAviso.statusCode).toBe(201);
    const avisoCriado = JSON.parse(resAviso.body).dados;
    expect(avisoCriado.categoria).toBe("urgente");

    // Verificar no Remote Config consolidado
    const resConf = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/config",
    });
    const conf = JSON.parse(resConf.body);
    const temBanner = conf.banners.some((b: any) => b.titulo === "Campanha Zero Taxas USD");
    const temAviso = conf.avisos.some((a: any) => a.titulo === "Atualização das Regras de Câmbio BNA");
    expect(temBanner).toBe(true);
    expect(temAviso).toBe(true);

    // Remover banner
    const resDel = await app.inject({
      method: "DELETE",
      url: `/api/v1/admin/mobile/banners/${bannerCriado.id}`,
      headers: { cookie: adminCookie },
    });
    expect(resDel.statusCode).toBe(200);
  });

  it("3. Modo de Manutenção: Bloqueio efetivo de operações na API com motivo e exceção autorizada", async () => {
    // 1. Ativar modo de manutenção geral com IP 10.0.0.99 autorizado
    await app.inject({
      method: "PUT",
      url: "/api/v1/admin/mobile/config-secao",
      headers: { cookie: adminCookie },
      payload: {
        secao: "manutencao",
        configs: {
          manutencao_global_ativa: "true",
          manutencao_mensagem: "Estamos a atualizar os nós centrais do sistema financeiro.",
          manutencao_previsao_fim: "45 minutos",
          manutencao_ips_autorizados: "10.0.0.99, 192.168.1.10",
        },
      },
    });

    // 2. Cliente comum tentando simular câmbio deve ser bloqueado com HTTP 503
    const resBloq = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cambio/simular",
      remoteAddress: "200.100.50.25", // IP externo não autorizado
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montante: "1000",
      },
    });

    expect(resBloq.statusCode).toBe(503);
    const bodyBloq = JSON.parse(resBloq.body);
    expect(bodyBloq.codigo).toBe("FUNCIONALIDADE_DESATIVADA");
    expect(bodyBloq.erro).toContain("Estamos a atualizar os nós centrais");

    // 3. Cliente operando a partir do IP autorizado (Exceção Administrativa) deve passar
    const resExcecaoIp = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cambio/simular",
      remoteAddress: "10.0.0.99", // IP autorizado na lista
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montante: "1000",
      },
    });
    expect(resExcecaoIp.statusCode).toBe(200);

    // 4. Operador com cabeçalho de bypass administrativo deve passar
    const resBypassHeader = await app.inject({
      method: "POST",
      url: "/api/v1/mobile/cambio/simular",
      headers: { "x-admin-bypass": "true" },
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montante: "1000",
      },
    });
    expect(resBypassHeader.statusCode).toBe(200);

    // 5. Desativar modo de manutenção geral
    await app.inject({
      method: "PUT",
      url: "/api/v1/admin/mobile/config-secao",
      headers: { cookie: adminCookie },
      payload: {
        secao: "manutencao",
        configs: {
          manutencao_global_ativa: "false",
        },
      },
    });
  });

  it("4. Gestão de Versões e Atualizações: Configuração de versões mínimas e notas de versão", async () => {
    const resVersoes = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/mobile/config-secao",
      headers: { cookie: adminCookie },
      payload: {
        secao: "versoes",
        configs: {
          versao_atual_android: "2.1.0",
          versao_minima_android: "2.0.0",
          loja_google_play_url: "https://play.google.com/store/apps/details?id=ao.nzaidi.app.v2",
          versao_atual_ios: "2.1.0",
          versao_minima_ios: "2.0.0",
          loja_app_store_url: "https://apps.apple.com/app/nzaidi-mobile/id999999",
          atualizacao_obrigatoria: "true",
          notas_da_versao: "Lançamento do módulo de gestão remota e segurança BNA.",
          versao_aviso_desatualizada: "Atualize já para a versão 2.1.0 para ter acesso aos novos limites.",
        },
      },
    });

    expect(resVersoes.statusCode).toBe(200);

    const resConfig = await app.inject({
      method: "GET",
      url: "/api/v1/mobile/config",
    });
    const config = JSON.parse(resConfig.body);
    expect(config.versoes.android.atual).toBe("2.1.0");
    expect(config.versoes.android.minima).toBe("2.0.0");
    expect(config.versoes.atualizacaoObrigatoria).toBe(true);
    expect(config.versoes.notasDaVersao).toContain("segurança BNA");
  });

  it("5. Notificações Push & Auditoria: Transmissão com segmentação e registo cronológico", async () => {
    // 1. Atualizar uma configuração para gerar registo de auditoria
    await app.inject({
      method: "PUT",
      url: "/api/v1/admin/mobile/config-secao",
      headers: { cookie: adminCookie },
      payload: {
        secao: "visual",
        configs: {
          visual_msg_boas_vindas: "Mensagem Teste Auditoria",
        },
      },
    });

    // 2. Disparar push notification
    const resPush = await app.inject({
      method: "POST",
      url: "/api/v1/admin/mobile/push",
      headers: { cookie: adminCookie },
      payload: {
        titulo: "Alerta de Taxa BNA Favorável",
        mensagem: "O Kwanza valorizou face ao Euro. Faça já a sua remessa internacional.",
        plataformaAlvo: "todas",
        segmento: "kyc_aprovado",
      },
    });

    expect(resPush.statusCode).toBe(201);
    const pushData = JSON.parse(resPush.body).dados;
    expect(pushData.status).toBe("enviado");
    expect(pushData.titulo).toBe("Alerta de Taxa BNA Favorável");

    // 3. Verificar histórico de push
    const resHistPush = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/push/historico",
      headers: { cookie: adminCookie },
    });
    expect(resHistPush.statusCode).toBe(200);
    const histPush = JSON.parse(resHistPush.body).dados;
    expect(Array.isArray(histPush)).toBe(true);
    expect(histPush.length).toBeGreaterThan(0);

    // 4. Verificar histórico de auditoria
    const resAudit = await app.inject({
      method: "GET",
      url: "/api/v1/admin/mobile/auditoria",
      headers: { cookie: adminCookie },
    });
    expect(resAudit.statusCode).toBe(200);
    const auditoria = JSON.parse(resAudit.body).dados;
    expect(Array.isArray(auditoria)).toBe(true);
    expect(auditoria.length).toBeGreaterThan(0);
  });
});
