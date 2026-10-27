import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { OperacionalService } from "./operacional.service.js";
import {
  AtribuirTarefaSchema,
  ProcessarPedidoCambioSchema,
  ProcessarPedidoRemessaSchema,
  DecisaoDocumentoKycSchema,
  TIPOS_TAREFA_OPERACIONAL,
  ESTADOS_TAREFA_OPERACIONAL,
  PRIORIDADES_TAREFA,
  type TipoTarefaOperacional,
  type EstadoTarefaOperacional,
  type PrioridadeTarefa,
} from "./operacional.types.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

export function registrarRotasOperacional(
  app: FastifyInstance,
  operacionalService: OperacionalService
): void {
  // 1. Dashboard Operacional Unificado (Contadores Reais e Alertas Clicáveis)
  app.get(
    "/api/v1/operacional/dashboard",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("ver_operacoes")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const usuario = request.usuario!;
      const dados = operacionalService.obterDashboard({
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
      });

      return reply.send({
        sucesso: true,
        dados,
      });
    }
  );

  // 2. Fila Única Consolidada de Operações & Tarefas
  app.get(
    "/api/v1/operacional/fila",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("ver_operacoes")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        tipo?: TipoTarefaOperacional;
        estado?: EstadoTarefaOperacional;
        prioridade?: PrioridadeTarefa;
        responsavelId?: string;
        apenasMinhas?: string;
        busca?: string;
        limite?: string;
        offset?: string;
      };

      const usuario = request.usuario!;
      const resultado = operacionalService.listarFila(
        {
          tipo: query.tipo,
          estado: query.estado,
          prioridade: query.prioridade,
          responsavelId: query.responsavelId,
          apenasMinhas: query.apenasMinhas === "true",
          busca: query.busca,
          limite: query.limite ? parseInt(query.limite, 10) : 50,
          offset: query.offset ? parseInt(query.offset, 10) : 0,
        },
        {
          id: usuario.id,
          nome: usuario.nome,
          funcao: usuario.funcao,
        }
      );

      return reply.send({
        sucesso: true,
        total: resultado.total,
        dados: resultado.itens,
      });
    }
  );

  // 3. Detalhes Completos de um Item da Fila
  app.get(
    "/api/v1/operacional/fila/:tipo/:id",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("ver_operacoes")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tipo, id } = request.params as { tipo: TipoTarefaOperacional; id: string };

      if (!TIPOS_TAREFA_OPERACIONAL.includes(tipo)) {
        return reply.status(400).send({
          sucesso: false,
          codigo: "TIPO_INVALIDO",
          erro: "Tipo de tarefa operacional desconhecido.",
        });
      }

      const detalhes = operacionalService.obterDetalhesItem(tipo, id);
      if (!detalhes) {
        return reply.status(404).send({
          sucesso: false,
          codigo: "NAO_ENCONTRADO",
          erro: "Item operacional não encontrado.",
        });
      }

      return reply.send({
        sucesso: true,
        dados: detalhes,
      });
    }
  );

  // 4. Atribuir ou Reatribuir Tarefa
  app.post(
    "/api/v1/operacional/fila/:tipo/:id/atribuir",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("ver_operacoes")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tipo, id } = request.params as { tipo: TipoTarefaOperacional; id: string };
      const body = AtribuirTarefaSchema.parse(request.body ?? {});
      const usuario = request.usuario!;

      const resultado = operacionalService.atribuirTarefa(
        tipo,
        id,
        body.responsavelId,
        body.prioridade,
        body.notas,
        {
          id: usuario.id,
          nome: usuario.nome,
          funcao: usuario.funcao,
          ip: request.ip,
        }
      );

      return reply.send({
        sucesso: true,
        mensagem: "Tarefa atribuída com sucesso.",
        dados: resultado,
      });
    }
  );

  // 5. Processar Pedido de Câmbio Online
  app.post(
    "/api/v1/operacional/pedidos-cambio/:id/processar",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("operacoes:registar")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = ProcessarPedidoCambioSchema.parse(request.body);
      const usuario = request.usuario!;

      const resultado = operacionalService.processarPedidoCambio(id, body, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip: request.ip,
      });

      return reply.send({
        sucesso: true,
        mensagem: body.decisao === "aprovar" ? "Pedido de câmbio aprovado." : "Pedido de câmbio rejeitado.",
        dados: resultado,
      });
    }
  );

  // 6. Processar Pedido de Remessa (Encaminhar para Parceiro ou Liquidar)
  app.post(
    "/api/v1/operacional/pedidos-remessas/:id/processar",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("operacoes:registar")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = ProcessarPedidoRemessaSchema.parse(request.body);
      const usuario = request.usuario!;

      const resultado = operacionalService.processarPedidoRemessa(id, body, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip: request.ip,
      });

      return reply.send({
        sucesso: true,
        mensagem: "Decisão operacional sobre a remessa registada com sucesso.",
        dados: resultado,
      });
    }
  );

  // 7. Decisão sobre Documento KYC
  app.post(
    "/api/v1/operacional/kyc/documentos/:id/decisao",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("kyc:analisar")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const payload = (request.body as Record<string, unknown>) ?? {};
      const body = DecisaoDocumentoKycSchema.parse({ documentoId: id, ...payload });
      const usuario = request.usuario!;

      const resultado = operacionalService.validarDocumentoKyc(id, body.statusValidacao, body.motivoRejeicao, {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ip: request.ip,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Documento KYC ${body.statusValidacao}.`,
        dados: resultado,
      });
    }
  );

  // 8. Resumo e Monitorização de Sessões de Caixa da Equipa
  app.get(
    "/api/v1/operacional/caixas",
    {
      preHandler: [exigirAutenticacao, exigirPermissao("caixa:consultar")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sessoes = operacionalService.obterSessoesCaixa();
      return reply.send({
        sucesso: true,
        total: sessoes.length,
        dados: sessoes,
      });
    }
  );
}
