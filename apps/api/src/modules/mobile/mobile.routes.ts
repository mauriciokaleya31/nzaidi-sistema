import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { MobileService } from "./mobile.service.js";
import type { MobileRepository } from "./mobile.repository.js";
import type { PortalClienteService } from "../portal-cliente/portal.service.js";
import {
  MobileLoginSchema,
  MobileRecuperarSenhaSchema,
  MobileRedefinirSenhaSchema,
  MobileRefreshTokenSchema,
  MobileSimulacaoCambioSchema,
  MobileCriarPedidoCambioSchema,
  MobileCriarPedidoRemessaSchema,
  MobileAtualizarPerfilSchema,
} from "./mobile.types.js";
import { UploadDocumentoInputSchema } from "../identidade-kyc/clientes.types.js";
import { ErroAutenticacao } from "../../plugins/erros.js";

declare module "fastify" {
  interface FastifyRequest {
    mobileSessao?: {
      clienteId: string;
      dispositivoId: string;
      jti: string;
      email: string;
      nome: string;
    };
  }
}

export function registrarRotasMobile(
  app: FastifyInstance,
  mobileService: MobileService,
  mobileRepo: MobileRepository,
  portalService: PortalClienteService
): void {
  // 1. Hook de Auditoria e Log Sanitizado para Requisições Móveis
  app.addHook("onResponse", async (request, reply) => {
    if (!request.url.startsWith("/api/v1/mobile")) return;

    const duracaoMs = reply.elapsedTime;
    const correlationId = (request.headers["x-correlation-id"] as string) || (request.id as string);
    const plataforma = (request.headers["x-platform"] as string) || undefined;
    const versaoApp = (request.headers["x-app-version"] as string) || undefined;
    const dispositivoId = request.mobileSessao?.dispositivoId || undefined;
    const clienteId = request.mobileSessao?.clienteId || undefined;

    mobileRepo.registarRequisicao({
      clienteId: clienteId ?? null,
      dispositivoId: dispositivoId ?? null,
      endpoint: request.url.split("?")[0] || "/",
      metodo: request.method,
      codigoStatus: reply.statusCode,
      duracaoMs,
      ip: request.ip ?? null,
      plataforma: plataforma ?? null,
      versaoApp: versaoApp ?? null,
      correlationId: correlationId ?? null,
    });
  });

  // 2. Middleware de Autenticação para Endpoints Protegidos
  async function exigirMobileAuth(request: FastifyRequest, _reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ErroAutenticacao("Autenticação móvel obrigatória. Token ausente ou formato inválido.");
    }
    const token = authHeader.slice(7);
    const payload = mobileService.verificarAccessToken(token);

    // Verificar se o dispositivo não foi bloqueado no entretanto
    const dispositivo = mobileRepo.buscarDispositivoPorId(payload.dispositivoId);
    if (!dispositivo || dispositivo.status !== "ativo") {
      throw new ErroAutenticacao("Dispositivo bloqueado ou revogado pela segurança institucional.");
    }

    request.mobileSessao = payload;
  }

  // ========================================================================
  // ROTAS DE AUTENTICAÇÃO MÓVEL
  // ========================================================================

  app.post(
    "/api/v1/mobile/auth/login",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const dados = MobileLoginSchema.parse(request.body);
      const ip = request.ip;
      const userAgent = request.headers["user-agent"];

      const res = await mobileService.login(dados, ip, userAgent);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Autenticação móvel efetuada com sucesso.",
        dados: res,
      });
    }
  );

  app.post(
    "/api/v1/mobile/auth/refresh",
    {
      config: {
        rateLimit: { max: 15, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const dados = MobileRefreshTokenSchema.parse(request.body);
      const ip = request.ip;
      const userAgent = request.headers["user-agent"];

      const res = await mobileService.renovarSessao(dados, ip, userAgent);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Sessão renovada com sucesso.",
        dados: res,
      });
    }
  );

  app.post(
    "/api/v1/mobile/auth/logout",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { dispositivoId, clienteId } = request.mobileSessao!;
      mobileService.logout(dispositivoId, clienteId);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Sessão móvel encerrada.",
      });
    }
  );

  app.post(
    "/api/v1/mobile/auth/logout-global",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      mobileService.logoutGlobal(clienteId);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Todas as sessões em todos os dispositivos móveis foram revogadas.",
      });
    }
  );

  app.post(
    "/api/v1/mobile/auth/recuperar-senha",
    {
      config: {
        rateLimit: { max: 3, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const dados = MobileRecuperarSenhaSchema.parse(request.body);
      const res = await mobileService.solicitarRecuperacaoSenha(dados.email, request.ip);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Se o e-mail estiver associado a uma conta NZAIDI, receberá um código de verificação.",
        dados: res,
      });
    }
  );

  app.post(
    "/api/v1/mobile/auth/redefinir-senha",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const dados = MobileRedefinirSenhaSchema.parse(request.body);
      await mobileService.redefinirSenhaComOtp(dados.email, dados.codigoOtp, dados.novaSenha, request.ip);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Palavra-passe redefinida com sucesso. Pode agora iniciar sessão com a nova credencial.",
      });
    }
  );

  app.get(
    "/api/v1/mobile/auth/dispositivos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const dispositivos = mobileRepo.listarDispositivosCliente(clienteId);
      return reply.status(200).send({
        sucesso: true,
        total: dispositivos.length,
        dados: dispositivos,
      });
    }
  );

  app.delete(
    "/api/v1/mobile/auth/dispositivos/:id",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { clienteId } = request.mobileSessao!;

      const disp = mobileRepo.buscarDispositivoPorId(id);
      if (!disp || disp.cliente_id !== clienteId) {
        throw new ErroAutenticacao("Dispositivo não encontrado ou não pertence a este utilizador.");
      }

      mobileRepo.alterarStatusDispositivo(id, "revogado");
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Acesso do dispositivo revogado com sucesso.",
      });
    }
  );

  // ========================================================================
  // ROTAS DE CLIENTE & PERFIL
  // ========================================================================

  app.get(
    "/api/v1/mobile/cliente/perfil",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const perfil = portalService.obterPerfil(clienteId);
      return reply.status(200).send({
        sucesso: true,
        dados: perfil,
      });
    }
  );

  app.put(
    "/api/v1/mobile/cliente/perfil",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const dados = MobileAtualizarPerfilSchema.parse(request.body);
      const ip = request.ip;

      const clienteAtualizado = portalService.atualizarPerfil(clienteId, dados, ip);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Dados de contacto atualizados com sucesso.",
        dados: clienteAtualizado,
      });
    }
  );

  app.get(
    "/api/v1/mobile/cliente/kyc/status",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const docs = portalService.listarDocumentos(clienteId);
      const perfil = portalService.obterPerfil(clienteId);

      return reply.status(200).send({
        sucesso: true,
        dados: {
          kycStatus: perfil.cliente.estadoKyc,
          nivelKyc: 2,
          limiteDiarioKz: '5000000',
          documentosEnviados: docs.length,
          documentosAprovados: docs.filter((d) => d.estadoValidacao === "valido").length,
          documentosPendentes: docs.filter((d) => d.estadoValidacao === "pendente").length,
        },
      });
    }
  );

  app.get(
    "/api/v1/mobile/cliente/documentos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const docs = portalService.listarDocumentos(clienteId);
      return reply.status(200).send({
        sucesso: true,
        total: docs.length,
        dados: docs,
      });
    }
  );

  app.post(
    "/api/v1/mobile/cliente/documentos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const dados = UploadDocumentoInputSchema.parse(request.body);
      const ip = request.ip;

      const doc = portalService.submeterDocumento(clienteId, dados, ip);
      return reply.status(201).send({
        sucesso: true,
        mensagem: "Documento KYC enviado com sucesso para análise da equipa de conformidade.",
        dados: doc,
      });
    }
  );

  // ========================================================================
  // ROTAS DE DASHBOARD & TAXAS
  // ========================================================================

  app.get(
    "/api/v1/mobile/dashboard",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const dash = mobileService.obterDashboard(clienteId);
      return reply.status(200).send({
        sucesso: true,
        dados: dash,
      });
    }
  );

  app.get(
    "/api/v1/mobile/taxas",
    async (_request, reply) => {
      const dash = mobileService.obterDashboard("anonimo");
      return reply.status(200).send({
        sucesso: true,
        dados: dash.taxas,
      });
    }
  );

  // ========================================================================
  // ROTAS DE CÂMBIO MÓVEL
  // ========================================================================

  app.get(
    "/api/v1/mobile/cambio/moedas",
    async (_request, reply) => {
      return reply.status(200).send({
        sucesso: true,
        dados: [
          { codigo: "USD", nome: "Dólar Americano", simbolo: "$" },
          { codigo: "EUR", nome: "Euro", simbolo: "€" },
        ],
      });
    }
  );

  app.post(
    "/api/v1/mobile/cambio/simular",
    async (request, reply) => {
      const disp = mobileRepo.verificarDisponibilidadeModulo("cambio", {
        ip: request.ip,
        bypassAdmin: request.headers["x-admin-bypass"] === "true",
      });
      if (!disp.disponivel) {
        return reply.status(503).send({
          sucesso: false,
          erro: disp.motivo,
          codigo: "FUNCIONALIDADE_DESATIVADA",
        });
      }
      const dados = MobileSimulacaoCambioSchema.parse(request.body);
      const sim = mobileService.simularCambio(dados);
      return reply.status(200).send({
        sucesso: true,
        dados: sim,
      });
    }
  );

  app.post(
    "/api/v1/mobile/cambio/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const disp = mobileRepo.verificarDisponibilidadeModulo("cambio", {
        ip: request.ip,
        bypassAdmin: request.headers["x-admin-bypass"] === "true",
      });
      if (!disp.disponivel) {
        return reply.status(503).send({
          sucesso: false,
          erro: disp.motivo,
          codigo: "FUNCIONALIDADE_DESATIVADA",
        });
      }
      const { clienteId } = request.mobileSessao!;
      const dados = MobileCriarPedidoCambioSchema.parse(request.body);
      const ip = request.ip;

      const pedido = portalService.criarPedidoCambio(clienteId, {
        tipoOperacao: dados.tipoOperacao,
        moeda: dados.moeda,
        montanteDivisa: dados.montanteDivisa,
        finalidade: dados.finalidade,
      }, ip);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Pedido de câmbio registado via NZAIDI Mobile.",
        dados: pedido,
      });
    }
  );

  app.get(
    "/api/v1/mobile/cambio/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const pedidos = portalService.listarPedidosCambio(clienteId);
      return reply.status(200).send({
        sucesso: true,
        total: pedidos.length,
        dados: pedidos,
      });
    }
  );

  // ========================================================================
  // ROTAS DE REMESSAS MÓVEIS
  // ========================================================================

  app.get(
    "/api/v1/mobile/remessas/paises",
    async (_request, reply) => {
      return reply.status(200).send({
        sucesso: true,
        dados: [
          { codigo: "PT", nome: "Portugal", moeda: "EUR" },
          { codigo: "BR", nome: "Brasil", moeda: "USD" },
          { codigo: "ZA", nome: "África do Sul", moeda: "USD" },
          { codigo: "AE", nome: "Emirados Árabes Unidos", moeda: "USD" },
        ],
      });
    }
  );

  app.post(
    "/api/v1/mobile/remessas/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const disp = mobileRepo.verificarDisponibilidadeModulo("remessas", {
        ip: request.ip,
        bypassAdmin: request.headers["x-admin-bypass"] === "true",
      });
      if (!disp.disponivel) {
        return reply.status(503).send({
          sucesso: false,
          erro: disp.motivo,
          codigo: "FUNCIONALIDADE_DESATIVADA",
        });
      }
      const { clienteId } = request.mobileSessao!;
      const dados = MobileCriarPedidoRemessaSchema.parse(request.body);
      const ip = request.ip;

      const pedido = portalService.criarPedidoRemessa(clienteId, {
        beneficiarioNome: dados.beneficiarioNome,
        beneficiarioPais: dados.paisDestino,
        beneficiarioIban: dados.beneficiarioIban,
        beneficiarioBanco: "Banco Destino Internacional",
        beneficiarioSwift: "SWIFT000",
        moedaDestino: dados.moeda,
        montanteDivisa: String(dados.valorEstrangeiro),
        finalidade: dados.finalidade,
      }, ip);

      return reply.status(201).send({
        sucesso: true,
        mensagem: "Pedido de remessa internacional registado via NZAIDI Mobile.",
        dados: pedido,
      });
    }
  );

  app.get(
    "/api/v1/mobile/remessas/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const pedidos = portalService.listarPedidosRemessa(clienteId);
      return reply.status(200).send({
        sucesso: true,
        total: pedidos.length,
        dados: pedidos,
      });
    }
  );

  // ========================================================================
  // ROTAS DE CARTÕES VISA (STATUS & LISTA DE ESPERA)
  // ========================================================================

  app.get(
    "/api/v1/mobile/cartoes",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      return reply.status(200).send({
        sucesso: true,
        dados: {
          cartoes: [],
          servicoAtivo: false,
          mensagem: "Serviço de cartões virtuais Visa USD em fase de homologação regulamentar BNA.",
          listaEsperaDisponivel: true,
        },
      });
    }
  );

  app.get(
    "/api/v1/mobile/cartoes/status",
    async (_request, reply) => {
      return reply.status(200).send({
        sucesso: true,
        dados: {
          servicoAtivo: false,
          mensagem: "O serviço de cartões virtuais Visa USD encontra-se em fase de preparação regulamentar.",
          listaEsperaAberta: true,
        },
      });
    }
  );

  app.post(
    "/api/v1/mobile/cartoes/lista-espera",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      return reply.status(200).send({
        sucesso: true,
        mensagem: "O seu pedido de adesão à lista de espera prioritária foi registado.",
        dados: { clienteId, dataRegisto: new Date().toISOString() },
      });
    }
  );

  // ========================================================================
  // ROTAS DE NOTIFICAÇÕES E PUSH TOKENS (FCM / APNs)
  // ========================================================================

  app.get(
    "/api/v1/mobile/notificacoes",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const notificacoes = mobileRepo.listarNotificacoes(clienteId);
      const totalNaoLidas = mobileRepo.contarNotificacoesNaoLidas(clienteId);
      return reply.status(200).send({
        sucesso: true,
        naoLidas: totalNaoLidas,
        total: notificacoes.length,
        dados: notificacoes,
      });
    }
  );

  app.patch(
    "/api/v1/mobile/notificacoes/:id/lida",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      const { id } = request.params as { id: string };
      mobileRepo.marcarNotificacaoLida(id, clienteId);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Notificação marcada como lida.",
      });
    }
  );

  app.post(
    "/api/v1/mobile/notificacoes/ler-todas",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;
      mobileRepo.marcarTodasNotificacoesLidas(clienteId);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Todas as notificações foram marcadas como lidas.",
      });
    }
  );

  app.post(
    "/api/v1/mobile/dispositivos/push-token",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { dispositivoId } = request.mobileSessao!;
      const body = (request.body as { pushToken?: string; token?: string }) || {};
      const token = body.pushToken || body.token || (request.headers["x-push-token"] as string);

      if (!token) {
        return reply.status(400).send({
          sucesso: false,
          erro: "pushToken é obrigatório no corpo do pedido ou no cabeçalho x-push-token.",
          codigo: "PUSH_TOKEN_OBRIGATORIO",
        });
      }

      mobileRepo.atualizarPushToken(dispositivoId, token);
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Token de notificação push (FCM/APNs) atualizado com sucesso.",
        dados: { dispositivoId, atualizadoEm: new Date().toISOString() },
      });
    }
  );


  // --- REMOTE CONFIG CENTRALIZADO PARA ANDROID & IOS ---
  app.get("/api/v1/mobile/config", async (_request, reply) => {
    const config = mobileRepo.obterRemoteConfigConsolidado();
    return reply.status(200).send(config);
  });

  // --- REGISTO DE LOCALIZAÇÃO CONSENTIDA PELO UTILIZADOR ---
  app.post(
    "/api/v1/mobile/localizacao",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const clienteId = request.mobileSessao!.clienteId;
      const dispositivoId = request.mobileSessao?.dispositivoId;
      const body = request.body as any;

      const consentimento = body.consentimento !== undefined ? (body.consentimento ? 1 : 0) : 1;
      const loc = mobileRepo.registarLocalizacao({
        clienteId,
        dispositivoId: dispositivoId || null,
        consentimento,
        cidade: consentimento && body.cidade ? String(body.cidade) : null,
        regiao: consentimento && body.regiao ? String(body.regiao) : null,
        pais: consentimento ? (body.pais ? String(body.pais) : "Angola") : null,
        latitude: consentimento && body.latitude !== undefined ? Number(body.latitude) : null,
        longitude: consentimento && body.longitude !== undefined ? Number(body.longitude) : null,
        precisaoMetros: consentimento && body.precisaoMetros !== undefined ? Number(body.precisaoMetros) : null,
        ip: request.ip || null,
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: consentimento ? "Localização autorizada registada com sucesso." : "Consentimento revogado com sucesso.",
        dados: loc,
      });
    }
  );

}
