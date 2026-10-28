import {
  api,
  type ItemFilaOperacional,
  type ResumoDashboardOperacional,
  type FiltrosFilaOperacional,
  type UsuarioItem,
  type ParceiroItem,
} from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { mostrarToast } from "../components/modal-dialogo.js";

export async function renderizarOperacional(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  // Obter parâmetros da URL hash se existirem (ex: #operacional?tipo=pedido_cambio)
  const hash = window.location.hash;
  const queryString = hash.includes("?") ? hash.substring(hash.indexOf("?") + 1) : "";
  const urlParams = new URLSearchParams(queryString);

  let filtroTipo = urlParams.get("tipo") || "";
  let filtroEstado = urlParams.get("estado") || "";
  let filtroPrioridade = urlParams.get("prioridade") || "";
  let filtroApenasMinhas = urlParams.get("minhas") === "true";
  let filtroBusca = urlParams.get("busca") || "";

  let listaUsuarios: UsuarioItem[] = [];
  let listaParceiros: ParceiroItem[] = [];
  let listaCaixas: any[] = [];

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Painel Operacional da Equipa</h1>
        <p class="view-subtitle">Fila consolidada de atendimento, triagem KYC, remessas e supervisão regulamentar</p>
      </div>
      <div class="view-actions">
        <button id="btn-recarregar-operacional" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Actualizar Fila
        </button>
      </div>
    </div>

    <!-- Indicadores Rápidos do Dashboard Operacional -->
    <div class="dashboard-grid mb-4" id="cards-resumo-operacional">
      <div class="card" style="cursor: pointer;" id="card-filtro-cambio">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Câmbio Online</h3>
          <span class="badge badge-warning" id="badge-cambio-pendente">0</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="num-cambio-pendente">0</div>
          <small class="text-muted">Pedidos pendentes de revisão</small>
        </div>
      </div>

      <div class="card" style="cursor: pointer;" id="card-filtro-remessas">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Remessas Internacionais</h3>
          <span class="badge badge-info" id="badge-remessas-pendentes">0</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="num-remessas-pendentes">0</div>
          <small class="text-muted">Por encaminhar ou liquidar</small>
        </div>
      </div>

      <div class="card" style="cursor: pointer;" id="card-filtro-kyc">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Dossiês KYC</h3>
          <span class="badge badge-warning" id="badge-kyc-pendentes">0</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="num-kyc-pendentes">0</div>
          <small class="text-muted">Documentos a aguardar validação</small>
        </div>
      </div>

      <div class="card" style="cursor: pointer;" id="card-filtro-liquidacoes">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Regra 4 Olhos (AML)</h3>
          <span class="badge badge-danger" id="badge-liquidacoes-pendentes">0</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="num-liquidacoes-pendentes">0</div>
          <small class="text-muted">Liquidações manuais pendentes</small>
        </div>
      </div>

      <div class="card" style="cursor: pointer;" id="card-filtro-caixa">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted);">Caixas & Tesouraria</h3>
          <span class="badge badge-success" id="badge-caixas-abertos">0</span>
        </div>
        <div class="card-body">
          <div style="font-size: 24px; font-weight: 700; color: var(--nz-azul-900);" id="num-caixas-abertos">0</div>
          <small class="text-muted" id="texto-alerta-divergencia">Sessões ativas no momento</small>
        </div>
      </div>
    </div>

    <!-- Barra de Filtros e Busca Consolidada -->
    <div class="card mb-4">
      <div class="card-body" style="padding: 16px;">
        <div style="display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 220px;">
            <label for="op-filtro-busca" style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Pesquisa Rápida</label>
            <input type="text" id="op-filtro-busca" class="form-input" placeholder="Ref, cliente, borderô..." value="${escapeHtml(filtroBusca)}">
          </div>

          <div style="min-width: 180px;">
            <label for="op-filtro-tipo" style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Tipo de Tarefa</label>
            <select id="op-filtro-tipo" class="form-input">
              <option value="">Todas as Operações</option>
              <option value="pedido_cambio" ${filtroTipo === "pedido_cambio" ? "selected" : ""}>Câmbio Online</option>
              <option value="pedido_remessa" ${filtroTipo === "pedido_remessa" ? "selected" : ""}>Remessas Internacionais</option>
              <option value="kyc_dossie" ${filtroTipo === "kyc_dossie" ? "selected" : ""}>Dossiês KYC</option>
              <option value="liquidacao_manual" ${filtroTipo === "liquidacao_manual" ? "selected" : ""}>Liquidações Manuais (4 Olhos)</option>
              <option value="alerta_caixa" ${filtroTipo === "alerta_caixa" ? "selected" : ""}>Alertas de Caixa</option>
            </select>
          </div>

          <div style="min-width: 150px;">
            <label for="op-filtro-estado" style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Estado</label>
            <select id="op-filtro-estado" class="form-input">
              <option value="">Todos</option>
              <option value="pendente" ${filtroEstado === "pendente" ? "selected" : ""}>Pendente</option>
              <option value="em_analise" ${filtroEstado === "em_analise" ? "selected" : ""}>Em Análise</option>
              <option value="concluida" ${filtroEstado === "concluida" ? "selected" : ""}>Concluída / Executada</option>
              <option value="rejeitada" ${filtroEstado === "rejeitada" ? "selected" : ""}>Rejeitada</option>
            </select>
          </div>

          <div style="min-width: 140px;">
            <label for="op-filtro-prioridade" style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Prioridade</label>
            <select id="op-filtro-prioridade" class="form-input">
              <option value="">Todas</option>
              <option value="urgente" ${filtroPrioridade === "urgente" ? "selected" : ""}>Urgente</option>
              <option value="alta" ${filtroPrioridade === "alta" ? "selected" : ""}>Alta</option>
              <option value="normal" ${filtroPrioridade === "normal" ? "selected" : ""}>Normal</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; padding-bottom: 8px;">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
              <input type="checkbox" id="op-filtro-minhas" ${filtroApenasMinhas ? "checked" : ""}>
              <span>Apenas atribuídas a mim</span>
            </label>
          </div>

          <div>
            <button id="btn-limpar-filtros" class="btn btn-secondary" style="height: 38px;">Limpar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela da Fila de Operações -->
    <div class="card mb-4">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h2 class="card-title">Fila de Tarefas Operacionais</h2>
        <span class="text-muted" id="contador-itens-fila" style="font-size: 13px;">A carregar fila...</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table" id="tabela-fila-operacional">
            <thead>
              <tr>
                <th style="width: 130px;">Tipo</th>
                <th>Referência / ID</th>
                <th>Cliente / Titular</th>
                <th>Detalhes / Montante</th>
                <th style="width: 110px;">Prioridade</th>
                <th style="width: 110px;">Estado</th>
                <th>Responsável</th>
                <th>Data / Hora</th>
                <th style="width: 140px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="corpo-tabela-fila">
              <tr>
                <td colspan="9" style="text-align: center; padding: 32px;" class="text-muted">
                  A carregar itens da fila operacional...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Seção de Supervisão de Caixas e Sessões Ativas -->
    <div class="card mb-4" id="secao-supervisao-caixas">
      <div class="card-header">
        <h2 class="card-title">Supervisão de Caixas e Tesouraria</h2>
        <span class="badge badge-info">Em Tempo Real</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Operador</th>
                <th>Abertura</th>
                <th>Saldo Inicial</th>
                <th>Diferença Registada</th>
                <th>Estado</th>
                <th style="text-align: right;">Ação</th>
              </tr>
            </thead>
            <tbody id="corpo-tabela-caixas">
              <tr>
                <td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">
                  A carregar sessões de caixa...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Container para Modais Dinâmicos -->
    <div id="modal-operacional-container"></div>
  `;

  // Elementos do DOM
  const btnRecarregar = container.querySelector<HTMLButtonElement>("#btn-recarregar-operacional");
  const inputBusca = container.querySelector<HTMLInputElement>("#op-filtro-busca");
  const selectTipo = container.querySelector<HTMLSelectElement>("#op-filtro-tipo");
  const selectEstado = container.querySelector<HTMLSelectElement>("#op-filtro-estado");
  const selectPrioridade = container.querySelector<HTMLSelectElement>("#op-filtro-prioridade");
  const checkMinhas = container.querySelector<HTMLInputElement>("#op-filtro-minhas");
  const btnLimpar = container.querySelector<HTMLButtonElement>("#btn-limpar-filtros");

  const badgeCambio = container.querySelector<HTMLElement>("#badge-cambio-pendente");
  const numCambio = container.querySelector<HTMLElement>("#num-cambio-pendente");
  const badgeRemessas = container.querySelector<HTMLElement>("#badge-remessas-pendentes");
  const numRemessas = container.querySelector<HTMLElement>("#num-remessas-pendentes");
  const badgeKyc = container.querySelector<HTMLElement>("#badge-kyc-pendentes");
  const numKyc = container.querySelector<HTMLElement>("#num-kyc-pendentes");
  const badgeLiquidacoes = container.querySelector<HTMLElement>("#badge-liquidacoes-pendentes");
  const numLiquidacoes = container.querySelector<HTMLElement>("#num-liquidacoes-pendentes");
  const badgeCaixas = container.querySelector<HTMLElement>("#badge-caixas-abertos");
  const numCaixas = container.querySelector<HTMLElement>("#num-caixas-abertos");
  const textoDivergencia = container.querySelector<HTMLElement>("#texto-alerta-divergencia");

  const contadorFila = container.querySelector<HTMLElement>("#contador-itens-fila");
  const corpoTabelaFila = container.querySelector<HTMLTableSectionElement>("#corpo-tabela-fila");
  const corpoTabelaCaixas = container.querySelector<HTMLTableSectionElement>("#corpo-tabela-caixas");
  const modalContainer = container.querySelector<HTMLDivElement>("#modal-operacional-container")!;

  // Carregar dados de suporte (Utilizadores e Parceiros)
  try {
    const [usuarios, parceiros] = await Promise.all([
      api.listarUsuarios().catch(() => []),
      api.listarParceirosAdmin().catch(() => []),
    ]);
    listaUsuarios = usuarios;
    listaParceiros = parceiros;
  } catch {
    // Falha silenciosa
  }

  // Função para carregar o Dashboard
  async function carregarDashboard(): Promise<void> {
    try {
      const dash = await api.obterDashboardOperacional();
      if (numCambio) numCambio.textContent = String(dash.pedidosCambioPendentes);
      if (badgeCambio) badgeCambio.textContent = String(dash.pedidosCambioPendentes);

      if (numRemessas) numRemessas.textContent = String(dash.pedidosRemessasPendentes);
      if (badgeRemessas) badgeRemessas.textContent = String(dash.pedidosRemessasPendentes);

      if (numKyc) numKyc.textContent = String(dash.kycPendentes);
      if (badgeKyc) badgeKyc.textContent = String(dash.kycPendentes);

      if (numLiquidacoes) numLiquidacoes.textContent = String(dash.liquidacoesManuaisPendentes);
      if (badgeLiquidacoes) badgeLiquidacoes.textContent = String(dash.liquidacoesManuaisPendentes);

      if (numCaixas) numCaixas.textContent = String(dash.caixasAbertos);
      if (badgeCaixas) badgeCaixas.textContent = String(dash.caixasAbertos);

      if (textoDivergencia) {
        if (dash.alertasDivergencia > 0) {
          textoDivergencia.innerHTML = `<span style="color: var(--color-error); font-weight: 600;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>${dash.alertasDivergencia} fecho(s) com divergência</span>`;
        } else {
          textoDivergencia.textContent = "Sessões ativas no momento";
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dashboard operacional:", err);
    }
  }

  // Função para carregar a Lista de Caixas
  async function carregarCaixas(): Promise<void> {
    try {
      listaCaixas = await api.listarCaixasOperacional();
      if (!corpoTabelaCaixas) return;

      if (listaCaixas.length === 0) {
        corpoTabelaCaixas.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 20px;" class="text-muted">
              Não existem sessões de caixa abertas ou com divergência registada no momento.
            </td>
          </tr>
        `;
        return;
      }

      corpoTabelaCaixas.innerHTML = listaCaixas
        .map((c) => {
          const temDivergencia = parseFloat(c.diferencaAoa || "0") !== 0;
          return `
            <tr>
              <td><strong>${escapeHtml(c.operadorNome || "Operador")}</strong></td>
              <td>${formatarData(c.abertoEm)}</td>
              <td>${formatarMoeda(c.saldoInicialAoa || "0")} AOA</td>
              <td>
                ${
                  temDivergencia
                    ? `<span class="badge badge-danger">${formatarMoeda(c.diferencaAoa)} AOA</span>`
                    : `<span class="badge badge-success">0,00 AOA</span>`
                }
              </td>
              <td>
                <span class="badge ${c.estado === "aberto" ? "badge-success" : "badge-secondary"}">
                  ${c.estado ? c.estado.toUpperCase() : "FECHADO"}
                </span>
              </td>
              <td style="text-align: right;">
                <a href="#caixa" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;">Ver Módulo Caixa</a>
              </td>
            </tr>
          `;
        })
        .join("");
    } catch (err: any) {
      if (corpoTabelaCaixas) {
        corpoTabelaCaixas.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--color-error); padding: 16px;">
              Erro ao carregar caixas: ${escapeHtml(err.message)}
            </td>
          </tr>
        `;
      }
    }
  }

  // Função para carregar a Fila Operacional
  async function carregarFila(): Promise<void> {
    if (!corpoTabelaFila || !contadorFila) return;

    corpoTabelaFila.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 32px;" class="text-muted">
          A carregar itens da fila operacional...
        </td>
      </tr>
    `;

    const filtros: FiltrosFilaOperacional = {};
    if (filtroTipo) filtros.tipo = filtroTipo as any;
    if (filtroEstado) filtros.estado = filtroEstado as any;
    if (filtroPrioridade) filtros.prioridade = filtroPrioridade as any;
    if (filtroApenasMinhas) filtros.apenasMinhas = true;
    if (filtroBusca) filtros.busca = filtroBusca;
    filtros.limite = 100;

    try {
      const { itens, total } = await api.listarFilaOperacional(filtros);
      contadorFila.textContent = `${total} item(ns) encontrado(s)`;

      if (itens.length === 0) {
        corpoTabelaFila.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 32px;" class="text-muted">
              Nenhuma tarefa ou operação pendente com os filtros selecionados.
            </td>
          </tr>
        `;
        return;
      }

      corpoTabelaFila.innerHTML = itens
        .map((item) => {
          const bordero = item.detalhes?.numeroBordero;
          const docId = item.detalhes?.clienteBi || item.detalhes?.nif;
          return `
            <tr data-tipo="${item.tipo}" data-id="${item.id}">
              <td>${formatarTipoBadge(item.tipo)}</td>
              <td>
                <strong>${escapeHtml(item.codigoVisual || item.referenciaId)}</strong>
                ${bordero ? `<br><small class="text-muted">Bord: ${escapeHtml(bordero)}</small>` : ""}
              </td>
              <td>
                <strong>${escapeHtml(item.clienteNome || "N/A")}</strong>
                ${docId ? `<br><small class="text-muted">Doc: ${escapeHtml(docId)}</small>` : ""}
              </td>
              <td>
                <strong>${escapeHtml(item.titulo)}</strong>
                ${item.descricao ? `<br><small class="text-muted">${escapeHtml(item.descricao)}</small>` : ""}
                ${item.montante ? `<br><strong>${formatarMoeda(item.montante)} ${escapeHtml(item.moeda || "")}</strong>` : ""}
              </td>
              <td>${formatarPrioridadeBadge(item.prioridade)}</td>
              <td>${formatarEstadoBadge(item.estado)}</td>
              <td>
                ${
                  item.responsavelNome
                    ? `<span style="font-size: 13px; font-weight: 500;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${escapeHtml(item.responsavelNome)}</span>`
                    : `<span class="text-muted" style="font-size: 12px;">Não atribuído</span>`
                }
              </td>
              <td style="font-size: 12px; color: var(--text-muted);">
                ${formatarData(item.criadoEm)}
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <button class="btn btn-primary btn-tratar" data-tipo="${item.tipo}" data-id="${item.id}" style="padding: 4px 8px; font-size: 12px;">
                  Tratar
                </button>
                <button class="btn btn-secondary btn-atribuir" data-tipo="${item.tipo}" data-id="${item.id}" style="padding: 4px 8px; font-size: 12px; margin-left: 4px;" title="Atribuir Responsável">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                </button>
              </td>
            </tr>
          `;
        })
        .join("");

      // Vincular eventos dos botões de tratar e atribuir
      corpoTabelaFila.querySelectorAll(".btn-tratar").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tipo = btn.getAttribute("data-tipo")!;
          const id = btn.getAttribute("data-id")!;
          abrirModalTratamento(tipo, id);
        });
      });

      corpoTabelaFila.querySelectorAll(".btn-atribuir").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tipo = btn.getAttribute("data-tipo")!;
          const id = btn.getAttribute("data-id")!;
          abrirModalAtribuicao(tipo, id);
        });
      });
    } catch (err: any) {
      corpoTabelaFila.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--color-error); padding: 24px;">
            Erro ao carregar fila operacional: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  // Modal de Atribuição de Tarefas
  async function abrirModalAtribuicao(tipo: string, id: string): Promise<void> {
    try {
      const detalhes = await api.obterDetalhesItemOperacional(tipo, id);

      modalContainer.innerHTML = `
        <div class="modal-backdrop" id="modal-atribuicao-backdrop">
          <div class="modal" style="max-width: 480px;">
            <div class="modal-header">
              <h3 class="modal-title">Atribuir Responsável & Prioridade</h3>
              <button class="modal-close" id="btn-fechar-modal-atribuicao">&times;</button>
            </div>
            <div class="modal-body">
              <p class="text-muted mb-3" style="font-size: 13px;">
                Atribua esta tarefa a si próprio ou encaminhe-a para outro colaborador da equipa.
              </p>

              <div class="form-group mb-3">
                <label class="form-label">Responsável da Equipa</label>
                <select id="modal-atribuir-usuario" class="form-input">
                  <option value="">-- Não Atribuído (Fila Geral) --</option>
                  <option value="${usuario!.id}">Atribuir a Mim (${escapeHtml(usuario!.nome)})</option>
                  ${listaUsuarios
                    .filter((u) => u.id !== usuario!.id && u.ativo)
                    .map((u) => `<option value="${u.id}" ${detalhes.tarefa?.responsavelId === u.id ? "selected" : ""}>${escapeHtml(u.nome)} (${u.funcao})</option>`)
                    .join("")}
                </select>
              </div>

              <div class="form-group mb-3">
                <label class="form-label">Prioridade da Tarefa</label>
                <select id="modal-atribuir-prioridade" class="form-input">
                  <option value="normal" ${detalhes.tarefa?.prioridade === "normal" ? "selected" : ""}>Normal</option>
                  <option value="alta" ${detalhes.tarefa?.prioridade === "alta" ? "selected" : ""}>Alta</option>
                  <option value="urgente" ${detalhes.tarefa?.prioridade === "urgente" ? "selected" : ""}>Urgente</option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label class="form-label">Notas Internas de Encaminhamento</label>
                <textarea id="modal-atribuir-notas" class="form-input" rows="3" placeholder="Instruções ou apontamentos operacionais...">${escapeHtml(detalhes.tarefa?.notas || "")}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancelar-atribuicao">Cancelar</button>
              <button class="btn btn-primary" id="btn-salvar-atribuicao">Confirmar Atribuição</button>
            </div>
          </div>
        </div>
      `;

      const fecharModal = () => {
        modalContainer.innerHTML = "";
      };

      container.querySelector("#btn-fechar-modal-atribuicao")?.addEventListener("click", fecharModal);
      container.querySelector("#btn-cancelar-atribuicao")?.addEventListener("click", fecharModal);

      container.querySelector("#btn-salvar-atribuicao")?.addEventListener("click", async () => {
        const responsavelId = (container.querySelector("#modal-atribuir-usuario") as HTMLSelectElement).value || null;
        const prioridade = (container.querySelector("#modal-atribuir-prioridade") as HTMLSelectElement).value as any;
        const notas = (container.querySelector("#modal-atribuir-notas") as HTMLTextAreaElement).value.trim() || undefined;

        try {
          await api.atribuirTarefaOperacional(tipo, id, { responsavelId, prioridade, notas });
          mostrarToast("Tarefa atribuída com sucesso.", "sucesso");
          fecharModal();
          await carregarFila();
        } catch (err: any) {
          mostrarToast(`Erro ao atribuir tarefa: ${err.message}`, "erro");
        }
      });
    } catch (err: any) {
      mostrarToast(`Falha ao obter detalhes para atribuição: ${err.message}`, "erro");
    }
  }

  // Modal Central de Tratamento Específico por Tipo
  async function abrirModalTratamento(tipo: string, id: string): Promise<void> {
    try {
      const detalhes = await api.obterDetalhesItemOperacional(tipo, id);

      let conteudoHtml = "";
      let tituloModal = "";

      if (tipo === "pedido_cambio") {
        tituloModal = `Processar Pedido de Câmbio Online — Ref: ${escapeHtml(detalhes.id.substring(0, 8))}`;
        conteudoHtml = `
          <div class="mb-3" style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
              <div><strong>Cliente:</strong> ${escapeHtml(detalhes.clienteNome || "N/A")}</div>
              <div><strong>NIF/BI:</strong> ${escapeHtml(detalhes.clienteBi || "N/A")}</div>
              <div><strong>Operação:</strong> <span class="badge ${detalhes.tipo === "compra" ? "badge-info" : "badge-success"}">${(detalhes.tipo || "").toUpperCase()}</span></div>
              <div><strong>Moeda:</strong> ${escapeHtml(detalhes.moedaDivisa || "USD")}</div>
              <div><strong>Montante Divisa:</strong> <strong>${formatarMoeda(detalhes.montanteDivisa)} ${escapeHtml(detalhes.moedaDivisa)}</strong></div>
              <div><strong>Contravalor:</strong> <strong>${formatarMoeda(detalhes.totalAoa)} AOA</strong></div>
              <div><strong>Cotação Aplicada:</strong> ${detalhes.taxaCambioAplicada} AOA</div>
              <div><strong>Data do Pedido:</strong> ${formatarData(detalhes.criadoEm)}</div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Decisão Operacional</label>
            <div style="display: flex; gap: 16px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_cambio" value="aprovar" checked>
                <strong style="color: var(--color-success);">Aprovar & Gerar Borderô</strong>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_cambio" value="rejeitar">
                <strong style="color: var(--color-error);">Rejeitar Pedido</strong>
              </label>
            </div>
          </div>

          <div id="bloco-aprovar-cambio">
            <div class="form-group mb-3">
              <label class="form-label">Caixa Físico para Liquidação (Opcional se for bancário)</label>
              <select id="modal-cambio-caixa" class="form-input">
                <option value="">-- Sem afetação de caixa físico (Liquidação Bancária) --</option>
                ${listaCaixas
                  .filter((c) => c.estado === "aberto")
                  .map((c) => `<option value="${c.id}">Caixa de ${escapeHtml(c.operadorNome)} (Aberto em ${formatarData(c.abertoEm)})</option>`)
                  .join("")}
              </select>
            </div>
          </div>

          <div id="bloco-rejeitar-cambio" style="display: none;">
            <div class="form-group mb-3">
              <label class="form-label" style="color: var(--color-error);">Motivo da Rejeição (Obrigatório)</label>
              <textarea id="modal-cambio-motivo" class="form-input" rows="2" placeholder="Indique o motivo regulamentar ou operacional para o cliente..."></textarea>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Notas do Atendimento</label>
            <textarea id="modal-cambio-notas" class="form-input" rows="2" placeholder="Observações internas..."></textarea>
          </div>
        `;
      } else if (tipo === "pedido_remessa") {
        tituloModal = `Processar Pedido de Remessa — Ref: ${escapeHtml(detalhes.id.substring(0, 8))}`;
        conteudoHtml = `
          <div class="mb-3" style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
              <div><strong>Remetente:</strong> ${escapeHtml(detalhes.clienteNome || "N/A")}</div>
              <div><strong>Beneficiário:</strong> <strong>${escapeHtml(detalhes.beneficiarioNome || "N/A")}</strong></div>
              <div><strong>País Destino:</strong> ${escapeHtml(detalhes.paisDestino || "N/A")}</div>
              <div><strong>Moeda Destino:</strong> ${escapeHtml(detalhes.moedaDestino || "USD")}</div>
              <div><strong>Montante a Enviar:</strong> <strong>${formatarMoeda(detalhes.montanteDivisa)} ${escapeHtml(detalhes.moedaDestino)}</strong></div>
              <div><strong>Total em Kwanzas:</strong> <strong>${formatarMoeda(detalhes.totalAoa)} AOA</strong></div>
              <div><strong>Canal Solicitado:</strong> <span class="badge badge-info">${escapeHtml(detalhes.canal || "Direto")}</span></div>
              <div><strong>Conta/IBAN:</strong> ${escapeHtml(detalhes.dadosBeneficiarioJson?.iban || detalhes.dadosBeneficiarioJson?.conta || "N/A")}</div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Ação para Execução da Remessa</label>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_remessa" value="atribuir_parceiro" checked>
                <strong>Encaminhar a Parceiro Comercial</strong>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_remessa" value="liquidar_direto">
                <strong>Liquidação Direta (NZAIDI)</strong>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_remessa" value="rejeitar">
                <strong style="color: var(--color-error);">Rejeitar Remessa</strong>
              </label>
            </div>
          </div>

          <div id="bloco-remessa-parceiro">
            <div class="form-group mb-3">
              <label class="form-label">Selecionar Parceiro Comercial Autorizado</label>
              <select id="modal-remessa-parceiro-id" class="form-input">
                <option value="">-- Escolha a entidade parceira --</option>
                ${listaParceiros
                  .filter((p) => p.estado === "ativo")
                  .map((p) => `<option value="${p.id}">${escapeHtml(p.nome)} (${p.tipo.toUpperCase()} - Comissão: ${p.comissaoPercentual}%)</option>`)
                  .join("")}
              </select>
            </div>
          </div>

          <div id="bloco-remessa-rejeitar" style="display: none;">
            <div class="form-group mb-3">
              <label class="form-label" style="color: var(--color-error);">Motivo da Rejeição</label>
              <textarea id="modal-remessa-motivo" class="form-input" rows="2" placeholder="Motivo de inconformidade regulamentar ou recusa..."></textarea>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Notas do Processamento</label>
            <textarea id="modal-remessa-notas" class="form-input" rows="2" placeholder="Observações de compliance e conciliação..."></textarea>
          </div>
        `;
      } else if (tipo === "kyc_dossie" || tipo === "kyc_documento") {
        tituloModal = `Validação de Documento KYC — ${escapeHtml(detalhes.tipoDocumento || "Documento")}`;
        conteudoHtml = `
          <div class="mb-3" style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
              <div><strong>Titular:</strong> ${escapeHtml(detalhes.clienteNome || "N/A")}</div>
              <div><strong>NIF/BI:</strong> ${escapeHtml(detalhes.clienteBi || "N/A")}</div>
              <div><strong>Tipo de Documento:</strong> <span class="badge badge-info">${escapeHtml(detalhes.tipoDocumento || "N/A")}</span></div>
              <div><strong>Ficheiro:</strong> ${escapeHtml(detalhes.nomeOriginal || "ficheiro")}</div>
              <div><strong>Formato MIME:</strong> ${escapeHtml(detalhes.mimetype || "application/octet-stream")}</div>
              <div><strong>Data de Submissão:</strong> ${formatarData(detalhes.criadoEm)}</div>
              <div><strong>Hash SHA-256:</strong> <code style="font-size: 11px;">${escapeHtml(detalhes.sha256 ? detalhes.sha256.substring(0, 16) + "..." : "N/A")}</code></div>
              <div><strong>Estado Atual:</strong> <span class="badge ${detalhes.estadoValidacao === "valido" ? "badge-success" : detalhes.estadoValidacao === "invalido" ? "badge-danger" : "badge-warning"}">${(detalhes.estadoValidacao || "pendente").toUpperCase()}</span></div>
            </div>
          </div>

          <div class="mb-3" style="text-align: center; padding: 12px; border: 1px dashed var(--border-forte); border-radius: var(--radius-md);">
            <p class="text-muted mb-2" style="font-size: 13px;">O documento está protegido no cofre seguro e encriptado.</p>
            <button class="btn btn-secondary" id="btn-descarregar-doc-kyc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descarregar / Abrir Documento Protegido
            </button>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Decisão da Equipa de Compliance</label>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_kyc" value="aprovado" checked>
                <strong style="color: var(--color-success);">Aprovar Documento</strong>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_kyc" value="pendente_atualizacao">
                <strong style="color: var(--color-warning);">Solicitar Reenvio / Atualização</strong>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="decisao_kyc" value="rejeitado">
                <strong style="color: var(--color-error);">Rejeitar Documento</strong>
              </label>
            </div>
          </div>

          <div id="bloco-kyc-motivo" style="display: none;">
            <div class="form-group mb-3">
              <label class="form-label" style="color: var(--color-error);">Justificação / Motivo Regulamentar (Obrigatório)</label>
              <textarea id="modal-kyc-motivo" class="form-input" rows="2" placeholder="Ex: Cópia ilegível, documento expirado ou divergência no nome..."></textarea>
            </div>
          </div>
        `;
      } else if (tipo === "liquidacao_manual") {
        tituloModal = `Segregação de Funções (4 Olhos) — Liquidação ${escapeHtml(detalhes.referenciaExterna || detalhes.id.substring(0, 8))}`;
        const ehCriador = detalhes.operadorId === usuario?.id;

        conteudoHtml = `
          <div class="mb-3" style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
              <div><strong>Canal:</strong> <span class="badge badge-info">${escapeHtml(detalhes.canal || "N/A")}</span></div>
              <div><strong>Tipo:</strong> ${escapeHtml(detalhes.tipoOperacao || "N/A")}</div>
              <div><strong>Montante AOA:</strong> <strong>${formatarMoeda(detalhes.montanteAoa)} AOA</strong></div>
              <div><strong>Moeda/Divisa:</strong> ${escapeHtml(detalhes.moedaDivisa || "AOA")} ${detalhes.montanteDivisa ? `(${formatarMoeda(detalhes.montanteDivisa)})` : ""}</div>
              <div><strong>Ref. Externa:</strong> <code>${escapeHtml(detalhes.referenciaExterna || "N/A")}</code></div>
              <div><strong>Operador de Criação:</strong> <strong>${escapeHtml(detalhes.operadorNome || "N/A")}</strong></div>
              <div><strong>Criado Em:</strong> ${formatarData(detalhes.criadoEm || detalhes.momentoExecucao)}</div>
              <div><strong>Estado Atual:</strong> <span class="badge badge-warning">${(detalhes.estado || "pendente").toUpperCase()}</span></div>
            </div>
          </div>

          ${
            ehCriador
              ? `
              <div class="alert-box alert-error mb-3">
                <strong>Bloqueio de Conformidade (4 Olhos):</strong> Você é o operador que submeteu esta liquidação. De acordo com as normas prudenciais do BNA, a aprovação de liquidações manuais requer a validação por um segundo operador independente.
              </div>
            `
              : `
              <div class="alert-box alert-info mb-3">
                <strong>Verificação de Conformidade:</strong> Confirme a existência do comprovativo bancário externo e a conciliação do montante antes de validar a transação.
              </div>

              <div class="form-group mb-3">
                <label class="form-label">Decisão de Auditoria</label>
                <div style="display: flex; gap: 16px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="radio" name="decisao_liquidacao" value="aprovar" checked>
                    <strong style="color: var(--color-success);">Aprovar Liquidação</strong>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="radio" name="decisao_liquidacao" value="rejeitar">
                    <strong style="color: var(--color-error);">Rejeitar / Inconformidade</strong>
                  </label>
                </div>
              </div>

              <div class="form-group mb-3">
                <label class="form-label">Notas de Aprovação / Motivo</label>
                <textarea id="modal-liquidacao-notas" class="form-input" rows="2" placeholder="Observações de validação..."></textarea>
              </div>
            `
          }
        `;
      } else {
        tituloModal = `Detalhes da Operação — ${escapeHtml(tipo)}`;
        conteudoHtml = `
          <div class="mb-3">
            <pre style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-sm); font-size: 12px; max-height: 280px; overflow-y: auto;">${escapeHtml(JSON.stringify(detalhes, null, 2))}</pre>
          </div>
        `;
      }

      modalContainer.innerHTML = `
        <div class="modal-backdrop" id="modal-tratamento-backdrop">
          <div class="modal" style="max-width: 620px;">
            <div class="modal-header">
              <h3 class="modal-title">${tituloModal}</h3>
              <button class="modal-close" id="btn-fechar-modal-tratamento">&times;</button>
            </div>
            <div class="modal-body">
              ${conteudoHtml}
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancelar-tratamento">Fechar</button>
              ${
                tipo === "pedido_cambio" || tipo === "pedido_remessa" || tipo === "kyc_dossie" || tipo === "kyc_documento" || (tipo === "liquidacao_manual" && detalhes.operadorId !== usuario?.id)
                  ? `<button class="btn btn-primary" id="btn-confirmar-tratamento">Confirmar Decisão</button>`
                  : ""
              }
            </div>
          </div>
        </div>
      `;

      const fecharModal = () => {
        modalContainer.innerHTML = "";
      };

      container.querySelector("#btn-fechar-modal-tratamento")?.addEventListener("click", fecharModal);
      container.querySelector("#btn-cancelar-tratamento")?.addEventListener("click", fecharModal);

      // Listeners dinâmicos para alternância de blocos condicionais
      if (tipo === "pedido_cambio") {
        const radios = container.querySelectorAll<HTMLInputElement>('input[name="decisao_cambio"]');
        const blocoAprovar = container.querySelector<HTMLDivElement>("#bloco-aprovar-cambio");
        const blocoRejeitar = container.querySelector<HTMLDivElement>("#bloco-rejeitar-cambio");
        radios.forEach((r) => {
          r.addEventListener("change", () => {
            if (r.value === "aprovar") {
              if (blocoAprovar) blocoAprovar.style.display = "block";
              if (blocoRejeitar) blocoRejeitar.style.display = "none";
            } else {
              if (blocoAprovar) blocoAprovar.style.display = "none";
              if (blocoRejeitar) blocoRejeitar.style.display = "block";
            }
          });
        });

        container.querySelector("#btn-confirmar-tratamento")?.addEventListener("click", async () => {
          const decisao = (container.querySelector('input[name="decisao_cambio"]:checked') as HTMLInputElement).value as "aprovar" | "rejeitar";
          const caixaId = (container.querySelector("#modal-cambio-caixa") as HTMLSelectElement)?.value || undefined;
          const motivoRejeicao = (container.querySelector("#modal-cambio-motivo") as HTMLTextAreaElement)?.value.trim() || undefined;
          const notas = (container.querySelector("#modal-cambio-notas") as HTMLTextAreaElement)?.value.trim() || undefined;

          if (decisao === "rejeitar" && !motivoRejeicao) {
            mostrarToast("O motivo da rejeição é obrigatório.", "aviso");
            return;
          }

          try {
            await api.processarPedidoCambioOperacional(id, { decisao, motivoRejeicao, caixaId, notas });
            mostrarToast("Pedido de câmbio processado com sucesso.", "sucesso");
            fecharModal();
            await Promise.all([carregarDashboard(), carregarFila()]);
          } catch (err: any) {
            mostrarToast(`Erro ao processar pedido de câmbio: ${err.message}`, "erro");
          }
        });
      } else if (tipo === "pedido_remessa") {
        const radios = container.querySelectorAll<HTMLInputElement>('input[name="decisao_remessa"]');
        const blocoParceiro = container.querySelector<HTMLDivElement>("#bloco-remessa-parceiro");
        const blocoRejeitar = container.querySelector<HTMLDivElement>("#bloco-remessa-rejeitar");
        radios.forEach((r) => {
          r.addEventListener("change", () => {
            if (r.value === "atribuir_parceiro") {
              if (blocoParceiro) blocoParceiro.style.display = "block";
              if (blocoRejeitar) blocoRejeitar.style.display = "none";
            } else if (r.value === "rejeitar") {
              if (blocoParceiro) blocoParceiro.style.display = "none";
              if (blocoRejeitar) blocoRejeitar.style.display = "block";
            } else {
              if (blocoParceiro) blocoParceiro.style.display = "none";
              if (blocoRejeitar) blocoRejeitar.style.display = "none";
            }
          });
        });

        container.querySelector("#btn-confirmar-tratamento")?.addEventListener("click", async () => {
          const decisao = (container.querySelector('input[name="decisao_remessa"]:checked') as HTMLInputElement).value as "atribuir_parceiro" | "liquidar_direto" | "rejeitar";
          const parceiroId = (container.querySelector("#modal-remessa-parceiro-id") as HTMLSelectElement)?.value || undefined;
          const motivoRejeicao = (container.querySelector("#modal-remessa-motivo") as HTMLTextAreaElement)?.value.trim() || undefined;
          const notas = (container.querySelector("#modal-remessa-notas") as HTMLTextAreaElement)?.value.trim() || undefined;

          if (decisao === "atribuir_parceiro" && !parceiroId) {
            mostrarToast("Selecione um parceiro comercial ativo.", "aviso");
            return;
          }
          if (decisao === "rejeitar" && !motivoRejeicao) {
            mostrarToast("O motivo da rejeição é obrigatório.", "aviso");
            return;
          }

          try {
            await api.processarPedidoRemessaOperacional(id, { decisao, parceiroId, motivoRejeicao, notas });
            mostrarToast("Remessa processada com sucesso.", "sucesso");
            fecharModal();
            await Promise.all([carregarDashboard(), carregarFila()]);
          } catch (err: any) {
            mostrarToast(`Erro ao processar remessa: ${err.message}`, "erro");
          }
        });
      } else if (tipo === "kyc_dossie" || tipo === "kyc_documento") {
        container.querySelector("#btn-descarregar-doc-kyc")?.addEventListener("click", () => {
          window.open(`/api/v1/kyc/documentos/${id}/download`, "_blank");
        });

        const radios = container.querySelectorAll<HTMLInputElement>('input[name="decisao_kyc"]');
        const blocoMotivo = container.querySelector<HTMLDivElement>("#bloco-kyc-motivo");
        radios.forEach((r) => {
          r.addEventListener("change", () => {
            if (r.value === "aprovado") {
              if (blocoMotivo) blocoMotivo.style.display = "none";
            } else {
              if (blocoMotivo) blocoMotivo.style.display = "block";
            }
          });
        });

        container.querySelector("#btn-confirmar-tratamento")?.addEventListener("click", async () => {
          const statusValidacao = (container.querySelector('input[name="decisao_kyc"]:checked') as HTMLInputElement).value as "aprovado" | "rejeitado" | "pendente_atualizacao";
          const motivoRejeicao = (container.querySelector("#modal-kyc-motivo") as HTMLTextAreaElement)?.value.trim() || undefined;

          if (statusValidacao !== "aprovado" && !motivoRejeicao) {
            mostrarToast("A justificação do motivo regulamentar é obrigatória.", "aviso");
            return;
          }

          try {
            await api.decidirDocumentoKycOperacional(id, { statusValidacao, motivoRejeicao });
            mostrarToast("Decisão sobre documento KYC registada.", "sucesso");
            fecharModal();
            await Promise.all([carregarDashboard(), carregarFila()]);
          } catch (err: any) {
            mostrarToast(`Erro ao validar documento KYC: ${err.message}`, "erro");
          }
        });
      } else if (tipo === "liquidacao_manual" && detalhes.operadorId !== usuario?.id) {
        container.querySelector("#btn-confirmar-tratamento")?.addEventListener("click", async () => {
          const decisao = (container.querySelector('input[name="decisao_liquidacao"]:checked') as HTMLInputElement).value;
          const notas = (container.querySelector("#modal-liquidacao-notas") as HTMLTextAreaElement)?.value.trim();

          try {
            if (decisao === "aprovar") {
              await api.aprovarIntegracaoManual(id, notas || undefined);
            } else {
              if (!notas) {
                mostrarToast("O motivo de rejeição é obrigatório.", "aviso");
                return;
              }
              await api.rejeitarIntegracaoManual(id, notas);
            }
            mostrarToast("Decisão de liquidação manual registada.", "sucesso");
            fecharModal();
            await Promise.all([carregarDashboard(), carregarFila()]);
          } catch (err: any) {
            mostrarToast(`Erro na decisão de liquidação manual: ${err.message}`, "erro");
          }
        });
      }
    } catch (err: any) {
      mostrarToast(`Falha ao carregar detalhes: ${err.message}`, "erro");
    }
  }

  // Eventos de Filtro e Busca
  btnRecarregar?.addEventListener("click", () => {
    void Promise.all([carregarDashboard(), carregarFila(), carregarCaixas()]);
  });

  inputBusca?.addEventListener("input", () => {
    filtroBusca = inputBusca.value.trim();
    void carregarFila();
  });

  selectTipo?.addEventListener("change", () => {
    filtroTipo = selectTipo.value;
    void carregarFila();
  });

  selectEstado?.addEventListener("change", () => {
    filtroEstado = selectEstado.value;
    void carregarFila();
  });

  selectPrioridade?.addEventListener("change", () => {
    filtroPrioridade = selectPrioridade.value;
    void carregarFila();
  });

  checkMinhas?.addEventListener("change", () => {
    filtroApenasMinhas = checkMinhas.checked;
    void carregarFila();
  });

  btnLimpar?.addEventListener("click", () => {
    filtroTipo = "";
    filtroEstado = "";
    filtroPrioridade = "";
    filtroApenasMinhas = false;
    filtroBusca = "";

    if (inputBusca) inputBusca.value = "";
    if (selectTipo) selectTipo.value = "";
    if (selectEstado) selectEstado.value = "";
    if (selectPrioridade) selectPrioridade.value = "";
    if (checkMinhas) checkMinhas.checked = false;

    void carregarFila();
  });

  // Atalhos Rápidos nos Cards do Topo
  container.querySelector("#card-filtro-cambio")?.addEventListener("click", () => {
    filtroTipo = "pedido_cambio";
    if (selectTipo) selectTipo.value = "pedido_cambio";
    void carregarFila();
  });

  container.querySelector("#card-filtro-remessas")?.addEventListener("click", () => {
    filtroTipo = "pedido_remessa";
    if (selectTipo) selectTipo.value = "pedido_remessa";
    void carregarFila();
  });

  container.querySelector("#card-filtro-kyc")?.addEventListener("click", () => {
    filtroTipo = "kyc_dossie";
    if (selectTipo) selectTipo.value = "kyc_dossie";
    void carregarFila();
  });

  container.querySelector("#card-filtro-liquidacoes")?.addEventListener("click", () => {
    filtroTipo = "liquidacao_manual";
    if (selectTipo) selectTipo.value = "liquidacao_manual";
    void carregarFila();
  });

  container.querySelector("#card-filtro-caixa")?.addEventListener("click", () => {
    const secao = container.querySelector("#secao-supervisao-caixas");
    secao?.scrollIntoView({ behavior: "smooth" });
  });

  // Inicialização paralela
  await Promise.all([carregarDashboard(), carregarFila(), carregarCaixas()]);
}

// Funções Auxiliares de Apresentação
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarMoeda(val: any): string {
  const num = parseFloat(String(val || "0"));
  if (isNaN(num)) return "0,00";
  return num.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(dataStr: any): string {
  if (!dataStr) return "N/A";
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return String(dataStr);
    return d.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dataStr);
  }
}

function formatarTipoBadge(tipo: string): string {
  switch (tipo) {
    case "pedido_cambio":
      return `<span class="badge badge-info"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M7 10h14l-4-4"></path><path d="M17 14H3l4 4"></path></svg>Câmbio Online</span>`;
    case "pedido_remessa":
      return `<span class="badge badge-primary" style="background: var(--nz-azul-600); color: #fff;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>Remessa</span>`;
    case "kyc_dossie":
    case "kyc_documento":
      return `<span class="badge badge-warning"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Dossiê KYC</span>`;
    case "liquidacao_manual":
      return `<span class="badge badge-danger"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>4 Olhos AML</span>`;
    case "alerta_caixa":
    case "caixa_alerta":
      return `<span class="badge badge-warning"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>Alerta Caixa</span>`;
    default:
      return `<span class="badge badge-secondary">${escapeHtml(tipo)}</span>`;
  }
}

function formatarPrioridadeBadge(prioridade: string): string {
  switch (prioridade) {
    case "urgente":
      return `<span class="badge badge-danger" style="animation: pulse 1.5s infinite;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Urgente</span>`;
    case "alta":
      return `<span class="badge badge-warning"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>Alta</span>`;
    case "normal":
    default:
      return `<span class="badge badge-secondary">Normal</span>`;
  }
}

function formatarEstadoBadge(estado: string): string {
  switch (estado) {
    case "pendente":
      return `<span class="badge badge-warning">Pendente</span>`;
    case "em_processamento":
    case "em_analise":
      return `<span class="badge badge-info">Em Análise</span>`;
    case "executada":
    case "aprovado":
    case "valido":
    case "concluida":
      return `<span class="badge badge-success">Concluído</span>`;
    case "rejeitada":
    case "rejeitado":
    case "invalido":
      return `<span class="badge badge-danger">Rejeitado</span>`;
    default:
      return `<span class="badge badge-secondary">${escapeHtml(estado)}</span>`;
  }
}
