import { api, type ExecucaoIntegracaoManualItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export async function renderizarIntegracoes(container: HTMLElement): Promise<void> {
  const podeConsultar = authState.temPermissao("integracoes:consultar_manual");
  const podeLiquidar = authState.temPermissao("integracoes:liquidar_manual");

  if (!podeConsultar && !podeLiquidar) {
    container.innerHTML = `
      <div class="alert-box alert-error">
        <strong>Acesso Negado:</strong> O seu perfil não possui autorização para aceder ao módulo de Integrações e Conciliação.
      </div>
    `;
    return;
  }

  const usuarioAtual = authState.getUsuario();

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Integrações & Conciliação Manual</h1>
        <p class="view-subtitle">Execução assistida, liquidação de parceiros e conciliação bancária (NZAIDI-MANUAL-01)</p>
      </div>
      <div class="view-actions">
        ${
          podeLiquidar
            ? `
          <button id="btn-nova-execucao-manual" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nova Liquidação Manual
          </button>
        `
            : ""
        }
        <button id="btn-recarregar-execucoes" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Actualizar
        </button>
      </div>
    </div>

    <div class="alert-box alert-info">
      <strong>Regras de Controlo Financeiro e Conformidade:</strong>
      <ul style="margin: 6px 0 0 18px; padding: 0;">
        <li>As liquidações manuais bancárias (transferências, GPO, Wise, MaxPay) <strong>não afetam o caixa físico</strong> de numerário dos operadores de balcão.</li>
        <li>Operações de valor igual ou superior a <strong>5.000.000 AOA</strong> entram em estado <em>Pendente</em> e requerem aprovação por um segundo operador (Segregação de Funções / 4 Olhos).</li>
        <li>A referência externa é validada por canal para impedir liquidações em duplicado.</li>
      </ul>
    </div>

    <!-- Filtros de Consulta -->
    <div class="card mb-4">
      <div class="card-body" style="padding: 12px 16px;">
        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
          <div>
            <label for="filtro-estado-manual" style="font-size: 13px; font-weight: 500; margin-right: 8px;">Estado:</label>
            <select id="filtro-estado-manual" class="form-input" style="width: auto; display: inline-block;">
              <option value="">Todos os estados</option>
              <option value="pendente">Pendente (Requer 4 Olhos)</option>
              <option value="concluida">Concluída</option>
              <option value="rejeitada">Rejeitada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div id="resumo-contador-execucoes" class="text-muted" style="font-size: 13px;"></div>
      </div>
    </div>

    <!-- Tabela de Execuções -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Histórico de Liquidações e Conciliações</h2>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive" id="tabela-execucoes-container">
          <div class="loading-state">A carregar execuções manuais...</div>
      </div>
    </div>

    <!-- Modal de Nova Liquidação Manual -->
    <div id="modal-execucao-manual" class="modal-overlay d-none">
      <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">Registar Liquidação Manual de Integração</h3>
            <button type="button" class="btn-fechar-modal" id="btn-fechar-modal-execucao">&times;</button>
          </div>
          <form id="form-execucao-manual">
            <div class="modal-body">
              <div id="modal-alerta-erro" class="alert-box alert-error" style="display: none; margin-bottom: 12px;"></div>

              <div class="form-group mb-3">
                <label class="form-label" for="manual-transacao-id">ID da Transacção / Remessa *</label>
                <input type="text" id="manual-transacao-id" class="form-input" placeholder="Ex: REM-2026-0045" required />
                <small class="text-muted">Identificador interno da operação ou remessa a liquidar.</small>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group mb-3">
                  <label class="form-label" for="manual-tipo">Tipo de Integração *</label>
                  <select id="manual-tipo" class="form-select" required>
                    <option value="remessa_parceiro">Remessa com Parceiro</option>
                    <option value="recebimento_kwanza">Recebimento Kwanza (Multicaixa / Banco)</option>
                    <option value="liquidacao_wise">Liquidação Externa Wise</option>
                    <option value="ajuste_conciliacao">Ajuste de Conciliação</option>
                  </select>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label" for="manual-canal">Canal de Origem *</label>
                  <select id="manual-canal" class="form-select" required>
                    <option value="wise">Wise</option>
                    <option value="maxpay">MaxPay</option>
                    <option value="realtransfers">RealTransfers</option>
                    <option value="multicaixa_gpo">Multicaixa GPO / Rede EMIS</option>
                    <option value="banco_bai">Banco BAI</option>
                    <option value="banco_bfa">Banco BFA</option>
                    <option value="banco_bma">Banco BMA</option>
                    <option value="banco_bir">Banco BIR</option>
                    <option value="outro">Outro Parceiro Bancário</option>
                  </select>
                </div>
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="manual-ref-externa">Referência Externa Bancária / Parceiro *</label>
                <input type="text" id="manual-ref-externa" class="form-input" placeholder="Ex: MCX-9948271 ou MP-TX-88371" required />
                <small class="text-muted">Número de comprovativo único emitido pelo canal pagador.</small>
              </div>

              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
                <div class="form-group mb-3">
                  <label class="form-label" for="manual-valor">Montante *</label>
                  <input type="text" id="manual-valor" class="form-input" placeholder="0.00" required />
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="manual-moeda">Moeda *</label>
                  <select id="manual-moeda" class="form-select" required>
                    <option value="AOA" selected>AOA (Kwanza)</option>
                    <option value="USD">USD (Dólar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (Libra)</option>
                    <option value="ZAR">ZAR (Rand)</option>
                  </select>
                </div>
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="manual-chave-idemp">Chave de Idempotência *</label>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="manual-chave-idemp" class="form-input" required readonly />
                  <button type="button" id="btn-gerar-chave" class="btn btn-secondary" style="white-space: nowrap;">Gerar Nova</button>
                </div>
                <small class="text-muted">Garante que a liquidação nunca seja submetida duas vezes.</small>
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="manual-comprovativo">Nome / Ref. do Comprovativo Anexado</label>
                <input type="text" id="manual-comprovativo" class="form-input" placeholder="Ex: comprovativo_multicaixa_recibo.pdf" />
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="manual-notas">Notas e Justificativa de Conciliação</label>
                <textarea id="manual-notas" class="form-textarea" rows="2" placeholder="Observações do operador de tesouraria..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancelar-modal-execucao">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btn-salvar-execucao">Confirmar Liquidação</button>
            </div>
          </form>
      </div>
    </div>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-execucoes-container");
  const filtroEstado = container.querySelector<HTMLSelectElement>("#filtro-estado-manual");
  const resumoContador = container.querySelector<HTMLDivElement>("#resumo-contador-execucoes");
  const btnRecarregar = container.querySelector<HTMLButtonElement>("#btn-recarregar-execucoes");
  const btnNova = container.querySelector<HTMLButtonElement>("#btn-nova-execucao-manual");
  const modal = container.querySelector<HTMLDivElement>("#modal-execucao-manual");
  const btnFecharModal = container.querySelector<HTMLButtonElement>("#btn-fechar-modal-execucao");
  const btnCancelarModal = container.querySelector<HTMLButtonElement>("#btn-cancelar-modal-execucao");
  const btnGerarChave = container.querySelector<HTMLButtonElement>("#btn-gerar-chave");
  const inputChaveIdemp = container.querySelector<HTMLInputElement>("#manual-chave-idemp");
  const formExecucao = container.querySelector<HTMLFormElement>("#form-execucao-manual");
  const modalAlerta = container.querySelector<HTMLDivElement>("#modal-alerta-erro");

  function gerarChaveIdempotencia(): string {
    const aleatorio = Math.random().toString(36).substring(2, 10);
    return `idemp_${Date.now()}_${aleatorio}`;
  }

  function abrirModal(): void {
    if (!modal) return;
    if (formExecucao) formExecucao.reset();
    if (modalAlerta) {
      modalAlerta.style.display = "none";
      modalAlerta.textContent = "";
    }
    if (inputChaveIdemp) {
      inputChaveIdemp.value = gerarChaveIdempotencia();
    }
    modal.classList.remove("d-none");
  }

  function fecharModal(): void {
    if (!modal) return;
    modal.classList.add("d-none");
  }

  btnNova?.addEventListener("click", abrirModal);
  btnFecharModal?.addEventListener("click", fecharModal);
  btnCancelarModal?.addEventListener("click", fecharModal);
  btnGerarChave?.addEventListener("click", () => {
    if (inputChaveIdemp) inputChaveIdemp.value = gerarChaveIdempotencia();
  });

  async function carregarExecucoes(): Promise<void> {
    if (!containerTabela) return;
    containerTabela.innerHTML = `<div class="loading-state">A carregar execuções manuais...</div>`;

    try {
      const estadoSelecionado = filtroEstado?.value || undefined;
      const res = await api.listarIntegracoesManuais(50, 0, estadoSelecionado);
      const lista: ExecucaoIntegracaoManualItem[] = res.itens ?? [];

      if (resumoContador) {
        resumoContador.textContent = `Total apresentado: ${lista.length} liquidações`;
      }

      if (lista.length === 0) {
        containerTabela.innerHTML = `<p class="p-4 text-muted">Nenhuma execução manual registada com os filtros aplicados.</p>`;
        return;
      }

      containerTabela.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Data & Hora</th>
              <th>Transacção</th>
              <th>Canal</th>
              <th>Ref. Externa</th>
              <th>Montante</th>
              <th>Operador</th>
              <th>Estado</th>
              <th>Aprovador (4-Olhos)</th>
              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            ${lista
              .map((item) => {
                const pendente = item.estado === "pendente";
                const badgeClasse =
                  item.estado === "concluida"
                    ? "badge-success"
                    : item.estado === "pendente"
                    ? "badge-warning"
                    : "badge-danger";

                const formatarMontante = `${Number(item.valorMoeda).toLocaleString("pt-AO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ${item.moeda}`;

                // Se está pendente, verificar se o utilizador autenticado pode aprovar (deve ser outro operador)
                const podeAprovarEsteItem =
                  podeLiquidar && pendente && usuarioAtual && usuarioAtual.id !== item.operadorId;
                const eCriador = usuarioAtual && usuarioAtual.id === item.operadorId;

                return `
                  <tr>
                    <td><small class="text-nowrap">${new Date(item.momentoExecucao).toLocaleString("pt-AO")}</small></td>
                    <td><strong>${item.transacaoId}</strong></td>
                    <td><span class="badge badge-action">${item.canalOrigem.toUpperCase()}</span></td>
                    <td><code>${item.referenciaExterna}</code></td>
                    <td class="text-right"><strong>${formatarMontante}</strong></td>
                    <td>
                      <div>${item.operadorNome}</div>
                      <small class="text-muted">${item.operadorFuncao}</small>
                    </td>
                    <td>
                      <span class="badge ${badgeClasse}">
                        ${item.estado === "pendente" ? "Pendente (4 Olhos)" : item.estado.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      ${
                        item.aprovadorNome
                          ? `<div>${item.aprovadorNome}</div><small class="text-muted">${item.momentoAprovacao ? new Date(item.momentoAprovacao).toLocaleString("pt-AO") : ""}</small>`
                          : '<span class="text-muted">-</span>'
                      }
                    </td>
                    <td>
                      ${
                        pendente
                          ? podeAprovarEsteItem
                            ? `
                              <div style="display: flex; gap: 4px;">
                                <button class="btn btn-sm btn-primary btn-aprovar-exec" data-id="${item.id}" title="Aprovar liquidação (Segundo Operador)">Aprovar</button>
                                <button class="btn btn-sm btn-danger btn-rejeitar-exec" data-id="${item.id}" title="Rejeitar">Rejeitar</button>
                              </div>
                            `
                            : eCriador
                            ? '<small class="text-muted">Aguardando segundo operador</small>'
                            : '<small class="text-muted">Sem alçada</small>'
                          : '<span class="text-muted">-</span>'
                      }
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      `;

      // Vincular eventos de Aprovação / Rejeição
      containerTabela.querySelectorAll<HTMLButtonElement>(".btn-aprovar-exec").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          const confirmou = window.confirm("Confirma a aprovação desta liquidação manual como segundo operador (4 Olhos)?");
          if (!confirmou) return;

          try {
            await api.aprovarIntegracaoManual(id, "Aprovação confirmada pelo segundo operador no painel administrativo.");
            await carregarExecucoes();
          } catch (erro: any) {
            alert(`Erro ao aprovar execução: ${erro.message || "Erro desconhecido"}`);
          }
        });
      });

      containerTabela.querySelectorAll<HTMLButtonElement>(".btn-rejeitar-exec").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          const motivo = window.prompt("Indique o motivo da rejeição da liquidação manual:");
          if (!motivo || motivo.trim() === "") return;

          try {
            await api.rejeitarIntegracaoManual(id, motivo);
            await carregarExecucoes();
          } catch (erro: any) {
            alert(`Erro ao rejeitar execução: ${erro.message || "Erro desconhecido"}`);
          }
        });
      });
    } catch {
      containerTabela.innerHTML = `
        <div class="p-4 text-center">
          <p class="text-danger">Erro ao carregar execuções manuais. Confirme as permissões de acesso.</p>
        </div>
      `;
    }
  }

  // Submissão do Formulário de Nova Execução
  formExecucao?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!modalAlerta) return;
    modalAlerta.style.display = "none";

    const transacaoId = (container.querySelector("#manual-transacao-id") as HTMLInputElement).value.trim();
    const tipoIntegracao = (container.querySelector("#manual-tipo") as HTMLSelectElement).value;
    const canalOrigem = (container.querySelector("#manual-canal") as HTMLSelectElement).value;
    const referenciaExterna = (container.querySelector("#manual-ref-externa") as HTMLInputElement).value.trim();
    const valorMoeda = (container.querySelector("#manual-valor") as HTMLInputElement).value.trim().replace(",", ".");
    const moeda = (container.querySelector("#manual-moeda") as HTMLSelectElement).value;
    const chaveIdempotencia = (container.querySelector("#manual-chave-idemp") as HTMLInputElement).value.trim();
    const comprovativoArquivo = (container.querySelector("#manual-comprovativo") as HTMLInputElement).value.trim() || undefined;
    const notas = (container.querySelector("#manual-notas") as HTMLTextAreaElement).value.trim() || undefined;

    if (!transacaoId || !referenciaExterna || !valorMoeda || !chaveIdempotencia) {
      modalAlerta.textContent = "Preencha todos os campos obrigatórios.";
      modalAlerta.style.display = "block";
      return;
    }

    try {
      await api.criarIntegracaoManual({
        transacaoId,
        tipoIntegracao,
        canalOrigem,
        referenciaExterna,
        valorMoeda,
        moeda,
        chaveIdempotencia,
        comprovativoArquivo,
        notas,
      });

      fecharModal();
      await carregarExecucoes();
    } catch (erro: any) {
      modalAlerta.textContent = erro.message || "Falha ao registar liquidação manual.";
      modalAlerta.style.display = "block";
    }
  });

  filtroEstado?.addEventListener("change", carregarExecucoes);
  btnRecarregar?.addEventListener("click", carregarExecucoes);

  await carregarExecucoes();
}
