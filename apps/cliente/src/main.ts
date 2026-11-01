import "./styles.css";
import { authState } from "./auth.state.js";
import { api } from "./api.js";
import { renderLoginView } from "./views/login.view.js";
import { renderDashboardView } from "./views/dashboard.view.js";
import { renderCambioView } from "./views/cambio.view.js";
import { renderRemessasView } from "./views/remessas.view.js";
import { renderDocumentosView } from "./views/documentos.view.js";
import { renderPerfilView } from "./views/perfil.view.js";
import { renderizarCartoes } from "./views/cartoes.view.js";
import { icone } from "./components/icones.js";
import { TEXTOS } from "./textos/pt-AO.js";
import { renderizar404, renderizarSemLigacao } from "./modelos/M6_Sistema.js";

const appRoot = document.getElementById("app") as HTMLElement;
let cleanupViewAtual: (() => void) | null = null;
let menuMobileAberto = false;
let servicoCartoesAtivo = false;
let painelNotificacoesAberto = false;

// Gestão de Tema (Light Mode / Dark Mode persistido)
function obterTemaAtual(): "light" | "dark" {
  return (localStorage.getItem("nzaidi_theme") as "light" | "dark") || "light";
}

function aplicarTema(tema: "light" | "dark"): void {
  document.documentElement.setAttribute("data-tema", tema);
  localStorage.setItem("nzaidi_theme", tema);
}

function alternarTema(): void {
  const novo = obterTemaAtual() === "dark" ? "light" : "dark";
  aplicarTema(novo);
  atualizarIndicadorTema();
}

function atualizarIndicadorTema(): void {
  const btn = document.getElementById("btn-toggle-tema");
  if (!btn) return;
  const tema = obterTemaAtual();
  btn.innerHTML =
    tema === "dark"
      ? `${icone("inicio", 16)} <span class="theme-label">Claro</span>`
      : `${icone("conta", 16)} <span class="theme-label">Escuro</span>`;
  btn.setAttribute("title", tema === "dark" ? "Mudar para Modo Claro" : "Mudar para Modo Escuro");
}

function obterRotaAtual(): { rotaBase: string; subRota: string } {
  const hash = window.location.hash.slice(1) || "/dashboard";
  const partes = hash.split("/").filter(Boolean);
  const rotaBase = `/${partes[0] || "dashboard"}`;
  const subRota = partes.slice(1).join("/");
  return { rotaBase, subRota };
}

function navegarPara(caminho: string): void {
  window.location.hash = caminho;
}

function obterDataFormatada(): string {
  const agora = new Date();
  const opcoes: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Luanda",
  };
  const formatado = agora.toLocaleDateString("pt-AO", opcoes);
  return formatado.charAt(0).toUpperCase() + formatado.slice(1);
}

function renderizarSidebar(clienteNome: string, rotaAtiva: string, kycStatus: string): string {
  // Regra Estrita: Início · Câmbio · Remessas · Cartões · Documentos · Minha conta
  const itensNav = [
    { rota: "/dashboard", rotulo: TEXTOS.navegacao.inicio, icon: "inicio" as const },
    { rota: "/cambio", rotulo: TEXTOS.navegacao.cambio, icon: "cambio" as const },
    { rota: "/remessas", rotulo: TEXTOS.navegacao.remessas, icon: "remessas" as const },
  ];

  // Cartões só aparece se o serviço estiver ativo (ou em transição homologada)
  if (servicoCartoesAtivo) {
    itensNav.push({ rota: "/cartoes", rotulo: TEXTOS.navegacao.cartoes, icon: "cartoes" as const });
  }

  itensNav.push(
    { rota: "/documentos", rotulo: TEXTOS.navegacao.documentos, icon: "documentos" as const },
    { rota: "/perfil", rotulo: TEXTOS.navegacao.minhaConta, icon: "conta" as const }
  );

  return `
    <aside class="app-sidebar ${menuMobileAberto ? "aberto" : ""}" id="app-sidebar">
      <div class="sidebar-brand">
        <a href="#/dashboard" class="brand-link">
          <div class="brand-logo-mark">NZ</div>
          <div class="brand-text-block">
            <span class="brand-name">${TEXTOS.empresa.sigla}</span>
            <span class="brand-tagline">${TEXTOS.empresa.subtitulo}</span>
          </div>
        </a>
        <button class="btn-fechar-drawer-mobile" id="btn-fechar-sidebar" aria-label="Fechar menu">
          ${icone("fechar", 20)}
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="Navegação principal">
        <div class="nav-section-title">Menu Principal</div>
        ${itensNav
          .map(
            (item) => `
          <a href="#${item.rota}" class="sidebar-nav-item ${rotaAtiva === item.rota ? "ativo" : ""}" data-rota="${item.rota}">
            <span class="nav-icon">${icone(item.icon, 20)}</span>
            <span class="nav-label">${item.rotulo}</span>
            ${rotaAtiva === item.rota ? '<span class="nav-active-pill"></span>' : ""}
          </a>
        `
          )
          .join("")}
      </nav>

      <div class="sidebar-footer">
        <div class="user-summary-card">
          <div class="user-avatar">${clienteNome.slice(0, 2).toUpperCase()}</div>
          <div class="user-info">
            <span class="user-display-name" title="${clienteNome}">${clienteNome}</span>
            <span class="user-status-pill badge-${kycStatus}">${kycStatus}</span>
          </div>
          <button id="btn-sidebar-logout" class="btn-sidebar-action" title="${TEXTOS.botoes.terminarSessao}" aria-label="${TEXTOS.botoes.terminarSessao}">
            ${icone("sair", 18)}
          </button>
        </div>
      </div>
    </aside>
  `;
}

