/**
 * NZAIDI — Layout partilhado do website (cabeçalho, menu e rodapé).
 * Cada página HTML tem <div id="cabecalho"></div> e <div id="rodape"></div>;
 * este módulo preenche-os e marca a página actual. Só apresentação.
 */

interface Ligacao {
  readonly href: string;
  readonly titulo: string;
}

const PAGINAS: readonly Ligacao[] = [
  { href: "/", titulo: "Início" },
  { href: "/sobre.html", titulo: "Sobre Nós" },
  { href: "/servicos.html", titulo: "Serviços" },
  { href: "/cambios.html", titulo: "Câmbios" },
  { href: "/seguranca.html", titulo: "Segurança" },
  { href: "/contactos.html", titulo: "Contactos" },
];

const URL_APP = "https://app.nzaidi.ao";

function paginaActual(): string {
  const caminho = window.location.pathname.replace(/index\.html$/, "");
  return caminho === "" ? "/" : caminho;
}

function ligacoesMenu(actual: string): string {
  return PAGINAS.map(
    (p) =>
      `<a href="${p.href}" class="nav-link${p.href === actual ? " ativo" : ""}"${
        p.href === actual ? ' aria-current="page"' : ""
      }>${p.titulo}</a>`,
  ).join("");
}

function htmlCabecalho(actual: string): string {
  return `
    <a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
    <header class="cabecalho" id="topo">
      <div class="container cabecalho-inner">
        <a href="/" class="marca-link" aria-label="NZAIDI, página inicial">
          <img src="/simbolo.png" alt="" class="marca-simbolo" width="46" height="46" />
          <span class="marca-texto">
            <span class="marca-nome">NZAIDI</span>
            <span class="marca-sub">Casa de Câmbios</span>
          </span>
        </a>
        <nav class="nav-desktop" aria-label="Principal">${ligacoesMenu(actual)}</nav>
        <div class="cabecalho-acoes">
          <a href="/entrar.html" class="btn-entrar">
            <span>Aceder à Conta</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
          </a>
          <button class="btn-menu-mobile" id="btn-menu-mobile" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-mobile">
            <span class="barras" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <nav class="menu-mobile" id="menu-mobile" aria-label="Menu">
        ${ligacoesMenu(actual)}
        <a href="/entrar.html" class="btn-entrar btn-entrar--bloco">Aceder à Conta</a>
      </nav>
    </header>`;
}

function htmlRodape(): string {
  const ano = new Date().getFullYear();
  return `
    <footer class="rodape">
      <div class="container rodape-grid">
        <div class="rodape-col rodape-marca">
          <div class="rodape-logo">
            <img src="/simbolo.png" alt="" width="48" height="48" />
            <span>NZAIDI</span>
          </div>
          <p>NZAIDI – Casa de Câmbios &amp; Transferência, Lda. Casa de câmbios licenciada, sob supervisão do Banco Nacional de Angola.</p>
          <p class="rodape-lema">Confiança · Segurança · Agilidade</p>
        </div>
        <div class="rodape-col">
          <h4>Instituição</h4>
          <ul class="rodape-links">
            <li><a href="/sobre.html">Sobre Nós</a></li>
            <li><a href="/seguranca.html">Segurança e Confiança</a></li>
            <li><a href="/contactos.html">Contactos</a></li>
            <li><a href="/faq.html">Perguntas Frequentes</a></li>
          </ul>
        </div>
        <div class="rodape-col">
          <h4>Serviços</h4>
          <ul class="rodape-links">
            <li><a href="/cambios.html">Câmbio de Divisas</a></li>
            <li><a href="/cambios.html#simulador">Simulador</a></li>
            <li><a href="/servicos.html">Todos os Serviços</a></li>
            <li><a href="/entrar.html">Aceder à Conta</a></li>
          </ul>
        </div>
        <div class="rodape-col">
          <h4>Legal</h4>
          <ul class="rodape-links">
            <li><a href="/termos.html">Termos e Condições</a></li>
            <li><a href="/privacidade.html">Política de Privacidade</a></li>
          </ul>
        </div>
      </div>
      <div class="container rodape-bottom">
        <span>© ${ano} NZAIDI – Casa de Câmbios &amp; Transferência, Lda. Todos os direitos reservados.</span>
        <span>Maianga, Luanda · Angola</span>
      </div>
    </footer>`;
}

/** Revela elementos com a classe .revelar quando entram no ecrã. */
function activarRevelacao(): void {
  const elementos = document.querySelectorAll<HTMLElement>(".revelar");
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (semMovimento || !("IntersectionObserver" in window)) {
    elementos.forEach((el) => el.classList.add("visivel"));
    return;
  }
  const obs = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) {
          e.target.classList.add("visivel");
          obs.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 },
  );
  elementos.forEach((el) => obs.observe(el));
}

/** Inclinação 3D suave ao mover o rato sobre elementos com [data-inclinar]. */
function activarInclinacao(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll<HTMLElement>("[data-inclinar]").forEach((el) => {
    const forca = Number(el.dataset.inclinar) || 10;
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", `${(x * forca).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * forca).toFixed(2)}deg`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.removeProperty("--ry");
      el.style.removeProperty("--rx");
    });
  });
}

export function montarLayout(): void {
  const actual = paginaActual();
  const cab = document.getElementById("cabecalho");
  const rod = document.getElementById("rodape");
  if (cab) cab.outerHTML = htmlCabecalho(actual);
  if (rod) rod.outerHTML = htmlRodape();

  const botao = document.getElementById("btn-menu-mobile");
  const menu = document.getElementById("menu-mobile");
  if (botao && menu) {
    const fechar = () => {
      menu.classList.remove("aberto");
      botao.setAttribute("aria-expanded", "false");
    };
    botao.addEventListener("click", () => {
      const aberto = menu.classList.toggle("aberto");
      botao.setAttribute("aria-expanded", String(aberto));
    });
    menu.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a")) fechar();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") fechar();
    });
  }

  const cabecalho = document.querySelector<HTMLElement>(".cabecalho");
  const aoRolar = () => cabecalho?.classList.toggle("rolado", window.scrollY > 8);
  window.addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  // FAQ (acordeão)
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const btn = item.querySelector<HTMLButtonElement>(".faq-pergunta");
    btn?.addEventListener("click", () => {
      const aberto = item.classList.contains("aberto");
      faqItems.forEach((i) => {
        i.classList.remove("aberto");
        i.querySelector(".faq-pergunta")?.setAttribute("aria-expanded", "false");
      });
      if (!aberto) {
        item.classList.add("aberto");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  activarRevelacao();
  activarInclinacao();
}
