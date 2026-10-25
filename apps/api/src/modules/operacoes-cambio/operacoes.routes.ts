import type { FastifyInstance } from "fastify";
import type { OperacoesService } from "./operacoes.service.js";
import {
  CriarOperacaoInputSchema,
  EstornarOperacaoInputSchema,
} from "./operacoes.types.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

export function registrarRotasOperacoes(app: FastifyInstance, service: OperacoesService): void {
  // 1. Criar e liquidar operação de balcão (emite borderô atomicamente)
  app.post(
    "/api/v1/operacoes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("operacoes:registar")],
    },
    async (req, reply) => {
      const validado = CriarOperacaoInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const resultado = await service.criarOperacao(validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.code(201).send({
        sucesso: true,
        mensagem: "Operação cambial concluída com sucesso.",
        dados: resultado,
      });
    }
  );

  // 2. Listar operações
  app.get(
    "/api/v1/operacoes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")],
    },
    async (req, reply) => {
      const query = req.query as {
        limite?: string;
        offset?: string;
        clienteId?: string;
        caixaId?: string;
      };
      const limite = query.limite ? Math.min(Math.max(parseInt(query.limite, 10), 1), 100) : 50;
      const offset = query.offset ? Math.max(parseInt(query.offset, 10), 0) : 0;

      const resultado = service.listarOperacoes(limite, offset, query.clienteId, query.caixaId);

      return reply.send({
        sucesso: true,
        dados: resultado.itens,
        total: resultado.total,
        limite,
        offset,
      });
    }
  );

  // 3. Obter operação por ID com borderô
  app.get(
    "/api/v1/operacoes/:id",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const resultado = service.buscarOperacaoPorId(id);

      return reply.send({
        sucesso: true,
        dados: resultado,
      });
    }
  );

  // 4. Estornar operação
  app.post(
    "/api/v1/operacoes/:id/estornar",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("operacoes:estornar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const validado = EstornarOperacaoInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const estornada = service.estornarOperacao(id, validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.send({
        sucesso: true,
        mensagem: "Operação estornada com sucesso e movimentos compensatórios registados no caixa.",
        dados: estornada,
      });
    }
  );

  // 5. Obter dados de impressão do Borderô
  app.get(
    "/api/v1/borderos/:operacaoId",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")],
    },
    async (req, reply) => {
      const { operacaoId } = req.params as { operacaoId: string };
      const { operacao, bordero } = service.buscarOperacaoPorId(operacaoId);

      if (!bordero) {
        return reply.code(404).send({
          sucesso: false,
          erro: "Borderô não encontrado para esta operação.",
        });
      }

      return reply.send({
        sucesso: true,
        dados: {
          instituicao: {
            nome: "NZAIDI — Casa de Câmbios & Transferência, Lda.",
            licenca: "Instituição Financeira Não Bancária licenciada pelo BNA",
            balcao: "Balcão Maianga — Sede, Luanda, Angola",
          },
          operacao,
          bordero,
        },
      });
    }
  );
}
