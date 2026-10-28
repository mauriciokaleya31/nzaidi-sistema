import { api, type TaxaItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function formatarKz(valor: number): string {
  return valor.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Kz";
}

function formatarMoeda(valor: number, moeda: string): string {
  return valor.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + moeda;
}

export async function renderizarDashboard(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Painel Geral Executivo & Financeiro</h1>
        <p class="view-subtitle">Consolidação em tempo real da tesouraria, fluxo cambial e operações do NZAIDI.</p>
      </div>
      <div class="view-actions" style="display: flex; gap: 10px;">
        <button id="btn-atualizar-dashboard" class="btn btn-secondary" type="button" title="Atualizar Indicadores">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Atualizar Dados
        </button>
        <a href="#operacional" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Fila Operacional
        </a>
      </div>
    </div>

    <!-- 1. CARTÕES DE SALDOS MULTIMOEDA DA TESOURARIA -->
    <div class="dashboard-grid mb-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
      <div class="card card-tesouraria card-aoa">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
            <span>Tesouraria Nacional (AOA)</span>
            <span class="badge" style="background: rgba(204,150,56,0.15); color: #8a6012;">Kwanza</span>
          </h3>
        </div>
        <div class="card-body">
          <div id="saldo-aoa-val" style="font-size: 26px; font-weight: 700; color: #031d42; font-family: 'Montserrat', sans-serif;">A carregar...</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; display: flex; justify-content: space-between;">
            <span>Entradas hoje: <strong id="fluxo-entradas-hoje" style="color: #10b981;">...</strong></span>
            <span>Saídas: <strong id="fluxo-saidas-hoje" style="color: #ef4444;">...</strong></span>
          </div>
        </div>
      </div>

      <div class="card card-tesouraria card-usd">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
            <span>Divisas Estrangeiras (USD)</span>
            <span class="badge" style="background: rgba(16,185,129,0.15); color: #065f46;">Dólar Americano</span>
          </h3>
        </div>
        <div class="card-body">
          <div id="saldo-usd-val" style="font-size: 26px; font-weight: 700; color: #031d42; font-family: 'Montserrat', sans-serif;">A carregar...</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            <span>Compras de USD: <strong id="total-compras-usd" style="color: #031d42;">...</strong></span>
          </div>
        </div>
      </div>

      <div class="card card-tesouraria card-eur">
        <div class="card-header" style="padding-bottom: 4px;">
          <h3 class="card-title" style="font-size: 13px; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
            <span>Divisas Estrangeiras (EUR)</span>
            <span class="badge" style="background: rgba(59,130,246,0.15); color: #1e40af;">Euro União Europeia</span>
          </h3>
        </div>
        <div class="card-body">
          <div id="saldo-eur-val" style="font-size: 26px; font-weight: 700; color: #031d42; font-family: 'Montserrat', sans-serif;">A carregar...</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            <span>Vendas de EUR: <strong id="total-vendas-eur" style="color: #031d42;">...</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. CARTÕES DE ATENÇÃO IMEDIATA (PENDÊNCIAS AGREGADAS) -->
    <div class="dashboard-grid mb-4">
      <div class="card card-clicavel" style="cursor: pointer;" onclick="window.location.hash='#kyc'">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Dossiês KYC Pendentes</span>
          <span class="badge badge-warning" id="pend-kyc-badge">...</span>
        </div>
        <div class="card-body">
          <div id="pend-kyc-val" style="font-size: 24px; font-weight: 700; color: #031d42;">0</div>
          <small class="text-muted">Aguardam validação documental e risco</small>
        </div>
      </div>

      <div class="card card-clicavel" style="cursor: pointer;" onclick="window.location.hash='#operacional?tipo=pedido_cambio'">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Câmbios por Liquidar</span>
          <span class="badge badge-info" id="pend-cambio-badge">...</span>
        </div>
        <div class="card-body">
          <div id="pend-cambio-val" style="font-size: 24px; font-weight: 700; color: #031d42;">0</div>
          <small class="text-muted">Ordens pendentes de conferência de fundos</small>
        </div>
      </div>

      <div class="card card-clicavel" style="cursor: pointer;" onclick="window.location.hash='#operacional?tipo=pedido_remessa'">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Remessas em Aberto</span>
          <span class="badge badge-warning" id="pend-remessa-badge">...</span>
        </div>
        <div class="card-body">
          <div id="pend-remessa-val" style="font-size: 24px; font-weight: 700; color: #031d42;">0</div>
          <small class="text-muted">Por encaminhar a parceiros ou pagar</small>
        </div>
      </div>

      <div class="card card-clicavel" style="cursor: pointer;" onclick="window.location.hash='#caixa'">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Sessões de Balcão</span>
          <span class="badge badge-success" id="pend-caixa-badge">Ativo</span>
        </div>
        <div class="card-body">
          <div id="pend-caixa-val" style="font-size: 24px; font-weight: 700; color: #031d42;">Aberto</div>
          <small class="text-muted">Caixa balcão em operação normal</small>
        </div>
      </div>
    </div>

    <!-- 3. GRÁFICOS SVG DINÂMICOS & PERFORMANCE FINANCEIRA -->
    <div class="dashboard-grid mb-4" style="grid-template-columns: 2fr 1fr;">
      <!-- Gráfico SVG Dinâmico -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 class="card-title">Evolução do Volume Cambial & Operações</h2>
            <p class="text-muted" style="font-size: 12px; margin: 0;">Movimentação agregada de divisas em Kwanza (AOA)</p>
          </div>
          <div class="periodo-seletor" style="display: flex; gap: 4px;">
            <button class="btn btn-sm btn-periodo active" data-periodo="7d">7 Dias</button>
            <button class="btn btn-sm btn-periodo" data-periodo="30d">30 Dias</button>
            <button class="btn btn-sm btn-periodo" data-periodo="1y">1 Ano</button>
          </div>
        </div>
        <div class="card-body">
          <div id="grafico-svg-container" style="width: 100%; height: 260px; position: relative;">
            <div class="loading-state">A preparar gráfico dinâmico...</div>
          </div>
          <div id="grafico-legenda" style="display: flex; justify-content: center; gap: 24px; font-size: 12px; color: var(--text-muted); margin-top: 12px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 12px; height: 12px; background: #031d42; border-radius: 2px; display: inline-block;"></span>
              Volume em Kwanza (AOA)
            </span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 12px; height: 12px; background: #cc9638; border-radius: 2px; display: inline-block;"></span>
              Operações Realizadas
            </span>
          </div>
        </div>
      </div>

      <!-- Resumo de Rentabilidade e Margens -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Rentabilidade & Margens</h2>
          <span class="badge badge-success">Mês Corrente</span>
        </div>
        <div class="card-body">
          <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Volume Global Movimentado</div>
            <div id="indicador-vol-global" style="font-size: 22px; font-weight: 700; color: #031d42; margin-top: 2px;">...</div>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Margem Bruta Cambial (Spread)</div>
            <div id="indicador-margem-spread" style="font-size: 22px; font-weight: 700; color: #10b981; margin-top: 2px;">...</div>
            <small class="text-muted">Apuramento sobre compras e vendas</small>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Comissões de Remessas</div>
            <div id="indicador-comissao-remessas" style="font-size: 22px; font-weight: 700; color: #cc9638; margin-top: 2px;">...</div>
            <small class="text-muted">Receitas geradas por transferências</small>
          </div>

          <div style="padding-top: 12px; border-top: 1px solid var(--border-color);">
            <a href="#relatorios" class="btn btn-secondary btn-block" style="text-align: center; display: block;">
              Ver Relatório Financeiro Detalhado &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. MOVIMENTOS FINANCEIROS RECENTES & TAXAS EM VIGOR -->
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h2 class="card-title">Movimentos de Tesouraria Recentes</h2>
          <a href="#contabilidade" class="card-link" style="font-size: 12px;">Livro Razão &rarr;</a>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Moeda</th>
                  <th style="text-align: right;">Valor</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody id="tabela-movimentos-recentes">
                <tr><td colspan="5" style="text-align: center; padding: 20px;">A carregar movimentos...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h2 class="card-title">Cotações em Vigor</h2>
          <a href="#taxas" class="card-link" style="font-size: 12px;">Atualizar Cotações &rarr;</a>
        </div>
        <div class="card-body" id="dash-taxas-container">
          <div class="loading-state">A carregar taxas...</div>
        </div>
      </div>
    </div>
  `;

  // Renderizador SVG Dinâmico de Gráfico
  function desenharGraficoSvg(dadosGrafico: { label: string; volumeAoa: number; operacoes: number }[]): void {
    const box = container.querySelector<HTMLElement>("#grafico-svg-container");
    if (!box) return;

    if (!dadosGrafico || dadosGrafico.length === 0) {
      box.innerHTML = `<div class="loading-state">Sem dados para o período selecionado.</div>`;
      return;
    }

    const largura = box.clientWidth || 600;
    const altura = 250;
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };

    const maxVol = Math.max(...dadosGrafico.map((d) => d.volumeAoa)) * 1.15;
    const wEfetiva = largura - padding.left - padding.right;
    const hEfetiva = altura - padding.top - padding.bottom;

    const pontosVol = dadosGrafico.map((d, idx) => {
      const x = padding.left + (idx / (dadosGrafico.length - 1)) * wEfetiva;
      const y = padding.top + hEfetiva - (d.volumeAoa / maxVol) * hEfetiva;
      return { x, y, ...d };
    });

    const dPathLinha = pontosVol.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
    const pPrimeiro = pontosVol[0];
    const pUltimo = pontosVol[pontosVol.length - 1];
    const dPathArea = (pPrimeiro && pUltimo) ? `${dPathLinha} L ${pUltimo.x} ${padding.top + hEfetiva} L ${pPrimeiro.x} ${padding.top + hEfetiva} Z` : "";

    const linhasGrid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const y = padding.top + hEfetiva * (1 - f);
      const valRotulo = (maxVol * f) / 1000000;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${largura - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="4,4" />
        <text x="${padding.left - 10}" y="${y + 4}" font-size="10" fill="#64748b" text-anchor="end">${valRotulo.toFixed(1)}M</text>
      `;
    }).join("");

    const rotulosEixoX = pontosVol.map((p) => `
      <text x="${p.x}" y="${altura - 15}" font-size="11" fill="#64748b" text-anchor="middle">${p.label}</text>
    `).join("");

    const marcadores = pontosVol.map((p) => `
      <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#031d42" stroke="#ffffff" stroke-width="2" class="ponto-grafico">
        <title>${p.label}: ${p.volumeAoa.toLocaleString("pt-AO")} AOA (${p.operacoes} operações)</title>
      </circle>
    `).join("");

    box.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 ${largura} ${altura}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradienteAzul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#031d42" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#031d42" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${linhasGrid}
        <path d="${dPathArea}" fill="url(#gradienteAzul)" />
        <path d="${dPathLinha}" fill="none" stroke="#031d42" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${marcadores}
        ${rotulosEixoX}
      </svg>
    `;
  }

  // Carregamento dos dados
  let seriesArmazenadas: any = null;

  async function carregarDashboardDados(): Promise<void> {
    try {
      const res = await api.obterDashboardExecutivo();
      const dados = res;

      // 1. Saldos Tesouraria
      const elAoa = container.querySelector("#saldo-aoa-val");
      const elUsd = container.querySelector("#saldo-usd-val");
      const elEur = container.querySelector("#saldo-eur-val");
      const elEntradasHoje = container.querySelector("#fluxo-entradas-hoje");
      const elSaidasHoje = container.querySelector("#fluxo-saidas-hoje");

      if (elAoa) elAoa.textContent = formatarKz(dados.tesouraria.saldoAoa);
      if (elUsd) elUsd.textContent = formatarMoeda(dados.tesouraria.saldoUsd, "USD");
      if (elEur) elEur.textContent = formatarMoeda(dados.tesouraria.saldoEur, "EUR");
      if (elEntradasHoje) elEntradasHoje.textContent = "+" + formatarKz(dados.fluxo.entradasDia);
      if (elSaidasHoje) elSaidasHoje.textContent = "-" + formatarKz(dados.fluxo.saidasDia);

      // 2. Indicadores
      const elVolGlobal = container.querySelector("#indicador-vol-global");
      const elMargemSpread = container.querySelector("#indicador-margem-spread");
      const elComissaoRemessas = container.querySelector("#indicador-comissao-remessas");
      const elComprasUsd = container.querySelector("#total-compras-usd");
      const elVendasEur = container.querySelector("#total-vendas-eur");

      if (elVolGlobal) elVolGlobal.textContent = formatarKz(dados.indicadores.volumeCambioAoa);
      if (elMargemSpread) elMargemSpread.textContent = "+" + formatarKz(dados.indicadores.margemApuradaAoa);
      if (elComissaoRemessas) elComissaoRemessas.textContent = "+" + formatarKz(dados.indicadores.comissoesRemessasAoa);
      if (elComprasUsd) elComprasUsd.textContent = formatarMoeda(dados.indicadores.totalComprasDivisas, "USD");
      if (elVendasEur) elVendasEur.textContent = formatarMoeda(dados.indicadores.totalVendasDivisas, "EUR");

      // 3. Pendências
      const elPendKyc = container.querySelector("#pend-kyc-val");
      const elBadgeKyc = container.querySelector("#pend-kyc-badge");
      const elPendCambio = container.querySelector("#pend-cambio-val");
      const elBadgeCambio = container.querySelector("#pend-cambio-badge");
      const elPendRemessa = container.querySelector("#pend-remessa-val");
      const elBadgeRemessa = container.querySelector("#pend-remessa-badge");

      if (elPendKyc) elPendKyc.textContent = String(dados.atencaoImediata.kycPendentes);
      if (elBadgeKyc) elBadgeKyc.textContent = `${dados.atencaoImediata.kycPendentes} pendentes`;

      if (elPendCambio) elPendCambio.textContent = String(dados.atencaoImediata.cambosPendentes);
      if (elBadgeCambio) elBadgeCambio.textContent = `${dados.atencaoImediata.cambosPendentes} aguardam`;

      if (elPendRemessa) elPendRemessa.textContent = String(dados.atencaoImediata.remessasPendentes);
      if (elBadgeRemessa) elBadgeRemessa.textContent = `${dados.atencaoImediata.remessasPendentes} activas`;

      // 4. Gráficos
      seriesArmazenadas = dados.seriesGraficos;
      desenharGraficoSvg(seriesArmazenadas.serie7d);

      // 5. Movimentos Recentes
      const tabelaMov = container.querySelector("#tabela-movimentos-recentes");
      if (tabelaMov) {
        if (!dados.movimentosRecentes || dados.movimentosRecentes.length === 0) {
          tabelaMov.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 16px;">Sem registos recentes de caixa.</td></tr>`;
        } else {
          tabelaMov.innerHTML = dados.movimentosRecentes.map((m: any) => `
            <tr>
              <td>
                <span class="badge ${m.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}">
                  ${m.tipo.toUpperCase()}
                </span>
              </td>
              <td>${escapeHtml(m.descricao || 'Movimento de Caixa')}</td>
              <td><strong>${escapeHtml(m.moeda)}</strong></td>
              <td style="text-align: right; font-weight: 600; color: ${m.tipo === 'entrada' ? '#10b981' : '#ef4444'};">
                ${m.tipo === 'entrada' ? '+' : '-'}${Number(m.valor).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
              </td>
              <td class="text-muted" style="font-size: 11px;">
                ${new Date(m.criadoEm).toLocaleDateString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
              </td>
            </tr>
          `).join("");
        }
      }
    } catch {
      // Falha graciosa
    }
  }

  // Carregar taxas para o painel lateral
  async function carregarTaxas(): Promise<void> {
    const boxTaxas = container.querySelector("#dash-taxas-container");
    if (!boxTaxas) return;
    try {
      const taxas = await api.listarTaxas();
      if (!taxas || taxas.length === 0) {
        boxTaxas.innerHTML = `<p class="text-muted">Nenhuma taxa ativa.</p>`;
        return;
      }

      boxTaxas.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${taxas.map((t: TaxaItem) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div>
                <strong style="color: #031d42; font-size: 14px;">${t.moeda} / AOA</strong>
                <div style="font-size: 11px; color: var(--text-muted);">Ref BNA: ${Number(t.referencia).toFixed(2)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px;">Compra: <strong style="color: #10b981;">${Number(t.compra).toFixed(2)}</strong></div>
                <div style="font-size: 12px;">Venda: <strong style="color: #031d42;">${Number(t.venda).toFixed(2)}</strong></div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } catch {
      boxTaxas.innerHTML = `<p class="text-muted">Não foi possível carregar as taxas.</p>`;
    }
  }

  // Listeners de alternância de período do gráfico
  container.querySelectorAll<HTMLButtonElement>(".btn-periodo").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".btn-periodo").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const periodo = btn.getAttribute("data-periodo");
      if (!seriesArmazenadas) return;

      if (periodo === "7d") {
        desenharGraficoSvg(seriesArmazenadas.serie7d);
      } else if (periodo === "30d") {
        desenharGraficoSvg(seriesArmazenadas.serie30d);
      } else if (periodo === "1y") {
        desenharGraficoSvg(seriesArmazenadas.serie1y.map((y: any) => ({ label: y.label, volumeAoa: y.volumeAoa, operacoes: 300 })));
      }
    });
  });

  // Botão atualizar
  container.querySelector("#btn-atualizar-dashboard")?.addEventListener("click", () => {
    void carregarDashboardDados();
    void carregarTaxas();
  });

  void carregarDashboardDados();
  void carregarTaxas();
}
