import { authState } from "../auth.state.js";

export function renderLoginView(container: HTMLElement, onSucesso: () => void): void {
  let abaAtiva: "login" | "registo" = "login";
  let erroMsg = "";
  let carregando = false;

  function renderizarAlertaErro(msg: string): string {
    if (!msg) return "";
    const ehBloqueio = /SUSPENSA|BLOQUEADA/i.test(msg);
    if (ehBloqueio) {
      return `
        <div class="auth-blocked-banner">
          <div class="auth-blocked-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="24" height="24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="auth-blocked-content">
            <strong>Acesso Restrito — Conta Suspensa / Bloqueada</strong>
            <p>${msg}</p>
            <span>Se já enviou os elementos solicitados, contacte: <strong>compliance@nzaidi.ao</strong></span>
          </div>
        </div>
      `;
    }
    return `<div class="alert-box alert-error">${msg}</div>`;
  }

  function render() {
    container.innerHTML = `
      <div class="auth-panoramic-wrapper">
        <div class="auth-bg-photo" aria-hidden="true"></div>
        <div class="auth-bg-overlay" aria-hidden="true"></div>
        <div class="auth-orb auth-orb-1" aria-hidden="true"></div>
        <div class="auth-orb auth-orb-2" aria-hidden="true"></div>

        <div class="auth-split-shell ${abaAtiva === "registo" ? "modo-registo-amplo" : ""}">
          <!-- Coluna Esquerda: Vitrine Institucional NZAIDI com Animações 3D -->
          <aside class="auth-showcase-panel">
            <div class="auth-showcase-top">
              <div class="auth-brand-pill">
                <span class="auth-brand-dot"></span>
                <span>Plataforma Digital Oficial • Supervisão BNA</span>
              </div>
              <h1 class="auth-hero-title">
                Operações Cambiais, Remessas e <span>Cartões Visa USD</span>
              </h1>
              <p class="auth-hero-subtitle">
                Compre e venda divisas com cotação garantida, envie transferências internacionais auditadas e gira o seu cartão virtual internacional com máxima segurança bancária.
              </p>
            </div>

            <!-- Cartões Flutuantes com Cotações em Tempo Real e Cartão Virtual -->
            <div class="auth-floating-stage">
              <div class="auth-float-card auth-float-card-1">
                <div class="auth-float-header">
                  <span class="auth-float-tag">Cotação em Tempo Real</span>
                  <span class="auth-float-live">● VÁLIDA 90s</span>
                </div>
                <div class="auth-float-rates">
                  <div class="auth-float-rate-item">
                    <strong>USD / AOA</strong>
                    <span>925,50 Kz</span>
                  </div>
                  <div class="auth-float-rate-item">
                    <strong>EUR / AOA</strong>
                    <span>1.008,20 Kz</span>
                  </div>
                  <div class="auth-float-rate-item">
                    <strong>ESTADO BNA</strong>
                    <span style="color: #6ee7b7; font-size: 0.82rem;">REGULAR</span>
                  </div>
                </div>
              </div>

              <div class="auth-float-card auth-float-card-2">
                <div class="auth-visa-mini">
                  <div class="auth-visa-chip"></div>
                  <div>
                    <div class="auth-visa-title">NZAIDI Visa Virtual USD</div>
                    <div class="auth-visa-sub">•••• •••• •••• 4829 • Validade 12/28</div>
                  </div>
                  <span class="auth-visa-badge">VISA</span>
                </div>
              </div>
            </div>

            <div class="auth-trust-row">
              <div class="auth-trust-item">
                <strong>100% Digital</strong>
                <span>Liquidação célere</span>
              </div>
              <div class="auth-trust-item">
                <strong>KYC Integrado</strong>
                <span>Conformidade BNA</span>
              </div>
              <div class="auth-trust-item">
                <strong>Encriptação TLS</strong>
                <span>Proteção ponta a ponta</span>
              </div>
            </div>
          </aside>

          <!-- Coluna Direita: Formulário Elegante, Amplo e Espaçoso -->
          <section class="auth-form-panel">
            <div class="auth-form-header">
              <div class="auth-logo-mark">NZ</div>
              <div>
                <h2 class="auth-form-title">${abaAtiva === "login" ? "Iniciar Sessão" : "Criar Conta Digital"}</h2>
                <p class="auth-form-subtitle">
                  ${
                    abaAtiva === "login"
                      ? "Introduza as suas credenciais para aceder à sua conta de cliente."
                      : "Preencha os seus dados oficiais para ter acesso imediato às operações cambiais."
                  }
                </p>
              </div>
            </div>

            <div class="auth-tabs-modern">
              <button type="button" class="auth-tab-modern ${abaAtiva === "login" ? "ativo" : ""}" id="tab-login">
                Iniciar Sessão
              </button>
              <button type="button" class="auth-tab-modern ${abaAtiva === "registo" ? "ativo" : ""}" id="tab-registo">
                Criar Conta Nova
              </button>
            </div>

            ${renderizarAlertaErro(erroMsg)}

            ${
              abaAtiva === "login"
                ? `
              <form id="form-login" class="auth-form-spacious">
                <div class="form-group-spacious">
                  <label class="form-label" for="login-email">Endereço de E-mail</label>
                  <input type="email" id="login-email" class="form-input-spacious" placeholder="seu.email@exemplo.ao" required autocomplete="email">
                </div>

                <div class="form-group-spacious">
                  <label class="form-label" for="login-senha">Palavra-passe</label>
                  <input type="password" id="login-senha" class="form-input-spacious" placeholder="Introduza a sua palavra-passe" required autocomplete="current-password">
                </div>

                <button type="submit" class="btn-auth-submit" ${carregando ? "disabled" : ""}>
                  <span>${carregando ? "A autenticar sessão..." : "Entrar na Minha Conta"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" style="margin-left: 8px;">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </form>
            `
                : `
              <form id="form-registo" class="auth-form-spacious">
                <div class="form-group-spacious">
                  <label class="form-label" for="reg-nome">Nome Completo / Razão Social</label>
                  <input type="text" id="reg-nome" class="form-input-spacious" placeholder="Nome completo conforme documento de identidade" required>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-tipo-pessoa">Tipo de Titular</label>
                    <select id="reg-tipo-pessoa" class="form-input-spacious">
                      <option value="singular">Pessoa Singular (Individual)</option>
                      <option value="colectivo">Pessoa Colectiva (Empresa)</option>
                    </select>
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-nif">NIF (Número de Identificação Fiscal)</label>
                    <input type="text" id="reg-nif" class="form-input-spacious" placeholder="Ex.: 5417000000" required>
                  </div>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-tipo-doc">Documento Oficial</label>
                    <select id="reg-tipo-doc" class="form-input-spacious">
                      <option value="bi">Bilhete de Identidade (BI)</option>
                      <option value="passaporte">Passaporte com Visto</option>
                      <option value="cartao_residente">Cartão de Residente</option>
                      <option value="nif_empresa">Certidão Comercial / NIF</option>
                    </select>
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-num-doc">Número do Documento</label>
                    <input type="text" id="reg-num-doc" class="form-input-spacious" placeholder="Indique o número do documento oficial" required>
                  </div>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-telefone">Telefone / Telemóvel</label>
                    <input type="tel" id="reg-telefone" class="form-input-spacious" placeholder="+244 923 000 000" required>
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-email">Endereço de E-mail</label>
                    <input type="email" id="reg-email" class="form-input-spacious" placeholder="seu.email@exemplo.ao" required>
                  </div>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-morada">Morada de Residência / Sede</label>
                    <input type="text" id="reg-morada" class="form-input-spacious" placeholder="Rua, Bairro, Município, Província" required>
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-senha">Palavra-passe (mín. 8 caracteres)</label>
                    <input type="password" id="reg-senha" class="form-input-spacious" placeholder="Mínimo de 8 caracteres" minlength="8" required>
                  </div>
                </div>

                <button type="submit" class="btn-auth-submit" ${carregando ? "disabled" : ""}>
                  <span>${carregando ? "A criar a sua conta..." : "Criar Conta e Aceder"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" style="margin-left: 8px;">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </form>
            `
            }

            <div class="auth-form-footer">
              <span>NZAIDI — Instituição Licenciada BNA</span>
              <a href="https://nzaidi.ao/" target="_blank" rel="noopener">Voltar ao Website Principal</a>
            </div>
          </section>
        </div>
      </div>
    `;

    // Eventos
    container.querySelector("#tab-login")?.addEventListener("click", () => {
      abaAtiva = "login";
      erroMsg = "";
      render();
    });

    container.querySelector("#tab-registo")?.addEventListener("click", () => {
      abaAtiva = "registo";
      erroMsg = "";
      render();
    });

    // Form Login
    const formLogin = container.querySelector("#form-login") as HTMLFormElement | null;
    formLogin?.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroMsg = "";
      carregando = true;
      render();

      const email = (container.querySelector("#login-email") as HTMLInputElement).value;
      const senha = (container.querySelector("#login-senha") as HTMLInputElement).value;

      try {
        await authState.login(email, senha);
        onSucesso();
      } catch (err: any) {
        erroMsg = err.message || "Credenciais inválidas. Verifique o seu email e palavra-passe.";
        carregando = false;
        render();
      }
    });

    // Form Registo
    const formRegisto = container.querySelector("#form-registo") as HTMLFormElement | null;
    formRegisto?.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroMsg = "";
      carregando = true;
      render();

      const payload = {
        nome: (container.querySelector("#reg-nome") as HTMLInputElement).value,
        tipoPessoa: (container.querySelector("#reg-tipo-pessoa") as HTMLSelectElement).value as any,
        nif: (container.querySelector("#reg-nif") as HTMLInputElement).value,
        tipoDocumento: (container.querySelector("#reg-tipo-doc") as HTMLSelectElement).value as any,
        numeroDocumento: (container.querySelector("#reg-num-doc") as HTMLInputElement).value,
        telefone: (container.querySelector("#reg-telefone") as HTMLInputElement).value,
        email: (container.querySelector("#reg-email") as HTMLInputElement).value,
        morada: (container.querySelector("#reg-morada") as HTMLInputElement).value,
        senha: (container.querySelector("#reg-senha") as HTMLInputElement).value,
      };

      try {
        await authState.registo(payload);
        onSucesso();
      } catch (err: any) {
        erroMsg = err.message || "Erro ao criar conta. Verifique os dados introduzidos.";
        carregando = false;
        render();
      }
    });
  }

  render();
}
