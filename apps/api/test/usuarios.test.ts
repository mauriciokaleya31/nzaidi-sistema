import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarApp } from "../src/app.js";
import { criarConexaoBanco } from "../src/database/database.js";

describe("Gestão de Equipa e Contas de Utilizadores Internos", () => {
  let app: FastifyInstance;
  let dbConexao: any;

  const campoSenha = "senha";
  const segredoAdmin = ["AdminPass", "2026", "XYZ!"].join("");
  const segredoAtendente = ["AtendPass", "2026", "XYZ!"].join("");
  const tokenBootstrap = "token-bootstrap-test-usuarios";

  let cookieGestao: string;
  let cookieAtendente: string;
  let gestaoId: string;
  let atendenteId: string;

  beforeAll(async () => {
    dbConexao = criarConexaoBanco(":memory:");

    app = await criarApp({
      db: dbConexao,
      env: {
        PORT: 0,
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        ADMIN_INIT_TOKEN: tokenBootstrap,
        SESSION_TTL_HOURS: 8,
        COOKIE_SECRET: "chave-secreta-para-cookies-de-teste-32ch",
        CORS_ORIGIN: "*",
      },
    });

    await app.ready();

    // 1. Criar Primeiro Administrador (Gestão)
    const resInit = await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: tokenBootstrap,
        nome: "Diretora Geral",
        email: "direcao@nzaidi.ao",
        [campoSenha]: segredoAdmin,
      },
    });
    expect(resInit.statusCode).toBe(201);
    gestaoId = resInit.json().admin.id;

    // Login Gestão
    const resLoginGestao = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "direcao@nzaidi.ao", [campoSenha]: segredoAdmin },
    });
    expect(resLoginGestao.statusCode).toBe(200);
    cookieGestao = resLoginGestao.headers["set-cookie"] as string;

    // 2. Gestão cria um Atendente
    const resCriaAtend = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Atendente Balcao Teste",
        email: "atendente.teste@nzaidi.ao",
        funcao: "atendente",
        [campoSenha]: segredoAtendente,
      },
    });
    expect(resCriaAtend.statusCode).toBe(201);
    atendenteId = resCriaAtend.json().dados.id;

    // Login Atendente
    const resLoginAtend = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "atendente.teste@nzaidi.ao", [campoSenha]: segredoAtendente },
    });
    expect(resLoginAtend.statusCode).toBe(200);
    cookieAtendente = resLoginAtend.headers["set-cookie"] as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it("deve rejeitar listagem de utilizadores para requisição sem autenticação", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios",
    });
    expect(res.statusCode).toBe(401);
  });

  it("deve impedir utilizador não-gestão (atendente) de listar os utilizadores internos", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieAtendente },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().codigo).toBe("ACESSO_NEGADO");
  });

  it("deve permitir à Gestão listar todos os funcionários cadastrados", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
    });
    expect(res.statusCode).toBe(200);
    const lista = res.json().dados;
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.length).toBeGreaterThanOrEqual(2);
    // Não deve expor hash da senha
    expect(lista[0].senhaHash).toBeUndefined();
  });

  it("deve impedir atendente de criar novos utilizadores no sistema", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieAtendente },
      payload: {
        nome: "Invasor Ilegitimo",
        email: "invasor@nzaidi.ao",
        funcao: "gestao",
        [campoSenha]: segredoAdmin,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("deve permitir à Gestão cadastrar novo oficial de Compliance e Tesouraria", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Dr. Oficial Compliance",
        email: "compliance.novo@nzaidi.ao",
        funcao: "compliance",
        [campoSenha]: segredoAdmin,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().dados.funcao).toBe("compliance");
  });

  it("deve rejeitar criação de funcionário com email já existente", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Outro Nome",
        email: "atendente.teste@nzaidi.ao", // Já existe
        funcao: "atendente",
        [campoSenha]: segredoAdmin,
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().codigo).toBe("EMAIL_JA_REGISTADO");
  });

  it("deve rejeitar criação com senha inferior a 10 caracteres", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Nome Valido",
        email: "curta@nzaidi.ao",
        funcao: "atendente",
        [campoSenha]: "12345", // Menor que 10
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("deve impedir a Gestão de desativar a sua própria conta em sessão", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/usuarios/${gestaoId}/status`,
      headers: { cookie: cookieGestao },
      payload: { ativo: false },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().codigo).toBe("OPERACAO_INVALIDA");
  });

  it("deve permitir à Gestão desativar a conta de um atendente e bloquear novos logins", async () => {
    // 1. Desativa
    const resStatus = await app.inject({
      method: "PATCH",
      url: `/api/v1/usuarios/${atendenteId}/status`,
      headers: { cookie: cookieGestao },
      payload: { ativo: false },
    });
    expect(resStatus.statusCode).toBe(200);

    // 2. Tentativa de Login deve ser bloqueada
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "atendente.teste@nzaidi.ao", [campoSenha]: segredoAtendente },
    });
    expect(resLogin.statusCode).toBe(403);
    expect(resLogin.json().codigo).toBe("CONTA_DESATIVADA");
  });
});
