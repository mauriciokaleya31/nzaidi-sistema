import { api, type TaxaItem } from "../api/cliente.js";
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
        <p class="view-subtitle">Bem-vindo, <strong>${usuario.nome}</strong> (${usuario.email})</p>
      </div>
      <div class="view-actions">
        <span class="badge badge-info">Ambiente de Operações</span>
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
            ${usuario.permissoes.map((p) => `<span class="perm-pill">${p}</span>`).join("")}
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
            <a href="#balcao" class="quick-action-btn action-highlight">
              <span class="qa-icon">🏦</span>
              <span class="qa-title">Balcão Cambial</span>
              <span class="qa-desc">Compra e venda de divisas e borderôs</span>
            </a>

            <a href="#clientes" class="quick-action-btn">
              <span class="qa-icon">👥</span>
              <span class="qa-title">Clientes & KYC</span>
              <span class="qa-desc">Cadastro e diligência regulamentar</span>
            </a>

            <a href="#caixa" class="quick-action-btn">
              <span class="qa-icon">💼</span>
              <span class="qa-title">Tesouraria & Caixa</span>
              <span class="qa-desc">Fundos, movimentos e fecho de caixa</span>
            </a>

            <a href="#taxas" class="quick-action-btn">
              <span class="qa-icon">💱</span>
              <span class="qa-title">Taxas de Câmbio</span>
              <span class="qa-desc">Cotações oficiais de USD e EUR</span>
            </a>

            ${
              authState.temPermissao("auditoria:consultar") || authState.temPermissao("ver_auditoria")
                ? `
                <a href="#auditoria" class="quick-action-btn">
                  <span class="qa-icon">🛡️</span>
                  <span class="qa-title">Pista de Auditoria</span>
                  <span class="qa-desc">Consultar registos de conformidade</span>
                </a>
              `
                : ""
            }
          </div>
        </div>
      </div>

      <!-- Card Conformidade BNA -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Conformidade Regulatória</h2>
        </div>
        <div class="card-body">
          <div class="compliance-note">
            <p><strong>Aviso Normativo BNA:</strong></p>
            <p class="text-sm">Todas as transações, consultas e alterações de taxas de câmbio são estritamente registadas em pista de auditoria indelével com carimbo temporal e endereço IP.</p>
            <div class="system-status-indicator">
              <span class="status-indicator-dot online"></span>
              <span class="text-sm">API Backend Fastify: Activa e operacional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

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
