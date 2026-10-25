import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET deve ter no mínimo 32 caracteres").default("segredo-de-teste-para-desenvolvimento-nzaidi-32-chars!"),
  CORS_ORIGIN: z.string().default("https://nzaidi.ao,https://app.nzaidi.ao,http://localhost:5173,http://localhost:3000"),
  DATABASE_PATH: z.string().default(":memory:"),
  TAXAS_FONTE_MODO: z.enum(["demonstracao", "oficial"]).default("demonstracao"),
  ADMIN_INIT_TOKEN: z.string().min(16).default("nzaidi-bootstrap-admin-token-2026"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function obterEnv(sobrescrita?: Partial<Record<string, string>>): Env {
  if (sobrescrita) {
    return envSchema.parse({ ...process.env, ...sobrescrita });
  }
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}
