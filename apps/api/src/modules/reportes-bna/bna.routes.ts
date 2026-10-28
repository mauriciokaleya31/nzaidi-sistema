import type { FastifyInstance } from "fastify";
import type { BnaService } from "./bna.service.js";
import {
  GerarReporteInputSchema,
  RegistarSubmissaoInputSchema,
  TipoMapaBnaSchema,
} from "./bna.types.js";
import { ErroValidacao } from "../../plugins/erros.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

export function registrarRotasBna(app: FastifyInstance, bnaService: BnaService): void {
  // 1. Alerta de reporte do dia (usado pela Visão Geral / Dashboard)
  app.get(
    "/api/v1/bna/alerta-hoje",
    { preHandler: [exigirAutenticacao] },
    async () => {
      return {
        sucesso: true,
        alerta: bnaService.verificarAlertaReporteHoje(),
      };
    }
  );

  // 2. Listar reportes gerados
  app.get(
    "/api/v1/bna/reportes",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerar_reportes_bna")] },
    async (req) => {
      const q = req.query as { limite?: string; offset?: string; tipoMapa?: string };
      const limite = q.limite ? parseInt(q.limite, 10) : 50;
      const offset = q.offset ? parseInt(q.offset, 10) : 0;
      const tipoMapa = q.tipoMapa ? TipoMapaBnaSchema.parse(q.tipoMapa) : undefined;

      const res = bnaService.listarReportes(limite, offset, tipoMapa);
      return {
        sucesso: true,
        ...res,
      };
    }
  );

  // 3. Obter detalhes de um reporte
  app.get(
    "/api/v1/bna/reportes/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerar_reportes_bna")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const rep = bnaService.buscarPorId(id);
      return {
        sucesso: true,
        reporte: rep,
      };
    }
  );

  // 4. Download do ficheiro CSV oficial gerado
  app.get(
    "/api/v1/bna/reportes/:id/download",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerar_reportes_bna")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const rep = bnaService.buscarPorId(id);

      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${rep.nomeArquivo}"`);
      return reply.send(rep.conteudoArquivo);
    }
  );

  // 5. Geração manual de reporte (qualquer data) — Apenas Gestão e Compliance
  app.post(
    "/api/v1/bna/reportes/gerar",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerar_reportes_bna")] },
    async (req, reply) => {
      const parseResult = GerarReporteInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ErroValidacao(parseResult.error.errors[0]?.message ?? "Dados inválidos");
      }

      const { dataReferencia, tipoMapa } = parseResult.data;
      const dataAlvo = dataReferencia ?? bnaService.obterDataLuanda();

      const operador = {
        id: req.usuario!.id,
        nome: req.usuario!.nome,
        funcao: req.usuario!.funcao,
        ip: req.ip,
      };

      if (tipoMapa === "ambos") {
        const resultado = bnaService.gerarReportesData(dataAlvo, operador);
        return reply.status(201).send({
          sucesso: true,
          mensagem: `Mapas de Câmbio e Remessas do BNA gerados com sucesso para ${dataAlvo}.`,
          reportes: resultado,
        });
      } else {
        const rep = bnaService.gerarReporteDoDia(dataAlvo, tipoMapa, operador);
        return reply.status(201).send({
          sucesso: true,
          mensagem: `Mapa de ${tipoMapa.toUpperCase()} do BNA gerado com sucesso para ${dataAlvo}.`,
          reporte: rep,
        });
      }
    }
  );

  // 6. Registar submissão em Suptech / SSIF — Apenas Gestão e Compliance
  app.post(
    "/api/v1/bna/reportes/:id/submissao",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerar_reportes_bna")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const parseResult = RegistarSubmissaoInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ErroValidacao(parseResult.error.errors[0]?.message ?? "Dados inválidos");
      }

      const operador = {
        id: req.usuario!.id,
        nome: req.usuario!.nome,
        funcao: req.usuario!.funcao,
        ip: req.ip,
      };

      const atualizado = bnaService.registarSubmissao(id, parseResult.data.plataforma, operador);
      return {
        sucesso: true,
        mensagem: `Submissão na plataforma ${parseResult.data.plataforma.toUpperCase()} registada com sucesso.`,
        reporte: atualizado,
      };
    }
  );
}
