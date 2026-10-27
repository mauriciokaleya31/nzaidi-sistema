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
    id: "nav-operacional",
    rota: "#operacional",
    titulo: "Fila Operacional",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    `,
  },
  {
    id: "nav-clientes",
    rota: "#clientes",
    titulo: "Gestão de Clientes",
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
    id: "nav-kyc",
    rota: "#kyc",
    titulo: "KYC & Identidade",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 11 14 15 10"></polyline>
      </svg>
    `,
    permissaoRequerida: "kyc:analisar",
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
    id: "nav-contabilidade",
    rota: "#contabilidade",
    titulo: "Contabilidade & Razão",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <line x1="8" y1="10" x2="16" y2="10"></line>
      </svg>
    `,
    permissaoRequerida: "caixa:consultar",
  },
  {
    id: "nav-relatorios",
    rota: "#relatorios",
    titulo: "Relatórios Financeiros",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    `,
    permissaoRequerida: "caixa:consultar",
  },
  {
    id: "nav-parceiros",
    rota: "#parceiros",
    titulo: "Parceiros Comerciais",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    `,
    permissaoRequerida: "usuarios:consultar",
  },
  {
    id: "nav-integracoes",
    rota: "#integracoes",
    titulo: "Integrações & Conciliação",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    `,
    permissaoRequerida: "integracoes:consultar_manual",
  },
  {
    id: "nav-pagamentos",
    rota: "#pagamentos",
    titulo: "Métodos de Pagamento",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
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
    permissaoRequerida: "ver_taxas",
  },
  {
    id: "nav-comunicacao",
    rota: "#comunicacao",
    titulo: "Comunicação & Avisos",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `,
    permissaoRequerida: "comunicacao:consultar",
  },
  {
    id: "nav-config-comunicacao",
    rota: "#config-comunicacao",
    titulo: "Provedores & Serviços",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    `,
    permissaoRequerida: "comunicacao:gerir",
  },
  {
    id: "nav-notificacoes",
    rota: "#notificacoes",
    titulo: "Notificações Internas",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
    `,
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
    permissaoRequerida: "ver_auditoria",
  },
  {
    id: "nav-perfil",
    rota: "#perfil",
    titulo: "Meu Perfil",
    icone: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    `,
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

  const rotaBase = rotaAtual.split("?")[0];

  const linksHtml = itensVisiveis
    .map((item) => {
      const estaAtivo = rotaBase === item.rota;

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
    <div id="sidebar-fundo" class="sidebar-fundo" aria-hidden="true"></div>
    <aside id="sidebar" class="app-sidebar" aria-label="Menu principal">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <img src="/simbolo.png" alt="NZAIDI" class="logo-icon" width="36" height="36" />
          <div class="logo-text">
            <span class="brand-title">NZAIDI</span>
            <span class="brand-subtitle">CÂMBIOS & VALORES</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <ul class="nav-list">
          ${linksHtml}
        </ul>
      </nav>

      <div class="sidebar-footer">
        <div class="app-version">
          <span>Versão 2.5.0-homolog</span>
          <span class="badge-status-online">Sistema Conectado</span>
        </div>
      </div>
    </aside>
  `;

  // Fechar no telemóvel ao clicar no fundo
  const fundo = container.querySelector("#sidebar-fundo");
  fundo?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.remove("open");
    fundo.classList.remove("visivel");
    const btn = document.getElementById("btn-menu-lateral");
    btn?.setAttribute("aria-expanded", "false");
  });
}
