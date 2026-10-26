import "./styles.css";
import { authState } from "./auth.state.js";
import { renderizarLogin } from "./views/login.view.js";
import { renderizarDashboard } from "./views/dashboard.view.js";
import { renderizarRemessas } from "./views/remessas.view.js";
import { renderizarReconciliacao } from "./views/reconciliacao.view.js";
import { renderizarPerfil } from "./views/perfil.view.js";

const appRoot = document.getElementById("app")!;

async function renderizarAplicacao(): Promise<void> {
  if (authState.carregando) {
    appRoot.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
        <img src="/simbolo.png" alt="NZAIDI" width="64" height="64" style="animation: pulse 1.5s infinite;" />
        <h3 style="font-weight: 600; font-size: 1.1rem;">NZAIDI — Portal dos Parceiros</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem;">A validar credenciais de segurança institucional...</p>
      </div>
    `;
    return;
  }

  const parceiro = authState.parceiro;
  const usuario = authState.usuario;
  const rotaAtual = window.location.hash || "#dashboard";

  if (!parceiro || !usuario) {
    renderizarLogin(appRoot);
    return;
  }

  appRoot.innerHTML = `
    <div class="portal-layout">
      <!-- Barra Lateral -->
      <aside class="portal-sidebar">
        <div class="portal-brand">
          <img src="/simbolo.png" alt="NZAIDI" />
          <div class="portal-brand-text">
            <h2>NZAIDI PARCEIROS</h2>
            <span>${parceiro.codigo}</span>
          </div>
        </div>

        <nav class="portal-nav">
          <a href="#dashboard" class="nav-item ${rotaAtual === "#dashboard" ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Painel Geral</span>
          </a>

          <a href="#remessas" class="nav-item ${rotaAtual === "#remessas" ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            <span>Remessas & Liquidações</span>
          </a>

          <a href="#reconciliacao" class="nav-item ${rotaAtual === "#reconciliacao" ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Reconciliação</span>
          </a>

          <a href="#perfil" class="nav-item ${rotaAtual === "#perfil" ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Configurações</span>
          </a>
        </nav>

        <div class="portal-user-footer">
          <div class="user-info-mini">
            <div class="user-name-mini">${usuario.nome}</div>
            <div class="user-entity-mini">${parceiro.nome}</div>
          </div>
          <button id="btn-logout" class="btn btn-sm btn-secondary" title="Terminar Sessão">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      <!-- Área de Conteúdo -->
      <main class="portal-main">
        <header class="portal-header">
          <div class="header-title-box">
            <h1>Portal de Liquidações & Correspondentes</h1>
          </div>
          <div style="display: flex; align-items: center; gap: 14px;">
            <span class="badge badge-success">Sessão Institucional Ativa</span>
          </div>
        </header>

        <section class="portal-content" id="conteudo-pagina">
          <!-- Conteúdo da Rota -->
        </section>
      </main>
    </div>
  `;

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    if (confirm("Deseja realmente terminar a sua sessão?")) {
      await authState.logout();
      window.location.hash = "#login";
    }
  });

  const conteudoContainer = document.getElementById("conteudo-pagina")!;

  switch (rotaAtual) {
    case "#dashboard":
      await renderizarDashboard(conteudoContainer);
      break;
    case "#remessas":
      await renderizarRemessas(conteudoContainer);
      break;
    case "#reconciliacao":
      await renderizarReconciliacao(conteudoContainer);
      break;
    case "#perfil":
      renderizarPerfil(conteudoContainer);
      break;
    default:
      await renderizarDashboard(conteudoContainer);
      break;
  }
}

window.addEventListener("hashchange", renderizarAplicacao);
authState.escutar(renderizarAplicacao);

// Inicialização automática
authState.inicializar();
