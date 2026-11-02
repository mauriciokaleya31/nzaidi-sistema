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


  // 9. Configurações Completas (Remote Config, Personalização, Contactos, Conteúdos, Funcionalidades, Versões)
  app.get(
    "/api/v1/admin/mobile/config-completa",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const configs = mobileRepo.obterConfiguracoesCompletas();
      const banners = mobileRepo.listarBanners();
      const avisos = mobileRepo.listarAvisos();
      return reply.status(200).send({
        sucesso: true,
        dados: {
          configs,
          banners,
          avisos,
        },
      });
    }
  );

  app.put(
    "/api/v1/admin/mobile/config-secao",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const body = request.body as { secao: string; configs: Record<string, string> };
      if (!body.secao || !body.configs) {
        return reply.status(400).send({ sucesso: false, erro: "Secao e configs sao obrigatorios." });
      }
      const operador = request.usuario!;
      mobileRepo.atualizarLoteConfiguracoes(body.secao, body.configs, operador.id, operador.nome);

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "ATUALIZAR_CONFIG_MOBILE_" + body.secao.toUpperCase(),
        recurso: "mobile_config",
        recursoId: body.secao,
        detalhes: { operador: operador.nome, secao: body.secao, chaves: Object.keys(body.configs) },
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "Configurações da seção " + body.secao + " atualizadas com sucesso.",
        dados: mobileRepo.obterConfiguracoesCompletas(),
      });
    }
  );

  // 10. Gestão de Banners Promocionais
  app.get(
    "/api/v1/admin/mobile/banners",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const banners = mobileRepo.listarBanners();
      return reply.status(200).send({ sucesso: true, dados: banners });
    }
  );

  app.post(
    "/api/v1/admin/mobile/banners",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const body = request.body as any;
      if (!body.titulo || !body.imagemUrl) {
        return reply.status(400).send({ sucesso: false, erro: "Titulo e imagemUrl sao obrigatorios." });
      }
      const banner = mobileRepo.adicionarBanner(body);
      const operador = request.usuario!;
      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "CRIAR_BANNER_MOBILE",
        recurso: "mobile_banners",
        recursoId: banner.id,
        detalhes: { titulo: body.titulo },
      });
      return reply.status(201).send({ sucesso: true, dados: banner });
    }
  );

  app.delete(
    "/api/v1/admin/mobile/banners/:id",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      mobileRepo.removerBanner(id);
      const operador = request.usuario!;
      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "REMOVER_BANNER_MOBILE",
        recurso: "mobile_banners",
        recursoId: id,
        detalhes: {},
      });
      return reply.status(200).send({ sucesso: true, mensagem: "Banner removido." });
    }
  );

  // 11. Centro de Avisos e Modo de Manutenção
  app.get(
    "/api/v1/admin/mobile/avisos",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const avisos = mobileRepo.listarAvisos();
      return reply.status(200).send({ sucesso: true, dados: avisos });
    }
  );

  app.post(
    "/api/v1/admin/mobile/avisos",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const body = request.body as any;
      if (!body.titulo || !body.mensagem) {
        return reply.status(400).send({ sucesso: false, erro: "Titulo e mensagem sao obrigatorios." });
      }
      const operador = request.usuario!;
      const aviso = mobileRepo.criarAviso({
        ...body,
        criadoPor: operador.nome,
      });
      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "CRIAR_AVISO_MOBILE",
        recurso: "mobile_avisos",
        recursoId: aviso.id,
        detalhes: { titulo: body.titulo, categoria: body.categoria },
      });
      return reply.status(201).send({ sucesso: true, dados: aviso });
    }
  );

  app.put(
    "/api/v1/admin/mobile/avisos/:id",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      mobileRepo.atualizarAviso(id, request.body);
      return reply.status(200).send({ sucesso: true, mensagem: "Aviso atualizado." });
    }
  );

  app.delete(
    "/api/v1/admin/mobile/avisos/:id",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      mobileRepo.removerAviso(id);
      return reply.status(200).send({ sucesso: true, mensagem: "Aviso removido." });
    }
  );

  // 12. Localizações Autorizadas dos Utilizadores
  app.get(
    "/api/v1/admin/mobile/localizacoes",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (request, reply) => {
      const query = request.query as any;
      const operador = request.usuario!;
      const consentimento = query.consentimento !== undefined ? Number(query.consentimento) : undefined;
      const localizacoes = mobileRepo.listarLocalizacoes({
        clienteId: query.clienteId ? String(query.clienteId) : undefined,
        consentimento: consentimento !== undefined && !isNaN(consentimento) ? consentimento : undefined,
      });

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "CONSULTAR_LOCALIZACOES_MOBILE",
        recurso: "mobile_localizacoes",
        recursoId: "consulta",
        detalhes: { operador: operador.nome, totalRetornado: localizacoes.length },
      });

      return reply.status(200).send({
        sucesso: true,
        total: localizacoes.length,
        dados: localizacoes,
      });
    }
  );

  // 13. Disparo de Notificações Push e Histórico
  app.post(
    "/api/v1/admin/mobile/push",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const body = request.body as any;
      if (!body.titulo || !body.mensagem) {
        return reply.status(400).send({ sucesso: false, erro: "Titulo e mensagem sao obrigatorios." });
      }
      const operador = request.usuario!;
      const resultado = await mobileRepo.dispararNotificacaoPush({
        titulo: body.titulo,
        mensagem: body.mensagem,
        plataformaAlvo: body.plataformaAlvo || "todas",
        segmento: body.segmento || "todos",
        categoria: body.categoria || "geral",
        clienteId: body.clienteId || null,
        adminNome: operador.nome,
      });

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "ENVIAR_PUSH_MOBILE",
        recurso: "mobile_notificacoes_push",
        recursoId: resultado.pushId || resultado.id,
        detalhes: { titulo: body.titulo, plataforma: body.plataformaAlvo, status: resultado.status },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: resultado.status === "aguardando_credenciais"
          ? "Notificação agendada no sistema (aguardando credenciais oficiais FCM/APNs)."
          : "Notificação push transmitida aos dispositivos elegíveis.",
        dados: resultado,
      });
    }
  );

  app.get(
    "/api/v1/admin/mobile/push/historico",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const hist = mobileRepo.listarHistoricoPush();
      return reply.status(200).send({ sucesso: true, dados: hist });
    }
  );

  app.get(
    "/api/v1/admin/mobile/push/metricas",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const metricas = mobileRepo.obterMetricasPush();
      return reply.status(200).send({ sucesso: true, dados: metricas });
    }
  );

  // 14. Histórico de Alterações de Configuração
  app.get(
    "/api/v1/admin/mobile/auditoria",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const logs = mobileRepo.listarHistoricoAuditoriaConfig();
      return reply.status(200).send({ sucesso: true, dados: logs });
    }
  );
  // 15. Gestão de Países de Destino das Remessas
  app.get(
    "/api/v1/admin/mobile/paises-remessas",
    { preHandler: [exigirPermissao("ver_auditoria")] },
    async (_request, reply) => {
      const paises = mobileRepo.listarPaisesRemessas(false);
      return reply.status(200).send({
        sucesso: true,
        total: paises.length,
        dados: paises,
      });
    }
  );

  app.post(
    "/api/v1/admin/mobile/paises-remessas",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const body = request.body as any;
      if (!body.codigoIso || !body.nome || !body.moeda) {
        return reply.status(400).send({
          sucesso: false,
          erro: "codigoIso, nome e moeda são campos obrigatórios.",
        });
      }
      const operador = request.usuario!;
      const pais = mobileRepo.criarPaisRemessa(body);

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "CRIAR_PAIS_REMESSA",
        recurso: "paises_remessas",
        recursoId: pais.id,
        detalhes: { operador: operador.nome, pais: body.nome, iso: body.codigoIso },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: "País de remessa cadastrado com sucesso.",
        dados: pais,
      });
    }
  );

  app.put(
    "/api/v1/admin/mobile/paises-remessas/:id",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const operador = request.usuario!;
      const atualizado = mobileRepo.atualizarPaisRemessa(id, body);

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "ATUALIZAR_PAIS_REMESSA",
        recurso: "paises_remessas",
        recursoId: id,
        detalhes: { operador: operador.nome, atualizacoes: Object.keys(body) },
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "País de remessa atualizado com sucesso.",
        dados: atualizado,
      });
    }
  );

  app.patch(
    "/api/v1/admin/mobile/paises-remessas/:id/status",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { ativo: boolean };
      const operador = request.usuario!;
      const atualizado = mobileRepo.alternarStatusPaisRemessa(id, body.ativo);

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: body.ativo ? "ATIVAR_PAIS_REMESSA" : "DESATIVAR_PAIS_REMESSA",
        recurso: "paises_remessas",
        recursoId: id,
        detalhes: { operador: operador.nome, ativo: body.ativo },
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: body.ativo ? "País ativado para remessas." : "País desativado para remessas.",
        dados: atualizado,
      });
    }
  );

  app.delete(
    "/api/v1/admin/mobile/paises-remessas/:id",
    { preHandler: [exigirPermissao("alterar_taxas")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const operador = request.usuario!;
      mobileRepo.excluirPaisRemessa(id);

      auditoriaRepo.registar({
        autorId: operador.id,
        acao: "EXCLUIR_PAIS_REMESSA",
        recurso: "paises_remessas",
        recursoId: id,
        detalhes: { operador: operador.nome },
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: "País de remessa removido com sucesso.",
      });
    }
  );
}
