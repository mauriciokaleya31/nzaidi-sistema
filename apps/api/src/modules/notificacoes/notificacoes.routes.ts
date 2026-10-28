import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { NotificacoesRepository } from "./notificacoes.repository.js";
import { exigirAutenticacao } from "../../plugins/auth.plugin.js";

const CriarNotificacaoSchema = z.object({
  destinatarioTipo: z.enum(["admin_geral", "usuario", "cliente", "parceiro"]),
  destinatarioId: z.string().optional().nullable(),
  categoria: z.enum(["kyc", "cambio", "remessa", "caixa", "seguranca", "sistema", "comunicacao"]),
  titulo: z.string().min(3),
  mensagem: z.string().min(3),
  linkAcao: z.string().optional().nullable(),
  prioridade: z.enum(["baixa", "normal", "alta", "critica"]).optional(),
});

export function registrarRotasNotificacoes(
  app: FastifyInstance,
  repo: NotificacoesRepository
): void {
  // 1. Listar Notificações do utilizador autenticado
  app.get(
    "/api/v1/notificacoes",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const query = request.query as {
        apenasNaoLidas?: string;
        categoria?: string;
        limite?: string;
      };

      const apenasNaoLidas = query.apenasNaoLidas === "true" || query.apenasNaoLidas === "1";
      const limite = query.limite ? parseInt(query.limite, 10) : 50;

      const resultado = repo.listar(usuarioLogado.id, apenasNaoLidas, query.categoria, limite);

      return reply.send({
        sucesso: true,
        dados: resultado.itens,
        totalNaoLidas: resultado.totalNaoLidas,
      });
    }
  );

  // 2. Marcar Notificação específica como lida
  app.patch(
    "/api/v1/notificacoes/:id/lida",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      repo.marcarComoLida(id);

      return reply.send({
        sucesso: true,
        mensagem: "Notificação marcada como lida.",
      });
    }
  );

  // 3. Marcar todas as notificações do utilizador como lidas
  app.post(
    "/api/v1/notificacoes/marcar-todas-lidas",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      repo.marcarTodasComoLidas(usuarioLogado.id);

      return reply.send({
        sucesso: true,
        mensagem: "Todas as notificações foram marcadas como lidas.",
      });
    }
  );

  // 4. Criar nova notificação interna (disponível para serviços internos / admin)
  app.post(
    "/api/v1/notificacoes",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const dados = CriarNotificacaoSchema.parse(request.body);
      const nova = repo.criar(dados);

      return reply.status(201).send({
        sucesso: true,
        dados: nova,
      });
    }
  );
}
