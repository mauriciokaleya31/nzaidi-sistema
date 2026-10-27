import { authState } from "../auth.state.js";

export function renderLoginView(container: HTMLElement, onSucesso: () => void): void {
  let abaAtiva: "login" | "registo" = "login";
  let erroMsg = "";
  let carregando = false;

  function render() {
    container.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span class="brand-logo-badge">NZ</span>
              <span style="font-size: 1.35rem; font-weight: 800; color: var(--nz-azul-900);">NZAIDI</span>
            </div>
            <p style="color: var(--cor-texto-mutado); font-size: 0.85rem;">Portal Digital do Cliente — Câmbios & Transferências</p>
          </div>

          <div class="auth-tabs">
            <button class="auth-tab ${abaAtiva === "login" ? "ativo" : ""}" id="tab-login">Iniciar Sessão</button>
            <button class="auth-tab ${abaAtiva === "registo" ? "ativo" : ""}" id="tab-registo">Criar Conta</button>
          </div>

          ${erroMsg ? `<div class="alert-box alert-error">${erroMsg}</div>` : ""}

          ${
            abaAtiva === "login"
              ? `
            <form id="form-login">
              <div class="form-group">
                <label class="form-label">Endereço de E-mail</label>
                <input type="email" id="login-email" class="form-input" placeholder="seu.email@exemplo.ao" required autocomplete="email">
              </div>
              <div class="form-group">
                <label class="form-label">Palavra-passe</label>
                <input type="password" id="login-senha" class="form-input" placeholder="••••••••" required autocomplete="current-password">
              </div>
              <button type="submit" class="btn btn-primary btn-block" ${carregando ? "disabled" : ""}>
                ${carregando ? "A aceder..." : "Entrar no Portal"}
              </button>
            </form>
          `
              : `
            <form id="form-registo">
              <div class="form-group">
                <label class="form-label">Nome Completo</label>
                <input type="text" id="reg-nome" class="form-input" placeholder="Nome próprio e apelidos" required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tipo de Pessoa</label>
                  <select id="reg-tipo-pessoa" class="form-select">
                    <option value="singular">Pessoa Singular</option>
                    <option value="colectivo">Pessoa Colectiva (Empresa)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">NIF</label>
                  <input type="text" id="reg-nif" class="form-input" placeholder="Ex: 5417000000" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tipo de Documento</label>
                  <select id="reg-tipo-doc" class="form-select">
                    <option value="bi">Bilhete de Identidade (BI)</option>
                    <option value="passaporte">Passaporte</option>
                    <option value="cartao_residente">Cartão de Residente</option>
                    <option value="nif_empresa">Certidão Comercial / NIF</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Número do Documento</label>
                  <input type="text" id="reg-num-doc" class="form-input" placeholder="Número oficial" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Telefone de Contacto</label>
                  <input type="tel" id="reg-telefone" class="form-input" placeholder="+244 9..." required>
                </div>
                <div class="form-group">
                  <label class="form-label">Endereço de E-mail</label>
                  <input type="email" id="reg-email" class="form-input" placeholder="seu.email@exemplo.ao" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Morada de Residência / Sede</label>
                <input type="text" id="reg-morada" class="form-input" placeholder="Rua, Bairro, Município, Província" required>
              </div>

              <div class="form-group">
                <label class="form-label">Palavra-passe (mínimo 8 caracteres)</label>
                <input type="password" id="reg-senha" class="form-input" placeholder="••••••••" minlength="8" required>
              </div>

              <button type="submit" class="btn btn-primary btn-block" ${carregando ? "disabled" : ""}>
                ${carregando ? "A criar conta..." : "Criar Minha Conta"}
              </button>
            </form>
          `
          }

          <div style="margin-top: 1.5rem; text-align: center; font-size: 0.8rem; color: var(--cor-texto-mutado);">
            NZAIDI — Instituição Financeira Não Bancária autorizada pelo BNA.<br>
            Acesso seguro com criptografia ponto a ponto.
          </div>
        </div>
      </div>
    `;

    // Event Listeners
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

    // Submissão Login
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

    // Submissão Registo
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
