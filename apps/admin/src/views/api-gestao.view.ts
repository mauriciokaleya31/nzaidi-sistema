import { api } from "../api/cliente";

type AbaAtiva =
  | "visao-geral"
  | "visual"
  | "conteudos"
  | "contactos"
  | "funcionalidades"
  | "paises-remessas"
  | "dispositivos"
  | "localizacoes"
  | "notificacoes"
  | "versoes"
  | "auditoria";

export function renderizarApiGestao(container: HTMLElement): void {
  function obterAbaInicial(): AbaAtiva {
    const hash = window.location.hash || "";
    const partes = hash.split("/");
    if (partes.length >= 2) {
      const sub = partes[1].split("?")[0] as AbaAtiva;
      const validas: AbaAtiva[] = [
        "visao-geral",
        "visual",
        "conteudos",
        "contactos",
        "funcionalidades",
        "paises-remessas",
        "dispositivos",
        "localizacoes",
        "notificacoes",
        "versoes",
        "auditoria"
      ];
      if (validas.includes(sub)) return sub;
    }
    return "visao-geral";
  }

  let abaAtiva: AbaAtiva = obterAbaInicial();
  let carregando = true;
  let mensagemSucesso: string | null = null;
  let mensagemErro: string | null = null;

  // Estados de dados carregados
  let configs: Record<string, string> = {};
  let banners: any[] = [];
  let avisos: any[] = [];
  let dispositivos: any[] = [];
  let localizacoes: any[] = [];
  let historicoPush: any[] = [];
  let historicoAuditoria: any[] = [];
  let telemetriaDashboard: any = null;
  let paisesRemessas: any[] = [];

  // Modais / Formulários expansíveis inline
  let exibindoModalBanner = false;
  let exibindoModalAviso = false;
  let exibindoModalPais = false;

  // Filtros locais
  let filtroDispTermo = "";
  let filtroDispPlataforma = "todas";

  async function carregarDados(): Promise<void> {
    try {
      const [resConfig, resDisp, resLoc, resPush, resAudit, resDash, resPaises] = await Promise.all([
        api.obterMobileConfigCompleta().catch(() => ({ configs: {}, banners: [], avisos: [] })),
        api.listarMobileDispositivos().catch(() => []),
        api.listarMobileLocalizacoes().catch(() => []),
        api.listarHistoricoMobilePush().catch(() => []),
        api.listarMobileAuditoria().catch(() => []),
        api.obterMobileDashboard().catch(() => null),
        api.listarPaisesRemessas().catch(() => []),
      ]);

      configs = resConfig.configs || {};
      banners = resConfig.banners || [];
      avisos = resConfig.avisos || [];
      dispositivos = resDisp || [];
      localizacoes = resLoc || [];
      historicoPush = resPush || [];
      historicoAuditoria = resAudit || [];
      telemetriaDashboard = resDash || null;
      paisesRemessas = resPaises || [];
      carregando = false;
      render();
    } catch (err: any) {
      mensagemErro = err.message || "Falha ao carregar configurações da API Mobile.";
      carregando = false;
      render();
    }
  }

  function renderAlerta(): string {
    if (mensagemSucesso) {
      return `
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #065f46; font-size: 0.9rem; font-weight: 600;">✓ ${mensagemSucesso}</span>
          <button id="btn-fechar-alerta-sucesso" style="background: none; border: none; font-size: 1.1rem; color: #065f46; cursor: pointer;">&times;</button>
        </div>
      `;
    }
    if (mensagemErro) {
      return `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #991b1b; font-size: 0.9rem; font-weight: 600;">⚠ ${mensagemErro}</span>
          <button id="btn-fechar-alerta-erro" style="background: none; border: none; font-size: 1.1rem; color: #991b1b; cursor: pointer;">&times;</button>
        </div>
      `;
    }
    return "";
  }

  function render(): void {
    if (carregando) {
      container.innerHTML = `
        <div class="cartao" style="padding: 3rem; text-align: center;">
          <div class="loader" style="margin: 0 auto 1rem;"></div>
          <p style="color: #64748b; font-weight: 600;">A carregar consola de gestão remota do NZAIDI Mobile...</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="max-width: 1350px; margin: 0 auto; padding-bottom: 3rem;">
        <!-- Cabeçalho Principal -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 style="margin: 0; font-size: 1.6rem; color: #08264f; font-weight: 800;">Gestão da Aplicação Mobile</h2>
              <span style="padding: 4px 10px; border-radius: 99px; background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 700;">Android & iOS</span>
            </div>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 0.9rem;">
              Controlo remoto centralizado de identidade visual, parâmetros institucionais, funcionalidades, avisos e monitorização de dispositivos.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="/api/v1/mobile/config" target="_blank" class="btn btn-secundario" style="padding: 8px 16px; font-size: 0.85rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 6px;">
              <span>Testar Remote Config JSON</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
            <button id="btn-recarregar-dados" class="btn btn-secundario" style="padding: 8px 14px; font-size: 0.85rem; font-weight: 700;">
              ↻ Atualizar
            </button>
          </div>
        </div>

        ${renderAlerta()}

        <!-- 10 Separadores Oficiais de Navegação -->
        <div style="display: flex; gap: 4px; border-bottom: 2px solid #e2e8f0; overflow-x: auto; margin-bottom: 1.75rem; padding-bottom: 2px;">
          ${renderTabBtn("visao-geral", "1. Visão Geral")}
          ${renderTabBtn("visual", "2. Personalização Visual")}
          ${renderTabBtn("conteudos", "3. Conteúdos & Banners")}
          ${renderTabBtn("contactos", "4. Contactos & Suporte")}
          ${renderTabBtn("funcionalidades", "5. Funcionalidades & Manutenção")}
          ${renderTabBtn("dispositivos", "6. Dispositivos Móveis")}
          ${renderTabBtn("localizacao", "7. Localização Autorizada")}
          ${renderTabBtn("notificacoes", "8. Avisos & Push")}
          ${renderTabBtn("versoes", "9. Versões & Lojas")}
          ${renderTabBtn("auditoria", "10. Trilha de Auditoria")}
        </div>

        <!-- Conteúdo do Separador Ativo -->
        <div id="painel-aba-conteudo">
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
      case "visual":
        return renderPersonalizacaoVisual();
      case "conteudos":
        return renderConteudosEBanners();
      case "contactos":
        return renderContactosESuporte();
      case "funcionalidades":
        return renderFuncionalidadesEManutencao();
      case "dispositivos":
        return renderDispositivos();
      case "localizacao":
        return renderLocalizacao();
      case "notificacoes":
        return renderNotificacoesEAvisos();
      case "versoes":
        return renderVersoes();
      case "auditoria":
        return renderHistorico();
      default:
        return "<p>Separador não encontrado.</p>";
    }
  }

  // --- 1. VISÃO GERAL ---
  function renderVisaoGeral(): string {
    const totalDisp = telemetriaDashboard?.total_dispositivos || dispositivos.length || 0;
    const dispAtivos = telemetriaDashboard?.dispositivos_ativos || dispositivos.filter((d) => d.status === "ativo").length || 0;
    const manutencaoAtiva = configs.manutencao_global_ativa === "true";
    const totalLocalizacoes = localizacoes.length;

    return `
      <div style="display: grid; gap: 1.5rem;">
        <!-- Cartões de Resumo / KPIs -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
          <div class="cartao" style="padding: 18px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #08264f;">
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Aparelhos Registados</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin-top: 4px;">${totalDisp}</div>
            <div style="font-size: 0.75rem; color: #166534; margin-top: 4px; font-weight: 600;">${dispAtivos} com sessão ativa</div>
          </div>

          <div class="cartao" style="padding: 18px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #d9a441;">
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Estado Geral do Serviço</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${manutencaoAtiva ? "#b42318" : "#166534"}; margin-top: 8px;">
              ${manutencaoAtiva ? "EM MANUTENÇÃO" : "TOTALMENTE OPERACIONAL"}
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
              ${manutencaoAtiva ? configs.manutencao_mensagem || "Bloqueio ativado" : "Todas as APIs a responder"}
            </div>
          </div>

          <div class="cartao" style="padding: 18px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #0e8f6e;">
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Banners & Avisos Ativos</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin-top: 4px;">
              ${banners.filter((b) => b.ativo).length + avisos.filter((a) => a.ativo).length}
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
              ${banners.filter((b) => b.ativo).length} banners · ${avisos.filter((a) => a.ativo).length} avisos
            </div>
          </div>

          <div class="cartao" style="padding: 18px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1;">
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Localizações Consentidas</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin-top: 4px;">${totalLocalizacoes}</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Clientes autorizados com geolocalização</div>
          </div>
        </div>

        <!-- Painel de Status dos Módulos Operacionais -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; font-size: 1.15rem; color: #08264f;">Disponibilidade Operacional por Funcionalidade</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.25rem;">
            Estado em tempo real comunicado às aplicações Android e iOS via Remote Config consolidado.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            ${renderBadgeModulo("Câmbio Online", configs.func_cambio_ativa !== "false")}
            ${renderBadgeModulo("Remessas Internacionais", configs.func_remessas_ativa !== "false")}
            ${renderBadgeModulo("Cartões Visa Virtuais", configs.func_cartoes_ativa !== "false")}
            ${renderBadgeModulo("Consulta de Taxas BNA", configs.func_taxas_ativa !== "false")}
            ${renderBadgeModulo("Submissão KYC", configs.func_upload_docs_ativa !== "false")}
            ${renderBadgeModulo("Apoio por Chat", configs.func_suporte_ativa !== "false")}
            ${renderBadgeModulo("Central de Notificações", configs.func_notificacoes_ativa !== "false")}
          </div>

          <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <span style="font-size: 0.85rem; color: #64748b;">
              Precisa alterar a disponibilidade de algum serviço ou ativar manutenção?
            </span>
            <button id="btn-ir-manutencao" class="btn btn-secundario" style="padding: 6px 14px; font-size: 0.8rem; font-weight: 700;">
              Gerir Módulos & Manutenção →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderBadgeModulo(nome: string, ativa: boolean): string {
    return `
      <div style="padding: 12px; border-radius: 8px; border: 1px solid ${ativa ? "#bbf7d0" : "#fecaca"}; background: ${ativa ? "#f0fdf4" : "#fef2f2"}; display: flex; justify-content: space-between; align-items: center;">
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

    // Ícones das operações
    const iconeEntrada = configs.visual_icone_entrada || "/icones/entrada.svg";
    const iconeSaida = configs.visual_icone_saida || "/icones/saida.svg";
    const iconeCambio = configs.visual_icone_cambio || "/icones/cambio.svg";
    const iconeRemessas = configs.visual_icone_remessas || "/icones/remessas.svg";

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; max-width: 950px;">
        <h3 style="font-size: 1.2rem; color: #08264f; margin-top: 0;">Elementos Visuais & Identidade da Aplicação</h3>
        <p style="font-size: 0.85rem; color: #64748b;">Edite o logótipo, símbolos, cores, ícones das operações e mensagens apresentadas no NZAIDI Mobile.</p>

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

          <!-- Ícones das Operações -->
          <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc;">
            <strong style="color: #08264f; font-size: 0.95rem; display: block; margin-bottom: 12px;">Ícones das Operações Principais (Entrada, Saída, Câmbio, Remessas)</strong>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Ícone Entrada / Depósito</label>
                <input type="text" id="inp-icone-entrada" class="ctl" value="${iconeEntrada}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Ícone Saída / Levantamento</label>
                <input type="text" id="inp-icone-saida" class="ctl" value="${iconeSaida}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Ícone Operação de Câmbio</label>
                <input type="text" id="inp-icone-cambio" class="ctl" value="${iconeCambio}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Ícone Remessas Internacionais</label>
                <input type="text" id="inp-icone-remessas" class="ctl" value="${iconeRemessas}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
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
    const faqs = configs.conteudo_perguntas_frequentes || "";

    return `
      <div style="display: grid; gap: 2rem;">
        <!-- Gestão de Banners Promocionais -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Banners Promocionais da Aplicação</h3>
              <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Campanhas exibidas no carrossel de marketing do dashboard móvel.</p>
            </div>
            <button id="btn-toggle-modal-banner" class="btn btn-secundario" style="padding: 8px 16px; font-weight: 700; border-radius: 8px; font-size: 0.85rem; color: #08264f;">
              ${exibindoModalBanner ? "✕ Cancelar" : "+ Adicionar Novo Banner"}
            </button>
          </div>

          <!-- Formulário Inline para Novo Banner -->
          ${
            exibindoModalBanner
              ? `
            <div style="padding: 18px; border: 2px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; margin-bottom: 1.5rem;">
              <h4 style="margin: 0 0 12px; color: #08264f;">Criar Novo Banner Promocional</h4>
              <form id="form-criar-banner-inline" style="display: grid; gap: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Título da Campanha</label>
                    <input type="text" id="inp-nb-titulo" required placeholder="Ex: Câmbio sem comissão de abertura" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">URL da Imagem</label>
                    <input type="text" id="inp-nb-imagem" required placeholder="/logotipo.png ou URL HTTPS" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Descrição Curta</label>
                    <input type="text" id="inp-nb-descricao" placeholder="Subtítulo ou texto de destaque" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Link de Ação / Destino</label>
                    <input type="text" id="inp-nb-link" placeholder="#cambio ou URL" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                  </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                  <button type="button" id="btn-cancelar-banner" class="btn btn-secundario" style="padding: 8px 16px;">Cancelar</button>
                  <button type="submit" class="btn" style="padding: 8px 20px; background: #08264f; color: #fff; font-weight: 700; border-radius: 6px;">Publicar Banner</button>
                </div>
              </form>
            </div>
          `
              : ""
          }

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
          <p style="font-size: 0.85rem; color: #64748b;">Textos consumidos pelas abas "Sobre", "Termos", "Privacidade" e "FAQs" no Android e iOS.</p>

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

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Perguntas Frequentes (FAQs)</label>
              <textarea id="inp-faqs" rows="4" placeholder="Lista ou formato de perguntas e respostas exibidas na aplicação" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${faqs}</textarea>
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
    const endereco = configs.contactos_endereco || "Rua Rainha Ginga, Maianga, Luanda - Angola";
    const horario = configs.contactos_horario || "Segunda a Sexta: 08:30 - 16:30 | Sábados: 09:00 - 13:00";

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; max-width: 850px;">
        <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Canais Oficiais de Suporte e Atendimento</h3>
        <p style="font-size: 0.85rem; color: #64748b;">Estes dados são integrados diretamente nos botões "Ligue-nos", "WhatsApp" e "Endereço" das aplicações móveis.</p>

        <form id="form-contactos" style="display: grid; gap: 1.25rem; margin-top: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Linha Telefónica Principal</label>
              <input type="text" id="inp-tel" class="ctl" value="${tel}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">WhatsApp Comercial</label>
              <input type="text" id="inp-wpp" class="ctl" value="${wpp}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Email de Apoio ao Cliente</label>
            <input type="email" id="inp-email-sup" class="ctl" value="${email}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Endereço Físico (Balcão Maianga)</label>
            <input type="text" id="inp-end" class="ctl" value="${endereco}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Horário de Atendimento Oficial</label>
            <input type="text" id="inp-hor" class="ctl" value="${horario}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
              Guardar Contactos de Atendimento
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // --- 5. FUNCIONALIDADES & MANUTENÇÃO ---
  function renderFuncionalidadesEManutencao(): string {
    const manutencaoGeral = configs.manutencao_global_ativa === "true";
    const msgManutencao = configs.manutencao_mensagem || "O sistema NZAIDI está temporariamente em manutenção programada.";
    const prevRetorno = configs.manutencao_previsao_fim || "30 minutos";
    const ipsAutorizados = configs.manutencao_ips_autorizados || "";

    return `
      <div style="display: grid; gap: 2rem;">
        <!-- Interruptor Global de Manutenção -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: ${manutencaoGeral ? "#fef2f2" : "#fff"}; border: 2px solid ${manutencaoGeral ? "#b42318" : "#e2e8f0"};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.25rem;">🛑</span>
                <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Modo de Manutenção Geral (Kill-Switch)</h3>
              </div>
              <p style="margin: 6px 0 0; font-size: 0.85rem; color: #64748b;">
                Quando ativado, bloqueia imediatamente novas transações no aplicativo e apresenta uma mensagem institucional com previsão de retorno.
              </p>
            </div>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" id="chk-manutencao-global" ${manutencaoGeral ? "checked" : ""} style="width: 22px; height: 22px; accent-color: #b42318;" />
              <strong style="color: ${manutencaoGeral ? "#b42318" : "#475569"};">Ativar Manutenção Global</strong>
            </label>
          </div>

          <form id="form-manutencao" style="display: grid; gap: 1rem; margin-top: 1rem;">
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Mensagem Apresentada aos Clientes</label>
                <input type="text" id="inp-manutencao-msg" class="ctl" value="${msgManutencao}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Previsão de Retorno</label>
                <input type="text" id="inp-manutencao-prev" class="ctl" value="${prevRetorno}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Exceções Administrativas Autorizadas (IPs ou Contas com Bypass)</label>
              <input type="text" id="inp-manutencao-ips" placeholder="Ex: 127.0.0.1, 105.172.0.1 (separados por vírgula)" class="ctl" value="${ipsAutorizados}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              <small style="color: #64748b; font-size: 0.75rem;">Dispositivos que operem a partir destes IPs autorizados não são bloqueados durante a manutenção.</small>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button type="submit" class="btn" style="padding: 8px 20px; font-weight: 700; background: #08264f; color: #fff; border-radius: 6px; border: none; cursor: pointer;">
                Atualizar Estado de Manutenção
              </button>
            </div>
          </form>
        </div>

        <!-- Toggles de Funcionalidades Individuais com Bloqueio Real na API -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Controlo de Módulos Operacionais</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">
            Desative temporariamente funcionalidades específicas. A API Fastify rejeitará novas requisições com código 503 e o aviso configurado abaixo.
          </p>

          <form id="form-funcionalidades" style="display: grid; gap: 1.25rem;">
            ${renderItemFuncionalidade("cambio", "Simulação & Pedidos de Câmbio", "Câmbios online")}
            ${renderItemFuncionalidade("remessas", "Envio de Remessas Internacionais", "Remessas internacionais")}
            ${renderItemFuncionalidade("cartoes", "Consulta de Cartões Visa Virtuais", "Cartões StroWallet")}
            ${renderItemFuncionalidade("taxas", "Consulta de Taxas em Tempo Real", "Taxas de hoje")}
            ${renderItemFuncionalidade("upload_docs", "Submissão de Documentos KYC", "Upload KYC")}
            ${renderItemFuncionalidade("suporte", "Chat de Apoio ao Cliente", "Suporte em tempo real")}
            ${renderItemFuncionalidade("notificacoes", "Central de Avisos & Notificações", "Alertas in-app")}

            <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
              <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
                Guardar e Aplicar na API
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderItemFuncionalidade(id: string, titulo: string, tag: string): string {
    const ativa = configs[`func_${id}_ativa`] !== "false";
    const aviso = configs[`func_${id}_aviso`] || `O serviço de ${tag} está em atualização periódica. Voltaremos em breve.`;

    return `
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; background: #f8fafc; display: grid; grid-template-columns: 240px 1fr 100px; gap: 1rem; align-items: center;">
        <div>
          <strong style="color: #08264f; font-size: 0.95rem; display: block;">${titulo}</strong>
          <span style="font-size: 0.75rem; color: #64748b;">${tag}</span>
        </div>

        <div>
          <input type="text" id="inp-func-aviso-${id}" class="ctl" value="${aviso}" placeholder="Aviso apresentado se desativado" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" />
        </div>

        <div style="text-align: right;">
          <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="chk-func-${id}" ${ativa ? "checked" : ""} style="width: 20px; height: 20px; accent-color: #0e8f6e;" />
            <span style="font-size: 0.8rem; font-weight: 700; color: ${ativa ? "#166534" : "#b42318"};">${ativa ? "ATIVO" : "OFF"}</span>
          </label>
        </div>
      </div>
    `;
  }

  // --- 6. UTILIZADORES & DISPOSITIVOS MÓVEIS ---
  function renderDispositivos(): string {
    let filtrados = [...dispositivos];
    if (filtroDispPlataforma !== "todas") {
      filtrados = filtrados.filter((d) => d.plataforma?.toLowerCase() === filtroDispPlataforma);
    }
    if (filtroDispTermo.trim()) {
      const b = filtroDispTermo.toLowerCase();
      filtrados = filtrados.filter(
        (d) =>
          d.nome_dispositivo?.toLowerCase().includes(b) ||
          d.cliente_nome?.toLowerCase().includes(b) ||
          d.cliente_email?.toLowerCase().includes(b) ||
          d.id?.toLowerCase().includes(b)
      );
    }

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Dispositivos Móveis Registados</h3>
            <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Aparelhos Android e iOS autorizados com sessão no NZAIDI Mobile.</p>
          </div>

          <div style="display: flex; gap: 10px;">
            <input type="text" id="inp-filtro-disp" placeholder="Pesquisar por cliente, modelo ou ID..." value="${filtroDispTermo}" class="ctl" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem; min-width: 260px;" />
            <select id="sel-filtro-plat" class="ctl" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem;">
              <option value="todas" ${filtroDispPlataforma === "todas" ? "selected" : ""}>Todas as Plataformas</option>
              <option value="android" ${filtroDispPlataforma === "android" ? "selected" : ""}>Apenas Android</option>
              <option value="ios" ${filtroDispPlataforma === "ios" ? "selected" : ""}>Apenas iOS</option>
            </select>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 10px 12px;">Dispositivo / Modelo</th>
                <th style="padding: 10px 12px;">Plataforma</th>
                <th style="padding: 10px 12px;">Cliente Titular</th>
                <th style="padding: 10px 12px;">Versão App</th>
                <th style="padding: 10px 12px;">Último Acesso</th>
                <th style="padding: 10px 12px;">Status</th>
                <th style="padding: 10px 12px; text-align: right;">Ações de Segurança</th>
              </tr>
            </thead>
            <tbody>
              ${
                filtrados.length === 0
                  ? '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: #94a3b8;">Nenhum dispositivo encontrado.</td></tr>'
                  : filtrados
                      .map(
                        (d) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 12px;">
                    <strong style="color: #08264f;">${d.nome_dispositivo || "Dispositivo Desconhecido"}</strong>
                    <div style="font-size: 0.7rem; color: #94a3b8; font-family: monospace;">ID: ${d.id.slice(0, 12)}...</div>
                  </td>
                  <td style="padding: 10px 12px;">
                    <span style="padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; background: ${d.plataforma === "android" ? "#dcfce7" : "#e0e7ff"}; color: ${d.plataforma === "android" ? "#166534" : "#3730a3"}; text-transform: uppercase;">
                      ${d.plataforma}
                    </span>
                  </td>
                  <td style="padding: 10px 12px;">
                    <div style="font-weight: 600; color: #08264f;">${d.cliente_nome || "Cliente"}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${d.cliente_email || "—"}</div>
                  </td>
                  <td style="padding: 10px 12px;">${d.versao_app || "1.0.0"}</td>
                  <td style="padding: 10px 12px; color: #64748b;">${d.ultimo_acesso_em ? new Date(d.ultimo_acesso_em).toLocaleString() : "Nunca"}</td>
                  <td style="padding: 10px 12px;">
                    <span style="font-weight: 800; font-size: 0.75rem; color: ${d.status === "ativo" ? "#166534" : d.status === "bloqueado" ? "#b42318" : "#64748b"};">
                      ${d.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding: 10px 12px; text-align: right;">
                    ${
                      d.status === "ativo"
                        ? `<button class="btn-bloquear-disp" data-id="${d.id}" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700; color: #b42318; border: 1px solid #fecaca; background: #fef2f2; border-radius: 6px; cursor: pointer;">Bloquear</button>`
                        : `<span style="font-size: 0.75rem; color: #94a3b8;">Sessão Bloqueada</span>`
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
    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Localizações Consentidas</h3>
            <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">
              Registo estritamente consentido pelos clientes no ato da operação, em conformidade com as normas BNA e de proteção de dados.
            </p>
          </div>
          <span style="padding: 4px 10px; border-radius: 6px; background: #f0fdf4; color: #166534; font-size: 0.75rem; font-weight: 700;">
            Sem Rastreamento Oculto
          </span>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 10px 12px;">Data / Hora</th>
                <th style="padding: 10px 12px;">Cliente</th>
                <th style="padding: 10px 12px;">Cidade / Região</th>
                <th style="padding: 10px 12px;">País</th>
                <th style="padding: 10px 12px;">Coordenadas (Lat / Lng)</th>
                <th style="padding: 10px 12px;">Precisão</th>
                <th style="padding: 10px 12px;">IP</th>
                <th style="padding: 10px 12px;">Consentimento</th>
              </tr>
            </thead>
            <tbody>
              ${
                localizacoes.length === 0
                  ? '<tr><td colspan="8" style="padding: 2rem; text-align: center; color: #94a3b8;">Nenhum registo de localização consentida disponível.</td></tr>'
                  : localizacoes
                      .map(
                        (l) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 12px; color: #64748b; white-space: nowrap;">${new Date(l.atualizado_em).toLocaleString()}</td>
                  <td style="padding: 10px 12px;">
                    <div style="font-weight: 600; color: #08264f;">${l.cliente_nome || "Cliente"}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${l.cliente_email || "—"}</div>
                  </td>
                  <td style="padding: 10px 12px;"><strong>${l.cidade || "Luanda"}</strong> ${l.regiao ? "· " + l.regiao : ""}</td>
                  <td style="padding: 10px 12px;">${l.pais || "Angola"}</td>
                  <td style="padding: 10px 12px; font-family: monospace; font-size: 0.8rem;">
                    ${l.latitude ? `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}` : "—"}
                  </td>
                  <td style="padding: 10px 12px;">${l.precisao_metros ? l.precisao_metros + "m" : "—"}</td>
                  <td style="padding: 10px 12px; font-family: monospace; color: #64748b;">${l.ip || "—"}</td>
                  <td style="padding: 10px 12px;">
                    <span style="color: ${l.consentimento ? "#166534" : "#b42318"}; font-weight: 700;">
                      ${l.consentimento ? "✓ AUTORIZADO" : "✕ RECUSADO"}
                    </span>
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

  // --- 8. AVISOS & NOTIFICAÇÕES PUSH ---
  function renderNotificacoesEAvisos(): string {
    return `
      <div style="display: grid; gap: 2rem;">
        <!-- Bloco de Avisos Institucionais -->
        <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; color: #08264f;">Avisos & Comunicados In-App</h3>
              <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Mensagens categorizadas (informativo, importante, urgente) apresentadas no aplicativo.</p>
            </div>
            <button id="btn-toggle-modal-aviso" class="btn btn-secundario" style="padding: 8px 16px; font-weight: 700; border-radius: 8px; font-size: 0.85rem; color: #08264f;">
              ${exibindoModalAviso ? "✕ Cancelar" : "+ Publicar Novo Aviso"}
            </button>
          </div>

          <!-- Formulário Inline para Novo Aviso -->
          ${
            exibindoModalAviso
              ? `
            <div style="padding: 18px; border: 2px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; margin-bottom: 1.5rem;">
              <h4 style="margin: 0 0 12px; color: #08264f;">Publicar Novo Aviso In-App</h4>
              <form id="form-criar-aviso-inline" style="display: grid; gap: 1rem;">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Título do Aviso</label>
                    <input type="text" id="inp-na-titulo" required placeholder="Ex: Manutenção Programada dos Serviços" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Categoria</label>
                    <select id="sel-na-categoria" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                      <option value="informativo">Informativo</option>
                      <option value="importante">Importante</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Mensagem Detalhada</label>
                  <textarea id="inp-na-mensagem" required rows="3" placeholder="Mensagem completa apresentada aos utilizadores" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: inherit;"></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Posição</label>
                    <select id="sel-na-posicao" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                      <option value="dashboard">Dashboard</option>
                      <option value="ecra_inicial">Ecrã Inicial</option>
                      <option value="notificacao">Central de Alertas</option>
                      <option value="todos">Todos os Ecrãs</option>
                    </select>
                  </div>
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Data Início</label>
                    <input type="date" id="inp-na-inicio" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Data Fim</label>
                    <input type="date" id="inp-na-fim" class="ctl" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
                  </div>
                </div>

                <div>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="chk-na-disparar-push" style="width: 18px; height: 18px; accent-color: #0e8f6e;" />
                    <span style="font-size: 0.85rem; font-weight: 600; color: #08264f;">Disparar notificação push imediata para os aparelhos</span>
                  </label>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                  <button type="button" id="btn-cancelar-aviso" class="btn btn-secundario" style="padding: 8px 16px;">Cancelar</button>
                  <button type="submit" class="btn" style="padding: 8px 20px; background: #08264f; color: #fff; font-weight: 700; border-radius: 6px;">Publicar Aviso</button>
                </div>
              </form>
            </div>
          `
              : ""
          }

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
          <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Disparo Remoto de Notificações Push (FCM / APNs)</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.25rem;">Transmissão imediata de alertas push aos dispositivos móveis cadastrados.</p>

          <form id="form-disparo-push" style="display: grid; gap: 1rem; max-width: 650px;">
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
                <select id="sel-push-plataforma" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                  <option value="todas">Todas (Android + iOS)</option>
                  <option value="android">Apenas Android</option>
                  <option value="ios">Apenas iOS</option>
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Segmento</label>
                <select id="sel-push-segmento" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
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
    const gPlay = configs.loja_google_play_url || "https://play.google.com/store/apps/details?id=ao.nzaidi.app";

    const vAtualIos = configs.versao_atual_ios || "1.0.4";
    const vMinIos = configs.versao_minima_ios || "1.0.0";
    const appStore = configs.loja_app_store_url || "https://apps.apple.com/app/nzaidi-cambios/id1689000000";

    const obrigatoria = configs.atualizacao_obrigatoria === "true";
    const notas = configs.notas_da_versao || "Melhorias de desempenho e segurança nas transações cambiais.";
    const avisoDesatualizada = configs.versao_aviso_desatualizada || "Está a utilizar uma versão desatualizada da aplicação. Por favor, atualize na loja para continuar com total segurança.";

    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; max-width: 900px;">
        <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Gestão de Versões & Lojas de Aplicações</h3>
        <p style="font-size: 0.85rem; color: #64748b;">
          Configure a versão mínima permitida para forçar atualizações e direcione os clientes para as lojas oficiais.
        </p>

        <form id="form-versoes" style="display: grid; gap: 1.25rem; margin-top: 1.5rem;">
          <!-- Android -->
          <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #f8fafc;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <strong style="color: #08264f; font-size: 1rem;">Google Play Store (Android)</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Atual Publicada</label>
                <input type="text" id="inp-v-atual-android" class="ctl" value="${vAtualAndroid}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Mínima Obrigatória</label>
                <input type="text" id="inp-v-min-android" class="ctl" value="${vMinAndroid}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
            </div>
            <div style="margin-top: 10px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Link Google Play Store</label>
              <input type="text" id="inp-gplay" class="ctl" value="${gPlay}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
            </div>
          </div>

          <!-- iOS -->
          <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #f8fafc;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <strong style="color: #08264f; font-size: 1rem;">Apple App Store (iOS)</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Atual Publicada</label>
                <input type="text" id="inp-v-atual-ios" class="ctl" value="${vAtualIos}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Mínima Obrigatória</label>
                <input type="text" id="inp-v-min-ios" class="ctl" value="${vMinIos}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
              </div>
            </div>
            <div style="margin-top: 10px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Link Apple App Store</label>
              <input type="text" id="inp-appstore" class="ctl" value="${appStore}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;" />
            </div>
          </div>

          <!-- Atualização Forçada e Notas -->
          <div style="padding: 12px 16px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="chk-atualizacao-obrigatoria" ${obrigatoria ? "checked" : ""} style="width: 18px; height: 18px; accent-color: #d97706;" />
              <strong style="color: #92400e; font-size: 0.9rem;">Exigir Atualização Imediata (Force Update)</strong>
            </label>
            <p style="margin: 4px 0 0 26px; font-size: 0.8rem; color: #b45309;">
              Se ativo, clientes com versão inferior à mínima ficam impossibilitados de usar a app até concluírem a atualização na loja.
            </p>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Aviso Automático para Aplicações Desatualizadas</label>
            <input type="text" id="inp-aviso-desatualizada" class="ctl" value="${avisoDesatualizada}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 6px;">Notas da Versão (Changelog)</label>
            <textarea id="inp-notas-versao" rows="3" class="ctl" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit;">${notas}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button type="submit" class="btn" style="padding: 10px 24px; font-weight: 700; background: #08264f; color: #fff; border-radius: 8px; border: none; cursor: pointer;">
              Guardar Configurações de Versões
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // --- 10. TRILHA DE AUDITORIA ---
  function renderHistorico(): string {
    return `
      <div class="cartao" style="padding: 24px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0;">
        <h3 style="margin-top: 0; font-size: 1.2rem; color: #08264f;">Histórico de Alterações de Configuração Remota</h3>
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.25rem;">
          Trilha de auditoria cronológica das configurações modificadas pelos administradores da plataforma.
        </p>

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


  // --- ABA: PAÍSES DE DESTINO DE REMESSAS ---
  function renderAbaPaisesRemessas(): string {
    const totalPaises = paisesRemessas.length;
    const ativos = paisesRemessas.filter((p: any) => p.ativo).length;
    const inativos = totalPaises - ativos;
    const moedasUnicas = Array.from(new Set(paisesRemessas.map((p: any) => p.moeda))).join(", ") || "EUR, BRL, ZAR, USD, GBP";

    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Indicadores Rápidos -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <div class="cartao" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(59,130,246,0.15); display: flex; align-items: center; justify-content: center; color: #3b82f6;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">TOTAL DE DESTINOS</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: #0f172a;">${totalPaises} Países</div>
            </div>
          </div>

          <div class="cartao" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center; color: #10b981;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">DESTINOS ATIVOS</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">${ativos} Operacionais</div>
            </div>
          </div>

          <div class="cartao" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(245,158,11,0.15); display: flex; align-items: center; justify-content: center; color: #f59e0b;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">DESTINOS SUSPENSOS</div>
              <div style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">${inativos} Países</div>
            </div>
          </div>

          <div class="cartao" style="padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(99,102,241,0.15); display: flex; align-items: center; justify-content: center; color: #6366f1;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">MOEDAS DE LIQUIDAÇÃO</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a; word-break: break-all;">${moedasUnicas}</div>
            </div>
          </div>
        </div>

        <!-- Barra de Ações -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 0;">Destinos Internacionais Autorizados para Envio</h3>
            <p style="font-size: 0.88rem; color: #64748b; margin: 4px 0 0 0;">Os países activos abaixo aparecem imediatamente nas opções de remessa do NZAIDI Mobile (Android & iOS) e Portal do Cliente.</p>
          </div>
          <button id="btn-toggle-modal-pais" class="btn" style="background: #031d42; color: #ffffff; padding: 10px 20px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>${exibindoModalPais ? "Fechar Formulário" : "＋ Cadastrar Novo País de Remessa"}</span>
          </button>
        </div>

        <!-- Formulário Expansível Inline -->
        ${
          exibindoModalPais
            ? `
          <div class="cartao" style="padding: 1.75rem; border: 2px solid #cc9638; background: #fafafa; border-radius: 12px;">
            <h4 style="font-size: 1.05rem; font-weight: 700; color: #031d42; margin-top: 0; margin-bottom: 1rem;">Cadastrar Novo Destino de Remessa</h4>
            <form id="form-criar-pais-remessa" style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Nome do País *</label>
                  <input type="text" id="inp-pais-nome" class="form-input" required placeholder="Ex: Portugal, Moçambique, França" style="width: 100%;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Código ISO (2 letras) *</label>
                  <input type="text" id="inp-pais-iso" class="form-input" required maxlength="2" placeholder="Ex: PT, MZ, FR, ES" style="width: 100%; text-transform: uppercase;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Moeda de Recebimento *</label>
                  <input type="text" id="inp-pais-moeda" class="form-input" required maxlength="3" placeholder="Ex: EUR, MZN, USD, GBP" style="width: 100%; text-transform: uppercase;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Bandeira Emoji</label>
                  <input type="text" id="inp-pais-bandeira" class="form-input" placeholder="Ex: 🇵🇹, 🇲🇿, 🇫🇷" style="width: 100%;" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Canais Suportados de Entrega</label>
                  <input type="text" id="inp-pais-canais" class="form-input" placeholder="Ex: Transferência Bancária (IBAN), M-Pesa" value="Transferência Bancária (IBAN)" style="width: 100%;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Prazo Estimado de Liquidação</label>
                  <input type="text" id="inp-pais-tempo" class="form-input" placeholder="Ex: Mesmo dia útil, Até 2 horas" value="Mesmo dia útil" style="width: 100%;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Comissão Fixa (Kz)</label>
                  <input type="number" id="inp-pais-comissao-fixa" class="form-input" placeholder="0.00" value="2500" step="100" style="width: 100%;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Comissão Percentual (%)</label>
                  <input type="number" id="inp-pais-comissao-pct" class="form-input" placeholder="1.50" value="1.50" step="0.1" style="width: 100%;" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Limite Mínimo de Envio (Kz)</label>
                  <input type="number" id="inp-pais-lim-min" class="form-input" placeholder="10000" value="10000" step="1000" style="width: 100%;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Limite Máximo por Operação (Kz)</label>
                  <input type="number" id="inp-pais-lim-max" class="form-input" placeholder="10000000" value="10000000" step="50000" style="width: 100%;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Ordem de Apresentação</label>
                  <input type="number" id="inp-pais-ordem" class="form-input" placeholder="1" value="${totalPaises + 1}" style="width: 100%;" />
                </div>
                <div style="display: flex; align-items: center; padding-top: 1.5rem;">
                  <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: #0f172a; cursor: pointer;">
                    <input type="checkbox" id="chk-pais-ativo" checked style="width: 18px; height: 18px;" />
                    <span>Disponibilizar Imediatamente na Aplicação</span>
                  </label>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.5rem;">
                <button type="button" id="btn-cancelar-pais" class="btn btn-secondary" style="padding: 10px 20px;">Cancelar</button>
                <button type="submit" class="btn btn-primary" style="background: #10b981; border-color: #10b981; color: #ffffff; padding: 10px 24px; font-weight: 600;">Gravar País de Remessa</button>
              </div>
            </form>
          </div>
        `
            : ""
        }

        <!-- Tabela de Países Cadastrados -->
        <div class="cartao" style="padding: 0; overflow: hidden; border-radius: 12px;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
            <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: #031d42;">Destinos Registados no Sistema (${paisesRemessas.length})</h4>
            <span style="font-size: 0.82rem; color: #64748b;">Sincronizado atomicamente com SQLite</span>
          </div>

          <div style="overflow-x: auto;">
            <table class="tabela" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 0.8rem; color: #475569; text-transform: uppercase; letter-spacing: 0.04em;">
                  <th style="padding: 14px 16px;">País de Destino</th>
                  <th style="padding: 14px 16px;">Código ISO</th>
                  <th style="padding: 14px 16px;">Moeda</th>
                  <th style="padding: 14px 16px;">Canais Disponíveis</th>
                  <th style="padding: 14px 16px;">Prazo de Entrega</th>
                  <th style="padding: 14px 16px;">Limites Operacionais</th>
                  <th style="padding: 14px 16px;">Comissões</th>
                  <th style="padding: 14px 16px; text-align: center;">Estado</th>
                  <th style="padding: 14px 16px; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${
                  paisesRemessas.length === 0
                    ? `<tr><td colspan="9" style="text-align: center; padding: 3rem; color: #94a3b8;">Nenhum país de remessa registado ainda.</td></tr>`
                    : paisesRemessas
                        .map(
                          (p: any) => `
                    <tr style="border-bottom: 1px solid #f1f5f9; font-size: 0.88rem; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 14px 16px; font-weight: 700; color: #0f172a;">
                        <span style="font-size: 1.25rem; margin-right: 8px;">${p.icone_bandeira || "🌐"}</span>
                        <span>${p.nome}</span>
                      </td>
                      <td style="padding: 14px 16px;">
                        <span style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">${p.codigo_iso}</span>
                      </td>
                      <td style="padding: 14px 16px; font-weight: 700; color: #031d42;">
                        ${p.moeda}
                      </td>
                      <td style="padding: 14px 16px; color: #475569; max-width: 220px;">
                        <small>${p.canais || "Transferência Bancária (IBAN)"}</small>
                      </td>
                      <td style="padding: 14px 16px; color: #475569;">
                        <span style="display: inline-flex; align-items: center; gap: 4px; color: #0284c7; font-weight: 600; font-size: 0.82rem;">
                          ⏱ ${p.tempo_estimado || "Mesmo dia útil"}
                        </span>
                      </td>
                      <td style="padding: 14px 16px; color: #475569; font-size: 0.82rem;">
                        <div>Mín: <strong>Kz ${Number(p.limite_minimo_aoa || 10000).toLocaleString("pt-AO")}</strong></div>
                        <div>Máx: <strong>Kz ${Number(p.limite_maximo_aoa || 10000000).toLocaleString("pt-AO")}</strong></div>
                      </td>
                      <td style="padding: 14px 16px; color: #475569; font-size: 0.82rem;">
                        <div>Fixa: Kz ${Number(p.comissao_fixa_aoa || 0).toLocaleString("pt-AO")}</div>
                        <div>Pct: ${p.comissao_percentual || "1.50"}%</div>
                      </td>
                      <td style="padding: 14px 16px; text-align: center;">
                        <button class="btn-toggle-status-pais" data-id="${p.id}" data-ativo="${p.ativo ? 1 : 0}" title="Clique para alternar disponibilidade" style="border: none; padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: ${p.ativo ? "#dcfce7" : "#fee2e2"}; color: ${p.ativo ? "#15803d" : "#b91c1c"};">
                          ${p.ativo ? "● Ativo (Visível)" : "○ Desativado"}
                        </button>
                      </td>
                      <td style="padding: 14px 16px; text-align: right;">
                        <button class="btn-excluir-pais" data-id="${p.id}" data-nome="${p.nome}" title="Excluir país de remessa" style="background: none; border: 1px solid #fca5a5; color: #dc2626; padding: 6px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer;">
                          Eliminar
                        </button>
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
      </div>
    `;
  }

  // --- VINCULAÇÃO DE EVENTOS ---
  function vincularEventos(): void {
    // Abas de navegação com transição suave sem recarregar a aplicação
    container.querySelectorAll(".tab-btn-mobile").forEach((btn) => {
      btn.addEventListener("click", () => {
        const aba = btn.getAttribute("data-aba") as AbaAtiva;
        if (!aba || aba === abaAtiva) return;
        abaAtiva = aba;
        try {
          // Atualiza a URL no navegador sem forçar hashchange disruptivo
          window.history.replaceState(null, "", "#mobile/" + aba);
        } catch {}
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

    document.getElementById("btn-fechar-alerta-sucesso")?.addEventListener("click", () => {
      mensagemSucesso = null;
      render();
    });
    document.getElementById("btn-fechar-alerta-erro")?.addEventListener("click", () => {
      mensagemErro = null;
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

    // Botões Bloquear Dispositivo
    container.querySelectorAll(".btn-bloquear-disp").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (id && confirm("Deseja bloquear este dispositivo móvel? O acesso será revogado imediatamente.")) {
          try {
            await api.bloquearMobileDispositivo(id);
            mensagemSucesso = "Dispositivo bloqueado com sucesso.";
            carregarDados();
          } catch (e: any) {
            mensagemErro = e.message || "Falha ao bloquear dispositivo.";
            render();
          }
        }
      });
    });


    // --- Eventos Países de Remessas ---
    document.getElementById("btn-toggle-modal-pais")?.addEventListener("click", () => {
      exibindoModalPais = !exibindoModalPais;
      render();
    });

    document.getElementById("btn-cancelar-pais")?.addEventListener("click", () => {
      exibindoModalPais = false;
      render();
    });

    document.getElementById("form-criar-pais-remessa")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const payload = {
          nome: (document.getElementById("inp-pais-nome") as HTMLInputElement).value,
          codigoIso: (document.getElementById("inp-pais-iso") as HTMLInputElement).value.toUpperCase().trim(),
          moeda: (document.getElementById("inp-pais-moeda") as HTMLInputElement).value.toUpperCase().trim(),
          iconeBandeira: (document.getElementById("inp-pais-bandeira") as HTMLInputElement).value.trim(),
          canais: (document.getElementById("inp-pais-canais") as HTMLInputElement).value.trim(),
          tempoEstimado: (document.getElementById("inp-pais-tempo") as HTMLInputElement).value.trim(),
          comissaoFixaAoa: (document.getElementById("inp-pais-comissao-fixa") as HTMLInputElement).value,
          comissaoPercentual: (document.getElementById("inp-pais-comissao-pct") as HTMLInputElement).value,
          limiteMinimoAoa: (document.getElementById("inp-pais-lim-min") as HTMLInputElement).value,
          limiteMaximoAoa: (document.getElementById("inp-pais-lim-max") as HTMLInputElement).value,
          ordem: Number((document.getElementById("inp-pais-ordem") as HTMLInputElement).value) || 0,
          ativo: (document.getElementById("chk-pais-ativo") as HTMLInputElement).checked,
        };

        await api.criarPaisRemessa(payload);
        mensagemSucesso = "País de remessa cadastrado com sucesso e sincronizado no banco de dados!";
        exibindoModalPais = false;
        const resPaises = await api.listarPaisesRemessas().catch(() => []);
        paisesRemessas = resPaises || [];
        render();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao cadastrar país de remessa.";
        render();
      }
    });

    container.querySelectorAll(".btn-toggle-status-pais").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const ativoAtual = btn.getAttribute("data-ativo") === "1";
        if (!id) return;
        try {
          await api.alternarStatusPaisRemessa(id, !ativoAtual);
          mensagemSucesso = !ativoAtual ? "País ativado para remessas com sucesso." : "País desativado temporariamente.";
          const resPaises = await api.listarPaisesRemessas().catch(() => []);
          paisesRemessas = resPaises || [];
          render();
        } catch (err: any) {
          mensagemErro = err.message || "Erro ao alternar status do país.";
          render();
        }
      });
    });

    container.querySelectorAll(".btn-excluir-pais").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const nome = btn.getAttribute("data-nome") || "este país";
        if (id && confirm("Deseja realmente remover " + nome + " dos destinos de remessa?")) {
          try {
            await api.excluirPaisRemessa(id);
            mensagemSucesso = "País removido com sucesso.";
            const resPaises = await api.listarPaisesRemessas().catch(() => []);
            paisesRemessas = resPaises || [];
            render();
          } catch (err: any) {
            mensagemErro = err.message || "Erro ao excluir país de remessa.";
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
          visual_icone_entrada: (document.getElementById("inp-icone-entrada") as HTMLInputElement).value,
          visual_icone_saida: (document.getElementById("inp-icone-saida") as HTMLInputElement).value,
          visual_icone_cambio: (document.getElementById("inp-icone-cambio") as HTMLInputElement).value,
          visual_icone_remessas: (document.getElementById("inp-icone-remessas") as HTMLInputElement).value,
        };
        await api.atualizarMobileConfigSecao("visual", confs);
        mensagemSucesso = "Configurações visuais e ícones de operações guardados e publicados com sucesso!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao guardar configurações visuais.";
        render();
      }
    });

    // Toggle Modal Criar Banner
    document.getElementById("btn-toggle-modal-banner")?.addEventListener("click", () => {
      exibindoModalBanner = !exibindoModalBanner;
      render();
    });
    document.getElementById("btn-cancelar-banner")?.addEventListener("click", () => {
      exibindoModalBanner = false;
      render();
    });

    // Submissão Criar Banner
    document.getElementById("form-criar-banner-inline")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const titulo = (document.getElementById("inp-nb-titulo") as HTMLInputElement).value;
        const imagemUrl = (document.getElementById("inp-nb-imagem") as HTMLInputElement).value;
        const descricao = (document.getElementById("inp-nb-descricao") as HTMLInputElement).value;
        const linkAcao = (document.getElementById("inp-nb-link") as HTMLInputElement).value;

        await api.adicionarMobileBanner({ titulo, imagemUrl, descricao, linkAcao, ativo: 1, ordem: 0 });
        mensagemSucesso = "Novo banner promocional publicado com sucesso!";
        exibindoModalBanner = false;
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao criar banner.";
        render();
      }
    });

    // Remover Banner
    container.querySelectorAll(".btn-remover-banner").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (id && confirm("Deseja remover este banner promocional?")) {
          try {
            await api.removerMobileBanner(id);
            mensagemSucesso = "Banner promocional removido.";
            carregarDados();
          } catch (err: any) {
            mensagemErro = err.message || "Erro ao remover banner.";
            render();
          }
        }
      });
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
          conteudo_perguntas_frequentes: (document.getElementById("inp-faqs") as HTMLTextAreaElement).value,
        };
        await api.atualizarMobileConfigSecao("conteudos", confs);
        mensagemSucesso = "Conteúdos institucionais e FAQs atualizados com sucesso!";
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
        const ips = (document.getElementById("inp-manutencao-ips") as HTMLInputElement).value;
        await api.atualizarMobileConfigSecao("manutencao", {
          manutencao_global_ativa: ativa ? "true" : "false",
          manutencao_mensagem: msg,
          manutencao_previsao_fim: prev,
          manutencao_ips_autorizados: ips,
        });
        mensagemSucesso = "Estado de manutenção e exceções atualizados com sucesso!";
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

    // Toggle Modal Criar Aviso
    document.getElementById("btn-toggle-modal-aviso")?.addEventListener("click", () => {
      exibindoModalAviso = !exibindoModalAviso;
      render();
    });
    document.getElementById("btn-cancelar-aviso")?.addEventListener("click", () => {
      exibindoModalAviso = false;
      render();
    });

    // Submissão Criar Aviso
    document.getElementById("form-criar-aviso-inline")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const titulo = (document.getElementById("inp-na-titulo") as HTMLInputElement).value;
        const categoria = (document.getElementById("sel-na-categoria") as HTMLSelectElement).value as any;
        const mensagem = (document.getElementById("inp-na-mensagem") as HTMLTextAreaElement).value;
        const posicao = (document.getElementById("sel-na-posicao") as HTMLSelectElement).value as any;
        const inicioEm = (document.getElementById("inp-na-inicio") as HTMLInputElement).value || new Date().toISOString();
        const fimEm = (document.getElementById("inp-na-fim") as HTMLInputElement).value || new Date(Date.now() + 30 * 86400000).toISOString();
        const dispararPush = (document.getElementById("chk-na-disparar-push") as HTMLInputElement).checked;

        await api.criarMobileAviso({
          titulo,
          mensagem,
          categoria,
          posicao,
          prioridade: categoria === "urgente" ? 3 : categoria === "importante" ? 2 : 1,
          inicioEm,
          fimEm,
        });

        if (dispararPush) {
          await api.dispararMobilePush({
            titulo: `[${categoria.toUpperCase()}] ${titulo}`,
            mensagem,
            plataformaAlvo: "todas",
            segmento: "todos",
          });
        }

        mensagemSucesso = "Aviso publicado com sucesso!" + (dispararPush ? " (Push notification transmitido)" : "");
        exibindoModalAviso = false;
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao publicar aviso.";
        render();
      }
    });

    // Remover Aviso
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
          versao_aviso_desatualizada: (document.getElementById("inp-aviso-desatualizada") as HTMLInputElement).value,
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
        mensagemSucesso = "Notificação push transmitida com sucesso para os aparelhos!";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Falha ao enviar notificação push.";
        render();
      }
    });
  }

  // Inicialização
  carregarDados();
}
