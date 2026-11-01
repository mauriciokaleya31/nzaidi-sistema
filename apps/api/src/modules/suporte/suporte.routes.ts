import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SuporteService } from "./suporte.service.js";
import type { PortalClienteRepository } from "../portal-cliente/portal.repository.js";
import {
  CriarAtendimentoInputSchema,
  EnviarMensagemInputSchema,
  EstadoAtendimentoSchema,
} from "./suporte.types.js";
import { z } from "zod";
import { exigirPermissao } from "../../plugins/auth.plugin.js";
import { ErroAutenticacao } from "../../plugins/erros.js";

declare module "fastify" {
  interface FastifyRequest {
    clienteSessao?: {
      clienteId: string;
      token: string;
    };
  }
}

export function registrarRotasSuporte(
  app: FastifyInstance,
  suporteService: SuporteService,
  portalRepo: PortalClienteRepository
): void {
  async function exigirClienteAutenticado(request: FastifyRequest, reply: FastifyReply) {
    let token = request.cookies["nzaidi_cliente_sessao"];
    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }
    if (!token) {
      throw new ErroAutenticacao("Sessão não encontrada. Inicie sessão no portal.");
    }
    const sessao = portalRepo.buscarSessaoAtiva(token);
    if (!sessao) {
      reply.clearCookie("nzaidi_cliente_sessao", { path: "/" });
      throw new ErroAutenticacao("Sessão expirada ou inválida.");
    }
    request.clienteSessao = { clienteId: sessao.clienteId, token };
  }

  // ========================================================================
  // ROTAS DO PORTAL DO CLIENTE
  // ========================================================================

  app.post(
    "/api/v1/portal/suporte/atendimentos",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const clienteId = request.clienteSessao!.clienteId;
      const input = CriarAtendimentoInputSchema.parse(request.body);
      const res = suporteService.criarAtendimentoCliente(clienteId, input, request.ip);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Conversa de suporte iniciada com sucesso.",
        dados: res,
      });
    }
  );

  app.get(
    "/api/v1/portal/suporte/atendimentos",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const clienteId = request.clienteSessao!.clienteId;
      const atendimentos = suporteService.listarAtendimentosCliente(clienteId);

      return reply.status(200).send({
        sucesso: true,
        total: atendimentos.length,
        dados: atendimentos,
      });
    }
  );

  app.get(
    "/api/v1/portal/suporte/atendimentos/:id/mensagens",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const clienteId = request.clienteSessao!.clienteId;
      const { id } = request.params as { id: string };
      const mensagens = suporteService.obterMensagensCliente(id, clienteId);

      return reply.status(200).send({
        sucesso: true,
        total: mensagens.length,
        dados: mensagens,
      });
    }
  );

  app.post(
    "/api/v1/portal/suporte/atendimentos/:id/mensagens",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const clienteId = request.clienteSessao!.clienteId;
      const { id } = request.params as { id: string };
      const input = EnviarMensagemInputSchema.parse(request.body);
      const msg = suporteService.enviarMensagemCliente(id, clienteId, input);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Mensagem enviada com sucesso.",
        dados: msg,
      });
    }
  );

  // ========================================================================
  // ROTAS DO PAINEL ADMINISTRATIVO & OPERACIONAL
  // ========================================================================

  app.get(
    "/api/v1/admin/suporte/atendimentos",
    { preHandler: [exigirPermissao("clientes:consultar")] },
    async (request, reply) => {
      const query = request.query as any;
      const estado = query.estado ? EstadoAtendimentoSchema.parse(query.estado) : undefined;
      const semOperador = query.semOperador === "true" || query.semOperador === true;
      const operadorId = query.operadorId || undefined;

      const atendimentos = suporteService.listarAtendimentosAdmin({
        estado,
        semOperador,
        operadorId,
      });

      return reply.status(200).send({
        sucesso: true,
        total: atendimentos.length,
        dados: atendimentos,
      });
    }
  );

  app.get(
    "/api/v1/admin/suporte/atendimentos/:id",
    { preHandler: [exigirPermissao("clientes:consultar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const res = suporteService.obterAtendimentoAdmin(id);

      return reply.status(200).send({
        sucesso: true,
        dados: res,
      });
    }
  );

  app.post(
    "/api/v1/admin/suporte/atendimentos/:id/assumir",
    { preHandler: [exigirPermissao("clientes:editar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operador = request.usuario!;
      const res = suporteService.assumirAtendimento(id, operador.id, operador.nome);

      return reply.status(200).send({
        sucesso: true,
        mensagem: `Atendimento assumido por ${operador.nome}.`,
        dados: res,
      });
    }
  );

  app.post(
    "/api/v1/admin/suporte/atendimentos/:id/transferir",
    { preHandler: [exigirPermissao("clientes:editar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operadorAtual = request.usuario!;
      const Schema = z.object({
        novoOperadorId: z.string().min(1),
        novoOperadorNome: z.string().min(1),
      });
      const { novoOperadorId, novoOperadorNome } = Schema.parse(request.body);

      const res = suporteService.transferirAtendimento(
        id,
        novoOperadorId,
        novoOperadorNome,
        operadorAtual.nome
      );

      return reply.status(200).send({
        sucesso: true,
        mensagem: `Atendimento transferido para ${novoOperadorNome}.`,
        dados: res,
      });
    }
  );

  app.post(
    "/api/v1/admin/suporte/atendimentos/:id/estado",
    { preHandler: [exigirPermissao("clientes:editar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operador = request.usuario!;
      const Schema = z.object({
        estado: EstadoAtendimentoSchema,
      });
      const { estado } = Schema.parse(request.body);

      const res = suporteService.alterarEstadoAtendimento(id, estado, operador.nome);

      return reply.status(200).send({
        sucesso: true,
        mensagem: `Estado alterado para ${estado}.`,
        dados: res,
      });
    }
  );

  app.post(
    "/api/v1/admin/suporte/atendimentos/:id/mensagens",
    { preHandler: [exigirPermissao("clientes:editar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operador = request.usuario!;
      const input = EnviarMensagemInputSchema.parse(request.body);

      const msg = suporteService.enviarMensagemOperador(id, operador.id, operador.nome, input);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Mensagem enviada com sucesso ao cliente.",
        dados: msg,
      });
    }
  );
}
