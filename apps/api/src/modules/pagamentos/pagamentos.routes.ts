import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PagamentosService } from "./pagamentos.service.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";

const SubmeterPagamentoSchema = z.object({
  metodoId: z.string().min(1, "O método de pagamento é obrigatório"),
  origemTipo: z.enum(["pedido_cambio", "pedido_remessa", "deposito", "outro"]),
  origemId: z.string().min(1, "A referência do pedido é obrigatória"),
  clienteId: z.string().optional().nullable(),
  clienteNome: z.string().optional().nullable(),
  clienteTelefone: z.string().optional().nullable(),
  clienteEmail: z.string().optional().nullable(),
  montanteAoa: z.number().positive("O montante deve ser superior a zero"),
  referenciaExterna: z.string().min(3, "O número de referência do talão/transferência é obrigatório"),
  comprovativoBase64: z.string().optional().nullable(),
  comprovativoNome: z.string().optional().nullable(),
  notasCliente: z.string().optional().nullable(),
});

const ConfirmarPagamentoSchema = z.object({
  notasInternas: z.string().optional().nullable(),
});

const RejeitarPagamentoSchema = z.object({
  motivo: z.string().min(5, "O motivo de rejeição deve ter pelo menos 5 caracteres"),
  notasInternas: z.string().optional().nullable(),
});

