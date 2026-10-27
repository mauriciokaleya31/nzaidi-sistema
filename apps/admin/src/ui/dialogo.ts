/**
 * Diálogo de confirmação para acções críticas e comportamento comum dos modais
 * (tecla Escape, foco no primeiro campo, bloqueio do deslocamento do fundo).
 */
import { icone } from "@nzaidi/design-system";
import { esc } from "./formatar.js";

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  confirmar: string;
  cancelar?: string;
  perigo?: boolean;
}

/** Substitui o `confirm()` do navegador por um diálogo da marca. Resolve `true` se o utilizador confirmar. */
export function confirmar(opcoes: OpcoesConfirmacao): Promise<boolean> {
  return new Promise((resolver) => {
    const anterior = document.activeElement as HTMLElement | null;
    const raiz = document.createElement("div");
    raiz.className = "nz-modal nz-modal--confirmacao";
    raiz.setAttribute("role", "alertdialog");
    raiz.setAttribute("aria-modal", "true");
    raiz.setAttribute("aria-labelledby", "confirmacao-titulo");
    raiz.setAttribute("aria-describedby", "confirmacao-mensagem");
    raiz.innerHTML = `
      <div class="nz-modal__painel confirmacao">
        <div class="nz-modal__corpo confirmacao__corpo">
          <span class="confirmacao__icone${opcoes.perigo ? " confirmacao__icone--perigo" : ""}">${icone(opcoes.perigo ? "alerta" : "info")}</span>
          <div>
            <h2 class="nz-modal__titulo" id="confirmacao-titulo">${esc(opcoes.titulo)}</h2>
            <p class="confirmacao__mensagem" id="confirmacao-mensagem">${esc(opcoes.mensagem)}</p>
          </div>
        </div>
        <div class="nz-modal__rodape">
          <button type="button" class="nz-botao nz-botao--secundario" data-resposta="nao">${esc(opcoes.cancelar ?? "Cancelar")}</button>
          <button type="button" class="nz-botao ${opcoes.perigo ? "nz-botao--perigo" : "nz-botao--primario"}" data-resposta="sim">${esc(opcoes.confirmar)}</button>
        </div>
      </div>
    `;

    function terminar(resposta: boolean): void {
      document.removeEventListener("keydown", teclado, true);
      raiz.remove();
      anterior?.focus?.();
      resolver(resposta);
    }
    function teclado(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.stopPropagation();
        terminar(false);
      }
    }

    raiz.addEventListener("click", (e) => {
      const alvo = (e.target as HTMLElement).closest<HTMLElement>("[data-resposta]");
      if (alvo) terminar(alvo.dataset.resposta === "sim");
      else if (e.target === raiz) terminar(false);
    });
    document.addEventListener("keydown", teclado, true);
    document.body.appendChild(raiz);
    raiz.querySelector<HTMLButtonElement>('[data-resposta="nao"]')?.focus();
  });
}

function modalVisivel(el: Element): boolean {
  return el.classList.contains("nz-modal") && !el.classList.contains("d-none");
}

/** Liga o comportamento comum a todos os modais da aplicação. Chamar uma vez. */
export function instalarComportamentoModais(): void {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const abertos = Array.from(document.querySelectorAll(".nz-modal")).filter(modalVisivel);
    const topo = abertos.at(-1);
    topo?.querySelector<HTMLButtonElement>(".nz-modal__fechar")?.click();
  });

  // Ao abrir um modal, levar o foco para o primeiro campo editável
  const observador = new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      const el = m.target as Element;
      if (m.attributeName === "class" && modalVisivel(el) && m.oldValue?.includes("d-none") && !el.contains(document.activeElement)) {
        const campo = el.querySelector<HTMLElement>(
          ".nz-modal__corpo input:not([type=hidden]):not([disabled]):not([readonly]), .nz-modal__corpo select:not([disabled]), .nz-modal__corpo textarea, .nz-modal__corpo button"
        );
        (campo ?? el.querySelector<HTMLElement>(".nz-modal__fechar"))?.focus();
      }
    }
  });
  observador.observe(document.body, { attributes: true, attributeFilter: ["class"], attributeOldValue: true, subtree: true });
}
