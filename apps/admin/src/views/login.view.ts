import { icone } from "@nzaidi/design-system";
import { api, ApiError } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export function renderizarLogin(container: HTMLElement): void {
  container.innerHTML = `
    <div class="login-wrapper">
      <aside class="login-visual">
        <div class="login-visual-marca">
          <img src="/simbolo.png" alt="" width="44" height="44" />
          <div>
            <strong>NZAIDI</strong>
            <span>Casa de Câmbios &amp; Transferência</span>
          </div>
        </div>

        <div class="login-visual-texto">
          <p class="login-visual-sobretitulo">Backoffice operacional</p>
          <h2>Operações cambiais com rigor, rastreabilidade e controlo.</h2>
          <ul class="login-garantias">
            <li>${icone("cadeado")}<span><strong>Sessão protegida</strong> Cookie seguro no servidor; nenhuma credencial guardada no navegador.</span></li>
            <li>${icone("auditoria")}<span><strong>Tudo auditado</strong> Cada acção fica registada com autor, hora e origem.</span></li>
            <li>${icone("equipa")}<span><strong>Acesso por perfil</strong> Cada função vê apenas o que lhe compete.</span></li>
          </ul>
        </div>

        <p class="login-visual-rodape">Instituição financeira não bancária sujeita à supervisão do Banco Nacional de Angola.</p>
        <svg class="login-guilloche" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
          ${Array.from({ length: 18 }, (_, i) => `<ellipse cx="300" cy="300" rx="${290 - i * 6}" ry="${120 + i * 9}" transform="rotate(${i * 10} 300 300)"/>`).join("")}
        </svg>
      </aside>

      <div class="login-painel">
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo-container">
              <img src="/simbolo.png" alt="" width="40" height="40" />
              <span>NZAIDI</span>
            </div>
            <h1 class="login-title">Iniciar sessão</h1>
            <p class="login-subtitle">Use as credenciais institucionais atribuídas pela gestão.</p>
          </div>

          <div id="login-alerta" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

          <form id="form-login" class="login-form nz-formulario" novalidate>
            <div class="nz-campo">
              <label for="input-email" class="nz-campo__rotulo">Correio electrónico</label>
              <div class="nz-entrada-grupo">
                ${icone("utilizador")}
                <input
                  type="email"
                  id="input-email"
                  class="nz-entrada"
                  placeholder="nome@nzaidi.ao"
                  required
                  autocomplete="username"
                  inputmode="email"
                  autocapitalize="off"
                  spellcheck="false"
                />
              </div>
            </div>

            <div class="nz-campo">
              <label for="input-senha" class="nz-campo__rotulo">Palavra-passe</label>
              <div class="nz-entrada-grupo input-password-group">
                ${icone("cadeado")}
                <input
                  type="password"
                  id="input-senha"
                  class="nz-entrada"
                  placeholder="Introduza a palavra-passe"
                  required
                  autocomplete="current-password"
                />
                <button type="button" id="btn-toggle-senha" class="nz-entrada-grupo__accao btn-toggle-senha" aria-label="Mostrar palavra-passe" aria-pressed="false">
                  <span id="eye-icon">${icone("olho")}</span>
                  <span id="eye-off-icon" class="d-none">${icone("olho-fechado")}</span>
                </button>
              </div>
            </div>

            <button type="submit" id="btn-submit-login" class="nz-botao nz-botao--primario nz-botao--bloco nz-botao--lg">
              <span class="btn-text">Entrar</span>
              <span class="btn-spinner d-none"><span class="nz-carregador nz-carregador--inverso" aria-hidden="true"></span>A verificar credenciais…</span>
            </button>
          </form>

          <div class="login-footer">
            <div class="security-indicator">
              ${icone("escudo", "nz-icone--sm")}
              Ligação cifrada. Tentativas de acesso são registadas.
            </div>
          </div>
        </div>
        <small class="login-copyright">© 2026 NZAIDI, Casa de Câmbios &amp; Transferência, Lda.</small>
      </div>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#form-login");
  const alerta = container.querySelector<HTMLDivElement>("#login-alerta");
  const btnSubmit = container.querySelector<HTMLButtonElement>("#btn-submit-login");
  const inputEmail = container.querySelector<HTMLInputElement>("#input-email");
  const inputSenha = container.querySelector<HTMLInputElement>("#input-senha");
  const btnToggle = container.querySelector<HTMLButtonElement>("#btn-toggle-senha");
  const eyeIcon = container.querySelector<HTMLElement>("#eye-icon");
  const eyeOffIcon = container.querySelector<HTMLElement>("#eye-off-icon");

  // Alternar visibilidade da senha
  btnToggle?.addEventListener("click", () => {
    if (!inputSenha || !eyeIcon || !eyeOffIcon) return;
    const estaVisivel = inputSenha.type === "text";
    inputSenha.type = estaVisivel ? "password" : "text";
    btnToggle.setAttribute("aria-pressed", String(!estaVisivel));
    btnToggle.setAttribute("aria-label", estaVisivel ? "Mostrar palavra-passe" : "Ocultar palavra-passe");
    if (estaVisivel) {
      eyeIcon.classList.remove("d-none");
      eyeOffIcon.classList.add("d-none");
    } else {
      eyeIcon.classList.add("d-none");
      eyeOffIcon.classList.remove("d-none");
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!alerta || !btnSubmit || !inputEmail || !inputSenha) return;

    alerta.classList.add("d-none");
    alerta.textContent = "";
    inputEmail.removeAttribute("aria-invalid");
    inputSenha.removeAttribute("aria-invalid");

    const email = inputEmail.value.trim();
    const credencialAcesso = inputSenha.value;

    if (!email || !credencialAcesso) {
      alerta.textContent = "Preencha o correio electrónico e a palavra-passe.";
      alerta.classList.remove("d-none");
      if (!email) inputEmail.setAttribute("aria-invalid", "true");
      if (!credencialAcesso) inputSenha.setAttribute("aria-invalid", "true");
      (email ? inputSenha : inputEmail).focus();
      return;
    }

    btnSubmit.disabled = true;
    const btnText = btnSubmit.querySelector(".btn-text");
    const btnSpinner = btnSubmit.querySelector(".btn-spinner");
    btnText?.classList.add("d-none");
    btnSpinner?.classList.remove("d-none");

    try {
      const res = await api.login(email, credencialAcesso);
      authState.setUsuario(res.usuario);
      window.location.hash = "#dashboard";
    } catch (err) {
      if (err instanceof ApiError) {
        alerta.textContent = err.message || "Credenciais inválidas. Verifique o correio electrónico e a palavra-passe.";
      } else {
        alerta.textContent = "Não foi possível contactar o servidor. Verifique a ligação e tente novamente.";
      }
      alerta.classList.remove("d-none");
    } finally {
      btnSubmit.disabled = false;
      btnText?.classList.remove("d-none");
      btnSpinner?.classList.add("d-none");
    }
  });
}
