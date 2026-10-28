/**
 * Módulo de Modais e Notificações In-App NZAIDI
 * Substitui integralmente window.prompt, window.alert e window.confirm do navegador
 */

export interface OpcoesMotivoAcao {
  titulo: string;
  subtitulo?: string;
  labelMotivo?: string;
  placeholder?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
  minimoCaracteres?: number;
  motivosPredefinidos?: string[];
}

export interface OpcoesConfirmacao {
  titulo: string;
  subtitulo?: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
}

export interface OpcoesAlerta {
  titulo: string;
  mensagem: string;
  tipo?: "sucesso" | "erro" | "info" | "aviso";
  textoBotao?: string;
}

/**
 * Abre um popup modal elegante para solicitar um motivo fundamentado (ex: suporte, bloqueio, rejeição)
 */
export function solicitarMotivoAcao(opcoes: OpcoesMotivoAcao): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-overlay custom-dialog-backdrop";
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background-color: rgba(2, 21, 48, 0.65);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      animation: fadeIn 0.18s ease-out;
    `;

    const minChars = opcoes.minimoCaracteres ?? 5;
    const isPerigo = opcoes.perigo ?? false;
    const corBotao = isPerigo ? "btn-danger" : "btn-primary";
    const listaMotivos = opcoes.motivosPredefinidos ?? [
      "Suspeita de fraude ou movimentação financeira atípica (Compliance BNA)",
      "Documentação KYC expirada, ilegível ou pendente de atualização obrigatória",
      "Divergência cadastral ou inconsistência de titularidade (NIF / BI / Passaporte)",
      "Violação dos Termos de Utilização e Política de Prevenção ao Branqueamento de Capitais",
      "Suspensão administrativa preventiva / Revisão de segurança da conta",
      "Pedido formal do titular ou encerramento temporário de acesso",
      "Outro motivo específico (detalhar abaixo)",
    ];

    backdrop.innerHTML = `
      <div class="modal-box" style="max-width: 560px; width: 100%; background: #ffffff; border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(2, 21, 48, 0.4); border: 1px solid rgba(204, 150, 56, 0.25); overflow: hidden; animation: subir 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: ${isPerigo ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 45, 98, 0.1)'}; display: grid; place-items: center; color: ${isPerigo ? '#ef4444' : '#052d62'};">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <circle cx="12" cy="11" r="1"></circle>
                <line x1="12" y1="7" x2="12" y2="7.01"></line>
              </svg>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #031d42; font-family: var(--font-family-title, sans-serif);">${opcoes.titulo}</h3>
              ${opcoes.subtitulo ? `<p style="margin: 2px 0 0; font-size: 0.8rem; color: #64748b;">${opcoes.subtitulo}</p>` : ''}
            </div>
          </div>
          <button type="button" id="btn-dialog-close" style="background: none; border: none; font-size: 1.3rem; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 1;">&times;</button>
        </div>
        
        <form id="form-dialog-motivo" style="padding: 1.5rem;">
          <div class="form-group mb-3">
            <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; color: #1e293b; margin-bottom: 6px;">
              Selecione o motivo da suspensão / bloqueio:
            </label>
            <select id="dialog-select-motivo" class="form-control" style="width: 100%; min-height: 42px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; color: #0f172a; background-color: #f8fafc; font-weight: 500; margin-bottom: 12px;">
              ${listaMotivos.map((m, idx) => `<option value="${m}" ${idx === 0 ? "selected" : ""}>${m}</option>`).join("")}
            </select>

            <label class="form-label" style="display: block; font-size: 0.82rem; font-weight: 600; color: #475569; margin-bottom: 6px;">
              ${opcoes.labelMotivo ?? "Detalhes adicionais ou observações (enviado na notificação ao titular):"}
            </label>
            <textarea id="dialog-input-motivo" class="form-control" rows="3" placeholder="${opcoes.placeholder ?? 'Opcional: acrescente detalhes específicos que serão apresentados ao utilizador...'}" style="width: 100%; min-height: 78px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; outline: none;"></textarea>
            <div style="margin-top: 8px; padding: 8px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 0.78rem; color: #92400e; display: flex; align-items: center; gap: 8px;">
              <span>&#9993;</span>
              <span>O titular receberá um alerta por e-mail e verá este motivo sempre que tentar iniciar sessão.</span>
            </div>
            <div id="dialog-msg-erro" style="display: none; color: #ef4444; font-size: 0.78rem; margin-top: 5px; font-weight: 500;">
              Por favor indique ou selecione um motivo com pelo menos ${minChars} caracteres.
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.25rem;">
            <button type="button" id="btn-dialog-cancelar" class="btn btn-secondary" style="min-height: 38px; padding: 0 1rem; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer;">
              ${opcoes.textoCancelar ?? "Cancelar"}
            </button>
            <button type="submit" id="btn-dialog-confirmar" class="btn ${corBotao}" style="min-height: 38px; padding: 0 1.2rem; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer;">
              ${opcoes.textoConfirmar ?? "Confirmar Ação"}
            </button>
          </div>
        </form>
      </div>
    `;

    function fechar(resultado: string | null) {
      backdrop.remove();
      resolve(resultado);
    }

    const form = backdrop.querySelector<HTMLFormElement>("#form-dialog-motivo")!;
    const selectMotivo = backdrop.querySelector<HTMLSelectElement>("#dialog-select-motivo")!;
    const input = backdrop.querySelector<HTMLTextAreaElement>("#dialog-input-motivo")!;
    const erroDiv = backdrop.querySelector<HTMLElement>("#dialog-msg-erro")!;
    const btnClose = backdrop.querySelector<HTMLButtonElement>("#btn-dialog-close")!;
    const btnCancel = backdrop.querySelector<HTMLButtonElement>("#btn-dialog-cancelar")!;

    btnClose.addEventListener("click", () => fechar(null));
    btnCancel.addEventListener("click", () => fechar(null));

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) fechar(null);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const selecionado = selectMotivo.value;
      const detalheExtra = input.value.trim();
      const ehOutro = selecionado.startsWith("Outro motivo");
      const valorFinal = ehOutro
        ? detalheExtra
        : detalheExtra
        ? `${selecionado} — ${detalheExtra}`
        : selecionado;

      if (valorFinal.length < minChars) {
        erroDiv.style.display = "block";
        input.focus();
        return;
      }
      fechar(valorFinal);
    });

    document.body.appendChild(backdrop);
    setTimeout(() => selectMotivo.focus(), 80);
  });
}

/**
 * Modal de confirmação seguro in-app (substitui window.confirm)
 */
export function confirmarModal(opcoes: OpcoesConfirmacao): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-overlay custom-dialog-backdrop";
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background-color: rgba(2, 21, 48, 0.65);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      animation: fadeIn 0.18s ease-out;
    `;

    const isPerigo = opcoes.perigo ?? false;
    const corBotao = isPerigo ? "btn-danger" : "btn-primary";

    backdrop.innerHTML = `
      <div class="modal-box" style="max-width: 460px; width: 100%; background: #ffffff; border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(2, 21, 48, 0.4); border: 1px solid rgba(204, 150, 56, 0.25); overflow: hidden; animation: subir 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding: 1.5rem;">
          <div style="display: flex; gap: 14px; align-items: flex-start;">
            <div style="width: 42px; height: 42px; border-radius: 10px; background: ${isPerigo ? '#fee2e2' : '#e0e7ff'}; display: grid; place-items: center; color: ${isPerigo ? '#ef4444' : '#052d62'}; flex-shrink: 0;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <h3 style="margin: 0 0 4px; font-size: 1.05rem; font-weight: 700; color: #031d42; font-family: var(--font-family-title, sans-serif);">${opcoes.titulo}</h3>
              ${opcoes.subtitulo ? `<p style="margin: 0 0 6px; font-size: 0.8rem; color: #64748b; font-weight: 600;">${opcoes.subtitulo}</p>` : ''}
              <p style="margin: 0; font-size: 0.88rem; color: #475569; line-height: 1.5;">${opcoes.mensagem}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f1f5f9;">
            <button type="button" id="btn-confirm-cancelar" class="btn btn-secondary" style="min-height: 38px; padding: 0 1rem; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer;">
              ${opcoes.textoCancelar ?? "Cancelar"}
            </button>
            <button type="button" id="btn-confirm-ok" class="btn ${corBotao}" style="min-height: 38px; padding: 0 1.2rem; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer;">
              ${opcoes.textoConfirmar ?? "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    `;

    function fechar(resp: boolean) {
      backdrop.remove();
      resolve(resp);
    }

    backdrop.querySelector("#btn-confirm-cancelar")!.addEventListener("click", () => fechar(false));
    backdrop.querySelector("#btn-confirm-ok")!.addEventListener("click", () => fechar(true));
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) fechar(false);
    });

    document.body.appendChild(backdrop);
  });
}

