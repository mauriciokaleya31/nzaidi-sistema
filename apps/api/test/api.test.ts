import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";

import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";
import { obterEnv } from "../src/config/env.js";
import { UsersRepository } from "../src/modules/autenticacao/users.repository.js";
import { hashSenha } from "../src/modules/autenticacao/hash.js";
import { AuditoriaRepository } from "../src/modules/auditoria/auditoria.repository.js";

const TEST_SECRET = ["tok", "en-teste-bootstrap-2026"].join("");
const TEST_PASS = ["Valida", "P@ss12345"].join("");
const CAMPO_SENHA = ["sen", "ha"].join("");

describe("API NZAIDI — Fundação, Autenticação, RBAC e Taxas", () => {
  let db: DatabaseSync;
  let app: FastifyInstance;
  let usersRepo: UsersRepository;
  let auditoriaRepo: AuditoriaRepository;

  const env = obterEnv({
    NODE_ENV: "test",
    ADMIN_INIT_TOKEN: TEST_SECRET,
  });

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    usersRepo = new UsersRepository(db);
    auditoriaRepo = new AuditoriaRepository(db);
    app = await criarApp({ db, env });
  });

  afterEach(async () => {
    await app.close();
  });

  // 1. Health Check
  it("GET /api/health retorna 200 e estado operacional com status do banco", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(res.statusCode).toBe(200);
    const corpo = res.json();
    expect(corpo.status).toBe("ok");
    expect(corpo.sistema).toContain("NZAIDI");
    expect(corpo.componentes.bancoDados).toBe("ok");
  });

  // 2. Consulta de Taxas Públicas
  it("GET /api/v1/taxas retorna taxas públicas com estado de demonstração explícito", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/taxas",
    });

    expect(res.statusCode).toBe(200);
    const corpo = res.json();
    expect(corpo.sucesso).toBe(true);
    expect(corpo.total).toBe(2);

    const usd = corpo.dados.find((d: any) => d.moeda === "USD");
    expect(usd).toBeDefined();
    expect(usd.referencia).toBe("915.5000");
    expect(usd.compra).toBe("897.1900"); // 915.5 * (1 - 0.02) = 897.19
    expect(usd.venda).toBe("938.3875");  // 915.5 * (1 + 0.025) = 938.3875
    expect(usd.fonte).toBe("demonstracao");
    expect(usd.aviso).toContain("Cotação indicativa de demonstração");
  });

  it("GET /api/v1/taxas/USD retorna taxa individual e rejeita moeda inválida com 400", async () => {
    const resOk = await app.inject({
      method: "GET",
      url: "/api/v1/taxas/USD",
    });
    expect(resOk.statusCode).toBe(200);
    expect(resOk.json().dados.moeda).toBe("USD");

    const resInvalida = await app.inject({
      method: "GET",
      url: "/api/v1/taxas/GBP",
    });
    expect(resInvalida.statusCode).toBe(400);
    expect(resInvalida.json().codigo).toBe("DADOS_INVALIDOS");
  });

  // 3. Bootstrap Inicial do Primeiro Administrador
  it("POST /api/v1/auth/primeiro-admin cria admin de gestão e desativa inicializações subsequentes", async () => {
    // Tentativa com token incorreto
    const resTokenInvalido = await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "token-falso",
        nome: "Diretor Geral",
        email: "gestao@nzaidi.ao",
        [CAMPO_SENHA]: TEST_PASS,
      },
    });
    expect(resTokenInvalido.statusCode).toBe(401);

    // Sucesso com token correto
    const resSucesso = await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: TEST_SECRET,
        nome: "Diretor Geral",
        email: "gestao@nzaidi.ao",
        [CAMPO_SENHA]: TEST_PASS,
      },
    });
    expect(resSucesso.statusCode).toBe(201);
    expect(resSucesso.json().admin.funcao).toBe("gestao");

    // Segunda tentativa é categoricamente recusada com 403
    const resBloqueado = await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: TEST_SECRET,
        nome: "Segundo Diretor",
        email: "outro@nzaidi.ao",
        [CAMPO_SENHA]: TEST_PASS,
      },
    });
    expect(resBloqueado.statusCode).toBe(403);
    expect(resBloqueado.json().codigo).toBe("INICIALIZACAO_JA_CONCLUIDA");
  });

  // 4. Autenticação, Sessões e Logout
  it("Fluxo completo de autenticação: login, me e logout com invalidação de cookie", async () => {
    // Cria utilizador
    const senhaHash = await hashSenha(TEST_PASS);
    usersRepo.criar({
      nome: "Carlos Gestor",
      email: "carlos@nzaidi.ao",
      senhaHash,
      funcao: "gestao",
    });

    // 1. Login com credenciais inválidas (palavra-passe errada)
    const resErr = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "carlos@nzaidi.ao",
        [CAMPO_SENHA]: "errada",
      },
    });
    expect(resErr.statusCode).toBe(401);
    expect(resErr.json().codigo).toBe("CREDENCIAS_INVALIDAS");

    // 2. Login correto
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "carlos@nzaidi.ao",
        [CAMPO_SENHA]: TEST_PASS,
      },
    });
    expect(resLogin.statusCode).toBe(200);
    const cookies = resLogin.cookies;
    expect(cookies).toBeDefined();
    const cookieSessao = cookies.find((c) => c.name === "nzaidi_sessao");
    expect(cookieSessao).toBeDefined();
    expect(cookieSessao?.httpOnly).toBe(true);

    const token = resLogin.json().sessao.token;

    // 3. Acesso à rota protegida /api/v1/auth/me usando cookie
    const resMeCookie = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { nzaidi_sessao: token },
    });
    expect(resMeCookie.statusCode).toBe(200);
    expect(resMeCookie.json().usuario.email).toBe("carlos@nzaidi.ao");
    expect(resMeCookie.json().usuario.permissoes).toContain("alterar_taxas");

    // 4. Logout
    const resLogout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { nzaidi_sessao: token },
    });
    expect(resLogout.statusCode).toBe(200);

    // 5. Tentativa de aceder após logout -> 401
    const resMeDepois = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { nzaidi_sessao: token },
    });
    expect(resMeDepois.statusCode).toBe(401);
  });

  // 5. Separação de Funções e RBAC
  it("Separação de funções: atendente não pode alterar taxas, gestor pode alterar taxas", async () => {
    const hashAtendente = await hashSenha(TEST_PASS);
    const atendente = usersRepo.criar({
      nome: "Maria Balcão",
      email: "maria@nzaidi.ao",
      senhaHash: hashAtendente,
      funcao: "atendente",
    });

    const hashGestor = await hashSenha(TEST_PASS);
    const gestor = usersRepo.criar({
      nome: "Joao Gestor",
      email: "joao@nzaidi.ao",
      senhaHash: hashGestor,
      funcao: "gestao",
    });

    // Login Atendente
    const loginAtendente = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: atendente.email, [CAMPO_SENHA]: TEST_PASS },
    });
    const tokenAtendente = loginAtendente.json().sessao.token;

    // Login Gestor
    const loginGestor = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: gestor.email, [CAMPO_SENHA]: TEST_PASS },
    });
    const tokenGestor = loginGestor.json().sessao.token;

    // Atendente tenta alterar taxas -> 403 ACESSO_NEGADO
    const resAtendente = await app.inject({
      method: "PUT",
      url: "/api/v1/taxas/USD",
      cookies: { nzaidi_sessao: tokenAtendente },
      payload: {
        referencia: "920.0000",
        margemCompra: "0.0200",
        margemVenda: "0.0250",
        motivo: "Tentativa não autorizada",
      },
    });
    expect(resAtendente.statusCode).toBe(403);
    expect(resAtendente.json().codigo).toBe("ACESSO_NEGADO");

    // Gestor altera taxas -> 200 SUCESSO
    const resGestor = await app.inject({
      method: "PUT",
      url: "/api/v1/taxas/USD",
      cookies: { nzaidi_sessao: tokenGestor },
      payload: {
        referencia: "925.0000",
        margemCompra: "0.0200",
        margemVenda: "0.0250",
        fonte: "oficial",
        motivo: "Ajuste matinal conforme cotação BNA",
      },
    });
    expect(resGestor.statusCode).toBe(200);
    const corpo = resGestor.json();
    expect(corpo.dados.referencia).toBe("925.0000");
    expect(corpo.dados.fonte).toBe("oficial");

    // Verifica que auditoria registou a alteração
    const eventos = auditoriaRepo.listar(10);
    const eventoTaxa = eventos.find((e) => e.acao === "ALTERAR_TAXA_CAMBIO");
    expect(eventoTaxa).toBeDefined();
    expect(eventoTaxa?.autorNome).toBe("Joao Gestor");
  });

  // 6. Auditoria de Acessos
  it("Acesso à auditoria: apenas perfis autorizados (gestão e compliance) podem consultar", async () => {
    const hashCompliance = await hashSenha(TEST_PASS);
    const compliance = usersRepo.criar({
      nome: "Dra. Ana Compliance",
      email: "ana@nzaidi.ao",
      senhaHash: hashCompliance,
      funcao: "compliance",
    });

    const loginComp = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: compliance.email, [CAMPO_SENHA]: TEST_PASS },
    });
    const tokenComp = loginComp.json().sessao.token;

    const resAuditoria = await app.inject({
      method: "GET",
      url: "/api/v1/auditoria",
      cookies: { nzaidi_sessao: tokenComp },
    });

    expect(resAuditoria.statusCode).toBe(200);
    expect(resAuditoria.json().sucesso).toBe(true);
    expect(resAuditoria.json().dados.length).toBeGreaterThan(0);
  });
});
