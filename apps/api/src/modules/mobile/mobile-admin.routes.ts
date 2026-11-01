import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { MobileRepository } from "./mobile.repository.js";
import type { MobileService } from "./mobile.service.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { exigirPermissao } from "../../plugins/auth.plugin.js";

export function registrarRotasMobileAdmin(
  app: FastifyInstance,
  mobileRepo: MobileRepository,
  mobileService: MobileService,
  auditoriaRepo: AuditoriaRepository,
  db: any
): void {
  // 1. Dashboard e KPIs de Utilização e Saúde
  app.get(
    "/api/v1/admin/mobile/dashboard",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const kpis = mobileRepo.obterKpis();
      return reply.status(200).send({
        sucesso: true,
        dados: kpis,
      });
    }
  );

  // 2. Monitorização de Requisições com Filtros
  app.get(
    "/api/v1/admin/mobile/requisicoes",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (request, reply) => {
      const query = request.query as any;
      const res = mobileRepo.listarRequisicoes({
        limite: query.limite ? Number(query.limite) : 50,
        offset: query.offset ? Number(query.offset) : 0,
        endpoint: query.endpoint || undefined,
        metodo: query.metodo || undefined,
        codigoStatus: query.codigoStatus ? Number(query.codigoStatus) : undefined,
        plataforma: query.plataforma || undefined,
        clienteId: query.clienteId || undefined,
      });

      return reply.status(200).send({
        sucesso: true,
        total: res.total,
        dados: res.logs,
      });
    }
  );

  // 3. Gestão de Dispositivos Registados
  app.get(
    "/api/v1/admin/mobile/dispositivos",
    { preHandler: [exigirPermissao("clientes:consultar")] },
    async (_request, reply) => {
      const dispositivos = mobileRepo.listarDispositivosAdmin();
      return reply.status(200).send({
        sucesso: true,
        total: dispositivos.length,
        dados: dispositivos,
      });
    }
  );

  app.post(
    "/api/v1/admin/mobile/dispositivos/:id/bloquear",
    { preHandler: [exigirPermissao("clientes:editar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operador = request.usuario!;

      mobileRepo.alterarStatusDispositivo(id, "bloqueado");
      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "BLOQUEAR_DISPOSITIVO_MOVEL",
        recurso: "dispositivos_moveis",
        recursoId: id,
        detalhes: { operador: operador.nome },
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Dispositivo bloqueado com sucesso. Todas as sessões foram canceladas.",
      });
    }
  );

  app.post(
    "/api/v1/admin/mobile/dispositivos/:id/revogar",
    { preHandler: [exigirPermissao("clientes:editar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operador = request.usuario!;

      mobileRepo.alterarStatusDispositivo(id, "revogado");
      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "REVOGAR_DISPOSITIVO_MOVEL",
        recurso: "dispositivos_moveis",
        recursoId: id,
        detalhes: { operador: operador.nome },
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Sessões do dispositivo revogadas.",
      });
    }
  );

  // 4. Operações Originadas pelo Mobile
  app.get(
    "/api/v1/admin/mobile/operacoes",
    { preHandler: [exigirPermissao("operacoes:consultar")] },
    async (_request, reply) => {
      const stmtCambios = db.prepare(`
        SELECT p.*, c.nome as cliente_nome, 'CAMBIO' as modulo
        FROM pedidos_cambio p
        JOIN clientes c ON p.cliente_id = c.id
        ORDER BY p.criado_em DESC LIMIT 50;
      `);
      const cambios = stmtCambios.all() as any[];

      const stmtRemessas = db.prepare(`
        SELECT r.*, c.nome as cliente_nome, 'REMESSA' as modulo
        FROM pedidos_remessas r
        JOIN clientes c ON r.cliente_id = c.id
        ORDER BY r.criado_em DESC LIMIT 50;
      `);
      const remessas = stmtRemessas.all() as any[];

      return reply.status(200).send({
        sucesso: true,
        dados: {
          cambios,
          remessas,
        },
      });
    }
  );

  // 5. Diagnóstico de Saúde dos Serviços (Em Tempo Real)
  app.get(
    "/api/v1/admin/mobile/saude",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const saude = mobileService.verificarSaudeServicos();
      return reply.status(200).send({
        sucesso: true,
        dados: saude,
      });
    }
  );

  // 6. Configurações da API Mobile
  app.get(
    "/api/v1/admin/mobile/config",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const configs = mobileRepo.obterConfiguracoes();
      return reply.status(200).send({
        sucesso: true,
        dados: configs,
      });
    }
  );

  app.put(
    "/api/v1/admin/mobile/config",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const operador = request.usuario!;
      const Schema = z.record(z.string(), z.string());
      const body = Schema.parse(request.body);

      for (const [chave, valor] of Object.entries(body)) {
        mobileRepo.atualizarConfiguracao(chave, valor, operador.id);
      }

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "ATUALIZAR_CONFIG_MOBILE",
        recurso: "mobile_config",
        detalhes: { parametrosAtualizados: Object.keys(body) },
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Configurações da API móvel atualizadas com sucesso.",
        dados: mobileRepo.obterConfiguracoes(),
      });
    }
  );

  // 7. Alertas Operacionais
  app.get(
    "/api/v1/admin/mobile/alertas",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const alertas = mobileRepo.listarAlertas();
      return reply.status(200).send({
        sucesso: true,
        total: alertas.length,
        dados: alertas,
      });
    }
  );
  // 8. Exportação de Relatórios de Telemetria e Auditoria
  app.get(
    "/api/v1/admin/mobile/relatorios/exportar",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (request, reply) => {
      const query = request.query as any;
      const formato = (query.formato || "csv").toLowerCase();
      const res = mobileRepo.listarRequisicoes({ limite: 1000 });

      if (formato === "json") {
        return reply.status(200).send({
          sucesso: true,
          total: res.total,
          dados: res.logs,
        });
      }

      // Gerar CSV padrão
      const cabecalho = ["ID", "Data/Hora", "Cliente ID", "Cliente Nome", "Dispositivo", "Plataforma", "Versao App", "Endpoint", "Metodo", "Status", "Duracao (ms)", "IP", "Correlation ID"];
      const linhas = res.logs.map((l) => [
        l.id,
        l.criado_em,
        l.cliente_id || "",
        `"${(l.cliente_nome || "").replace(/"/g, '""')}"`,
        `"${(l.dispositivo_nome || "").replace(/"/g, '""')}"`,
        l.plataforma || "",
        l.versao_app || "",
        l.endpoint,
        l.metodo,
        l.codigo_status,
        l.duracao_ms,
        l.ip || "",
        l.correlation_id || "",
      ].join(","));

      const csv = [cabecalho.join(","), ...linhas].join("\n");
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="nzaidi-mobile-telemetria.csv"')
        .send(csv);
    }
  );

}
