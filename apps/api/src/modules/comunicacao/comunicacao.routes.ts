import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ComunicacaoService } from "./comunicacao.service.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

const CriarAnuncioSchema = z.object({
  titulo: z.string().min(3),
  conteudo: z.string().min(5),
  imagemUrl: z.string().optional().nullable(),
  destino: z.enum(["website", "portal_cliente", "portal_parceiro", "todos"]),
  publicoAlvo: z.string().default("todos"),
  estado: z.enum(["rascunho", "agendado", "publicado", "arquivado", "desativado"]).default("publicado"),
  inicioEm: z.string().optional().nullable(),
  fimEm: z.string().optional().nullable(),
});

const CriarDicaSchema = z.object({
  titulo: z.string().min(3),
  conteudo: z.string().min(5),
  categoria: z.enum(["cambio", "remessas", "seguranca", "educacao_financeira", "geral"]),
  estado: z.enum(["rascunho", "publicado", "arquivado"]).default("publicado"),
  ordem: z.number().int().default(0),
});

const CriarCampanhaSchema = z.object({
  assunto: z.string().min(3),
  modeloHtml: z.string().min(10),
  segmentoAlvo: z.enum(["todos", "kyc_aprovado", "kyc_pendente", "empresas", "parceiros"]),
  estado: z.enum(["rascunho", "agendada", "enviada", "cancelada"]).default("rascunho"),
  totalDestinatarios: z.number().int().default(0),
  agendadaPara: z.string().optional().nullable(),
});

const SalvarConfigServicoSchema = z.object({
  tipo: z.enum(["email", "sms", "whatsapp", "webhook"]),
  fornecedor: z.string().min(2),
  endpoint: z.string().optional().nullable(),
  credenciais: z.record(z.any()),
  parametros: z.record(z.any()).optional().nullable(),
  ambiente: z.enum(["teste", "producao"]).default("teste"),
  ativo: z.boolean().default(true),
});

export function registrarRotasComunicacao(
  app: FastifyInstance,
  service: ComunicacaoService
): void {
  // --- ANÚNCIOS ---
  // Rota pública para website e portais
  app.get("/api/v1/comunicacao/anuncios/publicos", async (request, reply) => {
    const query = request.query as { destino?: string };
    const anuncios = service.listarAnuncios(query.destino, "publicado");
    return reply.send({ sucesso: true, dados: anuncios });
  });

  // Gestão interna de anúncios
  app.get(
    "/api/v1/comunicacao/anuncios",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:consultar")] },
    async (request, reply) => {
      const query = request.query as { destino?: string; estado?: string };
      const anuncios = service.listarAnuncios(query.destino, query.estado);
      return reply.send({ sucesso: true, dados: anuncios });
    }
  );

  app.post(
    "/api/v1/comunicacao/anuncios",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = CriarAnuncioSchema.parse(request.body);

      const novo = service.criarAnuncio(
        { ...dados, criadoPorId: usuarioLogado.id },
        { id: usuarioLogado.id, nome: usuarioLogado.nome, funcao: usuarioLogado.funcao }
      );

      return reply.status(201).send({ sucesso: true, dados: novo });
    }
  );

  app.patch(
    "/api/v1/comunicacao/anuncios/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };
      const dados = request.body as any;

      service.atualizarAnuncio(id, dados, {
        id: usuarioLogado.id,
        nome: usuarioLogado.nome,
        funcao: usuarioLogado.funcao,
      });

      return reply.send({ sucesso: true, mensagem: "Anúncio atualizado com sucesso." });
    }
  );

  app.delete(
    "/api/v1/comunicacao/anuncios/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };

      service.removerAnuncio(id, {
        id: usuarioLogado.id,
        nome: usuarioLogado.nome,
        funcao: usuarioLogado.funcao,
      });

      return reply.send({ sucesso: true, mensagem: "Anúncio removido com sucesso." });
    }
  );

  // --- DICAS INFORMATIVAS ---
  app.get("/api/v1/comunicacao/dicas/publicas", async (request, reply) => {
    const query = request.query as { categoria?: string };
    const dicas = service.listarDicas(query.categoria);
    return reply.send({ sucesso: true, dados: dicas.filter((d) => d.estado === "publicado") });
  });

  app.get(
    "/api/v1/comunicacao/dicas",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:consultar")] },
    async (request, reply) => {
      const query = request.query as { categoria?: string };
      const dicas = service.listarDicas(query.categoria);
      return reply.send({ sucesso: true, dados: dicas });
    }
  );

  app.post(
    "/api/v1/comunicacao/dicas",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = CriarDicaSchema.parse(request.body);

      const nova = service.criarDica(
        { ...dados, criadoPorId: usuarioLogado.id },
        { id: usuarioLogado.id, nome: usuarioLogado.nome, funcao: usuarioLogado.funcao }
      );

      return reply.status(201).send({ sucesso: true, dados: nova });
    }
  );

  app.delete(
    "/api/v1/comunicacao/dicas/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      service.removerDica(id);
      return reply.send({ sucesso: true, mensagem: "Dica removida com sucesso." });
    }
  );

  // --- CAMPANHAS DE EMAIL ---
  app.get(
    "/api/v1/comunicacao/campanhas",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:consultar")] },
    async (_request, reply) => {
      const campanhas = service.listarCampanhas();
      return reply.send({ sucesso: true, dados: campanhas });
    }
  );

  app.post(
    "/api/v1/comunicacao/campanhas",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = CriarCampanhaSchema.parse(request.body);

      const nova = service.criarCampanha(
        { ...dados, criadoPorId: usuarioLogado.id },
        { id: usuarioLogado.id, nome: usuarioLogado.nome, funcao: usuarioLogado.funcao }
      );

      return reply.status(201).send({ sucesso: true, dados: nova });
    }
  );

  app.post(
    "/api/v1/comunicacao/campanhas/:id/disparar",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };

      const resultado = service.dispararCampanha(id, {
        id: usuarioLogado.id,
        nome: usuarioLogado.nome,
        funcao: usuarioLogado.funcao,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Campanha disparada com sucesso para ${resultado.totalEnviados} destinatários.`,
        dados: resultado,
      });
    }
  );

  // --- SERVIÇOS E PROVEDORES DE COMUNICAÇÃO ---
  app.get(
    "/api/v1/comunicacao/provedores",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (_request, reply) => {
      const provedores = service.obterConfigsServicos();
      return reply.send({ sucesso: true, dados: provedores });
    }
  );

  app.post(
    "/api/v1/comunicacao/provedores",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = SalvarConfigServicoSchema.parse(request.body);

      service.salvarConfigServico(dados, {
        id: usuarioLogado.id,
        nome: usuarioLogado.nome,
        funcao: usuarioLogado.funcao,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Configurações do serviço de ${dados.tipo.toUpperCase()} guardadas com sucesso.`,
      });
    }
  );

  app.post(
    "/api/v1/comunicacao/provedores/:tipo/testar",
    { preHandler: [exigirAutenticacao, exigirPermissao("comunicacao:gerir")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { tipo } = request.params as { tipo: string };

      const resultado = await service.testarConexaoServico(tipo, {
        id: usuarioLogado.id,
        nome: usuarioLogado.nome,
        funcao: usuarioLogado.funcao,
      });

      return reply.send({
        sucesso: true,
        dados: resultado,
      });
    }
  );
}
