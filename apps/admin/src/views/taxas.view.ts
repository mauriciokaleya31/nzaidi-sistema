import { api, ApiError, type TaxaItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import type { MoedaDivisa } from "@nzaidi/dominio";

export async function renderizarTaxas(container: HTMLElement): Promise<void> {
  // Mesmo nome que a API exige em PUT /api/v1/taxas (apps/api/.../taxas.routes.ts)
  const podeEditar = authState.temPermissao("alterar_taxas");

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestão de Taxas de Câmbio</h1>
        <p class="view-subtitle">Cotações oficiais de referência e definição de spreads comerciais de balcão</p>
      </div>
      <div class="view-actions">
        <button id="btn-recarregar-taxas" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Actualizar Cotações
        </button>
      </div>
    </div>

    <div id="alerta-taxas" class="alert-box d-none"></div>

    ${
      !podeEditar
        ? `
        <div class="alert-box alert-info">
          <strong>Modo de Consulta:</strong> O seu perfil de utilizador permite a consulta das taxas de balcão. Apenas o perfil de <strong>Gestão</strong> tem privilégios para actualizar spreads e cotações.
        </div>
      `
        : `
        <div class="alert-box alert-warning">
          <strong>Atenção Regulatória:</strong> Quaisquer alterações às margens de compra/venda têm efeito imediato no website público e nos simuladores de balcão, exigindo justificação formal para a pista de auditoria do BNA.
        </div>
      `
    }

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Tabela de Câmbios em Vigor (AOA)</h2>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive" id="tabela-taxas-container">
          <div class="loading-state">A carregar tabela de taxas...</div>
        </div>
      </div>
    </div>

    <!-- Modal de Edição de Taxas -->
    <div id="modal-editar-taxa" class="modal-overlay d-none">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title" id="modal-titulo">Actualizar Cotação Cambial</h3>
          <button id="btn-fechar-modal" class="btn-fechar-modal" title="Fechar">&times;</button>
        </div>

        <form id="form-editar-taxa" class="modal-form">
          <div id="modal-alerta-erro" class="alert-box alert-error d-none"></div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Moeda Estrangeira</label>
              <input type="text" id="modal-moeda" class="form-input" readonly disabled />
            </div>
            <div class="form-group col-6">
              <label class="form-label">Fonte das Taxas</label>
              <select id="modal-fonte" class="form-select">
                <option value="demonstracao">Demonstração (Simulada)</option>
                <option value="oficial">Oficial (BNA / Fixação)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-referencia">Taxa de Referência BNA (AOA por 1 Unidade)</label>
            <input 
              type="text" 
              id="modal-referencia" 
              class="form-input" 
              placeholder="Ex: 928.50" 
              required 
            />
            <small class="form-help">Utilize ponto decimal (ex: 928.50)</small>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label" for="modal-margem-compra">Margem de Compra (%)</label>
              <input 
                type="text" 
                id="modal-margem-compra" 
                class="form-input" 
                placeholder="Ex: 0.02 (para 2%)" 
                required 
              />
              <small class="form-help">Ex: 0.02 para 2% de desconto de compra</small>
            </div>

            <div class="form-group col-6">
              <label class="form-label" for="modal-margem-venda">Margem de Venda (%)</label>
              <input 
                type="text" 
                id="modal-margem-venda" 
                class="form-input" 
                placeholder="Ex: 0.02 (para 2%)" 
                required 
              />
              <small class="form-help">Ex: 0.02 para 2% de acréscimo de venda</small>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-motivo">
              Motivo da Alteração <span class="required-indicator">* (Obrigatório para Auditoria)</span>
            </label>
            <textarea 
              id="modal-motivo" 
              class="form-textarea" 
              rows="3" 
              placeholder="Descreva o motivo formal da alteração (ex: Ajuste matinal de acordo com fixação BNA do dia)..." 
              required
            ></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" id="btn-cancelar-modal" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-salvar-modal" class="btn btn-primary">
              <span class="btn-text">Gravar Alterações</span>
              <span class="btn-spinner d-none">A guardar...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-taxas-container");
  const alerta = container.querySelector<HTMLDivElement>("#alerta-taxas");
  const btnRecarregar = container.querySelector<HTMLButtonElement>("#btn-recarregar-taxas");

  const modal = container.querySelector<HTMLDivElement>("#modal-editar-taxa");
  const btnFecharModal = container.querySelector<HTMLButtonElement>("#btn-fechar-modal");
  const btnCancelarModal = container.querySelector<HTMLButtonElement>("#btn-cancelar-modal");
  const formEditar = container.querySelector<HTMLFormElement>("#form-editar-taxa");
  const modalAlerta = container.querySelector<HTMLDivElement>("#modal-alerta-erro");
  const inputMoeda = container.querySelector<HTMLInputElement>("#modal-moeda");
  const selectFonte = container.querySelector<HTMLSelectElement>("#modal-fonte");
  const inputReferencia = container.querySelector<HTMLInputElement>("#modal-referencia");
  const inputMargemCompra = container.querySelector<HTMLInputElement>("#modal-margem-compra");
  const inputMargemVenda = container.querySelector<HTMLInputElement>("#modal-margem-venda");
  const inputMotivo = container.querySelector<HTMLTextAreaElement>("#modal-motivo");
  const btnSalvarModal = container.querySelector<HTMLButtonElement>("#btn-salvar-modal");

  let taxasAtuais: TaxaItem[] = [];

  async function carregarTaxas(): Promise<void> {
    if (!containerTabela) return;
    containerTabela.innerHTML = `<div class="loading-state">A carregar tabela de taxas...</div>`;

    try {
      taxasAtuais = await api.listarTaxas();
      if (!taxasAtuais || taxasAtuais.length === 0) {
        containerTabela.innerHTML = `<p class="p-4 text-muted">Nenhuma taxa encontrada.</p>`;
        return;
      }

      containerTabela.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Moeda</th>
              <th>Referência BNA</th>
              <th>Margem Compra</th>
              <th>Taxa Compra (Balcão)</th>
              <th>Margem Venda</th>
              <th>Taxa Venda (Balcão)</th>
              <th>Fonte</th>
              <th>Última Actualização</th>
              ${podeEditar ? `<th>Acção</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${taxasAtuais
              .map(
                (t) => `
                <tr>
                  <td>
                    <div class="moeda-cell">
                      <span class="flag-icon" aria-hidden="true">${t.moeda === "USD" ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h12M4 14h12M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12a7.9 7.9 0 0 0 7.8 8 7.7 7.7 0 0 0 5.2-2"></path></svg>`}</span>
                      <strong>${t.moeda}</strong>
                    </div>
                  </td>
                  <td><strong>${t.referencia} AOA</strong></td>
                  <td><span class="text-muted">${t.margemCompra}</span></td>
                  <td><span class="taxa-val taxa-compra">${t.compra} AOA</span></td>
                  <td><span class="text-muted">${t.margemVenda}</span></td>
                  <td><span class="taxa-val taxa-venda">${t.venda} AOA</span></td>
                  <td>
                    <span class="badge ${t.fonte === "oficial" ? "badge-success" : "badge-warning"}">
                      ${t.fonte}
                    </span>
                  </td>
                  <td><small class="text-muted">${new Date(t.atualizadoEm).toLocaleString("pt-AO")}</small></td>
                  ${
                    podeEditar
                      ? `
                    <td>
                      <button class="btn btn-sm btn-primary btn-editar-taxa" data-moeda="${t.moeda}">
                        Editar Taxa
                      </button>
                    </td>
                  `
                      : ""
                  }
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      `;

      // Event listeners para botões de edição
      if (podeEditar) {
        containerTabela.querySelectorAll(".btn-editar-taxa").forEach((btn) => {
          btn.addEventListener("click", () => {
            const moeda = btn.getAttribute("data-moeda") as MoedaDivisa;
            abrirModalEdicao(moeda);
          });
        });
      }
    } catch (err) {
      containerTabela.innerHTML = `
        <div class="p-4 text-center">
          <p class="text-danger">Erro ao carregar as taxas de câmbio.</p>
        </div>
      `;
    }
  }

  function abrirModalEdicao(moeda: MoedaDivisa): void {
    const item = taxasAtuais.find((t) => t.moeda === moeda);
    if (!item || !modal || !inputMoeda || !selectFonte || !inputReferencia || !inputMargemCompra || !inputMargemVenda || !inputMotivo) {
      return;
    }

    modalAlerta?.classList.add("d-none");
    if (modalAlerta) modalAlerta.textContent = "";

    inputMoeda.value = item.moeda;
    selectFonte.value = item.fonte;
    inputReferencia.value = item.referencia;
    inputMargemCompra.value = item.margemCompra;
    inputMargemVenda.value = item.margemVenda;
    inputMotivo.value = "";

    modal.classList.remove("d-none");
  }

  function fecharModal(): void {
    modal?.classList.add("d-none");
  }

  btnFecharModal?.addEventListener("click", fecharModal);
  btnCancelarModal?.addEventListener("click", fecharModal);
  btnRecarregar?.addEventListener("click", carregarTaxas);

  formEditar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!inputMoeda || !selectFonte || !inputReferencia || !inputMargemCompra || !inputMargemVenda || !inputMotivo || !modalAlerta || !btnSalvarModal) {
      return;
    }

    const moeda = inputMoeda.value as MoedaDivisa;
    const referencia = inputReferencia.value.trim();
    const margemCompra = inputMargemCompra.value.trim();
    const margemVenda = inputMargemVenda.value.trim();
    const motivo = inputMotivo.value.trim();
    const fonte = selectFonte.value as "demonstracao" | "oficial";

    if (!motivo) {
      modalAlerta.textContent = "O motivo da alteração é obrigatório para cumprimento normativo.";
      modalAlerta.classList.remove("d-none");
      return;
    }

    btnSalvarModal.disabled = true;
    const btnText = btnSalvarModal.querySelector(".btn-text");
    const btnSpinner = btnSalvarModal.querySelector(".btn-spinner");
    btnText?.classList.add("d-none");
    btnSpinner?.classList.remove("d-none");

    try {
      await api.atualizarTaxa(moeda, {
        referencia,
        margemCompra,
        margemVenda,
        motivo,
        fonte,
      });

      fecharModal();
      if (alerta) {
        alerta.className = "alert-box alert-success";
        alerta.textContent = `Taxa de ${moeda} actualizada com sucesso!`;
        alerta.classList.remove("d-none");
        setTimeout(() => alerta.classList.add("d-none"), 5000);
      }
      await carregarTaxas();
    } catch (err) {
      if (err instanceof ApiError) {
        modalAlerta.textContent = err.message;
      } else {
        modalAlerta.textContent = "Erro ao guardar alteração de taxa. Tente novamente.";
      }
      modalAlerta.classList.remove("d-none");
    } finally {
      btnSalvarModal.disabled = false;
      btnText?.classList.remove("d-none");
      btnSpinner?.classList.add("d-none");
    }
  });

  await carregarTaxas();
}