function renderizarTopbar(clienteNome: string): string {
  const tema = obterTemaAtual();
  const notificacoes = api.listarNotificacoes();
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return `
    <header class="app-topbar">
      <div class="topbar-left">
        <button class="btn-toggle-menu-mobile" id="btn-toggle-menu" aria-label="Abrir menu de navegação">
          ${icone("maisOpcoes", 22)}
        </button>
        <div class="topbar-date-display">
          <span class="date-icon">${icone("calendario", 16)}</span>
          <span class="date-text">${obterDataFormatada()}</span>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Modo Claro / Escuro -->
        <button id="btn-toggle-tema" class="theme-toggle-btn" title="Alternar Modo Claro/Escuro">
          ${tema === "dark" ? `${icone("inicio", 16)} Claro` : `${icone("conta", 16)} Escuro`}
        </button>

        <!-- Sino de Notificações -->
        <div class="notification-wrapper">
          <button class="icon-action-btn" id="btn-notificacoes" title="${TEXTOS.navegacao.notificacoes}" aria-label="${TEXTOS.navegacao.notificacoes}">
            ${icone("notificacoes", 18)}
            ${naoLidas > 0 ? `<span class="notification-indicator-dot"></span>` : ""}
          </button>

          <!-- Dropdown Notificações -->
          <div class="notifications-dropdown ${painelNotificacoesAberto ? "aberto" : ""}" id="dropdown-notificacoes">
            <div class="notif-dropdown-header">
              <strong>${TEXTOS.navegacao.notificacoes}</strong>
              <button id="btn-marcar-todas-lidas" class="btn-link-action">${TEXTOS.botoes.marcarLido}</button>
            </div>
            <div class="notif-dropdown-list">
              ${
                notificacoes.length === 0
                  ? `<div class="p-small text-suave">${TEXTOS.vazios.semNotificacoes}</div>`
                  : notificacoes
                      .map(
                        (n) => `
                    <div class="notif-item ${!n.lida ? "nao-lida" : ""}">
                      <strong>${n.titulo}</strong>
                      <p>${n.mensagem}</p>
                    </div>
                  `
                      )
                      .join("")
              }
            </div>
          </div>
        </div>

        <!-- Perfil Resumo -->
        <a href="#/perfil" class="topbar-profile-pill" title="${TEXTOS.navegacao.minhaConta}">
          <div class="topbar-avatar">${clienteNome.slice(0, 2).toUpperCase()}</div>
          <span class="topbar-username">${clienteNome.split(" ")[0]}</span>
        </a>
      </div>
    </header>
  `;
}

function renderizarBarraInferiorMobile(rotaAtiva: string): string {
  // Barra inferior móvel: Início, Câmbio, Remessas, Conta
  const itens = [
    { rota: "/dashboard", rotulo: TEXTOS.navegacao.inicio, icon: "inicio" as const },
    { rota: "/cambio", rotulo: TEXTOS.navegacao.cambio, icon: "cambio" as const },
    { rota: "/remessas", rotulo: TEXTOS.navegacao.remessas, icon: "remessas" as const },
    { rota: "/perfil", rotulo: "Conta", icon: "conta" as const },
  ];

  return `
    <nav class="mobile-bottom-nav" aria-label="Navegação móvel inferior">
      ${itens
        .map(
          (item) => `
        <a href="#${item.rota}" class="mobile-nav-link ${rotaAtiva === item.rota ? "ativo" : ""}">
          <span class="mobile-nav-icon">${icone(item.icon, 20)}</span>
          <span class="mobile-nav-label">${item.rotulo}</span>
        </a>
      `
        )
        .join("")}
    </nav>
  `;
}

