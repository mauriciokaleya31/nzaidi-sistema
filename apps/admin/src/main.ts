import "./estilo.css";
import { authState } from "./state/auth.state.js";
import { renderizarCabecalho } from "./components/cabecalho.js";
import { renderizarMenuLateral } from "./components/menu-lateral.js";
import { renderizarLogin } from "./views/login.view.js";
import { renderizarDashboard } from "./views/dashboard.view.js";
import { renderizarTaxas } from "./views/taxas.view.js";
import { renderizarAuditoria } from "./views/auditoria.view.js";
import { renderizarClientes } from "./views/clientes.view.js";
import { renderizarCaixa } from "./views/caixa.view.js";
import { renderizarBalcao } from "./views/balcao.view.js";

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
      case "#balcao":
        if (authState.temPermissao("operacoes:registar") || authState.temPermissao("registar_operacao_balcao")) {
          await renderizarBalcao(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado ao Balcão Operacional de Câmbios.</div>
          `;
        }
        break;

      case "#clientes":
        if (authState.temPermissao("clientes:consultar")) {
          await renderizarClientes(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado para consulta de clientes.</div>
          `;
        }
        break;

      case "#caixa":
        if (authState.temPermissao("caixa:consultar") || authState.temPermissao("caixa:abrir")) {
          await renderizarCaixa(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado ao módulo de Caixa e Tesouraria.</div>
          `;
        }
        break;

      case "#taxas":
        if (authState.temPermissao("taxas:consultar") || authState.temPermissao("ver_taxas")) {
          await renderizarTaxas(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado para consulta de taxas.</div>
          `;
        }
        break;

      case "#auditoria":
        if (authState.temPermissao("auditoria:consultar") || authState.temPermissao("ver_auditoria")) {
          await renderizarAuditoria(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado para consulta de auditoria.</div>
          `;
        }
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
  window.addEventListener("hashchange", () => {
    void renderizarAplicacao();
  });

  authState.inscrever(() => {
    void renderizarAplicacao();
  });

  await authState.carregarSessaoInicial();
}

void iniciar();
