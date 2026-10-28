import { api, type TaxaItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

interface AlertaBnaData {
  alerta: boolean;
  horaLuanda: string;
  dataHojeLuanda: string;
  mapaCambioGerado: boolean;
  mapaRemessaGerado: boolean;
  mensagem?: string;
}

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

    <!-- Container de Alerta Regulatório BNA (disparado se >18:35 Luanda sem reporte) -->
    <div id="dash-alerta-bna"></div>

    <div class="dashboard-grid">
      <!-- Card Estado do Reporte BNA do Dia -->
      <div class="card" style="grid-column: 1 / -1; border-left: 4px solid #CC9638;">
        <div class="card-header">
          <h2 class="card-title">Supervisão BNA — Estado dos Mapas Diários (Suptech & SSIF)</h2>
          <a href="#bna" class="card-link">Gestão de Reportes →</a>
        </div>
        <div class="card-body" id="dash-bna-status-container">
          <div class="loading-state">A verificar conformidade de reporte com o BNA...</div>
        </div>
      </div>

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
      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-header">
          <h2 class="card-title">Atalhos Operacionais Rápidos</h2>
        </div>
        <div class="card-body">
          <div class="quick-actions-grid">
            <a href="#balcao" class="quick-action-btn action-highlight">
              <span class="qa-icon">🏦</span>
              <span class="qa-title">Balcão Cambial</span>
              <span class="qa-desc">Compra e venda de divisas e borderôs</span>
            </a>

            <a href="#remessas" class="quick-action-btn">
              <span class="qa-icon">🚀</span>
              <span class="qa-title">Remessas</span>
              <span class="qa-desc">MaxPay & Realtransfers internacionais</span>
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

            <a href="#bna" class="quick-action-btn">
              <span class="qa-icon">📊</span>
              <span class="qa-title">Reportes BNA</span>
              <span class="qa-desc">Mapas diários Suptech e SSIF</span>
            </a>

            <a href="#taxas" class="quick-action-btn">
              <span class="qa-icon">💱</span>
              <span class="qa-title">Taxas de Câmbio</span>
              <span class="qa-desc">Cotações oficiais de USD e EUR</span>
            </a>

            ${
              authState.temPermissao("ver_auditoria")
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

  // 1. Carregar Alerta e Status do BNA
  const dashAlertaContainer = container.querySelector<HTMLDivElement>("#dash-alerta-bna");
  const dashBnaStatusContainer = container.querySelector<HTMLDivElement>("#dash-bna-status-container");

  try {
    const resBna = await api.get<{ sucesso: boolean; alerta: AlertaBnaData }>("/bna/alerta-hoje");
    if (resBna.sucesso) {
      const { alerta, mensagem, dataHojeLuanda, horaLuanda, mapaCambioGerado, mapaRemessaGerado } = resBna.alerta;

      if (alerta && dashAlertaContainer) {
        dashAlertaContainer.innerHTML = `
          <div class="alert-box alert-error" style="margin-bottom: 1.5rem; border: 2px solid #ef4444; background: #fef2f2; padding: 1rem; border-radius: 8px;">
            <div style="font-size: 1.1rem; font-weight: bold; color: #b91c1c;">⚠️ ALERTA REGULATÓRIO BNA (CORTE DAS 18:30 ULTRAPASSADO)</div>
            <div style="color: #991b1b; margin-top: 0.25rem;">${mensagem}</div>
            <div style="margin-top: 0.5rem;">
              <a href="#bna" class="btn btn-primary btn-sm">⚡ Aceder aos Reportes BNA e Gerar Agora</a>
            </div>
          </div>
        `;
      }

      if (dashBnaStatusContainer) {
        dashBnaStatusContainer.innerHTML = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div style="padding: 0.75rem; background: #F8FAFC; border-radius: 6px;">
              <div class="text-muted" style="font-size: 0.8rem;">Data Referência (Luanda)</div>
              <div style="font-size: 1.1rem; font-weight: bold; color: #052D62;">${dataHojeLuanda} (${horaLuanda})</div>
            </div>
            <div style="padding: 0.75rem; background: #F8FAFC; border-radius: 6px;">
              <div class="text-muted" style="font-size: 0.8rem;">Mapa Diário de Câmbio</div>
              <div>
                ${
                  mapaCambioGerado
                    ? '<span class="badge badge-success">✓ Gerado / Pronto</span>'
                    : '<span class="badge badge-warning">Pendente (Geração 18:30)</span>'
                }
              </div>
            </div>
            <div style="padding: 0.75rem; background: #F8FAFC; border-radius: 6px;">
              <div class="text-muted" style="font-size: 0.8rem;">Mapa Diário de Remessas</div>
              <div>
                ${
                  mapaRemessaGerado
                    ? '<span class="badge badge-success">✓ Gerado / Pronto</span>'
                    : '<span class="badge badge-warning">Pendente (Geração 18:30)</span>'
                }
              </div>
            </div>
            <div style="padding: 0.75rem; background: #F8FAFC; border-radius: 6px;">
              <div class="text-muted" style="font-size: 0.8rem;">Plataformas de Envio</div>
              <div style="font-weight: 500; font-size: 0.9rem; color: #1e293b;">Suptech & SSIF (BNA)</div>
            </div>
          </div>
        `;
      }
    }
  } catch {
    if (dashBnaStatusContainer) {
      dashBnaStatusContainer.innerHTML = `
        <div class="text-muted" style="font-size: 0.85rem;">
          Módulo BNA ativo e pronto para submissão diária. Consulte a área de <a href="#bna">Reportes BNA</a> para gerar ficheiros.
        </div>
      `;
    }
  }

  // 2. Carregar taxas assincronamente
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
