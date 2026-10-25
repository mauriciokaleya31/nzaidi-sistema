import "./estilo.css";
import { authState } from "./state/auth.state.js";
import { renderizarCabecalho } from "./components/cabecalho.js";
import { renderizarMenuLateral } from "./components/menu-lateral.js";
import { renderizarLogin } from "./views/login.view.js";
import { renderizarDashboard } from "./views/dashboard.view.js";
import { renderizarTaxas } from "./views/taxas.view.js";
import { renderizarAuditoria } from "./views/auditoria.view.js";
import { renderizarOperacional } from "./views/operacional.view.js";

const appRoot = document.getElementById("app");

async function renderizarAplicacao(): Promise<void> {
  if (!appRoot) return;

  if (authState.estaCarregando()) {
    appRoot.innerHTML = `
      <div class="app-loading-screen">
        <div class="brand-badge-circle brand-badge-large">NZ</div>
        <h2>NZAIDI CÂMBIOS</h2>
        <p class="text-muted">A verificar credenciais de acesso seguro...</p>
      </div>
    `;
    return;
  }

  const usuario = authState.getUsuario();
  const rotaAtual = window.location.hash || "#dashboard";

  // Se não está autenticado, renderiza a tela de Login
  if (!usuario) {
    if (window.location.hash !== "#login") {
      window.location.hash = "#login";
    }
    renderizarLogin(appRoot);
    return;
  }

  // Se estiver autenticado e tentar ir para o login, redireciona para o dashboard
  if (rotaAtual === "#login") {
    window.location.hash = "#dashboard";
    return;
  }

  // Estrutura do Layout Administrativo Completo
  appRoot.innerHTML = `
    <div class="app-layout">
      <div id="sidebar-container"></div>
      <div class="app-main-wrapper">
        <div id="header-container"></div>
        <main class="app-content" id="view-container"></main>
      </div>
    </div>
  `;

  const sidebarContainer = document.getElementById("sidebar-container");
  const headerContainer = document.getElementById("header-container");
  const viewContainer = document.getElementById("view-container");

  if (sidebarContainer) {
    renderizarMenuLateral(sidebarContainer, rotaAtual);
  }

  if (headerContainer) {
    renderizarCabecalho(headerContainer);
  }

  if (viewContainer) {
    switch (rotaAtual) {
      case "#taxas":
        if (authState.temPermissao("taxas:consultar")) {
          await renderizarTaxas(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado para consulta de taxas.</div>
          `;
        }
        break;

      case "#auditoria":
        if (authState.temPermissao("auditoria:consultar")) {
          await renderizarAuditoria(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado para consulta de auditoria.</div>
          `;
        }
        break;

      case "#operacional":
        renderizarOperacional(viewContainer, "balcao");
        break;

      case "#tesouraria":
        renderizarOperacional(viewContainer, "tesouraria");
        break;

      case "#dashboard":
      default:
        await renderizarDashboard(viewContainer);
        break;
    }
  }
}

// Inicializar aplicação
async function iniciar(): Promise<void> {
  // Escutar eventos de rota
  window.addEventListener("hashchange", () => {
    void renderizarAplicacao();
  });

  // Escutar mudanças de estado de autenticação
  authState.inscrever(() => {
    void renderizarAplicacao();
  });

  // Carregar sessão existente ao arrancar
  await authState.carregarSessaoInicial();
}

void iniciar();
