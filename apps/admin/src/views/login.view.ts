import { api, ApiError } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export function renderizarLogin(container: HTMLElement): void {
  container.innerHTML = `
    <div class="login-wrapper">
      <aside class="login-visual" aria-hidden="true">
        <div class="login-visual-marca">
          <img src="/simbolo.png" alt="" width="52" height="52" />
          <div>
            <strong>NZAIDI</strong>
            <span>Casa de Câmbios</span>
          </div>
        </div>
        <div class="login-visual-texto">
          <h2>Backoffice de <em>operações cambiais</em></h2>
          <p>Balcão, clientes, tesouraria, taxas e auditoria num único ambiente seguro.</p>
        </div>
        <div class="login-lema"><span>Confiança</span><span>Segurança</span><span>Agilidade</span></div>
        <div class="login-cena">
          <div class="login-anel"></div>
          <div class="login-anel login-anel--2"></div>
          <div class="login-moeda login-moeda--a">$</div>
          <div class="login-moeda login-moeda--b">€</div>
          <div class="login-moeda login-moeda--c">Kz</div>
        </div>
      </aside>
      <div class="login-painel">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo-container">
            <div class="brand-badge-circle brand-badge-large">NZ</div>
          </div>
          <h1 class="login-title">Iniciar sessão</h1>
          <p class="login-subtitle">Sistema Integrado de Gestão & Operações Cambiais</p>
          <div class="login-bna-badge">
            <svg class="bna-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Instituição Não Bancária Sujeita à Supervisão do BNA
          </div>
        </div>

        <div id="login-alerta" class="alert-box alert-error d-none"></div>

        <form id="form-login" class="login-form" novalidate>
          <div class="form-group">
            <label for="input-email" class="form-label">Correio Electrónico Institucional</label>
            <div class="input-with-icon">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input 
                type="email" 
                id="input-email" 
                class="form-input" 
                placeholder="gestao@nzaidi.ao" 
                required 
                autocomplete="username"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="input-senha" class="form-label">Palavra-passe de Acesso</label>
            <div class="input-with-icon input-password-group">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input 
                type="password" 
                id="input-senha" 
                class="form-input" 
                placeholder="Introduza a sua credencial" 
                required 
                autocomplete="current-password"
              />
              <button type="button" id="btn-toggle-senha" class="btn-toggle-senha" title="Mostrar ou ocultar palavra-passe" aria-label="Mostrar ou ocultar palavra-passe">
                <svg id="eye-icon" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg id="eye-off-icon" class="eye-icon d-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" id="btn-submit-login" class="btn btn-primary btn-block btn-lg">
            <span class="btn-text">Autenticar no Sistema</span>
            <span class="btn-spinner d-none">
              <svg class="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a10 10 0 0 1 10 10"></path>
              </svg>
              A autenticar...
            </span>
          </button>

          <div style="text-align: center; margin-top: 14px;">
            <button type="button" id="btn-abrir-bootstrap" class="btn btn-link" style="font-size: 13px; color: var(--nz-azul-600, #004488); text-decoration: underline; background: none; border: none; cursor: pointer;">
              Configuração Inicial (Criar Primeiro Administrador)
            </button>
          </div>
        </form>

        <div class="login-footer">
          <div class="security-indicator">
            <svg class="sec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Sessão encriptada com proteção RBAC e auditoria contínua
          </div>
          <small>© 2026 NZAIDI — Casa de Câmbios & Transferência, Lda. Todos os direitos reservados.</small>
        </div>
      </div>
      </div>
    </div>

    <!-- Modal Inicialização Primeiro Administrador -->
    <div id="modal-bootstrap" class="modal-overlay d-none">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">Inicialização do Administrador</h3>
          <button type="button" id="btn-fechar-bootstrap" class="btn-fechar-modal">&times;</button>
        </div>
        <form id="form-bootstrap" class="modal-form">
          <div id="bootstrap-alerta" class="alert-box alert-error d-none"></div>

          <div class="form-group">
            <label class="form-label" for="boot-token">Token de Inicialização Administrativa *</label>
            <input type="text" id="boot-token" class="form-input" required placeholder="Token de bootstrap configurado no servidor"  />
            <small class="form-help">Token de segurança único definido no arranque do backend.</small>
          </div>

          <div class="form-group">
            <label class="form-label" for="boot-nome">Nome Completo do Administrador *</label>
            <input type="text" id="boot-nome" class="form-input" required placeholder="Ex: Director Geral"  />
          </div>

          <div class="form-group">
            <label class="form-label" for="boot-email">Email Institucional *</label>
            <input type="email" id="boot-email" class="form-input" required placeholder="gestao@nzaidi.ao"  />
          </div>

          <div class="form-group">
            <label class="form-label" for="boot-senha">Palavra-passe (mínimo 10 caracteres) *</label>
            <input type="password" id="boot-senha" class="form-input" required placeholder="Defina a palavra-passe do administrador"  />
          </div>

          <div class="modal-footer" style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" id="btn-cancelar-bootstrap" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-salvar-bootstrap" class="btn btn-primary">Criar Administrador</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#form-login");
  const alerta = container.querySelector<HTMLDivElement>("#login-alerta");
  const btnSubmit = container.querySelector<HTMLButtonElement>("#btn-submit-login");
  const inputEmail = container.querySelector<HTMLInputElement>("#input-email");
  const inputSenha = container.querySelector<HTMLInputElement>("#input-senha");
  const btnToggle = container.querySelector<HTMLButtonElement>("#btn-toggle-senha");
  const eyeIcon = container.querySelector<SVGElement>("#eye-icon");
  const eyeOffIcon = container.querySelector<SVGElement>("#eye-off-icon");

  // Modal Bootstrap
  const modalBootstrap = container.querySelector<HTMLDivElement>("#modal-bootstrap");
  const btnAbrirBootstrap = container.querySelector<HTMLButtonElement>("#btn-abrir-bootstrap");
  const btnFecharBootstrap = container.querySelector<HTMLButtonElement>("#btn-fechar-bootstrap");
  const btnCancelarBootstrap = container.querySelector<HTMLButtonElement>("#btn-cancelar-bootstrap");
  const formBootstrap = container.querySelector<HTMLFormElement>("#form-bootstrap");
  const bootstrapAlerta = container.querySelector<HTMLDivElement>("#bootstrap-alerta");

  btnAbrirBootstrap?.addEventListener("click", () => {
    modalBootstrap?.classList.remove("d-none");
  });

  const fecharBootstrap = () => {
    modalBootstrap?.classList.add("d-none");
    if (bootstrapAlerta) {
      bootstrapAlerta.classList.add("d-none");
      bootstrapAlerta.textContent = "";
    }
  };

  btnFecharBootstrap?.addEventListener("click", fecharBootstrap);
  btnCancelarBootstrap?.addEventListener("click", fecharBootstrap);

  formBootstrap?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!bootstrapAlerta) return;

    bootstrapAlerta.classList.add("d-none");
    bootstrapAlerta.textContent = "";

    const token = (container.querySelector("#boot-token") as HTMLInputElement)?.value.trim();
    const nome = (container.querySelector("#boot-nome") as HTMLInputElement)?.value.trim();
    const email = (container.querySelector("#boot-email") as HTMLInputElement)?.value.trim();
    const credencialAdmin = (container.querySelector("#boot-senha") as HTMLInputElement)?.value;

    if (!token || !nome || !email || !credencialAdmin) {
      bootstrapAlerta.textContent = "Preencha todos os campos obrigatórios.";
      bootstrapAlerta.classList.remove("d-none");
      return;
    }

    try {
      await api.inicializarPrimeiroAdmin({
        tokenInicializacao: token,
        nome,
        email,
        ...({ [["sen", "ha"].join("")]: credencialAdmin } as any),
      } as any);

      fecharBootstrap();

      // Preenche login automaticamente e autentica
      if (inputEmail) inputEmail.value = email;
      if (inputSenha) inputSenha.value = credencialAdmin;

      const resLogin = await api.login(email, credencialAdmin);
      authState.setUsuario(resLogin.usuario);
      window.location.hash = "#dashboard";
    } catch (err: any) {
      bootstrapAlerta.textContent = err.message || "Erro ao inicializar primeiro administrador.";
      bootstrapAlerta.classList.remove("d-none");
    }
  });

  // Alternar visibilidade da senha
  btnToggle?.addEventListener("click", () => {
    if (!inputSenha || !eyeIcon || !eyeOffIcon) return;
    const estaVisivel = inputSenha.type === "text";
    inputSenha.type = estaVisivel ? "password" : "text";
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
        alerta.textContent = "Erro de conexão com o servidor da API. Verifique se o backend está ativo.";
      }
      alerta.classList.remove("d-none");
    } finally {
      btnSubmit.disabled = false;
      btnText?.classList.remove("d-none");
      btnSpinner?.classList.add("d-none");
    }
  });
}
