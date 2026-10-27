import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { CartoesService } from "./cartoes.service.js";
import type { PortalClienteRepository } from "../portal-cliente/portal.repository.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";
import { ErroAutenticacao } from "../../plugins/erros.js";

const COOKIE_NOME_CLIENTE = "nzaidi_cliente_sessao";

// Schemas de validação
const CalcularEmissaoSchema = z.object({
  montanteInicialUsd: z.number().positive("O montante inicial deve ser positivo"),
});

const CalcularCarregamentoSchema = z.object({
  montanteUsd: z.number().positive("O montante de carregamento deve ser positivo"),
});

const SolicitarCartaoSchema = z.object({
  montanteInicialUsd: z.number().positive("O montante inicial deve ser positivo"),
  rotulo: z.string().max(50).optional(),
});

const CarregarCartaoSchema = z.object({
  cartaoId: z.string().min(1, "O ID do cartão é obrigatório"),
  montanteUsd: z.number().positive("O montante de carregamento deve ser positivo"),
});

const AlterarEstadoCartaoSchema = z.object({
  cartaoId: z.string().min(1, "O ID do cartão é obrigatório"),
  novoEstado: z.enum(["ativo", "congelado"]),
});

const AtualizarConfigSchema = z.object({
  servico_ativo: z.number().int().min(0).max(1).optional(),
  visivel_portal: z.number().int().min(0).max(1).optional(),
  modo_manutencao: z.number().int().min(0).max(1).optional(),
  mensagem_manutencao: z.string().optional().nullable(),
  estado_ativacao: z.enum(["em_preparacao", "em_testes", "pronto_ativacao", "ativo", "suspenso"]).optional(),
  ambiente: z.enum(["sandbox", "live"]).optional(),
  public_key: z.string().optional(),
  secret_key: z.string().optional().nullable(),
  webhook_secret: z.string().optional().nullable(),
  base_url: z.string().url().optional(),
  saldo_alerta_minimo_usd: z.number().positive().optional(),
});

const AtualizarComercialSchema = z.object({
  taxa_emissao_usd: z.number().min(0).optional(),
  custo_emissao_fornecedor_usd: z.number().min(0).optional(),
  comissao_carregamento_pct: z.number().min(0).optional(),
  comissao_carregamento_fixa_usd: z.number().min(0).optional(),
  custo_carregamento_fornecedor_pct: z.number().min(0).optional(),
  margem_cambial_pct: z.number().min(0).optional(),
  taxa_manutencao_mensal_usd: z.number().min(0).optional(),
  limite_min_carregamento_usd: z.number().positive().optional(),
  limite_max_carregamento_usd: z.number().positive().optional(),
  limite_diario_usd: z.number().positive().optional(),
  limite_mensal_usd: z.number().positive().optional(),
  saldo_maximo_cartao_usd: z.number().positive().optional(),
});

