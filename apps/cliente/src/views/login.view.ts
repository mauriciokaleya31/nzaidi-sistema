import { authState } from "../auth.state.js";
import { icone } from "../components/icones.js";

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
    return `<div class="alert-box alert-error" style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; background: rgba(180, 35, 24, 0.1); border: 1px solid rgba(180, 35, 24, 0.3); color: var(--vermelho); margin-bottom: 20px;">
      ${icone("erro", 18)} <span>${msg}</span>
    </div>`;
  }

  function render() {
    container.innerHTML = `
      <div class="auth-panoramic-wrapper">
        <div class="auth-bg-overlay" aria-hidden="true"></div>

        <div class="auth-split-shell ${abaAtiva === "registo" ? "modo-registo-amplo" : ""}">
          <!-- Coluna Esquerda: Vitrine Institucional Nobre -->
          <aside class="auth-showcase-panel">
            <div class="auth-showcase-top">
              <div class="auth-brand-header">
                <img src="/logotipo.png" alt="NZAIDI" class="auth-brand-logo" />
                <div>
                  <div class="auth-brand-title">NZAIDI</div>
                  <div class="auth-brand-subtitle">Casa de Câmbios & Transferência, Lda.</div>
                </div>
              </div>

              <div class="selo-bna-auth">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Licenciada e Supervisionada pelo BNA</span>
              </div>

              <h1 class="auth-hero-title">
                Portal do Cliente
              </h1>
              <p class="auth-hero-subtitle">
                Aceda com toda a segurança para realizar operações cambiais a cotações em tempo real, enviar remessas ao exterior e consultar a sua conta.
              </p>

              <div class="auth-features-list">
                <div class="auth-feature-item">
                  <div class="auth-feat-icon">${icone("cambio", 18)}</div>
                  <div>
                    <strong>Câmbio com Taxa Garantida</strong>
                    <span>Cotação oficial de compra e venda de Dólares e Euros.</span>
                  </div>
                </div>

                <div class="auth-feature-item">
                  <div class="auth-feat-icon">${icone("remessas", 18)}</div>
                  <div>
                    <strong>Remessas Internacionais</strong>
                    <span>Transferências seguras para apoio familiar e despesas médicas.</span>
                  </div>
                </div>

                <div class="auth-feature-item">
                  <div class="auth-feat-icon">${icone("seguranca", 18)}</div>
                  <div>
                    <strong>Conformidade e Sigilo Bancário</strong>
                    <span>Proteção rigorosa de dados pessoais e borderôs oficiais.</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="auth-showcase-footer">
              <span>Luanda, Angola · Suporte: apoio@nzaidi.ao</span>
            </div>
          </aside>

          <!-- Coluna Direita: Formulário Limpo, Espaçoso e Responsivo -->
          <section class="auth-form-panel">
            <div class="auth-form-header">
              <div>
                <h2 class="auth-form-title">${abaAtiva === "login" ? "Iniciar Sessão" : "Criar Conta Digital"}</h2>
                <p class="auth-form-subtitle">
                  ${
                    abaAtiva === "login"
                      ? "Introduza as suas credenciais para aceder ao seu portal seguro."
                      : "Preencha os seus dados de identificação para abrir a sua conta."
                  }
                </p>
              </div>
            </div>

            <!-- Alternador de Abas Moderno -->
            <div class="auth-tabs-modern" role="tablist">
              <button type="button" class="auth-tab-modern ${abaAtiva === "login" ? "ativo" : ""}" id="tab-login" role="tab" aria-selected="${abaAtiva === "login"}">
                ${icone("conta", 16)} <span>Iniciar Sessão</span>
              </button>
              <button type="button" class="auth-tab-modern ${abaAtiva === "registo" ? "ativo" : ""}" id="tab-registo" role="tab" aria-selected="${abaAtiva === "registo"}">
                ${icone("documentos", 16)} <span>Criar Conta Nova</span>
              </button>
            </div>

            ${renderizarAlertaErro(erroMsg)}

            ${
              abaAtiva === "login"
                ? `
              <form id="form-login" class="auth-form-spacious">
                <div class="form-group-spacious">
                  <label class="form-label" for="login-email">Endereço de E-mail</label>
                  <div class="input-with-icon">
                    <span class="input-icon-box">${icone("conta", 18)}</span>
                    <input type="email" id="login-email" class="form-input-spacious" placeholder="seu.email@exemplo.ao" required autocomplete="email" />
                  </div>
                </div>

                <div class="form-group-spacious">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="form-label" for="login-senha" style="margin-bottom: 0;">Palavra-passe</label>
                  </div>
                  <div class="input-with-icon">
                    <span class="input-icon-box">${icone("seguranca", 18)}</span>
                    <input type="password" id="login-senha" class="form-input-spacious" placeholder="Introduza a sua palavra-passe" required autocomplete="current-password" />
                  </div>
                </div>

                <button type="submit" class="btn-auth-submit" ${carregando ? "disabled" : ""}>
                  <span>${carregando ? "A validar credenciais..." : "Entrar na Minha Conta"}</span>
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
                  <input type="text" id="reg-nome" class="form-input-spacious" placeholder="Conforme documento de identificação" required />
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
                    <label class="form-label" for="reg-nif">NIF</label>
                    <input type="text" id="reg-nif" class="form-input-spacious" placeholder="Número de Identificação Fiscal" required />
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
                    <input type="text" id="reg-num-doc" class="form-input-spacious" placeholder="Número do documento" required />
                  </div>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-telefone">Telefone</label>
                    <input type="tel" id="reg-telefone" class="form-input-spacious" placeholder="+244 923 000 000" required />
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-email">E-mail</label>
                    <input type="email" id="reg-email" class="form-input-spacious" placeholder="seu.email@exemplo.ao" required />
                  </div>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-morada">Morada Habitual</label>
                    <input type="text" id="reg-morada" class="form-input-spacious" placeholder="Rua, Bairro, Município, Província" required />
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-senha">Palavra-passe</label>
                    <input type="password" id="reg-senha" class="form-input-spacious" placeholder="Mínimo de 8 caracteres" minlength="8" required />
                  </div>
                </div>

                <button type="submit" class="btn-auth-submit" ${carregando ? "disabled" : ""}>
                  <span>${carregando ? "A registar a sua conta..." : "Criar Conta e Aceder"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" style="margin-left: 8px;">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </form>
            `
            }

            <div class="auth-form-footer">
              <span>Ao continuar, declara aceitar as políticas de privacidade e termos regulamentares da NZAIDI.</span>
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
