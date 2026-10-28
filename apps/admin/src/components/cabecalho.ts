import { authState } from "../state/auth.state.js";
import { api } from "../api/cliente.js";
import { confirmarModal } from "./modal-dialogo.js";

function obterEtiquetaFuncao(funcao: string): { label: string; classe: string } {
  switch (funcao) {
    case "gestao":
      return { label: "Gestão & Direção", classe: "badge-gestao" };
    case "compliance":
      return { label: "Compliance & Risco", classe: "badge-compliance" };
    case "tesouraria":
      return { label: "Tesouraria & Caixa", classe: "badge-tesouraria" };
    case "atendente":
    default:
      return { label: "Atendente de Balcão", classe: "badge-atendente" };
  }
}

export function renderizarCabecalho(container: HTMLElement): void {
  const usuario = authState.getUsuario();
  if (!usuario) {
    container.innerHTML = "";
    return;
  }

  const badge = obterEtiquetaFuncao(usuario.funcao);
  const iniciais = usuario.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  const ehImpersonacao = Boolean(usuario.impersonadoPor || usuario.impersonadoNome);
  const adminNome = usuario.impersonadoNome || usuario.impersonadoPor || "Administrador";

  const bannerHtml = ehImpersonacao
    ? `
      <div class="banner-impersonacao" role="alert">
        <div class="banner-impersonacao-conteudo">
          <svg class="banner-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div class="banner-texto">
            <strong>MODO DE SUPORTE ACTIVO:</strong> A operar na conta de <em>${usuario.nome}</em> (Sessão assumida por <strong>${adminNome}</strong>). Todas as acções são auditadas e rastreadas.
          </div>
          <button id="btn-encerrar-impersonacao" class="btn-encerrar-impersonacao" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
            Encerrar Modo de Suporte
          </button>
        </div>
      </div>
    `
    : "";

  container.innerHTML = `
    ${bannerHtml}
    <header class="app-header">
      <button id="btn-menu-lateral" class="btn-menu-lateral" type="button" aria-label="Abrir menu" aria-controls="sidebar" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div class="header-branding">
        <span class="header-logo-text">NZAIDI</span>
        <span class="header-divider">/</span>
        <span class="header-title">Backoffice Operacional</span>
      </div>

      <div class="header-user-info">
        <!-- Botão de Notificações com sino SVG e Badge -->
        <div class="notificacoes-wrapper" style="position: relative;">
          <button id="btn-notificacoes" class="btn-icon-header" type="button" aria-label="Notificações" title="Centro de Notificações">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span id="badge-notificacoes" class="badge-notif-contador" style="display: none;">0</span>
          </button>

          <!-- Dropdown Rápido de Notificações -->
          <div id="dropdown-notificacoes" class="dropdown-notificacoes" style="display: none;">
            <div class="dropdown-notif-header">
              <span class="dropdown-notif-titulo">Notificações</span>
              <button id="btn-marcar-todas-lidas-topo" type="button" class="btn-link-sm">Marcar todas como lidas</button>
            </div>
            <div id="lista-notificacoes-topo" class="dropdown-notif-lista">
              <div class="dropdown-notif-vazio">A carregar notificações...</div>
            </div>
            <div class="dropdown-notif-footer">
              <a href="#notificacoes" class="btn-link-sm">Abrir Centro Completo de Notificações &rarr;</a>
            </div>
          </div>
        </div>

        <a href="#perfil" class="user-meta" style="text-decoration: none; color: inherit;" title="Editar Meu Perfil">
          <span class="user-name">${usuario.nome}</span>
          <span class="badge ${badge.classe}">${badge.label}</span>
        </a>
        <a href="#perfil" class="user-avatar" aria-hidden="true" style="text-decoration: none;" title="Meu Perfil">${iniciais}</a>

        <button id="btn-logout" class="btn-logout" title="Terminar Sessão">
          <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span class="logout-text">Sair</span>
        </button>
      </div>
    </header>
  `;

  // Telemóvel: abrir e fechar o menu lateral
  const btnMenu = container.querySelector<HTMLButtonElement>("#btn-menu-lateral");
  btnMenu?.addEventListener("click", () => {
    const aberto = document.getElementById("sidebar")?.classList.toggle("open") ?? false;
    document.getElementById("sidebar-fundo")?.classList.toggle("visivel", aberto);
    btnMenu.setAttribute("aria-expanded", String(aberto));
  });

  // Botão encerrar impersonação
  const btnEncerrarImp = container.querySelector<HTMLButtonElement>("#btn-encerrar-impersonacao");
  btnEncerrarImp?.addEventListener("click", async () => {
    const confirmou = await confirmarModal({
      titulo: "Encerrar Modo de Suporte",
      mensagem: "Deseja encerrar a sessão de suporte e regressar à sua conta de administrador?",
      textoConfirmar: "Regressar à Minha Conta",
      perigo: false,
    });
    if (confirmou) {
      await authState.encerrarImpersonacao();
    }
  });

  // Botão logout
  const btnLogout = container.querySelector("#btn-logout");
  btnLogout?.addEventListener("click", async () => {
    const confirmou = await confirmarModal({
      titulo: "Terminar Sessão",
      mensagem: "Deseja realmente terminar a sua sessão de trabalho no NZAIDI Backoffice?",
      textoConfirmar: "Terminar Sessão",
      perigo: true,
    });
    if (confirmou) {
      await authState.fazerLogout();
      window.location.hash = "#login";
    }
  });

  // Lógica de notificações
  const btnNotif = container.querySelector<HTMLButtonElement>("#btn-notificacoes");
  const dropdownNotif = container.querySelector<HTMLElement>("#dropdown-notificacoes");
  const badgeNotif = container.querySelector<HTMLElement>("#badge-notificacoes");
  const listaNotif = container.querySelector<HTMLElement>("#lista-notificacoes-topo");

  const carregarNotificacoesTopo = async () => {
    try {
      const res = await api.listarNotificacoes();
      if (badgeNotif) {
        if (res.totalNaoLidas > 0) {
          badgeNotif.textContent = String(res.totalNaoLidas);
          badgeNotif.style.display = "inline-flex";
        } else {
          badgeNotif.style.display = "none";
        }
      }

      if (listaNotif) {
        if (!res.itens || res.itens.length === 0) {
          listaNotif.innerHTML = `<div class="dropdown-notif-vazio">Sem notificações recentes.</div>`;
        } else {
          listaNotif.innerHTML = res.itens.slice(0, 5).map((n: any) => `
            <div class="dropdown-notif-item ${n.lida ? 'lida' : 'nao-lida'}" data-id="${n.id}">
              <div class="dropdown-notif-titulo-item">
                <span class="dot-prioridade prioridade-${n.prioridade}"></span>
                <strong>${n.titulo}</strong>
              </div>
              <p class="dropdown-notif-msg">${n.mensagem}</p>
              <div class="dropdown-notif-data">${new Date(n.criadoEm).toLocaleDateString("pt-AO", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          `).join("");

          listaNotif.querySelectorAll(".dropdown-notif-item").forEach((el) => {
            el.addEventListener("click", async () => {
              const id = el.getAttribute("data-id");
              if (id) {
                await api.marcarNotificacaoLida(id);
                void carregarNotificacoesTopo();
              }
            });
          });
        }
      }
    } catch {
      // Ignora erro se rota indisponível
    }
  };

  btnNotif?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!dropdownNotif) return;
    const visivel = dropdownNotif.style.display === "block";
    dropdownNotif.style.display = visivel ? "none" : "block";
    if (!visivel) {
      void carregarNotificacoesTopo();
    }
  });

  document.addEventListener("click", (e) => {
    if (dropdownNotif && !dropdownNotif.contains(e.target as Node) && e.target !== btnNotif) {
      dropdownNotif.style.display = "none";
    }
  });

  const btnMarcarTodas = container.querySelector("#btn-marcar-todas-lidas-topo");
  btnMarcarTodas?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await api.marcarTodasNotificacoesLidas();
    void carregarNotificacoesTopo();
  });

  void carregarNotificacoesTopo();
}
