import { api, type TaxaItem, type PedidoCambio } from "../api.js";
import { icone } from "../components/icones.js";
import { TEXTOS, obterRotuloEstadoCambio } from "../textos/pt-AO.js";
import { formatarMontante, formatarTaxa, formatarDataHora } from "../formatadores/moeda.js";
import { renderizarM2Assistente } from "../modelos/M2_Assistente.js";
import { renderizarM3Detalhe } from "../modelos/M3_Detalhe.js";

export function renderCambioView(container: HTMLElement, subRota: string = ""): () => void {
  let taxas: TaxaItem[] = [];
  let pedidos: PedidoCambio[] = [];
  let carregando = true;
  let timerIntervalo: any = null;

  // Estado da Lista
  let filtroTexto = "";
  let filtroMoeda = "todas";
  let filtroEstado = "todos";

  // Estado do Assistente Novo Pedido
  let passoAtual = 1;
  let tipoOperacao: "compra" | "venda" = "compra";
  let moeda: "USD" | "EUR" = "USD";
  let montanteDivisa: string = "500.00";
  let finalidade = "Despesas de viagem pessoal / turismo";
  let metodoPagamento = "mcx";
  let telefoneMcx = "";
  let segundosRestantes = 90;
  let pedidoCriadoSucesso: PedidoCambio | null = null;
  let aSubmeter = false;
  let erroFormulario = "";

  async function carregarDados() {
    try {
      carregando = true;
      const [listaTaxas, listaPedidos] = await Promise.all([
        api.obterTaxas(),
        api.listarPedidosCambio(),
      ]);
      taxas = listaTaxas;
      pedidos = listaPedidos;
    } catch (e) {
      console.error("Erro ao carregar dados de câmbio:", e);
    } finally {
      carregando = false;
      render();
    }
  }

  function calcularSimulacao() {
    const item = taxas.find((t) => t.moeda === moeda);
    const taxaAplicada = item ? (tipoOperacao === "compra" ? parseFloat(item.venda) : parseFloat(item.compra)) : 0;
    const montante = parseFloat(montanteDivisa) || 0;
    const totalAoa = montante * taxaAplicada;
    return { taxaAplicada, montante, totalAoa };
  }

  function iniciarTimerCotacao() {
    if (timerIntervalo) clearInterval(timerIntervalo);
    segundosRestantes = 90;
    timerIntervalo = setInterval(() => {
      segundosRestantes--;
      const elTimer = container.querySelector("#countdown-cotacao-badge");
      if (elTimer) {
        elTimer.innerHTML = `${icone("relogio", 14)} <span>Cotação válida: ${segundosRestantes}s</span>`;
        if (segundosRestantes <= 15) {
          elTimer.classList.add("expirando");
        }
      }
      if (segundosRestantes <= 0) {
        clearInterval(timerIntervalo);
        if (passoAtual < 4) {
          erroFormulario = TEXTOS.erros.cotacaoExpirada;
          render();
        }
      }
    }, 1000);
  }

  function render() {
    // 1. Rota de Detalhe: #/cambio/:id
    if (subRota && subRota !== "novo") {
      renderDetalhe(subRota);
      return;
    }

    // 2. Rota de Novo Pedido: #/cambio/novo
    if (subRota === "novo") {
      renderNovoAssistente();
      return;
    }

    // 3. Rota de Lista: #/cambio
    renderLista();
  }

  function renderLista() {
    const pedidosFiltrados = pedidos.filter((p) => {
      const bateTexto =
        !filtroTexto ||
        p.id.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        p.finalidade.toLowerCase().includes(filtroTexto.toLowerCase());
      const bateMoeda = filtroMoeda === "todas" || p.moeda === filtroMoeda;
      const bateEstado = filtroEstado === "todos" || p.estado === filtroEstado;
      return bateTexto && bateMoeda && bateEstado;
    });

    container.innerHTML = `
      <div class="m1-lista-container">
        <div class="m1-header">
          <div>
            <h1 class="m1-title">Operações de Câmbio</h1>
            <p class="m1-subtitle">Consulte o histórico ou inicie um novo pedido de câmbio de moeda estrangeira.</p>
          </div>
          <a href="#/cambio/novo" class="btn btn-primary">
            ${icone("cambio", 18)}
            <span>${TEXTOS.botoes.trocarMoeda}</span>
          </a>
        </div>

        <div class="m1-toolbar">
          <div class="m1-search-box">
            <span class="m1-search-icon">${icone("pesquisar", 18)}</span>
            <input
              type="text"
              id="input-pesquisa-cambio"
              class="m1-search-input"
              placeholder="Pesquisar por referência ou finalidade..."
              value="${filtroTexto}"
            />
          </div>

          <div class="m1-filters-row">
            <div class="m1-filter-group">
              <label for="filtro-moeda-cambio">Moeda</label>
              <select id="filtro-moeda-cambio" class="m1-filter-select">
                <option value="todas" ${filtroMoeda === "todas" ? "selected" : ""}>Todas as moedas</option>
                <option value="USD" ${filtroMoeda === "USD" ? "selected" : ""}>USD — Dólar Americano</option>
                <option value="EUR" ${filtroMoeda === "EUR" ? "selected" : ""}>EUR — Euro</option>
              </select>
            </div>

            <div class="m1-filter-group">
              <label for="filtro-estado-cambio">Estado</label>
              <select id="filtro-estado-cambio" class="m1-filter-select">
                <option value="todos" ${filtroEstado === "todos" ? "selected" : ""}>Todos os estados</option>
                <option value="pendente" ${filtroEstado === "pendente" ? "selected" : ""}>Aguarda pagamento</option>
                <option value="em_analise" ${filtroEstado === "em_analise" ? "selected" : ""}>Em análise</option>
                <option value="concluido" ${filtroEstado === "concluido" ? "selected" : ""}>Concluído</option>
                <option value="cancelado" ${filtroEstado === "cancelado" ? "selected" : ""}>Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card m1-table-card">
          ${
            pedidosFiltrados.length === 0
              ? `
            <div class="m1-empty-state">
              <div class="m1-empty-icon">${icone("cambio", 32)}</div>
              <p class="m1-empty-text">${TEXTOS.vazios.semCambio}</p>
              <a href="#/cambio/novo" class="btn btn-primary mt-medium">
                ${TEXTOS.botoes.trocarMoeda}
              </a>
            </div>
          `
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Ref. Pedido</th>
                    <th>Operação</th>
                    <th>Montante</th>
                    <th>Taxa Aplicada</th>
                    <th>Total em Kwanzas</th>
                    <th>Data</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${pedidosFiltrados
                    .map(
                      (p) => `
                    <tr>
                      <td><code>${p.id}</code></td>
                      <td><strong>${p.tipoOperacao === "compra" ? "Compra de Divisa" : "Venda de Divisa"}</strong></td>
                      <td><strong>${formatarMontante(p.montanteDivisa, p.moeda)}</strong></td>
                      <td>${formatarTaxa(p.taxaProposta, 4)}</td>
                      <td>${formatarMontante(p.totalAoaEstimado, "AOA")}</td>
                      <td>${formatarDataHora(p.criadoEm)}</td>
                      <td><span class="badge badge-${p.estado}">${obterRotuloEstadoCambio(p.estado)}</span></td>
                      <td>
                        <a href="#/cambio/${p.id}" class="btn btn-secondary btn-sm">
                          ${TEXTOS.botoes.verDetalhes}
                        </a>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
            <div class="m1-pagination-footer">
              <span>Total: <strong>${pedidosFiltrados.length}</strong> registo(s)</span>
            </div>
          `
          }
        </div>
      </div>
    `;

    // Listeners da Lista
    container.querySelector("#input-pesquisa-cambio")?.addEventListener("input", (e) => {
      filtroTexto = (e.target as HTMLInputElement).value;
      render();
    });

    container.querySelector("#filtro-moeda-cambio")?.addEventListener("change", (e) => {
      filtroMoeda = (e.target as HTMLSelectElement).value;
      render();
    });

    container.querySelector("#filtro-estado-cambio")?.addEventListener("change", (e) => {
      filtroEstado = (e.target as HTMLSelectElement).value;
      render();
    });
  }

  function renderNovoAssistente() {
    const { taxaAplicada, montante, totalAoa } = calcularSimulacao();

    const passos = [
      { numero: 1, rotulo: "Montante" },
      { numero: 2, rotulo: "Pagamento" },
      { numero: 3, rotulo: "Confirmação" },
      { numero: 4, rotulo: "Comprovativo" },
    ];

    let conteudoHtml = "";
    if (passoAtual === 1) {
      conteudoHtml = `
        <div class="stepper-step-body">
          <div class="timer-ribbon">
            <span id="countdown-cotacao-badge" class="timer-badge" aria-live="polite">
              ${icone("relogio", 14)} <span>Cotação válida: ${segundosRestantes}s</span>
            </span>
            <small class="text-suave">A taxa oficial é mantida durante o preenchimento.</small>
          </div>

          <div class="form-group mt-medium">
            <label class="form-label">Tipo de Operação</label>
            <div class="btn-group-toggle">
              <button type="button" id="btn-tipo-compra" class="toggle-btn ${tipoOperacao === "compra" ? "ativo" : ""}">
                Comprar Divisa
              </button>
              <button type="button" id="btn-tipo-venda" class="toggle-btn ${tipoOperacao === "venda" ? "ativo" : ""}">
                Vender Divisa
              </button>
            </div>
          </div>

          <div class="form-row mt-medium">
            <div class="form-group">
              <label class="form-label" for="select-moeda-cambio">Moeda Estrangeira</label>
              <select id="select-moeda-cambio" class="form-select">
                <option value="USD" ${moeda === "USD" ? "selected" : ""}>USD — Dólar Americano</option>
                <option value="EUR" ${moeda === "EUR" ? "selected" : ""}>EUR — Euro Europeu</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="input-montante-cambio">Montante em Divisa</label>
              <input type="number" id="input-montante-cambio" class="form-input" min="10" step="10" value="${montanteDivisa}" required />
            </div>
          </div>

          <div class="form-group mt-medium">
            <label class="form-label" for="select-finalidade-cambio">Finalidade da Operação Cambial</label>
            <select id="select-finalidade-cambio" class="form-select">
              <option value="Despesas de viagem pessoal / turismo">Despesas de viagem pessoal / turismo</option>
              <option value="Tratamento médico / saúde no exterior">Tratamento médico / saúde no exterior</option>
              <option value="Educação e formação internacional">Educação e formação internacional</option>
              <option value="Importação de mercadorias / serviços">Importação de mercadorias / serviços</option>
              <option value="Outras despesas autorizadas pelo BNA">Outras despesas autorizadas pelo BNA</option>
            </select>
          </div>
        </div>
      `;
    } else if (passoAtual === 2) {
      conteudoHtml = `
        <div class="stepper-step-body">
          <h2 class="card-title-md">Escolha o Método de Pagamento</h2>
          <p class="text-suave mb-medium">Selecione o canal para liquidação da sua operação cambial.</p>

          <div class="payment-methods-grid">
            <label class="payment-option ${metodoPagamento === "mcx" ? "selecionado" : ""}">
              <input type="radio" name="metodo-pag" value="mcx" ${metodoPagamento === "mcx" ? "checked" : ""} />
              <div class="payment-option-content">
                <strong>Multicaixa Express</strong>
                <span>Confirmação imediata e aprovação pelo telemóvel</span>
              </div>
            </label>

            <label class="payment-option ${metodoPagamento === "ref" ? "selecionado" : ""}">
              <input type="radio" name="metodo-pag" value="ref" ${metodoPagamento === "ref" ? "checked" : ""} />
              <div class="payment-option-content">
                <strong>Pagamento por Referência</strong>
                <span>Gera entidade e referência para pagamento no Multicaixa</span>
              </div>
            </label>

            <label class="payment-option ${metodoPagamento === "balcao" ? "selecionado" : ""}">
              <input type="radio" name="metodo-pag" value="balcao" ${metodoPagamento === "balcao" ? "checked" : ""} />
              <div class="payment-option-content">
                <strong>Pagamento no Balcão NZAIDI</strong>
                <span>Liquidação direta e entrega física no balcão autorizado</span>
              </div>
            </label>
          </div>

          ${
            metodoPagamento === "mcx"
              ? `
            <div class="form-group mt-medium p-small bg-suave border-rounded">
              <label class="form-label" for="input-tel-mcx">Número de Telemóvel Multicaixa Express</label>
              <input type="tel" id="input-tel-mcx" class="form-input" placeholder="9XX XXX XXX" value="${telefoneMcx}" />
              <small class="form-hint">Receberá um pedido de autorização na aplicação Multicaixa Express.</small>
            </div>
          `
              : ""
          }
        </div>
      `;
    } else if (passoAtual === 3) {
      conteudoHtml = `
        <div class="stepper-step-body">
          <h2 class="card-title-md">Confirmação dos Dados</h2>
          <p class="text-suave mb-medium">Reveja cuidadosamente todos os elementos antes de concluir o seu pedido.</p>

          <div class="confirmation-review-box">
            <div class="review-row">
              <span>Tipo de Operação:</span>
              <strong>${tipoOperacao === "compra" ? "Compra de Divisa" : "Venda de Divisa"}</strong>
            </div>
            <div class="review-row">
              <span>Moeda e Montante:</span>
              <strong>${formatarMontante(montante, moeda)}</strong>
            </div>
            <div class="review-row">
              <span>Taxa Exata Aplicada:</span>
              <strong class="text-primario">${formatarTaxa(taxaAplicada, 4)} AOA</strong>
            </div>
            <div class="review-row">
              <span>Total em Kwanzas:</span>
              <strong class="text-huge">${formatarMontante(totalAoa, "AOA")}</strong>
            </div>
            <div class="review-row">
              <span>Método Escolhido:</span>
              <strong style="text-transform:uppercase">${metodoPagamento}</strong>
            </div>
            <div class="review-row">
              <span>Finalidade:</span>
              <span>${finalidade}</span>
            </div>
          </div>

          <div class="alert-box alert-info mt-medium">
            ${icone("seguranca", 18)}
            <span>Ao confirmar, a sua taxa de câmbio é bloqueada nos nossos sistemas sob supervisão do BNA.</span>
          </div>
        </div>
      `;
    } else {
      conteudoHtml = `
        <div class="stepper-step-body text-center p-large">
          <div class="success-icon-wrap text-sucesso mb-medium">
            ${icone("sucesso", 48)}
          </div>
          <h2 class="card-title-lg">Pedido Registado com Sucesso!</h2>
          <p class="text-suave">O seu pedido foi registado com a referência única <strong>${pedidoCriadoSucesso?.id || "NZ-CAMB-001"}</strong>.</p>

          <div class="success-receipt-card mt-large">
            <div class="receipt-row">
              <span>Referência:</span>
              <code>${pedidoCriadoSucesso?.id || "NZ-CAMB-001"}</code>
            </div>
            <div class="receipt-row">
              <span>Montante:</span>
              <strong>${formatarMontante(montante, moeda)}</strong>
            </div>
            <div class="receipt-row">
              <span>Total Liquidado:</span>
              <strong>${formatarMontante(totalAoa, "AOA")}</strong>
            </div>
          </div>

          <div class="stepper-final-actions mt-large">
            <a href="#/cambio/${pedidoCriadoSucesso?.id || ""}" class="btn btn-secondary">
              ${icone("ver", 18)} ${TEXTOS.botoes.verPedido}
            </a>
            <button onclick="window.print()" class="btn btn-primary">
              ${icone("descarregar", 18)} ${TEXTOS.botoes.descarregarComprovativo}
            </button>
          </div>
        </div>
      `;
    }

    const resumoLateralHtml = `
      <div class="stepper-side-summary">
        <div class="summary-line">
          <span>Taxa Oficial Fixada:</span>
          <strong>${formatarTaxa(taxaAplicada, 4)}</strong>
        </div>
        <div class="summary-line">
          <span>Montante Divisa:</span>
          <strong>${formatarMontante(montante, moeda)}</strong>
        </div>
        <hr class="summary-hr" />
        <div class="summary-total-line">
          <span>Total Estimado:</span>
          <span class="summary-total-val">${formatarMontante(totalAoa, "AOA")}</span>
        </div>
      </div>
    `;

    container.innerHTML = renderizarM2Assistente({
      titulo: "Novo Pedido de Câmbio",
      passos,
      passoAtual,
      conteudoHtml,
      resumoHtml: resumoLateralHtml,
      podeVoltar: passoAtual > 1 && passoAtual < 4,
      podeContinuar: passoAtual < 4,
      rotuloContinuar: passoAtual === 3 ? TEXTOS.botoes.confirmarPedido : TEXTOS.botoes.continuar,
      rotuloVoltar: TEXTOS.botoes.voltar,
      aCarregar: aSubmeter,
    });

    if (passoAtual === 1) iniciarTimerCotacao();

    // Eventos do Assistente
    container.querySelector("#btn-tipo-compra")?.addEventListener("click", () => {
      tipoOperacao = "compra";
      render();
    });

    container.querySelector("#btn-tipo-venda")?.addEventListener("click", () => {
      tipoOperacao = "venda";
      render();
    });

    container.querySelector("#select-moeda-cambio")?.addEventListener("change", (e) => {
      moeda = (e.target as HTMLSelectElement).value as any;
      render();
    });

    container.querySelector("#input-montante-cambio")?.addEventListener("input", (e) => {
      montanteDivisa = (e.target as HTMLInputElement).value;
    });

    container.querySelector("#select-finalidade-cambio")?.addEventListener("change", (e) => {
      finalidade = (e.target as HTMLSelectElement).value;
    });

    container.querySelectorAll("input[name='metodo-pag']").forEach((radio) => {
      radio.addEventListener("change", (e) => {
        metodoPagamento = (e.target as HTMLInputElement).value;
        render();
      });
    });

    container.querySelector("#input-tel-mcx")?.addEventListener("input", (e) => {
      telefoneMcx = (e.target as HTMLInputElement).value;
    });

    container.querySelector("#btn-m2-voltar")?.addEventListener("click", () => {
      if (passoAtual > 1) {
        passoAtual--;
        render();
      }
    });

    container.querySelector("#btn-m2-continuar")?.addEventListener("click", async () => {
      if (passoAtual === 1) {
        if (!montanteDivisa || parseFloat(montanteDivisa) <= 0) {
          alert("Introduza um montante válido superior a zero.");
          return;
        }
        passoAtual = 2;
        render();
      } else if (passoAtual === 2) {
        passoAtual = 3;
        render();
      } else if (passoAtual === 3) {
        try {
          aSubmeter = true;
          render();
          const novo = await api.criarPedidoCambio({
            tipoOperacao,
            moeda,
            montanteDivisa,
            finalidade,
            metodoPagamento,
          });
          pedidoCriadoSucesso = novo;
          passoAtual = 4;
          if (timerIntervalo) clearInterval(timerIntervalo);
        } catch (err: any) {
          alert(err.message || TEXTOS.erros.generico);
        } finally {
          aSubmeter = false;
          render();
        }
      }
    });
  }

  async function renderDetalhe(id: string) {
    const pedido = pedidos.find((p) => p.id === id) || (await api.obterPedidoCambio(id));
    if (!pedido) {
      container.innerHTML = `
        <div class="m1-empty-state">
          <p>Pedido de câmbio não encontrado.</p>
          <a href="#/cambio" class="btn btn-secondary mt-small">${TEXTOS.botoes.voltar}</a>
        </div>
      `;
      return;
    }

    container.innerHTML = renderizarM3Detalhe({
      titulo: `Pedido de Câmbio ${pedido.id}`,
      subtitulo: `Criado a ${formatarDataHora(pedido.criadoEm)} sob normativo do Banco Nacional de Angola`,
      referencia: pedido.id,
      estadoBadgeHtml: `<span class="badge badge-${pedido.estado}">${obterRotuloEstadoCambio(pedido.estado)}</span>`,
      linhaTemporal: [
        {
          titulo: "Registo da Ordem de Câmbio",
          descricao: "Intenção de câmbio submetida no portal oficial.",
          dataHora: formatarDataHora(pedido.criadoEm),
          estado: "concluido",
        },
        {
          titulo: "Verificação e Liquidação Financeira",
          descricao: "Aferição do pagamento e emissão do comprovativo com selo BNA.",
          estado: pedido.estado === "concluido" ? "concluido" : "atual",
        },
        {
          titulo: "Borderô Emitido e Conclusão",
          descricao: "Operação arquivada nos reportes regulamentares.",
          estado: pedido.estado === "concluido" ? "concluido" : "pendente",
        },
      ],
      dadosPrincipais: [
        { rotulo: "Operação", valor: pedido.tipoOperacao === "compra" ? "Compra de Divisa" : "Venda de Divisa" },
        { rotulo: "Moeda Estrangeira", valor: pedido.moeda },
        { rotulo: "Montante em Divisa", valor: formatarMontante(pedido.montanteDivisa, pedido.moeda), destaque: true },
        { rotulo: "Taxa Fixada", valor: `${formatarTaxa(pedido.taxaProposta, 4)} AOA` },
        { rotulo: "Finalidade Declarada", valor: pedido.finalidade },
        { rotulo: "Código de Rastreio", valor: pedido.id, copiavel: true },
      ],
      resumoValoresHtml: `
        <div class="summary-line">
          <span>Montante em Divisa:</span>
          <strong>${formatarMontante(pedido.montanteDivisa, pedido.moeda)}</strong>
        </div>
        <div class="summary-line">
          <span>Taxa Proposta Oficial:</span>
          <strong>${formatarTaxa(pedido.taxaProposta, 4)}</strong>
        </div>
        <hr class="summary-hr" />
        <div class="summary-total-line">
          <span>Total em Kwanzas:</span>
          <span class="summary-total-val">${formatarMontante(pedido.totalAoaEstimado, "AOA")}</span>
        </div>
      `,
      botaoVoltarRota: "/cambio",
      botaoComprovativo: {
        rotulo: TEXTOS.botoes.descarregarComprovativo,
        onClick: () => window.print(),
      },
    });

    container.querySelector("#btn-m3-comprovativo")?.addEventListener("click", () => {
      window.print();
    });
  }

  carregarDados();

  return () => {
    if (timerIntervalo) clearInterval(timerIntervalo);
  };
}
