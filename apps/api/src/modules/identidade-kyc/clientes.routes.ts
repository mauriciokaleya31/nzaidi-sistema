import type { FastifyInstance } from "fastify";
import type { ClientesService } from "./clientes.service.js";
import { CriarClienteInputSchema, DecisaoKycInputSchema } from "./clientes.types.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

export function registrarRotasClientes(app: FastifyInstance, service: ClientesService): void {
  // 1. Criar novo cliente
  app.post(
    "/api/v1/clientes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:criar")],
    },
    async (req, reply) => {
      const validado = CriarClienteInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const cliente = await service.criarCliente(validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.code(201).send({
        sucesso: true,
        dados: cliente,
      });
    }
  );

  // 2. Listar clientes (com pesquisa, filtro KYC e paginação)
  app.get(
    "/api/v1/clientes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:consultar")],
    },
    async (req, reply) => {
      const query = req.query as { busca?: string; estadoKyc?: string; limite?: string; offset?: string };
      const limite = query.limite ? Math.min(Math.max(parseInt(query.limite, 10), 1), 100) : 50;
      const offset = query.offset ? Math.max(parseInt(query.offset, 10), 0) : 0;

      const resultado = service.listarClientes(query.busca, query.estadoKyc, limite, offset);

      return reply.send({
        sucesso: true,
        dados: resultado.itens,
        total: resultado.total,
        limite,
        offset,
      });
    }
  );

  // 3. Obter cliente por ID
  app.get(
    "/api/v1/clientes/:id",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:consultar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const cliente = service.buscarClientePorId(id);

      return reply.send({
        sucesso: true,
        dados: cliente,
      });
    }
  );

  // 4. Decisão KYC (Aprovar, Rejeitar, Solicitar Atualização)
  app.post(
    "/api/v1/clientes/:id/kyc",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("kyc:analisar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const validado = DecisaoKycInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const clienteAtualizado = service.processarDecisaoKyc(id, validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.send({
        sucesso: true,
        dados: clienteAtualizado,
      });
    }
  );

  // 5. Histórico de decisões KYC
  app.get(
    "/api/v1/clientes/:id/kyc/historico",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:consultar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const historico = service.obterHistoricoKyc(id);

      return reply.send({
        sucesso: true,
        dados: historico,
      });
    }
  );
}
