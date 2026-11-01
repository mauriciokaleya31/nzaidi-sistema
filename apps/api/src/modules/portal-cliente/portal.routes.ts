import {
  gerarSegredoBase32,
  gerarUriTotp,
  gerarSvgQrCode,
  verificarCodigoTotp,
  gerarCodigosRecuperacao,
  verificarCodigoRecuperacao,
} from "../autenticacao/totp.js";
import { verificarSenha } from "../autenticacao/hash.js";
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

    // Verificar se a conta tem 2FA ativado
    const cred = portalRepo.buscarCredencialCompletaPorEmail(dados.email);
    if (cred && cred.dois_fatores_ativo === 1) {
      const senhaValida = await verificarSenha(dados.senha, cred.senha_hash);
      if (!senhaValida) {
        throw new ErroAutenticacao("Credenciais inválidas. Verifique o e-mail e a palavra-passe.");
      }
      // Gerar preAuthToken temporário (5 minutos)
      const preAuthToken = Buffer.from(JSON.stringify({
        clienteId: cred.cliente_id,
        email: cred.email,
        exp: Date.now() + 5 * 60 * 1000
      })).toString("base64url");

      return reply.status(200).send({
        sucesso: true,
        requer2fa: true,
        mensagem: "Autenticação de dois factores necessária. Introduza o código gerado pela sua aplicação.",
        dados: { preAuthToken },
      });
    }

    const resultado = await portalService.loginCliente(dados, ip, userAgent);

    reply.setCookie(COOKIE_NOME, resultado.token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
    });

    return reply.status(200).send({
      sucesso: true,
      mensagem: "Autenticação bem-sucedida.",
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

  // 4.1 Atualizar Perfil e Dados de Contacto / Foto
  app.put(
    "/api/v1/portal/perfil",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const Schema = z.object({
        telefone: z.string().min(6).optional(),
        email: z.string().email().optional(),
        morada: z.string().min(3).optional(),
        profissao: z.string().optional(),
        entidadeEmpregadora: z.string().optional(),
        avatarUrl: z.string().optional(),
      });
      const dados = Schema.parse(request.body);
      const clienteAtualizado = portalService.atualizarPerfil(clienteId, dados, request.ip);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Perfil atualizado com sucesso.",
        dados: clienteAtualizado,
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

  // ========================================================================
  // PERMISSÕES DE SESSÃO & SEGURANÇA
  // ========================================================================

  app.get(
    "/api/v1/portal/perfil/permissoes",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const permissoes = portalRepo.obterPermissoesSessao(clienteId);
      return reply.status(200).send({
        sucesso: true,
        dados: permissoes,
      });
    }
  );

  app.put(
    "/api/v1/portal/perfil/permissoes",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const Schema = z.object({
        permitirCambioOnline: z.boolean().optional(),
        permitirRemessasOnline: z.boolean().optional(),
        exigir2faOperacoes: z.boolean().optional(),
        notificarLoginNovoDispositivo: z.boolean().optional(),
        manterSessaoAtiva: z.boolean().optional(),
      });
      const permissoes = Schema.parse(request.body);
      portalRepo.salvarPermissoesSessao(clienteId, permissoes);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Permissões de sessão atualizadas e guardadas com sucesso.",
        dados: portalRepo.obterPermissoesSessao(clienteId),
      });
    }
  );

  app.post(
    "/api/v1/portal/auth/terminar-outras-sessoes",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId, token } = request.clienteSessao!;
      const totalEncerradas = portalRepo.terminarOutrasSessoes(clienteId, token);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Todas as restantes sessões ativas foram encerradas com sucesso.",
        dados: { totalEncerradas },
      });
    }
  );

  // ========================================================================
  // ATUALIZAÇÃO DE FOTOGRAFIA DE PERFIL
  // ========================================================================

  app.post(
    "/api/v1/portal/perfil/avatar",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const Schema = z.object({
        imagemBase64: z.string().min(20, "Imagem inválida"),
        tipoMime: z.enum(["image/png", "image/jpeg", "image/webp"]),
      });
      const { imagemBase64, tipoMime } = Schema.parse(request.body);

      // Validar tamanho máximo (2 MB em base64 ≈ 2.8 MB texto)
      if (imagemBase64.length > 3_000_000) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: "A fotografia não pode exceder 2 MB.",
        });
      }

      const avatarUrl = imagemBase64.startsWith("data:")
        ? imagemBase64
        : `data:${tipoMime};base64,${imagemBase64}`;

      portalRepo.atualizarAvatarCliente(clienteId, avatarUrl);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Fotografia de perfil atualizada com sucesso.",
        dados: { avatarUrl },
      });
    }
  );

  // ========================================================================
  // AUTENTICAÇÃO DE DOIS FACTORES (2FA TOTP)
  // ========================================================================

  app.post(
    "/api/v1/portal/auth/2fa/configurar",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const cred = portalRepo.buscarCredencialCompletaPorId(clienteId);
      if (!cred) throw new ErroAutenticacao("Conta não localizada.");

      const segredoBase32 = gerarSegredoBase32(20);
      const uri = gerarUriTotp(cred.email, segredoBase32, "NZAIDI Câmbios");
      const qrCodeSvg = gerarSvgQrCode(uri);
      const { codigosTexto, hashes } = gerarCodigosRecuperacao(8);

      portalRepo.salvarConfiguracao2fa(clienteId, segredoBase32, hashes);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Configuração de 2FA gerada com sucesso.",
        dados: {
          segredoBase32,
          uri,
          qrCodeSvg,
          codigosRecuperacao: codigosTexto,
        },
      });
    }
  );

  app.post(
    "/api/v1/portal/auth/2fa/ativar",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const { codigoTotp } = z.object({ codigoTotp: z.string().length(6) }).parse(request.body);

      const cred = portalRepo.buscarCredencialCompletaPorId(clienteId);
      if (!cred || !cred.dois_fatores_segredo) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: "Configure primeiro a autenticação de dois factores antes de ativar.",
        });
      }

      const valido = verificarCodigoTotp(cred.dois_fatores_segredo, codigoTotp);
      if (!valido) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: "Código de confirmação incorreto ou expirado. Tente novamente.",
        });
      }

      portalRepo.ativar2fa(clienteId);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Autenticação de dois factores (2FA) ativada com sucesso.",
      });
    }
  );

  app.post(
    "/api/v1/portal/auth/2fa/desativar",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const { senha } = z.object({ senha: z.string().min(1) }).parse(request.body);

      const cred = portalRepo.buscarCredencialCompletaPorId(clienteId);
      if (!cred) throw new ErroAutenticacao("Conta não localizada.");

      const senhaValida = await verificarSenha(senha, cred.senha_hash);
      if (!senhaValida) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: "Palavra-passe incorreta. Não foi possível desativar o 2FA.",
        });
      }

      portalRepo.desativar2fa(clienteId);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Autenticação de dois factores desativada.",
      });
    }
  );

  app.post(
    "/api/v1/portal/auth/2fa/validar",
    async (request, reply) => {
      const Schema = z.object({
        preAuthToken: z.string().min(10),
        codigo: z.string().min(6),
      });
      const { preAuthToken, codigo } = Schema.parse(request.body);

      let payload: { clienteId: string; email: string; exp: number };
      try {
        payload = JSON.parse(Buffer.from(preAuthToken, "base64url").toString("utf-8"));
      } catch {
        throw new ErroAutenticacao("Token de pré-autenticação inválido ou corrompido.");
      }

      if (Date.now() > payload.exp) {
        throw new ErroAutenticacao("A validação do 2FA expirou. Inicie sessão novamente.");
      }

      const cred = portalRepo.buscarCredencialCompletaPorId(payload.clienteId);
      if (!cred || cred.dois_fatores_ativo !== 1 || !cred.dois_fatores_segredo) {
        throw new ErroAutenticacao("2FA não está configurado para esta conta.");
      }

      // 1. Tentar validar via TOTP
      let valido = false;
      if (codigo.length === 6) {
        valido = verificarCodigoTotp(cred.dois_fatores_segredo, codigo);
      }

      // 2. Se falhar e tiver formato de backup, tentar validar com código de recuperação
      if (!valido && cred.dois_fatores_backup_codigos) {
        try {
          const hashes: string[] = JSON.parse(cred.dois_fatores_backup_codigos);
          const verifBackup = verificarCodigoRecuperacao(codigo, hashes);
          if (verifBackup.valido && verifBackup.hashUsado) {
            valido = true;
            portalRepo.consumirCodigoBackup(payload.clienteId, verifBackup.hashUsado);
          }
        } catch {
          // Ignorar erro
        }
      }

      if (!valido) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: "Código de autenticação ou de recuperação inválido.",
        });
      }

      // Emitir sessão definitiva
      const sessao = portalRepo.criarSessao(
        payload.clienteId,
        Buffer.from(crypto.randomUUID()).toString("hex"),
        24,
        request.ip,
        request.headers["user-agent"]
      );

      reply.setCookie(COOKIE_NOME, sessao.tokenHash, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400,
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Autenticação 2FA concluída com sucesso.",
        dados: { token: sessao.tokenHash },
      });
    }
  );

  // ========================================================================
  // NOTIFICAÇÕES DO CLIENTE
  // ========================================================================

  app.get(
    "/api/v1/portal/notificacoes",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const notificacoes = portalRepo.listarNotificacoesCliente(clienteId, 30);
      const naoLidas = notificacoes.filter((n) => !n.lida).length;

      return reply.status(200).send({
        sucesso: true,
        total: notificacoes.length,
        naoLidas,
        dados: notificacoes,
      });
    }
  );

  app.put(
    "/api/v1/portal/notificacoes/:id/lida",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      const { id } = request.params as { id: string };
      portalRepo.marcarNotificacaoLida(id, clienteId);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Notificação marcada como lida.",
      });
    }
  );

  app.put(
    "/api/v1/portal/notificacoes/todas-lidas",
    { preHandler: [exigirClienteAutenticado] },
    async (request, reply) => {
      const { clienteId } = request.clienteSessao!;
      portalRepo.marcarTodasNotificacoesLidas(clienteId);

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Todas as notificações foram marcadas como lidas.",
      });
    }
  );

}
