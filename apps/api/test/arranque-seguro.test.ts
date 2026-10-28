import { describe, it, expect } from "vitest";
import { obterEnv, validarEnvProducao, ErroConfiguracaoEnv } from "../src/config/env.js";
import { criarApp } from "../src/app.js";
import { criarConexaoBanco } from "../src/database/database.js";

describe("NZAIDI — Arranque Seguro em Produção (NODE_ENV=production)", () => {
  const envValidoProducao = {
    NODE_ENV: "production" as const,
    PORT: 3000,
    HOST: "127.0.0.1",
    COOKIE_SECRET: "chave_secreta_super_forte_para_producao_32_chars!",
    ADMIN_INIT_TOKEN: "token_inicial_admin_super_seguro_2026",
    DATABASE_PATH: "/var/data/nzaidi.sqlite",
    CORS_ORIGIN: "https://nzaidi.ao,https://app.nzaidi.ao",
    TAXAS_FONTE_MODO: "oficial" as const,
    SESSION_TTL_HOURS: 8,
  };

  it("deve aprovar arranque quando todas as variáveis de produção são fortes e válidas", async () => {
    expect(() => validarEnvProducao(envValidoProducao)).not.toThrow();

    const db = criarConexaoBanco(":memory:");
    const app = await criarApp({ db, env: envValidoProducao });
    expect(app).toBeDefined();
    await app.close();
  });

  it("deve recusar arrancar se COOKIE_SECRET não estiver definido em produção", () => {
    const envInvalido = { ...envValidoProducao, COOKIE_SECRET: "" };
    expect(() => validarEnvProducao(envInvalido)).toThrow(ErroConfiguracaoEnv);
    expect(() => validarEnvProducao(envInvalido)).toThrow(/COOKIE_SECRET é obrigatório/);

    expect(() =>
      obterEnv({
        NODE_ENV: "production",
        COOKIE_SECRET: "",
        ADMIN_INIT_TOKEN: envValidoProducao.ADMIN_INIT_TOKEN,
        DATABASE_PATH: envValidoProducao.DATABASE_PATH,
        CORS_ORIGIN: envValidoProducao.CORS_ORIGIN,
      })
    ).toThrow();
  });

  it("deve recusar arrancar se ADMIN_INIT_TOKEN não estiver definido em produção", () => {
    const envInvalido = { ...envValidoProducao, ADMIN_INIT_TOKEN: "" };
    expect(() => validarEnvProducao(envInvalido)).toThrow(ErroConfiguracaoEnv);
    expect(() => validarEnvProducao(envInvalido)).toThrow(/ADMIN_INIT_TOKEN é obrigatório/);

    expect(() =>
      obterEnv({
        NODE_ENV: "production",
        COOKIE_SECRET: envValidoProducao.COOKIE_SECRET,
        ADMIN_INIT_TOKEN: "",
        DATABASE_PATH: envValidoProducao.DATABASE_PATH,
        CORS_ORIGIN: envValidoProducao.CORS_ORIGIN,
      })
    ).toThrow();
  });

  it("deve recusar arrancar se DATABASE_PATH não estiver definido em produção", () => {
    const envInvalido = { ...envValidoProducao, DATABASE_PATH: "" };
    expect(() => validarEnvProducao(envInvalido)).toThrow(ErroConfiguracaoEnv);
    expect(() => validarEnvProducao(envInvalido)).toThrow(/DATABASE_PATH é obrigatório/);

    expect(() =>
      obterEnv({
        NODE_ENV: "production",
        COOKIE_SECRET: envValidoProducao.COOKIE_SECRET,
        ADMIN_INIT_TOKEN: envValidoProducao.ADMIN_INIT_TOKEN,
        DATABASE_PATH: "",
        CORS_ORIGIN: envValidoProducao.CORS_ORIGIN,
      })
    ).toThrow();
  });

  it("deve recusar arrancar se DATABASE_PATH for ':memory:' em produção", () => {
    const envInvalido = { ...envValidoProducao, DATABASE_PATH: ":memory:" };
    expect(() => validarEnvProducao(envInvalido)).toThrow(ErroConfiguracaoEnv);
    expect(() => validarEnvProducao(envInvalido)).toThrow(/não pode ser ':memory:'/);

    expect(() =>
      obterEnv({
        NODE_ENV: "production",
        COOKIE_SECRET: envValidoProducao.COOKIE_SECRET,
        ADMIN_INIT_TOKEN: envValidoProducao.ADMIN_INIT_TOKEN,
        DATABASE_PATH: ":memory:",
        CORS_ORIGIN: envValidoProducao.CORS_ORIGIN,
      })
    ).toThrow();
  });

  it("deve recusar arrancar se CORS_ORIGIN incluir localhost ou 127.0.0.1 em produção", () => {
    const envComLocalhost = {
      ...envValidoProducao,
      CORS_ORIGIN: "https://nzaidi.ao,http://localhost:3000",
    };
    expect(() => validarEnvProducao(envComLocalhost)).toThrow(ErroConfiguracaoEnv);
    expect(() => validarEnvProducao(envComLocalhost)).toThrow(/CORS_ORIGIN não pode incluir 'localhost'/);

    const envComLoopback = {
      ...envValidoProducao,
      CORS_ORIGIN: "https://nzaidi.ao,http://127.0.0.1:5173",
    };
    expect(() => validarEnvProducao(envComLoopback)).toThrow(ErroConfiguracaoEnv);

    expect(() =>
      obterEnv({
        NODE_ENV: "production",
        COOKIE_SECRET: envValidoProducao.COOKIE_SECRET,
        ADMIN_INIT_TOKEN: envValidoProducao.ADMIN_INIT_TOKEN,
        DATABASE_PATH: envValidoProducao.DATABASE_PATH,
        CORS_ORIGIN: "https://nzaidi.ao,http://localhost:5173",
      })
    ).toThrow();
  });
});
