import type { FastifyInstance } from "fastify";
import { exigirAutenticacao } from "../../plugins/auth.plugin.js";
import {
  EstornarLancamentoSchema,
  ResolverDivergenciaSchema,
  FiltrosRelatorioSchema,
} from "./contabilidade.types.js";
import type { ContabilidadeService } from "./contabilidade.service.js";
import type { ContabilidadeRepository } from "./contabilidade.repository.js";

export function registrarRotasContabilidade(
  app: FastifyInstance,
  service: ContabilidadeService,
  repo: ContabilidadeRepository
): void {
  // 1. Listar Contas Contabilísticas
  app.get(
    "/api/v1/contabilidade/contas",
    { preHandler: [exigirAutenticacao] },
    async (_request, reply) => {
      const contas = repo.listarContas();
      return reply.send({ sucesso: true, dados: contas });
    }
  );

  // 2. Balancete de Verificação
  app.get(
    "/api/v1/contabilidade/balancete",
    { preHandler: [exigirAutenticacao] },
    async (_request, reply) => {
      const balancete = repo.obterBalancete();
      return reply.send({ sucesso: true, dados: balancete });
    }
  );

  // 3. Livro Razão / Diário de Movimentos
  app.get(
    "/api/v1/contabilidade/livro-razao",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const query = request.query as any;
      const res = repo.listarLivroRazao({
        dataInicio: query.dataInicio,
        dataFim: query.dataFim,
        contaCodigo: query.contaCodigo,
        origemTipo: query.origemTipo,
        limite: query.limite ? Number(query.limite) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      });

      if (query.formato === "csv") {
        const colunas = [
          "Data",
          "Nº Lançamento",
          "Tipo Origem",
          "Conta",
          "Nome Conta",
          "D/C",
          "Montante AOA",
          "Moeda Original",
          "Montante Original",
          "Descrição",
          "Operador",
          "Estado",
        ];
        const linhas = res.itens.map((i) => [
          i.dataMovimento,
          i.numeroLancamento,
          i.origemTipo,
          i.contaCodigo,
          i.contaNome,
          i.tipo,
          i.montanteAoa,
          i.moeda,
          i.montanteOriginal,
          i.descricao,
          i.operadorNome,
          i.estado,
        ]);
        const csv = service.exportarParaCsv(colunas, linhas);
        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", 'attachment; filename="livro_razao_nzaidi.csv"');
        return reply.send(csv);
      }

      return reply.send({ sucesso: true, dados: res });
    }
  );

  // 4. Detalhes de um Lançamento
  app.get(
    "/api/v1/contabilidade/lancamentos/:id",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const lancamento = repo.buscarLancamentoPorId(id);
      if (!lancamento) {
        return reply.status(404).send({ sucesso: false, mensagem: "Lançamento não encontrado" });
      }
      return reply.send({ sucesso: true, dados: lancamento });
    }
  );

  // 5. Estorno Contabilístico com Reversão Imutável
  app.post(
    "/api/v1/contabilidade/lancamentos/:id/estorno",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = EstornarLancamentoSchema.parse(request.body);
      const usuario = request.usuario!;

      const estorno = repo.estornarLancamento(id, body.motivo, usuario.id, usuario.nome);
      return reply.send({
        sucesso: true,
        mensagem: "Lançamento contabilístico estornado com sucesso através de reversão compensatória.",
        dados: estorno,
      });
    }
  );

  // 6. Reconciliação: Listar Divergências
  app.get(
    "/api/v1/contabilidade/reconciliacao/divergencias",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const query = request.query as any;
      const res = repo.listarDivergencias({
        tipo: query.tipo,
        estado: query.estado,
        limite: query.limite ? Number(query.limite) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      });

      if (query.formato === "csv") {
        const colunas = [
          "ID",
          "Tipo Divergência",
          "Referência",
          "Origem",
          "Valor Esperado",
          "Valor Observado",
          "Moeda",
          "Diferença",
          "Estado",
          "Data Deteção",
          "Motivo Resolução",
          "Resolvido Por",
        ];
        const linhas = res.itens.map((d) => [
          d.id,
          d.tipo,
          d.referenciaId,
          d.origem,
          d.valorEsperado,
          d.valorObservado,
          d.moeda,
          d.diferenca,
          d.estado,
          d.criadoEm,
          d.motivoResolucao || "",
          d.resolvidoPorNome || "",
        ]);
        const csv = service.exportarParaCsv(colunas, linhas);
        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", 'attachment; filename="divergencias_reconciliacao.csv"');
        return reply.send(csv);
      }

      return reply.send({ sucesso: true, dados: res });
    }
  );

  // 7. Reconciliação: Executar Varredura Geral
  app.post(
    "/api/v1/contabilidade/reconciliacao/executar",
    { preHandler: [exigirAutenticacao] },
    async (_request, reply) => {
      const resultado = service.executarReconciliacaoGeral();
      return reply.send({
        sucesso: true,
        mensagem: "Varredura de reconciliação financeira concluída com sucesso.",
        dados: resultado,
      });
    }
  );

  // 8. Reconciliação: Resolver Divergência
  app.post(
    "/api/v1/contabilidade/reconciliacao/divergencias/:id/resolver",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = ResolverDivergenciaSchema.parse(request.body);
      const usuario = request.usuario!;

      repo.resolverDivergencia(id, body.estado, body.motivo, usuario.id, usuario.nome);
      return reply.send({
        sucesso: true,
        mensagem: "Divergência de reconciliação atualizada com sucesso.",
      });
    }
  );

  // 9. Relatório: Resumo Diário
  app.get(
    "/api/v1/contabilidade/relatorios/resumo-diario",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const query = request.query as any;
      const dados = service.obterResumoDiario({
        dataInicio: query.dataInicio,
        dataFim: query.dataFim,
      });

      if (query.formato === "csv") {
        const colunas = ["Tipo Operação", "Moeda", "Quantidade", "Total Divisa", "Total AOA"];
        const linhas = dados.operacoesCambio.map((o) => [
          o.tipo,
          o.moeda,
          o.quantidade,
          o.totalDivisa,
          o.totalAoa,
        ]);
        const csv = service.exportarParaCsv(colunas, linhas);
        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", 'attachment; filename="resumo_diario_nzaidi.csv"');
        return reply.send(csv);
      }

      return reply.send({ sucesso: true, dados });
    }
  );

  // 10. Relatório: Posição Cambial
  app.get(
    "/api/v1/contabilidade/relatorios/posicao-cambial",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const query = request.query as any;
      const dados = service.obterPosicaoCambial({
        dataInicio: query.dataInicio,
        dataFim: query.dataFim,
      });

      if (query.formato === "csv") {
        const colunas = [
          "Moeda",
          "Qtd Compras",
          "Total Comprado Divisa",
          "Total Comprado AOA",
          "Taxa Média Compra",
          "Qtd Vendas",
          "Total Vendido Divisa",
          "Total Vendido AOA",
          "Taxa Média Venda",
          "Posição Líquida Divisa",
          "Margem Bruta Estimada AOA",
        ];
        const linhas = dados.posicao.map((p) => [
          p.moeda,
          p.compras.quantidade,
          p.compras.totalDivisa,
          p.compras.totalAoa,
          p.compras.taxaMedia,
          p.vendas.quantidade,
          p.vendas.totalDivisa,
          p.vendas.totalAoa,
          p.vendas.taxaMedia,
          p.posicaoLiquidaDivisa,
          p.margemBrutaEstimadaAoa,
        ]);
        const csv = service.exportarParaCsv(colunas, linhas);
        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", 'attachment; filename="posicao_cambial_nzaidi.csv"');
        return reply.send(csv);
      }

      return reply.send({ sucesso: true, dados });
    }
  );

  // 11. Histórico de Taxas Auditado
  app.get(
    "/api/v1/contabilidade/taxas/historico",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const query = request.query as any;
      const historico = repo.listarHistoricoTaxas(query.moeda, query.limite ? Number(query.limite) : 50);
      return reply.send({ sucesso: true, dados: historico });
    }
  );
}
