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
import { ClientesRepository } from "./modules/identidade-kyc/clientes.repository.js";
import { ClientesService } from "./modules/identidade-kyc/clientes.service.js";
import { DocumentosKycService } from "./modules/identidade-kyc/documentos.service.js";
import { CaixaRepository } from "./modules/contabilidade-tesouraria/caixa.repository.js";
import { CaixaService } from "./modules/contabilidade-tesouraria/caixa.service.js";
import { OperacoesRepository } from "./modules/operacoes-cambio/operacoes.repository.js";
import { OperacoesService } from "./modules/operacoes-cambio/operacoes.service.js";

import { registrarRotasHealth } from "./routes/health.routes.js";
import { registrarRotasAuth } from "./modules/autenticacao/auth.routes.js";
import { registrarRotasUsuarios } from "./modules/autenticacao/usuarios.routes.js";
import { registrarRotasTaxas } from "./modules/taxas-cambio/taxas.routes.js";
import { registrarRotasAuditoria } from "./modules/auditoria/auditoria.routes.js";
import { registrarRotasClientes } from "./modules/identidade-kyc/clientes.routes.js";
import { registrarRotasCaixa } from "./modules/contabilidade-tesouraria/caixa.routes.js";
import { registrarRotasOperacoes } from "./modules/operacoes-cambio/operacoes.routes.js";
import { IntegracoesManuaisRepository } from "./modules/integracoes-manuais/integracoes-manuais.repository.js";
import { IntegracoesManuaisService } from "./modules/integracoes-manuais/integracoes-manuais.service.js";
import { registrarRotasIntegracoesManuais } from "./modules/integracoes-manuais/integracoes-manuais.routes.js";
import { PortalClienteRepository } from "./modules/portal-cliente/portal.repository.js";
import { PortalClienteService } from "./modules/portal-cliente/portal.service.js";
import { registrarRotasPortalCliente } from "./modules/portal-cliente/portal.routes.js";
import { ParceirosRepository } from "./modules/parceiros-comerciais/parceiros.repository.js";
import { ParceirosService } from "./modules/parceiros-comerciais/parceiros.service.js";
import { registrarRotasParceiros } from "./modules/parceiros-comerciais/parceiros.routes.js";
import { OperacionalRepository } from "./modules/operacional/operacional.repository.js";
import { OperacionalService } from "./modules/operacional/operacional.service.js";
import { registrarRotasOperacional } from "./modules/operacional/operacional.routes.js";
import { ContabilidadeRepository } from "./modules/contabilidade/contabilidade.repository.js";
import { ContabilidadeService } from "./modules/contabilidade/contabilidade.service.js";
import { registrarRotasContabilidade } from "./modules/contabilidade/contabilidade.routes.js";
import { NotificacoesRepository } from "./modules/notificacoes/notificacoes.repository.js";
import { registrarRotasNotificacoes } from "./modules/notificacoes/notificacoes.routes.js";
import { ComunicacaoRepository } from "./modules/comunicacao/comunicacao.repository.js";
import { ComunicacaoService } from "./modules/comunicacao/comunicacao.service.js";
import { registrarRotasComunicacao } from "./modules/comunicacao/comunicacao.routes.js";
import { registrarRotasDashboardExecutivo } from "./modules/operacional/dashboard-executivo.routes.js";
import { PagamentosRepository } from "./modules/pagamentos/pagamentos.repository.js";
import { PagamentosService } from "./modules/pagamentos/pagamentos.service.js";
import { registrarRotasPagamentos } from "./modules/pagamentos/pagamentos.routes.js";

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
  const clientesRepo = new ClientesRepository(db);
  const clientesService = new ClientesService(clientesRepo, auditoriaRepo);
  const documentosService = new DocumentosKycService(db, auditoriaRepo);
  const contabilidadeRepo = new ContabilidadeRepository(db);
  const contabilidadeService = new ContabilidadeService(db, contabilidadeRepo, auditoriaRepo);
  const caixaRepo = new CaixaRepository(db);
  const caixaService = new CaixaService(db, caixaRepo, auditoriaRepo, contabilidadeService);
  const operacoesRepo = new OperacoesRepository(db);
  const operacoesService = new OperacoesService(
    db,
    operacoesRepo,
    clientesRepo,
    caixaRepo,
    taxasService,
    auditoriaRepo,
    contabilidadeService
  );

  const integracoesManuaisRepo = new IntegracoesManuaisRepository(db);
  const integracoesManuaisService = new IntegracoesManuaisService(
    integracoesManuaisRepo,
    auditoriaRepo
  );

  // 4. Hook de Autenticação Global (identifica sessão se houver cookie/header)
  const middlewareAuth = criarMiddlewareAutenticacao(usersRepo, sessionsRepo);
  app.addHook("onRequest", middlewareAuth);

  // 5. Registo de Módulos e Rotas
  registrarRotasHealth(app, db);
  registrarRotasAuth(app, usersRepo, sessionsRepo, auditoriaRepo, env.ADMIN_INIT_TOKEN, env.SESSION_TTL_HOURS);
  registrarRotasUsuarios(app, usersRepo, sessionsRepo, auditoriaRepo);
  registrarRotasTaxas(app, taxasService, auditoriaRepo);
  registrarRotasAuditoria(app, auditoriaRepo);
  registrarRotasClientes(app, clientesService, documentosService);
  registrarRotasCaixa(app, caixaService);
  registrarRotasOperacoes(app, operacoesService);
  const portalRepo = new PortalClienteRepository(db);
  const portalService = new PortalClienteService(
    db,
    portalRepo,
    clientesRepo,
    documentosService,
    taxasService,
    auditoriaRepo
  );
  registrarRotasPortalCliente(app, portalService, portalRepo);
  registrarRotasIntegracoesManuais(app, integracoesManuaisService);
  const parceirosRepo = new ParceirosRepository(db);
  const parceirosService = new ParceirosService(db, parceirosRepo, auditoriaRepo);
  registrarRotasParceiros(app, parceirosService, parceirosRepo);

  const operacionalRepo = new OperacionalRepository(db);
  const operacionalService = new OperacionalService(
    db,
    operacionalRepo,
    auditoriaRepo,
    documentosService,
    clientesRepo,
    usersRepo,
    parceirosRepo
  );
  registrarRotasOperacional(app, operacionalService);
  registrarRotasContabilidade(app, contabilidadeService, contabilidadeRepo);

  const notificacoesRepo = new NotificacoesRepository(db);
  registrarRotasNotificacoes(app, notificacoesRepo);

  const comunicacaoRepo = new ComunicacaoRepository(db);
  const comunicacaoService = new ComunicacaoService(comunicacaoRepo, auditoriaRepo);
  registrarRotasComunicacao(app, comunicacaoService);

  registrarRotasDashboardExecutivo(app, db);

  const pagamentosRepo = new PagamentosRepository(db);
  const pagamentosService = new PagamentosService(pagamentosRepo, auditoriaRepo);
  registrarRotasPagamentos(app, pagamentosService);

  return app;
}
