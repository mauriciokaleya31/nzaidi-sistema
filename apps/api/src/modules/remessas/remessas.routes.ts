import type { FastifyInstance } from "fastify";
import type { RemessasService } from "./remessas.service.js";
import {
  CriarRemessaInputSchema,
  CancelarRemessaInputSchema,
  EstadoRemessaSchema,
} from "./remessas.types.js";
import { ErroValidacao } from "../../plugins/erros.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

export function registrarRotasRemessas(app: FastifyInstance, remessasService: RemessasService): void {
  // 1. Listar remessas
  app.get(
    "/api/v1/remessas",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (req) => {
      const q = req.query as { limite?: string; offset?: string; estado?: string; clienteId?: string };
      const limite = q.limite ? parseInt(q.limite, 10) : 50;
      const offset = q.offset ? parseInt(q.offset, 10) : 0;
      const estado = q.estado ? EstadoRemessaSchema.parse(q.estado) : undefined;

      const res = remessasService.listarRemessas(limite, offset, estado, q.clienteId);
      return {
        sucesso: true,
        ...res,
      };
    }
  );

  // 2. Detalhes de uma remessa
  app.get(
    "/api/v1/remessas/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const rem = remessasService.buscarPorId(id);
      return {
        sucesso: true,
        remessa: rem,
      };
    }
  );

  // 3. Criar nova remessa internacional no balcão
  app.post(
    "/api/v1/remessas",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:registar")] },
    async (req, reply) => {
      const parseResult = CriarRemessaInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ErroValidacao(parseResult.error.issues[0]?.message ?? "Dados da remessa inválidos");
      }

      const operador = {
        id: req.usuario!.id,
        nome: req.usuario!.nome,
        funcao: req.usuario!.funcao,
        ip: (req.headers["x-forwarded-for"] as string) || req.ip,
      };

      const remessa = await remessasService.criarRemessa(parseResult.data, operador);
      return reply.status(201).send({
        sucesso: true,
        mensagem: `Remessa internacional ${remessa.numeroRemessa} registada com sucesso.`,
        remessa,
      });
    }
  );

  // 4. Cancelar remessa e autorizar devolução (apenas Gestão e Tesouraria)
  app.post(
    "/api/v1/remessas/:id/cancelar",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const parseResult = CancelarRemessaInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ErroValidacao(parseResult.error.issues[0]?.message ?? "Motivo de cancelamento inválido");
      }

      const operador = {
        id: req.usuario!.id,
        nome: req.usuario!.nome,
        funcao: req.usuario!.funcao,
        ip: (req.headers["x-forwarded-for"] as string) || req.ip,
      };

      const cancelada = remessasService.cancelarEDevolverRemessa(id, parseResult.data, operador);
      return {
        sucesso: true,
        mensagem: `Remessa ${cancelada.numeroRemessa} cancelada e valor reembolsado por lançamento contrário.`,
        remessa: cancelada,
      };
    }
  );
}
