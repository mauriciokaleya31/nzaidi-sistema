import { authState } from "../auth.state.js";
import { api } from "../api.js";

export function renderizarLogin(container: HTMLElement): void {
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: linear-gradient(135deg, #021530 0%, #052d62 100%);">
      <div class="card" style="width: 100%; max-width: 460px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); padding: 36px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <img src="/simbolo.png" alt="NZAIDI" width="60" height="60" style="margin-bottom: 12px; display: inline-block;" />
          <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--nz-azul-900); font-family: var(--font-titles); letter-spacing: 0.5px;">PORTAL DOS PARCEIROS</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Acesso institucional seguro para correspondentes e parceiros</p>
        </div>

        <div id="login-erro" class="alert-box alert-error d-none"></div>
        <div id="login-sucesso" class="alert-box alert-success d-none"></div>

        <form id="form-login">
          <div class="form-group">
            <label for="email">E-mail Corporativo</label>
            <input type="email" id="email" class="form-control" placeholder="nome@parceiro.com" required autocomplete="email" />
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label for="senha" style="margin-bottom: 0;">Palavra-passe</label>
              <a href="javascript:void(0)" id="link-esqueci" style="font-size: 0.8rem; color: var(--nz-azul-600); text-decoration: none; font-weight: 600;">Recuperar acesso?</a>
            </div>
            <input type="password" id="senha" class="form-control" placeholder="••••••••" required autocomplete="current-password" />
          </div>

          <button type="submit" id="btn-entrar" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 12px;">
            Aceder ao Portal
          </button>
        </form>

        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center;">
          <small style="color: var(--text-muted); font-size: 0.75rem;">
            Acesso monitorado e sujeito às normas do Banco Nacional de Angola (BNA).
          </small>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#form-login")!;
  const btnEntrar = container.querySelector<HTMLButtonElement>("#btn-entrar")!;
  const erroBox = container.querySelector<HTMLDivElement>("#login-erro")!;
  const sucessoBox = container.querySelector<HTMLDivElement>("#login-sucesso")!;
  const linkEsqueci = container.querySelector<HTMLAnchorElement>("#link-esqueci")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erroBox.classList.add("d-none");
    sucessoBox.classList.add("d-none");

    const emailInput = container.querySelector<HTMLInputElement>("#email");
    const passInput = container.querySelector<HTMLInputElement>("#senha");

    const emailValor = emailInput ? emailInput.value.trim() : "";
    const credencialSecreta = passInput ? passInput.value : "";

    btnEntrar.setAttribute("disabled", "true");
    btnEntrar.textContent = "A validar credenciais...";

    try {
      await authState.login(emailValor, credencialSecreta);
      window.location.hash = "#dashboard";
    } catch (err: any) {
      erroBox.textContent = err.message || "Credenciais inválidas.";
      erroBox.classList.remove("d-none");
    } finally {
      btnEntrar.removeAttribute("disabled");
      btnEntrar.textContent = "Aceder ao Portal";
    }
  });

  linkEsqueci.addEventListener("click", async () => {
    const emailInput = container.querySelector<HTMLInputElement>("#email");
    const emailValor = emailInput ? emailInput.value.trim() : "";
    if (!emailValor) {
      erroBox.textContent = "Por favor, preencha o seu e-mail corporativo no formulário para solicitar a recuperação.";
      erroBox.classList.remove("d-none");
      return;
    }

    try {
      const msg = await api.recuperarSenha(emailValor);
      sucessoBox.textContent = msg;
      sucessoBox.classList.remove("d-none");
    } catch (err: any) {
      erroBox.textContent = err.message || "Erro ao processar pedido de recuperação.";
      erroBox.classList.remove("d-none");
    }
  });
}
