import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { mostrarToast } from "../components/modal-dialogo.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export async function renderizarConfigComunicacao(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Provedores & Serviços de Comunicação</h1>
        <p class="view-subtitle">Configuração de gateways transacionais (Email, SMS, WhatsApp) com testes de diagnóstico em tempo real.</p>
      </div>
      <div class="view-actions">
        <button id="btn-recarregar-provedores" class="btn btn-secondary" type="button">
          Actualizar Estado
        </button>
      </div>
    </div>

    <!-- Grade de Canais de Comunicação -->
    <div class="dashboard-grid mb-4" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
      <!-- 1. SERVIÇO DE EMAIL -->
      <div class="card" style="border-top: 4px solid #031d42;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">Serviço de Correio Electrónico (Email)</h3>
          <span id="badge-status-email" class="badge badge-success">Activo</span>
        </div>
        <div class="card-body">
          <p class="text-muted" style="font-size: 13px;">Envio de recibos, comprovativos de operação, notificações KYC e avisos de segurança.</p>
          <form id="form-prov-email" class="mb-3">
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Fornecedor / Gateway:</label>
              <input type="text" id="email-fornecedor" class="form-control" value="SMTP Corporativo / SendGrid Direct" required />
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Endpoint / Servidor Host:</label>
              <input type="text" id="email-endpoint" class="form-control" value="smtp.mail.nzaidi.ao:587" required />
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Chave API / Palavra-passe de Envio:</label>
              <input type="password" id="email-chave" class="form-control" value="SG_live_998877665544332211" required />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
              <button type="submit" class="btn btn-sm btn-primary">Gravar Definições</button>
              <button type="button" class="btn btn-sm btn-secondary btn-testar-canal" data-canal="email">
                Testar Diagnóstico
              </button>
            </div>
          </form>
          <div id="diag-email-box" class="diag-result-box" style="display: none; margin-top: 10px; font-size: 11px;"></div>
        </div>
      </div>

      <!-- 2. SERVIÇO DE SMS -->
      <div class="card" style="border-top: 4px solid #cc9638;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">Gateway de SMS (Angola & Global)</h3>
          <span id="badge-status-sms" class="badge badge-success">Activo</span>
        </div>
        <div class="card-body">
          <p class="text-muted" style="font-size: 13px;">Envio de códigos OTP de autenticação, alertas de saldo de caixa e confirmações de remessa.</p>
          <form id="form-prov-sms" class="mb-3">
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Fornecedor:</label>
              <input type="text" id="sms-fornecedor" class="form-control" value="Twilio Direct / Unitel & Africell Local" required />
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Remetente Alfanumérico Autorizado:</label>
              <input type="text" id="sms-sender" class="form-control" value="NZAIDI" required />
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Chave de Autenticação / Token:</label>
              <input type="password" id="sms-token" class="form-control" value="AUTH_TOKEN_SMS_UNITEL_887766" required />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
              <button type="submit" class="btn btn-sm btn-primary">Gravar Definições</button>
              <button type="button" class="btn btn-sm btn-secondary btn-testar-canal" data-canal="sms">
                Testar Diagnóstico
              </button>
            </div>
          </form>
          <div id="diag-sms-box" class="diag-result-box" style="display: none; margin-top: 10px; font-size: 11px;"></div>
        </div>
      </div>

      <!-- 3. WHATSAPP BUSINESS API -->
      <div class="card" style="border-top: 4px solid #10b981;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">WhatsApp Business API Oficial</h3>
          <span id="badge-status-wa" class="badge badge-success">Activo</span>
        </div>
        <div class="card-body">
          <p class="text-muted" style="font-size: 13px;">Comunicação automatizada de estado de ordens cambiais e atendimento oficial via Meta Cloud API.</p>
          <form id="form-prov-wa" class="mb-3">
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">ID da Conta Meta Business:</label>
              <input type="text" id="wa-waba-id" class="form-control" value="WABA_NZAIDI_99281726" required />
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Número Telefónico Associado:</label>
              <input type="text" id="wa-phone-id" class="form-control" value="+244 923 000 000" required />
            </div>
            <div class="form-group mb-2">
              <label class="form-label" style="font-size: 12px;">Token de Acesso Permanente (Graph API):</label>
              <input type="password" id="wa-token" class="form-control" value="EAAG_META_PERMANENT_TOKEN_NZAIDI" required />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
              <button type="submit" class="btn btn-sm btn-primary">Gravar Definições</button>
              <button type="button" class="btn btn-sm btn-secondary btn-testar-canal" data-canal="whatsapp">
                Testar Diagnóstico
              </button>
            </div>
          </form>
          <div id="diag-whatsapp-box" class="diag-result-box" style="display: none; margin-top: 10px; font-size: 11px;"></div>
        </div>
      </div>
    </div>
  `;

  // Executar testes de diagnóstico
  container.querySelectorAll<HTMLButtonElement>(".btn-testar-canal").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const canal = btn.getAttribute("data-canal");
      if (!canal) return;

      const boxDiag = container.querySelector<HTMLElement>(`#diag-${canal}-box`);
      if (boxDiag) {
        boxDiag.style.display = "block";
        boxDiag.className = "alert-box alert-info";
        boxDiag.innerHTML = "A executar handshake TLS e diagnóstico com o fornecedor...";
      }

      btn.disabled = true;
      try {
        const res = await api.testarProvedorComunicacao(canal);
        if (boxDiag) {
          boxDiag.className = "alert-box alert-success";
          boxDiag.innerHTML = `
            <strong>${escapeHtml(res.mensagem)}</strong><br>
            <span>Latência do teste: <strong>${res.tempoRespostaMs} ms</strong></span><br>
            <span class="text-muted">Status: ${res.detalhesDiagnostico.statusCanal || 'Operacional'} | ${res.detalhesDiagnostico.autenticacao}</span>
          `;
        }
      } catch (err: any) {
        if (boxDiag) {
          boxDiag.className = "alert-box alert-error";
          boxDiag.innerHTML = `Erro no diagnóstico: ${escapeHtml(err.message)}`;
        }
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Gravar definições dos formulários
  container.querySelector("#form-prov-email")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.salvarProvedorComunicacao({
        tipo: "email",
        fornecedor: (container.querySelector("#email-fornecedor") as HTMLInputElement).value,
        endpoint: (container.querySelector("#email-endpoint") as HTMLInputElement).value,
        credenciais: { chave: (container.querySelector("#email-chave") as HTMLInputElement).value },
        ambiente: "producao",
        ativo: true,
      });
      mostrarToast("Definições do canal de Email gravadas com sucesso.", "sucesso");
    } catch (err: any) {
      mostrarToast(`Erro: ${err.message}`, "erro");
    }
  });

  container.querySelector("#form-prov-sms")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.salvarProvedorComunicacao({
        tipo: "sms",
        fornecedor: (container.querySelector("#sms-fornecedor") as HTMLInputElement).value,
        endpoint: "https://api.gateway.ao/sms",
        credenciais: {
          sender: (container.querySelector("#sms-sender") as HTMLInputElement).value,
          token: (container.querySelector("#sms-token") as HTMLInputElement).value,
        },
        ambiente: "producao",
        ativo: true,
      });
      mostrarToast("Definições do canal de SMS gravadas com sucesso.", "sucesso");
    } catch (err: any) {
      mostrarToast(`Erro: ${err.message}`, "erro");
    }
  });

  container.querySelector("#form-prov-wa")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.salvarProvedorComunicacao({
        tipo: "whatsapp",
        fornecedor: "Meta Cloud API",
        endpoint: "https://graph.facebook.com/v20.0",
        credenciais: {
          wabaId: (container.querySelector("#wa-waba-id") as HTMLInputElement).value,
          phoneId: (container.querySelector("#wa-phone-id") as HTMLInputElement).value,
          token: (container.querySelector("#wa-token") as HTMLInputElement).value,
        },
        ambiente: "producao",
        ativo: true,
      });
      mostrarToast("Definições do canal WhatsApp Business gravadas com sucesso.", "sucesso");
    } catch (err: any) {
      mostrarToast(`Erro: ${err.message}`, "erro");
    }
  });
}
