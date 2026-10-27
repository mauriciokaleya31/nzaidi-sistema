import { icone } from "@nzaidi/design-system";
import { authState } from "../state/auth.state.js";
import { itensVisiveis, type ItemNavegacao } from "../ui/navegacao.js";

/** Abre ou fecha o menu lateral (gaveta no telemóvel, painel sobreposto no tablet). */
export function alternarMenuLateral(abrir?: boolean): void {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  const aberto = sidebar.classList.toggle("open", abrir);
  document.getElementById("sidebar-fundo")?.classList.toggle("visivel", aberto);
  document.documentElement.classList.toggle("menu-aberto", aberto);
  for (const id of ["btn-menu-lateral", "btn-menu-inferior"]) {
    document.getElementById(id)?.setAttribute("aria-expanded", String(aberto));
  }
  if (aberto) sidebar.querySelector<HTMLElement>(".nav-item.active, .nav-item")?.focus();
}

function ligacao(item: ItemNavegacao, rotaAtual: string): string {
  const activo = rotaAtual === item.rota;
  return `
    <li>
      <a href="${item.rota}" class="nav-item ${activo ? "active" : ""}" id="${item.id}" title="${item.titulo}"${activo ? ' aria-current="page"' : ""}>
        <span class="nav-icon">${icone(item.icone)}</span>
        <span class="nav-label">${item.titulo}</span>
      </a>
    </li>
  `;
}

export function renderizarMenuLateral(container: HTMLElement, rotaAtual: string): void {
  const usuario = authState.getUsuario();
  if (!usuario) {
    container.innerHTML = "";
    return;
  }

  const itens = itensVisiveis();
  const grupos = new Map<string, ItemNavegacao[]>();
  for (const item of itens) {
    grupos.set(item.grupo, [...(grupos.get(item.grupo) ?? []), item]);
  }

  const gruposHtml = Array.from(grupos.entries())
    .map(
      ([grupo, lista]) => `
        <div class="nav-grupo">
          <p class="nav-grupo__titulo">${grupo}</p>
          <ul class="nav-list">${lista.map((i) => ligacao(i, rotaAtual)).join("")}</ul>
        </div>
      `
    )
    .join("");

  // Barra inferior do telemóvel: até 4 destinos principais e o acesso ao menu completo
  const principais = itens.filter((i) => ["#dashboard", "#balcao", "#clientes", "#caixa", "#operacoes", "#taxas"].includes(i.rota)).slice(0, 4);
  const inferiorHtml = principais
    .map((item) => {
      const activo = rotaAtual === item.rota;
      return `
        <a href="${item.rota}" class="nav-inferior__item${activo ? " activo" : ""}"${activo ? ' aria-current="page"' : ""}>
          ${icone(item.icone)}<span>${item.tituloCurto}</span>
        </a>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="sidebar-fundo" id="sidebar-fundo"></div>
    <aside class="sidebar" id="sidebar" aria-label="Navegação principal">
      <div class="sidebar-brand">
        <img class="sidebar-logo" src="/simbolo.png" alt="" width="36" height="36" />
        <div class="brand-meta">
          <div class="brand-title">NZAIDI</div>
          <div class="brand-sub">Backoffice operacional</div>
        </div>
        <button type="button" class="sidebar-fechar" id="btn-fechar-menu" aria-label="Fechar menu">${icone("fechar")}</button>
      </div>

      <nav class="sidebar-nav">${gruposHtml}</nav>

      <div class="sidebar-footer">
        <div class="footer-status">
          <span class="status-dot" aria-hidden="true"></span>
          <span class="status-text">Sessão protegida e auditada</span>
        </div>
        <div class="footer-compliance">Instituição supervisionada pelo BNA</div>
      </div>
    </aside>

    <nav class="nav-inferior" aria-label="Navegação rápida">
      ${inferiorHtml}
      <button type="button" class="nav-inferior__item" id="btn-menu-inferior" aria-controls="sidebar" aria-expanded="false">
        ${icone("menu")}<span>Menu</span>
      </button>
    </nav>
  `;

  container.querySelector("#sidebar-fundo")?.addEventListener("click", () => alternarMenuLateral(false));
  container.querySelector("#btn-fechar-menu")?.addEventListener("click", () => alternarMenuLateral(false));
  container.querySelector("#btn-menu-inferior")?.addEventListener("click", () => alternarMenuLateral());
}
