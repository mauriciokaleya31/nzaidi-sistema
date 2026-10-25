import { authState } from "../state/auth.state.js";

interface ItemMenu {
  id: string;
  rota: string;
  titulo: string;
  icone: string;
  permissaoRequerida?: string;
}

const ITENS_MENU: ItemMenu[] = [
  {
    id: "nav-dashboard",
    rota: "#dashboard",
    titulo: "Visão Geral",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    `,
  },
  {
    id: "nav-balcao",
    rota: "#balcao",
    titulo: "Balcão de Câmbios",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    `,
    permissaoRequerida: "operacoes:registar",
  },
  {
    id: "nav-clientes",
    rota: "#clientes",
    titulo: "Clientes & KYC",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    `,
    permissaoRequerida: "clientes:consultar",
  },
  {
    id: "nav-caixa",
    rota: "#caixa",
    titulo: "Tesouraria & Caixa",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    `,
    permissaoRequerida: "caixa:consultar",
  },
  {
    id: "nav-taxas",
    rota: "#taxas",
    titulo: "Taxas de Câmbio",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    `,
    permissaoRequerida: "taxas:consultar",
  },
  {
    id: "nav-auditoria",
    rota: "#auditoria",
    titulo: "Pista de Auditoria",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    `,
    permissaoRequerida: "auditoria:consultar",
  },
  {
    id: "nav-usuarios",
    rota: "#usuarios",
    titulo: "Equipa & Utilizadores",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    `,
    permissaoRequerida: "gerir_usuarios",
  },
];

export function renderizarMenuLateral(container: HTMLElement, rotaAtual: string): void {
  const usuario = authState.getUsuario();
  if (!usuario) {
    container.innerHTML = "";
    return;
  }

  const itensVisiveis = ITENS_MENU.filter((item) => {
    if (!item.permissaoRequerida) return true;
    return authState.temPermissao(item.permissaoRequerida);
  });

  const linksHtml = itensVisiveis
    .map((item) => {
      const estaAtivo = rotaAtual === item.rota;

      return `
        <li>
          <a href="${item.rota}" class="nav-item ${estaAtivo ? "active" : ""}" id="${item.id}">
            <span class="nav-icon">${item.icone}</span>
            <span class="nav-label">${item.titulo}</span>
          </a>
        </li>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="sidebar-fundo" id="sidebar-fundo"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <img class="sidebar-logo" src="/simbolo.png" alt="" width="44" height="44" />
        <div class="brand-meta">
          <div class="brand-title">NZAIDI CÂMBIOS</div>
          <div class="brand-sub">Casa de Câmbios, Lda.</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <ul class="nav-list">
          ${linksHtml}
        </ul>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-status">
          <span class="status-dot"></span>
          <span class="status-text">Ambiente Seguro</span>
        </div>
        <div class="footer-compliance">
          <span>Supervisão BNA</span>
        </div>
      </div>
    </aside>
  `;

  // Telemóvel: fechar o menu ao tocar no fundo escurecido
  container.querySelector("#sidebar-fundo")?.addEventListener("click", () => {
    container.querySelector("#sidebar")?.classList.remove("open");
    container.querySelector("#sidebar-fundo")?.classList.remove("visivel");
  });
}
