import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { confirmarModal, mostrarToast } from "../components/modal-dialogo.js";

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderizarPagamentosView(container: HTMLElement): void {
  const usuarioLogado = authState.getUsuario();
  const podeGerir = usuarioLogado?.funcao === "gestao";
  let abaAtiva: "metodos" | "pendentes" | "historico" = "metodos";

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Métodos de Pagamento e Liquidação</h1>
        <p class="view-subtitle">Gestão de canais manuais (transferência/depósito) e preparação do Multicaixa Express (AppyPay).</p>
      </div>
      <div class="view-actions">
        <button id="btn-atualizar-pagamentos" class="btn btn-outline" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Atualizar
        </button>
      </div>
    </div>

    <!-- Navegação em Abas -->
    <div class="nav-abas">
      <button class="aba-btn active" data-aba="metodos">Configuração de Métodos</button>
      <button class="aba-btn" data-aba="pendentes">Pagamentos Pendentes de Confirmação</button>
      <button class="aba-btn" data-aba="historico">Histórico de Transações</button>
    </div>

    <!-- Conteúdo da Aba 1: Métodos de Pagamento -->
    <div id="aba-metodos-conteudo">
      <div style="background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 12px 16px;">Método / Canal</th>
              <th style="padding: 12px 16px;">Tipo</th>
              <th style="padding: 12px 16px;">Disponível ao Cliente</th>
              <th style="padding: 12px 16px;">Estado de Integração</th>
              <th style="padding: 12px 16px;">Instruções / Parâmetros</th>
              <th style="padding: 12px 16px; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-metodos-corpo">
            <tr><td colspan="6" style="text-align: center; padding: 24px;">A carregar métodos de pagamento...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Conteúdo da Aba 2: Pendentes de Confirmação -->
    <div id="aba-pendentes-conteudo" style="display: none;">
      <div style="background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="padding: 14px 16px; background: #fffbeb; border-bottom: 1px solid #fef3c7; color: #92400e; font-size: 13px; display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span><strong>Atenção:</strong> A submissão do comprovativo pelo cliente <em>não</em> confirma automaticamente o pagamento. Verifique o extrato bancário oficial antes de validar.</span>
        </div>
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 12px 16px;">Referência / Data</th>
              <th style="padding: 12px 16px;">Cliente</th>
              <th style="padding: 12px 16px;">Método</th>
              <th style="padding: 12px 16px;">Montante</th>
              <th style="padding: 12px 16px;">Ref. Externa / Talão</th>
              <th style="padding: 12px 16px;">Comprovativo</th>
              <th style="padding: 12px 16px; text-align: right;">Ações de Validação</th>
            </tr>
          </thead>
          <tbody id="tabela-pendentes-corpo">
            <tr><td colspan="7" style="text-align: center; padding: 24px;">A carregar pagamentos pendentes...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Conteúdo da Aba 3: Histórico -->
    <div id="aba-historico-conteudo" style="display: none;">
      <div style="background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 12px 16px;">Referência</th>
              <th style="padding: 12px 16px;">Cliente</th>
              <th style="padding: 12px 16px;">Montante</th>
              <th style="padding: 12px 16px;">Estado</th>
              <th style="padding: 12px 16px;">Validador / Data</th>
              <th style="padding: 12px 16px;">Notas</th>
            </tr>
          </thead>
          <tbody id="tabela-historico-corpo">
            <tr><td colspan="6" style="text-align: center; padding: 24px;">A carregar histórico...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Configuração de Método -->
    <div id="modal-config-metodo" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 id="modal-metodo-titulo" style="margin: 0; color: #031d42; font-size: 1.15rem;">Configurar Método</h3>
          <button type="button" class="btn-fechar" id="btn-fechar-modal-metodo">&times;</button>
        </div>
        <div class="modal-body" id="modal-metodo-corpo">
          <!-- Injetado dinamicamente -->
        </div>
      </div>
    </div>

    <!-- Modal de Rejeição de Pagamento -->
    <div id="modal-rejeitar-pagamento" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="max-width: 450px;">
        <div class="modal-header">
          <h3 style="margin: 0; color: #b91c1c; font-size: 1.1rem;">Rejeitar Comprovativo de Pagamento</h3>
          <button type="button" class="btn-fechar" id="btn-fechar-modal-rejeitar">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 13px; color: #475569; margin-top: 0;">Indique a justificação regulamentar para a rejeição do pagamento. Esta nota ficará arquivada para auditoria.</p>
          <div class="form-group">
            <label class="form-label">Motivo da Rejeição <span style="color: red;">*</span></label>
            <textarea id="motivo-rejeicao-pagamento" class="form-textarea" rows="3" placeholder="Ex.: Montante não creditado na conta bancária após conferência de extrato."></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
            <button type="button" class="btn btn-outline" id="btn-cancelar-rejeicao">Cancelar</button>
            <button type="button" class="btn btn-danger" id="btn-confirmar-rejeicao">Rejeitar Pagamento</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Controlo de Abas
  const abas = container.querySelectorAll<HTMLButtonElement>(".aba-btn");
  abas.forEach((btn) => {
    btn.addEventListener("click", () => {
      abas.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      abaAtiva = btn.getAttribute("data-aba") as any;

      const secMetodos = container.querySelector<HTMLElement>("#aba-metodos-conteudo")!;
      const secPendentes = container.querySelector<HTMLElement>("#aba-pendentes-conteudo")!;
      const secHistorico = container.querySelector<HTMLElement>("#aba-historico-conteudo")!;

      secMetodos.style.display = abaAtiva === "metodos" ? "block" : "none";
      secPendentes.style.display = abaAtiva === "pendentes" ? "block" : "none";
      secHistorico.style.display = abaAtiva === "historico" ? "block" : "none";

      if (abaAtiva === "metodos") void carregarMetodos();
      if (abaAtiva === "pendentes") void carregarPendentes();
      if (abaAtiva === "historico") void carregarHistorico();
    });
  });

  // Carregar Métodos
  async function carregarMetodos(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-metodos-corpo");
    if (!tbody) return;

    try {
      const metodos = await api.listarMetodosPagamentoAdmin();
      if (metodos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 24px;">Nenhum método de pagamento cadastrado.</td></tr>`;
        return;
      }

      tbody.innerHTML = metodos.map((m: any) => {
        const ehManual = m.tipo === "manual";
        const badgeTipo = ehManual
          ? '<span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">Manual</span>'
          : '<span class="badge" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">Automático (API)</span>';

        let badgeEstado = "";
        switch (m.estadoIntegracao) {
          case "ativo":
            badgeEstado = '<span class="badge badge-success">Ativo</span>';
            break;
          case "em_preparacao":
            badgeEstado = '<span class="badge badge-warning">Em Preparação</span>';
            break;
          case "pendente_credenciais":
            badgeEstado = '<span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;">Pendente Credenciais</span>';
            break;
          default:
            badgeEstado = '<span class="badge badge-danger">Inativo</span>';
        }

        const visivelCliente = m.disponivelCliente
          ? '<span style="color: #059669; font-weight: 600;">Sim (Visível)</span>'
          : '<span style="color: #64748b;">Não (Oculto)</span>';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px;">
              <strong style="color: #031d42; display: block;">${escapeHtml(m.nome)}</strong>
              <small class="text-muted">${escapeHtml(m.descricao || "")}</small>
            </td>
            <td style="padding: 12px 16px;">${badgeTipo}</td>
            <td style="padding: 12px 16px;">${visivelCliente}</td>
            <td style="padding: 12px 16px;">${badgeEstado}</td>
            <td style="padding: 12px 16px; font-size: 12px; color: #475569; max-width: 250px;">
              ${escapeHtml((m.instrucoes || "Sem instruções").substring(0, 75))}...
            </td>
            <td style="padding: 12px 16px; text-align: right;">
              <button class="btn btn-sm btn-outline btn-editar-metodo" data-id="${m.id}" type="button">
                Configurar
              </button>
            </td>
          </tr>
        `;
      }).join("");

      // Listener para botões configurar
      tbody.querySelectorAll<HTMLButtonElement>(".btn-editar-metodo").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id")!;
          const metodo = metodos.find((x: any) => x.id === id);
          if (metodo) abrirModalConfigMetodo(metodo);
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar métodos.</td></tr>`;
    }
  }

  // Carregar Pendentes
  async function carregarPendentes(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-pendentes-corpo");
    if (!tbody) return;

    try {
      const transacoes = await api.listarTransacoesPagamentoAdmin({ estado: "pendente_confirmacao" });
      if (transacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 24px;">Nenhum pagamento pendente de confirmação no momento.</td></tr>`;
        return;
      }

      tbody.innerHTML = transacoes.map((t: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px;">
            <strong style="color: #031d42; display: block;">${escapeHtml(t.referenciaTransacao)}</strong>
            <small class="text-muted">${new Date(t.criadoEm).toLocaleString("pt-AO")}</small>
          </td>
          <td style="padding: 12px 16px;">
            <div style="font-weight: 500;">${escapeHtml(t.clienteNome || "Cliente Avulso")}</div>
            <small class="text-muted">${escapeHtml(t.clienteTelefone || t.clienteEmail || "")}</small>
          </td>
          <td style="padding: 12px 16px; font-size: 13px;">${escapeHtml(t.metodoNome || t.metodoId)}</td>
          <td style="padding: 12px 16px; font-weight: 700; color: #031d42;">
            ${Number(t.montanteAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
          </td>
          <td style="padding: 12px 16px; font-family: monospace; font-size: 13px; color: #0369a1;">
            ${escapeHtml(t.referenciaExterna || "Não indicada")}
          </td>
          <td style="padding: 12px 16px;">
            ${t.comprovativoUrl ? `
              <span class="badge badge-info" style="font-size: 11px;">Comprovativo Anexado</span>
            ` : `<span class="text-muted" style="font-size: 12px;">Sem anexo</span>`}
          </td>
          <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-success btn-confirmar-pag" data-id="${t.id}" style="margin-right: 4px;" type="button">
              Confirmar
            </button>
            <button class="btn btn-sm btn-outline-danger btn-rejeitar-pag" data-id="${t.id}" type="button">
              Rejeitar
            </button>
          </td>
        </tr>
      `).join("");

      // Listeners de Confirmação
      tbody.querySelectorAll<HTMLButtonElement>(".btn-confirmar-pag").forEach((b) => {
        b.addEventListener("click", async () => {
          const id = b.getAttribute("data-id")!;
          const ok = await confirmarModal({
            titulo: "Confirmar Pagamento",
            mensagem: "Confirma que o montante correspondente foi efetivamente creditado no extrato bancário oficial?",
            textoConfirmar: "Confirmar Crédito",
            perigo: false,
          });
          if (!ok) return;
          try {
            await api.confirmarPagamentoManual(id, "Validado no extrato bancário pelo operador.");
            mostrarToast("Pagamento confirmado com sucesso!", "sucesso");
            void carregarPendentes();
          } catch (err: any) {
            mostrarToast(`Erro ao confirmar: ${err.message}`, "erro");
          }
        });
      });

      // Listeners de Rejeição
      tbody.querySelectorAll<HTMLButtonElement>(".btn-rejeitar-pag").forEach((b) => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-id")!;
          abrirModalRejeitar(id);
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar pagamentos pendentes.</td></tr>`;
    }
  }

  // Carregar Histórico
  async function carregarHistorico(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-historico-corpo");
    if (!tbody) return;

    try {
      const transacoes = await api.listarTransacoesPagamentoAdmin({ limite: 50 });
      if (transacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 24px;">Nenhuma transação registada.</td></tr>`;
        return;
      }

      tbody.innerHTML = transacoes.map((t: any) => {
        let badgeEstado = "";
        switch (t.estado) {
          case "confirmado":
            badgeEstado = '<span class="badge badge-success">Confirmado</span>';
            break;
          case "rejeitado":
            badgeEstado = '<span class="badge badge-danger">Rejeitado</span>';
            break;
          case "cancelado":
            badgeEstado = '<span class="badge badge-warning">Cancelado</span>';
            break;
          default:
            badgeEstado = '<span class="badge badge-info">Pendente</span>';
        }

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px;">
              <strong style="color: #031d42; display: block;">${escapeHtml(t.referenciaTransacao)}</strong>
              <small class="text-muted">${new Date(t.criadoEm).toLocaleString("pt-AO")}</small>
            </td>
            <td style="padding: 12px 16px;">${escapeHtml(t.clienteNome || "Cliente")}</td>
            <td style="padding: 12px 16px; font-weight: 600;">
              ${Number(t.montanteAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
            </td>
            <td style="padding: 12px 16px;">${badgeEstado}</td>
            <td style="padding: 12px 16px; font-size: 12px;">
              ${t.confirmadoPorNome ? `<strong>${escapeHtml(t.confirmadoPorNome)}</strong><br>` : ""}
              <small class="text-muted">${t.confirmadoEm ? new Date(t.confirmadoEm).toLocaleString("pt-AO") : "—"}</small>
            </td>
            <td style="padding: 12px 16px; font-size: 12px; color: #475569;">
              ${escapeHtml(t.motivoRejeicao || t.notasInternas || "—")}
            </td>
          </tr>
        `;
      }).join("");
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar histórico.</td></tr>`;
    }
  }

  // Modal de Configuração de Método
  const modalMetodo = container.querySelector<HTMLElement>("#modal-config-metodo")!;
  const corpoModal = container.querySelector<HTMLElement>("#modal-metodo-corpo")!;

  function abrirModalConfigMetodo(m: any): void {
    container.querySelector<HTMLElement>("#modal-metodo-titulo")!.textContent = `Configurar: ${m.nome}`;
    const ehAppyPay = m.canal.startsWith("appypay");

    let configObj: any = {};
    try {
      configObj = JSON.parse(m.configJson || "{}");
    } catch {}

    corpoModal.innerHTML = `
      <form id="form-config-metodo" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Nome de Exibição</label>
          <input type="text" id="cfg-nome" class="form-input" value="${escapeHtml(m.nome)}" required />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Ativo no Sistema</label>
            <select id="cfg-ativo" class="form-select">
              <option value="1" ${m.ativo ? "selected" : ""}>Sim (Ativo)</option>
              <option value="0" ${!m.ativo ? "selected" : ""}>Não (Inativo)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Disponível para Clientes</label>
            <select id="cfg-disponivel" class="form-select">
              <option value="1" ${m.disponivelCliente ? "selected" : ""}>Sim (Exibir no Portal)</option>
              <option value="0" ${!m.disponivelCliente ? "selected" : ""}>Não (Ocultar)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Estado de Integração</label>
          <select id="cfg-estado" class="form-select">
            <option value="ativo" ${m.estadoIntegracao === "ativo" ? "selected" : ""}>Ativo e Operacional</option>
            <option value="em_preparacao" ${m.estadoIntegracao === "em_preparacao" ? "selected" : ""}>Em Preparação (Sem transações reais)</option>
            <option value="pendente_credenciais" ${m.estadoIntegracao === "pendente_credenciais" ? "selected" : ""}>Pendente de Credenciais</option>
            <option value="inativo" ${m.estadoIntegracao === "inativo" ? "selected" : ""}>Inativo</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Instruções para o Cliente</label>
          <textarea id="cfg-instrucoes" class="form-textarea" rows="4">${escapeHtml(m.instrucoes || "")}</textarea>
        </div>

        ${ehAppyPay ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 4px;">
            <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #031d42;">Credenciais AppyPay (Multicaixa Express)</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Ambiente</label>
                <select id="cfg-appypay-env" class="form-select">
                  <option value="sandbox" ${configObj.ambiente === "sandbox" ? "selected" : ""}>Sandbox / Testes</option>
                  <option value="producao" ${configObj.ambiente === "producao" ? "selected" : ""}>Produção</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Client ID</label>
                <input type="text" id="cfg-appypay-client-id" class="form-input" value="${escapeHtml(configObj.client_id || "")}" placeholder="Ex.: 3491-..." />
              </div>
            </div>
            <div style="margin-top: 10px;">
              <button type="button" id="btn-testar-appypay" class="btn btn-sm btn-outline">
                Testar Conexão com a AppyPay
              </button>
              <div id="resultado-diag-appypay" style="margin-top: 8px;"></div>
            </div>
          </div>
        ` : ""}

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline" id="btn-cancelar-modal-metodo">Cancelar</button>
          <button type="submit" class="btn btn-primary" ${!podeGerir ? "disabled" : ""}>Salvar Configuração</button>
        </div>
      </form>
    `;

    modalMetodo.style.display = "flex";

    // Fechar modal
    container.querySelector("#btn-fechar-modal-metodo")?.addEventListener("click", () => {
      modalMetodo.style.display = "none";
    });
    container.querySelector("#btn-cancelar-modal-metodo")?.addEventListener("click", () => {
      modalMetodo.style.display = "none";
    });

    // Diagnóstico AppyPay
    if (ehAppyPay) {
      container.querySelector("#btn-testar-appypay")?.addEventListener("click", async () => {
        const box = container.querySelector<HTMLElement>("#resultado-diag-appypay")!;
        box.innerHTML = `<span class="text-muted">A testar conexão com a AppyPay...</span>`;
        try {
          const res = await api.testarConexaoAppyPay();
          if (res.sucesso) {
            box.innerHTML = `<div class="diag-result-box sucesso"><strong>Sucesso:</strong> ${escapeHtml(res.mensagem)} (${res.latenciaMs}ms)</div>`;
          } else {
            box.innerHTML = `<div class="diag-result-box falha"><strong>Aviso:</strong> ${escapeHtml(res.mensagem)}</div>`;
          }
        } catch (err: any) {
          box.innerHTML = `<div class="diag-result-box falha"><strong>Erro:</strong> ${escapeHtml(err.message)}</div>`;
        }
      });
    }

    // Submit de configuração
    container.querySelector("#form-config-metodo")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = (container.querySelector("#cfg-nome") as HTMLInputElement).value.trim();
      const ativo = (container.querySelector("#cfg-ativo") as HTMLSelectElement).value === "1";
      const disponivelCliente = (container.querySelector("#cfg-disponivel") as HTMLSelectElement).value === "1";
      const estadoIntegracao = (container.querySelector("#cfg-estado") as HTMLSelectElement).value;
      const instrucoes = (container.querySelector("#cfg-instrucoes") as HTMLTextAreaElement).value.trim();

      const payload: any = {
        nome,
        ativo,
        disponivelCliente,
        estadoIntegracao,
        instrucoes,
      };

      if (ehAppyPay) {
        configObj.ambiente = (container.querySelector("#cfg-appypay-env") as HTMLSelectElement).value;
        configObj.client_id = (container.querySelector("#cfg-appypay-client-id") as HTMLInputElement).value.trim();
        payload.configJson = JSON.stringify(configObj);
      }

      try {
        await api.atualizarMetodoPagamentoAdmin(m.id, payload);
        mostrarToast("Configuração do método gravada com sucesso.", "sucesso");
        modalMetodo.style.display = "none";
        void carregarMetodos();
      } catch (err: any) {
        mostrarToast(`Erro ao salvar: ${err.message}`, "erro");
      }
    });
  }

  // Modal de Rejeição
  const modalRejeitar = container.querySelector<HTMLElement>("#modal-rejeitar-pagamento")!;
  let idTransacaoParaRejeitar = "";

  function abrirModalRejeitar(id: string): void {
    idTransacaoParaRejeitar = id;
    (container.querySelector("#motivo-rejeicao-pagamento") as HTMLTextAreaElement).value = "";
    modalRejeitar.style.display = "flex";
  }

  container.querySelector("#btn-fechar-modal-rejeitar")?.addEventListener("click", () => {
    modalRejeitar.style.display = "none";
  });
  container.querySelector("#btn-cancelar-rejeicao")?.addEventListener("click", () => {
    modalRejeitar.style.display = "none";
  });

  container.querySelector("#btn-confirmar-rejeicao")?.addEventListener("click", async () => {
    const motivo = (container.querySelector("#motivo-rejeicao-pagamento") as HTMLTextAreaElement).value.trim();
    if (motivo.length < 5) {
      mostrarToast("O motivo de rejeição deve ter no mínimo 5 caracteres.", "aviso");
      return;
    }

    try {
      await api.rejeitarPagamentoManual(idTransacaoParaRejeitar, motivo);
      mostrarToast("Pagamento rejeitado com sucesso.", "sucesso");
      modalRejeitar.style.display = "none";
      void carregarPendentes();
    } catch (err: any) {
      mostrarToast(`Erro ao rejeitar: ${err.message}`, "erro");
    }
  });

  // Botão Atualizar Geral
  container.querySelector("#btn-atualizar-pagamentos")?.addEventListener("click", () => {
    if (abaAtiva === "metodos") void carregarMetodos();
    if (abaAtiva === "pendentes") void carregarPendentes();
    if (abaAtiva === "historico") void carregarHistorico();
  });

  // Carregamento Inicial
  void carregarMetodos();
}
