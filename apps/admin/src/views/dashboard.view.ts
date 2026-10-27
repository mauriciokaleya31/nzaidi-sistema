import { api, type TaxaItem, type ResumoDashboardOperacional } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export async function renderizarDashboard(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Painel Geral de Controlo</h1>
        <p class="view-subtitle">Bem-vindo, <strong>${escapeHtml(usuario.nome)}</strong> (${escapeHtml(usuario.email)})</p>
      </div>
      <div class="view-actions">
        <a href="#operacional" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Abrir Fila Operacional
        </a>
      </div>
    </div>

    <!-- Indicadores da Fila Operacional -->
    <div class="dashboard-grid mb-4" id="dash-resumo-operacional">
      <div class="card" style="cursor: pointer;" onclick="window.location.hash='#operacional?tipo=pedido_cambio'">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Câmbio Online</h3>
          <span class="badge badge-warning" id="dash-badge-cambio">...</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="dash-num-cambio">-</div>
          <small class="text-muted">Pedidos pendentes de aprovação</small>
        </div>
      </div>

      <div class="card" style="cursor: pointer;" onclick="window.location.hash='#operacional?tipo=pedido_remessa'">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Remessas</h3>
          <span class="badge badge-info" id="dash-badge-remessas">...</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="dash-num-remessas">-</div>
          <small class="text-muted">Por encaminhar a parceiros</small>
        </div>
      </div>

      <div class="card" style="cursor: pointer;" onclick="window.location.hash='#operacional?tipo=kyc_documento'">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Dossiês KYC</h3>
          <span class="badge badge-warning" id="dash-badge-kyc">...</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="dash-num-kyc">-</div>
          <small class="text-muted">Documentos por validar</small>
        </div>
      </div>

      <div class="card" style="cursor: pointer;" onclick="window.location.hash='#operacional?tipo=liquidacao_manual'">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Regra 4 Olhos</h3>
          <span class="badge badge-danger" id="dash-badge-liquidacoes">...</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="dash-num-liquidacoes">-</div>
          <small class="text-muted">Liquidações manuais pendentes</small>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Card Perfil & Permissões -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Perfil & Autonomia</h2>
          <span class="card-badge">${usuario.funcao.toUpperCase()}</span>
        </div>
        <div class="card-body">
          <p class="text-muted">A sua sessão possui os seguintes privilégios auditáveis:</p>
          <div class="permission-pills">
            ${usuario.permissoes.map((p) => `<span class="perm-pill">${escapeHtml(p)}</span>`).join("")}
          </div>
        </div>
      </div>

      <!-- Card Taxas Rápidas -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Cotações em Vigor</h2>
          <a href="#taxas" class="card-link">Ver Detalhes →</a>
        </div>
        <div class="card-body" id="dash-taxas-container">
          <div class="loading-state">A carregar taxas de câmbio...</div>
        </div>
      </div>

      <!-- Card Operações por Perfil -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Atalhos Operacionais</h2>
        </div>
        <div class="card-body">
          <div class="quick-actions-grid">
            <a href="#operacional" class="quick-action-btn action-highlight">
              <span class="qa-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></span>
              <span class="qa-title">Fila Operacional</span>
              <span class="qa-desc">Triagem de pedidos online, remessas e KYC</span>
            </a>

            <a href="#balcao" class="quick-action-btn">
              <span class="qa-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></span>
              <span class="qa-title">Balcão Cambial</span>
              <span class="qa-desc">Compra e venda de divisas e borderôs</span>
            </a>

            <a href="#clientes" class="quick-action-btn">
              <span class="qa-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
              <span class="qa-title">Clientes & KYC</span>
              <span class="qa-desc">Cadastro e diligência regulamentar</span>
            </a>

            <a href="#caixa" class="quick-action-btn">
              <span class="qa-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></span>
              <span class="qa-title">Tesouraria & Caixa</span>
              <span class="qa-desc">Fundos, movimentos e fecho de caixa</span>
            </a>

            <a href="#integracoes" class="quick-action-btn">
              <span class="qa-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></span>
              <span class="qa-title">Integrações & Conciliação</span>
              <span class="qa-desc">Liquidações bancárias e parceiros</span>
            </a>

            ${
              authState.temPermissao("ver_auditoria")
                ? `
                <a href="#auditoria" class="quick-action-btn">
                  <span class="qa-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>
                  <span class="qa-title">Pista de Auditoria</span>
                  <span class="qa-desc">Consultar registos de conformidade</span>
                </a>
              `
                : ""
            }
          </div>
        </div>
      </div>

      <!-- Card Atividade Recente do Operador -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Minha Atividade Recente</h2>
          <span class="badge badge-info">Auditoria Pessoal</span>
        </div>
        <div class="card-body" id="dash-atividade-recente">
          <div class="loading-state">A carregar atividade recente...</div>
        </div>
      </div>

      <!-- Card Conformidade BNA -->
      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-header">
          <h2 class="card-title">Conformidade Regulatória & Supervisão BNA</h2>
        </div>
        <div class="card-body">
          <div class="compliance-note">
            <p><strong>Aviso Normativo BNA:</strong></p>
            <p class="text-sm">Todas as transações, consultas, aprovações de 4 olhos e alterações de taxas de câmbio são estritamente registadas em pista de auditoria indelével com carimbo temporal e endereço IP.</p>
            <div class="system-status-indicator" style="margin-top: 8px;">
              <span class="status-indicator-dot online"></span>
              <span class="text-sm">API Backend Fastify: Activa e operacional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Carregar dados operacionais assincronamente
  void (async () => {
    try {
      const dash: ResumoDashboardOperacional = await api.obterDashboardOperacional();

      const numCambio = container.querySelector<HTMLElement>("#dash-num-cambio");
      const badgeCambio = container.querySelector<HTMLElement>("#dash-badge-cambio");
      const numRemessas = container.querySelector<HTMLElement>("#dash-num-remessas");
      const badgeRemessas = container.querySelector<HTMLElement>("#dash-badge-remessas");
      const numKyc = container.querySelector<HTMLElement>("#dash-num-kyc");
      const badgeKyc = container.querySelector<HTMLElement>("#dash-badge-kyc");
      const numLiquidacoes = container.querySelector<HTMLElement>("#dash-num-liquidacoes");
      const badgeLiquidacoes = container.querySelector<HTMLElement>("#dash-badge-liquidacoes");

      if (numCambio) numCambio.textContent = String(dash.pedidosCambioPendentes);
      if (badgeCambio) badgeCambio.textContent = String(dash.pedidosCambioPendentes);

      if (numRemessas) numRemessas.textContent = String(dash.pedidosRemessasPendentes);
      if (badgeRemessas) badgeRemessas.textContent = String(dash.pedidosRemessasPendentes);

      if (numKyc) numKyc.textContent = String(dash.kycPendentes);
      if (badgeKyc) badgeKyc.textContent = String(dash.kycPendentes);

      if (numLiquidacoes) numLiquidacoes.textContent = String(dash.liquidacoesManuaisPendentes);
      if (badgeLiquidacoes) badgeLiquidacoes.textContent = String(dash.liquidacoesManuaisPendentes);

      // Renderizar atividade recente
      const containerAtividade = container.querySelector<HTMLDivElement>("#dash-atividade-recente");
      if (containerAtividade) {
        if (!dash.atividadesRecentes || dash.atividadesRecentes.length === 0) {
          containerAtividade.innerHTML = `<p class="text-muted" style="font-size: 13px;">Nenhuma ação auditada registada na sessão recente.</p>`;
        } else {
          containerAtividade.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${dash.atividadesRecentes
                .slice(0, 5)
                .map(
                  (a) => `
                  <div style="font-size: 12px; padding: 6px 8px; background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid var(--nz-azul-600);">
                    <div style="display: flex; justify-content: space-between;">
                      <strong>${escapeHtml(a.acao)}</strong>
                      <span class="text-muted">${formatarData(a.criadoEm)}</span>
                    </div>
                    ${a.recurso ? `<div class="text-muted" style="font-size: 11px;">Recurso: ${escapeHtml(a.recurso)}</div>` : ""}
                  </div>
                `
                )
                .join("")}
            </div>
          `;
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados operacionais no dashboard:", err);
    }
  })();

  // Carregar taxas assincronamente
  const containerTaxas = container.querySelector<HTMLDivElement>("#dash-taxas-container");
  if (containerTaxas) {
    try {
      const taxas: TaxaItem[] = await api.listarTaxas();
      if (!taxas || taxas.length === 0) {
        containerTaxas.innerHTML = `<p class="text-muted">Nenhuma taxa configurada de momento.</p>`;
      } else {
        containerTaxas.innerHTML = `
          <div class="taxas-quick-list">
            ${taxas
              .map(
                (t) => `
                <div class="taxa-quick-row">
                  <div class="moeda-badge">${t.moeda}</div>
                  <div class="taxa-quick-values">
                    <div><small class="text-muted">Compra:</small> <strong>${t.compra} AOA</strong></div>
                    <div><small class="text-muted">Venda:</small> <strong>${t.venda} AOA</strong></div>
                  </div>
                  <div class="taxa-quick-source">
                    <span class="badge ${t.fonte === "oficial" ? "badge-success" : "badge-warning"}">
                      ${t.fonte}
                    </span>
                  </div>
                </div>
              `
              )
              .join("")}
          </div>
        `;
      }
    } catch {
      containerTaxas.innerHTML = `
        <div class="alert-box alert-warning">
          Não foi possível carregar as taxas de câmbio em tempo real.
        </div>
      `;
    }
  }
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarData(dataStr: any): string {
  if (!dataStr) return "N/A";
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return String(dataStr);
    return d.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dataStr);
  }
}