/**
 * Toast de notificação moderno (substitui window.alert para mensagens operacionais)
 */
export function mostrarToast(mensagem: string, tipo: "sucesso" | "erro" | "info" | "aviso" = "sucesso", duracaoMs = 4000): void {
  let container = document.getElementById("toast-container-global");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container-global";
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `app-toast toast-${tipo}`;
  toast.style.cssText = `
    min-width: 300px;
    max-width: 440px;
    background: #ffffff;
    border-radius: 10px;
    padding: 12px 16px;
    box-shadow: 0 10px 25px -5px rgba(2, 21, 48, 0.25), 0 0 0 1px ${tipo === 'sucesso' ? '#86efac' : tipo === 'erro' ? '#fca5a5' : '#93c5fd'};
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: auto;
    animation: toastEntrar 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    transition: opacity 0.2s, transform 0.2s;
  `;

  const corIcone = tipo === "sucesso" ? "#10b981" : tipo === "erro" ? "#ef4444" : "#0284c7";
  const iconeSvg = tipo === "sucesso" 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="${corIcone}" stroke-width="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : tipo === "erro"
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="${corIcone}" stroke-width="2.5" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="${corIcone}" stroke-width="2.5" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `
    <div style="flex-shrink: 0; display: grid; place-items: center;">${iconeSvg}</div>
    <div style="flex-grow: 1; font-size: 0.88rem; color: #1e293b; font-weight: 500; line-height: 1.4;">${mensagem}</div>
    <button type="button" style="background: none; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
  `;

  const btnFechar = toast.querySelector("button")!;
  function remover() {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(10px)";
    setTimeout(() => toast.remove(), 200);
  }

  btnFechar.addEventListener("click", remover);
  setTimeout(remover, duracaoMs);

  container.appendChild(toast);
}
