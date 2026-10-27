import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { ParceirosService } from "./parceiros.service.js";
import type { ParceirosRepository } from "./parceiros.repository.js";
import {
  LoginParceiroSchema,
  RecuperarSenhaParceiroSchema,
  ConfirmarRecepcaoSchema,
  LiquidarOperacaoSchema,
  DevolverOperacaoSchema,
  SubmeterLoteReconciliacaoSchema,
  CriarParceiroSchema,
  EditarParceiroSchema,
  AlterarStatusParceiroSchema,
  AtribuirRemessaParceiroSchema,
} from "./parceiros.types.js";
import { ErroAutenticacao } from "../../plugins/erros.js";
import { exigirPermissao } from "../../plugins/auth.plugin.js";

declare module "fastify" {
  interface FastifyRequest {
    parceiroSessao?: {
      parceiroId: string;
      usuarioParceiroId: string;
      token: string;
      parceiroCodigo: string;
      parceiroNome: string;
      usuarioNome: string;
      usuarioFuncao: string;
    };
  }
}

const COOKIE_PARCEIRO = "nzaidi_parceiro_sessao";

export function registrarRotasParceiros(
  app: FastifyInstance,
  parceirosService: ParceirosService,
  parceirosRepo: ParceirosRepository
): void {
  // Middleware de Autenticação do Parceiro
  async function exigirParceiroAutenticado(request: FastifyRequest, reply: FastifyReply) {
    let token = request.cookies[COOKIE_PARCEIRO];

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      throw new ErroAutenticacao("Sessão de parceiro não encontrada. Inicie sessão no Portal dos Parceiros.");
    }

    const sessaoInfo = parceirosRepo.buscarSessaoAtiva(token);
    if (!sessaoInfo) {
      reply.clearCookie(COOKIE_PARCEIRO, { path: "/" });
      throw new ErroAutenticacao("Sessão de parceiro expirada ou inválida. Volte a iniciar sessão.");
    }

    request.parceiroSessao = {
      parceiroId: sessaoInfo.parceiro.id,
      usuarioParceiroId: sessaoInfo.usuario.id,
      token,
      parceiroCodigo: sessaoInfo.parceiro.codigo,
      parceiroNome: sessaoInfo.parceiro.nome,
      usuarioNome: sessaoInfo.usuario.nome,
      usuarioFuncao: sessaoInfo.usuario.funcao,
    };
  }

  // ==========================================
  // AUTENTICAÇÃO DO PARCEIRO
  // ==========================================

  app.post(
    "/api/v1/parceiro/auth/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
    const dados = LoginParceiroSchema.parse(request.body);
    const ip = request.ip;
    const userAgent = request.headers["user-agent"];

    const resultado = await parceirosService.loginParceiro(dados, ip, userAgent);

    reply.setCookie(COOKIE_PARCEIRO, resultado.token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
    });

    return reply.send({
      sucesso: true,
      dados: {
        usuario: resultado.usuario,
        parceiro: resultado.parceiro,
        token: resultado.token,
      },
    });
  });

  app.get(
    "/api/v1/parceiro/auth/me",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const parceiro = parceirosRepo.buscarParceiroPorId(sessao.parceiroId);
      const usuario = parceirosRepo.buscarUsuarioPorId(sessao.usuarioParceiroId);

      if (!parceiro || !usuario) {
        throw new ErroAutenticacao("Parceiro ou utilizador não encontrado.");
      }

      const { senhaHash: _, ...usuarioLimpo } = usuario;
      return reply.send({
        sucesso: true,
        dados: {
          parceiro,
          usuario: usuarioLimpo,
        },
      });
    }
  );

  app.post(
    "/api/v1/parceiro/auth/logout",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      parceirosService.encerrarSessao(sessao.token, sessao.usuarioParceiroId, sessao.parceiroId);
      reply.clearCookie(COOKIE_PARCEIRO, { path: "/" });

      return reply.send({
        sucesso: true,
        mensagem: "Sessão encerrada com sucesso.",
      });
    }
  );

  app.post("/api/v1/parceiro/auth/recuperar-senha", async (request, reply) => {
    const dados = RecuperarSenhaParceiroSchema.parse(request.body);
    const ip = request.ip;

    const res = parceirosService.recuperarAcesso(dados.email, ip);
    return reply.send(res);
  });

  // ==========================================
  // DASHBOARD DO PARCEIRO
  // ==========================================

  app.get(
    "/api/v1/parceiro/dashboard/resumo",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const dados = parceirosService.obterDashboardResumo(sessao.parceiroId);

      return reply.send({
        sucesso: true,
        dados,
      });
    }
  );

  // ==========================================
  // OPERAÇÕES DO PARCEIRO (MULTITENANT)
  // ==========================================

  app.get(
    "/api/v1/parceiro/operacoes",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const query = request.query as any;

      const filtros = {
        estado: query.estado ? String(query.estado) : undefined,
        canal: query.canal ? String(query.canal) : undefined,
        moeda: query.moeda ? String(query.moeda) : undefined,
        busca: query.busca ? String(query.busca) : undefined,
        limite: query.limite ? Math.min(Number(query.limite), 100) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      };

      const resultado = parceirosService.listarOperacoes(sessao.parceiroId, filtros);

      return reply.send({
        sucesso: true,
        total: resultado.total,
        dados: resultado.itens,
      });
    }
  );

  app.get(
    "/api/v1/parceiro/operacoes/:id",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const { id } = request.params as { id: string };

      const operacao = parceirosService.obterDetalheOperacao(id, sessao.parceiroId);

      return reply.send({
        sucesso: true,
        dados: operacao,
      });
    }
  );

  app.post(
    "/api/v1/parceiro/operacoes/:id/confirmar-recepcao",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const { id } = request.params as { id: string };
      const body = ConfirmarRecepcaoSchema.parse(request.body || {});

      const operador = {
        id: sessao.usuarioParceiroId,
        nome: sessao.usuarioNome,
        funcao: sessao.usuarioFuncao,
      };

      const opAtualizada = parceirosService.confirmarRecepcao(
        id,
        sessao.parceiroId,
        operador,
        body.notas,
        request.ip
      );

      return reply.send({
        sucesso: true,
        mensagem: "Recepção da instrução confirmada com sucesso.",
        dados: opAtualizada,
      });
    }
  );

  app.post(
    "/api/v1/parceiro/operacoes/:id/liquidar",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const { id } = request.params as { id: string };
      const dados = LiquidarOperacaoSchema.parse(request.body);

      const operador = {
        id: sessao.usuarioParceiroId,
        nome: sessao.usuarioNome,
        funcao: sessao.usuarioFuncao,
      };

      const opLiquidada = parceirosService.liquidarOperacao(
        id,
        sessao.parceiroId,
        operador,
        dados,
        request.ip
      );

      return reply.send({
        sucesso: true,
        mensagem: "Operação liquidada com sucesso pelo parceiro.",
        dados: opLiquidada,
      });
    }
  );

  app.post(
    "/api/v1/parceiro/operacoes/:id/devolver",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const { id } = request.params as { id: string };
      const dados = DevolverOperacaoSchema.parse(request.body);

      const operador = {
        id: sessao.usuarioParceiroId,
        nome: sessao.usuarioNome,
        funcao: sessao.usuarioFuncao,
      };

      const opDevolvida = parceirosService.devolverOperacao(
        id,
        sessao.parceiroId,
        operador,
        dados,
        request.ip
      );

      return reply.send({
        sucesso: true,
        mensagem: "Operação devolvida para correção da equipa NZAIDI.",
        dados: opDevolvida,
      });
    }
  );

  // ==========================================
  // RECONCILIAÇÃO DO PARCEIRO
  // ==========================================

  app.post(
    "/api/v1/parceiro/reconciliacao/processar",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const dados = SubmeterLoteReconciliacaoSchema.parse(request.body);

      const operador = {
        id: sessao.usuarioParceiroId,
        nome: sessao.usuarioNome,
        funcao: sessao.usuarioFuncao,
      };

      const relatorio = parceirosService.processarReconciliacao(
        sessao.parceiroId,
        operador,
        dados,
        request.ip
      );

      return reply.send({
        sucesso: true,
        mensagem: "Reconciliação de lote processada com sucesso.",
        dados: relatorio,
      });
    }
  );

  app.get(
    "/api/v1/parceiro/reconciliacao/historico",
    { preHandler: [exigirParceiroAutenticado] },
    async (request, reply) => {
      const sessao = request.parceiroSessao!;
      const historico = parceirosService.listarHistoricoReconciliacao(sessao.parceiroId);

      return reply.send({
        sucesso: true,
        dados: historico,
      });
    }
  );

  // ==========================================
  // GESTÃO ADMINISTRATIVA DE PARCEIROS (ADMIN)
  // ==========================================

  app.get(
    "/api/v1/admin/parceiros",
    { preHandler: [exigirPermissao("usuarios:consultar")] },
    async (_request, reply) => {
      const parceiros = parceirosService.listarParceirosAdministracao();
      return reply.send({
        sucesso: true,
        dados: parceiros,
      });
    }
  );

  app.post(
    "/api/v1/admin/parceiros",
    { preHandler: [exigirPermissao("usuarios:gerir")] },
    async (request, reply) => {
      const dados = CriarParceiroSchema.parse(request.body);
      const operador = request.usuario!;

      const criado = await parceirosService.criarParceiroAdministracao(
        dados,
        operador,
        request.ip
      );

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Entidade parceira criada com sucesso.",
        dados: criado,
      });
    }
  );

  app.get(
    "/api/v1/admin/parceiros/:id",
    { preHandler: [exigirPermissao("usuarios:consultar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parceiro = parceirosService.obterParceiroAdministracao(id);

      return reply.send({
        sucesso: true,
        dados: parceiro,
      });
    }
  );

  app.put(
    "/api/v1/admin/parceiros/:id",
    { preHandler: [exigirPermissao("usuarios:gerir")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const dados = EditarParceiroSchema.parse(request.body);
      const operador = request.usuario!;

      const atualizado = parceirosService.editarParceiroAdministracao(
        id,
        dados,
        operador,
        request.ip
      );

      return reply.send({
        sucesso: true,
        mensagem: "Dados do parceiro atualizados com sucesso.",
        dados: atualizado,
      });
    }
  );

  app.patch(
    "/api/v1/admin/parceiros/:id/status",
    { preHandler: [exigirPermissao("usuarios:gerir")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const dados = AlterarStatusParceiroSchema.parse(request.body);
      const operador = request.usuario!;

      const alterado = parceirosService.alterarStatusParceiro(
        id,
        dados.estado,
        operador,
        request.ip
      );

      return reply.send({
        sucesso: true,
        mensagem: `Estado do parceiro alterado para '${dados.estado}'.`,
        dados: alterado,
      });
    }
  );

  app.post(
    "/api/v1/admin/parceiros/:id/atribuir-remessa",
    { preHandler: [exigirPermissao("operacoes:registar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const dados = AtribuirRemessaParceiroSchema.parse(request.body);
      const operador = request.usuario!;

      const op = parceirosService.atribuirRemessaAoParceiro(
        id,
        dados.remessaId,
        dados.canal,
        operador,
        request.ip
      );

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Remessa atribuída com sucesso ao parceiro comercial.",
        dados: op,
      });
    }
  );

  app.post(
    "/api/v1/admin/parceiros/:id/impersonar",
    { preHandler: [exigirPermissao("clientes:impersonar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operador = request.usuario!;
      const ip = request.ip;
      const userAgent = request.headers["user-agent"];

      const resultado = parceirosService.impersonarParceiro(
        id,
        operador,
        ip,
        userAgent
      );

      reply.setCookie(COOKIE_PARCEIRO, resultado.token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400,
      });

      return reply.send({
        sucesso: true,
        dados: {
          parceiro: resultado.parceiro,
          usuario: resultado.usuario,
          token: resultado.token,
          redirectUrl: "/parceiro/#/dashboard",
        },
      });
    }
  );
}
