import { authState } from "../auth.state.js";
import { api } from "../api.js";

type AbaParceiroAuth = "login" | "registo";

let abaAtiva: AbaParceiroAuth = "login";
let erroMsg = "";
let motivoSuspensaoDetalhado = "";
let sucessoMsg = "";
let carregando = false;

function escaparHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderizarLogin(container: HTMLElement): void {
  const render = () => {
    container.innerHTML = `
      <div class="auth-panoramic-wrapper">
        <div class="auth-bg-photo auth-bg-photo-parceiro" aria-hidden="true"></div>
        <div class="auth-bg-overlay" aria-hidden="true"></div>
        <div class="auth-orb auth-orb-1" aria-hidden="true"></div>
        <div class="auth-orb auth-orb-2" aria-hidden="true"></div>

        <div class="auth-split-shell ${abaAtiva === "registo" ? "modo-registo-amplo" : ""}">
          <!-- Coluna Esquerda: Vitrine Clean e Profissional -->
          <aside class="auth-showcase-panel">
            <div class="auth-showcase-top">
              <div class="auth-brand-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 2rem;">
                <img src="/simbolo.png" alt="NZAIDI" style="width: 44px; height: 44px; border-radius: 50%; background: #fff; padding: 2px;" onerror="this.style.display='none'" />
                <div>
                  <div style="font-family: var(--fonte-titulos); font-size: 1.3rem; font-weight: 800; letter-spacing: 0.15em; color: #fff;">NZAIDI</div>
                  <div style="font-size: 0.7rem; color: #eac172; letter-spacing: 0.18em; text-transform: uppercase;">Casa de Câmbios</div>
                </div>
              </div>

              <h1 class="auth-hero-title">
                Portal dos Parceiros
              </h1>
              <p class="auth-hero-subtitle">
                Mesa exclusiva de correspondentes para liquidação, distribuição e reconciliação de remessas e pagamentos.
              </p>
            </div>
          </aside>

          <!-- Coluna Direita: Formulário Espaçoso (Login / Criar Conta Parceiro) -->
          <section class="auth-form-panel">
            <div class="auth-form-header">
              
              <div>
                <h2 class="auth-form-title">Portal dos Parceiros</h2>
                <p class="auth-form-subtitle">
                  ${
                    abaAtiva === "login"
                      ? "Aceda à sua mesa de liquidação, ordens atribuídas e conta corrente."
                      : "Registe a sua instituição ou agência correspondente na rede NZAIDI."
                  }
                </p>
              </div>
            </div>

            <div class="auth-tabs-modern" role="tablist">
              <button type="button" class="auth-tab-modern ${abaAtiva === "login" ? "ativo" : ""}" id="tab-parceiro-login">
                Iniciar Sessão
              </button>
              <button type="button" class="auth-tab-modern ${abaAtiva === "registo" ? "ativo" : ""}" id="tab-parceiro-registo">
                Criar Conta Parceiro
              </button>
            </div>

            ${
              motivoSuspensaoDetalhado
                ? `
              <div class="auth-blocked-banner" role="alert">
                <div class="auth-blocked-icon">⚠️</div>
                <div class="auth-blocked-content">
                  <strong>Conta de Parceiro Suspensa ou Bloqueada</strong>
                  <p>${escaparHtml(motivoSuspensaoDetalhado)}</p>
                  <small>Foi enviado um comunicado oficial para o seu e-mail corporativo. Contacte a Mesa de Correspondentes NZAIDI para regularização.</small>
                </div>
              </div>
            `
                : ""
            }

            ${erroMsg && !motivoSuspensaoDetalhado ? `<div class="alert-box alert-error">${escaparHtml(erroMsg)}</div>` : ""}
            ${sucessoMsg ? `<div class="alert-box alert-success">${escaparHtml(sucessoMsg)}</div>` : ""}

            ${abaAtiva === "login" ? renderFormLogin() : renderFormRegistoParceiro()}

            <div class="auth-form-footer">
              <span>© ${new Date().getFullYear()} NZAIDI — Rede de Correspondentes Cambiais</span>
              <a href="/cliente/">Ir para Portal do Cliente →</a>
            </div>
          </section>
        </div>
      </div>
    `;

    bindEventos();
  };

  function renderFormLogin(): string {
    return `
      <form id="form-login-parceiro" class="auth-form-spacious">
        <div class="form-group-spacious">
          <label class="form-label" for="email">E-mail Corporativo</label>
          <input
            type="email"
            id="email"
            class="form-control form-input-spacious"
            placeholder="operacoes@parceiro-institucional.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group-spacious">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="form-label" for="senha" style="margin-bottom: 0;">Palavra-passe</label>
            <a href="javascript:void(0)" id="link-esqueci" style="font-size: 0.82rem; color: var(--nz-azul-600); text-decoration: none; font-weight: 600;">
              Recuperar acesso?
            </a>
          </div>
          <input
            type="password"
            id="senha"
            class="form-control form-input-spacious"
            placeholder="Introduza a sua palavra-passe"
            required
            autocomplete="current-password"
          />
        </div>

        <button type="submit" id="btn-entrar" class="btn btn-primary btn-block btn-auth-submit" ${carregando ? "disabled" : ""}>
          ${carregando ? "A validar credenciais..." : "Entrar no Portal do Parceiro"}
        </button>
      </form>
    `;
  }

  function renderFormRegistoParceiro(): string {
    return `
      <form id="form-registo-parceiro" class="auth-form-spacious">
        <div class="form-row-spacious">
          <div class="form-group-spacious">
            <label class="form-label" for="reg-entidade">Nome da Entidade / Instituição *</label>
            <input
              type="text"
              id="reg-entidade"
              class="form-control form-input-spacious"
              placeholder="Ex.: Atlântico Remessas Europe Lda"
              required
              minlength="2"
            />
          </div>
          <div class="form-group-spacious">
            <label class="form-label" for="reg-codigo">Código Identificador Sugerido</label>
            <input
              type="text"
              id="reg-codigo"
              class="form-control form-input-spacious"
              placeholder="Ex.: PARC-ATL-01 (Opcional)"
              maxlength="30"
            />
          </div>
        </div>

        <div class="form-row-spacious">
          <div class="form-group-spacious">
            <label class="form-label" for="reg-tipo">Tipo de Parceiro Comercial *</label>
            <select id="reg-tipo" class="form-control form-input-spacious" required>
              <option value="correspondente_remessa">Correspondente de Remessa Internacional</option>
              <option value="banco_liquidacao">Banco / Instituição de Liquidação</option>
              <option value="agente_pagamento">Agente Pagador / Balcão Parceiro</option>
              <option value="fornecedor_liquidez">Fornecedor de Liquidez Cambial</option>
            </select>
          </div>
          <div class="form-group-spacious">
            <label class="form-label" for="reg-responsavel">Nome do Responsável Operacional *</label>
            <input
              type="text"
              id="reg-responsavel"
              class="form-control form-input-spacious"
              placeholder="Ex.: Dr. Henrique Vasconcelos"
              required
              minlength="3"
            />
          </div>
        </div>

        <div class="form-group-spacious">
          <label class="form-label">Canais de Liquidação Suportados *</label>
          <div class="canais-checkbox-grid">
            <label class="canal-chip-option">
              <input type="checkbox" name="canal-parceiro" value="transferencia_bancaria" checked />
              <span>Transferência Bancária</span>
            </label>
            <label class="canal-chip-option">
              <input type="checkbox" name="canal-parceiro" value="sepa" checked />
              <span>Rede SEPA (EUR)</span>
            </label>
            <label class="canal-chip-option">
              <input type="checkbox" name="canal-parceiro" value="swift" />
              <span>Rede SWIFT (USD/EUR)</span>
            </label>
            <label class="canal-chip-option">
              <input type="checkbox" name="canal-parceiro" value="wise" />
              <span>Wise / Liquidação Digital</span>
            </label>
            <label class="canal-chip-option">
              <input type="checkbox" name="canal-parceiro" value="numerario" />
              <span>Entrega em Numerário</span>
            </label>
          </div>
        </div>

        <div class="form-group-spacious">
          <label class="form-label" for="reg-email">E-mail Corporativo de Acesso *</label>
          <input
            type="email"
            id="reg-email"
            class="form-control form-input-spacious"
            placeholder="compliance@instituicao.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-row-spacious">
          <div class="form-group-spacious">
            <label class="form-label" for="reg-senha">Palavra-passe (mín. 8 caracteres) *</label>
            <input
              type="password"
              id="reg-senha"
              class="form-control form-input-spacious"
              placeholder="Crie uma palavra-passe forte"
              required
              minlength="8"
              autocomplete="new-password"
            />
          </div>
          <div class="form-group-spacious">
            <label class="form-label" for="reg-confirmar">Confirmar Palavra-passe *</label>
            <input
              type="password"
              id="reg-confirmar"
              class="form-control form-input-spacious"
              placeholder="Repita a palavra-passe"
              required
              minlength="8"
              autocomplete="new-password"
            />
          </div>
        </div>

        <button type="submit" id="btn-registar-parceiro" class="btn btn-primary btn-block btn-auth-submit" ${carregando ? "disabled" : ""}>
          ${carregando ? "A criar conta de parceiro..." : "Criar Conta de Parceiro e Aceder"}
        </button>
      </form>
    `;
  }

  function bindEventos(): void {
    const tabLogin = container.querySelector<HTMLButtonElement>("#tab-parceiro-login");
    const tabRegisto = container.querySelector<HTMLButtonElement>("#tab-parceiro-registo");

    tabLogin?.addEventListener("click", () => {
      abaAtiva = "login";
      erroMsg = "";
      motivoSuspensaoDetalhado = "";
      sucessoMsg = "";
      render();
    });

    tabRegisto?.addEventListener("click", () => {
      abaAtiva = "registo";
      erroMsg = "";
      motivoSuspensaoDetalhado = "";
      sucessoMsg = "";
      render();
    });

    const formLogin = container.querySelector<HTMLFormElement>("#form-login-parceiro");
    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        erroMsg = "";
        motivoSuspensaoDetalhado = "";
        sucessoMsg = "";

        const emailInput = container.querySelector<HTMLInputElement>("#email");
        const passInput = container.querySelector<HTMLInputElement>("#senha");
        const emailValor = emailInput ? emailInput.value.trim() : "";
        const credencialSecreta = passInput ? passInput.value : "";

        carregando = true;
        render();

        try {
          await authState.login(emailValor, credencialSecreta);
          carregando = false;
          window.location.hash = "#dashboard";
        } catch (err: any) {
          carregando = false;
          const msg = err?.message || "Credenciais inválidas.";
          if (
            msg.toLowerCase().includes("suspens") ||
            msg.toLowerCase().includes("bloquead") ||
            msg.toLowerCase().includes("motivo")
          ) {
            motivoSuspensaoDetalhado = msg;
          } else {
            erroMsg = msg;
          }
          render();
        }
      });
    }

    const linkEsqueci = container.querySelector<HTMLAnchorElement>("#link-esqueci");
    if (linkEsqueci) {
      linkEsqueci.addEventListener("click", async () => {
        const emailInput = container.querySelector<HTMLInputElement>("#email");
        const emailValor = emailInput ? emailInput.value.trim() : "";
        if (!emailValor) {
          erroMsg = "Por favor, preencha o seu e-mail corporativo no campo acima para solicitar a recuperação.";
          render();
          return;
        }
        try {
          const msg = await api.recuperarSenha(emailValor);
          sucessoMsg = msg;
          erroMsg = "";
          render();
        } catch (err: any) {
          erroMsg = err?.message || "Erro ao processar pedido de recuperação.";
          render();
        }
      });
    }

    const formRegisto = container.querySelector<HTMLFormElement>("#form-registo-parceiro");
    if (formRegisto) {
      formRegisto.addEventListener("submit", async (e) => {
        e.preventDefault();
        erroMsg = "";
        motivoSuspensaoDetalhado = "";
        sucessoMsg = "";

        const nomeEntidade = (container.querySelector("#reg-entidade") as HTMLInputElement).value.trim();
        const codigoSugerido = (container.querySelector("#reg-codigo") as HTMLInputElement).value.trim();
        const tipo = (container.querySelector("#reg-tipo") as HTMLSelectElement).value;
        const nomeResponsavel = (container.querySelector("#reg-responsavel") as HTMLInputElement).value.trim();
        const emailCorporativo = (container.querySelector("#reg-email") as HTMLInputElement).value.trim();
        const senha = (container.querySelector("#reg-senha") as HTMLInputElement).value;
        const confirmar = (container.querySelector("#reg-confirmar") as HTMLInputElement).value;

        const canaisMarcados = Array.from(
          container.querySelectorAll<HTMLInputElement>('input[name="canal-parceiro"]:checked')
        ).map((el) => el.value);

        if (canaisMarcados.length === 0) {
          erroMsg = "Selecione pelo menos um canal de liquidação suportado.";
          render();
          return;
        }

        if (senha !== confirmar) {
          erroMsg = "As palavras-passe introduzidas não coincidem.";
          render();
          return;
        }

        carregando = true;
        render();

        try {
          await authState.registo({
            nomeEntidade,
            ...(codigoSugerido ? { codigoSugerido } : {}),
            tipo,
            canaisSuportados: canaisMarcados,
            nomeResponsavel,
            emailCorporativo,
            senha,
          });
          carregando = false;
          window.location.hash = "#dashboard";
        } catch (err: any) {
          carregando = false;
          erroMsg = err?.message || "Não foi possível concluir o registo de parceiro.";
          render();
        }
      });
    }
  }

  render();
}
