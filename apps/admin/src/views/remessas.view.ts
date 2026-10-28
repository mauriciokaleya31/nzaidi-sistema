import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

interface RemessaItem {
  id: string;
  numeroRemessa: string;
  remetenteNome: string;
  remetenteNif: string;
  beneficiarioNome: string;
  beneficiarioPais: string;
  moeda: string;
  valorMoeda: string;
  taxaCambio: string;
  valorAoa: string;
  comissaoAoa: string;
  totalCobradoAoa: string;
  parceiro: string;
  estado: string;
  referenciaParceiro?: string;
  criadoEm: string;
}

export async function renderizarRemessas(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Remessas Internacionais</h1>
        <p class="view-subtitle">Emissão no balcão e liquidação via redes parceiras (MaxPay & Realtransfers)</p>
      </div>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-nova-remessa-modal">+ Nova Remessa</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <h2 class="card-title">Parceiros de Execução & Comissões</h2>
      </div>
      <div class="card-body">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
          <div style="padding: 1rem; background: rgba(5,45,98,0.03); border-left: 3px solid #CC9638; border-radius: 4px;">
            <strong>MaxPay:</strong> Rede Internacional Integrada.
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 0.25rem;">Despacho rápido para mais de 50 países em USD e EUR.</div>
          </div>
          <div style="padding: 1rem; background: rgba(5,45,98,0.03); border-left: 3px solid #052D62; border-radius: 4px;">
            <strong>Realtransfers:</strong> Transferências Bancárias e Balcão.
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 0.25rem;">Especializado em Portugal, Europa, Reino Unido e África do Sul.</div>
          </div>
          <div style="padding: 1rem; background: rgba(5,45,98,0.03); border-left: 3px solid #16a34a; border-radius: 4px;">
            <strong>Idempotência & Estorno:</strong> Proteção Regulatória.
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 0.25rem;">Sem duplicação de ordens; devoluções via lançamento contrário no caixa.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Ordens de Remessa Registadas</h2>
        <button class="btn btn-secondary btn-sm" id="btn-atualizar-remessas">🔄 Atualizar</button>
      </div>
      <div class="card-body" id="tabela-remessas-container">
        <div class="loading-state">A carregar ordens de remessa...</div>
      </div>
    </div>

    <!-- Modal de Criação de Remessa -->
    <div class="modal-backdrop" id="modal-criar-remessa" style="display: none;">
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <h3>Registar Ordem de Remessa Internacional</h3>
          <button class="modal-close" id="btn-fechar-modal-remessa">&times;</button>
        </div>
        <form id="form-criar-remessa">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">ID ou NIF do Cliente Remetente (KYC Aprovado)</label>
              <input type="text" class="form-input" id="rem-cliente-id" placeholder="Ex: cli_xxx ou NIF do cliente" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Nome do Beneficiário</label>
                <input type="text" class="form-input" id="rem-beneficiario-nome" placeholder="Nome completo" required />
              </div>
              <div class="form-group">
                <label class="form-label">País de Destino (ISO 2)</label>
                <input type="text" class="form-input" id="rem-beneficiario-pais" placeholder="Ex: PT, US, ZA, GB" maxlength="2" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Banco do Beneficiário</label>
                <input type="text" class="form-input" id="rem-beneficiario-banco" placeholder="Ex: Santander Totta" required />
              </div>
              <div class="form-group">
                <label class="form-label">IBAN / Conta Bancária</label>
                <input type="text" class="form-input" id="rem-beneficiario-conta" placeholder="Ex: PT50..." required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Moeda Entrega</label>
                <select class="form-input" id="rem-moeda">
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ZAR">ZAR (R)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Valor no Destino</label>
                <input type="number" step="0.01" min="1" class="form-input" id="rem-valor" placeholder="Ex: 500.00" required />
              </div>
              <div class="form-group">
                <label class="form-label">Parceiro</label>
                <select class="form-input" id="rem-parceiro">
                  <option value="maxpay">MaxPay</option>
                  <option value="realtransfers">Realtransfers</option>
                </select>
              </div>
            </div>

            <div class="alert-box alert-info" style="font-size: 0.85rem; margin-top: 0.5rem;">
              * O contravalor em Kwanzas e a comissão regulamentar serão calculados e debitados em caixa automaticamente.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancelar-modal-remessa">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-submeter-remessa">🚀 Emitir Remessa</button>
          </div>
        </form>
      </div>
    </div>
  `;

  await carregarTabelaRemessas();

  // Eventos do modal
  const modal = document.getElementById("modal-criar-remessa");
  const btnAbrir = document.getElementById("btn-nova-remessa-modal");
  const btnFechar = document.getElementById("btn-fechar-modal-remessa");
  const btnCancelar = document.getElementById("btn-cancelar-modal-remessa");

  btnAbrir?.addEventListener("click", () => {
    if (modal) modal.style.display = "flex";
  });

  const fecharModal = () => {
    if (modal) modal.style.display = "none";
  };
  btnFechar?.addEventListener("click", fecharModal);
  btnCancelar?.addEventListener("click", fecharModal);

  document.getElementById("btn-atualizar-remessas")?.addEventListener("click", () => {
    void carregarTabelaRemessas();
  });

  const form = document.getElementById("form-criar-remessa") as HTMLFormElement;
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const clienteRemetenteId = (document.getElementById("rem-cliente-id") as HTMLInputElement).value;
    const beneficiarioNome = (document.getElementById("rem-beneficiario-nome") as HTMLInputElement).value;
    const beneficiarioPais = (document.getElementById("rem-beneficiario-pais") as HTMLInputElement).value.toUpperCase();
    const beneficiarioBanco = (document.getElementById("rem-beneficiario-banco") as HTMLInputElement).value;
    const beneficiarioContaIban = (document.getElementById("rem-beneficiario-conta") as HTMLInputElement).value;
    const moeda = (document.getElementById("rem-moeda") as HTMLSelectElement).value;
    const valorMoeda = (document.getElementById("rem-valor") as HTMLInputElement).value;
    const parceiro = (document.getElementById("rem-parceiro") as HTMLSelectElement).value;

    const chaveIdempotencia = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const btn = document.getElementById("btn-submeter-remessa") as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = "A despachar...";

      const res = await api.post<{ sucesso: boolean; mensagem: string; remessa: RemessaItem }>("/remessas", {
        chaveIdempotencia,
        clienteRemetenteId,
        beneficiarioNome,
        beneficiarioPais,
        beneficiarioBanco,
        beneficiarioContaIban,
        moeda,
        valorMoeda,
        parceiro,
      });

      alert(res.mensagem);
      fecharModal();
      form.reset();
      await carregarTabelaRemessas();
    } catch (err: any) {
      alert("Erro ao criar remessa: " + err.message);
    } finally {
      const btn = document.getElementById("btn-submeter-remessa") as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "🚀 Emitir Remessa";
      }
    }
  });

  async function carregarTabelaRemessas(): Promise<void> {
    const tabelaContainer = document.getElementById("tabela-remessas-container");
    if (!tabelaContainer) return;

    try {
      const res = await api.get<{ sucesso: boolean; itens: RemessaItem[]; total: number }>("/remessas");
      const itens = res.itens;

      if (itens.length === 0) {
        tabelaContainer.innerHTML = `
          <div class="text-muted" style="text-align: center; padding: 2rem;">
            Nenhuma remessa internacional registada até ao momento. Clique em "+ Nova Remessa" para emitir a primeira ordem.
          </div>
        `;
        return;
      }

      tabelaContainer.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nº Remessa</th>
                <th>Remetente</th>
                <th>Beneficiário</th>
                <th>Destino</th>
                <th>Valor Moeda</th>
                <th>Total Cobrado (AOA)</th>
                <th>Parceiro</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${itens
                .map((r: RemessaItem) => {
                  let badgeEstado = '<span class="badge badge-info">Pendente</span>';
                  if (r.estado === "enviada") badgeEstado = '<span class="badge badge-success">✓ Enviada</span>';
                  if (r.estado === "retida") badgeEstado = '<span class="badge badge-warning">⚠️ Retida (Risco)</span>';
                  if (r.estado === "concluida") badgeEstado = '<span class="badge badge-success">Concluída</span>';
                  if (r.estado === "cancelada") badgeEstado = '<span class="badge badge-error">Cancelada</span>';

                  return `
                    <tr>
                      <td><strong>${r.numeroRemessa}</strong></td>
                      <td>${r.remetenteNome}<br/><small class="text-muted">NIF: ${r.remetenteNif}</small></td>
                      <td>${r.beneficiarioNome}</td>
                      <td><span class="badge badge-secondary">${r.beneficiarioPais}</span></td>
                      <td><strong>${r.valorMoeda} ${r.moeda}</strong></td>
                      <td>${r.totalCobradoAoa} Kz</td>
                      <td><span class="badge badge-info">${r.parceiro.toUpperCase()}</span></td>
                      <td>${badgeEstado}</td>
                      <td>
                        ${
                          r.estado !== "cancelada" && r.estado !== "concluida"
                            ? `<button class="btn btn-danger btn-sm btn-cancelar-rem" data-id="${r.id}" data-num="${r.numeroRemessa}">Devolver</button>`
                            : '<span class="text-muted" style="font-size: 0.85rem;">—</span>'
                        }
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      tabelaContainer.querySelectorAll(".btn-cancelar-rem").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute("data-id")!;
          const num = (e.currentTarget as HTMLElement).getAttribute("data-num")!;
          const motivo = prompt(`Informe o motivo formal do cancelamento da remessa ${num} (mínimo 10 caracteres):`);
          if (!motivo || motivo.trim().length < 10) {
            alert("Operação cancelada: O motivo deve ter pelo menos 10 caracteres para auditoria regulatória.");
            return;
          }

          try {
            await api.post(`/remessas/${id}/cancelar`, { motivo });
            alert(`Remessa ${num} cancelada com sucesso! O valor foi reembolsado ao cliente por lançamento contrário no caixa.`);
            await carregarTabelaRemessas();
          } catch (err: any) {
            alert("Erro ao cancelar remessa: " + err.message);
          }
        });
      });
    } catch (err: any) {
      tabelaContainer.innerHTML = `<div class="alert-box alert-error">Erro ao carregar remessas: ${err.message}</div>`;
    }
  }
}
