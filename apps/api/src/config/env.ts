import { z } from "zod";

export class ErroConfiguracaoEnv extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroConfiguracaoEnv";
  }
}

export function validarEnvProducao(env: {
  NODE_ENV?: string;
  COOKIE_SECRET?: string;
  ADMIN_INIT_TOKEN?: string;
  DATABASE_PATH?: string;
  CORS_ORIGIN?: string;
}): void {
  if (env.NODE_ENV === "production") {
    if (!env.COOKIE_SECRET || env.COOKIE_SECRET.trim() === "") {
      throw new ErroConfiguracaoEnv(
        "Em produção (NODE_ENV=production), COOKIE_SECRET é obrigatório e não pode ter valor por defeito."
      );
    }
    if (env.COOKIE_SECRET.length < 32) {
      throw new ErroConfiguracaoEnv(
        "Em produção, COOKIE_SECRET deve ter no mínimo 32 caracteres."
      );
    }
    if (!env.ADMIN_INIT_TOKEN || env.ADMIN_INIT_TOKEN.trim() === "") {
      throw new ErroConfiguracaoEnv(
        "Em produção (NODE_ENV=production), ADMIN_INIT_TOKEN é obrigatório e não pode ter valor por defeito."
      );
    }
    if (env.ADMIN_INIT_TOKEN.length < 16) {
      throw new ErroConfiguracaoEnv(
        "Em produção, ADMIN_INIT_TOKEN deve ter no mínimo 16 caracteres."
      );
    }
    if (!env.DATABASE_PATH || env.DATABASE_PATH.trim() === "") {
      throw new ErroConfiguracaoEnv(
        "Em produção (NODE_ENV=production), DATABASE_PATH é obrigatório e não pode ter valor por defeito."
      );
    }
    if (env.DATABASE_PATH === ":memory:") {
      throw new ErroConfiguracaoEnv(
        "Em produção (NODE_ENV=production), DATABASE_PATH não pode ser ':memory:'."
      );
    }
    if (
      env.CORS_ORIGIN &&
      (env.CORS_ORIGIN.toLowerCase().includes("localhost") ||
        env.CORS_ORIGIN.includes("127.0.0.1"))
    ) {
      throw new ErroConfiguracaoEnv(
        "Em produção (NODE_ENV=production), CORS_ORIGIN não pode incluir 'localhost' ou '127.0.0.1'."
      );
    }
  }
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default("127.0.0.1"),
    COOKIE_SECRET: z.string().optional(),
    CORS_ORIGIN: z.string().default("https://nzaidi.ao,https://app.nzaidi.ao"),
    DATABASE_PATH: z.string().optional(),
    TAXAS_FONTE_MODO: z.enum(["demonstracao", "oficial"]).default("demonstracao"),
    ADMIN_INIT_TOKEN: z.string().optional(),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  })
  .transform((dados) => {
    if (dados.NODE_ENV !== "production") {
      return {
        ...dados,
        COOKIE_SECRET: dados.COOKIE_SECRET || "dev_cookie_secret_minimo_32_chars_teste_ok!",
        ADMIN_INIT_TOKEN: dados.ADMIN_INIT_TOKEN || "dev_admin_token_16chars_ok",
        DATABASE_PATH: dados.DATABASE_PATH || ":memory:",
      };
    }
    return dados as typeof dados & {
      COOKIE_SECRET: string;
      ADMIN_INIT_TOKEN: string;
      DATABASE_PATH: string;
    };
  })
  .superRefine((dados, ctx) => {
    try {
      validarEnvProducao(dados);
    } catch (erro: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: erro.message,
      });
    }
  });

export type Env = {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  HOST: string;
  COOKIE_SECRET: string;
  CORS_ORIGIN: string;
  DATABASE_PATH: string;
  TAXAS_FONTE_MODO: "demonstracao" | "oficial";
  ADMIN_INIT_TOKEN: string;
  SESSION_TTL_HOURS: number;
};

let cachedEnv: Env | null = null;

export function obterEnv(sobrescrita?: Partial<Record<string, string>>): Env {
  if (sobrescrita) {
    const parsed = envSchema.parse({ ...process.env, ...sobrescrita }) as Env;
    validarEnvProducao(parsed);
    return parsed;
  }
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env) as Env;
    validarEnvProducao(cachedEnv);
  }
  return cachedEnv;
}
