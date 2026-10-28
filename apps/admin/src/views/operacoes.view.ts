import { api, type OperacaoItem, type BorderoItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export async function renderizarOperacoes(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) return;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Diário de Operações Cambiais</h1>
        <p class="view-subtitle">Livro de registo oficial, rastreabilidade de liquidações e consulta de borderôs</p>
      </div>
      <div class="view-actions">
        <button id="btn-atualizar-operacoes" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Atualizar Lista
        </button>
      </div>
    </div>

    <!-- Barra de Filtros Rápidos -->
    <div class="card mb-4" style="background: var(--bg-subtle);">
      <div class="card-body" style="padding: 1rem 1.25rem;">
        <div class="form-row">
          <div class="form-group col-4">
            <label class="form-label" for="filtro-operacao-tipo">Tipo de Operação</label>
            <select id="filtro-operacao-tipo" class="form-select">
              <option value="todos">Todas as Operações</option>
              <option value="compra">Compra de Divisas (Entrada USD/EUR)</option>
              <option value="venda">Venda de Divisas (Saída USD/EUR)</option>
            </select>
          </div>
          <div class="form-group col-4">
            <label class="form-label" for="filtro-operacao-moeda">Moeda</label>
            <select id="filtro-operacao-moeda" class="form-select">
              <option value="todas">Todas as Moedas</option>
              <option value="USD">Dólar Norte-Americano (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
          <div class="form-group col-4">
            <label class="form-label" for="filtro-operacao-busca">Pesquisa por N.º Operação / ID</label>
            <input type="text" id="filtro-operacao-busca" class="form-input" placeholder="N.º Operação, Operador ou ID..." />
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela Principal de Operações -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Registos Cambiais Recentes</h2>
        <span id="contador-operacoes" class="badge badge-info">A carregar...</span>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="tabela-operacoes">
          <thead>
            <tr>
              <th>Data & Hora</th>
              <th>N.º Operação</th>
              <th>Operação</th>
              <th>Montante Divisa</th>
              <th>Taxa Câmbio</th>
              <th>Contravalor (AOA)</th>
              <th>Operador</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="lista-operacoes-corpo">
            <tr>
              <td colspan="9" class="text-center p-4">
                <div class="loading-state">A carregar diário de operações cambiais...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Visualização de Borderô -->
    <div id="modal-ver-bordero" class="modal-overlay d-none">
      <div class="modal-container" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title">Comprovativo de Operação Cambial (Borderô)</h3>
          <button id="btn-fechar-modal-bordero" class="btn-fechar-modal">&times;</button>
        </div>
        <div id="conteudo-detalhe-bordero" class="modal-body">
          <div class="loading-state">A consultar dados do borderô...</div>
        </div>
        <div class="modal-footer">
          <button type="button" id="btn-fechar-bordero" class="btn btn-secondary">Fechar</button>
          <button type="button" id="btn-imprimir-bordero-modal" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir Comprovativo
          </button>
        </div>
      </div>
    </div>
  `;

  const corpoTabela = container.querySelector<HTMLTableSectionElement>("#lista-operacoes-corpo")!;
  const contadorEl = container.querySelector<HTMLElement>("#contador-operacoes")!;
  const filtroTipo = container.querySelector<HTMLSelectElement>("#filtro-operacao-tipo")!;
  const filtroMoeda = container.querySelector<HTMLSelectElement>("#filtro-operacao-moeda")!;
  const filtroBusca = container.querySelector<HTMLInputElement>("#filtro-operacao-busca")!;
  const btnAtualizar = container.querySelector<HTMLButtonElement>("#btn-atualizar-operacoes")!;

  const modalBordero = container.querySelector<HTMLDivElement>("#modal-ver-bordero")!;
  const conteudoBordero = container.querySelector<HTMLDivElement>("#conteudo-detalhe-bordero")!;

  let todasOperacoes: OperacaoItem[] = [];

  async function carregarOperacoes(): Promise<void> {
    corpoTabela.innerHTML = `<tr><td colspan="9" class="text-center p-4"><div class="loading-state">A atualizar dados...</div></td></tr>`;

    try {
      const lista = await api.listarOperacoes(100);
      todasOperacoes = Array.isArray(lista) ? lista : [];
      renderizarLinhas();
    } catch {
      corpoTabela.innerHTML = `<tr><td colspan="9" class="text-center p-4 text-danger">Não foi possível carregar o diário de operações.</td></tr>`;
      contadorEl.textContent = "0 operações";
    }
  }

  function renderizarLinhas(): void {
    const tipoVal = filtroTipo.value;
    const moedaVal = filtroMoeda.value;
    const buscaVal = filtroBusca.value.trim().toLowerCase();

    const filtradas = todasOperacoes.filter((op) => {
      if (tipoVal !== "todos" && op.tipo !== tipoVal) return false;
      if (moedaVal !== "todas" && op.moedaDivisa !== moedaVal) return false;
      if (buscaVal) {
        const numOp = (op.numeroOperacao || "").toLowerCase();
        const opNome = (op.operadorNome || "").toLowerCase();
        const cliId = (op.clienteId || "").toLowerCase();
        if (!numOp.includes(buscaVal) && !opNome.includes(buscaVal) && !cliId.includes(buscaVal)) {
          return false;
        }
      }
      return true;
    });

    contadorEl.textContent = `${filtradas.length} de ${todasOperacoes.length} registo(s)`;

    if (filtradas.length === 0) {
      corpoTabela.innerHTML = `
        <tr>
          <td colspan="9" class="text-center p-4 text-muted">
            Nenhuma operação cambial encontrada com os filtros selecionados.
          </td>
        </tr>
      `;
      return;
    }

    corpoTabela.innerHTML = filtradas
      .map((op) => {
        const dataFmt = new Date(op.criadoEm).toLocaleString("pt-AO");
        const ehCompra = op.tipo === "compra";
        const badgeClasse = ehCompra ? "badge-success" : "badge-info";
        const tipoLabel = ehCompra ? "Compra (Entrada Divisa)" : "Venda (Saída Divisa)";
        const estadoBadge = op.estado === "confirmada" ? "badge-success" : op.estado === "estornada" ? "badge-error" : "badge-warning";

        return `
          <tr>
            <td><small class="text-muted">${dataFmt}</small></td>
            <td><strong>${op.numeroOperacao}</strong></td>
            <td><span class="badge ${badgeClasse}">${tipoLabel}</span></td>
            <td><strong>${op.moedaDivisa} ${op.montanteDivisa}</strong></td>
            <td><span class="taxa-val">${op.taxaAplicada}</span></td>
            <td><strong class="text-nowrap">${op.montanteAoa} Kz</strong></td>
            <td><small>${op.operadorNome}</small></td>
            <td><span class="badge ${estadoBadge}">${op.estado.toUpperCase()}</span></td>
            <td>
              <button class="btn btn-sm btn-secondary btn-ver-bordero-op" data-id="${op.id}">
                Borderô
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    corpoTabela.querySelectorAll(".btn-ver-bordero-op").forEach((btn) => {
      btn.addEventListener("click", () => {
        const opId = btn.getAttribute("data-id")!;
        abrirModalBordero(opId);
      });
    });
  }

  async function abrirModalBordero(operacaoId: string): Promise<void> {
    modalBordero.classList.remove("d-none");
    conteudoBordero.innerHTML = `<div class="loading-state">A carregar borderô oficial...</div>`;

    try {
      const res = await api.obterBordero(operacaoId);
      const b: BorderoItem = (res && res.dados ? res.dados : res) as BorderoItem;

      conteudoBordero.innerHTML = `
        <div class="bordero-box" style="padding: 1.5rem; background: #fff; border: 1px solid var(--border-suave); border-radius: var(--radius-md);">
          <div style="text-align: center; border-bottom: 2px solid var(--nz-azul-800); padding-bottom: 1rem; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--nz-azul-800); margin: 0;">NZAIDI — SOCIEDADE DE CÂMBIOS, S.A.</h2>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 0;">Registo BNA N.º 0042/CAM/2026 | NIF: 5418293012 | Luanda, Angola</p>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--nz-dourado-600); margin-top: 6px;">
              BORDERÔ DE OPERAÇÃO CAMBIAL N.º ${b.numeroBordero || operacaoId.slice(0, 8).toUpperCase()}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.84rem; margin-bottom: 1rem;">
            <div>
              <span class="text-muted">Cliente:</span> <strong>${b.clienteNome || "N/A"}</strong><br/>
              <span class="text-muted">Documento:</span> ${b.clienteDocumento || "N/A"}<br/>
              <span class="text-muted">NIF:</span> ${b.clienteNif || "Consumidor Final"}
            </div>
            <div style="text-align: right;">
              <span class="text-muted">Data/Hora:</span> ${new Date(b.emitidoEm || Date.now()).toLocaleString("pt-AO")}<br/>
              <span class="text-muted">Operador:</span> ${b.operadorNome || usuario?.nome || "Operador"}<br/>
              <span class="text-muted">Agência:</span> Balcão Maianga - Sede
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; margin: 1rem 0; border-top: 1px solid var(--border-suave); border-bottom: 1px solid var(--border-suave);">
            <tr style="background: var(--bg-subtle);">
              <td style="padding: 8px;"><strong>Operação</strong></td>
              <td style="padding: 8px; text-align: right;"><strong>${(b.tipoOperacao || "compra").toUpperCase()}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px;">Moeda Negociada:</td>
              <td style="padding: 8px; text-align: right;"><strong>${b.moedaDivisa}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px;">Montante Divisa:</td>
              <td style="padding: 8px; text-align: right;"><strong>${b.montanteDivisa} ${b.moedaDivisa}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px;">Taxa de Câmbio:</td>
              <td style="padding: 8px; text-align: right;">${b.taxaCambio} AOA</td>
            </tr>
            <tr style="background: #fdfaf3; font-size: 1rem;">
              <td style="padding: 10px; color: var(--nz-azul-800);"><strong>Total Liquidado:</strong></td>
              <td style="padding: 10px; text-align: right; color: var(--nz-azul-800);"><strong>${b.totalAoa} Kz</strong></td>
            </tr>
          </table>

          <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; margin-top: 1rem;">
            Documento emitido nos termos do Aviso do Banco Nacional de Angola. Transação auditada e certificada eletronicamente pelo Sistema NZAIDI.
          </div>
        </div>
      `;
    } catch {
      conteudoBordero.innerHTML = `<div class="alert-box alert-error">Não foi possível carregar os detalhes do borderô.</div>`;
    }
  }

  // Eventos de filtro e atualização
  filtroTipo.addEventListener("change", renderizarLinhas);
  filtroMoeda.addEventListener("change", renderizarLinhas);
  filtroBusca.addEventListener("input", renderizarLinhas);
  btnAtualizar.addEventListener("click", carregarOperacoes);

  container.querySelector("#btn-fechar-modal-bordero")?.addEventListener("click", () => modalBordero.classList.add("d-none"));
  container.querySelector("#btn-fechar-bordero")?.addEventListener("click", () => modalBordero.classList.add("d-none"));
  container.querySelector("#btn-imprimir-bordero-modal")?.addEventListener("click", () => window.print());

  await carregarOperacoes();
}
