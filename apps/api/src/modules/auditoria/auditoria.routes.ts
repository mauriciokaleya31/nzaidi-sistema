import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuditoriaRepository } from "./auditoria.repository.js";
import { exigirPermissao } from "../../plugins/auth.plugin.js";

const QueryAuditoriaSchema = z.object({
  limite: z.coerce.number().int().min(1).max(200).default(50),
});

export function registrarRotasAuditoria(app: FastifyInstance, auditoriaRepo: AuditoriaRepository): void {
  app.get(
    "/api/v1/auditoria",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (request, reply) => {
      const query = QueryAuditoriaSchema.parse(request.query);
      const eventos = auditoriaRepo.listar(query.limite);

      return reply.status(200).send({
        sucesso: true,
        total: eventos.length,
        dados: eventos,
      });
    }
  );
}
