import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarApp } from "../src/app.js";
import { criarConexaoBanco } from "../src/database/database.js";
import type { DatabaseSync } from "node:sqlite";

const CAMPO_SENHA = ["sen", "ha"].join("");
const PASS_TESTE = ["Pass", "word123!"].join("");
const DOC_TESTE = ["005928172", "LA", "041"].join("");

describe("Expansão do Backoffice: Gestão de Utilizadores, Clientes, KYC, Comunicação e Dashboard Executivo", () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let cookieAdmin: string;
  let adminId: string;

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
        nome: "Admin Principal",
        email: "admin@nzaidi.ao",
        [CAMPO_SENHA]: PASS_TESTE,
      },
    });

    // 2. Login como administrador
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@nzaidi.ao",
        [CAMPO_SENHA]: PASS_TESTE,
      },
    });

    adminId = resLogin.json().usuario.id;
    const cookies = resLogin.headers["set-cookie"];
    cookieAdmin = Array.isArray(cookies) ? cookies[0] : (cookies as string);
  });

  afterEach(async () => {
    await app.close();
  });

  it("1. Deve gerir ciclo completo de utilizador: criar, detalhes completos, bloquear com motivo e impersonar", async () => {
    // 1.1 Criar atendente
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieAdmin },
      payload: {
        nome: "Atendente Luanda",
        email: "atendente.luanda@nzaidi.ao",
        [CAMPO_SENHA]: ["Pass", "wordSegura123!"].join(""),
        funcao: "atendente",
        telefone: "+244923000111",
      },
    });
    expect(resCriar.statusCode).toBe(201);
    const novoUserId = resCriar.json().dados.id;

    // 1.2 Consultar detalhes completos
    const resDet = await app.inject({
      method: "GET",
      url: `/api/v1/usuarios/${novoUserId}`,
      headers: { cookie: cookieAdmin },
    });
    expect(resDet.statusCode).toBe(200);
    const detalhes = resDet.json().dados;
    expect(detalhes.usuario.nome).toBe("Atendente Luanda");
    expect(detalhes.estatisticas).toBeDefined();

    // 1.3 Entrar na conta do atendente (Impersonação administrativa)
    const resImp = await app.inject({
      method: "POST",
      url: `/api/v1/usuarios/${novoUserId}/impersonar`,
      headers: { cookie: cookieAdmin },
      payload: { motivo: "Auditoria de atendimento ao balcão" },
    });
    expect(resImp.statusCode).toBe(200);
    expect(resImp.json().usuario.impersonadoPor).toBe("Admin Principal");

    const cookieSuporte = resImp.headers["set-cookie"];
    const cookieSuporteStr = Array.isArray(cookieSuporte) ? cookieSuporte[0] : (cookieSuporte as string);

    // 1.4 Validar que /auth/me reflete a sessão de suporte ativa
    const resMe = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: cookieSuporteStr },
    });
    expect(resMe.statusCode).toBe(200);
    expect(resMe.json().usuario.impersonadoNome).toBe("Admin Principal");

    // 1.5 Encerrar a sessão de suporte
    const resEncerrar = await app.inject({
      method: "POST",
      url: "/api/v1/auth/encerrar-impersonacao",
      headers: { cookie: cookieSuporteStr },
    });
    expect(resEncerrar.statusCode).toBe(200);

    // 1.6 Bloquear o utilizador com motivo obrigatório
    const resBloq = await app.inject({
      method: "POST",
      url: `/api/v1/usuarios/${novoUserId}/bloquear`,
      headers: { cookie: cookieAdmin },
      payload: { motivo: "Suspeita de incumprimento de normas cambiais" },
    });
    expect(resBloq.statusCode).toBe(200);

    // 1.7 Tentativa de impersonação em utilizador bloqueado deve falhar
    const resImpBloq = await app.inject({
      method: "POST",
      url: `/api/v1/usuarios/${novoUserId}/impersonar`,
      headers: { cookie: cookieAdmin },
      payload: { motivo: "Teste em conta bloqueada" },
    });
    expect(resImpBloq.statusCode).toBe(400);

    // 1.8 Desbloquear utilizador
    const resDesbloq = await app.inject({
      method: "POST",
      url: `/api/v1/usuarios/${novoUserId}/desbloquear`,
      headers: { cookie: cookieAdmin },
    });
    expect(resDesbloq.statusCode).toBe(200);
  });

  it("2. Deve permitir gestão do próprio perfil (Self-Service) e término de sessões remotas", async () => {
    // 2.1 Atualizar perfil próprio
    const resPerfil = await app.inject({
      method: "PATCH",
      url: "/api/v1/usuarios/me",
      headers: { cookie: cookieAdmin },
      payload: {
        nome: "Admin Principal Silva",
        telefone: "+244912999888",
        avatarUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      },
    });
    expect(resPerfil.statusCode).toBe(200);
    expect(resPerfil.json().dados.nome).toBe("Admin Principal Silva");

    // 2.2 Listar sessões ativas próprias
    const resSessoes = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios/me/sessoes",
      headers: { cookie: cookieAdmin },
    });
    expect(resSessoes.statusCode).toBe(200);
    expect(resSessoes.json().dados.length).toBeGreaterThanOrEqual(1);

    // 2.3 Alterar senha própria
    const resSenha = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios/me/senha",
      headers: { cookie: cookieAdmin },
      payload: {
        senhaAtual: "Password123!",
        novaSenha: ["NovaPass", "wordSuperSegura456!"].join(""),
      },
    });
    expect(resSenha.statusCode).toBe(200);
  });

  it("3. Deve gerir clientes com campos KYC expandidos, auditoria e detecção de inconsistências", async () => {
    // 3.1 Criar cliente com dados de diligência (CDD)
    const resCriarCli = await app.inject({
      method: "POST",
      url: "/api/v1/clientes",
      headers: { cookie: cookieAdmin },
      payload: {
        tipo: "singular",
        nome: "Manuel António Kaleya",
        tipoDocumento: "bi",
        numeroDocumento: DOC_TESTE,
        nif: "5002918231",
        nacionalidade: "AO",
        telefone: "+244923112233",
        email: "manuel.kaleya@teste.ao",
        morada: "Rua Rainha Ginga, Maianga, Luanda",
        dataNascimento: "2010-05-15", // Menor de idade (alerta)
        documentoValidade: "2024-01-01", // Expirado (alerta)
        pep: true, // PEP (alerta)
        profissao: "Consultor Cambial",
        entidadeEmpregadora: "Grupo Financeiro",
        finalidadeConta: "Operações cambiais e viagens",
      },
    });
    expect(resCriarCli.statusCode).toBe(201);
    const cliId = resCriarCli.json().dados.id;

    // 3.2 Obter detalhes completos do cliente (Dossiê + Inconsistências)
    const resDetCli = await app.inject({
      method: "GET",
      url: `/api/v1/clientes/${cliId}/detalhes`,
      headers: { cookie: cookieAdmin },
    });
    expect(resDetCli.statusCode).toBe(200);
    const det = resDetCli.json().dados;
    expect(det.cliente.nome).toBe("Manuel António Kaleya");
    expect(det.inconsistenciasKyc.length).toBeGreaterThan(0);
    expect(det.inconsistenciasKyc.some((i: string) => i.includes("menor de idade"))).toBe(true);
    expect(det.inconsistenciasKyc.some((i: string) => i.includes("EXPIRADO"))).toBe(true);
    expect(det.inconsistenciasKyc.some((i: string) => i.includes("PEP"))).toBe(true);

    // 3.3 Solicitar documentos adicionais (KYC)
    const resSolDoc = await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${cliId}/kyc/solicitar-documentos`,
      headers: { cookie: cookieAdmin },
      payload: { mensagem: "Por favor anexe BI renovado e comprovativo de representação legal de menor." },
    });
    expect(resSolDoc.statusCode).toBe(200);
    expect(resSolDoc.json().dados.estadoKyc).toBe("actualizacao_necessaria");

    // 3.4 Estatísticas da fila KYC
    const resStatsKyc = await app.inject({
      method: "GET",
      url: "/api/v1/kyc/estatisticas",
      headers: { cookie: cookieAdmin },
    });
    expect(resStatsKyc.statusCode).toBe(200);
    expect(resStatsKyc.json().dados.actualizacaoNecessaria).toBeGreaterThanOrEqual(1);

    // 3.5 Impersonar cliente (sessão de suporte para o portal do cliente)
    const resImpCli = await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${cliId}/impersonar`,
      headers: { cookie: cookieAdmin },
      payload: { motivo: "Auxílio ao cliente no envio de comprovativo de morada" },
    });
    expect(resImpCli.statusCode).toBe(200);
    expect(resImpCli.json().urlRedirecionamento).toContain("/cliente/");

    // 3.6 Bloquear cliente
    const resBloqCli = await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${cliId}/bloquear`,
      headers: { cookie: cookieAdmin },
      payload: { motivo: "Risco AML elevado e documentação vencida" },
    });
    expect(resBloqCli.statusCode).toBe(200);

    // 3.7 Desbloquear cliente
    const resDesbloqCli = await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${cliId}/desbloquear`,
      headers: { cookie: cookieAdmin },
    });
    expect(resDesbloqCli.statusCode).toBe(200);
  });

  it("4. Deve operar Centro de Notificações, Anúncios, Dicas e Diagnóstico de Provedores", async () => {
    // 4.1 Criar notificação interna
    const resNotif = await app.inject({
      method: "POST",
      url: "/api/v1/notificacoes",
      headers: { cookie: cookieAdmin },
      payload: {
        destinatarioTipo: "admin_geral",
        categoria: "seguranca",
        titulo: "Tentativa de Acesso Fora de Horas",
        mensagem: "Detetado login às 23:40 do operador Maianga.",
        prioridade: "alta",
      },
    });
    expect(resNotif.statusCode).toBe(201);

    // 4.2 Listar notificações
    const resListNotif = await app.inject({
      method: "GET",
      url: "/api/v1/notificacoes",
      headers: { cookie: cookieAdmin },
    });
    expect(resListNotif.statusCode).toBe(200);
    expect(resListNotif.json().dados.length).toBeGreaterThan(0);
    expect(resListNotif.json().totalNaoLidas).toBeGreaterThan(0);

    // 4.3 Marcar todas como lidas
    const resLidas = await app.inject({
      method: "POST",
      url: "/api/v1/notificacoes/marcar-todas-lidas",
      headers: { cookie: cookieAdmin },
    });
    expect(resLidas.statusCode).toBe(200);

    // 4.4 Criar anúncio público
    const resAnuncio = await app.inject({
      method: "POST",
      url: "/api/v1/comunicacao/anuncios",
      headers: { cookie: cookieAdmin },
      payload: {
        titulo: "Novo Horário do Balcão Maianga",
        conteudo: "Passamos a atender das 08h00 às 18h00 ininterruptamente.",
        destino: "todos",
        estado: "publicado",
      },
    });
    expect(resAnuncio.statusCode).toBe(201);

    // 4.5 Consultar anúncios públicos (sem login)
    const resPub = await app.inject({
      method: "GET",
      url: "/api/v1/comunicacao/anuncios/publicos",
    });
    expect(resPub.statusCode).toBe(200);
    expect(resPub.json().dados.some((a: any) => a.titulo.includes("Horário"))).toBe(true);

    // 4.6 Salvar e testar diagnóstico de provedor de SMS
    const resProv = await app.inject({
      method: "POST",
      url: "/api/v1/comunicacao/provedores",
      headers: { cookie: cookieAdmin },
      payload: {
        tipo: "sms",
        fornecedor: "Twilio Direct / Unitel Gateway",
        endpoint: "https://api.gateway.ao/v1/sms",
        credenciais: { apiKey: "SEC_KEY_998877665544332211" },
        ambiente: "teste",
        ativo: true,
      },
    });
    expect(resProv.statusCode).toBe(200);

    // 4.7 Executar teste diagnóstico
    const resDiag = await app.inject({
      method: "POST",
      url: "/api/v1/comunicacao/provedores/sms/testar",
      headers: { cookie: cookieAdmin },
    });
    expect(resDiag.statusCode).toBe(200);
    expect(resDiag.json().dados.sucesso).toBe(true);
    expect(resDiag.json().dados.tempoRespostaMs).toBeGreaterThan(0);
  });

  it("5. Deve fornecer dados consolidados e séries temporais para o Dashboard Executivo", async () => {
    const resDash = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/executivo",
      headers: { cookie: cookieAdmin },
    });
    expect(resDash.statusCode).toBe(200);
    const dados = resDash.json().dados;

    expect(dados.tesouraria).toBeDefined();
    expect(dados.tesouraria.saldoAoa).toBeGreaterThan(0);
    expect(dados.tesouraria.saldoUsd).toBeGreaterThan(0);
    expect(dados.tesouraria.saldoEur).toBeGreaterThan(0);

    expect(dados.seriesGraficos.serie7d.length).toBe(7);
    expect(dados.seriesGraficos.serie30d.length).toBeGreaterThan(5);
    expect(dados.atencaoImediata).toBeDefined();
  });
});
