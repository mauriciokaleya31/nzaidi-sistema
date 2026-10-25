import { authState } from "../state/auth.state.js";

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

  container.innerHTML = `
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
        <div class="user-meta">
          <span class="user-name">${usuario.nome}</span>
          <span class="badge ${badge.classe}">${badge.label}</span>
        </div>
        <span class="user-avatar" aria-hidden="true">${iniciais}</span>

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

  const btnLogout = container.querySelector("#btn-logout");
  btnLogout?.addEventListener("click", async () => {
    if (confirm("Deseja realmente terminar a sua sessão de trabalho?")) {
      await authState.fazerLogout();
      window.location.hash = "#login";
    }
  });
}