async function renderApp(): Promise<void> {
  aplicarTema(obterTemaAtual());

  if (cleanupViewAtual) {
    cleanupViewAtual();
    cleanupViewAtual = null;
  }

  const { rotaBase, subRota } = obterRotaAtual();

  // Verificação de Conectividade
  if (!navigator.onLine) {
    appRoot.innerHTML = renderizarSemLigacao();
    return;
  }

  // Estado de Carregamento Inicial
  if (authState.carregando) {
    appRoot.innerHTML = `
      <div class="app-loading-screen">
        <div class="loading-spinner-brand"></div>
        <div class="loading-text">A validar acesso ao Portal do Cliente NZAIDI...</div>
      </div>
    `;
    return;
  }

  // Rotas de Autenticação
  if (!authState.cliente) {
    if (rotaBase !== "/login" && rotaBase !== "/entrar") {
      navegarPara("/entrar");
      return;
    }
    renderLoginView(appRoot, () => navegarPara("/dashboard"));
    return;
  }

  if (rotaBase === "/login" || rotaBase === "/entrar") {
    navegarPara("/dashboard");
    return;
  }

  // Verificar status de cartões para controle do interruptor
  try {
    const statusC = await api.obterStatusCartoesPortal();
    servicoCartoesAtivo = !!statusC?.servico_ativo;
  } catch {
    servicoCartoesAtivo = false;
  }

  const clienteNome = authState.cliente.nome;
  const kycStatus = authState.cliente.estadoKyc || "pendente";

  // Shell Estrutural Principal
  appRoot.innerHTML = `
    <div class="app-shell">
      ${renderizarSidebar(clienteNome, rotaBase, kycStatus)}
      <div class="sidebar-overlay ${menuMobileAberto ? "ativo" : ""}" id="sidebar-overlay"></div>

      <div class="app-main-viewport">
        ${renderizarTopbar(clienteNome)}

        <main class="app-content-body" id="conteudo-principal" tabindex="-1"></main>

        <footer class="app-footer">
          <div class="footer-inner">
            <span>${TEXTOS.empresa.direitos}</span>
            <span class="footer-compliance">${TEXTOS.empresa.regulacao}</span>
          </div>
        </footer>

        ${renderizarBarraInferiorMobile(rotaBase)}
      </div>
    </div>
  `;

  // Listeners de Topbar e Sidebar
  document.getElementById("btn-toggle-tema")?.addEventListener("click", () => alternarTema());

  const fazerLogout = async () => {
    await authState.logout();
    navegarPara("/entrar");
  };

  document.getElementById("btn-sidebar-logout")?.addEventListener("click", fazerLogout);

  // Menu Mobile Drawer
  const btnToggleMenu = document.getElementById("btn-toggle-menu");
  const btnFecharSidebar = document.getElementById("btn-fechar-sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const sidebarEl = document.getElementById("app-sidebar");

  const fecharMenu = () => {
    menuMobileAberto = false;
    sidebarEl?.classList.remove("aberto");
    sidebarOverlay?.classList.remove("ativo");
  };

  const abrirMenu = () => {
    menuMobileAberto = true;
    sidebarEl?.classList.add("aberto");
    sidebarOverlay?.classList.add("ativo");
  };

  btnToggleMenu?.addEventListener("click", abrirMenu);
  btnFecharSidebar?.addEventListener("click", fecharMenu);
  sidebarOverlay?.addEventListener("click", fecharMenu);

  // Notificações Dropdown Toggle
  const btnNotif = document.getElementById("btn-notificacoes");
  const dropdownNotif = document.getElementById("dropdown-notificacoes");

  btnNotif?.addEventListener("click", (e) => {
    e.stopPropagation();
    painelNotificacoesAberto = !painelNotificacoesAberto;
    dropdownNotif?.classList.toggle("aberto", painelNotificacoesAberto);
  });

  document.addEventListener("click", () => {
    if (painelNotificacoesAberto) {
      painelNotificacoesAberto = false;
      dropdownNotif?.classList.remove("aberto");
    }
  });

  document.getElementById("btn-marcar-todas-lidas")?.addEventListener("click", (e) => {
    e.stopPropagation();
    api.marcarNotificacoesLidas();
    renderApp();
  });

  const mainContainer = appRoot.querySelector("#conteudo-principal") as HTMLElement;

  // Roteamento
  switch (rotaBase) {
    case "/dashboard":
      cleanupViewAtual = renderDashboardView(mainContainer);
      break;
    case "/cambio":
      cleanupViewAtual = renderCambioView(mainContainer, subRota);
      break;
    case "/remessas":
      renderRemessasView(mainContainer, subRota);
      break;
    case "/cartoes":
      renderizarCartoes(mainContainer);
      break;
    case "/documentos":
      renderDocumentosView(mainContainer);
      break;
    case "/perfil":
      renderPerfilView(mainContainer, () => navegarPara("/entrar"));
      break;
    default:
      mainContainer.innerHTML = renderizar404();
      break;
  }
}

// Eventos Globais de Ciclo de Vida
window.addEventListener("hashchange", () => renderApp());
window.addEventListener("online", () => renderApp());
window.addEventListener("offline", () => renderApp());
authState.escutar(() => renderApp());

// Inicialização
authState.inicializar();
