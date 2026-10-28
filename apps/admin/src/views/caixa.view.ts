import { api, ApiError, type CaixaAtivoResposta } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export async function renderizarCaixa(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) return;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestão de Caixa & Tesouraria</h1>
        <p class="view-subtitle">Controlo diário de fundos, movimentos financeiros e fecho físico de balcão</p>
      </div>
      <div class="view-actions" id="caixa-acoes-topo"></div>
    </div>

    <div id="alerta-caixa" class="alert-box d-none"></div>

    <div id="caixa-conteudo">
      <div class="loading-state">A verificar estado do caixa do operador...</div>
    </div>

    <!-- Modal Suprimento / Sangria -->
    <div id="modal-movimento" class="modal-overlay d-none">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title" id="modal-mov-titulo">Registar Movimento de Caixa</h3>
          <button id="btn-fechar-modal-mov" class="btn-fechar-modal">&times;</button>
        </div>
        <form id="form-movimento" class="modal-form">
          <input type="hidden" id="mov-tipo" />
          <div id="modal-erro-mov" class="alert-box alert-error d-none"></div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Moeda</label>
              <select id="mov-moeda" class="form-select">
                <option value="AOA">Kwanza (AOA)</option>
                <option value="USD">Dólar Norte-Americano (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div class="form-group col-6">
              <label class="form-label" for="mov-montante">Montante</label>
              <input type="text" id="mov-montante" class="form-input" placeholder="Ex: 50000.00" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="mov-descricao">Motivo / Descrição Formal</label>
            <input type="text" id="mov-descricao" class="form-input" placeholder="Ex: Suprimento matinal a partir do cofre central" required />
          </div>

          <div class="modal-footer">
            <button type="button" id="btn-cancelar-mov" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-salvar-mov" class="btn btn-primary">Confirmar Movimento</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Fecho de Caixa -->
    <div id="modal-fecho" class="modal-overlay d-none">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">Encerramento & Conferência Física de Caixa</h3>
          <button id="btn-fechar-modal-fecho" class="btn-fechar-modal">&times;</button>
        </div>
        <form id="form-fecho" class="modal-form">
          <div id="modal-erro-fecho" class="alert-box alert-error d-none"></div>

          <p class="text-sm text-muted mb-4">
            Introduza a contagem física das notas apuradas na gaveta do balcão para cada moeda.
          </p>

          <div class="form-row">
            <div class="form-group col-4">
              <label class="form-label" for="fecho-aoa">Contagem AOA (Kz)</label>
              <input type="text" id="fecho-aoa" class="form-input" required placeholder="0.00" />
            </div>
            <div class="form-group col-4">
              <label class="form-label" for="fecho-usd">Contagem USD ($)</label>
              <input type="text" id="fecho-usd" class="form-input" required placeholder="0.00" />
            </div>
            <div class="form-group col-4">
              <label class="form-label" for="fecho-eur">Contagem EUR (€)</label>
              <input type="text" id="fecho-eur" class="form-input" required placeholder="0.00" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="fecho-justificativa">
              Justificação de Quebras ou Sobras (Obrigatória se houver discrepância)
            </label>
            <textarea 
              id="fecho-justificativa" 
              class="form-textarea" 
              rows="3" 
              placeholder="Explique eventuais diferenças entre a contagem física e o saldo calculado pelo sistema..."
            ></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" id="btn-cancelar-fecho" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-salvar-fecho" class="btn btn-danger">Concluir Fecho de Caixa</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const containerConteudo = container.querySelector<HTMLDivElement>("#caixa-conteudo");
  const acoesTopo = container.querySelector<HTMLDivElement>("#caixa-acoes-topo");
  const alerta = container.querySelector<HTMLDivElement>("#alerta-caixa");

  const modalMov = container.querySelector<HTMLDivElement>("#modal-movimento");
  const modalFecho = container.querySelector<HTMLDivElement>("#modal-fecho");
  const formMov = container.querySelector<HTMLFormElement>("#form-movimento");
  const formFecho = container.querySelector<HTMLFormElement>("#form-fecho");

  let caixaAtual: CaixaAtivoResposta | null = null;

  // Listeners estáticos dos modais (registados uma única vez)
  container.querySelector("#btn-fechar-modal-mov")?.addEventListener("click", () => modalMov?.classList.add("d-none"));
  container.querySelector("#btn-cancelar-mov")?.addEventListener("click", () => modalMov?.classList.add("d-none"));
  container.querySelector("#btn-fechar-modal-fecho")?.addEventListener("click", () => modalFecho?.classList.add("d-none"));
  container.querySelector("#btn-cancelar-fecho")?.addEventListener("click", () => modalFecho?.classList.add("d-none"));

  // Submissão do movimento manual (registada uma única vez, sem duplicação de requests)
  formMov?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!caixaAtual?.caixa) return;

    const tipo = (container.querySelector("#mov-tipo") as HTMLInputElement).value as any;
    const moeda = (container.querySelector("#mov-moeda") as HTMLSelectElement).value as any;
    const montante = (container.querySelector("#mov-montante") as HTMLInputElement).value;
    const descricao = (container.querySelector("#mov-descricao") as HTMLInputElement).value;
    const erroMov = container.querySelector("#modal-erro-mov") as HTMLDivElement;

    try {
      await api.movimentarCaixa(caixaAtual.caixa.id, { tipo, moeda, montante, descricao });
      modalMov?.classList.add("d-none");
      formMov.reset();
      await atualizarVisualizacao();
    } catch (err) {
      erroMov.textContent = err instanceof ApiError ? err.message : "Erro ao registar movimento.";
      erroMov.classList.remove("d-none");
    }
  });

  // Submissão do Fecho de Caixa (registada uma única vez)
  formFecho?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!caixaAtual?.caixa) return;

    const contadoAoa = (container.querySelector("#fecho-aoa") as HTMLInputElement).value;
    const contadoUsd = (container.querySelector("#fecho-usd") as HTMLInputElement).value;
    const contadoEur = (container.querySelector("#fecho-eur") as HTMLInputElement).value;
    const justificativa = (container.querySelector("#fecho-justificativa") as HTMLTextAreaElement).value;
    const erroFecho = container.querySelector("#modal-erro-fecho") as HTMLDivElement;

    try {
      await api.fecharCaixa(caixaAtual.caixa.id, {
        saldoContadoAoa: contadoAoa,
        saldoContadoUsd: contadoUsd,
        saldoContadoEur: contadoEur,
        justificativaDiferenca: justificativa,
      });

      modalFecho?.classList.add("d-none");
      formFecho.reset();
      if (alerta) {
        alerta.className = "alert-box alert-success";
        alerta.textContent = "Caixa encerrado com sucesso!";
        alerta.classList.remove("d-none");
        setTimeout(() => alerta.classList.add("d-none"), 5000);
      }
      await atualizarVisualizacao();
    } catch (err) {
      erroFecho.textContent = err instanceof ApiError ? err.message : "Erro ao encerrar caixa.";
      erroFecho.classList.remove("d-none");
    }
  });

  async function atualizarVisualizacao(): Promise<void> {
    if (!containerConteudo || !acoesTopo) return;
    containerConteudo.innerHTML = `<div class="loading-state">A verificar estado do caixa...</div>`;
    acoesTopo.innerHTML = "";

    try {
      caixaAtual = await api.obterCaixaAtivo();

      if (!caixaAtual || !caixaAtual.caixa) {
        // Operador sem caixa aberto: apresentar ecrã de Abertura
        containerConteudo.innerHTML = `
          <div class="card" style="max-width: 650px; margin: 0 auto;">
            <div class="card-header">
              <h2 class="card-title">Abertura de Caixa Operacional</h2>
            </div>
            <div class="card-body">
              <p class="text-muted mb-4">
                O operador <strong>${usuario?.nome}</strong> não possui nenhum caixa aberto no momento. Defina os fundos iniciais entregues pela Tesouraria para iniciar os atendimentos de balcão.
              </p>

              <form id="form-abrir-caixa">
                <div id="erro-abertura" class="alert-box alert-error d-none"></div>

                <div class="form-group">
                  <label class="form-label" for="abrir-agencia">Agência / Ponto de Atendimento</label>
                  <input type="text" id="abrir-agencia" class="form-input" value="Balcão Maianga - Sede" required />
                </div>

                <div class="form-row">
                  <div class="form-group col-4">
                    <label class="form-label" for="abrir-aoa">Fundo Inicial AOA (Kz)</label>
                    <input type="text" id="abrir-aoa" class="form-input" required placeholder="0.00" value="0.00" />
                  </div>
                  <div class="form-group col-4">
                    <label class="form-label" for="abrir-usd">Fundo Inicial USD ($)</label>
                    <input type="text" id="abrir-usd" class="form-input" required placeholder="0.00" value="0.00" />
                  </div>
                  <div class="form-group col-4">
                    <label class="form-label" for="abrir-eur">Fundo Inicial EUR (€)</label>
                    <input type="text" id="abrir-eur" class="form-input" required placeholder="0.00" value="0.00" />
                  </div>
                </div>

                <div class="mt-4">
                  <button type="submit" id="btn-confirmar-abertura" class="btn btn-primary btn-block">
                    Abrir Caixa Operacional
                  </button>
                </div>
              </form>
            </div>
          </div>
        `;

        const formAbrir = containerConteudo.querySelector<HTMLFormElement>("#form-abrir-caixa");
        formAbrir?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const agencia = (containerConteudo.querySelector("#abrir-agencia") as HTMLInputElement).value;
          const saldoAoa = (containerConteudo.querySelector("#abrir-aoa") as HTMLInputElement).value;
          const saldoUsd = (containerConteudo.querySelector("#abrir-usd") as HTMLInputElement).value;
          const saldoEur = (containerConteudo.querySelector("#abrir-eur") as HTMLInputElement).value;
          const erroDiv = containerConteudo.querySelector("#erro-abertura") as HTMLDivElement;

          try {
            await api.abrirCaixa({
              agencia,
              saldoInicialAoa: saldoAoa,
              saldoInicialUsd: saldoUsd,
              saldoInicialEur: saldoEur,
            });

            if (alerta) {
              alerta.className = "alert-box alert-success";
              alerta.textContent = "Caixa operacional aberto com sucesso!";
              alerta.classList.remove("d-none");
              setTimeout(() => alerta.classList.add("d-none"), 5000);
            }
            await atualizarVisualizacao();
          } catch (err) {
            erroDiv.textContent = err instanceof ApiError ? err.message : "Erro ao abrir caixa.";
            erroDiv.classList.remove("d-none");
          }
        });

        return;
      }

      // Caixa aberto: apresentar saldos e controlos
      const { caixa, saldos } = caixaAtual;

      acoesTopo.innerHTML = `
        <button id="btn-suprimento" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
          Suprimento (+ Entrada)
        </button>
        <button id="btn-sangria" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14"/></svg>
          Sangria (- Saída)
        </button>
        <button id="btn-abrir-fecho" class="btn btn-danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Fechar Caixa
        </button>
      `;

      containerConteudo.innerHTML = `
        <div class="card mb-4">
          <div class="card-header">
            <div>
              <h2 class="card-title">${caixa.numeroCaixa} — ${caixa.agencia}</h2>
              <span class="text-sm text-muted">Aberto em ${new Date(caixa.abertoEm).toLocaleString("pt-AO")}</span>
            </div>
            <span class="badge badge-success">CAIXA ABERTO</span>
          </div>
          <div class="card-body">
            <div class="dashboard-grid">
              <!-- AOA -->
              <div class="saldo-card">
                <div class="saldo-moeda-title">Kwanza Angolano (AOA)</div>
                <div class="saldo-valor-destaque">${saldos.AOA.saldoEsperado} Kz</div>
                <div class="saldo-detalhes">
                  <div><small>Inicial: ${saldos.AOA.saldoInicial}</small></div>
                  <div><small class="text-success">+ Entradas: ${saldos.AOA.entradas}</small></div>
                  <div><small class="text-danger">- Saídas: ${saldos.AOA.saidas}</small></div>
                </div>
              </div>

              <!-- USD -->
              <div class="saldo-card">
                <div class="saldo-moeda-title">Dólar Norte-Americano (USD)</div>
                <div class="saldo-valor-destaque">$ ${saldos.USD.saldoEsperado}</div>
                <div class="saldo-detalhes">
                  <div><small>Inicial: ${saldos.USD.saldoInicial}</small></div>
                  <div><small class="text-success">+ Entradas: ${saldos.USD.entradas}</small></div>
                  <div><small class="text-danger">- Saídas: ${saldos.USD.saidas}</small></div>
                </div>
              </div>

              <!-- EUR -->
              <div class="saldo-card">
                <div class="saldo-moeda-title">Euro (EUR)</div>
                <div class="saldo-valor-destaque">€ ${saldos.EUR.saldoEsperado}</div>
                <div class="saldo-detalhes">
                  <div><small>Inicial: ${saldos.EUR.saldoInicial}</small></div>
                  <div><small class="text-success">+ Entradas: ${saldos.EUR.entradas}</small></div>
                  <div><small class="text-danger">- Saídas: ${saldos.EUR.saidas}</small></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Ações rápidas do topo
      acoesTopo.querySelector("#btn-suprimento")?.addEventListener("click", () => {
        (container.querySelector("#mov-tipo") as HTMLInputElement).value = "suprimento";
        (container.querySelector("#modal-mov-titulo") as HTMLElement).textContent = "Registar Suprimento (+ Entrada)";
        modalMov?.classList.remove("d-none");
      });

      acoesTopo.querySelector("#btn-sangria")?.addEventListener("click", () => {
        (container.querySelector("#mov-tipo") as HTMLInputElement).value = "sangria";
        (container.querySelector("#modal-mov-titulo") as HTMLElement).textContent = "Registar Sangria (- Saída para Cofre)";
        modalMov?.classList.remove("d-none");
      });

      acoesTopo.querySelector("#btn-abrir-fecho")?.addEventListener("click", () => {
        (container.querySelector("#fecho-aoa") as HTMLInputElement).value = saldos.AOA.saldoEsperado;
        (container.querySelector("#fecho-usd") as HTMLInputElement).value = saldos.USD.saldoEsperado;
        (container.querySelector("#fecho-eur") as HTMLInputElement).value = saldos.EUR.saldoEsperado;
        modalFecho?.classList.remove("d-none");
      });

    } catch {
      containerConteudo.innerHTML = `<p class="p-4 text-danger">Erro ao carregar módulo de caixa.</p>`;
    }
  }

  await atualizarVisualizacao();
}
