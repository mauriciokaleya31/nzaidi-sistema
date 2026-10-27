import "./styles.css";
import { authState } from "./auth.state.js";
import { renderLoginView } from "./views/login.view.js";
import { renderDashboardView } from "./views/dashboard.view.js";
import { renderCambioView } from "./views/cambio.view.js";
import { renderRemessasView } from "./views/remessas.view.js";
import { renderDocumentosView } from "./views/documentos.view.js";
import { renderPerfilView } from "./views/perfil.view.js";
import { renderizarCartoes } from "./views/cartoes.view.js";

const appRoot = document.getElementById("app") as HTMLElement;
let cleanupViewAtual: (() => void) | null = null;

function obterRotaAtual(): string {
  const hash = window.location.hash.slice(1);
  return hash.startsWith("/") ? hash : "/dashboard";
}

function navegarPara(rota: string): void {
  window.location.hash = rota;
}

function renderizarHeader(clienteNome: string, rotaAtiva: string): string {
  return `
    <header class="portal-header">
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        <a href="#/dashboard" class="brand-wrapper">
          <span class="brand-logo-badge">NZ</span>
          <span class="brand-title">NZAIDI</span>
          <span class="brand-portal-label">Portal do Cliente</span>
        </a>

        <nav class="portal-nav">
          <a href="#/dashboard" class="nav-link ${rotaAtiva === "/dashboard" ? "ativo" : ""}">
            Visão Geral
          </a>
          <a href="#/cambio" class="nav-link ${rotaAtiva === "/cambio" ? "ativo" : ""}">
            Câmbios
          </a>
          <a href="#/remessas" class="nav-link ${rotaAtiva === "/remessas" ? "ativo" : ""}">
            Remessas
          </a>
          <a href="#/cartoes" class="nav-link ${rotaAtiva === "/cartoes" ? "ativo" : ""}">
            Cartões Visa
          </a>
          <a href="#/documentos" class="nav-link ${rotaAtiva === "/documentos" ? "ativo" : ""}">
            Documentos KYC
          </a>
          <a href="#/perfil" class="nav-link ${rotaAtiva === "/perfil" ? "ativo" : ""}">
            Minha Conta
          </a>
        </nav>
      </div>

      <div class="user-badge">
        <div style="text-align: right;">
          <div class="user-name" title="${clienteNome}">${clienteNome}</div>
          <div style="font-size: 0.7rem; color: var(--cor-primaria); font-weight: 500;">Cliente Verificado</div>
        </div>
        <button id="btn-header-logout" class="btn-logout" title="Terminar Sessão">Sair</button>
      </div>
    </header>
  `;
}

async function renderApp(): Promise<void> {
  // Limpar recursos da vista anterior (como temporizadores de cotações)
  if (cleanupViewAtual) {
    cleanupViewAtual();
    cleanupViewAtual = null;
  }

  const rota = obterRotaAtual();

  // Tela de carregamento inicial
  if (authState.carregando) {
    appRoot.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 1rem;">
        <div class="pulse-indicator" style="width: 20px; height: 20px;"></div>
        <div style="color: var(--cor-texto-mutado); font-size: 0.9rem;">A carregar Portal NZAIDI...</div>
      </div>
    `;
    return;
  }

  // Se não autenticado, apenas a vista de login é permitida
  if (!authState.cliente) {
    if (rota !== "/login") {
      navegarPara("/login");
      return;
    }
    renderLoginView(appRoot, () => {
      navegarPara("/dashboard");
    });
    return;
  }

  // Se já autenticado e na rota de login, redireciona para o dashboard
  if (rota === "/login") {
    navegarPara("/dashboard");
    return;
  }

  // Layout Autenticado
  appRoot.innerHTML = `
    <div class="portal-container">
      ${renderizarHeader(authState.cliente.nome, rota)}
      <main class="portal-content" id="conteudo-principal"></main>
      <footer style="border-top: 1px solid var(--cor-borda); padding: 1.25rem; text-align: center; font-size: 0.8rem; color: var(--cor-texto-mutado); background: #0b1329;">
        © 2026 NZAIDI — Casa de Câmbios & Transferências. Todos os direitos reservados. Regulada pelo Banco Nacional de Angola (BNA).
      </footer>
    </div>
  `;

  // Listener de logout no header
  appRoot.querySelector("#btn-header-logout")?.addEventListener("click", async () => {
    await authState.logout();
    navegarPara("/login");
  });

  const mainContainer = appRoot.querySelector("#conteudo-principal") as HTMLElement;

  // Roteamento de Vistas
  switch (rota) {
    case "/dashboard":
      cleanupViewAtual = renderDashboardView(mainContainer);
      break;
    case "/cambio":
      renderCambioView(mainContainer);
      break;
    case "/remessas":
      renderRemessasView(mainContainer);
      break;
    case "/cartoes":
      renderizarCartoes(mainContainer);
      break;
    case "/documentos":
      renderDocumentosView(mainContainer);
      break;
    case "/perfil":
      renderPerfilView(mainContainer, () => {
        navegarPara("/login");
      });
      break;
    default:
      navegarPara("/dashboard");
      break;
  }
}

// Inicialização da aplicação
window.addEventListener("hashchange", () => {
  renderApp();
});

authState.escutar(() => {
  renderApp();
});

// Arrancar
authState.inicializar();
