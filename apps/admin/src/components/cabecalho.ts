import { icone } from "@nzaidi/design-system";
import { authState } from "../state/auth.state.js";
import { alternarMenuLateral } from "./menu-lateral.js";
import { itemDaRota, itensVisiveis } from "../ui/navegacao.js";
import { esc, iniciais } from "../ui/formatar.js";
import { rotuloFuncao } from "../ui/componentes.js";
import { confirmar } from "../ui/dialogo.js";

// Ouvintes globais da instância actual do cabeçalho (substituídos a cada renderização)
let ouvintesGlobais: AbortController | null = null;

export function renderizarCabecalho(container: HTMLElement, rotaAtual = window.location.hash || "#dashboard"): void {
  const usuario = authState.getUsuario();
  if (!usuario) {
    container.innerHTML = "";
    return;
  }

  ouvintesGlobais?.abort();
  ouvintesGlobais = new AbortController();
  const { signal } = ouvintesGlobais;

  const pagina = itemDaRota(rotaAtual);
  const ehMac = /Mac|iPhone|iPad/.test(navigator.platform);

  container.innerHTML = `
    <header class="app-header">
      <button id="btn-menu-lateral" class="btn-menu-lateral" type="button" aria-label="Abrir menu" aria-controls="sidebar" aria-expanded="false">
        ${icone("menu")}
      </button>

      <div class="header-branding">
        <img class="header-simbolo" src="/simbolo.png" alt="" width="28" height="28" />
        <nav class="header-trilho" aria-label="Localização">
          <span class="header-trilho__grupo">${pagina?.grupo ?? "Backoffice"}</span>
          ${icone("chevron-direita", "nz-icone--sm header-trilho__separador")}
          <span class="header-title" aria-current="page">${pagina?.titulo ?? "Visão geral"}</span>
        </nav>
      </div>

      <button type="button" class="header-pesquisa" id="btn-pesquisa" aria-haspopup="dialog">
        ${icone("pesquisa")}
        <span class="header-pesquisa__texto">Ir para página…</span>
        <kbd class="header-pesquisa__atalho">${ehMac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      <div class="header-user-info">
        <button type="button" class="header-utilizador" id="btn-utilizador" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-utilizador">
          <span class="user-avatar nz-avatar" aria-hidden="true">${esc(iniciais(usuario.nome))}</span>
          <span class="user-meta">
            <span class="user-name">${esc(usuario.nome)}</span>
            <span class="user-role">${esc(rotuloFuncao(usuario.funcao))}</span>
          </span>
          ${icone("chevron-baixo", "nz-icone--sm user-chevron")}
        </button>

        <div class="nz-menu menu-utilizador d-none" id="menu-utilizador" role="menu">
          <div class="menu-utilizador__cabecalho">
            <span class="nz-avatar nz-avatar--lg" aria-hidden="true">${esc(iniciais(usuario.nome))}</span>
            <div>
              <div class="menu-utilizador__nome">${esc(usuario.nome)}</div>
              <div class="menu-utilizador__email">${esc(usuario.email)}</div>
            </div>
          </div>
          <div class="menu-utilizador__perfil">
            <span class="nz-rotulo">Perfil</span>
            <span>${esc(rotuloFuncao(usuario.funcao))}</span>
          </div>
          <details class="menu-utilizador__permissoes">
            <summary>${usuario.permissoes.length} permissões nesta sessão</summary>
            <div class="menu-utilizador__lista">
              ${usuario.permissoes.map((p) => `<code>${esc(p)}</code>`).join("")}
            </div>
          </details>
          <div class="nz-menu__separador"></div>
          <button id="btn-logout" class="nz-menu__item nz-menu__item--perigo btn-logout" type="button" role="menuitem">
            ${icone("sair")}<span class="logout-text">Terminar sessão</span>
          </button>
        </div>
      </div>
    </header>

    <div class="nz-modal pesquisa-paginas d-none" id="modal-pesquisa" role="dialog" aria-modal="true" aria-label="Ir para página">
      <div class="nz-modal__painel pesquisa-paginas__painel">
        <div class="pesquisa-paginas__campo">
          ${icone("pesquisa")}
          <input type="text" id="input-pesquisa-paginas" class="pesquisa-paginas__entrada" placeholder="Procurar páginas e áreas" autocomplete="off" aria-controls="lista-pesquisa-paginas" />
          <button type="button" class="nz-modal__fechar" id="btn-fechar-pesquisa" aria-label="Fechar">${icone("fechar")}</button>
        </div>
        <ul class="pesquisa-paginas__lista" id="lista-pesquisa-paginas" role="listbox"></ul>
      </div>
    </div>
  `;

  // Menu lateral (telemóvel e tablet)
  container.querySelector("#btn-menu-lateral")?.addEventListener("click", () => alternarMenuLateral());

  // Menu do utilizador
  const btnUtilizador = container.querySelector<HTMLButtonElement>("#btn-utilizador");
  const menuUtilizador = container.querySelector<HTMLDivElement>("#menu-utilizador");
  function fecharMenuUtilizador(): void {
    menuUtilizador?.classList.add("d-none");
    btnUtilizador?.setAttribute("aria-expanded", "false");
  }
  btnUtilizador?.addEventListener("click", (e) => {
    e.stopPropagation();
    const abrir = menuUtilizador?.classList.contains("d-none") ?? false;
    menuUtilizador?.classList.toggle("d-none", !abrir);
    btnUtilizador.setAttribute("aria-expanded", String(abrir));
  });
  menuUtilizador?.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", fecharMenuUtilizador, { signal });
  menuUtilizador?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharMenuUtilizador();
      btnUtilizador?.focus();
    }
  });

  const btnLogout = container.querySelector("#btn-logout");
  btnLogout?.addEventListener("click", async () => {
    fecharMenuUtilizador();
    const confirmado = await confirmar({
      titulo: "Terminar sessão",
      mensagem: "A sessão de trabalho será encerrada neste dispositivo. Operações em curso que não tenham sido confirmadas serão perdidas.",
      confirmar: "Terminar sessão",
    });
    if (confirmado) {
      await authState.fazerLogout();
      window.location.hash = "#login";
    }
  });

  // Pesquisa de páginas (Ctrl/Cmd + K)
  const modalPesquisa = container.querySelector<HTMLDivElement>("#modal-pesquisa");
  const inputPesquisa = container.querySelector<HTMLInputElement>("#input-pesquisa-paginas");
  const listaPesquisa = container.querySelector<HTMLUListElement>("#lista-pesquisa-paginas");
  let seleccionado = 0;

  function normalizar(t: string): string {
    return t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  }

  function resultados() {
    const termo = normalizar(inputPesquisa?.value.trim() ?? "");
    return itensVisiveis().filter((i) => !termo || normalizar(`${i.titulo} ${i.grupo} ${i.descricao}`).includes(termo));
  }

  function desenharResultados(): void {
    if (!listaPesquisa) return;
    const lista = resultados();
    seleccionado = Math.min(seleccionado, Math.max(lista.length - 1, 0));
    listaPesquisa.innerHTML = lista.length
      ? lista
          .map(
            (i, n) => `
            <li role="option" aria-selected="${n === seleccionado}">
              <a href="${i.rota}" class="nz-menu__item pesquisa-paginas__item" aria-selected="${n === seleccionado}">
                <span class="pesquisa-paginas__icone">${icone(i.icone)}</span>
                <span class="pesquisa-paginas__texto">
                  <span class="pesquisa-paginas__titulo">${i.titulo}</span>
                  <span class="pesquisa-paginas__descricao">${i.descricao}</span>
                </span>
                <span class="nz-etiqueta">${i.grupo}</span>
              </a>
            </li>`
          )
          .join("")
      : `<li class="pesquisa-paginas__vazio">Nenhuma página corresponde à pesquisa.</li>`;
  }

  function abrirPesquisa(): void {
    if (!modalPesquisa || !inputPesquisa) return;
    inputPesquisa.value = "";
    seleccionado = 0;
    desenharResultados();
    modalPesquisa.classList.remove("d-none");
    inputPesquisa.focus();
  }
  function fecharPesquisa(): void {
    modalPesquisa?.classList.add("d-none");
  }

  container.querySelector("#btn-pesquisa")?.addEventListener("click", abrirPesquisa);
  container.querySelector("#btn-fechar-pesquisa")?.addEventListener("click", fecharPesquisa);
  modalPesquisa?.addEventListener("click", (e) => {
    if (e.target === modalPesquisa) fecharPesquisa();
  });
  listaPesquisa?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) fecharPesquisa();
  });
  inputPesquisa?.addEventListener("input", () => {
    seleccionado = 0;
    desenharResultados();
  });
  inputPesquisa?.addEventListener("keydown", (e) => {
    const lista = resultados();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const passo = e.key === "ArrowDown" ? 1 : -1;
      seleccionado = (seleccionado + passo + lista.length) % Math.max(lista.length, 1);
      desenharResultados();
    } else if (e.key === "Enter") {
      const destino = lista[seleccionado];
      if (!destino) return;
      e.preventDefault();
      fecharPesquisa();
      window.location.hash = destino.rota;
    }
  });

  document.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        abrirPesquisa();
      }
    },
    { signal }
  );
}