export function registrarRotasCartoes(
  app: FastifyInstance,
  service: CartoesService,
  portalRepo?: PortalClienteRepository
): void {
  // Helper para autenticar cliente do portal
  async function extrairClienteId(request: FastifyRequest, reply: FastifyReply): Promise<string> {
    let token = request.cookies[COOKIE_NOME_CLIENTE];
    if (!token && request.headers.authorization?.startsWith("Bearer ")) {
      token = request.headers.authorization.substring(7);
    }

    if (!token) {
      // Se não houver token mas estiver em contexto de usuário interno com clienteId no query/body
      if (request.usuario && (request.query as any)?.clienteId) {
        return (request.query as any).clienteId;
      }
      throw new ErroAutenticacao("Inicie sessão no portal para aceder aos cartões virtuais.");
    }

    if (portalRepo) {
      const sessao = portalRepo.buscarSessaoAtiva(token);
      if (!sessao) {
        reply.clearCookie(COOKIE_NOME_CLIENTE, { path: "/" });
        throw new ErroAutenticacao("Sessão do cliente expirada ou inválida.");
      }
      return sessao.clienteId;
    }

    // Fallback de resolução direta se portalRepo não for injetado
    const hash = (await import("node:crypto")).createHash("sha256").update(token).digest("hex");
    const row = service
      .getRepository()["db"]
      .prepare(`SELECT cliente_id FROM sessoes_clientes WHERE token_hash = ? AND expira_em > ? LIMIT 1`)
      .get(hash, new Date().toISOString()) as any;

    if (!row) {
      throw new ErroAutenticacao("Sessão inválida.");
    }
    return row.cliente_id;
  }

  // ==========================================
  // ROTAS DO PORTAL DO CLIENTE
  // ==========================================

  // 1. Status do serviço e elegibilidade do cliente
  app.get("/api/v1/cartoes/portal/status", async (request, reply) => {
    let clienteId: string | undefined;
    try {
      clienteId = await extrairClienteId(request, reply);
    } catch {
      // Visitante não autenticado ainda
    }

    const status = service.obterStatusPortal(clienteId);
    return reply.send({
      sucesso: true,
      dados: status,
    });
  });

  // 2. Simulação de emissão
  app.post("/api/v1/cartoes/portal/calcular-emissao", async (request, reply) => {
    const dados = CalcularEmissaoSchema.parse(request.body);
    const calculo = service.calcularEmissao(dados.montanteInicialUsd);
    return reply.send({
      sucesso: true,
      dados: calculo,
    });
  });

  // 3. Simulação de carregamento
  app.post("/api/v1/cartoes/portal/calcular-carregamento", async (request, reply) => {
    const dados = CalcularCarregamentoSchema.parse(request.body);
    const calculo = service.calcularCarregamento(dados.montanteUsd);
    return reply.send({
      sucesso: true,
      dados: calculo,
    });
  });

  // 4. Solicitação de adesão
  app.post("/api/v1/cartoes/portal/aderir", async (request, reply) => {
    const clienteId = await extrairClienteId(request, reply);
    try {
      const adesao = await service.solicitarAdesao(clienteId);
      return reply.send({
        sucesso: true,
        dados: adesao,
        mensagem:
          adesao.estado_adesao === "aprovado"
            ? "Adesão aprovada com sucesso! Já pode solicitar o seu cartão Visa virtual."
            : "Adesão submetida com sucesso. Aguarda aprovação da equipa de conformidade.",
      });
    } catch (err: any) {
      return reply.status(400).send({
        sucesso: false,
        erro: err.message,
      });
    }
  });

  // 5. Listar cartões do cliente autenticado
  app.get("/api/v1/cartoes/portal/meus-cartoes", async (request, reply) => {
    const clienteId = await extrairClienteId(request, reply);
    const cartoes = service.listarCartoesCliente(clienteId);
    return reply.send({
      sucesso: true,
      dados: cartoes,
    });
  });

  // 6. Solicitar novo cartão Visa USD
  app.post("/api/v1/cartoes/portal/solicitar", async (request, reply) => {
    const clienteId = await extrairClienteId(request, reply);
    const dados = SolicitarCartaoSchema.parse(request.body);

    try {
      const paramsEmissao: { clienteId: string; montanteInicialUsd: number; rotulo?: string } = {
        clienteId,
        montanteInicialUsd: dados.montanteInicialUsd,
      };
      if (dados.rotulo) {
        paramsEmissao.rotulo = dados.rotulo;
      }
      const resultado = await service.emitirCartao(paramsEmissao);

      return reply.status(201).send({
        sucesso: true,
        dados: resultado,
        mensagem: "Cartão Visa virtual emitido e ativado com sucesso!",
      });
    } catch (err: any) {
      return reply.status(400).send({
        sucesso: false,
        erro: err.message,
      });
    }
  });

  // 7. Carregar cartão
  app.post("/api/v1/cartoes/portal/carregar", async (request, reply) => {
    const clienteId = await extrairClienteId(request, reply);
    const dados = CarregarCartaoSchema.parse(request.body);

    try {
      const resultado = await service.carregarCartao({
        clienteId,
        cartaoId: dados.cartaoId,
        montanteUsd: dados.montanteUsd,
      });

      return reply.send({
        sucesso: true,
        dados: resultado,
        mensagem: `Carregamento de \$${dados.montanteUsd} USD concluído com sucesso.`,
      });
    } catch (err: any) {
      return reply.status(400).send({
        sucesso: false,
        erro: err.message,
      });
    }
  });

  // 8. Congelar / Descongelar cartão pelo próprio cliente
  app.post("/api/v1/cartoes/portal/alterar-estado", async (request, reply) => {
    const clienteId = await extrairClienteId(request, reply);
    const dados = AlterarEstadoCartaoSchema.parse(request.body);

    try {
      const cartao = await service.alterarEstadoCartao({
        cartaoId: dados.cartaoId,
        novoEstado: dados.novoEstado,
        clienteId,
        autorId: clienteId,
        autorNome: "Titular do Cartão",
        autorFuncao: "cliente",
      });

      return reply.send({
        sucesso: true,
        dados: cartao,
        mensagem:
          dados.novoEstado === "congelado"
            ? "Cartão congelado temporariamente com sucesso."
            : "Cartão reativado e pronto para uso.",
      });
    } catch (err: any) {
      return reply.status(400).send({
        sucesso: false,
        erro: err.message,
      });
    }
  });

  // 9. Histórico de transações de um cartão
  app.get("/api/v1/cartoes/portal/:id/transacoes", async (request, reply) => {
    const clienteId = await extrairClienteId(request, reply);
    const { id } = request.params as { id: string };

    try {
      const transacoes = service.listarTransacoesCartao(clienteId, id);
      return reply.send({
        sucesso: true,
        dados: transacoes,
      });
    } catch (err: any) {
      return reply.status(404).send({
        sucesso: false,
        erro: err.message,
      });
    }
  });

  // 10. Revelação temporária de dados sensíveis (CVV e PAN)
  app.post("/api/v1/cartoes/portal/:id/revelar-dados", async (request, reply) => {
    const clienteId = await extrairClienteId(request, reply);
    const { id } = request.params as { id: string };

    try {
      const revelacao = await service.revelarDadosCartao({
        cartaoId: id,
        clienteId,
        autorId: clienteId,
        autorNome: "Titular do Cartão",
        autorFuncao: "cliente",
        ip: request.ip,
      });

      return reply.send({
        sucesso: true,
        dados: revelacao,
      });
    } catch (err: any) {
      return reply.status(400).send({
        sucesso: false,
        erro: err.message,
      });
    }
  });

  // ==========================================
  // ROTAS ADMINISTRATIVAS (BACKOFFICE)
  // ==========================================

  // 11. Dashboard executivo de cartões
  app.get(
    "/api/v1/cartoes/admin/dashboard",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (_request, reply) => {
      const dashboard = await service.obterDashboardAdmin();
      return reply.send({
        sucesso: true,
        dados: dashboard,
      });
    }
  );

  // 12. Obter configuração do serviço e StroWallet
  app.get(
    "/api/v1/cartoes/admin/config",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (_request, reply) => {
      const config = service.obterConfigAdmin();
      return reply.send({
        sucesso: true,
        dados: config,
      });
    }
  );

  // 13. Atualizar configuração do serviço
  app.put(
    "/api/v1/cartoes/admin/config",
    { preHandler: [exigirAutenticacao, exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const dados = AtualizarConfigSchema.parse(request.body);
      const usuario = request.usuario!;

      const config = service.atualizarConfigAdmin(dados, usuario.id, usuario.nome);
      return reply.send({
        sucesso: true,
        dados: config,
        mensagem: "Configurações do serviço de cartões atualizadas com sucesso.",
      });
    }
  );

  // 14. Obter parâmetros comerciais
  app.get(
    "/api/v1/cartoes/admin/comercial",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (_request, reply) => {
      const comercial = service.obterComercialAdmin();
      return reply.send({
        sucesso: true,
        dados: comercial,
      });
    }
  );

  // 15. Atualizar parâmetros comerciais
  app.put(
    "/api/v1/cartoes/admin/comercial",
    { preHandler: [exigirAutenticacao, exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const dados = AtualizarComercialSchema.parse(request.body);
      const usuario = request.usuario!;

      const comercial = service.atualizarComercialAdmin(dados, usuario.id, usuario.nome);
      return reply.send({
        sucesso: true,
        dados: comercial,
        mensagem: "Parâmetros comerciais atualizados com sucesso.",
      });
    }
  );

  // 16. Testar conectividade StroWallet
  app.post(
    "/api/v1/cartoes/admin/testar-conexao",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (_request, reply) => {
      const resultado = await service.testarConexaoStroWallet();
      return reply.send({
        sucesso: resultado.conectado,
        dados: resultado,
      });
    }
  );

  // 17. Listar todos os cartões (com filtros)
  app.get(
    "/api/v1/cartoes/admin/cartoes",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (request, reply) => {
      const q = request.query as any;
      const cartoes = service.listarCartoesAdmin({
        estado: q?.estado,
        busca: q?.busca,
        limite: q?.limite ? parseInt(q.limite) : 100,
        offset: q?.offset ? parseInt(q.offset) : 0,
      });
      return reply.send({
        sucesso: true,
        dados: cartoes,
      });
    }
  );

  // 18. Detalhe de um cartão no backoffice
  app.get(
    "/api/v1/cartoes/admin/cartoes/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const cartao = service.obterCartaoAdmin(id);
      if (!cartao) {
        return reply.status(404).send({ sucesso: false, erro: "Cartão não encontrado" });
      }

      const transacoes = service.getRepository().listarTransacoesPorCartao(id, 100);
      return reply.send({
        sucesso: true,
        dados: {
          cartao,
          transacoes,
        },
      });
    }
  );

  // 19. Ação operacional: bloquear / desbloquear
  app.post(
    "/api/v1/cartoes/admin/cartoes/:id/alterar-status",
    { preHandler: [exigirAutenticacao, exigirPermissao("contabilidade_tesouraria")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { novoEstado } = z
        .object({ novoEstado: z.enum(["ativo", "congelado"]) })
        .parse(request.body);
      const usuario = request.usuario!;

      const cartao = await service.alterarEstadoCartao({
        cartaoId: id,
        novoEstado,
        autorId: usuario.id,
        autorNome: usuario.nome,
        autorFuncao: usuario.funcao,
      });

      return reply.send({
        sucesso: true,
        dados: cartao,
        mensagem: `Estado do cartão alterado para ${novoEstado}.`,
      });
    }
  );

  // 20. Sincronizar com fornecedor
  app.post(
    "/api/v1/cartoes/admin/cartoes/:id/sincronizar",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const usuario = request.usuario!;

      try {
        const cartao = await service.sincronizarCartaoComFornecedor(id, usuario.id);
        return reply.send({
          sucesso: true,
          dados: cartao,
          mensagem: "Cartão sincronizado com o fornecedor StroWallet.",
        });
      } catch (err: any) {
        return reply.status(400).send({ sucesso: false, erro: err.message });
      }
    }
  );

  // 21. Listar todas as transações de cartões
  app.get(
    "/api/v1/cartoes/admin/transacoes",
    { preHandler: [exigirAutenticacao, exigirPermissao("operacoes:consultar")] },
    async (request, reply) => {
      const q = request.query as any;
      const transacoes = service.listarTransacoesAdmin({
        tipo: q?.tipo,
        estado: q?.estado,
        limite: q?.limite ? parseInt(q.limite) : 100,
        offset: q?.offset ? parseInt(q.offset) : 0,
      });
      return reply.send({
        sucesso: true,
        dados: transacoes,
      });
    }
  );

  // 22. Listar solicitações de adesão
  app.get(
    "/api/v1/cartoes/admin/adesao",
    { preHandler: [exigirAutenticacao, exigirPermissao("kyc:analisar")] },
    async (_request, reply) => {
      const adesoes = service.listarAdesoesAdmin();
      return reply.send({
        sucesso: true,
        dados: adesoes,
      });
    }
  );

  // 23. Avaliar solicitação de adesão
  app.post(
    "/api/v1/cartoes/admin/adesao/:clienteId/avaliar",
    { preHandler: [exigirAutenticacao, exigirPermissao("kyc:aprovar")] },
    async (request, reply) => {
      const { clienteId } = request.params as { clienteId: string };
      const { aprovado, motivo } = z
        .object({
          aprovado: z.boolean(),
          motivo: z.string().optional(),
        })
        .parse(request.body);
      const usuario = request.usuario!;

      service.avaliarAdesaoAdmin(clienteId, aprovado, motivo, usuario.id);
      return reply.send({
        sucesso: true,
        mensagem: aprovado ? "Adesão aprovada com sucesso." : "Adesão rejeitada com sucesso.",
      });
    }
  );

  // ==========================================
  // WEBHOOK STROWALLET (EXTERNO COM IDEMPOTÊNCIA)
  // ==========================================
  app.post("/api/v1/cartoes/webhook/strowallet", async (request, reply) => {
    const eventoTipo = (request.headers["x-strowallet-event"] as string) || "transaction.created";
    const payload = request.body as any;

    const res = await service.processarWebhook(eventoTipo, payload, request.ip);
    return reply.status(200).send({
      received: true,
      result: res,
    });
  });
}
