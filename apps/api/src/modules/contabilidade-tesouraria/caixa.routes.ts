import type { FastifyInstance } from "fastify";
import type { CaixaService } from "./caixa.service.js";
import {
  AbrirCaixaInputSchema,
  FecharCaixaInputSchema,
  MovimentoManualInputSchema,
} from "./caixa.types.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

export function registrarRotasCaixa(app: FastifyInstance, service: CaixaService): void {
  // 1. Abrir caixa
  app.post(
    "/api/v1/caixa/abrir",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:abrir")],
    },
    async (req, reply) => {
      const validado = AbrirCaixaInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const caixa = service.abrirCaixa(validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.code(201).send({
        sucesso: true,
        dados: caixa,
      });
    }
  );

  // 2. Obter caixa ativo do operador atual
  app.get(
    "/api/v1/caixa/ativo",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:consultar")],
    },
    async (req, reply) => {
      const usuario = req.usuario!;
      const ativo = service.obterCaixaAtivoDoOperador(usuario.id);

      return reply.send({
        sucesso: true,
        dados: ativo,
      });
    }
  );

  // 3. Obter caixa por ID com saldos
  app.get(
    "/api/v1/caixa/:id",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:consultar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const resultado = service.obterCaixaComSaldos(id);

      return reply.send({
        sucesso: true,
        dados: resultado,
      });
    }
  );

  // 4. Registar movimento manual (Suprimento / Sangria)
  app.post(
    "/api/v1/caixa/:id/movimento",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:movimentar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const validado = MovimentoManualInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      service.adicionarMovimentoManual(id, validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      const atualizado = service.obterCaixaComSaldos(id);

      return reply.send({
        sucesso: true,
        mensagem: "Movimento de caixa registado com sucesso.",
        dados: atualizado,
      });
    }
  );

  // 5. Fechar caixa
  app.post(
    "/api/v1/caixa/:id/fechar",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:fechar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const validado = FecharCaixaInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const caixaFechado = service.fecharCaixa(id, validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.send({
        sucesso: true,
        mensagem: "Caixa encerrado com sucesso.",
        dados: caixaFechado,
      });
    }
  );

  // 6. Listar histórico de caixas
  app.get(
    "/api/v1/caixa",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:consultar")],
    },
    async (req, reply) => {
      const query = req.query as { limite?: string; offset?: string };
      const limite = query.limite ? Math.min(Math.max(parseInt(query.limite, 10), 1), 100) : 50;
      const offset = query.offset ? Math.max(parseInt(query.offset, 10), 0) : 0;

      const caixas = service.listarCaixas(limite, offset);

      return reply.send({
        sucesso: true,
        dados: caixas,
      });
    }
  );

  // 7. Listar movimentos de um caixa
  app.get(
    "/api/v1/caixa/:id/movimentos",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:consultar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const movimentos = service.listarMovimentos(id);

      return reply.send({
        sucesso: true,
        dados: movimentos,
      });
    }
  );
}
