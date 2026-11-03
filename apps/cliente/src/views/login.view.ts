import { authState } from "../auth.state.js";
import { icone } from "../components/icones.js";

export function renderLoginView(container: HTMLElement, onSucesso: () => void): void {
  let abaAtiva: "login" | "registo" | "2fa" = "login";
  let passoRegisto: 1 | 2 = 1;
  let preAuthTokenAtual = "";
  let erroMsg = "";
  let carregando = false;

  // Estado persistente dos campos de registo para não perder dados ao alternar passos
  let dadosRegisto = {
    tipoPessoa: "singular" as "singular" | "colectivo",
    tipoDocumento: "bi" as "bi" | "passaporte" | "cartao_residente" | "nif_empresa",
    nome: "",
    nif: "",
    numeroDocumento: "",
    telefone: "",
    email: "",
    morada: "",
    senha: "",
    senhaConf: ""
  };

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
    let tituloForm = "Iniciar Sessão";
    let subtituloForm = "Introduza as suas credenciais para aceder ao seu portal seguro.";

    if (abaAtiva === "registo") {
      tituloForm = "Criar Conta Digital";
      subtituloForm = passoRegisto === 1 
        ? "Passo 1 de 2: Dados de Identificação e Titularidade."
        : "Passo 2 de 2: Contactos, Morada e Senha de Acesso.";
    } else if (abaAtiva === "2fa") {
      tituloForm = "Segurança da Conta (2FA)";
      subtituloForm = "Validação de identidade em duas etapas para acesso protegido.";
    }

    let conteudoFormulario = "";

    if (abaAtiva === "2fa") {
      conteudoFormulario = `
        <form id="form-2fa" class="auth-form-spacious">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #eaf2fc; color: #08264F; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #08264F; margin-bottom: 6px;">Verificação em Duas Etapas</h3>
            <p style="font-size: 0.85rem; color: #64748b; line-height: 1.4;">Introduza o código de 6 dígitos da sua aplicação de autenticação ou um código de recuperação.</p>
          </div>

          <div class="form-group-spacious">
            <label class="form-label" for="codigo-2fa">Código de Segurança / Recuperação</label>
            <div class="input-with-icon">
              <span class="input-icon-box">${icone("seguranca", 18)}</span>
              <input type="text" id="codigo-2fa" class="form-input-spacious" placeholder="Ex: 123456 ou A1B2C3D4" required autofocus autocomplete="one-time-code" style="font-size: 1.1rem; letter-spacing: 2px; text-align: center; font-weight: 700;" />
            </div>
          </div>

          <button type="submit" class="btn-auth-submit" ${carregando ? "disabled" : ""}>
            <span>${carregando ? "A validar código..." : "Validar e Entrar"}</span>
          </button>

          <div style="text-align: center; margin-top: 14px;">
            <button type="button" id="btn-cancelar-2fa" style="background: transparent; border: 0; color: #64748b; font-size: 0.85rem; cursor: pointer; text-decoration: underline;">Voltar ao início de sessão</button>
          </div>
        </form>
      `;
    } else if (abaAtiva === "login") {
      conteudoFormulario = `
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
      `;
    } else {
      // Registo Estruturado em 2 Etapas Nobres (Zero campos removidos, sem desestruturação da página)
      const indicadorPassos = `
        <div class="auth-wizard-steps" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 10px 14px; background: rgba(6, 26, 58, 0.04); border-radius: 12px; border: 1px solid rgba(6, 26, 58, 0.08);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: ${passoRegisto === 1 ? "var(--marinho)" : "#16A34A"}; color: #fff; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">
              ${passoRegisto === 2 ? "✓" : "1"}
            </span>
            <span style="font-size: 12.5px; font-weight: ${passoRegisto === 1 ? "700" : "500"}; color: ${passoRegisto === 1 ? "var(--marinho)" : "var(--suave)"};">Identificação</span>
          </div>
          <div style="flex: 1; height: 2px; background: ${passoRegisto === 2 ? "var(--marinho)" : "#E2E8F0"}; margin: 0 12px;"></div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: ${passoRegisto === 2 ? "var(--marinho)" : "#CBD5E1"}; color: #fff; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">
              2
            </span>
            <span style="font-size: 12.5px; font-weight: ${passoRegisto === 2 ? "700" : "500"}; color: ${passoRegisto === 2 ? "var(--marinho)" : "var(--suave)"};">Contactos & Senha</span>
          </div>
        </div>
      `;

      if (passoRegisto === 1) {
        conteudoFormulario = `
          ${indicadorPassos}
          <form id="form-registo-p1" class="auth-form-spacious">
            <div class="form-row-spacious" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group-spacious">
                <label class="form-label" for="reg-tipo-pessoa">Tipo de Titular</label>
                <select id="reg-tipo-pessoa" class="form-input-spacious">
                  <option value="singular" ${dadosRegisto.tipoPessoa === "singular" ? "selected" : ""}>Pessoa Singular (Individual)</option>
                  <option value="colectivo" ${dadosRegisto.tipoPessoa === "colectivo" ? "selected" : ""}>Pessoa Colectiva (Empresa)</option>
                </select>
              </div>
              <div class="form-group-spacious">
                <label class="form-label" for="reg-nif">NIF Fiscal</label>
                <input type="text" id="reg-nif" class="form-input-spacious" placeholder="ex.: 5412893710" value="${dadosRegisto.nif}" required />
              </div>
            </div>

            <div class="form-group-spacious">
              <label class="form-label" for="reg-nome">Nome Completo / Razão Social</label>
              <input type="text" id="reg-nome" class="form-input-spacious" placeholder="Conforme documento de identificação" value="${dadosRegisto.nome}" required minlength="3" />
            </div>

            <div class="form-row-spacious" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group-spacious">
                <label class="form-label" for="reg-tipo-doc">Documento Oficial</label>
                <select id="reg-tipo-doc" class="form-input-spacious">
                  <option value="bi" ${dadosRegisto.tipoDocumento === "bi" ? "selected" : ""}>Bilhete de Identidade (BI)</option>
                  <option value="passaporte" ${dadosRegisto.tipoDocumento === "passaporte" ? "selected" : ""}>Passaporte com Visto</option>
                  <option value="cartao_residente" ${dadosRegisto.tipoDocumento === "cartao_residente" ? "selected" : ""}>Cartão de Residente</option>
                  <option value="nif_empresa" ${dadosRegisto.tipoDocumento === "nif_empresa" ? "selected" : ""}>Certidão Comercial / NIF</option>
                </select>
              </div>
              <div class="form-group-spacious">
                <label class="form-label" for="reg-num-doc">Número do Documento</label>
                <input type="text" id="reg-num-doc" class="form-input-spacious" placeholder="ex.: 002938172LA038" value="${dadosRegisto.numeroDocumento}" required minlength="5" />
              </div>
            </div>

            <button type="submit" class="btn-auth-submit" style="margin-top: 14px;">
              <span>Avançar para Contactos e Senha</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" style="margin-left: 8px;">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>
        `;
      } else {
        conteudoFormulario = `
          ${indicadorPassos}
          <form id="form-registo-p2" class="auth-form-spacious">
            <div class="form-row-spacious" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group-spacious">
                <label class="form-label" for="reg-telefone">Telemóvel / Telefone</label>
                <input type="tel" id="reg-telefone" class="form-input-spacious" placeholder="+244 923 000 000" value="${dadosRegisto.telefone}" required />
              </div>
              <div class="form-group-spacious">
                <label class="form-label" for="reg-email">Endereço de E-mail</label>
                <input type="email" id="reg-email" class="form-input-spacious" placeholder="seu.email@exemplo.ao" value="${dadosRegisto.email}" required />
              </div>
            </div>

            <div class="form-group-spacious">
              <label class="form-label" for="reg-morada">Morada Habitual / Domicílio</label>
              <input type="text" id="reg-morada" class="form-input-spacious" placeholder="Rua, Bairro, Município, Província" value="${dadosRegisto.morada}" required minlength="5" />
            </div>

            <div class="form-row-spacious" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group-spacious">
                <label class="form-label" for="reg-senha">Palavra-passe de Acesso</label>
                <input type="password" id="reg-senha" class="form-input-spacious" placeholder="Mínimo 8 caracteres" minlength="8" value="${dadosRegisto.senha}" required autocomplete="new-password" />
              </div>
              <div class="form-group-spacious">
                <label class="form-label" for="reg-senha-conf">Confirmar Palavra-passe</label>
                <input type="password" id="reg-senha-conf" class="form-input-spacious" placeholder="Repita a palavra-passe" minlength="8" value="${dadosRegisto.senhaConf}" required autocomplete="new-password" />
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 14px;">
              <button type="button" id="btn-voltar-p1" class="btn-auth-submit" style="background: transparent; color: var(--marinho); border: 1.5px solid var(--borda); flex: 0.45;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" style="margin-right: 6px;">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Voltar</span>
              </button>
              <button type="submit" class="btn-auth-submit" style="flex: 1;" ${carregando ? "disabled" : ""}>
                <span>${carregando ? "A criar a sua conta..." : "Concluir e Criar Conta"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" style="margin-left: 8px;">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </form>
        `;
      }
    }

    const abasHtml =
      abaAtiva === "2fa"
        ? ""
        : `
      <div class="auth-tabs-modern" role="tablist">
        <button type="button" class="auth-tab-modern ${abaAtiva === "login" ? "ativo" : ""}" id="tab-login" role="tab" aria-selected="${abaAtiva === "login"}">
          ${icone("conta", 16)} <span>Iniciar Sessão</span>
        </button>
        <button type="button" class="auth-tab-modern ${abaAtiva === "registo" ? "ativo" : ""}" id="tab-registo" role="tab" aria-selected="${abaAtiva === "registo"}">
          ${icone("documentos", 16)} <span>Criar Conta Nova</span>
        </button>
      </div>
    `;

    container.innerHTML = `
      <div class="auth-panoramic-wrapper">
        <div class="auth-bg-overlay" aria-hidden="true"></div>

        <div class="auth-split-shell">
          <!-- Coluna Esquerda: Vitrine Institucional Nobre -->
          <aside class="auth-showcase-panel">
            <div class="auth-showcase-top">
              <div class="auth-brand-header">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: #061A3A; border: 1px solid rgba(213, 152, 62, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                  <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="20" fill="#061A3A"/>
                    <path d="M26 74 L50 26 L74 74 Z" fill="none" stroke="#D5983E" stroke-width="8" stroke-linejoin="round"/>
                    <circle cx="50" cy="54" r="8" fill="#D5983E"/>
                  </svg>
                </div>
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
              <span>Luanda, Angola · Suporte Oficial: apoio@nzaidi.ao</span>
            </div>
          </aside>

          <!-- Coluna Direita: Formulário Limpo, Espaçoso e Harmónico -->
          <section class="auth-form-panel">
            <div class="auth-form-header">
              <div>
                <h2 class="auth-form-title">${tituloForm}</h2>
                <p class="auth-form-subtitle">${subtituloForm}</p>
              </div>
            </div>

            ${abasHtml}

            ${renderizarAlertaErro(erroMsg)}

            ${conteudoFormulario}

            <div class="auth-form-footer" style="margin-top: 18px; text-align: center;">
              <span style="font-size: 11.5px; color: var(--suave);">Regulada pelo Banco Nacional de Angola. Os seus dados são tratados com sigilo financeiro estrito.</span>
            </div>
          </section>
        </div>
      </div>
    `;

    // Eventos de Abas
    container.querySelector("#tab-login")?.addEventListener("click", () => {
      abaAtiva = "login";
      erroMsg = "";
      render();
    });

    container.querySelector("#tab-registo")?.addEventListener("click", () => {
      abaAtiva = "registo";
      passoRegisto = 1;
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
        const res = await authState.login(email, senha);
        if (res.requer2fa && res.preAuthToken) {
          abaAtiva = "2fa";
          preAuthTokenAtual = res.preAuthToken;
          carregando = false;
          render();
          return;
        }
        onSucesso();
      } catch (err: any) {
        erroMsg = err.message || "Credenciais inválidas. Verifique o seu email e palavra-passe.";
        carregando = false;
        render();
      }
    });

    // Form 2FA
    const form2fa = container.querySelector("#form-2fa") as HTMLFormElement | null;
    form2fa?.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroMsg = "";
      carregando = true;
      render();

      const codigo = (container.querySelector("#codigo-2fa") as HTMLInputElement).value.trim();

      try {
        await authState.validar2faLogin(preAuthTokenAtual, codigo);
        onSucesso();
      } catch (err: any) {
        erroMsg = err.message || "Código inválido ou expirado. Tente novamente.";
        carregando = false;
        render();
      }
    });

    container.querySelector("#btn-cancelar-2fa")?.addEventListener("click", () => {
      abaAtiva = "login";
      preAuthTokenAtual = "";
      erroMsg = "";
      render();
    });

    // Form Registo - Passo 1
    const formRegistoP1 = container.querySelector("#form-registo-p1") as HTMLFormElement | null;
    formRegistoP1?.addEventListener("submit", (e) => {
      e.preventDefault();
      erroMsg = "";

      dadosRegisto.tipoPessoa = (container.querySelector("#reg-tipo-pessoa") as HTMLSelectElement).value as any;
      dadosRegisto.nif = (container.querySelector("#reg-nif") as HTMLInputElement).value.trim();
      dadosRegisto.nome = (container.querySelector("#reg-nome") as HTMLInputElement).value.trim();
      dadosRegisto.tipoDocumento = (container.querySelector("#reg-tipo-doc") as HTMLSelectElement).value as any;
      dadosRegisto.numeroDocumento = (container.querySelector("#reg-num-doc") as HTMLInputElement).value.trim();

      if (!dadosRegisto.nome || dadosRegisto.nome.length < 3) {
        erroMsg = "Por favor, introduza o seu nome completo com pelo menos 3 caracteres.";
        render();
        return;
      }
      if (!dadosRegisto.nif || dadosRegisto.nif.length < 5) {
        erroMsg = "Por favor, introduza um NIF fiscal válido.";
        render();
        return;
      }
      if (!dadosRegisto.numeroDocumento || dadosRegisto.numeroDocumento.length < 5) {
        erroMsg = "Por favor, introduza um número de documento oficial válido.";
        render();
        return;
      }

      passoRegisto = 2;
      render();
    });

    // Form Registo - Botão Voltar ao Passo 1
    container.querySelector("#btn-voltar-p1")?.addEventListener("click", () => {
      // Salvar o que foi digitado no passo 2
      dadosRegisto.telefone = (container.querySelector("#reg-telefone") as HTMLInputElement)?.value.trim() || dadosRegisto.telefone;
      dadosRegisto.email = (container.querySelector("#reg-email") as HTMLInputElement)?.value.trim() || dadosRegisto.email;
      dadosRegisto.morada = (container.querySelector("#reg-morada") as HTMLInputElement)?.value.trim() || dadosRegisto.morada;
      dadosRegisto.senha = (container.querySelector("#reg-senha") as HTMLInputElement)?.value || dadosRegisto.senha;
      dadosRegisto.senhaConf = (container.querySelector("#reg-senha-conf") as HTMLInputElement)?.value || dadosRegisto.senhaConf;
      
      erroMsg = "";
      passoRegisto = 1;
      render();
    });

    // Form Registo - Passo 2 (Finalização)
    const formRegistoP2 = container.querySelector("#form-registo-p2") as HTMLFormElement | null;
    formRegistoP2?.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroMsg = "";

      dadosRegisto.telefone = (container.querySelector("#reg-telefone") as HTMLInputElement).value.trim();
      dadosRegisto.email = (container.querySelector("#reg-email") as HTMLInputElement).value.trim();
      dadosRegisto.morada = (container.querySelector("#reg-morada") as HTMLInputElement).value.trim();
      dadosRegisto.senha = (container.querySelector("#reg-senha") as HTMLInputElement).value;
      dadosRegisto.senhaConf = (container.querySelector("#reg-senha-conf") as HTMLInputElement).value;

      if (dadosRegisto.senha.length < 8) {
        erroMsg = "A palavra-passe deve conter no mínimo 8 caracteres para garantir a segurança da conta.";
        render();
        return;
      }
      if (dadosRegisto.senha !== dadosRegisto.senhaConf) {
        erroMsg = "A confirmação da palavra-passe não coincide com a palavra-passe introduzida.";
        render();
        return;
      }

      carregando = true;
      render();

      const payload = {
        nome: dadosRegisto.nome,
        tipoPessoa: dadosRegisto.tipoPessoa,
        tipo: dadosRegisto.tipoPessoa,
        nif: dadosRegisto.nif,
        tipoDocumento: dadosRegisto.tipoDocumento,
        numeroDocumento: dadosRegisto.numeroDocumento,
        telefone: dadosRegisto.telefone,
        email: dadosRegisto.email,
        morada: dadosRegisto.morada,
        endereco: dadosRegisto.morada,
        senha: dadosRegisto.senha,
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
