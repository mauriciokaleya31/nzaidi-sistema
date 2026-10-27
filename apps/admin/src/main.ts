import "@nzaidi/design-system/tokens.css";
import "@nzaidi/design-system/componentes.css";
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
import { renderizarUsuarios } from "./views/usuarios.view.js";
import { renderizarOperacoes } from "./views/operacoes.view.js";
import { semAcesso } from "./ui/componentes.js";
import { instalarComportamentoModais } from "./ui/dialogo.js";
import { itemDaRota } from "./ui/navegacao.js";

const appRoot = document.getElementById("app");

// O backoffice usa sempre o tema claro (ambiente de trabalho com iluminação de escritório)
document.documentElement.dataset.tema = "claro";

async function renderizarAplicacao(): Promise<void> {
  if (!appRoot) return;

  if (authState.estaCarregando()) {
    appRoot.innerHTML = `
      <div class="app-loading-screen" role="status" aria-live="polite">
        <img class="loading-logo" src="/simbolo.png" alt="" width="56" height="56" />
        <div class="app-loading-screen__marca">NZAIDI</div>
        <span class="nz-carregador" aria-hidden="true"></span>
        <p class="app-loading-screen__texto">A verificar a sessão segura…</p>
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
    document.title = "Iniciar sessão · NZAIDI Backoffice";
    renderizarLogin(appRoot);
    return;
  }

  // Se estiver autenticado e tentar ir para o login, redireciona para o dashboard
  if (rotaAtual === "#login") {
    window.location.hash = "#dashboard";
    return;
  }

  document.title = `${itemDaRota(rotaAtual)?.titulo ?? "Backoffice"} · NZAIDI Backoffice`;
  document.documentElement.classList.remove("menu-aberto");

  // Estrutura do Layout Administrativo Completo
  appRoot.innerHTML = `
    <a class="saltar-conteudo" href="#view-container">Saltar para o conteúdo</a>
    <div class="app-layout">
      <div id="sidebar-container"></div>
      <div class="app-main-wrapper">
        <div id="header-container"></div>
        <main class="app-content" id="view-container" tabindex="-1" data-rota="${rotaAtual.slice(1)}"></main>
      </div>
    </div>
  `;

  // A ligação "saltar para o conteúdo" não pode mudar o hash (o hash é a rota)
  appRoot.querySelector(".saltar-conteudo")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("view-container")?.focus();
  });

  const sidebarContainer = document.getElementById("sidebar-container");
  const headerContainer = document.getElementById("header-container");
  const viewContainer = document.getElementById("view-container");

  if (sidebarContainer) {
    renderizarMenuLateral(sidebarContainer, rotaAtual);
  }

  if (headerContainer) {
    renderizarCabecalho(headerContainer, rotaAtual);
  }

  window.scrollTo({ top: 0 });

  if (viewContainer) {
    switch (rotaAtual) {
      case "#balcao":
        if (authState.temPermissao("operacoes:registar") || authState.temPermissao("registar_operacao_balcao")) {
          await renderizarBalcao(viewContainer);
        } else {
          viewContainer.innerHTML = semAcesso("O seu perfil não está autorizado a registar operações no balcão de câmbios.");
        }
        break;

      case "#operacoes":
        if (authState.temPermissao("operacoes:consultar")) {
          await renderizarOperacoes(viewContainer);
        } else {
          viewContainer.innerHTML = semAcesso("O seu perfil não está autorizado a consultar o diário de operações.");
        }
        break;

      case "#clientes":
        if (authState.temPermissao("clientes:consultar")) {
          await renderizarClientes(viewContainer);
        } else {
          viewContainer.innerHTML = semAcesso("O seu perfil não está autorizado a consultar clientes.");
        }
        break;

      case "#caixa":
        if (authState.temPermissao("caixa:consultar") || authState.temPermissao("caixa:abrir")) {
          await renderizarCaixa(viewContainer);
        } else {
          viewContainer.innerHTML = semAcesso("O seu perfil não está autorizado a aceder ao caixa e à tesouraria.");
        }
        break;

      case "#taxas":
        if (authState.temPermissao("ver_taxas")) {
          await renderizarTaxas(viewContainer);
        } else {
          viewContainer.innerHTML = semAcesso("O seu perfil não está autorizado a consultar as taxas de câmbio.");
        }
        break;

      case "#auditoria":
        if (authState.temPermissao("ver_auditoria")) {
          await renderizarAuditoria(viewContainer);
        } else {
          viewContainer.innerHTML = semAcesso("A pista de auditoria está reservada aos perfis de compliance e gestão.");
        }
        break;

      case "#usuarios":
        if (authState.temPermissao("gerir_usuarios") || authState.temPermissao("usuarios:consultar")) {
          await renderizarUsuarios(viewContainer);
        } else {
          viewContainer.innerHTML = semAcesso("A gestão da equipa e dos acessos está reservada ao perfil de gestão.");
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
  instalarComportamentoModais();

  window.addEventListener("hashchange", () => {
    void renderizarAplicacao();
  });

  authState.inscrever(() => {
    void renderizarAplicacao();
  });

  await authState.carregarSessaoInicial();
}

void iniciar();
