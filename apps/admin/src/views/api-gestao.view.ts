import { api } from "../api/cliente.js";

type AbaAtiva =
  | "visao-geral"
  | "personalizacao-visual"
  | "conteudos-banners"
  | "contactos-suporte"
  | "funcionalidades"
  | "dispositivos"
  | "localizacao"
  | "notificacoes-avisos"
  | "versoes"
  | "historico";

export function renderizarApiGestao(container: HTMLElement): void {
  let abaAtiva: AbaAtiva = determinarAbaPorHash();
  let kpis: any = null;
  let dispositivos: any[] = [];
  let configs: Record<string, string> = {};
  let banners: any[] = [];
  let avisos: any[] = [];
  let localizacoes: any[] = [];
  let historicoPush: any[] = [];
  let historicoAuditoria: any[] = [];
  let carregando = true;
  let salvando = false;
  let mensagemSucesso = "";
  let mensagemErro = "";

  // Filtros
  let filtroDispTermo = "";
  let filtroDispPlataforma = "";
  let filtroLocConsentimento = "";

  function determinarAbaPorHash(): AbaAtiva {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes("/visual")) return "personalizacao-visual";
    if (hash.includes("/conteudos")) return "conteudos-banners";
    if (hash.includes("/contactos")) return "contactos-suporte";
    if (hash.includes("/funcionalidades")) return "funcionalidades";
    if (hash.includes("/dispositivos")) return "dispositivos";
    if (hash.includes("/localizacao")) return "localizacao";
    if (hash.includes("/avisos") || hash.includes("/notificacoes")) return "notificacoes-avisos";
    if (hash.includes("/versoes")) return "versoes";
    if (hash.includes("/historico")) return "historico";
    return "visao-geral";
  }

  async function carregarDados() {
    try {
      const [resKpis, resDisp, resConfigCompleta, resLoc, resPush, resAudit] = await Promise.all([
        api.obterMobileDashboard().catch(() => null),
        api.listarMobileDispositivos().catch(() => []),
        api.obterMobileConfigCompleta().catch(() => ({ configs: {}, banners: [], avisos: [] })),
        api.listarMobileLocalizacoes().catch(() => []),
        api.listarHistoricoMobilePush().catch(() => []),
        api.listarMobileAuditoria().catch(() => []),
      ]);

      kpis = resKpis;
      dispositivos = resDisp;
      configs = resConfigCompleta.configs || {};
      banners = resConfigCompleta.banners || [];
      avisos = resConfigCompleta.avisos || [];
      localizacoes = resLoc || [];
      historicoPush = resPush || [];
      historicoAuditoria = resAudit || [];
    } catch (e: any) {
      mensagemErro = e.message || "Erro ao carregar configurações do módulo mobile.";
    } finally {
      carregando = false;
      render();
    }
  }

  function renderAlerta(): string {
    if (mensagemSucesso) {
      return `<div style="margin-bottom: 1.25rem; padding: 12px 16px; border-radius: 10px; background: #e8f6ef; border: 1px solid #a3e0c6; color: #12805c; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${mensagemSucesso}</span>
      </div>`;
    }
    if (mensagemErro) {
      return `<div style="margin-bottom: 1.25rem; padding: 12px 16px; border-radius: 10px; background: #fee4e2; border: 1px solid #fecdca; color: #b42318; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${mensagemErro}</span>
      </div>`;
    }
    return "";
  }

  function render(): void {
    if (carregando) {
      container.innerHTML = `
        <div style="padding: 3rem; text-align: center; color: #64748b; font-family: Sora, sans-serif;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #08264f; margin-bottom: 8px;">NZAIDI Mobile</div>
          <div>A carregar módulo central de configuração remota...</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="pagina-animada" style="padding: 1.5rem 2rem; max-width: 1400px; margin: 0 auto; font-family: Sora, sans-serif;">
        <!-- Cabeçalho Institucional -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 99px; background: #eaf2fc; color: #08264f; font-size: 0.75rem; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.05em;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #0e8f6e;"></span>
              SISTEMA CENTRAL DE CONFIGURAÇÃO REMOTA (ANDROID & IOS)
            </div>
            <h1 style="font-size: 1.85rem; font-weight: 800; color: #08264f; margin: 0;">Gestão da Aplicação Mobile</h1>
            <p style="color: #64748b; font-size: 0.95rem; margin: 4px 0 0;">Controlo centralizado de apresentação visual, conteúdos, contactos, funcionalidades e manutenção das aplicações móveis.</p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="btn-recarregar-dados" class="btn btn-secundario" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; font-size: 0.85rem; font-weight: 700; border-radius: 10px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; color: #08264f;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Atualizar Dados
            </button>
            <a href="https://app.nzaidi.ao/api/v1/mobile/config" target="_blank" class="btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; font-size: 0.85rem; font-weight: 700; border-radius: 10px; background: #08264f; color: #fff; text-decoration: none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              Ver API Remote Config
            </a>
          </div>
        </div>

        ${renderAlerta()}

        <!-- 10 Separadores Oficiais de Gestão -->
        <nav style="display: flex; gap: 4px; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 2px;">
          ${renderTabBtn("visao-geral", "1. Visão Geral")}
          ${renderTabBtn("personalizacao-visual", "2. Personalização Visual")}
          ${renderTabBtn("conteudos-banners", "3. Conteúdos & Banners")}
          ${renderTabBtn("contactos-suporte", "4. Contactos & Suporte")}
          ${renderTabBtn("funcionalidades", "5. Funcionalidades & Manutenção")}
          ${renderTabBtn("dispositivos", "6. Utilizadores & Dispositivos")}
          ${renderTabBtn("localizacao", "7. Localização Autorizada")}
          ${renderTabBtn("notificacoes-avisos", "8. Avisos & Notificações")}
          ${renderTabBtn("versoes", "9. Versões & Atualizações")}
          ${renderTabBtn("historico", "10. Histórico de Alterações")}
        </nav>

        <!-- Conteúdo da Aba Ativa -->
        <div id="conteudo-aba-mobile">
          ${renderConteudoAba()}
        </div>
      </div>
    `;

    vincularEventos();
  }

  function renderTabBtn(id: AbaAtiva, label: string): string {
    const ativa = abaAtiva === id;
    return `
      <button class="tab-btn-mobile" data-aba="${id}" style="padding: 10px 14px; font-size: 0.85rem; font-weight: 700; white-space: nowrap; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${ativa ? "#d9a441" : "transparent"}; color: ${ativa ? "#08264f" : "#64748b"}; transition: all 0.2s;">
        ${label}
      </button>
    `;
  }

  function renderConteudoAba(): string {
    switch (abaAtiva) {
      case "visao-geral":
        return renderVisaoGeral();
      case "personalizacao-visual":
        return renderPersonalizacaoVisual();
      case "conteudos-banners":
        return renderConteudosEBanners();
      case "contactos-suporte":
        return renderContactosESuporte();
      case "funcionalidades":
        return renderFuncionalidadesEManutencao();
      case "dispositivos":
        return renderDispositivos();
      case "localizacao":
        return renderLocalizacao();
      case "notificacoes-avisos":
        return renderNotificacoesEAvisos();
      case "versoes":
        return renderVersoes();
      case "historico":
        return renderHistorico();
      default:
        return renderVisaoGeral();
    }
  }

  // --- 1. VISÃO GERAL ---
  function renderVisaoGeral(): string {
    const totClientes = kpis?.totalClientes || 0;
    const activosAgora = kpis?.activosTempoReal || 0;
    const activos24h = kpis?.activosUltimas24h || 0;
    const activos7d = kpis?.activosUltimos7d || 0;
    const activos30d = kpis?.activosUltimos30d || 0;
    const android = kpis?.dispositivosAndroid || 0;
    const ios = kpis?.dispositivosIos || 0;
    const sessoes = kpis?.sessoesActivas || 0;

    const manutencaoAtiva = configs.manutencao_global_ativa === "true";

    return `
      <div style="display: grid; gap: 1.5rem;">
        <!-- Banner de Status de Manutenção -->
        <div style="padding: 16px 20px; border-radius: 12px; background: ${manutencaoAtiva ? "#fee4e2" : "#f0fdf4"}; border: 1px solid ${manutencaoAtiva ? "#fecdca" : "#bbf7d0"}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${manutencaoAtiva ? "#b42318" : "#0e8f6e"}; color: #fff; display: grid; place-items: center; font-weight: 800;">
              ${manutencaoAtiva ? "!" : "✓"}
            </div>
            <div>
              <strong style="color: ${manutencaoAtiva ? "#b42318" : "#166534"}; font-size: 1rem;">
                Modo de Manutenção Geral da Aplicação Móvel: ${manutencaoAtiva ? "ATIVO (APLICAÇÃO BLOQUEADA)" : "NORMAL / OPERACIONAL"}
              </strong>
              <div style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
                ${manutencaoAtiva ? (configs.manutencao_mensagem || "A aplicação móvel encontra-se em manutenção.") : "Todas as APIs de Android e iOS estão a responder normalmente sem impedimentos."}
              </div>
            </div>
          </div>
          <button id="btn-ir-manutencao" class="btn btn-secundario" style="padding: 8px 14px; font-size: 0.8rem; font-weight: 700; border-radius: 8px;">
            Gerir Modo Manutenção
          </button>
        </div>

        <!-- Cartões de Telemetria e Utilização -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          ${cardKpi("Total de Clientes Mobile", totClientes, "Registados na plataforma", "#08264f")}
          ${cardKpi("Ativos em Tempo Real", activosAgora, "Sessões ativas no momento", "#0e8f6e")}
          ${cardKpi("Ativos nas Últimas 24h", activos24h, "Utilizadores ativos hoje", "#2563eb")}
          ${cardKpi("Ativos Últimos 7 Dias", activos7d, "Retenção semanal", "#7c3aed")}
          ${cardKpi("Ativos Últimos 30 Dias", activos30d, "Volume mensal", "#08264f")}
          ${cardKpi("Dispositivos Android", android, "Aparelhos registados", "#16a34a")}
          ${cardKpi("Dispositivos iOS", ios, "Aparelhos registados", "#0284c7")}
          ${cardKpi("Sessões Ativas", sessoes, "Tokens válidos em cache", "#d97706")}
        </div>

        <!-- Resumo Rápido das Funcionalidades -->
        <div class="cartao" style="padding: 20px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(8,38,79,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 1.1rem; color: #08264f;">Estado das Funcionalidades Configuráveis</h3>
            <span style="font-size: 0.8rem; color: #64748b;">Alterações refletidas em tempo real</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
            ${badgeFunc("Câmbio", configs.func_cambio_ativa !== "false")}
            ${badgeFunc("Remessas", configs.func_remessas_ativa !== "false")}
            ${badgeFunc("Cartões Visa", configs.func_cartoes_ativa !== "false")}
            ${badgeFunc("Consulta de Taxas", configs.func_taxas_ativa !== "false")}
            ${badgeFunc("Upload Documentos", configs.func_upload_docs_ativa !== "false")}
            ${badgeFunc("Apoio e Suporte", configs.func_suporte_ativa !== "false")}
            ${badgeFunc("Notificações", configs.func_notificacoes_ativa !== "false")}
          </div>
        </div>
      </div>
    `;
  }

  function cardKpi(titulo: string, valor: number | string, sub: string, cor: string): string {
    return `
      <div class="cartao" style="padding: 18px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(8,38,79,0.03);">
        <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${titulo}</div>
        <div style="font-size: 2rem; font-weight: 800; color: ${cor}; margin: 6px 0;">${valor}</div>
        <div style="font-size: 0.75rem; color: #94a3b8;">${sub}</div>
      </div>
    `;
  }

  function badgeFunc(nome: string, ativa: boolean): string {
    return `
      <div style="padding: 10px 14px; border-radius: 8px; border: 1px solid ${ativa ? "#bbf7d0" : "#fecdca"}; background: ${ativa ? "#f0fdf4" : "#fee4e2"}; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.85rem; font-weight: 700; color: #08264f;">${nome}</span>
        <span style="font-size: 0.75rem; font-weight: 800; color: ${ativa ? "#166534" : "#b42318"};">${ativa ? "ATIVO" : "DESATIVADO"}</span>
      </div>
    `;
  }

  // --- 2. PERSONALIZAÇÃO VISUAL ---
  function renderPersonalizacaoVisual(): string {
    const logo = configs.visual_logo_url || "/logotipo.png";
    const simbolo = configs.visual_simbolo_url || "/simbolo.png";
    const prim = configs.visual_cor_primaria || "#061A3A";
    const acento = configs.visual_cor_acento || "#D5983E";
    const fundo = configs.visual_cor_fundo || "#F8FAFC";
    const msg = configs.visual_msg_boas_vindas || "Bem-vindo à NZAIDI";
    const sub = configs.visual_subtitulo_boas_vindas || "Câmbios oficiais e transferências internacionais seguras.";

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; max-width: 900px;">
        <h3 style="font-size: 1.2rem; color: #08264f; margin-top: 0;">Elementos Visuais & Identidade da Aplicação</h3>
        <p style="font-size: 0.85rem; color: #64748b;">Edite o logótipo, imagens institucionais, cores e mensagens apresentadas no ecrã inicial do NZAIDI Mobile.</p>

        <form id="form-visual" style="display: grid; gap: 1.25rem; margin-top: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">URL do Logótipo Oficial</label>
              <input type="text" id="inp-visual-logo" class="ctl" value="${logo}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
              <div style="margin-top: 10px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 0.75rem; color: #64748b;">Pré-visualização:</span>
                <img src="${logo}" alt="Logotipo" style="max-height: 40px; border-radius: 6px; background: #08264f; padding: 4px;" onerror="this.style.display='none'" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">URL do Ícone / Símbolo</label>
              <input type="text" id="inp-visual-simbolo" class="ctl" value="${simbolo}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
              <div style="margin-top: 10px; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 0.75rem; color: #64748b;">Pré-visualização:</span>
                <img src="${simbolo}" alt="Símbolo" style="max-height: 40px; border-radius: 6px;" onerror="this.style.display='none'" />
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Cor Primária (Navy)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="inp-cor-prim" value="${prim}" style="width: 44px; height: 38px; border: none; border-radius: 6px; cursor: pointer;" />
                <input type="text" id="inp-cor-prim-txt" class="ctl" value="${prim}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: monospace;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Cor de Acento (Gold)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="inp-cor-acento" value="${acento}" style="width: 44px; height: 38px; border: none; border-radius: 6px; cursor: pointer;" />
                <input type="text" id="inp-cor-acento-txt" class="ctl" value="${acento}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: monospace;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Cor de Fundo Base</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="inp-cor-fundo" value="${fundo}" style="width: 44px; height: 38px; border: none; border-radius: 6px; cursor: pointer;" />
                <input type="text" id="inp-cor-fundo-txt" class="ctl" value="${fundo}" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: monospace;" />
              </div>
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Mensagem de Boas-Vindas no Dashboard</label>
            <input type="text" id="inp-msg-boas-vindas" class="ctl" value="${msg}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Subtítulo do Hero Banner</label>
            <input type="text" id="inp-sub-boas-vindas" class="ctl" value="${sub}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
              Guardar Elementos Visuais
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // --- 3. CONTEÚDOS & BANNERS ---
  function renderConteudosEBanners(): string {
    const sobre = configs.conteudo_sobre_nzaidi || "";
    const termos = configs.conteudo_termos_condicoes || "";
    const privacidade = configs.conteudo_politica_privacidade || "";
    const avisosReg = configs.conteudo_avisos_regulamentares || "";
    const comunicados = configs.conteudo_comunicados || "";

    return `
      <div style="display: grid; gap: 2rem;">
        <!-- Gestão de Banners Promocionais -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Banners Promocionais da Aplicação</h3>
              <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Campanhas exibidas no carrossel de marketing do dashboard móvel.</p>
            </div>
            <button id="btn-novo-banner" class="btn btn-secundario" style="padding: 8px 16px; font-weight: 700; border-radius: 8px; font-size: 0.85rem; color: #08264f;">
              + Adicionar Novo Banner
            </button>
          </div>

          <div id="lista-banners-mobile" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
            ${
              banners.length === 0
                ? '<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #94a3b8;">Nenhum banner promocional cadastrado. Adicione o primeiro banner institucional acima.</div>'
                : banners
                    .map(
                      (b) => `
              <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column;">
                <div style="height: 120px; background: #08264f; display: grid; place-items: center; overflow: hidden;">
                  <img src="${b.imagem_url}" alt="${b.titulo}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/logotipo.png'" />
                </div>
                <div style="padding: 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <strong style="color: #08264f; font-size: 0.95rem;">${b.titulo}</strong>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">${b.descricao || "Sem descrição"}</div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    <span style="font-size: 0.7rem; font-weight: 700; color: ${b.ativo ? "#166534" : "#b42318"};">${b.ativo ? "ATIVO" : "INATIVO"}</span>
                    <button class="btn-remover-banner" data-id="${b.id}" style="border: none; background: transparent; color: #b42318; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Remover</button>
                  </div>
                </div>
              </div>
            `
                    )
                    .join("")
            }
          </div>
        </div>

        <!-- Conteúdos Institucionais -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Informações Institucionais & Políticas</h3>
          <p style="font-size: 0.85rem; color: #64748b;">Textos consumidos pelas abas "Sobre", "Termos" e "Privacidade" no Android e iOS.</p>

          <form id="form-conteudos" style="display: grid; gap: 1.25rem; margin-top: 1.5rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Sobre a NZAIDI</label>
              <textarea id="inp-sobre" rows="4" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${sobre}</textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Termos e Condições Oficiais</label>
                <textarea id="inp-termos" rows="6" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${termos}</textarea>
              </div>

              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Política de Privacidade e Proteção de Dados</label>
                <textarea id="inp-privacidade" rows="6" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${privacidade}</textarea>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Avisos Regulamentares (BNA)</label>
                <textarea id="inp-avisos-reg" rows="3" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${avisosReg}</textarea>
              </div>

              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Comunicados Oficiais</label>
                <textarea id="inp-comunicados" rows="3" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${comunicados}</textarea>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
              <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
                Guardar Conteúdos Institucionais
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // --- 4. CONTACTOS & SUPORTE ---
  function renderContactosESuporte(): string {
    const tel = configs.contactos_telefone || "+244 923 123 456";
    const wpp = configs.contactos_whatsapp || "+244 930 654 321";
    const email = configs.contactos_email || "suporte@nzaidi.ao";
    const end = configs.contactos_endereco || "Rua Amílcar Cabral, n.º 45, Maianga, Luanda - Angola";
    const hor = configs.contactos_horario || "Segunda a Sexta: 08h00 - 18h00 | Sábados: 08h30 - 13h00";

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; max-width: 800px;">
        <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Canais Oficiais de Atendimento & Contactos</h3>
        <p style="font-size: 0.85rem; color: #64748b;">Estes dados são apresentados no ecrã de suporte e rodapés do aplicativo móvel.</p>

        <form id="form-contactos" style="display: grid; gap: 1.25rem; margin-top: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Telefone de Atendimento</label>
              <input type="text" id="inp-tel" class="ctl" value="${tel}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">WhatsApp Institucional</label>
              <input type="text" id="inp-wpp" class="ctl" value="${wpp}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Email de Apoio ao Cliente</label>
            <input type="email" id="inp-email-sup" class="ctl" value="${email}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Endereço Físico do Balcão</label>
            <input type="text" id="inp-end" class="ctl" value="${end}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Horário de Funcionamento</label>
            <input type="text" id="inp-hor" class="ctl" value="${hor}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
              Guardar Contactos de Suporte
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // --- 5. FUNCIONALIDADES & MANUTENÇÃO ---
  function renderFuncionalidadesEManutencao(): string {
    const manutencaoAtiva = configs.manutencao_global_ativa === "true";
    const msgManutencao = configs.manutencao_mensagem || "";
    const prevFim = configs.manutencao_previsao_fim || "";

    return `
      <div style="display: grid; gap: 2rem; max-width: 900px;">
        <!-- Bloco 1: Modo de Manutenção Geral -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 2px solid ${manutencaoAtiva ? "#b42318" : "#e2e8f0"};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.25rem; color: #08264f;">Modo de Manutenção Geral</h3>
              <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Quando ativado, bloqueia operações no aplicativo e apresenta o ecrã de manutenção institucional aos utilizadores.</p>
            </div>
            <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 26px;">
              <input type="checkbox" id="chk-manutencao-global" ${manutencaoAtiva ? "checked" : ""} style="opacity: 0; width: 0; height: 0;" />
              <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${manutencaoAtiva ? "#b42318" : "#cbd5e1"}; border-radius: 34px; transition: .4s;">
                <span style="position: absolute; content: ''; height: 20px; width: 20px; left: ${manutencaoAtiva ? "26px" : "3px"}; bottom: 3px; background-color: white; border-radius: 50%; transition: .4s;"></span>
              </span>
            </label>
          </div>

          <form id="form-manutencao" style="display: grid; gap: 1rem; margin-top: 1rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Mensagem de Manutenção Apresentada na Aplicação</label>
              <input type="text" id="inp-manutencao-msg" class="ctl" value="${msgManutencao}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Previsão de Restabelecimento</label>
              <input type="text" id="inp-manutencao-prev" class="ctl" value="${prevFim}" placeholder="Ex: Hoje às 22h00 de Luanda" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button type="submit" class="btn" style="padding: 8px 20px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
                Guardar Modo de Manutenção
              </button>
            </div>
          </form>
        </div>

        <!-- Bloco 2: Gestão Individual de Funcionalidades & Bloqueio Real -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Disponibilidade Específica por Funcionalidade</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">Desativar uma funcionalidade bloqueia a operação tanto na interface como na API Central (código 503 com mensagem personalizada).</p>

          <form id="form-funcionalidades" style="display: grid; gap: 1.25rem;">
            ${itemFuncionalidade("cambio", "Câmbios de Divisas", configs.func_cambio_ativa !== "false", configs.func_cambio_aviso || "Serviço de câmbio em atualização temporária.")}
            ${itemFuncionalidade("remessas", "Remessas Internacionais", configs.func_remessas_ativa !== "false", configs.func_remessas_aviso || "Serviço de remessas temporariamente indisponível.")}
            ${itemFuncionalidade("cartoes", "Cartões Visa StroWallet", configs.func_cartoes_ativa !== "false", configs.func_cartoes_aviso || "Emissão de cartões em atualização periódica.")}
            ${itemFuncionalidade("taxas", "Consulta de Taxas BNA", configs.func_taxas_ativa !== "false", configs.func_taxas_aviso || "Consulta de taxas suspensa para atualização.")}
            ${itemFuncionalidade("upload_docs", "Envio de Documentos KYC", configs.func_upload_docs_ativa !== "false", configs.func_upload_docs_aviso || "Recepção de documentos temporariamente suspensa.")}
            ${itemFuncionalidade("suporte", "Centro de Suporte & Chat", configs.func_suporte_ativa !== "false", configs.func_suporte_aviso || "Atendimento por chat fora do expediente.")}
            ${itemFuncionalidade("notificacoes", "Receção de Notificações", configs.func_notificacoes_ativa !== "false", configs.func_notificacoes_aviso || "Serviço de notificações em manutenção.")}

            <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
              <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
                Guardar Permissões de Funcionalidades
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function itemFuncionalidade(id: string, titulo: string, ativo: boolean, aviso: string): string {
    return `
      <div style="padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; display: grid; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #08264f; font-size: 0.95rem;">${titulo}</strong>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 700;">
            <input type="checkbox" id="chk-func-${id}" ${ativo ? "checked" : ""} />
            <span style="color: ${ativo ? "#166534" : "#b42318"};">${ativo ? "Ativo" : "Desativado"}</span>
          </label>
        </div>
        <div>
          <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">Aviso apresentado ao utilizador quando indisponível:</label>
          <input type="text" id="inp-func-aviso-${id}" class="ctl" value="${aviso}" style="width: 100%; padding: 6px 10px; font-size: 0.8rem; border-radius: 6px; border: 1px solid #cbd5e1;" />
        </div>
      </div>
    `;
  }

  // --- 6. UTILIZADORES & DISPOSITIVOS ---
  function renderDispositivos(): string {
    const filtrados = dispositivos.filter((d) => {
      const matchTermo = !filtroDispTermo || (d.nome_dispositivo || "").toLowerCase().includes(filtroDispTermo.toLowerCase()) || (d.cliente_nome || "").toLowerCase().includes(filtroDispTermo.toLowerCase());
      const matchPlat = !filtroDispPlataforma || d.plataforma === filtroDispPlataforma;
      return matchTermo && matchPlat;
    });

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Dispositivos Móveis Registados</h3>
            <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Gestão de autorização, versões de app e bloqueio preventivo de segurança.</p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" id="inp-filtro-disp" placeholder="Pesquisar por cliente ou dispositivo..." value="${filtroDispTermo}" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1; min-width: 260px;" />
            <select id="sel-filtro-plat" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1;">
              <option value="">Todas as Plataformas</option>
              <option value="android" ${filtroDispPlataforma === "android" ? "selected" : ""}>Android</option>
              <option value="ios" ${filtroDispPlataforma === "ios" ? "selected" : ""}>iOS</option>
            </select>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 10px 12px;">Cliente</th>
                <th style="padding: 10px 12px;">Dispositivo / SO</th>
                <th style="padding: 10px 12px;">Plataforma</th>
                <th style="padding: 10px 12px;">Versão App</th>
                <th style="padding: 10px 12px;">Último IP</th>
                <th style="padding: 10px 12px;">Último Acesso</th>
                <th style="padding: 10px 12px;">Status</th>
                <th style="padding: 10px 12px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtrados.length === 0
                  ? '<tr><td colspan="8" style="padding: 2rem; text-align: center; color: #94a3b8;">Nenhum dispositivo localizado.</td></tr>'
                  : filtrados
                      .map(
                        (d) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 12px;">
                    <strong style="color: #08264f;">${d.cliente_nome || "Cliente"}</strong>
                    <div style="font-size: 0.75rem; color: #64748b;">${d.cliente_email || ""}</div>
                  </td>
                  <td style="padding: 10px 12px;">
                    <div>${d.nome_dispositivo}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">SO: ${d.versao_so}</div>
                  </td>
                  <td style="padding: 10px 12px;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 0.75rem; background: ${d.plataforma === "android" ? "#dcfce7" : "#e0f2fe"}; color: ${d.plataforma === "android" ? "#166534" : "#0369a1"};">
                      ${d.plataforma === "android" ? "Android" : "iOS"}
                    </span>
                  </td>
                  <td style="padding: 10px 12px; font-family: monospace;">v${d.versao_app}</td>
                  <td style="padding: 10px 12px; font-family: monospace; color: #64748b;">${d.ultimo_ip || "—"}</td>
                  <td style="padding: 10px 12px; color: #64748b;">${new Date(d.ultimo_acesso).toLocaleString()}</td>
                  <td style="padding: 10px 12px;">
                    <span style="padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 0.75rem; background: ${d.status === "ativo" ? "#dcfce7" : "#fee4e2"}; color: ${d.status === "ativo" ? "#166534" : "#b42318"};">
                      ${d.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding: 10px 12px; text-align: right;">
                    ${
                      d.status === "ativo"
                        ? `<button class="btn-bloquear-disp" data-id="${d.id}" style="padding: 4px 10px; border-radius: 6px; border: 1px solid #fecdca; background: #fee4e2; color: #b42318; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Bloquear</button>`
                        : `<button class="btn-revogar-disp" data-id="${d.id}" style="padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Revogar</button>`
                    }
                  </td>
                </tr>
              `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- 7. LOCALIZAÇÃO AUTORIZADA ---
  function renderLocalizacao(): string {
    const filtrados = localizacoes.filter((l) => {
      if (filtroLocConsentimento === "1") return l.consentimento === 1;
      if (filtroLocConsentimento === "0") return l.consentimento === 0;
      return true;
    });

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Localização dos Utilizadores Móveis</h3>
            <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">
              Respeito rigoroso às permissões do SO e privacidade. Apenas registado quando o cliente concede autorização expressa no dispositivo.
            </p>
          </div>

          <div>
            <select id="sel-filtro-loc-consentimento" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1;">
              <option value="">Todos os Registos</option>
              <option value="1" ${filtroLocConsentimento === "1" ? "selected" : ""}>Apenas Autorizados</option>
              <option value="0" ${filtroLocConsentimento === "0" ? "selected" : ""}>Não Autorizados / Recusados</option>
            </select>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 10px 12px;">Cliente</th>
                <th style="padding: 10px 12px;">Dispositivo</th>
                <th style="padding: 10px 12px;">Consentimento</th>
                <th style="padding: 10px 12px;">Cidade / Região</th>
                <th style="padding: 10px 12px;">Coordenadas</th>
                <th style="padding: 10px 12px;">IP</th>
                <th style="padding: 10px 12px;">Data / Hora</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtrados.length === 0
                  ? '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: #94a3b8;">Nenhum registo de localização disponível.</td></tr>'
                  : filtrados
                      .map(
                        (l) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 12px;">
                    <strong style="color: #08264f;">${l.cliente_nome || "Cliente"}</strong>
                    <div style="font-size: 0.75rem; color: #64748b;">${l.cliente_email || ""}</div>
                  </td>
                  <td style="padding: 10px 12px;">
                    <div>${l.nome_dispositivo || "Dispositivo"}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">${l.plataforma ? l.plataforma.toUpperCase() : "Móvel"}</div>
                  </td>
                  <td style="padding: 10px 12px;">
                    ${
                      l.consentimento === 1
                        ? '<span style="padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 0.75rem; background: #dcfce7; color: #166534;">AUTORIZADA</span>'
                        : '<span style="padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 0.75rem; background: #fee4e2; color: #b42318;">NÃO AUTORIZADA</span>'
                    }
                  </td>
                  <td style="padding: 10px 12px;">
                    ${l.consentimento === 1 ? `<b>${l.cidade || "Luanda"}</b>, ${l.regiao || "Luanda"}` : '<span style="color: #94a3b8; font-style: italic;">Não autorizada pelo utilizador</span>'}
                  </td>
                  <td style="padding: 10px 12px; font-family: monospace;">
                    ${
                      l.consentimento === 1 && l.latitude
                        ? `<a href="https://www.google.com/maps?q=${l.latitude},${l.longitude}" target="_blank" style="color: #2563eb; text-decoration: none;">${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)} ↗</a>`
                        : "—"
                    }
                  </td>
                  <td style="padding: 10px 12px; font-family: monospace; color: #64748b;">${l.ip || "—"}</td>
                  <td style="padding: 10px 12px; color: #64748b;">${new Date(l.atualizado_em).toLocaleString()}</td>
                </tr>
              `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- 8. AVISOS & NOTIFICAÇÕES PUSH ---
  function renderNotificacoesEAvisos(): string {
    return `
      <div style="display: grid; gap: 2rem;">
        <!-- Bloco de Avisos Institucionais -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Avisos & Comunicados In-App</h3>
              <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Mensagens categorizadas (informativo, importante, urgente) apresentadas no aplicativo.</p>
            </div>
            <button id="btn-novo-aviso" class="btn btn-secundario" style="padding: 8px 16px; font-weight: 700; border-radius: 8px; font-size: 0.85rem;">
              + Publicar Novo Aviso
            </button>
          </div>

          <div style="display: grid; gap: 10px;">
            ${
              avisos.length === 0
                ? '<div style="padding: 2rem; text-align: center; color: #94a3b8;">Nenhum aviso ativo de momento.</div>'
                : avisos
                    .map(
                      (a) => `
              <div style="padding: 14px; border-radius: 10px; border-left: 4px solid ${a.categoria === "urgente" ? "#b42318" : a.categoria === "importante" ? "#d97706" : "#2563eb"}; background: #f8fafc; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <strong style="color: #08264f; font-size: 0.95rem;">${a.titulo}</strong>
                    <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; background: #e2e8f0; color: #475569;">${a.categoria}</span>
                    <span style="font-size: 0.7rem; color: #64748b;">Posição: ${a.posicao}</span>
                  </div>
                  <div style="font-size: 0.85rem; color: #334155; line-height: 1.4;">${a.mensagem}</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 6px;">Vigência: ${new Date(a.inicio_em).toLocaleDateString()} até ${new Date(a.fim_em).toLocaleDateString()}</div>
                </div>
                <button class="btn-remover-aviso" data-id="${a.id}" style="border: none; background: transparent; color: #b42318; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Excluir</button>
              </div>
            `
                    )
                    .join("")
            }
          </div>
        </div>

        <!-- Bloco de Disparo de Notificações Push -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Disparo Remoto de Notificações Push</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.25rem;">Transmissão imediata de alertas push aos dispositivos móveis cadastrados.</p>

          <form id="form-disparo-push" style="display: grid; gap: 1rem; max-width: 600px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Título da Notificação</label>
              <input type="text" id="inp-push-titulo" required placeholder="Ex: Novas cotações atualizadas" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Mensagem / Conteúdo</label>
              <textarea id="inp-push-mensagem" required rows="3" placeholder="Ex: Consulte agora as novas taxas de câmbio USD e EUR no balcão NZAIDI." class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;"></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Plataforma Alvo</label>
                <select id="sel-push-plataforma" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                  <option value="todas">Todas (Android + iOS)</option>
                  <option value="android">Apenas Android</option>
                  <option value="ios">Apenas iOS</option>
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Segmento</label>
                <select id="sel-push-segmento" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                  <option value="todos">Todos os Clientes</option>
                  <option value="kyc_aprovado">Apenas KYC Aprovado</option>
                </select>
              </div>
            </div>

            <div>
              <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #0e8f6e; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
                Enviar Notificação Push
              </button>
            </div>
          </form>

          <!-- Histórico de Envios -->
          <div style="margin-top: 2rem;">
            <h4 style="color: #08264f; margin-bottom: 10px;">Histórico de Notificações Enviadas</h4>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                <thead>
                  <tr style="border-bottom: 1px solid #e2e8f0; text-align: left; color: #64748b;">
                    <th style="padding: 8px;">Data/Hora</th>
                    <th style="padding: 8px;">Título</th>
                    <th style="padding: 8px;">Plataforma</th>
                    <th style="padding: 8px;">Destinatários</th>
                    <th style="padding: 8px;">Enviado Por</th>
                    <th style="padding: 8px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    historicoPush.length === 0
                      ? '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: #94a3b8;">Nenhum envio registrado.</td></tr>'
                      : historicoPush
                          .map(
                            (h) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 8px;">${new Date(h.enviado_em).toLocaleString()}</td>
                      <td style="padding: 8px;"><strong>${h.titulo}</strong></td>
                      <td style="padding: 8px; text-transform: uppercase;">${h.plataforma_alvo}</td>
                      <td style="padding: 8px;">${h.total_destinatarios}</td>
                      <td style="padding: 8px;">${h.enviado_por}</td>
                      <td style="padding: 8px;"><span style="color: #166534; font-weight: 700;">${h.status.toUpperCase()}</span></td>
                    </tr>
                  `
                          )
                          .join("")
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 9. VERSÕES & ATUALIZAÇÕES ---
  function renderVersoes(): string {
    const vAtualAndroid = configs.versao_atual_android || "1.0.4";
    const vMinAndroid = configs.versao_minima_android || "1.0.0";
    const vAtualIos = configs.versao_atual_ios || "1.0.4";
    const vMinIos = configs.versao_minima_ios || "1.0.0";
    const obrigatoria = configs.atualizacao_obrigatoria === "true";
    const gPlay = configs.loja_google_play_url || "";
    const aStore = configs.loja_app_store_url || "";
    const notas = configs.notas_da_versao || "";

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; max-width: 850px;">
        <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Gestão de Versões & Atualizações Remotas</h3>
        <p style="font-size: 0.85rem; color: #64748b;">
          Controlo de compatibilidade para Android e iOS. Caso a atualização seja marcada como obrigatória, versões inferiores à mínima serão impedidas de transacionar.
        </p>

        <form id="form-versoes" style="display: grid; gap: 1.25rem; margin-top: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <!-- Android -->
            <div style="padding: 16px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <h4 style="margin: 0 0 12px 0; color: #16a34a; font-size: 1rem;">Google Android</h4>
              <div style="display: grid; gap: 10px;">
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Atual Estável</label>
                  <input type="text" id="inp-v-atual-android" class="ctl" value="${vAtualAndroid}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Mínima Obrigatória</label>
                  <input type="text" id="inp-v-min-android" class="ctl" value="${vMinAndroid}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Link Google Play Store</label>
                  <input type="text" id="inp-gplay" class="ctl" value="${gPlay}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                </div>
              </div>
            </div>

            <!-- iOS -->
            <div style="padding: 16px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <h4 style="margin: 0 0 12px 0; color: #0284c7; font-size: 1rem;">Apple iOS</h4>
              <div style="display: grid; gap: 10px;">
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Atual Estável</label>
                  <input type="text" id="inp-v-atual-ios" class="ctl" value="${vAtualIos}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Mínima Obrigatória</label>
                  <input type="text" id="inp-v-min-ios" class="ctl" value="${vMinIos}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Link Apple App Store</label>
                  <input type="text" id="inp-appstore" class="ctl" value="${aStore}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                </div>
              </div>
            </div>
          </div>

          <div style="padding: 14px; border-radius: 10px; background: #fefce8; border: 1px solid #fef08a; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <strong style="color: #854d0e;">Exigir Atualização Obrigatória (Force Update)</strong>
              <div style="font-size: 0.8rem; color: #a16207;">Se ativo, a app bloqueia o acesso e direciona o utilizador diretamente à loja.</div>
            </div>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700;">
              <input type="checkbox" id="chk-atualizacao-obrigatoria" ${obrigatoria ? "checked" : ""} />
              <span>${obrigatoria ? "Sim, Obrigatória" : "Opcional"}</span>
            </label>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Notas da Versão (Changelog institucional)</label>
            <textarea id="inp-notas-versao" rows="3" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${notas}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
              Guardar Configuração de Versões
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // --- 10. HISTÓRICO DE ALTERAÇÕES ---
  function renderHistorico(): string {
    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
        <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Trilha de Auditoria das Configurações Móveis</h3>
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.25rem;">Registo imutável de quem alterou, data, hora, secção, valor anterior e novo valor.</p>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 10px 12px;">Data / Hora</th>
                <th style="padding: 10px 12px;">Administrador</th>
                <th style="padding: 10px 12px;">Secção</th>
                <th style="padding: 10px 12px;">Chave Configurada</th>
                <th style="padding: 10px 12px;">Valor Anterior</th>
                <th style="padding: 10px 12px;">Novo Valor</th>
              </tr>
            </thead>
            <tbody>
              ${
                historicoAuditoria.length === 0
                  ? '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #94a3b8;">Nenhuma alteração registada até ao momento.</td></tr>'
                  : historicoAuditoria
                      .map(
                        (h) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 12px; color: #64748b; white-space: nowrap;">${new Date(h.criado_em).toLocaleString()}</td>
                  <td style="padding: 10px 12px;"><strong style="color: #08264f;">${h.administrador_nome}</strong></td>
                  <td style="padding: 10px 12px;"><span style="padding: 2px 6px; border-radius: 4px; background: #e2e8f0; font-size: 0.75rem; font-weight: 700;">${h.secao}</span></td>
                  <td style="padding: 10px 12px; font-family: monospace; color: #0369a1;">${h.chave}</td>
                  <td style="padding: 10px 12px; color: #94a3b8; font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${h.valor_anterior || "—"}</td>
                  <td style="padding: 10px 12px; color: #166534; font-weight: 700; font-size: 0.8rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${h.valor_novo}</td>
                </tr>
              `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- VINCULAÇÃO DE EVENTOS ---
  function vincularEventos(): void {
    // Abas de navegação
    container.querySelectorAll(".tab-btn-mobile").forEach((btn) => {
      btn.addEventListener("click", () => {
        const aba = btn.getAttribute("data-aba") as AbaAtiva;
        abaAtiva = aba;
        window.location.hash = "#api-gestao/" + aba;
        render();
      });
    });

    document.getElementById("btn-recarregar-dados")?.addEventListener("click", () => {
      carregando = true;
      carregarDados();
    });

    document.getElementById("btn-ir-manutencao")?.addEventListener("click", () => {
      abaAtiva = "funcionalidades";
      render();
    });

    // Filtros de Dispositivos
    document.getElementById("inp-filtro-disp")?.addEventListener("input", (e: any) => {
      filtroDispTermo = e.target.value;
      render();
    });
    document.getElementById("sel-filtro-plat")?.addEventListener("change", (e: any) => {
      filtroDispPlataforma = e.target.value;
      render();
    });

    // Filtro de Localização
    document.getElementById("sel-filtro-loc-consentimento")?.addEventListener("change", (e: any) => {
      filtroLocConsentimento = e.target.value;
      render();
    });

    // Bloquear / Revogar Dispositivo
    container.querySelectorAll(".btn-bloquear-disp").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (id && confirm("Deseja bloquear este dispositivo móvel? Todas as sessões serão revogadas imediatamente.")) {
          try {
            await api.bloquearMobileDispositivo(id);
            mensagemSucesso = "Dispositivo móvel bloqueado com sucesso.";
            carregarDados();
          } catch (e: any) {
            mensagemErro = e.message || "Falha ao bloquear dispositivo.";
            render();
          }
        }
      });
    });

    // Form 1: Visual
    document.getElementById("form-visual")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const confs: Record<string, string> = {
          visual_logo_url: (document.getElementById("inp-visual-logo") as HTMLInputElement).value,
          visual_simbolo_url: (document.getElementById("inp-visual-simbolo") as HTMLInputElement).value,
          visual_cor_primaria: (document.getElementById("inp-cor-prim-txt") as HTMLInputElement).value,
          visual_cor_acento: (document.getElementById("inp-cor-acento-txt") as HTMLInputElement).value,
          visual_cor_fundo: (document.getElementById("inp-cor-fundo-txt") as HTMLInputElement).value,
          visual_msg_boas_vindas: (document.getElementById("inp-msg-boas-vindas") as HTMLInputElement).value,
          visual_subtitulo_boas_vindas: (document.getElementById("inp-sub-boas-vindas") as HTMLInputElement).value,
        };
        await api.atualizarMobileConfigSecao("visual", confs);
        mensagemSucesso = "Configurações visuais guardadas e publicadas com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao guardar configurações visuais.";
        render();
      }
    });

    // Form 2: Conteúdos
    document.getElementById("form-conteudos")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const confs: Record<string, string> = {
          conteudo_sobre_nzaidi: (document.getElementById("inp-sobre") as HTMLTextAreaElement).value,
          conteudo_termos_condicoes: (document.getElementById("inp-termos") as HTMLTextAreaElement).value,
          conteudo_politica_privacidade: (document.getElementById("inp-privacidade") as HTMLTextAreaElement).value,
          conteudo_avisos_regulamentares: (document.getElementById("inp-avisos-reg") as HTMLTextAreaElement).value,
          conteudo_comunicados: (document.getElementById("inp-comunicados") as HTMLTextAreaElement).value,
        };
        await api.atualizarMobileConfigSecao("conteudos", confs);
        mensagemSucesso = "Conteúdos institucionais atualizados com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao guardar conteúdos.";
        render();
      }
    });

    // Form 3: Contactos
    document.getElementById("form-contactos")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const confs: Record<string, string> = {
          contactos_telefone: (document.getElementById("inp-tel") as HTMLInputElement).value,
          contactos_whatsapp: (document.getElementById("inp-wpp") as HTMLInputElement).value,
          contactos_email: (document.getElementById("inp-email-sup") as HTMLInputElement).value,
          contactos_endereco: (document.getElementById("inp-end") as HTMLInputElement).value,
          contactos_horario: (document.getElementById("inp-hor") as HTMLInputElement).value,
        };
        await api.atualizarMobileConfigSecao("contactos", confs);
        mensagemSucesso = "Contactos oficiais atualizados com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao guardar contactos.";
        render();
      }
    });

    // Form 4: Manutenção Geral
    document.getElementById("form-manutencao")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const ativa = (document.getElementById("chk-manutencao-global") as HTMLInputElement).checked;
        const msg = (document.getElementById("inp-manutencao-msg") as HTMLInputElement).value;
        const prev = (document.getElementById("inp-manutencao-prev") as HTMLInputElement).value;
        await api.atualizarMobileConfigSecao("manutencao", {
          manutencao_global_ativa: ativa ? "true" : "false",
          manutencao_mensagem: msg,
          manutencao_previsao_fim: prev,
        });
        mensagemSucesso = "Modo de manutenção atualizado com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao atualizar modo de manutenção.";
        render();
      }
    });

    // Form 5: Funcionalidades
    document.getElementById("form-funcionalidades")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const modulos = ["cambio", "remessas", "cartoes", "taxas", "upload_docs", "suporte", "notificacoes"];
        const confs: Record<string, string> = {};
        for (const m of modulos) {
          const chk = document.getElementById("chk-func-" + m) as HTMLInputElement | null;
          const inp = document.getElementById("inp-func-aviso-" + m) as HTMLInputElement | null;
          if (chk) confs[`func_${m}_ativa`] = chk.checked ? "true" : "false";
          if (inp) confs[`func_${m}_aviso`] = inp.value;
        }
        await api.atualizarMobileConfigSecao("funcionalidades", confs);
        mensagemSucesso = "Disponibilidade de funcionalidades atualizada e aplicada na API!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao guardar funcionalidades.";
        render();
      }
    });

    // Form 6: Versões
    document.getElementById("form-versoes")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const confs: Record<string, string> = {
          versao_atual_android: (document.getElementById("inp-v-atual-android") as HTMLInputElement).value,
          versao_minima_android: (document.getElementById("inp-v-min-android") as HTMLInputElement).value,
          loja_google_play_url: (document.getElementById("inp-gplay") as HTMLInputElement).value,
          versao_atual_ios: (document.getElementById("inp-v-atual-ios") as HTMLInputElement).value,
          versao_minima_ios: (document.getElementById("inp-v-min-ios") as HTMLInputElement).value,
          loja_app_store_url: (document.getElementById("inp-appstore") as HTMLInputElement).value,
          atualizacao_obrigatoria: (document.getElementById("chk-atualizacao-obrigatoria") as HTMLInputElement).checked ? "true" : "false",
          notas_da_versao: (document.getElementById("inp-notas-versao") as HTMLTextAreaElement).value,
        };
        await api.atualizarMobileConfigSecao("versoes", confs);
        mensagemSucesso = "Configurações de versões e lojas salvas com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao guardar versões.";
        render();
      }
    });

    // Form 7: Notificação Push
    document.getElementById("form-disparo-push")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const titulo = (document.getElementById("inp-push-titulo") as HTMLInputElement).value;
        const mensagem = (document.getElementById("inp-push-mensagem") as HTMLTextAreaElement).value;
        const plataformaAlvo = (document.getElementById("sel-push-plataforma") as HTMLSelectElement).value;
        const segmento = (document.getElementById("sel-push-segmento") as HTMLSelectElement).value;

        await api.dispararMobilePush({ titulo, mensagem, plataformaAlvo, segmento });
        mensagemSucesso = "Notificação push transmitida com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Falha ao enviar notificação push.";
        render();
      }
    });

    // Botão Novo Banner
    document.getElementById("btn-novo-banner")?.addEventListener("click", async () => {
      const titulo = prompt("Título do Banner Promocional:");
      if (!titulo) return;
      const imagemUrl = prompt("URL da Imagem do Banner:", "/logotipo.png");
      if (!imagemUrl) return;
      const descricao = prompt("Descrição curta do Banner:", "Campanha NZAIDI");

      try {
        await api.adicionarMobileBanner({ titulo, imagemUrl, descricao, ativo: 1, ordem: 0 });
        mensagemSucesso = "Novo banner promocional adicionado com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao criar banner.";
        render();
      }
    });

    // Botão Remover Banner
    container.querySelectorAll(".btn-remover-banner").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (id && confirm("Deseja remover este banner promocional?")) {
          try {
            await api.removerMobileBanner(id);
            mensagemSucesso = "Banner removido.";
            carregarDados();
          } catch (err: any) {
            mensagemErro = err.message || "Erro ao remover banner.";
            render();
          }
        }
      });
    });

    // Botão Novo Aviso
    document.getElementById("btn-novo-aviso")?.addEventListener("click", async () => {
      const titulo = prompt("Título do Aviso In-App:");
      if (!titulo) return;
      const mensagem = prompt("Mensagem do Aviso:");
      if (!mensagem) return;
      const categoria = (prompt("Categoria (informativo / importante / urgente):", "informativo") || "informativo") as any;

      try {
        await api.criarMobileAviso({
          titulo,
          mensagem,
          categoria,
          posicao: "dashboard",
          prioridade: categoria === "urgente" ? 3 : categoria === "importante" ? 2 : 1,
        });
        mensagemSucesso = "Aviso institucional publicado com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao publicar aviso.";
        render();
      }
    });

    // Botão Remover Aviso
    container.querySelectorAll(".btn-remover-aviso").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (id && confirm("Deseja excluir este aviso?")) {
          try {
            await api.removerMobileAviso(id);
            mensagemSucesso = "Aviso removido.";
            carregarDados();
          } catch (err: any) {
            mensagemErro = err.message || "Erro ao remover aviso.";
            render();
          }
        }
      });
    });
  }

  // Inicialização
  carregarDados();
}
