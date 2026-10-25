import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TaxasService } from "./taxas.service.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { exigirPermissao } from "../../plugins/auth.plugin.js";

const ParamMoedaSchema = z.object({
  moeda: z.enum(["USD", "EUR"], {
    errorMap: () => ({ message: "Apenas as moedas 'USD' e 'EUR' são suportadas no momento." }),
  }),
});

const AtualizarTaxaSchema = z.object({
  referencia: z.string().regex(/^\d+(\.\d{1,4})?$/, "A taxa de referência deve ser um número decimal com até 4 casas"),
  margemCompra: z.string().regex(/^\d+(\.\d{1,4})?$/, "A margem de compra deve ser expressa em decimal (ex: 0.0200)"),
  margemVenda: z.string().regex(/^\d+(\.\d{1,4})?$/, "A margem de venda deve ser expressa em decimal (ex: 0.0250)"),
  fonte: z.enum(["demonstracao", "oficial"]).optional(),
  motivo: z.string().min(5, "O motivo da alteração da taxa deve ser justificado (mínimo 5 caracteres)"),
});

export function registrarRotasTaxas(
  app: FastifyInstance,
  taxasService: TaxasService,
  auditoriaRepo: AuditoriaRepository
): void {
  // 1. Tabela pública completa de taxas
  app.get("/api/v1/taxas", async (_request, reply) => {
    const lista = taxasService.listarTaxas();
    return reply.status(200).send({
      sucesso: true,
      moedaBase: "AOA",
      total: lista.length,
      dados: lista,
    });
  });

  // 2. Consulta de taxa por moeda específica
  app.get("/api/v1/taxas/:moeda", async (request, reply) => {
    const { moeda } = ParamMoedaSchema.parse(request.params);
    const taxa = taxasService.obterTaxaCalculada(moeda);

    return reply.status(200).send({
      sucesso: true,
      moedaBase: "AOA",
      dados: taxa,
    });
  });

  // 3. Alteração autorizada de taxas e margens (Exclusivo Gestão)
  app.put(
    "/api/v1/taxas/:moeda",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const { moeda } = ParamMoedaSchema.parse(request.params);
      const corpo = AtualizarTaxaSchema.parse(request.body);
      const usuario = request.usuario!;

      const paramsAtualizacao: Parameters<typeof taxasService.atualizarTaxa>[1] = {
        referencia: corpo.referencia,
        margemCompra: corpo.margemCompra,
        margemVenda: corpo.margemVenda,
        autorId: usuario.id,
        autorNome: usuario.nome,
        motivo: corpo.motivo,
      };

      if (corpo.fonte) {
        paramsAtualizacao.fonte = corpo.fonte;
      }

      const taxaAtualizada = taxasService.atualizarTaxa(moeda, paramsAtualizacao);

      auditoriaRepo.registar({
        autorId: usuario.id,
        autorNome: usuario.nome,
        autorFuncao: usuario.funcao,
        acao: "ALTERAR_TAXA_CAMBIO",
        recurso: "taxas_config",
        recursoId: moeda,
        detalhes: {
          moeda,
          novaReferencia: corpo.referencia,
          novaMargemCompra: corpo.margemCompra,
          novaMargemVenda: corpo.margemVenda,
          fonte: corpo.fonte,
          motivo: corpo.motivo,
        },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: `Taxas da moeda ${moeda} atualizadas com sucesso.`,
        dados: taxaAtualizada,
      });
    }
  );
}
