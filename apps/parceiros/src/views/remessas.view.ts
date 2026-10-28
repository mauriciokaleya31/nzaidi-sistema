import { api, type OperacaoItem } from "../api.js";

export async function renderizarRemessas(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-size: 1.4rem; font-weight: 700;">Gestão de Remessas & Liquidações</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Instruções financeiras recebidas para execução e conciliação bancária</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" id="filtro-busca" class="form-control" placeholder="Pesquisar beneficiário, IBAN ou ref..." style="width: 280px;" />
        <select id="filtro-estado" class="form-control" style="width: 180px;">
          <option value="todos">Todos os Estados</option>
          <option value="pendente">Pendente</option>
          <option value="em_processamento">Em Processamento</option>
          <option value="liquidada">Liquidada</option>
          <option value="devolvida">Devolvida</option>
        </select>
      </div>
    </div>

    <div class="card p-0 mb-4">
      <div class="table-responsive" id="tabela-remessas-container">
        <div class="p-4 text-center text-muted">A carregar instruções atribuídas...</div>
      </div>
    </div>

    <!-- Modal Detalhe da Instrução -->
    <div id="modal-detalhe" class="modal-overlay d-none">
      <div class="modal-container" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title">Detalhe da Remessa Bancária</h3>
          <button class="btn-fechar-modal" id="btn-fechar-detalhe">&times;</button>
        </div>
        <div class="modal-body" id="detalhe-body">
          <!-- Preenchido via JS -->
        </div>
        <div class="modal-footer" id="detalhe-footer">
          <button class="btn btn-secondary" id="btn-fechar-detalhe-foot">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Liquidação -->
    <div id="modal-liquidar" class="modal-overlay d-none">
      <div class="modal-container" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">Confirmar Liquidação de Remessa</h3>
          <button class="btn-fechar-modal" id="btn-fechar-liquidar">&times;</button>
        </div>
        <div class="modal-body">
          <div id="erro-liquidar" class="alert-box alert-error d-none"></div>
          <form id="form-liquidar">
            <input type="hidden" id="liquidar-op-id" />
            <div class="form-group">
              <label>Referência Externa Bancária / MT103 *</label>
              <input type="text" id="liquidar-ref-externa" class="form-control" placeholder="Ex: MAX-202610-88912" required />
              <small class="text-muted">Número da liquidação bancária emitido pelo canal.</small>
            </div>
            <div class="form-group">
              <label>Nome do Arquivo / Comprovativo</label>
              <input type="text" id="liquidar-comprovativo" class="form-control" placeholder="Ex: comprovativo_remessa_88912.pdf" />
            </div>
            <div class="form-group">
              <label>Notas de Execução</label>
              <textarea id="liquidar-notas" class="form-control" rows="2" placeholder="Observações operacionais..."></textarea>
            </div>
            <div class="modal-footer" style="padding: 16px 0 0 0; background: transparent;">
              <button type="button" class="btn btn-secondary" id="btn-cancelar-liquidar">Cancelar</button>
              <button type="submit" id="btn-submit-liquidar" class="btn btn-primary">Registar Liquidação</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal de Devolução / Rejeição -->
    <div id="modal-devolver" class="modal-overlay d-none">
      <div class="modal-container" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--danger);">Devolver Operação de Remessa</h3>
          <button class="btn-fechar-modal" id="btn-fechar-devolver">&times;</button>
        </div>
        <div class="modal-body">
          <div id="erro-devolver" class="alert-box alert-error d-none"></div>
          <form id="form-devolver">
            <input type="hidden" id="devolver-op-id" />
            <p style="font-size: 0.88rem; color: #cbd5e1; margin-bottom: 16px;">
              A devolução informará a equipa de conformidade e o cliente para correção dos dados bancários.
            </p>
            <div class="form-group">
              <label>Motivo da Devolução / Rejeição *</label>
              <textarea id="devolver-motivo" class="form-control" rows="3" placeholder="Ex: IBAN incorreto ou conta bancária inexistente no país de destino..." required minlength="5"></textarea>
            </div>
            <div class="modal-footer" style="padding: 16px 0 0 0; background: transparent;">
              <button type="button" class="btn btn-secondary" id="btn-cancelar-devolver">Cancelar</button>
              <button type="submit" id="btn-submit-devolver" class="btn btn-outline-danger">Confirmar Devolução</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-remessas-container")!;
  const filtroBusca = container.querySelector<HTMLInputElement>("#filtro-busca")!;
  const filtroEstado = container.querySelector<HTMLSelectElement>("#filtro-estado")!;

  const modalDetalhe = container.querySelector<HTMLDivElement>("#modal-detalhe")!;
  const detalheBody = container.querySelector<HTMLDivElement>("#detalhe-body")!;
  const btnFecharDetalhe = container.querySelector<HTMLButtonElement>("#btn-fechar-detalhe")!;
  const btnFecharDetalheFoot = container.querySelector<HTMLButtonElement>("#btn-fechar-detalhe-foot")!;

  const modalLiquidar = container.querySelector<HTMLDivElement>("#modal-liquidar")!;
  const formLiquidar = container.querySelector<HTMLFormElement>("#form-liquidar")!;
  const erroLiquidar = container.querySelector<HTMLDivElement>("#erro-liquidar")!;

  const modalDevolver = container.querySelector<HTMLDivElement>("#modal-devolver")!;
  const formDevolver = container.querySelector<HTMLFormElement>("#form-devolver")!;
  const erroDevolver = container.querySelector<HTMLDivElement>("#erro-devolver")!;

  let itensCarregados: OperacaoItem[] = [];

  async function carregarOperacoes(): Promise<void> {
    containerTabela.innerHTML = `<div class="p-4 text-center text-muted">A atualizar remessas...</div>`;
    try {
      const res = await api.listarOperacoes({
        estado: filtroEstado.value,
        busca: filtroBusca.value.trim() || undefined,
      });

      itensCarregados = res.dados;

      if (itensCarregados.length === 0) {
        containerTabela.innerHTML = `
          <div class="p-4 text-center text-muted">
            Nenhuma instrução encontrada para os filtros selecionados.
          </div>
        `;
        return;
      }

      containerTabela.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Referência</th>
              <th>Canal</th>
              <th>Beneficiário</th>
              <th>País / Banco</th>
              <th>Montante</th>
              <th>Comissão</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${itensCarregados
              .map((op) => {
                const statusClass =
                  op.estado === "liquidada"
                    ? "badge-success"
                    : op.estado === "pendente" || op.estado === "em_processamento"
                    ? "badge-warning"
                    : "badge-danger";

                return `
                <tr>
                  <td><code><strong>${op.id}</strong></code></td>
                  <td><span class="badge badge-secondary">${op.canal.toUpperCase()}</span></td>
                  <td>
                    <div><strong>${op.beneficiarioNome}</strong></div>
                    <small class="text-muted">${op.beneficiarioIban}</small>
                  </td>
                  <td>
                    <div>${op.beneficiarioPais}</div>
                    <small class="text-muted">${op.beneficiarioBanco}</small>
                  </td>
                  <td>
                    <strong>${Number(op.montante).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} ${op.moeda}</strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">≈ ${Number(op.contravalorAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</div>
                  </td>
                  <td style="color: var(--primary);">
                    +${Number(op.comissaoParceiroAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
                  </td>
                  <td><span class="badge ${statusClass}">${op.estado.toUpperCase()}</span></td>
                  <td>
                    <button class="btn btn-sm btn-secondary btn-ver-detalhe mr-1" data-id="${op.id}">Detalhe</button>
                    ${
                      op.estado === "pendente"
                        ? `<button class="btn btn-sm btn-primary btn-confirmar-recepcao mr-1" data-id="${op.id}">Aceitar</button>`
                        : ""
                    }
                    ${
                      op.estado === "pendente" || op.estado === "em_processamento"
                        ? `
                        <button class="btn btn-sm btn-outline-warning btn-abrir-liquidar mr-1" data-id="${op.id}">Liquidar</button>
                        <button class="btn btn-sm btn-outline-danger btn-abrir-devolver" data-id="${op.id}">Devolver</button>
                      `
                        : ""
                    }
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      `;

      // Eventos de clique nas linhas
      containerTabela.querySelectorAll(".btn-ver-detalhe").forEach((b) => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-id")!;
          abrirModalDetalhe(id);
        });
      });

      containerTabela.querySelectorAll(".btn-confirmar-recepcao").forEach((b) => {
        b.addEventListener("click", async () => {
          const id = b.getAttribute("data-id")!;
          try {
            (b as HTMLButtonElement).disabled = true;
            await api.confirmarRecepcao(id);
            await carregarOperacoes();
          } catch (e: any) {
            console.error(e);
            (b as HTMLButtonElement).disabled = false;
          }
        });
      });

      containerTabela.querySelectorAll(".btn-abrir-liquidar").forEach((b) => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-id")!;
          abrirModalLiquidar(id);
        });
      });

      containerTabela.querySelectorAll(".btn-abrir-devolver").forEach((b) => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-id")!;
          abrirModalDevolver(id);
        });
      });
    } catch (e: any) {
      containerTabela.innerHTML = `<div class="p-4 text-center text-danger">${e.message || "Erro ao carregar dados."}</div>`;
    }
  }

  function abrirModalDetalhe(id: string): void {
    const op = itensCarregados.find((x) => x.id === id);
    if (!op) return;

    detalheBody.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">ID da Instrução</span>
          <div><code><strong>${op.id}</strong></code></div>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">Canal / Parceiro</span>
          <div><span class="badge badge-secondary">${op.canal.toUpperCase()}</span></div>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">Beneficiário</span>
          <div><strong>${op.beneficiarioNome}</strong></div>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">País de Destino</span>
          <div>${op.beneficiarioPais}</div>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">Banco / Instituição</span>
          <div>${op.beneficiarioBanco}</div>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">Código SWIFT / BIC</span>
          <div><code>${op.beneficiarioSwift || "N/A"}</code></div>
        </div>
        <div style="grid-column: span 2;">
          <span class="text-muted" style="font-size: 0.8rem;">IBAN Internacional</span>
          <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px;">
            <code>${op.beneficiarioIban}</code>
          </div>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">Montante em Divisa</span>
          <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">
            ${Number(op.montante).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} ${op.moeda}
          </div>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.8rem;">Comissão do Parceiro</span>
          <div style="font-size: 1.1rem; font-weight: 700;">
            ${Number(op.comissaoParceiroAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
          </div>
        </div>
      </div>

      ${
        op.referenciaExterna
          ? `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <span class="text-muted" style="font-size: 0.78rem;">Referência Externa de Liquidação:</span>
          <div><strong>${op.referenciaExterna}</strong></div>
          ${op.liquidadoEm ? `<small class="text-muted">Liquidado em: ${new Date(op.liquidadoEm).toLocaleString("pt-AO")}</small>` : ""}
        </div>
      `
          : ""
      }

      ${
        op.motivoDevolucao
          ? `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <span class="text-muted" style="font-size: 0.78rem; color: #f87171;">Motivo da Devolução:</span>
          <div>${op.motivoDevolucao}</div>
        </div>
      `
          : ""
      }
    `;

    modalDetalhe.classList.remove("d-none");
  }

  btnFecharDetalhe.addEventListener("click", () => modalDetalhe.classList.add("d-none"));
  btnFecharDetalheFoot.addEventListener("click", () => modalDetalhe.classList.add("d-none"));

  function abrirModalLiquidar(id: string): void {
    formLiquidar.reset();
    erroLiquidar.classList.add("d-none");
    (container.querySelector("#liquidar-op-id") as HTMLInputElement).value = id;
    modalLiquidar.classList.remove("d-none");
  }

  container.querySelector("#btn-fechar-liquidar")?.addEventListener("click", () => modalLiquidar.classList.add("d-none"));
  container.querySelector("#btn-cancelar-liquidar")?.addEventListener("click", () => modalLiquidar.classList.add("d-none"));

  formLiquidar.addEventListener("submit", async (e) => {
    e.preventDefault();
    erroLiquidar.classList.add("d-none");

    const id = (container.querySelector("#liquidar-op-id") as HTMLInputElement).value;
    const refExt = (container.querySelector("#liquidar-ref-externa") as HTMLInputElement).value.trim();
    const comp = (container.querySelector("#liquidar-comprovativo") as HTMLInputElement).value.trim();
    const notas = (container.querySelector("#liquidar-notas") as HTMLTextAreaElement).value.trim();

    const btnSubmit = container.querySelector("#btn-submit-liquidar") as HTMLButtonElement;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "A liquidar...";

    try {
      const idempotencia = `LIQ-${id}-${Date.now()}`;
      await api.liquidarOperacao(id, {
        referenciaExterna: refExt,
        comprovativoArquivo: comp || undefined,
        notas: notas || undefined,
        chaveIdempotencia: idempotencia,
      });

      modalLiquidar.classList.add("d-none");
      await carregarOperacoes();
    } catch (err: any) {
      erroLiquidar.textContent = err.message || "Erro ao liquidar.";
      erroLiquidar.classList.remove("d-none");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Registar Liquidação";
    }
  });

  function abrirModalDevolver(id: string): void {
    formDevolver.reset();
    erroDevolver.classList.add("d-none");
    (container.querySelector("#devolver-op-id") as HTMLInputElement).value = id;
    modalDevolver.classList.remove("d-none");
  }

  container.querySelector("#btn-fechar-devolver")?.addEventListener("click", () => modalDevolver.classList.add("d-none"));
  container.querySelector("#btn-cancelar-devolver")?.addEventListener("click", () => modalDevolver.classList.add("d-none"));

  formDevolver.addEventListener("submit", async (e) => {
    e.preventDefault();
    erroDevolver.classList.add("d-none");

    const id = (container.querySelector("#devolver-op-id") as HTMLInputElement).value;
    const motivo = (container.querySelector("#devolver-motivo") as HTMLTextAreaElement).value.trim();

    const btnSubmit = container.querySelector("#btn-submit-devolver") as HTMLButtonElement;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "A devolver...";

    try {
      await api.devolverOperacao(id, { motivoDevolucao: motivo });
      modalDevolver.classList.add("d-none");
      await carregarOperacoes();
    } catch (err: any) {
      erroDevolver.textContent = err.message || "Erro ao devolver.";
      erroDevolver.classList.remove("d-none");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Confirmar Devolução";
    }
  });

  // Filtros
  filtroEstado.addEventListener("change", () => carregarOperacoes());
  let timeoutBusca: any;
  filtroBusca.addEventListener("input", () => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => carregarOperacoes(), 300);
  });

  await carregarOperacoes();
}
