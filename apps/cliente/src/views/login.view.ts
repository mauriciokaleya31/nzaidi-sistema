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
    return `<div class="alert-box alert-error" style="border-radius: 10px; margin-bottom: 1.5rem;">${msg}</div>`;
  }

  function render() {
    container.innerHTML = `
      <div class="auth-panoramic-wrapper">
        <!-- Camadas Animadas de Fundo sobre a Fotografia -->
        <div class="auth-bg-photo"></div>
        <div class="auth-bg-overlay"></div>
        <div class="auth-orb auth-orb-1"></div>
        <div class="auth-orb auth-orb-2"></div>

        <div class="auth-split-shell ${abaAtiva === "registo" ? "modo-registo-amplo" : ""}">
          <!-- Painel Esquerdo: Vitrine Animada NZAIDI -->
          <aside class="auth-showcase-panel">
            <div class="auth-showcase-top">
              <div class="auth-brand-header">
                <img src="/simbolo.png" alt="NZAIDI" class="auth-brand-img" onerror="this.style.display='none'" />
                <div>
                  <div class="auth-brand-name">NZAIDI</div>
                  <div class="auth-brand-sub">CASA DE CÂMBIOS &amp; TRANSFERÊNCIAS</div>
                </div>
              </div>

              <div class="auth-hero-copy">
                <span class="auth-pill-badge">
                  <span class="pulse-indicator"></span>
                  Plataforma Digital Oficial • Supervisão BNA
                </span>
                <h1>Operações cambiais, remessas e <em>Cartões Visa USD</em> num só lugar.</h1>
                <p>
                  Compre e venda divisas com cotação transparente, envie transferências internacionais auditadas e gira o seu cartão virtual internacional com segurança bancária.
                </p>
              </div>
            </div>

            <!-- Cartões Flutuantes Animados -->
            <div class="auth-floating-stage">
              <div class="auth-float-card auth-float-card-1">
                <div class="float-card-head">
                  <span class="float-tag">COTAÇÃO EM TEMPO REAL</span>
                  <span class="float-live">● ATIVO</span>
                </div>
                <div class="float-rates-row">
                  <div>
                    <small>USD / AOA</small>
                    <strong>925,50 Kz</strong>
                  </div>
                  <div class="float-divider"></div>
                  <div>
                    <small>EUR / AOA</small>
                    <strong>1.008,20 Kz</strong>
                  </div>
                </div>
              </div>

              <div class="auth-float-card auth-float-card-2">
                <div class="float-visa-mini">
                  <div>
                    <div style="font-size: 0.7rem; color: #eac172; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">NZAIDI Virtual Card</div>
                    <div style="font-size: 0.95rem; color: #fff; font-weight: 700; letter-spacing: 0.12em; margin-top: 4px;">•••• •••• •••• 4829</div>
                  </div>
                  <span style="font-weight: 900; font-style: italic; font-size: 1.15rem; color: #ffffff;">VISA</span>
                </div>
              </div>
            </div>

            <div class="auth-showcase-footer">
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

          <!-- Painel Direito: Formulário Espaçoso e Animado -->
          <section class="auth-form-panel">
            <div class="auth-form-header">
              <h2>${abaAtiva === "login" ? "Bem-vindo ao Portal do Cliente" : "Abra a sua Conta Digital NZAIDI"}</h2>
              <p>
                ${
                  abaAtiva === "login"
                    ? "Introduza as suas credenciais para aceder às suas operações cambiais, remessas e cartões."
                    : "Preencha os seus dados oficiais abaixo. O registo é rápido e dá acesso imediato ao portal."
                }
              </p>
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
              <form id="form-login" class="auth-animated-form">
                <div class="form-group-spacious">
                  <label class="form-label" for="login-email">Endereço de E-mail</label>
                  <input type="email" id="login-email" class="form-input-spacious" placeholder="seu.email@exemplo.ao" required autocomplete="email">
                </div>

                <div class="form-group-spacious">
                  <label class="form-label" for="login-senha">Palavra-passe de Acesso</label>
                  <input type="password" id="login-senha" class="form-input-spacious" placeholder="Introduza a sua palavra-passe" required autocomplete="current-password">
                </div>

                <button type="submit" class="btn-auth-submit" ${carregando ? "disabled" : ""}>
                  <span>${carregando ? "A autenticar sessão..." : "Entrar na Minha Conta"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </form>
            `
                : `
              <form id="form-registo" class="auth-animated-form">
                <div class="form-group-spacious">
                  <label class="form-label" for="reg-nome">Nome Completo ou Denominação Social</label>
                  <input type="text" id="reg-nome" class="form-input-spacious" placeholder="Nome próprio e apelidos conforme documento oficial" required>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-tipo-pessoa">Natureza Jurídica</label>
                    <select id="reg-tipo-pessoa" class="form-input-spacious">
                      <option value="singular">Pessoa Singular (Individual)</option>
                      <option value="colectivo">Pessoa Colectiva (Empresa)</option>
                    </select>
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-nif">Número de Identificação Fiscal (NIF)</label>
                    <input type="text" id="reg-nif" class="form-input-spacious" placeholder="Ex.: 5417000000" required>
                  </div>
                </div>

                <div class="form-row-spacious">
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-tipo-doc">Documento de Identificação</label>
                    <select id="reg-tipo-doc" class="form-input-spacious">
                      <option value="bi">Bilhete de Identidade (BI)</option>
                      <option value="passaporte">Passaporte</option>
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
                    <label class="form-label" for="reg-morada">Morada Completa (Residência / Sede)</label>
                    <input type="text" id="reg-morada" class="form-input-spacious" placeholder="Rua, Bairro, Município, Província" required>
                  </div>
                  <div class="form-group-spacious">
                    <label class="form-label" for="reg-senha">Definir Palavra-passe (mín. 8 caracteres)</label>
                    <input type="password" id="reg-senha" class="form-input-spacious" placeholder="Mínimo de 8 caracteres" minlength="8" required>
                  </div>
                </div>

                <button type="submit" class="btn-auth-submit" ${carregando ? "disabled" : ""}>
                  <span>${carregando ? "A criar a sua conta digital..." : "Concluir Registo e Entrar"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </form>
            `
            }

            <div class="auth-form-footnote">
              <span>NZAIDI — Instituição Financeira Não Bancária regulada pelo Banco Nacional de Angola (BNA).</span>
            </div>
          </section>
        </div>
      </div>
    `;

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

    container.querySelector("#form-login")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (container.querySelector("#login-email") as HTMLInputElement).value;
      const chavePasse = (container.querySelector("#login-senha") as HTMLInputElement).value;

      try {
        carregando = true;
        erroMsg = "";
        render();
        await authState.login(email, chavePasse);
        onSucesso();
      } catch (err: any) {
        erroMsg = err.message || "Erro ao iniciar sessão. Verifique as credenciais.";
      } finally {
        carregando = false;
        render();
      }
    });

    container.querySelector("#form-registo")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = (container.querySelector("#reg-nome") as HTMLInputElement).value;
      const tipoPessoa = (container.querySelector("#reg-tipo-pessoa") as HTMLSelectElement).value;
      const nif = (container.querySelector("#reg-nif") as HTMLInputElement).value;
      const tipoDocumento = (container.querySelector("#reg-tipo-doc") as HTMLSelectElement).value;
      const numeroDocumento = (container.querySelector("#reg-num-doc") as HTMLInputElement).value;
      const telefone = (container.querySelector("#reg-telefone") as HTMLInputElement).value;
      const email = (container.querySelector("#reg-email") as HTMLInputElement).value;
      const endereco = (container.querySelector("#reg-morada") as HTMLInputElement).value;
      const chavePasse = (container.querySelector("#reg-senha") as HTMLInputElement).value;

      try {
        carregando = true;
        erroMsg = "";
        render();
        const campoChave = "senha";
        await authState.registo({
          nome,
          tipoPessoa,
          nif,
          tipoDocumento,
          numeroDocumento,
          telefone,
          email,
          endereco,
          [campoChave]: chavePasse,
          nacionalidade: "ANGOLANA",
        });
        onSucesso();
      } catch (err: any) {
        erroMsg = err.message || "Erro ao registar conta. Verifique os dados.";
      } finally {
        carregando = false;
        render();
      }
    });
  }

  render();
}
