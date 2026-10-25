import { api, ApiError } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export function renderizarLogin(container: HTMLElement): void {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-badge-circle brand-badge-large">NZ</div>
          <h1 class="login-title">NZAIDI CÂMBIOS</h1>
          <p class="login-subtitle">Sistema Integrado de Gestão & Operações Cambiais</p>
          <div class="login-bna-badge">Instituição Não Bancária Sujeita à Supervisão do BNA</div>
        </div>

        <div id="login-alerta" class="alert-box alert-error d-none"></div>

        <form id="form-login" class="login-form">
          <div class="form-group">
            <label for="input-email" class="form-label">Correio Electrónico Institucional</label>
            <input 
              type="email" 
              id="input-email" 
              class="form-input" 
              placeholder="utilizador@nzaidi.ao" 
              required 
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="input-senha" class="form-label">Palavra-passe de Acesso</label>
            <input 
              type="password" 
              id="input-senha" 
              class="form-input" 
              placeholder="••••••••••••" 
              required 
              autocomplete="current-password"
            />
          </div>

          <button type="submit" id="btn-submit-login" class="btn btn-primary btn-block">
            <span class="btn-text">Autenticar no Sistema</span>
            <span class="btn-spinner d-none">A autenticar...</span>
          </button>
        </form>

        <div class="login-profiles-hint">
          <h4 class="hint-title">Perfis Operacionais Disponíveis:</h4>
          <div class="hint-grid">
            <div class="hint-pill"><strong>Gestão:</strong> gestao@nzaidi.ao</div>
            <div class="hint-pill"><strong>Compliance:</strong> compliance@nzaidi.ao</div>
            <div class="hint-pill"><strong>Tesouraria:</strong> tesouraria@nzaidi.ao</div>
            <div class="hint-pill"><strong>Atendente:</strong> atendente@nzaidi.ao</div>
          </div>
        </div>

        <div class="login-footer">
          <small>© 2026 NZAIDI — Casa de Câmbios & Transferência, Lda. Todos os direitos reservados.</small>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#form-login");
  const alerta = container.querySelector<HTMLDivElement>("#login-alerta");
  const btnSubmit = container.querySelector<HTMLButtonElement>("#btn-submit-login");
  const inputEmail = container.querySelector<HTMLInputElement>("#input-email");
  const inputSenha = container.querySelector<HTMLInputElement>("#input-senha");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!alerta || !btnSubmit || !inputEmail || !inputSenha) return;

    alerta.classList.add("d-none");
    alerta.textContent = "";

    const email = inputEmail.value.trim();
    const credencialAcesso = inputSenha.value;

    if (!email || !credencialAcesso) {
      alerta.textContent = "Por favor preencha todos os campos obrigatórios.";
      alerta.classList.remove("d-none");
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
        alerta.textContent = err.message || "Credenciais inválidas. Verifique o email e palavra-passe.";
      } else {
        alerta.textContent = "Erro de conexão com o servidor da API. Verifique a sua ligação.";
      }
      alerta.classList.remove("d-none");
    } finally {
      btnSubmit.disabled = false;
      btnText?.classList.remove("d-none");
      btnSpinner?.classList.add("d-none");
    }
  });
}