const AtualizarMetodoSchema = z.object({
  nome: z.string().optional(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
  disponivelCliente: z.boolean().optional(),
  instrucoes: z.string().optional().nullable(),
  configJson: z.string().optional().nullable(),
  estadoIntegracao: z.enum(["ativo", "inativo", "em_preparacao", "pendente_credenciais"]).optional(),
});

const CriarCobrancaAppyPaySchema = z.object({
  origemTipo: z.enum(["pedido_cambio", "pedido_remessa", "deposito", "outro"]),
  origemId: z.string().min(1),
  clienteId: z.string().optional().nullable(),
  clienteNome: z.string().min(2),
  clienteTelefone: z.string().min(9),
  clienteEmail: z.string().optional().nullable(),
  montanteAoa: z.number().positive(),
  metodoOpcao: z.enum(["multicaixa_express", "referencia"]),
});

export function registrarRotasPagamentos(
  app: FastifyInstance,
  service: PagamentosService
): void {
  // 1. Listar métodos de pagamento disponíveis para o cliente (Público / Portal do Cliente)
  app.get("/api/v1/pagamentos/metodos", async (_req, reply) => {
    const metodos = service.listarMetodosParaCliente();
    return reply.send({
      sucesso: true,
      dados: metodos,
    });
  });

  // 2. Listar todos os métodos no Painel Administrativo
  app.get(
    "/api/v1/pagamentos/admin/metodos",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (_req, reply) => {
      const metodos = service.listarMetodos(false);
      return reply.send({
        sucesso: true,
        dados: metodos,
      });
    }
  );

  // 3. Atualizar configuração de um método de pagamento
  app.patch(
    "/api/v1/pagamentos/admin/metodos/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const dados = AtualizarMetodoSchema.parse(req.body);
      const usuarioLogado = req.usuario!;

      try {
        const atualizado = service.atualizarMetodo(
          id,
          dados,
          usuarioLogado.id,
          usuarioLogado.nome,
          req.ip
        );
        return reply.send({
          sucesso: true,
          mensagem: "Método de pagamento atualizado com sucesso.",
          dados: atualizado,
        });
      } catch (err: any) {
        return reply.status(400).send({
          sucesso: false,
          erro: err.message,
        });
      }
    }
  );

  // 4. Testar conexão com a AppyPay (Diagnóstico)
  app.post(
    "/api/v1/pagamentos/admin/metodos/appypay/testar",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (_req, reply) => {
      const diag = await service.testarConexaoAppyPay();
      return reply.send({
        sucesso: diag.sucesso,
        mensagem: diag.mensagem,
        dados: diag,
      });
    }
  );

  // 5. Submeter pagamento manual pelo cliente (comprovativo + referência)
  app.post("/api/v1/pagamentos/submeter", async (req, reply) => {
    const payload = SubmeterPagamentoSchema.parse(req.body);

    try {
      const transacao = service.submeterPagamentoManual(payload, req.ip);
      return reply.status(201).send({
        sucesso: true,
        mensagem: "Comprovativo de pagamento submetido com sucesso. Aguarda validação manual da nossa tesouraria.",
        dados: transacao,
      });
    } catch (err: any) {
      return reply.status(400).send({
        sucesso: false,
        erro: err.message,
      });
    }
  });

  // 6. Listar transações de pagamento (Painel Administrativo)
  app.get(
    "/api/v1/pagamentos",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (req, reply) => {
      const query = req.query as {
        estado?: string;
        metodoId?: string;
        tipoMetodo?: string;
        origemId?: string;
        limite?: string;
      };

      const transacoes = service.listarTransacoes({
        estado: query.estado,
        metodoId: query.metodoId,
        tipoMetodo: query.tipoMetodo,
        origemId: query.origemId,
        limite: query.limite ? parseInt(query.limite, 10) : 100,
      });

      return reply.send({
        sucesso: true,
        dados: transacoes,
      });
    }
  );

  // 7. Obter detalhes de uma transação de pagamento
  app.get(
    "/api/v1/pagamentos/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const transacao = service.obterTransacaoPorId(id);

      if (!transacao) {
        return reply.status(404).send({
          sucesso: false,
          erro: "Transação de pagamento não encontrada.",
        });
      }

      return reply.send({
        sucesso: true,
        dados: transacao,
      });
    }
  );

  // 8. Confirmar pagamento manual (Operador Autorizado)
  app.post(
    "/api/v1/pagamentos/:id/confirmar",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { notasInternas } = ConfirmarPagamentoSchema.parse(req.body ?? {});
      const usuarioLogado = req.usuario!;

      try {
        const confirmada = service.confirmarPagamentoManual(
          id,
          usuarioLogado.id,
          usuarioLogado.nome,
          notasInternas ?? undefined,
          req.ip
        );

        return reply.send({
          sucesso: true,
          mensagem: "Pagamento confirmado e validado com sucesso pela tesouraria.",
          dados: confirmada,
        });
      } catch (err: any) {
        return reply.status(400).send({
          sucesso: false,
          erro: err.message,
        });
      }
    }
  );

  // 9. Rejeitar pagamento manual com motivo obrigatório
  app.post(
    "/api/v1/pagamentos/:id/rejeitar",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { motivo, notasInternas } = RejeitarPagamentoSchema.parse(req.body);
      const usuarioLogado = req.usuario!;

      try {
        const rejeitada = service.rejeitarPagamentoManual(
          id,
          usuarioLogado.id,
          usuarioLogado.nome,
          motivo,
          notasInternas ?? undefined,
          req.ip
        );

        return reply.send({
          sucesso: true,
          mensagem: "Pagamento rejeitado com sucesso.",
          dados: rejeitada,
        });
      } catch (err: any) {
        return reply.status(400).send({
          sucesso: false,
          erro: err.message,
        });
      }
    }
  );

  // 10. Iniciar cobrança AppyPay (Multicaixa Express / Referência)
  app.post("/api/v1/pagamentos/appypay/cobranca", async (req, reply) => {
    const payload = CriarCobrancaAppyPaySchema.parse(req.body);

    const resultado = await service.iniciarCobrancaAppyPay(payload, req.ip);
    if (!resultado.sucesso) {
      return reply.status(400).send({
        sucesso: false,
        erro: resultado.mensagem,
      });
    }

    return reply.status(201).send({
      sucesso: true,
      mensagem: resultado.mensagem,
      dados: resultado.transacao,
      appypay: resultado.appypayResponse,
    });
  });

  // 11. Webhook seguro e idempotente da AppyPay
  app.post("/api/v1/pagamentos/appypay/webhook", async (req, reply) => {
    const payload = req.body;
    const resultado = service.processarWebhookAppyPay(payload, req.ip);

    // Webhooks devem sempre responder HTTP 200 para confirmar recebimento
    return reply.status(200).send({
      recebido: true,
      mensagem: resultado.mensagem,
      transacaoId: resultado.transacaoId,
    });
  });
}
