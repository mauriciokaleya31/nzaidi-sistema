import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";

export function registrarRotasHealth(app: FastifyInstance, db: DatabaseSync): void {
  app.get("/api/health", async (_request, reply) => {
    let dbStatus = "ok";
    try {
      db.prepare("SELECT 1").get();
    } catch {
      dbStatus = "erro";
    }

    const payload = {
      status: dbStatus === "ok" ? "ok" : "degradado",
      sistema: "NZAIDI — API de Serviços Cambiais",
      versao: "0.1.0",
      ambiente: process.env["NODE_ENV"] ?? "development",
      timestamp: new Date().toISOString(),
      uptimeSegundos: Math.floor(process.uptime()),
      componentes: {
        bancoDados: dbStatus,
        servicoTaxas: "ok",
      },
    };

    return reply.status(dbStatus === "ok" ? 200 : 503).send(payload);
  });
}
