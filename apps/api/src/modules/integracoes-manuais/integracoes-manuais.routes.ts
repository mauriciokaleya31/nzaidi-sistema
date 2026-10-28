import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";
import type { IntegracoesManuaisService } from "./integracoes-manuais.service.js";
import {
  TIPOS_INTEGRACAO_MANUAL,
  CANAIS_ORIGEM_MANUAL,
  ESTADOS_EXECUCAO_MANUAL,
} from "./integracoes-manuais.types.js";

const CriarExecucaoSchema = z.object({
  transacaoId: z.string().min(1, "transacaoId é obrigatório"),
  tipoIntegracao: z.enum(TIPOS_INTEGRACAO_MANUAL),
  canalOrigem: z.enum(CANAIS_ORIGEM_MANUAL),
  referenciaExterna: z.string().min(1, "referenciaExterna é obrigatória"),
  valorMoeda: z.string().regex(/^\d+(\.\d{1,2})?$/, "Formato de valor inválido"),
  moeda: z.enum(["AOA", "USD", "EUR", "GBP", "ZAR"]),
  chaveIdempotencia: z.string().min(8, "chaveIdempotencia deve ter pelo menos 8 caracteres"),
  notas: z.string().optional().nullable(),
  comprovativoArquivo: z.string().optional().nullable(),
  comprovativoHashSha256: z.string().optional().nullable(),
});

const AprovarExecucaoSchema = z.object({
  notasAprovacao: z.string().optional(),
});

const RejeitarExecucaoSchema = z.object({
  motivo: z.string().min(3, "Motivo de rejeição é obrigatório"),
});

export function registrarRotasIntegracoesManuais(
  app: FastifyInstance,
  service: IntegracoesManuaisService
): void {
  // 1. Registar Execução Manual de Integração (requer perfil tesouraria ou gestão)
  app.post(
    "/api/v1/integracoes-manuais/execucoes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("integracoes:liquidar_manual")],
    },
    async (req, reply) => {
      const validado = CriarExecucaoSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const resultado = service.registarExecucaoManual(validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.code(201).send({
        sucesso: true,
        execucao: resultado,
      });
    }
  );

  // 2. Aprovar Execução Manual pendente (exige aprovação por segundo operador para 4 olhos)
  app.post(
    "/api/v1/integracoes-manuais/execucoes/:id/aprovar",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("integracoes:liquidar_manual")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = AprovarExecucaoSchema.parse(req.body ?? {});
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const aprovado = service.aprovarExecucaoManual(
        id,
        {
          id: usuario.id,
          nome: usuario.nome,
          funcao: usuario.funcao,
          ip,
        },
        body.notasAprovacao
      );

      return reply.send({
        sucesso: true,
        execucao: aprovado,
      });
    }
  );

  // 3. Rejeitar Execução Manual pendente
  app.post(
    "/api/v1/integracoes-manuais/execucoes/:id/rejeitar",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("integracoes:liquidar_manual")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = RejeitarExecucaoSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const rejeitado = service.rejeitarExecucaoManual(
        id,
        {
          id: usuario.id,
          nome: usuario.nome,
          funcao: usuario.funcao,
          ip,
        },
        body.motivo
      );

      return reply.send({
        sucesso: true,
        execucao: rejeitado,
      });
    }
  );

  // 4. Listar Execuções Manuais (consulta permitida para atendente, compliance, tesouraria e gestão)
  app.get(
    "/api/v1/integracoes-manuais/execucoes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("integracoes:consultar_manual")],
    },
    async (req, reply) => {
      const query = req.query as {
        limite?: string;
        offset?: string;
        estado?: (typeof ESTADOS_EXECUCAO_MANUAL)[number];
      };
      const limite = query.limite ? Math.min(Math.max(parseInt(query.limite, 10), 1), 100) : 50;
      const offset = query.offset ? Math.max(parseInt(query.offset, 10), 0) : 0;

      const itens = service.listar(limite, offset, query.estado);

      return reply.send({
        sucesso: true,
        total: itens.length,
        itens,
      });
    }
  );

  // 5. Consultar Execução Manual por ID
  app.get(
    "/api/v1/integracoes-manuais/execucoes/:id",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("integracoes:consultar_manual")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const item = service.buscarPorId(id);

      return reply.send({
        sucesso: true,
        execucao: item,
      });
    }
  );
}
