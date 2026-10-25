import fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import type { DatabaseSync } from "node:sqlite";

import { obterEnv, type Env } from "./config/env.js";
import { registrarTratamentoErros } from "./plugins/erros.js";
import { criarMiddlewareAutenticacao } from "./plugins/auth.plugin.js";

import { UsersRepository } from "./modules/autenticacao/users.repository.js";
import { SessionsRepository } from "./modules/autenticacao/sessions.repository.js";
import { AuditoriaRepository } from "./modules/auditoria/auditoria.repository.js";
import { TaxasRepository, TaxasService } from "./modules/taxas-cambio/taxas.service.js";

import { registrarRotasHealth } from "./routes/health.routes.js";
import { registrarRotasAuth } from "./modules/autenticacao/auth.routes.js";
import { registrarRotasTaxas } from "./modules/taxas-cambio/taxas.routes.js";
import { registrarRotasAuditoria } from "./modules/auditoria/auditoria.routes.js";

export interface CriarAppOpcoes {
  db: DatabaseSync;
  env?: Env;
}

export async function criarApp(opcoes: CriarAppOpcoes): Promise<FastifyInstance> {
  const env = opcoes.env ?? obterEnv();
  const db = opcoes.db;
  const ehProducao = env.NODE_ENV === "production";

  const app = fastify({
    logger: env.NODE_ENV === "test" ? false : { level: ehProducao ? "info" : "debug" },
    trustProxy: true,
  });

  // 1. Plugins de Segurança e Infraestrutura
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: ehProducao,
  });

  const origensPermitidas = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  await app.register(fastifyCors, {
    origin: (origem, cb) => {
      if (!origem || origensPermitidas.includes(origem) || env.NODE_ENV !== "production") {
        cb(null, true);
      } else {
        cb(new Error("Origem não permitida pela política CORS"), false);
      }
    },
    credentials: true,
  });

  await app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
  });

  // Rate Limiting (mitigação contra força bruta)
  await app.register(fastifyRateLimit, {
    max: env.NODE_ENV === "test" ? 1000 : 100,
    timeWindow: "1 minute",
  });

  // 2. Tratamento Centralizado de Erros
  registrarTratamentoErros(app, ehProducao);

  // 3. Inicialização dos Repositórios e Serviços
  const usersRepo = new UsersRepository(db);
  const sessionsRepo = new SessionsRepository(db);
  const auditoriaRepo = new AuditoriaRepository(db);
  const taxasRepo = new TaxasRepository(db);
  const taxasService = new TaxasService(taxasRepo);

  // 4. Hook de Autenticação Global (identifica sessão se houver cookie/header)
  const middlewareAuth = criarMiddlewareAutenticacao(usersRepo, sessionsRepo);
  app.addHook("onRequest", middlewareAuth);

  // 5. Registo de Módulos e Rotas
  registrarRotasHealth(app, db);
  registrarRotasAuth(app, usersRepo, sessionsRepo, auditoriaRepo, env.ADMIN_INIT_TOKEN, env.SESSION_TTL_HOURS);
  registrarRotasTaxas(app, taxasService, auditoriaRepo);
  registrarRotasAuditoria(app, auditoriaRepo);

  return app;
}
