import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { PortalClienteService } from "./portal.service.js";
import type { PortalClienteRepository } from "./portal.repository.js";
import {
  RegistoClienteSchema,
  LoginClienteSchema,
  CriarPedidoCambioSchema,
  CriarPedidoRemessaSchema,
} from "./portal.types.js";
import { UploadDocumentoInputSchema } from "../identidade-kyc/clientes.types.js";
import { ErroAutenticacao } from "../../plugins/erros.js";
import { exigirPermissao } from "../../plugins/auth.plugin.js";

declare module "fastify" {
  interface FastifyRequest {
    clienteSessao?: {
      clienteId: string;
      token: string;
    };
  }
}

const COOKIE_NOME = "nzaidi_cliente_sessao";

export function registrarRotasPortalCliente(
  app: FastifyInstance,
  portalService: PortalClienteService,
  portalRepo: PortalClienteRepository
): void {
  // Middleware de verificação de autenticação de cliente
  async function exigirClienteAutenticado(request: FastifyRequest, reply: FastifyReply) {
    let token = request.cookies[COOKIE_NOME];

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      throw new ErroAutenticacao("Sessão não encontrada. Por favor inicie sessão no portal.");
    }

    const sessao = portalRepo.buscarSessaoAtiva(token);
    if (!sessao) {
      reply.clearCookie(COOKIE_NOME, { path: "/" });
      throw new ErroAutenticacao("Sessão expirada ou inválida. Por favor volte a iniciar sessão.");
    }

    request.clienteSessao = {
      clienteId: sessao.clienteId,
      token,
    };
  }

  // 1. Registo de Novo Cliente
  app.post(
    "/api/v1/portal/auth/registo",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
    const dados = RegistoClienteSchema.parse(request.body);
    const ip = request.ip;
    const userAgent = request.headers["user-agent"];

    const resultado = await portalService.registarCliente(dados, ip, userAgent);

    const isSecure = process.env.NODE_ENV === "production" ||
      request.protocol === "https" ||
      request.headers["x-forwarded-proto"] === "https";

    reply.setCookie(COOKIE_NOME, resultado.token, {
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 24 * 3600,
    });

    return reply.status(201).send({
      sucesso: true,
      mensagem: "Registo concluído com sucesso. A sua conta foi criada.",
      dados: {
        cliente: resultado.cliente,
        token: resultado.token,
      },
    });
  });

  // 2. Login de Cliente
  app.post(
    "/api/v1/portal/auth/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
    const dados = LoginClienteSchema.parse(request.body);
    const ip = request.ip;
    const userAgent = request.headers["user-agent"];

    const resultado = await portalService.loginCliente(dados, ip, userAgent);

    const isSecure = process.env.NODE_ENV === "production" ||
      request.protocol === "https" ||
      request.headers["x-forwarded-proto"] === "https";

    reply.setCookie(COOKIE_NOME, resultado.token, {
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 24 * 3600,
    });

    return reply.status(200).send({
      sucesso: true,
      mensagem: "Sessão iniciada com sucesso.",
      dados: {
        cliente: resultado.cliente,
        token: resultado.token,
      },
    });
  });

  // 3. Logout
  app.post(
    "/api/v1/portal/auth/logout",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { token, clienteId } = request.clienteSessao!;
      portalService.encerrarSessao(token, clienteId);
      reply.clearCookie(COOKIE_NOME, { path: "/" });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Sessão terminada.",
      });
    }
  );

  // 4. Perfil e Estado da Conta
  app.get(
    "/api/v1/portal/perfil",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const perfil = portalService.obterPerfil(clienteId);

      return reply.status(200).send({
        sucesso: true,
        dados: perfil,
      });
    }
  );

  // 5. Documentos KYC: Listar
  app.get(
    "/api/v1/portal/documentos",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const docs = portalService.listarDocumentos(clienteId);

      return reply.status(200).send({
        sucesso: true,
        total: docs.length,
        dados: docs,
      });
    }
  );

  // 6. Documentos KYC: Submeter
  app.post(
    "/api/v1/portal/documentos",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const dados = UploadDocumentoInputSchema.parse(request.body);
      const ip = request.ip;

      const doc = portalService.submeterDocumento(clienteId, dados, ip);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Documento submetido com sucesso e encaminhado para validação.",
        dados: doc,
      });
    }
  );

  // 7. Documentos KYC: Download Seguro
  app.get(
    "/api/v1/portal/documentos/:docId/arquivo",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const { docId } = z.object({ docId: z.string() }).parse(request.params);
      const ip = request.ip;

      const { doc, buffer } = portalService.lerArquivoDocumento(clienteId, docId, ip);

      return reply
        .header("Content-Type", doc.mimeType)
        .header("Content-Disposition", `inline; filename="${doc.nomeArquivo}"`)
        .header("Content-Length", buffer.length)
        .send(buffer);
    }
  );

  // 8. Pedidos de Câmbio: Listar
  app.get(
    "/api/v1/portal/pedidos/cambio",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const pedidos = portalService.listarPedidosCambio(clienteId);

      return reply.status(200).send({
        sucesso: true,
        total: pedidos.length,
        dados: pedidos,
      });
    }
  );

  // 9. Pedidos de Câmbio: Criar
  app.post(
    "/api/v1/portal/pedidos/cambio",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const dados = CriarPedidoCambioSchema.parse(request.body);
      const ip = request.ip;

      const pedido = portalService.criarPedidoCambio(clienteId, dados, ip);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Pedido de câmbio registado com sucesso.",
        dados: pedido,
      });
    }
  );

  // 10. Pedidos de Remessas: Listar
  app.get(
    "/api/v1/portal/pedidos/remessas",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const pedidos = portalService.listarPedidosRemessa(clienteId);

      return reply.status(200).send({
        sucesso: true,
        total: pedidos.length,
        dados: pedidos,
      });
    }
  );

  // 11. Pedidos de Remessas: Criar
  app.post(
    "/api/v1/portal/pedidos/remessas",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const dados = CriarPedidoRemessaSchema.parse(request.body);
      const ip = request.ip;

      const pedido = portalService.criarPedidoRemessa(clienteId, dados, ip);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Pedido de remessa internacional registado com sucesso para processamento.",
        dados: pedido,
      });
    }
  );

  // Rota de Personificação de Conta de Cliente (Admin -> Cliente)
  app.post(
    "/api/v1/portal/admin/impersonar/:clienteId",
    { preHandler: [exigirPermissao("clientes:impersonar")] },
    async (request, reply) => {
      const { clienteId } = request.params as { clienteId: string };
      const operador = request.usuario!;
      const ip = request.ip;
      const userAgent = request.headers["user-agent"];

      const resultado = portalService.impersonarCliente(clienteId, operador, ip, userAgent);

      reply.setCookie(COOKIE_NOME, resultado.token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400,
      });

      return reply.send({
        sucesso: true,
        dados: {
          cliente: resultado.cliente,
          token: resultado.token,
          redirectUrl: "/cliente/#/dashboard",
        },
      });
    }
  );

}
