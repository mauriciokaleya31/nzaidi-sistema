import { api, type TaxaItem, type PedidoCambio } from "../api.js";
import { authState } from "../auth.state.js";

export function renderCambioView(container: HTMLElement): void {
  let taxas: TaxaItem[] = [];
  let pedidos: PedidoCambio[] = [];
  let carregando = true;
  let submetendo = false;
  let erroMsg = "";
  let sucessoMsg = "";

  // Estado da simulação
  let tipoOperacao: "compra" | "venda" = "compra";
  let moeda: "USD" | "EUR" = "USD";
  let montanteDivisa: string = "500.00";
  let finalidade: string = "Despesas de viagem pessoal / turismo";

  async function carregarDados() {
    try {
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

  function calcularEstimativa(): { taxa: number; totalAoa: number } {
    const itemTaxa = taxas.find((t) => t.moeda === moeda);
    if (!itemTaxa) return { taxa: 0, totalAoa: 0 };

    const taxaStr = tipoOperacao === "compra" ? itemTaxa.compra : itemTaxa.venda;
    const taxa = parseFloat(taxaStr) || 0;
    const montante = parseFloat(montanteDivisa) || 0;
    const totalAoa = montante * taxa;

    return { taxa, totalAoa };
  }

  function render() {
    const { taxa, totalAoa } = calcularEstimativa();

    container.innerHTML = `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.5rem; font-weight: 700;">Operações de Câmbio de Divisas</h1>
          <p style="color: var(--cor-texto-mutado); font-size: 0.9rem;">
            Simule e solicite a sua operação cambial com taxas oficiais transparentes.
          </p>
        </div>

        ${sucessoMsg ? `<div class="alert-box alert-success">${sucessoMsg}</div>` : ""}
        ${erroMsg ? `<div class="alert-box alert-error">${erroMsg}</div>` : ""}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <!-- Simulador & Formulário -->
          <div class="card">
            <h2 class="card-title" style="margin-bottom: 1rem;">Simulador & Pedido de Câmbio</h2>

            <form id="form-cambio">
              <div class="form-group">
                <label class="form-label">Tipo de Transação Cambial</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                  <button type="button" id="btn-op-compra" class="btn ${tipoOperacao === "compra" ? "btn-primary" : "btn-secondary"}" style="padding: 0.6rem;">
                    Quero Comprar Divisa
                  </button>
                  <button type="button" id="btn-op-venda" class="btn ${tipoOperacao === "venda" ? "btn-primary" : "btn-secondary"}" style="padding: 0.6rem;">
                    Quero Vender Divisa
                  </button>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Moeda Estrangeira</label>
                  <select id="select-moeda" class="form-select">
                    <option value="USD" ${moeda === "USD" ? "selected" : ""}>USD — Dólar Americano</option>
                    <option value="EUR" ${moeda === "EUR" ? "selected" : ""}>EUR — Euro Europeu</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Montante em Divisa</label>
                  <input type="number" id="input-montante" class="form-input" min="10" step="10" value="${montanteDivisa}" required>
                </div>
              </div>

              <!-- Caixa de Resumo e Taxa -->
              <div style="background: #0f172a; border: 1px solid var(--cor-borda); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--cor-texto-mutado);">
                  <span>Taxa Aplicada (${tipoOperacao === "compra" ? "Compra" : "Venda"}):</span>
                  <strong style="color: #fff;">${taxa.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} AOA</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--cor-borda); padding-top: 0.5rem;">
                  <span style="font-weight: 600; font-size: 0.95rem;">Contravalor Estimado:</span>
                  <span style="font-size: 1.35rem; font-weight: 800; color: var(--cor-primaria);">
                    ${totalAoa.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AOA
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Finalidade da Operação</label>
                <select id="select-finalidade" class="form-select">
                  <option value="Despesas de viagem pessoal / turismo">Despesas de viagem pessoal / turismo</option>
                  <option value="Tratamento médico / saúde no exterior">Tratamento médico / saúde no exterior</option>
                  <option value="Educação e formação internacional">Educação e formação internacional</option>
                  <option value="Importação de mercadorias / serviços comerciais">Importação de mercadorias / serviços comerciais</option>
                  <option value="Outras operações autorizadas pelo BNA">Outras operações autorizadas pelo BNA</option>
                </select>
              </div>

              <button type="submit" class="btn btn-primary btn-block" ${submetendo ? "disabled" : ""}>
                ${submetendo ? "A registar pedido..." : "Confirmar e Registar Pedido de Câmbio"}
              </button>
            </form>
          </div>

          <!-- Informações e Normas BNA -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h2 class="card-title" style="margin-bottom: 1rem;">Como funciona o seu pedido?</h2>
              <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem; color: var(--cor-texto-mutado);">
                <div style="display: flex; gap: 0.75rem;">
                  <span style="background: rgba(196, 155, 69, 0.2); color: var(--cor-primaria); font-weight: 700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</span>
                  <div>
                    <strong style="color: #fff;">Registo Digital da Intenção:</strong><br>
                    O seu pedido é gravado de imediato nos nossos sistemas com o código único de rastreio e cotação oficial fixada.
                  </div>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                  <span style="background: rgba(196, 155, 69, 0.2); color: var(--cor-primaria); font-weight: 700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</span>
                  <div>
                    <strong style="color: #fff;">Conferência Documental (KYC):</strong><br>
                    Para operações cambiais, assegure-se de que os seus documentos estão aprovados na área de documentos.
                  </div>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                  <span style="background: rgba(196, 155, 69, 0.2); color: var(--cor-primaria); font-weight: 700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</span>
                  <div>
                    <strong style="color: #fff;">Levantamento no Balcão:</strong><br>
                    Apresente a referência do pedido em qualquer dos nossos balcões autorizados para liquidação e emissão do Borderô oficial com selo BNA.
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top: 1.5rem; padding: 0.85rem; background: rgba(2, 132, 199, 0.1); border-left: 3px solid var(--cor-secundaria); border-radius: 4px; font-size: 0.8rem; color: #7dd3fc;">
              Operações sujeitas aos normativos cambiais em vigor do Banco Nacional de Angola (BNA).
            </div>
          </div>
        </div>

        <!-- Histórico de Pedidos de Câmbio -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Histórico de Pedidos de Câmbio</h2>
            <span style="font-size: 0.85rem; color: var(--cor-texto-mutado);">${pedidos.length} registo(s)</span>
          </div>

          ${
            pedidos.length === 0
              ? `<div style="text-align: center; padding: 2rem 1rem; color: var(--cor-texto-mutado);">Nenhum pedido de câmbio registado até ao momento.</div>`
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Ref. Pedido</th>
                    <th>Operação</th>
                    <th>Montante</th>
                    <th>Taxa Fixada</th>
                    <th>Total Estimado</th>
                    <th>Finalidade</th>
                    <th>Data</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${pedidos.map((p) => `
                    <tr>
                      <td><code>${p.id}</code></td>
                      <td>${p.tipoOperacao === "compra" ? "Compra" : "Venda"}</td>
                      <td><strong>${p.montanteDivisa} ${p.moeda}</strong></td>
                      <td>${p.taxaProposta} AOA</td>
                      <td>${Number(p.totalAoaEstimado).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</td>
                      <td><small>${p.finalidade}</small></td>
                      <td>${new Date(p.criadoEm).toLocaleDateString("pt-AO")}</td>
                      <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
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

    // Listeners Interativos
    container.querySelector("#btn-op-compra")?.addEventListener("click", () => {
      tipoOperacao = "compra";
      render();
    });

    container.querySelector("#btn-op-venda")?.addEventListener("click", () => {
      tipoOperacao = "venda";
      render();
    });

    container.querySelector("#select-moeda")?.addEventListener("change", (e) => {
      moeda = (e.target as HTMLSelectElement).value as "USD" | "EUR";
      render();
    });

    container.querySelector("#input-montante")?.addEventListener("input", (e) => {
      montanteDivisa = (e.target as HTMLInputElement).value;
      const { taxa: novaTaxa, totalAoa: novoTotal } = calcularEstimativa();
      const elTotal = container.querySelector(".taxa-preco");
      // Atualização rápida de estimativa sem re-renderizar todo o dom
      render();
    });

    container.querySelector("#form-cambio")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fin = (container.querySelector("#select-finalidade") as HTMLSelectElement).value;

      try {
        submetendo = true;
        erroMsg = "";
        sucessoMsg = "";
        render();

        const novoPedido = await api.criarPedidoCambio({
          tipoOperacao,
          moeda,
          montanteDivisa,
          finalidade: fin,
        });

        sucessoMsg = `Pedido ${novoPedido.id} registado com sucesso! Pode levantar no balcão com o seu documento de identificação.`;
        await carregarDados();
      } catch (err: any) {
        erroMsg = err.message || "Erro ao registar o pedido de câmbio.";
      } finally {
        submetendo = false;
        render();
      }
    });
  }

  render();
  carregarDados();
}
