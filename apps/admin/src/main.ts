import "./estilo.css";
import { authState } from "./state/auth.state.js";
import { renderizarCabecalho } from "./components/cabecalho.js";
import { renderizarMenuLateral } from "./components/menu-lateral.js";
import { renderizarLogin } from "./views/login.view.js";
import { renderizarDashboard } from "./views/dashboard.view.js";
import { renderizarTaxas } from "./views/taxas.view.js";
import { renderizarAuditoria } from "./views/auditoria.view.js";
import { renderizarClientes } from "./views/clientes.view.js";
import { renderizarKyc } from "./views/kyc.view.js";
import { renderizarCaixa } from "./views/caixa.view.js";
import { renderizarBalcao } from "./views/balcao.view.js";
import { renderizarUsuarios } from "./views/usuarios.view.js";
import { renderizarPerfil } from "./views/perfil.view.js";
import { renderizarIntegracoes } from "./views/integracoes.view.js";
import { renderizarParceiros } from "./views/parceiros.view.js";
import { renderizarOperacional } from "./views/operacional.view.js";
import { renderizarContabilidade } from "./views/contabilidade.view.js";
import { renderizarRelatorios } from "./views/relatorios.view.js";
import { renderizarComunicacao } from "./views/comunicacao.view.js";
import { renderizarConfigComunicacao } from "./views/config-comunicacao.view.js";
import { renderizarNotificacoes } from "./views/notificacoes.view.js";
import { renderizarPagamentosView } from "./views/pagamentos.view.js";

const appRoot = document.getElementById("app");

async function renderizarAplicacao(): Promise<void> {
  if (!appRoot) return;

  if (authState.estaCarregando()) {
    appRoot.innerHTML = `
      <div class="app-loading-screen">
        <img class="loading-logo" src="/simbolo.png" alt="" width="84" height="84" />
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
    switch (rotaAtual.split("?")[0]) {
      case "#contabilidade":
        renderizarContabilidade(viewContainer);
        break;

      case "#relatorios":
        renderizarRelatorios(viewContainer);
        break;

      case "#operacional":
        await renderizarOperacional(viewContainer);
        break;

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

      case "#kyc":
        if (authState.temPermissao("kyc:analisar") || authState.temPermissao("clientes:consultar")) {
          await renderizarKyc(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado à verificação de identidade e KYC.</div>
          `;
        }
        break;

      case "#integracoes":
        if (authState.temPermissao("integracoes:consultar_manual") || authState.temPermissao("integracoes:liquidar_manual")) {
          await renderizarIntegracoes(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado ao módulo de Integrações e Conciliação.</div>
          `;
        }
        break;

      case "#pagamentos":
        if (authState.temPermissao("caixa:consultar") || authState.temPermissao("contabilidade_tesouraria")) {
          renderizarPagamentosView(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado aos Métodos de Pagamento.</div>
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

      case "#parceiros":
        if (authState.temPermissao("usuarios:consultar") || authState.temPermissao("gerir_usuarios")) {
          await renderizarParceiros(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado à Gestão de Parceiros Comerciais.</div>
          `;
        }
        break;

      case "#comunicacao":
        if (authState.temPermissao("comunicacao:consultar") || authState.temPermissao("gerir_usuarios")) {
          await renderizarComunicacao(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado à Gestão de Comunicação.</div>
          `;
        }
        break;

      case "#config-comunicacao":
        if (authState.temPermissao("comunicacao:gerir") || authState.temPermissao("gerir_usuarios")) {
          await renderizarConfigComunicacao(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado às Configurações de Provedores.</div>
          `;
        }
        break;

      case "#notificacoes":
        await renderizarNotificacoes(viewContainer);
        break;

      case "#perfil":
        await renderizarPerfil(viewContainer);
        break;

      case "#taxas":
        if (authState.temPermissao("ver_taxas")) {
          await renderizarTaxas(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado para consulta de taxas.</div>
          `;
        }
        break;

      case "#auditoria":
        if (authState.temPermissao("ver_auditoria")) {
          await renderizarAuditoria(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado para consulta de auditoria.</div>
          `;
        }
        break;

      case "#usuarios":
        if (authState.temPermissao("gerir_usuarios") || authState.temPermissao("usuarios:consultar")) {
          await renderizarUsuarios(viewContainer);
        } else {
          viewContainer.innerHTML = `
            <div class="alert-box alert-error">Acesso não autorizado ao módulo de gestão de equipa e utilizadores.</div>
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
