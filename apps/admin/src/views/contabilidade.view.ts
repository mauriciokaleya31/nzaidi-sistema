import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export function renderizarContabilidade(container: HTMLElement): void {
  const usuario = authState.getUsuario();
  const podeEstornar = usuario?.funcao === "gestao" || usuario?.funcao === "tesouraria";

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Contabilidade & Livro Razão</h1>
        <p class="view-subtitle">Escrituração em partidas dobradas, balancete analítico e reconciliação financeira inviolável.</p>
      </div>
      <div class="view-actions">
        <button id="btn-exportar-razao-csv" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Exportar Razão (CSV)
        </button>
        <button id="btn-executar-reconciliacao" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Varredura de Reconciliação
        </button>
      </div>
    </div>

    <div class="tabs-nav" style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
      <button id="tab-razao" class="btn btn-sm btn-primary">Livro Razão (Partidas Dobradas)</button>
      <button id="tab-balancete" class="btn btn-sm btn-secondary">Balancete de Verificação</button>
      <button id="tab-divergencias" class="btn btn-sm btn-secondary">Reconciliação & Divergências</button>
    </div>

    <!-- PAINEL 1: LIVRO RAZÃO -->
    <div id="painel-razao">
      <div class="card" style="margin-bottom: 20px; padding: 16px;">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Data Início</label>
            <input type="date" id="filtro-data-inicio" class="form-input" style="padding: 6px 10px; font-size: 13px;" />
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Data Fim</label>
            <input type="date" id="filtro-data-fim" class="form-input" style="padding: 6px 10px; font-size: 13px;" />
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Tipo de Origem</label>
            <select id="filtro-origem-tipo" class="form-input" style="padding: 6px 10px; font-size: 13px;">
              <option value="">Todos os Tipos</option>
              <option value="cambio_balcao">Câmbio Balcão</option>
              <option value="cambio_online">Câmbio Online</option>
              <option value="remessa_cliente">Remessas de Clientes</option>
              <option value="liquidacao_parceiro">Liquidações Parceiros</option>
              <option value="suprimento_caixa">Suprimento / Reforço</option>
              <option value="sangria_caixa">Sangria de Caixa</option>
              <option value="quebra_fecho_caixa">Quebra de Fecho</option>
              <option value="sobra_fecho_caixa">Sobra de Fecho</option>
              <option value="estorno_operacao">Estornos / Reversões</option>
            </select>
          </div>
          <button id="btn-filtrar-razao" class="btn btn-secondary" style="height: 38px;">Filtrar</button>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: var(--bg-surface-secondary); text-align: left;">
                <th style="padding: 12px 16px;">Data</th>
                <th style="padding: 12px 16px;">Nº Lançamento</th>
                <th style="padding: 12px 16px;">Conta Contábil</th>
                <th style="padding: 12px 16px;">D/C</th>
                <th style="padding: 12px 16px;">Montante AOA</th>
                <th style="padding: 12px 16px;">Moeda Orig.</th>
                <th style="padding: 12px 16px;">Descrição</th>
                <th style="padding: 12px 16px;">Operador</th>
                <th style="padding: 12px 16px;">Estado</th>
                <th style="padding: 12px 16px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="corpo-tabela-razao">
              <tr><td colspan="10" style="text-align: center; padding: 32px;">A carregar livro razão...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PAINEL 2: BALANCETE DE VERIFICAÇÃO -->
    <div id="painel-balancete" style="display: none;">
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: var(--bg-surface-secondary); text-align: left;">
                <th style="padding: 12px 16px;">Código</th>
                <th style="padding: 12px 16px;">Nome da Conta</th>
                <th style="padding: 12px 16px;">Tipo</th>
                <th style="padding: 12px 16px;">Natureza</th>
                <th style="padding: 12px 16px; text-align: right;">Total Débito (AOA)</th>
                <th style="padding: 12px 16px; text-align: right;">Total Crédito (AOA)</th>
                <th style="padding: 12px 16px; text-align: right;">Saldo Líquido (AOA)</th>
              </tr>
            </thead>
            <tbody id="corpo-tabela-balancete">
              <tr><td colspan="7" style="text-align: center; padding: 32px;">A carregar balancete...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PAINEL 3: RECONCILIAÇÃO & DIVERGÊNCIAS -->
    <div id="painel-divergencias" style="display: none;">
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: var(--bg-surface-secondary); text-align: left;">
                <th style="padding: 12px 16px;">Tipo de Divergência</th>
                <th style="padding: 12px 16px;">Origem / Referência</th>
                <th style="padding: 12px 16px;">Valor Esperado</th>
                <th style="padding: 12px 16px;">Valor Observado</th>
                <th style="padding: 12px 16px;">Diferença</th>
                <th style="padding: 12px 16px;">Estado</th>
                <th style="padding: 12px 16px;">Data Deteção</th>
                <th style="padding: 12px 16px; text-align: right;">Resolução</th>
              </tr>
            </thead>
            <tbody id="corpo-tabela-divergencias">
              <tr><td colspan="8" style="text-align: center; padding: 32px;">A carregar divergências...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL DE ESTORNO CONTABILÍSTICO -->
    <div id="modal-estorno" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); align-items: center; justify-content: center; z-index: 1000;">
      <div class="card" style="max-width: 500px; width: 100%; margin: 20px; padding: 24px;">
        <h3 style="margin-top: 0;">Confirmar Estorno Contabilístico</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          O estorno não apaga o registo original. Será gerado um lançamento compensatório inverso com referência cruzada indelével e registo em pista de auditoria.
        </p>
        <input type="hidden" id="estorno-lancamento-id" />
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px;">Motivo Formal do Estorno *</label>
          <textarea id="estorno-motivo" class="form-input" rows="3" placeholder="Ex: Cancelamento autorizado de operação com devolução de numerário..." style="width: 100%; box-sizing: border-box;"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="btn-cancelar-estorno" class="btn btn-secondary">Cancelar</button>
          <button id="btn-confirmar-estorno" class="btn btn-danger">Confirmar Estorno</button>
        </div>
      </div>
    </div>

    <!-- MODAL DE RESOLUÇÃO DE DIVERGÊNCIA -->
    <div id="modal-resolver-div" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); align-items: center; justify-content: center; z-index: 1000;">
      <div class="card" style="max-width: 500px; width: 100%; margin: 20px; padding: 24px;">
        <h3 style="margin-top: 0;">Tratamento de Divergência</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          Registar a justificação formal da resolução ou autorização para a divergência detetada.
        </p>
        <input type="hidden" id="resolver-div-id" />
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px;">Decisão *</label>
          <select id="resolver-div-estado" class="form-input" style="width: 100%;">
            <option value="resolvida">Resolvida (Regularizada)</option>
            <option value="desconsiderada_autorizada">Desconsiderada Autorizada (Justificada)</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px;">Justificativa Formal *</label>
          <textarea id="resolver-div-motivo" class="form-input" rows="3" placeholder="Ex: Diferença assumida em ata de contagem física..." style="width: 100%; box-sizing: border-box;"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="btn-cancelar-resolver-div" class="btn btn-secondary">Cancelar</button>
          <button id="btn-confirmar-resolver-div" class="btn btn-primary">Gravar Resolução</button>
        </div>
      </div>
    </div>
  `;

  // Controladores de Abas
  const tabRazao = container.querySelector("#tab-razao") as HTMLButtonElement;
  const tabBalancete = container.querySelector("#tab-balancete") as HTMLButtonElement;
  const tabDivergencias = container.querySelector("#tab-divergencias") as HTMLButtonElement;

  const painelRazao = container.querySelector("#painel-razao") as HTMLElement;
  const painelBalancete = container.querySelector("#painel-balancete") as HTMLElement;
  const painelDivergencias = container.querySelector("#painel-divergencias") as HTMLElement;

  function alternarAba(aba: "razao" | "balancete" | "divergencias") {
    painelRazao.style.display = aba === "razao" ? "block" : "none";
    painelBalancete.style.display = aba === "balancete" ? "block" : "none";
    painelDivergencias.style.display = aba === "divergencias" ? "block" : "none";

    tabRazao.className = `btn btn-sm ${aba === "razao" ? "btn-primary" : "btn-secondary"}`;
    tabBalancete.className = `btn btn-sm ${aba === "balancete" ? "btn-primary" : "btn-secondary"}`;
    tabDivergencias.className = `btn btn-sm ${aba === "divergencias" ? "btn-primary" : "btn-secondary"}`;

    if (aba === "razao") carregarLivroRazao();
    else if (aba === "balancete") carregarBalancete();
    else carregarDivergencias();
  }

  tabRazao.addEventListener("click", () => alternarAba("razao"));
  tabBalancete.addEventListener("click", () => alternarAba("balancete"));
  tabDivergencias.addEventListener("click", () => alternarAba("divergencias"));

  // 1. Carregar Livro Razão
  async function carregarLivroRazao() {
    const tbody = container.querySelector("#corpo-tabela-razao") as HTMLElement;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 32px;">A carregar movimentos...</td></tr>';

    try {
      const dataInicio = (container.querySelector("#filtro-data-inicio") as HTMLInputElement).value;
      const dataFim = (container.querySelector("#filtro-data-fim") as HTMLInputElement).value;
      const origemTipo = (container.querySelector("#filtro-origem-tipo") as HTMLSelectElement).value;

      const res = await api.listarLivroRazao({
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        origemTipo: origemTipo || undefined,
        limite: 100,
      });

      if (!res.itens || res.itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 32px;">Nenhum lançamento contabilístico registado para os filtros selecionados.</td></tr>';
        return;
      }

      tbody.innerHTML = res.itens
        .map((i) => {
          const badgeDc = i.tipo === "D" 
            ? '<span class="badge" style="background: rgba(37,99,235,0.15); color: #2563eb; font-weight: 700;">DÉBITO</span>' 
            : '<span class="badge" style="background: rgba(22,163,74,0.15); color: #16a34a; font-weight: 700;">CRÉDITO</span>';

          const badgeEstado = i.estado === "confirmado"
            ? '<span class="badge badge-success">Confirmado</span>'
            : '<span class="badge badge-danger">Estornado</span>';

          return `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 10px 16px; white-space: nowrap;">${i.dataMovimento}</td>
              <td style="padding: 10px 16px; font-weight: 600; font-family: monospace;">${i.numeroLancamento}</td>
              <td style="padding: 10px 16px;"><strong>${i.contaCodigo}</strong> - ${i.contaNome}</td>
              <td style="padding: 10px 16px;">${badgeDc}</td>
              <td style="padding: 10px 16px; font-weight: 600;">${Number(i.montanteAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</td>
              <td style="padding: 10px 16px;">${i.montanteOriginal} ${i.moeda}</td>
              <td style="padding: 10px 16px; color: var(--text-secondary); max-width: 250px;">${i.descricao}</td>
              <td style="padding: 10px 16px;">${i.operadorNome}</td>
              <td style="padding: 10px 16px;">${badgeEstado}</td>
              <td style="padding: 10px 16px; text-align: right; white-space: nowrap;">
                ${podeEstornar && i.estado === "confirmado" && i.origemTipo !== "estorno_operacao" ? `
                  <button class="btn btn-sm btn-danger btn-abrir-estorno" data-id="${i.lancamentoId}" data-num="${i.numeroLancamento}">
                    Estornar
                  </button>
                ` : "-"}
              </td>
            </tr>
          `;
        })
        .join("");

      // Eventos dos botões de estorno
      tbody.querySelectorAll(".btn-abrir-estorno").forEach((btn) => {
        btn.addEventListener("click", () => {
          const lancamentoId = (btn as HTMLElement).dataset.id!;
          (container.querySelector("#estorno-lancamento-id") as HTMLInputElement).value = lancamentoId;
          (container.querySelector("#estorno-motivo") as HTMLTextAreaElement).value = "";
          (container.querySelector("#modal-estorno") as HTMLElement).style.display = "flex";
        });
      });
    } catch (e: any) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red; padding: 24px;">Erro ao carregar livro razão: ${e.message}</td></tr>`;
    }
  }

  // 2. Carregar Balancete
  async function carregarBalancete() {
    const tbody = container.querySelector("#corpo-tabela-balancete") as HTMLElement;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 32px;">A calcular saldos do balancete...</td></tr>';

    try {
      const contas = await api.obterBalanceteContabil();
      if (!contas || contas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 32px;">Nenhuma conta contabilística registada.</td></tr>';
        return;
      }

      tbody.innerHTML = contas
        .map((c) => {
          return `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 12px 16px; font-weight: 700; font-family: monospace;">${c.codigo}</td>
              <td style="padding: 12px 16px; font-weight: 600;">${c.nome}</td>
              <td style="padding: 12px 16px; text-transform: capitalize;">${c.tipo}</td>
              <td style="padding: 12px 16px; text-transform: capitalize;">${c.natureza}</td>
              <td style="padding: 12px 16px; text-align: right;">${Number(c.totalDebitoAoa || 0).toLocaleString("pt-AO", { minimumFractionDigits: 2 })}</td>
              <td style="padding: 12px 16px; text-align: right;">${Number(c.totalCreditoAoa || 0).toLocaleString("pt-AO", { minimumFractionDigits: 2 })}</td>
              <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: ${Number(c.saldoAoa || 0) < 0 ? '#ef4444' : '#16a34a'};">
                ${Number(c.saldoAoa || 0).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
              </td>
            </tr>
          `;
        })
        .join("");
    } catch (e: any) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red; padding: 24px;">Erro ao carregar balancete: ${e.message}</td></tr>`;
    }
  }

  // 3. Carregar Divergências
  async function carregarDivergencias() {
    const tbody = container.querySelector("#corpo-tabela-divergencias") as HTMLElement;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 32px;">A carregar divergências...</td></tr>';

    try {
      const res = await api.listarDivergencias({ limite: 100 });
      if (!res.itens || res.itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 32px; color: #16a34a; font-weight: 600;">Nenhuma divergência pendente! O sistema encontra-se 100% conciliado.</td></tr>';
        return;
      }

      tbody.innerHTML = res.itens
        .map((d) => {
          const badgeEstado = d.estado === "aberta"
            ? '<span class="badge badge-danger">Aberta</span>'
            : d.estado === "resolvida"
            ? '<span class="badge badge-success">Resolvida</span>'
            : '<span class="badge badge-neutral">Desconsiderada</span>';

          return `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 12px 16px; font-weight: 600;">${d.tipo}</td>
              <td style="padding: 12px 16px;">${d.origem}</td>
              <td style="padding: 12px 16px;">${d.valorEsperado} ${d.moeda}</td>
              <td style="padding: 12px 16px;">${d.valorObservado} ${d.moeda}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #ef4444;">${d.diferenca} ${d.moeda}</td>
              <td style="padding: 12px 16px;">${badgeEstado}</td>
              <td style="padding: 12px 16px; white-space: nowrap;">${d.criadoEm.slice(0, 10)}</td>
              <td style="padding: 12px 16px; text-align: right;">
                ${d.estado === "aberta" ? `
                  <button class="btn btn-sm btn-primary btn-abrir-resolver-div" data-id="${d.id}">
                    Resolver
                  </button>
                ` : `<span style="font-size: 11px; color: var(--text-secondary);">${d.resolvidoPorNome || "Concluída"}</span>`}
              </td>
            </tr>
          `;
        })
        .join("");

      tbody.querySelectorAll(".btn-abrir-resolver-div").forEach((btn) => {
        btn.addEventListener("click", () => {
          const divId = (btn as HTMLElement).dataset.id!;
          (container.querySelector("#resolver-div-id") as HTMLInputElement).value = divId;
          (container.querySelector("#resolver-div-motivo") as HTMLTextAreaElement).value = "";
          (container.querySelector("#modal-resolver-div") as HTMLElement).style.display = "flex";
        });
      });
    } catch (e: any) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red; padding: 24px;">Erro ao carregar divergências: ${e.message}</td></tr>`;
    }
  }

  // Filtrar
  container.querySelector("#btn-filtrar-razao")?.addEventListener("click", carregarLivroRazao);

  // Executar Varredura
  container.querySelector("#btn-executar-reconciliacao")?.addEventListener("click", async () => {
    try {
      const res = await api.executarReconciliacaoGeral();
      alert(`Varredura concluída!\nTotal verificado: ${res.totalVerificadas}\nNovas divergências detetadas: ${res.novasDivergencias}`);
      alternarAba("divergencias");
    } catch (e: any) {
      alert(`Erro na varredura: ${e.message}`);
    }
  });

  // Exportar CSV
  container.querySelector("#btn-exportar-razao-csv")?.addEventListener("click", () => {
    const dataInicio = (container.querySelector("#filtro-data-inicio") as HTMLInputElement).value;
    const dataFim = (container.querySelector("#filtro-data-fim") as HTMLInputElement).value;
    const origemTipo = (container.querySelector("#filtro-origem-tipo") as HTMLSelectElement).value;

    const url = `/api/v1/contabilidade/livro-razao?formato=csv&dataInicio=${dataInicio || ""}&dataFim=${dataFim || ""}&origemTipo=${origemTipo || ""}`;
    window.open(url, "_blank");
  });

  // Modal Estorno
  container.querySelector("#btn-cancelar-estorno")?.addEventListener("click", () => {
    (container.querySelector("#modal-estorno") as HTMLElement).style.display = "none";
  });

  container.querySelector("#btn-confirmar-estorno")?.addEventListener("click", async () => {
    const id = (container.querySelector("#estorno-lancamento-id") as HTMLInputElement).value;
    const motivo = (container.querySelector("#estorno-motivo") as HTMLTextAreaElement).value;

    if (!motivo || motivo.trim().length < 5) {
      alert("Por favor informe uma justificação detalhada com pelo menos 5 caracteres.");
      return;
    }

    try {
      await api.estornarLancamentoContabil(id, motivo);
      alert("Estorno contabilístico concluído com sucesso!");
      (container.querySelector("#modal-estorno") as HTMLElement).style.display = "none";
      carregarLivroRazao();
    } catch (e: any) {
      alert(`Erro ao estornar lançamento: ${e.message}`);
    }
  });

  // Modal Resolver Divergência
  container.querySelector("#btn-cancelar-resolver-div")?.addEventListener("click", () => {
    (container.querySelector("#modal-resolver-div") as HTMLElement).style.display = "none";
  });

  container.querySelector("#btn-confirmar-resolver-div")?.addEventListener("click", async () => {
    const id = (container.querySelector("#resolver-div-id") as HTMLInputElement).value;
    const estado = (container.querySelector("#resolver-div-estado") as HTMLSelectElement).value as any;
    const motivo = (container.querySelector("#resolver-div-motivo") as HTMLTextAreaElement).value;

    if (!motivo || motivo.trim().length < 5) {
      alert("Por favor informe uma justificativa formal.");
      return;
    }

    try {
      await api.resolverDivergencia(id, estado, motivo);
      alert("Divergência atualizada com sucesso!");
      (container.querySelector("#modal-resolver-div") as HTMLElement).style.display = "none";
      carregarDivergencias();
    } catch (e: any) {
      alert(`Erro ao resolver divergência: ${e.message}`);
    }
  });

  // Carregamento inicial
  carregarLivroRazao();
}
