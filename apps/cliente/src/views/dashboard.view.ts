import { api, type TaxaItem, type PedidoCambio, type PedidoRemessa } from "../api.js";
import { authState } from "../auth.state.js";
import { icone } from "../components/icones.js";
import { TEXTOS, obterRotuloVerificacao, obterRotuloEstadoCambio, obterRotuloEstadoRemessa } from "../textos/pt-AO.js";
import { formatarMontante, formatarTaxa, formatarDataHora } from "../formatadores/moeda.js";

export function renderDashboardView(container: HTMLElement): () => void {
  let taxas: TaxaItem[] = [];
  let pedidosCambio: PedidoCambio[] = [];
  let pedidosRemessa: PedidoRemessa[] = [];
  let carregando = true;
  let atualizandoTaxas = false;
  let intervaloTimer: any = null;

  async function carregarDados(silencioso = false) {
    if (!silencioso) carregando = true;
    else atualizandoTaxas = true;

    try {
      const [listaTaxas, listaCambios, listaRemessas] = await Promise.all([
        api.obterTaxas(),
        api.listarPedidosCambio(),
        api.listarPedidosRemessas(),
      ]);
      taxas = listaTaxas;
      pedidosCambio = listaCambios;
      pedidosRemessa = listaRemessas;
    } catch (e) {
      console.error("Erro ao carregar dados do dashboard:", e);
    } finally {
      carregando = false;
      atualizandoTaxas = false;
      render();
    }
  }

  function obterSaudacao(): string {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "Bom dia";
    if (hora >= 12 && hora < 19) return "Boa tarde";
    return "Boa noite";
  }

  function render() {
    const cliente = authState.cliente;
    if (!cliente) return;

    if (carregando) {
      container.innerHTML = `
        <div class="skeleton-dashboard">
          <div class="skeleton-header"></div>
          <div class="skeleton-grid-cards">
            <div class="skeleton-card" style="height: 220px;"></div>
            <div class="skeleton-card" style="height: 220px;"></div>
          </div>
          <div class="skeleton-card" style="height: 280px; margin-top: 1.5rem;"></div>
        </div>
      `;
      return;
    }

    const primeiroNome = cliente.nome.split(" ")[0];
    const kycAprovado = cliente.estadoKyc === "aprovado";
    const horaAtualizacao = new Date().toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });

    // Moedas USD e EUR
    const taxaUsd = taxas.find((t) => t.moeda === "USD");
    const taxaEur = taxas.find((t) => t.moeda === "EUR");

    // Atividades combinadas
    const atividades = [
      ...pedidosCambio.map((p) => ({
        id: p.id,
        tipo: "Câmbio",
        descricao: p.tipoOperacao === "compra" ? `Compra de ${p.moeda}` : `Venda de ${p.moeda}`,
        montante: formatarMontante(p.montanteDivisa, p.moeda),
        contravalor: formatarMontante(p.totalAoaEstimado, "AOA"),
        data: p.criadoEm,
        estado: obterRotuloEstadoCambio(p.estado),
        estadoClasse: p.estado,
        link: `#/cambio/${p.id}`,
      })),
      ...pedidosRemessa.map((r) => ({
        id: r.id,
        tipo: "Remessa",
        descricao: `Envio para ${r.beneficiarioPais || "Exterior"}`,
        montante: formatarMontante(r.montanteDivisa, r.moedaDestino),
        contravalor: formatarMontante(r.totalAoa, "AOA"),
        data: r.criadoEm,
        estado: obterRotuloEstadoRemessa(r.estado),
        estadoClasse: r.estado,
        link: `#/remessas/${r.id}`,
      })),
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 5);

    const totalOperacoes = pedidosCambio.length + pedidosRemessa.length;

    container.innerHTML = `
      <div class="dashboard-wrapper">
        <!-- Hero Oficial com Saudação e Data -->
        <div class="dashboard-greeting-header">
          <div class="greeting-content">
            <h1 class="greeting-title">${obterSaudacao()}, ${primeiroNome}!</h1>
            <p class="greeting-subtitle">Consulte as cotações oficiais e gira as suas operações financeiras com rigor.</p>
          </div>
          <div class="header-refresh-pill">
            <span class="live-dot"></span>
            <span>Taxas atualizadas às ${horaAtualizacao}</span>
            <button id="btn-atualizar-taxas-dash" class="btn-icon-refresh" title="${TEXTOS.botoes.atualizarTaxas}">
              ${icone("trocar", 14, atualizandoTaxas ? "girando" : "")}
            </button>
          </div>
        </div>

        <!-- Aviso KYC caso não aprovado -->
        ${
          !kycAprovado
            ? `
          <div class="card kyc-alert-banner">
            <div class="kyc-alert-icon">${icone("aviso", 24)}</div>
            <div class="kyc-alert-content">
              <strong>${TEXTOS.termos.verificacaoIdentidade}: ${obterRotuloVerificacao(cliente.estadoKyc)}</strong>
              <p>Envie os seus documentos de identificação para desbloquear as operações cambiais e remessas internacionais.</p>
            </div>
            <a href="#/documentos" class="btn btn-primary btn-sm">
              ${icone("enviarFicheiro", 16)} ${TEXTOS.botoes.enviarDocumento}
            </a>
          </div>
        `
            : ""
        }

        <!-- Grelha Principal: Taxas de Hoje e A Sua Conta -->
        <div class="dashboard-two-columns">
          <!-- Coluna 1: Cartão Taxas de Hoje -->
          <div class="card taxas-card">
            <div class="card-header-clean">
              <div>
                <h2 class="card-title-lg">Taxas de hoje</h2>
                <span class="card-subtitle-sm">Cotações oficiais publicadas com supervisão do BNA</span>
              </div>
            </div>

            <div class="taxas-grid">
              <!-- USD -->
              <div class="taxa-box">
                <div class="taxa-box-header">
                  <div class="taxa-coin-badge">USD</div>
                  <div>
                    <span class="taxa-coin-name">Dólar Americano</span>
                    <small class="taxa-bna-ref">${TEXTOS.termos.taxaRefBna}: ${formatarTaxa(taxaUsd?.referencia || "0", 2)}</small>
                  </div>
                </div>
                <div class="taxa-rates-pair">
                  <div class="rate-subbox">
                    <span class="rate-sublabel">${TEXTOS.termos.voceVende}</span>
                    <strong class="rate-value">${formatarTaxa(taxaUsd?.compra || "0", 2)}</strong>
                  </div>
                  <div class="rate-subbox">
                    <span class="rate-sublabel">${TEXTOS.termos.voceCompra}</span>
                    <strong class="rate-value text-primario">${formatarTaxa(taxaUsd?.venda || "0", 2)}</strong>
                  </div>
                </div>
              </div>

              <!-- EUR -->
              <div class="taxa-box">
                <div class="taxa-box-header">
                  <div class="taxa-coin-badge">EUR</div>
                  <div>
                    <span class="taxa-coin-name">Euro Europeu</span>
                    <small class="taxa-bna-ref">${TEXTOS.termos.taxaRefBna}: ${formatarTaxa(taxaEur?.referencia || "0", 2)}</small>
                  </div>
                </div>
                <div class="taxa-rates-pair">
                  <div class="rate-subbox">
                    <span class="rate-sublabel">${TEXTOS.termos.voceVende}</span>
                    <strong class="rate-value">${formatarTaxa(taxaEur?.compra || "0", 2)}</strong>
                  </div>
                  <div class="rate-subbox">
                    <span class="rate-sublabel">${TEXTOS.termos.voceCompra}</span>
                    <strong class="rate-value text-primario">${formatarTaxa(taxaEur?.venda || "0", 2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botões Principais de Ação -->
            <div class="taxas-actions-footer">
              <a href="#/cambio/novo" class="btn btn-primary ${!kycAprovado ? "btn-disabled" : ""}">
                ${icone("cambio", 18)}
                <span>${TEXTOS.botoes.trocarMoeda}</span>
              </a>
              <a href="#/remessas/nova" class="btn btn-secondary ${!kycAprovado ? "btn-disabled" : ""}">
                ${icone("remessas", 18)}
                <span>${TEXTOS.botoes.enviarRemessa}</span>
              </a>
            </div>
          </div>

          <!-- Coluna 2: A sua conta -->
          <div class="card account-summary-card">
            <div class="card-header-clean">
              <h2 class="card-title-lg">A sua conta</h2>
              <span class="badge badge-${kycAprovado ? "aprovado" : "pendente"}">
                ${kycAprovado ? icone("seguranca", 14) : icone("relogio", 14)}
                ${obterRotuloVerificacao(cliente.estadoKyc)}
              </span>
            </div>

            <div class="account-profile-snippet">
              <div class="account-avatar-large">${cliente.nome.slice(0, 2).toUpperCase()}</div>
              <div>
                <strong class="account-name">${cliente.nome}</strong>
                <span class="account-email">${cliente.email || cliente.telefone}</span>
              </div>
            </div>

            <div class="account-metrics-list">
              <div class="account-metric-item">
                <span class="metric-desc">Total de operações realizadas</span>
                <strong class="metric-num">${totalOperacoes}</strong>
              </div>
              <div class="account-metric-item">
                <span class="metric-desc">Documentos verificados</span>
                <strong class="metric-num">${kycAprovado ? "Conforme" : "Pendente"}</strong>
              </div>
              <div class="account-metric-item">
                <span class="metric-desc">Limite de câmbio regulamentar</span>
                <strong class="metric-num">Normativo BNA</strong>
              </div>
            </div>

            <div class="account-footer-links">
              <a href="#/perfil" class="link-action">
                ${icone("conta", 16)} <span>Gerir minha conta</span>
              </a>
              <a href="#/documentos" class="link-action">
                ${icone("documentos", 16)} <span>Ver documentos</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Secção Inferior: Atividade Recente -->
        <div class="card recent-activity-card mt-large">
          <div class="card-header-clean">
            <h2 class="card-title-lg">Atividade recente</h2>
            ${atividades.length > 0 ? `<span class="activity-counter">${totalOperacoes} registo(s)</span>` : ""}
          </div>

          ${
            atividades.length === 0
              ? `
            <!-- Estado Vazio com 3 Passos Educativos -->
            <div class="empty-state-steps">
              <p class="empty-main-hint">${TEXTOS.vazios.semAtividade}</p>
              <div class="empty-steps-grid">
                <div class="step-card">
                  <div class="step-circle">1</div>
                  <strong>Escolha a operação</strong>
                  <span>Simule câmbio com taxas do BNA ou envie remessa internacional.</span>
                </div>
                <div class="step-card">
                  <div class="step-circle">2</div>
                  <strong>Efetue o pagamento</strong>
                  <span>Pague por Multicaixa Express, referência ou balcão oficial.</span>
                </div>
                <div class="step-card">
                  <div class="step-circle">3</div>
                  <strong>Acompanhe o estado</strong>
                  <span>Receba comprovativos digitais com certificação do regulador.</span>
                </div>
              </div>
            </div>
          `
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Referência</th>
                    <th>Operação</th>
                    <th>Montante</th>
                    <th>Contravalor</th>
                    <th>Data</th>
                    <th>Estado</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${atividades
                    .map(
                      (a) => `
                    <tr>
                      <td><code>${a.id}</code></td>
                      <td><strong>${a.descricao}</strong></td>
                      <td>${a.montante}</td>
                      <td>${a.contravalor}</td>
                      <td>${formatarDataHora(a.data)}</td>
                      <td><span class="badge badge-${a.estadoClasse}">${a.estado}</span></td>
                      <td>
                        <a href="${a.link}" class="btn btn-secondary btn-sm">
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
          `
          }
        </div>
      </div>
    `;

    container.querySelector("#btn-atualizar-taxas-dash")?.addEventListener("click", () => {
      carregarDados(true);
    });
  }

  carregarDados();
  intervaloTimer = setInterval(() => carregarDados(true), 60000);

  return () => {
    if (intervaloTimer) clearInterval(intervaloTimer);
  };
}
