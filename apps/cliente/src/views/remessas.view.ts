import { api, type TaxaItem, type PedidoRemessa } from "../api.js";

export function renderRemessasView(container: HTMLElement): void {
  let taxas: TaxaItem[] = [];
  let pedidos: PedidoRemessa[] = [];
  let carregando = true;
  let submetendo = false;
  let erroMsg = "";
  let sucessoMsg = "";

  // Estado do formulário de remessa
  let moedaDestino: "EUR" | "USD" = "EUR";
  let montanteDivisa: string = "500.00";

  async function carregarDados() {
    try {
      const [listaTaxas, listaPedidos] = await Promise.all([
        api.obterTaxas(),
        api.listarPedidosRemessas(),
      ]);
      taxas = listaTaxas;
      pedidos = listaPedidos;
    } catch (e) {
      console.error("Erro ao carregar dados de remessas:", e);
    } finally {
      carregando = false;
      render();
    }
  }

  function calcularComissoes(): {
    taxa: number;
    contravalor: number;
    comissao: number;
    totalAoa: number;
  } {
    const itemTaxa = taxas.find((t) => t.moeda === moedaDestino);
    const taxa = itemTaxa ? parseFloat(itemTaxa.venda) || 0 : 0;
    const montante = parseFloat(montanteDivisa) || 0;
    const contravalor = montante * taxa;
    const comissaoPercentual = contravalor * 0.02;
    const comissao = Math.max(comissaoPercentual, 2500);
    const totalAoa = contravalor + comissao;

    return { taxa, contravalor, comissao, totalAoa };
  }

  function render() {
    const { taxa, contravalor, comissao, totalAoa } = calcularComissoes();

    container.innerHTML = `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.5rem; font-weight: 700;">Remessas Internacionais</h1>
          <p style="color: var(--cor-texto-mutado); font-size: 0.9rem;">
            Envie dinheiro para o exterior com comissões transparentes e total conformidade cambial.
          </p>
        </div>

        ${sucessoMsg ? `<div class="alert-box alert-success">${sucessoMsg}</div>` : ""}
        ${erroMsg ? `<div class="alert-box alert-error">${erroMsg}</div>` : ""}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <!-- Formulário de Envio -->
          <div class="card">
            <h2 class="card-title" style="margin-bottom: 1rem;">Nova Remessa para o Estrangeiro</h2>

            <form id="form-remessa">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Moeda de Envio</label>
                  <select id="select-moeda-remessa" class="form-select">
                    <option value="EUR" ${moedaDestino === "EUR" ? "selected" : ""}>EUR — Euro (Europa / Portugal)</option>
                    <option value="USD" ${moedaDestino === "USD" ? "selected" : ""}>USD — Dólar (EUA / Internacional)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Montante a Enviar</label>
                  <input type="number" id="input-montante-remessa" class="form-input" min="20" step="10" value="${montanteDivisa}" required>
                </div>
              </div>

              <!-- Cálculo de Custos Transparente -->
              <div style="background: #0f172a; border: 1px solid var(--cor-borda); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem; color: var(--cor-texto-mutado);">
                  <span>Taxa de Câmbio de Venda:</span>
                  <span style="color: #fff;">${taxa.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} AOA</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem; color: var(--cor-texto-mutado);">
                  <span>Contravalor da Divisa:</span>
                  <span style="color: #fff;">${contravalor.toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--cor-texto-mutado);">
                  <span>Comissão de Serviço NZAIDI (2%):</span>
                  <span style="color: #fff;">${comissao.toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--cor-borda); padding-top: 0.5rem;">
                  <strong style="color: #fff;">Total a Pagar (AOA):</strong>
                  <span style="font-size: 1.35rem; font-weight: 800; color: var(--cor-primaria);">
                    ${totalAoa.toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Nome Completo do Beneficiário</label>
                <input type="text" id="rem-nome-beneficiario" class="form-input" placeholder="Nome como consta na conta bancária no exterior" required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">País de Destino</label>
                  <select id="rem-pais" class="form-select" required>
                    <option value="Portugal">Portugal</option>
                    <option value="Espanha">Espanha</option>
                    <option value="França">França</option>
                    <option value="Reino Unido">Reino Unido</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                    <option value="Brasil">Brasil</option>
                    <option value="África do Sul">África do Sul</option>
                    <option value="Outro País">Outro País</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Banco de Destino</label>
                  <input type="text" id="rem-banco" class="form-input" placeholder="Ex: Millennium BCP, Santander, etc." required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">IBAN / Número de Conta Internacional</label>
                  <input type="text" id="rem-iban" class="form-input" placeholder="Ex: PT500033..." required>
                </div>
                <div class="form-group">
                  <label class="form-label">Código SWIFT / BIC (opcional)</label>
                  <input type="text" id="rem-swift" class="form-input" placeholder="Ex: BCPOPTPL">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Finalidade da Remessa</label>
                <select id="rem-finalidade" class="form-select">
                  <option value="Apoio familiar directo a parentes">Apoio familiar directo a parentes</option>
                  <option value="Pagamento de propinas / estudos universitários">Pagamento de propinas / estudos universitários</option>
                  <option value="Despesas médicas e tratamentos de saúde">Despesas médicas e tratamentos de saúde</option>
                  <option value="Liquidação de serviços prestados no exterior">Liquidação de serviços prestados no exterior</option>
                  <option value="Outras despesas legalmente autorizadas">Outras despesas legalmente autorizadas</option>
                </select>
              </div>

              <button type="submit" class="btn btn-primary btn-block" ${submetendo ? "disabled" : ""}>
                ${submetendo ? "A registar remessa..." : "Submeter Pedido de Remessa"}
              </button>
            </form>
          </div>

          <!-- Prazos e Instruções -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h2 class="card-title" style="margin-bottom: 1rem;">Processamento de Remessas</h2>
              <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem; color: var(--cor-texto-mutado);">
                <div>
                  <strong style="color: #fff;">Prazos Médios de Execução:</strong>
                  <ul style="margin-top: 0.35rem; margin-left: 1.25rem;">
                    <li>Zona Euro (SEPA): 24h a 48h úteis após liquidação.</li>
                    <li>Internacional (SWIFT / USD): 2 a 3 dias úteis.</li>
                  </ul>
                </div>
                <div>
                  <strong style="color: #fff;">Documentação Exigida:</strong>
                  <p style="margin-top: 0.25rem;">Remessas internacionais exigem documento de identificação aprovado na plataforma e justificação documental conforme normativo do BNA.</p>
                </div>
                <div>
                  <strong style="color: #fff;">Segurança e Rastreabilidade:</strong>
                  <p style="margin-top: 0.25rem;">Todas as remessas recebem comprovativo oficial com carimbo criptográfico SHA-256 da NZAIDI.</p>
                </div>
              </div>
            </div>

            <div style="margin-top: 1.5rem; padding: 0.85rem; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--cor-sucesso); border-radius: 4px; font-size: 0.8rem; color: #86efac;">
              ✓ Sem custos ocultos. O montante em Kwanzas apresentado inclui todas as despesas operacionais da NZAIDI.
            </div>
          </div>
        </div>

        <!-- Histórico de Remessas -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Histórico de Remessas Solicitadas</h2>
            <span style="font-size: 0.85rem; color: var(--cor-texto-mutado);">${pedidos.length} remessa(s)</span>
          </div>

          ${
            pedidos.length === 0
              ? `<div style="text-align: center; padding: 2rem 1rem; color: var(--cor-texto-mutado);">Ainda não solicitou nenhuma remessa internacional.</div>`
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Ref. Remessa</th>
                    <th>Beneficiário & País</th>
                    <th>IBAN / Conta</th>
                    <th>Montante</th>
                    <th>Comissão</th>
                    <th>Total Pago</th>
                    <th>Data</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${pedidos.map((r) => `
                    <tr>
                      <td><code>${r.id}</code></td>
                      <td><strong>${r.beneficiarioNome}</strong><br><small style="color: var(--cor-texto-mutado);">${r.beneficiarioPais} • ${r.beneficiarioBanco}</small></td>
                      <td><code>${r.beneficiarioIban}</code></td>
                      <td><strong>${r.montanteDivisa} ${r.moedaDestino}</strong></td>
                      <td>${Number(r.comissaoAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</td>
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

    // Listeners
    container.querySelector("#select-moeda-remessa")?.addEventListener("change", (e) => {
      moedaDestino = (e.target as HTMLSelectElement).value as "EUR" | "USD";
      render();
    });

    container.querySelector("#input-montante-remessa")?.addEventListener("input", (e) => {
      montanteDivisa = (e.target as HTMLInputElement).value;
      render();
    });

    container.querySelector("#form-remessa")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const beneficiarioNome = (container.querySelector("#rem-nome-beneficiario") as HTMLInputElement).value;
      const beneficiarioPais = (container.querySelector("#rem-pais") as HTMLSelectElement).value;
      const beneficiarioBanco = (container.querySelector("#rem-banco") as HTMLInputElement).value;
      const beneficiarioIban = (container.querySelector("#rem-iban") as HTMLInputElement).value;
      const beneficiarioSwift = (container.querySelector("#rem-swift") as HTMLInputElement).value;
      const finalidade = (container.querySelector("#rem-finalidade") as HTMLSelectElement).value;

      try {
        submetendo = true;
        erroMsg = "";
        sucessoMsg = "";
        render();

        const novo = await api.criarPedidoRemessa({
          beneficiarioNome,
          beneficiarioPais,
          beneficiarioBanco,
          beneficiarioIban,
          beneficiarioSwift: beneficiarioSwift || undefined,
          moedaDestino,
          montanteDivisa,
          finalidade,
        });

        sucessoMsg = `Remessa ${novo.id} registada com sucesso! Foi encaminhada para revisão da nossa equipa de operações.`;
        await carregarDados();
      } catch (err: any) {
        erroMsg = err.message || "Erro ao submeter a remessa.";
      } finally {
        submetendo = false;
        render();
      }
    });
  }

  carregarDados();
}
