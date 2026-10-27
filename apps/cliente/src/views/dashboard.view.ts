import { api, type TaxaItem, type PedidoCambio, type PedidoRemessa } from "../api.js";
import { authState } from "../auth.state.js";

export function renderDashboardView(container: HTMLElement): () => void {
  let taxas: TaxaItem[] = [];
  let pedidosCambio: PedidoCambio[] = [];
  let pedidosRemessa: PedidoRemessa[] = [];
  let carregando = true;
  let intervaloAtualizacao: any = null;

  async function carregarDados() {
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
      render();
    }
  }

  function render() {
    const cliente = authState.cliente;
    if (!cliente) return;

    let bannerKyc = "";
    if (cliente.estadoKyc === "aprovado") {
      bannerKyc = `
        <div class="kyc-banner kyc-banner-aprovado">
          <div>
            <strong><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Conta Verificada (KYC Aprovado)</strong>
            <p style="font-size: 0.85rem; margin-top: 0.2rem;">A sua identidade foi conferida e validada pela equipa de conformidade. Todos os limites de câmbio e remessas estão disponíveis.</p>
          </div>
          <span class="badge badge-aprovado">Aprovado</span>
        </div>
      `;
    } else if (cliente.estadoKyc === "em_analise") {
      bannerKyc = `
        <div class="kyc-banner" style="background: rgba(2, 132, 199, 0.1); border: 1px solid rgba(2, 132, 199, 0.3); color: #7dd3fc;">
          <div>
            <strong><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Documentos em Análise de Conformidade</strong>
            <p style="font-size: 0.85rem; margin-top: 0.2rem;">Os seus documentos foram submetidos e estão a ser verificados pela equipa de conformidade do NZAIDI.</p>
          </div>
          <a href="#/documentos" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">Ver Documentos</a>
        </div>
      `;
    } else if (cliente.estadoKyc === "rejeitado" || cliente.estadoKyc === "actualizacao_necessaria") {
      bannerKyc = `
        <div class="kyc-banner kyc-banner-rejeitado">
          <div>
            <strong><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Atenção: Atualização de Documentos Necessária</strong>
            <p style="font-size: 0.85rem; margin-top: 0.2rem;">A verificação da sua conta necessita de reenvio de documentos. Por favor consulte a área documental para regularizar.</p>
          </div>
          <a href="#/documentos" class="btn btn-danger" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">Submeter Novamente</a>
        </div>
      `;
    } else {
      bannerKyc = `
        <div class="kyc-banner kyc-banner-pendente">
          <div>
            <strong>Verificação de Identidade Pendente</strong>
            <p style="font-size: 0.85rem; margin-top: 0.2rem;">Para desbloquear transações cambiais e envio de remessas sem restrições, submeta o seu documento de identificação.</p>
          </div>
          <a href="#/documentos" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">Enviar Documentos</a>
        </div>
      `;
    }

    container.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 700;">Olá, ${cliente.nome.split(" ")[0]}!</h1>
            <p style="color: var(--cor-texto-mutado); font-size: 0.9rem;">Bem-vindo ao seu portal financeiro NZAIDI.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--cor-texto-mutado);">
            <span class="pulse-indicator"></span>
            <span>Cotações em tempo real</span>
          </div>
        </div>

        ${bannerKyc}

        <!-- Grelha de Cotações Oficiais -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Câmbio Oficial do Dia (Moeda Base: Kwanza - AOA)</h2>
            <button id="btn-atualizar-taxas" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
              ↻ Atualizar
            </button>
          </div>

          <div class="grid-cotacoes">
            ${
              taxas.length === 0
                ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--cor-texto-mutado);">A carregar cotações oficiais...</div>`
                : taxas
                    .map(
                      (t) => `
              <div class="card-taxa">
                <div class="card-taxa-header">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="moeda-tag">${t.moeda}</span>
                    <span style="font-size: 0.8rem; color: var(--cor-texto-mutado);">${t.moeda === "USD" ? "Dólar Americano" : "Euro"}</span>
                  </div>
                  <span class="badge ${t.fonte === "oficial" ? "badge-aprovado" : "badge-em_analise"}" style="font-size: 0.65rem;">
                    ${t.fonte === "oficial" ? "BNA Oficial" : "Referência NZAIDI"}
                  </span>
                </div>
                <div class="taxas-valores">
                  <div class="taxa-col">
                    <div class="taxa-label">Compramos a</div>
                    <div class="taxa-preco">${Number(t.compra).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span style="font-size: 0.8rem; font-weight: normal; color: var(--cor-texto-mutado);">AOA</span></div>
                  </div>
                  <div class="taxa-col" style="text-align: right;">
                    <div class="taxa-label">Vendemos a</div>
                    <div class="taxa-preco">${Number(t.venda).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span style="font-size: 0.8rem; font-weight: normal; color: var(--cor-texto-mutado);">AOA</span></div>
                  </div>
                </div>
                <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--cor-texto-mutado); text-align: right;">
                  Taxa Ref: ${t.referencia} AOA
                </div>
              </div>
            `
                    )
                    .join("")
            }
          </div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
            <a href="#/cambio" class="btn btn-primary" style="flex: 1;">
              Pedir Operação Cambial
            </a>
            <a href="#/remessas" class="btn btn-secondary" style="flex: 1;">
              Enviar Remessa ao Exterior
            </a>
          </div>
        </div>

        <!-- Pedidos Recentes -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">As Suas Atividades Recentes</h2>
            <div style="display: flex; gap: 0.5rem;">
              <a href="#/cambio" style="color: var(--cor-primaria); font-size: 0.85rem; text-decoration: none;">Ver Câmbios</a>
              <span style="color: var(--cor-texto-mutado);">•</span>
              <a href="#/remessas" style="color: var(--cor-primaria); font-size: 0.85rem; text-decoration: none;">Ver Remessas</a>
            </div>
          </div>

          ${
            pedidosCambio.length === 0 && pedidosRemessa.length === 0
              ? `<div style="text-align: center; padding: 2rem 1rem; color: var(--cor-texto-mutado);">Ainda não realizou nenhum pedido. Simule um câmbio ou envie uma remessa nos botões acima.</div>`
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Referência</th>
                    <th>Tipo</th>
                    <th>Moeda & Montante</th>
                    <th>Total Estimado (AOA)</th>
                    <th>Data</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${pedidosCambio.slice(0, 3).map((p) => `
                    <tr>
                      <td><code>${p.id}</code></td>
                      <td>${p.tipoOperacao === "compra" ? "Compra de Divisa" : "Venda de Divisa"}</td>
                      <td><strong>${p.montanteDivisa} ${p.moeda}</strong></td>
                      <td>${Number(p.totalAoaEstimado).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</td>
                      <td>${new Date(p.criadoEm).toLocaleDateString("pt-AO")}</td>
                      <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                    </tr>
                  `).join("")}
                  ${pedidosRemessa.slice(0, 3).map((r) => `
                    <tr>
                      <td><code>${r.id}</code></td>
                      <td>Remessa (${r.beneficiarioPais})</td>
                      <td><strong>${r.montanteDivisa} ${r.moedaDestino}</strong></td>
                      <td>${Number(r.totalAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</td>
                      <td>${new Date(r.criadoEm).toLocaleDateString("pt-AO")}</td>
                      <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;

    container.querySelector("#btn-atualizar-taxas")?.addEventListener("click", () => {
      carregarDados();
    });
  }

  // Carregamento inicial
  carregarDados();

  // Auto-refresh das cotações a cada 30 segundos
  intervaloAtualizacao = setInterval(() => {
    carregarDados();
  }, 30000);

  // Função de limpeza do temporizador quando a vista for destruída
  return () => {
    if (intervaloAtualizacao) {
      clearInterval(intervaloAtualizacao);
    }
  };
}
