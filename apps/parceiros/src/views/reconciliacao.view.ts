import { api, type RelatorioReconciliacaoItem } from "../api.js";

export async function renderizarReconciliacao(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-size: 1.4rem; font-weight: 700;">Reconciliação & Conferência Financeira</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Conferência de lotes de instruções liquidadas entre o Parceiro e o NZAIDI</p>
      </div>
      <div>
        <button id="btn-novo-lote" class="btn btn-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Submeter Lote para Reconciliação</button>
      </div>
    </div>

    <!-- Modal Novo Lote -->
    <div id="modal-reconciliar" class="modal-overlay d-none">
      <div class="modal-container" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">Submeter Lote de Conferência</h3>
          <button class="btn-fechar-modal" id="btn-fechar-modal-rec">&times;</button>
        </div>
        <div class="modal-body">
          <div id="erro-rec" class="alert-box alert-error d-none"></div>
          <form id="form-rec">
            <div class="form-group">
              <label>Data de Referência do Lote *</label>
              <input type="date" id="rec-data" class="form-control" required value="${new Date().toISOString().slice(0, 10)}" />
            </div>

            <div class="form-group">
              <label>Itens do Lote (Formato: Referencia, ReferenciaExterna, Montante, Moeda, Estado)</label>
              <textarea id="rec-itens" class="form-control" rows="6" placeholder="Exemplo:
OPP-20261026-ABC, MAX-881, 1500.00, EUR, liquidada
OPP-20261026-XYZ, MAX-882, 500.00, USD, liquidada" required></textarea>
              <small class="text-muted">Insira um item por linha separado por vírgula.</small>
            </div>

            <div class="modal-footer" style="padding: 16px 0 0 0; background: transparent;">
              <button type="button" class="btn btn-secondary" id="btn-cancelar-rec">Cancelar</button>
              <button type="submit" id="btn-submit-rec" class="btn btn-primary">Processar Reconciliação</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Relatório Imediato Processado -->
    <div id="resultado-processado-container" class="mb-4 d-none"></div>

    <!-- Histórico de Reconciliações -->
    <div class="card p-0">
      <div class="card-header" style="padding: 18px 24px; border-bottom: 1px solid var(--border-color);">
        <h3 style="font-size: 1.05rem; font-weight: 700;">Histórico de Relatórios de Reconciliação</h3>
      </div>
      <div class="table-responsive" id="tabela-historico-rec">
        <div class="p-4 text-center text-muted">A carregar histórico...</div>
      </div>
    </div>
  `;

  const modalRec = container.querySelector<HTMLDivElement>("#modal-reconciliar")!;
  const btnNovoLote = container.querySelector<HTMLButtonElement>("#btn-novo-lote")!;
  const btnFecharModal = container.querySelector<HTMLButtonElement>("#btn-fechar-modal-rec")!;
  const btnCancelar = container.querySelector<HTMLButtonElement>("#btn-cancelar-rec")!;
  const formRec = container.querySelector<HTMLFormElement>("#form-rec")!;
  const erroRec = container.querySelector<HTMLDivElement>("#erro-rec")!;
  const resContainer = container.querySelector<HTMLDivElement>("#resultado-processado-container")!;
  const tabelaHistorico = container.querySelector<HTMLDivElement>("#tabela-historico-rec")!;

  btnNovoLote.addEventListener("click", () => {
    formRec.reset();
    erroRec.classList.add("d-none");
    modalRec.classList.remove("d-none");
  });

  btnFecharModal.addEventListener("click", () => modalRec.classList.add("d-none"));
  btnCancelar.addEventListener("click", () => modalRec.classList.add("d-none"));

  formRec.addEventListener("submit", async (e) => {
    e.preventDefault();
    erroRec.classList.add("d-none");

    const dataRef = (container.querySelector("#rec-data") as HTMLInputElement).value;
    const textoItens = (container.querySelector("#rec-itens") as HTMLTextAreaElement).value.trim();

    const linhas = textoItens.split("\n").map((l) => l.trim()).filter(Boolean);
    const itens: any[] = [];

    for (const linha of linhas) {
      const partes = linha.split(",").map((p) => p.trim());
      const ref = partes[0];
      const refExt = partes[1];
      const mont = partes[2];
      const moeda = partes[3];
      const est = partes[4];

      if (ref && mont && moeda) {
        itens.push({
          referencia: ref,
          referenciaExterna: refExt || undefined,
          montante: mont,
          moeda: moeda.toUpperCase(),
          estadoReportado: (est ? est.toLowerCase() : "liquidada") as any,
        });
      }
    }

    if (itens.length === 0) {
      erroRec.textContent = "Nenhum item válido identificado. Verifique o formato indicado.";
      erroRec.classList.remove("d-none");
      return;
    }

    const btnSubmit = container.querySelector("#btn-submit-rec") as HTMLButtonElement;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "A reconciliar...";

    try {
      const relatorio = await api.processarReconciliacao({
        dataReferencia: dataRef,
        itens,
      });

      modalRec.classList.add("d-none");
      exibirResultadoReconciliacao(relatorio);
      await carregarHistorico();
    } catch (err: any) {
      erroRec.textContent = err.message || "Erro ao processar reconciliação.";
      erroRec.classList.remove("d-none");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Processar Reconciliação";
    }
  });

  function exibirResultadoReconciliacao(rel: RelatorioReconciliacaoItem): void {
    resContainer.innerHTML = `
      <div class="card" style="border-left: 4px solid ${rel.totalDivergentes > 0 ? "var(--warning)" : "var(--primary)"};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700;">Relatório de Reconciliação Emitido</h3>
            <span class="text-muted">Ref: <code>${rel.id}</code> | Data Base: ${rel.dataReferencia}</span>
          </div>
          <div style="display: flex; gap: 12px;">
            <span class="badge badge-info">Total: ${rel.totalInstrucoes}</span>
            <span class="badge badge-success">Conciliadas: ${rel.totalConciliadas}</span>
            ${
              rel.totalDivergentes > 0
                ? `<span class="badge badge-danger">Divergentes: ${rel.totalDivergentes}</span>`
                : ""
            }
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Referência</th>
                <th>Ref. Externa</th>
                <th>Montante</th>
                <th>Estado NZAIDI</th>
                <th>Estado Parceiro</th>
                <th>Resultado</th>
                <th>Divergência</th>
              </tr>
            </thead>
            <tbody>
              ${rel.detalhes
                .map((d) => `
                <tr>
                  <td><code>${d.referencia}</code></td>
                  <td>${d.referenciaExterna || "—"}</td>
                  <td><strong>${d.montante} ${d.moeda}</strong></td>
                  <td><span class="badge badge-secondary">${d.estadoNzaidi}</span></td>
                  <td><span class="badge badge-info">${d.estadoParceiro}</span></td>
                  <td>
                    ${
                      d.conciliado
                        ? `<span class="badge badge-success">OK</span>`
                        : `<span class="badge badge-danger">Divergente</span>`
                    }
                  </td>
                  <td style="color: ${d.conciliado ? "var(--text-muted)" : "var(--danger)"}; font-size: 0.8rem;">
                    ${d.divergencia || "Conferência validada sem discrepâncias."}
                  </td>
                </tr>
              `)
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    resContainer.classList.remove("d-none");
  }

  async function carregarHistorico(): Promise<void> {
    try {
      const historico = await api.listarHistoricoReconciliacao();
      if (historico.length === 0) {
        tabelaHistorico.innerHTML = `<div class="p-4 text-center text-muted">Nenhum lote conciliado até ao momento.</div>`;
        return;
      }

      tabelaHistorico.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>ID Relatório</th>
              <th>Data Referência</th>
              <th>Instruções</th>
              <th>Conciliadas</th>
              <th>Divergências</th>
              <th>Volume Total</th>
              <th>Processado Em</th>
            </tr>
          </thead>
          <tbody>
            ${historico
              .map((h) => `
              <tr>
                <td><code><strong>${h.id}</strong></code></td>
                <td>${h.dataReferencia}</td>
                <td>${h.totalInstrucoes}</td>
                <td><span class="badge badge-success">${h.totalConciliadas}</span></td>
                <td>
                  ${
                    h.totalDivergentes > 0
                      ? `<span class="badge badge-danger">${h.totalDivergentes}</span>`
                      : `<span class="badge badge-secondary">0</span>`
                  }
                </td>
                <td><strong>${Number(h.volumeTotal).toLocaleString("pt-AO", { minimumFractionDigits: 2 })}</strong></td>
                <td><small class="text-muted">${new Date(h.criadoEm).toLocaleString("pt-AO")}</small></td>
              </tr>
            `)
              .join("")}
          </tbody>
        </table>
      `;
    } catch (e: any) {
      tabelaHistorico.innerHTML = `<div class="p-4 text-center text-danger">${e.message || "Erro ao carregar histórico."}</div>`;
    }
  }

  await carregarHistorico();
}
