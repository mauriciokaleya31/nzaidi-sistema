import { api, ApiError, type ClienteItem, type TaxaItem, type BorderoItem, type OperacaoItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import type { MoedaDivisa } from "@nzaidi/dominio";

export async function renderizarBalcao(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Balcão Operacional de Câmbios</h1>
        <p class="view-subtitle">Execução de compra e venda física de divisas com emissão imediata de borderô</p>
      </div>
      <div class="view-actions">
        <a href="#caixa" class="btn btn-secondary">Gestão de Caixa</a>
      </div>
    </div>

    <div id="alerta-balcao" class="alert-box d-none"></div>

    <div id="balcao-verificacao-caixa">
      <div class="loading-state">A verificar caixa operacional e taxas de câmbio...</div>
    </div>

    <!-- Modal Borderô de Câmbio Emitido -->
    <div id="modal-bordero" class="modal-overlay d-none">
      <div class="modal-container" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title">Borderô de Câmbio Emitido com Sucesso</h3>
          <button id="btn-fechar-modal-bordero" class="btn-fechar-modal">&times;</button>
        </div>
        <div class="modal-body" id="bordero-impresso-conteudo">
          <!-- Conteúdo gerado dinamicamente -->
        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between;">
          <button type="button" id="btn-imprimir-bordero" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir Borderô Oficial
          </button>
          <button type="button" id="btn-concluir-bordero" class="btn btn-secondary">Concluir</button>
        </div>
      </div>
    </div>
  `;

  const containerCaixa = container.querySelector<HTMLDivElement>("#balcao-verificacao-caixa");
  const alerta = container.querySelector<HTMLDivElement>("#alerta-balcao");
  const modalBordero = container.querySelector<HTMLDivElement>("#modal-bordero");
  const conteudoBordero = container.querySelector<HTMLDivElement>("#bordero-impresso-conteudo");

  // 1. Verificar Caixa Ativo do Operador
  let dadosCaixa = null;
  try {
    dadosCaixa = await api.obterCaixaAtivo();
  } catch (err: any) {
    if (containerCaixa) {
      containerCaixa.innerHTML = `
        <div class="alert-box alert-error">
          Erro ao verificar estado do caixa: ${err.message || "Falha na comunicação"}.
          <button id="btn-tentar-caixa" class="btn btn-sm btn-secondary ml-2">Tentar Novamente</button>
        </div>
      `;
      containerCaixa.querySelector("#btn-tentar-caixa")?.addEventListener("click", () => void renderizarBalcao(container));
    }
    return;
  }

  if (!dadosCaixa || !dadosCaixa.caixa) {
    if (containerCaixa) {
      containerCaixa.innerHTML = `
        <div class="card p-4 text-center">
          <div class="mb-4" style="font-size: 3rem;">⚠️</div>
          <h2 class="text-xl font-bold mb-2">Caixa do Operador Não Encontrado</h2>
          <p class="text-muted mb-4">
            Para realizar operações de compra e venda de moeda estrangeira, é obrigatório abrir um caixa operacional com os respetivos fundos iniciais de Kwanza e divisas.
          </p>
          <a href="#caixa" class="btn btn-primary" style="display: inline-block;">
            Abrir Caixa Agora →
          </a>
        </div>
      `;
    }
    return;
  }

  // 2. Carregar Taxas do Dia
  let taxas: TaxaItem[] = [];
  try {
    taxas = await api.listarTaxas();
  } catch (err: any) {
    if (alerta) {
      alerta.textContent = `Aviso: Falha ao carregar taxas de câmbio: ${err.message}.`;
      alerta.classList.remove("d-none");
    }
  }

  if (!containerCaixa) return;

  containerCaixa.innerHTML = `
    <div class="dashboard-grid">
      <!-- Painel de Execução da Operação -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h2 class="card-title">Nova Operação Cambial</h2>
          <span class="badge badge-success">Caixa: ${dadosCaixa.caixa.numeroCaixa}</span>
        </div>
        <div class="card-body">
          <form id="form-operacao-balcao">
            <div id="erro-operacao" class="alert-box alert-error d-none"></div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="op-cliente" style="margin-bottom: 0;">
                  Cliente (KYC Aprovado) *
                </label>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span id="status-clientes-badge" class="badge badge-warning" style="font-size: 0.75rem;">A carregar...</span>
                  <button type="button" id="btn-recarregar-clientes" class="btn btn-sm btn-link" style="padding: 2px 6px; font-size: 0.8rem; text-decoration: none; border: 1px solid #cbd5e1; border-radius: 4px;" title="Atualizar lista de clientes">
                    ↻ Atualizar
                  </button>
                </div>
              </div>

              <!-- Container Dinâmico e Reativo de Seleção de Clientes -->
              <div id="grupo-cliente-container">
                <select id="op-cliente" class="form-select" disabled>
                  <option value="">A carregar clientes com KYC aprovado...</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-6">
                <label class="form-label">Tipo de Transação</label>
                <select id="op-tipo" class="form-select">
                  <option value="compra">Compra de Divisa (Cliente entrega moeda estrangeira)</option>
                  <option value="venda">Venda de Divisa (Cliente adquire moeda estrangeira)</option>
                </select>
              </div>

              <div class="form-group col-6">
                <label class="form-label">Moeda Estrangeira</label>
                <select id="op-moeda" class="form-select">
                  <option value="USD">Dólar Norte-Americano (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="op-montante">Quantidade da Divisa</label>
              <input type="text" id="op-montante" class="form-input" value="100.00" required />
            </div>

            <!-- Resumo e Cálculo Seguro em Tempo Real -->
            <div class="simulador-resumo-box p-4 mb-4" style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="text-sm text-muted">Taxa de Balcão Aplicada:</span>
                <strong id="sim-taxa-texto">0.0000 AOA</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="text-sm text-muted">Validade da Cotação:</span>
                <span id="sim-timer-texto" class="badge badge-warning">90s restantes</span>
              </div>
              <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 8px 0;" />
              <div style="display: flex; justify-content: space-between; font-size: 1.1rem;">
                <strong>Total em Kwanzas:</strong>
                <strong id="sim-total-texto" style="color: #052D62;">0.00 AOA</strong>
              </div>
            </div>

            <button type="submit" id="btn-submeter-operacao" class="btn btn-primary btn-block" disabled>
              Confirmar Operação & Emitir Borderô
            </button>
          </form>
        </div>
      </div>

      <!-- Saldos em Caixa & Cotações do Momento -->
      <div>
        <div class="card mb-4">
          <div class="card-header">
            <h2 class="card-title">Disponibilidade do Caixa</h2>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; padding: 8px; background: #f1f5f9; border-radius: 6px;">
                <span>Disponível em Kwanza:</span>
                <strong>${dadosCaixa.saldos.AOA.saldoEsperado} AOA</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px; background: #f1f5f9; border-radius: 6px;">
                <span>Disponível em Dólares:</span>
                <strong>$ ${dadosCaixa.saldos.USD.saldoEsperado}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px; background: #f1f5f9; border-radius: 6px;">
                <span>Disponível em Euros:</span>
                <strong>€ ${dadosCaixa.saldos.EUR.saldoEsperado}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Tabela de Balcão do Dia</h2>
          </div>
          <div class="card-body p-0">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Moeda</th>
                  <th>Compra</th>
                  <th>Venda</th>
                </tr>
              </thead>
              <tbody>
                ${taxas
                  .map(
                    (t) => `
                  <tr>
                    <td><strong>${t.moeda}</strong></td>
                    <td><span class="taxa-val taxa-compra">${t.compra}</span></td>
                    <td><span class="taxa-val taxa-venda">${t.venda}</span></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Elementos do formulário e simulação
  const formOp = containerCaixa.querySelector<HTMLFormElement>("#form-operacao-balcao");
  const selectTipo = containerCaixa.querySelector<HTMLSelectElement>("#op-tipo");
  const selectMoeda = containerCaixa.querySelector<HTMLSelectElement>("#op-moeda");
  const inputMontante = containerCaixa.querySelector<HTMLInputElement>("#op-montante");
  const simTaxa = containerCaixa.querySelector<HTMLElement>("#sim-taxa-texto");
  const simTotal = containerCaixa.querySelector<HTMLElement>("#sim-total-texto");
  const simTimer = containerCaixa.querySelector<HTMLElement>("#sim-timer-texto");
  const erroDiv = containerCaixa.querySelector<HTMLDivElement>("#erro-operacao");
  const btnSubmeter = containerCaixa.querySelector<HTMLButtonElement>("#btn-submeter-operacao");
  const grupoClienteContainer = containerCaixa.querySelector<HTMLDivElement>("#grupo-cliente-container");
  const statusClientesBadge = containerCaixa.querySelector<HTMLElement>("#status-clientes-badge");
  const btnRecarregarClientes = containerCaixa.querySelector<HTMLButtonElement>("#btn-recarregar-clientes");

  let cotacaoCriadaEm = new Date().toISOString();
  let timerInterval: any = null;
  let segundosRestantes = 90;
  let carregandoClientes = false;
  let clientesElegiveis: ClienteItem[] = [];

  function iniciarTimerCotacao(): void {
    if (timerInterval) clearInterval(timerInterval);
    segundosRestantes = 90;
    cotacaoCriadaEm = new Date().toISOString();

    timerInterval = setInterval(() => {
      segundosRestantes--;
      if (simTimer) {
        if (segundosRestantes > 0) {
          simTimer.textContent = `${segundosRestantes}s restantes`;
          simTimer.className = segundosRestantes <= 15 ? "badge badge-danger" : "badge badge-warning";
        } else {
          simTimer.textContent = "Expirada (Clique para Recotar)";
          simTimer.className = "badge badge-danger";
          if (btnSubmeter) btnSubmeter.disabled = true;
        }
      }
      if (segundosRestantes <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  }

  function recalcularSimulacao(): void {
    const selectClienteAtual = containerCaixa?.querySelector<HTMLSelectElement>("#op-cliente");
    const moeda = (selectMoeda?.value || "USD") as MoedaDivisa;
    const tipo = selectTipo?.value || "compra";
    const taxaItem = taxas.find((t) => t.moeda === moeda);
    const montante = parseFloat(inputMontante?.value || "0");

    if (!taxaItem || isNaN(montante) || montante <= 0) {
      if (simTaxa) simTaxa.textContent = "-";
      if (simTotal) simTotal.textContent = "0.00 AOA";
      if (btnSubmeter) btnSubmeter.disabled = true;
      return;
    }

    const taxa = tipo === "compra" ? parseFloat(taxaItem.compra) : parseFloat(taxaItem.venda);
    const total = montante * taxa;

    if (simTaxa) simTaxa.textContent = `${taxa.toFixed(4)} AOA`;
    if (simTotal) simTotal.textContent = `${total.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AOA`;

    // Só habilita o botão se houver cliente válido selecionado
    if (btnSubmeter) {
      btnSubmeter.disabled = !selectClienteAtual || !selectClienteAtual.value || selectClienteAtual.value === "";
    }
    iniciarTimerCotacao();
  }

  // Função centralizada para carregar/atualizar a lista de clientes elegíveis
  async function atualizarListaClientes(clienteSelecionadoId?: string): Promise<void> {
    if (carregandoClientes) return;
    carregandoClientes = true;

    if (statusClientesBadge) {
      statusClientesBadge.textContent = "A atualizar...";
      statusClientesBadge.className = "badge badge-warning";
    }
    if (btnRecarregarClientes) btnRecarregarClientes.disabled = true;

    try {
      // Requisitar estritamente clientes com estado KYC aprovado
      clientesElegiveis = await api.listarClientes("", "aprovado");

      if (statusClientesBadge) {
        statusClientesBadge.textContent = `${clientesElegiveis.length} elegível(eis)`;
        statusClientesBadge.className = clientesElegiveis.length > 0 ? "badge badge-success" : "badge badge-warning";
      }

      if (grupoClienteContainer) {
        if (clientesElegiveis.length === 0) {
          grupoClienteContainer.innerHTML = `
            <select id="op-cliente" class="form-select" disabled>
              <option value="">Nenhum cliente com KYC aprovado disponível</option>
            </select>
            <div class="alert-box alert-warning mt-2" style="font-size: 0.85rem; padding: 10px 14px;">
              ⚠️ <strong>Nenhum cliente elegível.</strong> Operações cambiais requerem estritamente diligência de identificação concluída. Clientes com KYC pendente ou rejeitado não são selecionáveis.
              <div style="margin-top: 6px;">
                <a href="#clientes" style="color: var(--nz-azul-600); font-weight: 600; text-decoration: underline;">
                  Aceder a Clientes & KYC para registar ou aprovar dossiês →
                </a>
              </div>
            </div>
          `;
          if (btnSubmeter) btnSubmeter.disabled = true;
        } else {
          const opcoes = clientesElegiveis
            .map(
              (c) => `
            <option value="${c.id}" ${clienteSelecionadoId === c.id ? "selected" : ""}>
              ${c.nome} (${c.tipoDocumento.toUpperCase()}: ${c.numeroDocumento})
            </option>
          `
            )
            .join("");

          grupoClienteContainer.innerHTML = `
            <select id="op-cliente" class="form-select" required>
              <option value="">Selecione um cliente aprovado...</option>
              ${opcoes}
            </select>
            <small class="text-muted" style="font-size: 0.8rem; display: block; margin-top: 4px;">
              ✓ Verificação documental e conformidade regulamentar BNA aprovadas.
            </small>
          `;

          const novoSelect = grupoClienteContainer.querySelector<HTMLSelectElement>("#op-cliente");
          novoSelect?.addEventListener("change", recalcularSimulacao);
        }
      }
    } catch (err: any) {
      if (statusClientesBadge) {
        statusClientesBadge.textContent = "Erro de rede";
        statusClientesBadge.className = "badge badge-danger";
      }
      if (grupoClienteContainer) {
        grupoClienteContainer.innerHTML = `
          <div class="alert-box alert-error" style="font-size: 0.85rem; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
            <span>Falha ao obter lista de clientes elegíveis: ${err.message || "Erro de ligação"}.</span>
            <button type="button" id="btn-tentar-novamente-clientes" class="btn btn-sm btn-secondary">
              Tentar Novamente
            </button>
          </div>
        `;
        grupoClienteContainer
          .querySelector("#btn-tentar-novamente-clientes")
          ?.addEventListener("click", () => void atualizarListaClientes());
      }
    } finally {
      carregandoClientes = false;
      if (btnRecarregarClientes) btnRecarregarClientes.disabled = false;
      recalcularSimulacao();
    }
  }

  btnRecarregarClientes?.addEventListener("click", () => {
    const atualId = containerCaixa?.querySelector<HTMLSelectElement>("#op-cliente")?.value;
    void atualizarListaClientes(atualId);
  });

  selectTipo?.addEventListener("change", recalcularSimulacao);
  selectMoeda?.addEventListener("change", recalcularSimulacao);
  inputMontante?.addEventListener("input", recalcularSimulacao);
  simTimer?.addEventListener("click", recalcularSimulacao);

  // Carregamento inicial automático da lista
  await atualizarListaClientes();

  // Submissão da operação cambial
  formOp?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectClienteAtual = containerCaixa.querySelector<HTMLSelectElement>("#op-cliente");
    if (!selectClienteAtual?.value || !selectTipo || !selectMoeda || !inputMontante) {
      if (erroDiv) {
        erroDiv.textContent = "Selecione um cliente com KYC aprovado e informe o montante.";
        erroDiv.classList.remove("d-none");
      }
      return;
    }

    erroDiv?.classList.add("d-none");
    if (btnSubmeter) btnSubmeter.disabled = true;

    // Chave de idempotência única no cliente
    const chaveIdempotencia = `idem_${crypto.randomUUID()}`;

    try {
      const res = await api.criarOperacao({
        chaveIdempotencia,
        clienteId: selectClienteAtual.value,
        tipo: selectTipo.value as any,
        moedaDivisa: selectMoeda.value as any,
        montanteDivisa: inputMontante.value,
        cotacaoCriadaEm,
      });

      // Exibir Borderô no Modal
      if (conteudoBordero) {
        const b = res.bordero;
        conteudoBordero.innerHTML = `
          <div class="bordero-box p-4" style="border: 2px solid #052D62; border-radius: 8px; background: #fff;">
            <div style="text-align: center; border-bottom: 2px solid #CC9638; padding-bottom: 12px; margin-bottom: 12px;">
              <h2 style="color: #052D62; margin: 0; font-size: 1.3rem;">NZAIDI — Casa de Câmbios & Transferência, Lda.</h2>
              <small class="text-muted">Instituição Não Bancária Sujeita à Supervisão do BNA | Balcão Maianga — Sede</small>
              <div style="margin-top: 6px;"><strong>BORDERÔ OFICIAL DE CÂMBIO</strong></div>
              <div><small><strong>N.º:</strong> ${b.numeroBordero}</small></div>
            </div>

            <div style="margin-bottom: 12px; font-size: 0.9rem;">
              <div><strong>Cliente:</strong> ${b.clienteNome}</div>
              <div><strong>Documento:</strong> ${b.clienteDocumento}</div>
              <div><strong>NIF:</strong> ${b.clienteNif}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; padding: 10px; border-radius: 6px;">
              <div><strong>Tipo de Operação:</strong> ${b.tipoOperacao.toUpperCase()}</div>
              <div><strong>Moeda:</strong> ${b.moedaDivisa}</div>
              <div><strong>Montante Divisa:</strong> ${b.montanteDivisa} ${b.moedaDivisa}</div>
              <div><strong>Taxa de Câmbio:</strong> ${b.taxaCambio} AOA</div>
              <div style="grid-column: span 2; font-size: 1.1rem; color: #052D62; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
                <strong>Total Liquidado:</strong> ${b.totalAoa} AOA
              </div>
            </div>

            <div style="font-size: 0.8rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <div><strong>Operador de Balcão:</strong> ${b.operadorNome}</div>
              <div><strong>Data/Hora de Emissão:</strong> ${new Date(b.emitidoEm).toLocaleString("pt-AO")}</div>
              <div style="word-break: break-all; margin-top: 4px;">
                <strong>Assinatura Criptográfica (SHA-256):</strong> <code>${b.hashVerificacao}</code>
              </div>
            </div>
          </div>
        `;
      }

      modalBordero?.classList.remove("d-none");
    } catch (err: any) {
      if (erroDiv) {
        erroDiv.textContent = err instanceof ApiError ? err.message : "Erro ao concluir operação cambial.";
        erroDiv.classList.remove("d-none");
      }
      if (btnSubmeter) btnSubmeter.disabled = false;
    }
  });

  // Modal Borderô botões
  container.querySelector("#btn-fechar-modal-bordero")?.addEventListener("click", () => {
    modalBordero?.classList.add("d-none");
    void renderizarBalcao(container);
  });
  container.querySelector("#btn-concluir-bordero")?.addEventListener("click", () => {
    modalBordero?.classList.add("d-none");
    void renderizarBalcao(container);
  });
  container.querySelector("#btn-imprimir-bordero")?.addEventListener("click", () => {
    window.print();
  });
}
