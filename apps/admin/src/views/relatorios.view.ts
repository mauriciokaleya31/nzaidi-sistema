import { api } from "../api/cliente.js";

export function renderizarRelatorios(container: HTMLElement): void {
  const hoje = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Relatórios Financeiros & Gestão Operacional</h1>
        <p class="view-subtitle">Mapas consolidados, apuração de volumes, posições cambiais e exportação oficial.</p>
      </div>
      <div class="view-actions">
        <button id="btn-imprimir-relatorio" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Imprimir
        </button>
        <button id="btn-exportar-csv" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Exportar CSV
        </button>
      </div>
    </div>

    <!-- FILTROS GERAIS -->
    <div class="card" style="margin-bottom: 24px; padding: 16px;">
      <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Tipo de Relatório</label>
          <select id="relatorio-tipo" class="form-input" style="padding: 8px 12px; font-size: 13px; min-width: 240px;">
            <option value="resumo-diario">Resumo Diário de Operações</option>
            <option value="posicao-cambial">Posição Cambial e Margens Brutas</option>
            <option value="historico-taxas">Histórico de Cotações Cambiais</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Data Início</label>
          <input type="date" id="relatorio-data-inicio" class="form-input" value="${hoje}" style="padding: 8px 12px; font-size: 13px;" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px;">Data Fim</label>
          <input type="date" id="relatorio-data-fim" class="form-input" value="${hoje}" style="padding: 8px 12px; font-size: 13px;" />
        </div>
        <button id="btn-gerar-relatorio" class="btn btn-primary" style="height: 40px;">Gerar Mapa</button>
      </div>
    </div>

    <!-- CONTEÚDO DINÂMICO DO RELATÓRIO -->
    <div id="area-conteudo-relatorio">
      <div class="card" style="text-align: center; padding: 48px;">
        <p style="color: var(--text-secondary);">Selecione os parâmetros e clique em <strong>Gerar Mapa</strong>.</p>
      </div>
    </div>
  `;

  const selectTipo = container.querySelector("#relatorio-tipo") as HTMLSelectElement;
  const inputInicio = container.querySelector("#relatorio-data-inicio") as HTMLInputElement;
  const inputFim = container.querySelector("#relatorio-data-fim") as HTMLInputElement;
  const areaConteudo = container.querySelector("#area-conteudo-relatorio") as HTMLElement;

  async function carregarRelatorio() {
    const tipo = selectTipo.value;
    const dataInicio = inputInicio.value;
    const dataFim = inputFim.value;

    areaConteudo.innerHTML = '<div class="card" style="text-align: center; padding: 48px;">A consolidar dados financeiros...</div>';

    try {
      if (tipo === "resumo-diario") {
        const dados = await api.obterRelatorioResumoDiario({ dataInicio, dataFim });
        renderizarResumoDiario(dados);
      } else if (tipo === "posicao-cambial") {
        const dados = await api.obterRelatorioPosicaoCambial({ dataInicio, dataFim });
        renderizarPosicaoCambial(dados);
      } else {
        const historico = await api.obterHistoricoTaxas();
        renderizarHistoricoTaxas(historico);
      }
    } catch (e: any) {
      areaConteudo.innerHTML = `<div class="card" style="text-align: center; color: red; padding: 32px;">Erro ao gerar relatório: ${e.message}</div>`;
    }
  }

  function renderizarResumoDiario(dados: any) {
    areaConteudo.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 20px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Operações Cambiais</div>
          <div style="font-size: 24px; font-weight: 700; color: #0284c7;">${dados.operacoesCambio.reduce((acc: number, o: any) => acc + o.quantidade, 0)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Volume: ${Number(dados.operacoesCambio.reduce((acc: number, o: any) => acc + Number(o.totalAoa), 0)).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</div>
        </div>
        <div class="card" style="padding: 20px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Remessas Executadas</div>
          <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${dados.remessas.reduce((acc: number, r: any) => acc + r.quantidade, 0)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Comissões Auferidas: ${Number(dados.remessas.reduce((acc: number, r: any) => acc + Number(r.totalComissaoAoa), 0)).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</div>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border-color); font-weight: 600;">Discriminação de Operações de Câmbio</div>
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: var(--bg-surface-secondary); text-align: left;">
                <th style="padding: 12px 16px;">Tipo</th>
                <th style="padding: 12px 16px;">Moeda</th>
                <th style="padding: 12px 16px; text-align: right;">Quantidade</th>
                <th style="padding: 12px 16px; text-align: right;">Total Divisa</th>
                <th style="padding: 12px 16px; text-align: right;">Total Contravalor AOA</th>
              </tr>
            </thead>
            <tbody>
              ${dados.operacoesCambio.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 24px;">Nenhuma operação no período.</td></tr>' : dados.operacoesCambio.map((o: any) => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 12px 16px; font-weight: 600; text-transform: uppercase;">${o.tipo}</td>
                  <td style="padding: 12px 16px;">${o.moeda}</td>
                  <td style="padding: 12px 16px; text-align: right;">${o.quantidade}</td>
                  <td style="padding: 12px 16px; text-align: right;">${Number(o.totalDivisa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} ${o.moeda}</td>
                  <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${Number(o.totalAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderizarPosicaoCambial(dados: any) {
    areaConteudo.innerHTML = `
      <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border-color); font-weight: 600;">Posição Cambial e Margens Apuradas por Moeda</div>
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: var(--bg-surface-secondary); text-align: left;">
                <th style="padding: 12px 16px;">Moeda</th>
                <th style="padding: 12px 16px; text-align: right;">Compras Divisa</th>
                <th style="padding: 12px 16px; text-align: right;">Taxa Média Compra</th>
                <th style="padding: 12px 16px; text-align: right;">Vendas Divisa</th>
                <th style="padding: 12px 16px; text-align: right;">Taxa Média Venda</th>
                <th style="padding: 12px 16px; text-align: right;">Posição Líquida</th>
                <th style="padding: 12px 16px; text-align: right;">Margem Bruta Estimada</th>
              </tr>
            </thead>
            <tbody>
              ${dados.posicao.map((p: any) => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 12px 16px; font-weight: 700; font-size: 14px;">${p.moeda}</td>
                  <td style="padding: 12px 16px; text-align: right;">${Number(p.compras.totalDivisa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 12px 16px; text-align: right;">${p.compras.taxaMedia}</td>
                  <td style="padding: 12px 16px; text-align: right;">${Number(p.vendas.totalDivisa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 12px 16px; text-align: right;">${p.vendas.taxaMedia}</td>
                  <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: ${Number(p.posicaoLiquidaDivisa) >= 0 ? '#16a34a' : '#ef4444'};">
                    ${Number(p.posicaoLiquidaDivisa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} ${p.moeda}
                  </td>
                  <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #16a34a;">
                    ${Number(p.margemBrutaEstimadaAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderizarHistoricoTaxas(historico: any[]) {
    areaConteudo.innerHTML = `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border-color); font-weight: 600;">Histórico Cronológico de Revisão de Cotações</div>
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: var(--bg-surface-secondary); text-align: left;">
                <th style="padding: 12px 16px;">Data / Hora</th>
                <th style="padding: 12px 16px;">Moeda</th>
                <th style="padding: 12px 16px; text-align: right;">Taxa Referência</th>
                <th style="padding: 12px 16px; text-align: right;">Taxa Compra</th>
                <th style="padding: 12px 16px; text-align: right;">Taxa Venda</th>
                <th style="padding: 12px 16px;">Fonte</th>
                <th style="padding: 12px 16px;">Autor</th>
                <th style="padding: 12px 16px;">Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${historico.length === 0 ? '<tr><td colspan="8" style="text-align: center; padding: 24px;">Nenhum histórico registado.</td></tr>' : historico.map((h: any) => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 10px 16px; white-space: nowrap;">${h.criadoEm.slice(0, 19).replace("T", " ")}</td>
                  <td style="padding: 10px 16px; font-weight: 700;">${h.moeda}</td>
                  <td style="padding: 10px 16px; text-align: right;">${h.referencia}</td>
                  <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #16a34a;">${h.taxaCompra}</td>
                  <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #2563eb;">${h.taxaVenda}</td>
                  <td style="padding: 10px 16px; text-transform: capitalize;">${h.fonte}</td>
                  <td style="padding: 10px 16px;">${h.alteradoPorNome || "-"}</td>
                  <td style="padding: 10px 16px; color: var(--text-secondary);">${h.motivo || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Eventos
  container.querySelector("#btn-gerar-relatorio")?.addEventListener("click", carregarRelatorio);

  container.querySelector("#btn-exportar-csv")?.addEventListener("click", () => {
    const tipo = selectTipo.value;
    const dataInicio = inputInicio.value;
    const dataFim = inputFim.value;

    let url = "";
    if (tipo === "resumo-diario") {
      url = `/api/v1/contabilidade/relatorios/resumo-diario?formato=csv&dataInicio=${dataInicio}&dataFim=${dataFim}`;
    } else if (tipo === "posicao-cambial") {
      url = `/api/v1/contabilidade/relatorios/posicao-cambial?formato=csv&dataInicio=${dataInicio}&dataFim=${dataFim}`;
    } else {
      url = `/api/v1/contabilidade/livro-razao?formato=csv`;
    }
    window.open(url, "_blank");
  });

  container.querySelector("#btn-imprimir-relatorio")?.addEventListener("click", () => {
    window.print();
  });

  // Carregamento inicial automático
  carregarRelatorio();
}
