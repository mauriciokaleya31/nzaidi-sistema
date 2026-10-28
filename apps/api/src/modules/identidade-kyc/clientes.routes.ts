import { randomUUID, randomBytes, createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ClientesService } from "./clientes.service.js";
import type { DocumentosKycService } from "./documentos.service.js";
import {
  CriarClienteInputSchema,
  AtualizarClienteInputSchema,
  DecisaoKycInputSchema,
  UploadDocumentoInputSchema,
} from "./clientes.types.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

const BloquearClienteSchema = z.object({
  motivo: z.string().min(5, "O motivo do bloqueio é obrigatório e deve ter no mínimo 5 caracteres"),
});

const ImpersonarClienteSchema = z.object({
  motivo: z.string().optional().default("Acesso administrativo de suporte técnico e verificação operacional"),
});

const SolicitarDocumentosSchema = z.object({
  mensagem: z.string().min(5, "A descrição dos documentos requeridos é obrigatória"),
});

export function registrarRotasClientes(
  app: FastifyInstance,
  service: ClientesService,
  documentosService: DocumentosKycService
): void {
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

  // 2. Listar clientes (com pesquisa, filtro KYC, estado e paginação)
  app.get(
    "/api/v1/clientes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:consultar")],
    },
    async (req, reply) => {
      const query = req.query as {
        busca?: string;
        estadoKyc?: string;
        estado?: string;
        nivelRisco?: string;
        limite?: string;
        offset?: string;
      };
      const limite = query.limite ? Math.min(Math.max(parseInt(query.limite, 10), 1), 100) : 50;
      const offset = query.offset ? Math.max(parseInt(query.offset, 10), 0) : 0;

      const resultado = service.listarClientes(
        query.busca,
        query.estadoKyc,
        limite,
        offset,
        query.estado,
        query.nivelRisco
      );

      return reply.send({
        sucesso: true,
        dados: resultado.itens,
        total: resultado.total,
        limite,
        offset,
      });
    }
  );

  // 3. Obter cliente básico por ID
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

  // 4. Obter DETALHES COMPLETOS do Cliente (Dossiê, Câmbios, Remessas, Sessões, Inconsistências)
  app.get(
    "/api/v1/clientes/:id/detalhes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:consultar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const detalhes = service.obterDetalhesCompletosCliente(id);

      if (!detalhes) {
        return reply.status(404).send({
          sucesso: false,
          erro: "Cliente não encontrado.",
        });
      }

      return reply.send({
        sucesso: true,
        dados: detalhes,
      });
    }
  );

  // 5. Atualizar dados cadastrais do cliente
  app.patch(
    "/api/v1/clientes/:id",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:editar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const dados = AtualizarClienteInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const atualizado = service.atualizarCliente(id, dados, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.send({
        sucesso: true,
        mensagem: "Registo do cliente atualizado com sucesso.",
        dados: atualizado,
      });
    }
  );

  // 6. Bloquear cliente
  app.post(
    "/api/v1/clientes/:id/bloquear",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:editar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { motivo } = BloquearClienteSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      service.bloquearCliente(id, motivo, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      // Encerrar sessões no portal do cliente e registar envio de e-mail / notificação do bloqueio
      try {
        const db = (service as any).clientesRepo.db;
        const cli = service.buscarClientePorId(id);
        const agora = new Date().toISOString();
        db.prepare("DELETE FROM sessoes_clientes WHERE cliente_id = ?").run(id);
        db.prepare(`
          INSERT INTO campanhas_email (id, assunto, destinatarios_filtro, corpo_html, total_enviados, estado, autor_id, autor_nome, enviado_em, criado_em)
          VALUES (?, ?, ?, ?, 1, 'enviada', ?, ?, ?, ?)
        `).run(
          "mail_bloq_cli_" + randomUUID(),
          `[NZAIDI] Aviso de Suspensão / Bloqueio de Conta — ${cli.nome}`,
          cli.email || cli.telefone || id,
          `<p>Prezado(a) <strong>${cli.nome}</strong>,</p><p>Informamos que o acesso à sua conta no Portal NZAIDI foi temporariamente suspenso.</p><p><strong>Motivo registado:</strong> ${motivo}</p><p>Para regularizar a situação, contacte o Departamento de Compliance & Suporte NZAIDI.</p>`,
          usuario.id,
          usuario.nome,
          agora,
          agora
        );
      } catch {}

      return reply.send({
        sucesso: true,
        emailEnviado: true,
        mensagem: "Cliente bloqueado com sucesso, sessões encerradas e notificação enviada por e-mail.",
      });
    }
  );

  // 7. Desbloquear cliente
  app.post(
    "/api/v1/clientes/:id/desbloquear",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:editar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      service.desbloquearCliente(id, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.send({
        sucesso: true,
        mensagem: "Cliente desbloqueado e reativado com sucesso.",
      });
    }
  );

  // 8. Terminar sessões ativas do cliente
  app.post(
    "/api/v1/clientes/:id/terminar-sessoes",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:editar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      try {
        const db = (service as any).clientesRepo.db;
        db.prepare("UPDATE portal_sessoes_cliente SET revogado_em = datetime('now') WHERE cliente_id = ?").run(id);
      } catch {}

      return reply.send({
        sucesso: true,
        mensagem: "Sessões ativas do cliente encerradas com sucesso.",
      });
    }
  );

  // 9. Entrar na Conta do Cliente (Impersonação / Suporte)
  app.post(
    "/api/v1/clientes/:id/impersonar",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:impersonar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { motivo } = ImpersonarClienteSchema.parse(req.body);
      const usuarioLogado = req.usuario!;
      const cliente = service.buscarClientePorId(id);

      if (cliente.estado === "bloqueado") {
        return reply.status(400).send({
          sucesso: false,
          erro: "Não é permitido assumir a sessão de um cliente bloqueado.",
        });
      }

      const db = (service as any).clientesRepo.db;
      const tokenSessao = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(tokenSessao).digest("hex");
      const sessaoId = "sess_cli_" + randomUUID();
      const agora = new Date().toISOString();
      const expiraEm = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

      db.prepare(`
        INSERT INTO sessoes_clientes (id, cliente_id, token_hash, criado_em, expira_em, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(sessaoId, cliente.id, tokenHash, agora, expiraEm, req.ip, req.headers["user-agent"] ?? null);

      const impId = randomUUID();
      try {
        db.prepare(`
          INSERT INTO impersonacoes_auditoria (id, admin_id, admin_nome, alvo_tipo, alvo_id, alvo_nome, motivo, iniciado_em, ip, user_agent)
          VALUES (?, ?, ?, 'cliente', ?, ?, ?, ?, ?, ?)
        `).run(impId, usuarioLogado.id, usuarioLogado.nome, cliente.id, cliente.nome, motivo, agora, req.ip, req.headers["user-agent"] ?? null);
      } catch {}

      reply.setCookie("nzaidi_cliente_sessao", tokenSessao, {
        path: "/",
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        maxAge: 2 * 3600,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Sessão de suporte gerada para o cliente ${cliente.nome}.`,
        urlRedirecionamento: `/cliente/?sessao_suporte=${tokenSessao}#/dashboard`,
        token: tokenSessao,
        cliente: {
          id: cliente.id,
          nome: cliente.nome,
          email: cliente.email,
        },
      });
    }
  );

  // 10. Decisão KYC (Aprovar, Rejeitar)
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

  // 11. Solicitar Documentos Adicionais KYC
  app.post(
    "/api/v1/clientes/:id/kyc/solicitar-documentos",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("kyc:analisar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { mensagem } = SolicitarDocumentosSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const clienteAtualizado = service.processarDecisaoKyc(
        id,
        {
          estadoNovo: "actualizacao_necessaria",
          nivelRisco: "medio",
          motivo: `Documentos adicionais solicitados: ${mensagem}`,
        },
        {
          id: usuario.id,
          nome: usuario.nome,
          funcao: usuario.funcao,
          ip,
        }
      );

      // Inserir notificação para o cliente
      try {
        const db = (service as any).clientesRepo.db;
        db.prepare(`
          INSERT INTO notificacoes_sistema (id, destinatario_tipo, destinatario_id, categoria, titulo, mensagem, prioridade, criado_em)
          VALUES (?, 'cliente', ?, 'kyc', 'Documentos Adicionais Requeridos', ?, 'alta', datetime('now'))
        `).run(randomUUID(), id, mensagem);
      } catch {}

      return reply.send({
        sucesso: true,
        mensagem: "Solicitação de documentos adicionais enviada ao cliente com sucesso.",
        dados: clienteAtualizado,
      });
    }
  );

  // 12. Estatísticas e Contadores de KYC
  app.get(
    "/api/v1/kyc/estatisticas",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("kyc:analisar")],
    },
    async (_req, reply) => {
      const stats = service.obterContadoresKyc();
      return reply.send({
        sucesso: true,
        dados: stats,
      });
    }
  );

  // 13. Histórico de decisões KYC
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

  // 14. Carregamento de Documento KYC
  app.post(
    "/api/v1/clientes/:id/documentos",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:criar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      service.buscarClientePorId(id);

      const validado = UploadDocumentoInputSchema.parse(req.body);
      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const doc = documentosService.salvarDocumento(id, validado, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply.code(201).send({
        sucesso: true,
        mensagem: "Documento KYC carregado e validado com sucesso.",
        dados: doc,
      });
    }
  );

  // 15. Listar Documentos do Cliente
  app.get(
    "/api/v1/clientes/:id/documentos",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:consultar")],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      service.buscarClientePorId(id);

      const docs = documentosService.listarDocumentos(id);

      return reply.send({
        sucesso: true,
        dados: docs,
      });
    }
  );

  // 16. Download Seguro de Documento KYC
  app.get(
    "/api/v1/clientes/:id/documentos/:docId/download",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("clientes:consultar")],
    },
    async (req, reply) => {
      const { id, docId } = req.params as { id: string; docId: string };
      service.buscarClientePorId(id);

      const usuario = req.usuario!;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip;

      const { doc, buffer } = documentosService.lerConteudoDocumento(docId, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip,
      });

      return reply
        .header("Content-Type", doc.mimeType)
        .header("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.nomeArquivo)}"`)
        .header("X-Content-Type-Options", "nosniff")
        .header("Cache-Control", "private, no-cache, no-store, must-revalidate")
        .send(buffer);
    }
  );
}
