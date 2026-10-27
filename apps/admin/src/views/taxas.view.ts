import { api, ApiError, type TaxaItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { calcularTaxas, decimal, type MoedaDivisa } from "@nzaidi/dominio";
import { aCarregar, botaoFecharModal, cabecalhoPagina, fonteTaxa, icone, moeda, NOMES_MOEDA, notificar, vazio } from "../ui/componentes.js";
import { esc, formatarDataHora, formatarPercentagem, formatarTaxa } from "../ui/formatar.js";

/** Só para a pré-visualização no formulário; os limites reais das margens são validados pelo servidor. */
const LIMITES_PRE_VISUALIZACAO = { minima: "0", maxima: "0.9999" };

export async function renderizarTaxas(container: HTMLElement): Promise<void> {
  // Mesmo nome que a API exige em PUT /api/v1/taxas (apps/api/.../taxas.routes.ts)
  const podeEditar = authState.temPermissao("alterar_taxas");

  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: "Taxas de câmbio",
      descricao: "Taxa de referência do BNA, margens comerciais e taxas de balcão em vigor. Valores em kwanzas por unidade de divisa.",
      accoes: `<button id="btn-recarregar-taxas" class="nz-botao nz-botao--secundario">${icone("actualizar")}Actualizar</button>`,
    })}

    <div id="alerta-taxas" class="nz-alerta d-none"></div>

    ${
      !podeEditar
        ? `
        <div class="nz-alerta nz-alerta--info aviso-pagina">
          ${icone("info")}
          <div>Modo de consulta. Só o perfil de <strong>gestão</strong> pode alterar referências e margens.</div>
        </div>
      `
        : `
        <div class="nz-alerta nz-alerta--aviso aviso-pagina">
          ${icone("alerta")}
          <div>As alterações têm efeito imediato no balcão e no simulador do site público, e exigem um motivo para a pista de auditoria.</div>
        </div>
      `
    }

    <div id="tabela-taxas-container" class="quadro-taxas">
      <div class="nz-painel">${aCarregar(5, "A carregar taxas")}</div>
    </div>

    <!-- Modal de Edição de Taxas -->
    <div id="modal-editar-taxa" class="nz-modal nz-modal--largo d-none" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="modal-titulo">Actualizar cotação</h2>
            <p class="nz-modal__descricao">A alteração é aplicada de imediato e fica registada com o motivo indicado.</p>
          </div>
          ${botaoFecharModal("btn-fechar-modal")}
        </div>

        <form id="form-editar-taxa" class="modal-form">
          <div class="nz-modal__corpo">
            <div id="modal-alerta-erro" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

            <div class="nz-grelha-campos">
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="modal-moeda">Moeda</label>
                <input type="text" id="modal-moeda" class="nz-entrada" readonly disabled />
              </div>
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="modal-fonte">Fonte da taxa</label>
                <select id="modal-fonte" class="nz-seletor">
                  <option value="demonstracao">Demonstração (simulada)</option>
                  <option value="oficial">Oficial (fixação do BNA)</option>
                </select>
              </div>
            </div>

            <div class="nz-campo">
              <label class="nz-campo__rotulo" for="modal-referencia">Taxa de referência do BNA<span class="nz-campo__obrigatorio">*</span></label>
              <div class="nz-entrada-grupo">
                <input type="text" id="modal-referencia" class="nz-entrada nz-entrada--numero" placeholder="928.50" inputmode="decimal" required />
                <span class="nz-entrada-grupo__sufixo">Kz</span>
              </div>
              <span class="nz-campo__ajuda">Kwanzas por 1 unidade de divisa. Use ponto decimal (ex.: 928.50).</span>
            </div>

            <div class="nz-grelha-campos">
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="modal-margem-compra">Margem de compra<span class="nz-campo__obrigatorio">*</span></label>
                <input type="text" id="modal-margem-compra" class="nz-entrada nz-entrada--numero" placeholder="0.02" inputmode="decimal" required />
                <span class="nz-campo__ajuda" id="ajuda-margem-compra">Em fracção: 0.02 corresponde a 2 %.</span>
              </div>
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="modal-margem-venda">Margem de venda<span class="nz-campo__obrigatorio">*</span></label>
                <input type="text" id="modal-margem-venda" class="nz-entrada nz-entrada--numero" placeholder="0.02" inputmode="decimal" required />
                <span class="nz-campo__ajuda" id="ajuda-margem-venda">Em fracção: 0.02 corresponde a 2 %.</span>
              </div>
            </div>

            <div class="pre-visualizacao" aria-live="polite">
              <span class="nz-rotulo">Pré-visualização das taxas de balcão</span>
              <div class="pre-visualizacao__valores">
                <div><span>Compra</span><strong class="nz-valor" id="previa-compra">—</strong></div>
                <div><span>Venda</span><strong class="nz-valor" id="previa-venda">—</strong></div>
              </div>
              <span class="nz-campo__ajuda">Calculado com a regra R-07. O servidor valida os limites das margens ao gravar.</span>
            </div>

            <div class="nz-campo">
              <label class="nz-campo__rotulo" for="modal-motivo">Motivo da alteração<span class="nz-campo__obrigatorio">*</span></label>
              <textarea
                id="modal-motivo"
                class="nz-area-texto"
                rows="3"
                placeholder="Ex.: ajuste à fixação do BNA de hoje."
                required
              ></textarea>
              <span class="nz-campo__ajuda">Obrigatório para a pista de auditoria.</span>
            </div>
          </div>

          <div class="nz-modal__rodape">
            <button type="button" id="btn-cancelar-modal" class="nz-botao nz-botao--secundario">Cancelar</button>
            <button type="submit" id="btn-salvar-modal" class="nz-botao nz-botao--primario">
              <span class="btn-text">Gravar alteração</span>
              <span class="btn-spinner d-none">A gravar…</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-taxas-container");
  const alerta = container.querySelector<HTMLDivElement>("#alerta-taxas");
  const btnRecarregar = container.querySelector<HTMLButtonElement>("#btn-recarregar-taxas");

  const modal = container.querySelector<HTMLDivElement>("#modal-editar-taxa");
  const btnFecharModal = container.querySelector<HTMLButtonElement>("#btn-fechar-modal");
  const btnCancelarModal = container.querySelector<HTMLButtonElement>("#btn-cancelar-modal");
  const formEditar = container.querySelector<HTMLFormElement>("#form-editar-taxa");
  const modalAlerta = container.querySelector<HTMLDivElement>("#modal-alerta-erro");
  const inputMoeda = container.querySelector<HTMLInputElement>("#modal-moeda");
  const selectFonte = container.querySelector<HTMLSelectElement>("#modal-fonte");
  const inputReferencia = container.querySelector<HTMLInputElement>("#modal-referencia");
  const inputMargemCompra = container.querySelector<HTMLInputElement>("#modal-margem-compra");
  const inputMargemVenda = container.querySelector<HTMLInputElement>("#modal-margem-venda");
  const inputMotivo = container.querySelector<HTMLTextAreaElement>("#modal-motivo");
  const btnSalvarModal = container.querySelector<HTMLButtonElement>("#btn-salvar-modal");

  let taxasAtuais: TaxaItem[] = [];

  async function carregarTaxas(): Promise<void> {
    if (!containerTabela) return;
    containerTabela.innerHTML = `<div class="nz-painel">${aCarregar(5, "A carregar taxas")}</div>`;

    try {
      taxasAtuais = await api.listarTaxas();
      if (!taxasAtuais || taxasAtuais.length === 0) {
        containerTabela.innerHTML = `<div class="nz-painel">${vazio({
          icone: "taxas",
          titulo: "Sem taxas configuradas",
          texto: "Ainda não foram publicadas taxas de câmbio.",
        })}</div>`;
        return;
      }

      containerTabela.innerHTML = `
        ${taxasAtuais
          .map(
            (t) => `
          <section class="nz-painel taxa" aria-label="Taxas ${esc(t.moeda)}">
            <div class="nz-painel__cabecalho">
              <div class="taxa__titulo">
                ${moeda(t.moeda, "lg")}
                <div>
                  <h2 class="nz-painel__titulo">${esc(NOMES_MOEDA[t.moeda] ?? t.moeda)}</h2>
                  <p class="nz-painel__subtitulo">${esc(t.moeda)}/AOA · actualizada em ${formatarDataHora(t.atualizadoEm)}</p>
                </div>
              </div>
              <div class="nz-grupo-botoes">
                ${fonteTaxa(t.fonte)}
                ${
                  podeEditar
                    ? `<button class="nz-botao nz-botao--secundario nz-botao--sm btn-editar-taxa" data-moeda="${esc(t.moeda)}">${icone("documento")}Editar</button>`
                    : ""
                }
              </div>
            </div>
            <div class="taxa__corpo">
              <div class="taxa__coluna">
                <span class="nz-rotulo">Compra ao balcão</span>
                <span class="taxa__valor nz-valor taxa-compra">${formatarTaxa(t.compra)}</span>
                <span class="taxa__nota">Margem ${formatarPercentagem(t.margemCompra)} abaixo da referência</span>
              </div>
              <div class="taxa__coluna taxa__coluna--referencia">
                <span class="nz-rotulo">Referência BNA</span>
                <span class="taxa__valor taxa__valor--referencia nz-valor">${formatarTaxa(t.referencia)}</span>
                <span class="taxa__nota">Spread ${formatarPercentagem(somarMargens(t))}</span>
              </div>
              <div class="taxa__coluna">
                <span class="nz-rotulo">Venda ao balcão</span>
                <span class="taxa__valor nz-valor taxa-venda">${formatarTaxa(t.venda)}</span>
                <span class="taxa__nota">Margem ${formatarPercentagem(t.margemVenda)} acima da referência</span>
              </div>
            </div>
            ${t.aviso ? `<div class="nz-painel__rodape">${icone("info", "nz-icone--sm")}<span>${esc(t.aviso)}</span></div>` : ""}
          </section>
        `
          )
          .join("")}
      `;

      // Event listeners para botões de edição
      if (podeEditar) {
        containerTabela.querySelectorAll(".btn-editar-taxa").forEach((btn) => {
          btn.addEventListener("click", () => {
            const moedaSel = btn.getAttribute("data-moeda") as MoedaDivisa;
            abrirModalEdicao(moedaSel);
          });
        });
      }
    } catch (err) {
      containerTabela.innerHTML = `<div class="nz-painel">${vazio({
        icone: "alerta",
        titulo: "Não foi possível carregar as taxas",
        texto: "Verifique a ligação ao servidor e tente novamente.",
        variante: "erro",
      })}</div>`;
    }
  }

  /** Spread total entre compra e venda, em fracção da referência. */
  function somarMargens(t: TaxaItem): string {
    try {
      return decimal(t.margemCompra).plus(decimal(t.margemVenda)).toString();
    } catch {
      return "";
    }
  }

  function actualizarPreVisualizacao(): void {
    const previaCompra = container.querySelector<HTMLElement>("#previa-compra");
    const previaVenda = container.querySelector<HTMLElement>("#previa-venda");
    const ajudaCompra = container.querySelector<HTMLElement>("#ajuda-margem-compra");
    const ajudaVenda = container.querySelector<HTMLElement>("#ajuda-margem-venda");
    if (ajudaCompra) ajudaCompra.textContent = `Em fracção: ${inputMargemCompra?.value || "0.02"} corresponde a ${formatarPercentagem(inputMargemCompra?.value || "0.02")}.`;
    if (ajudaVenda) ajudaVenda.textContent = `Em fracção: ${inputMargemVenda?.value || "0.02"} corresponde a ${formatarPercentagem(inputMargemVenda?.value || "0.02")}.`;
    try {
      const calc = calcularTaxas(
        {
          moeda: (inputMoeda?.value || "USD") as MoedaDivisa,
          referencia: inputReferencia?.value.trim() ?? "",
          margemCompra: inputMargemCompra?.value.trim() ?? "",
          margemVenda: inputMargemVenda?.value.trim() ?? "",
        },
        LIMITES_PRE_VISUALIZACAO
      );
      if (previaCompra) previaCompra.textContent = `${formatarTaxa(calc.compra.toString())} Kz`;
      if (previaVenda) previaVenda.textContent = `${formatarTaxa(calc.venda.toString())} Kz`;
    } catch {
      if (previaCompra) previaCompra.textContent = "—";
      if (previaVenda) previaVenda.textContent = "—";
    }
  }

  for (const campo of [inputReferencia, inputMargemCompra, inputMargemVenda]) {
    campo?.addEventListener("input", actualizarPreVisualizacao);
  }

  function abrirModalEdicao(moedaSel: MoedaDivisa): void {
    const item = taxasAtuais.find((t) => t.moeda === moedaSel);
    if (!item || !modal || !inputMoeda || !selectFonte || !inputReferencia || !inputMargemCompra || !inputMargemVenda || !inputMotivo) {
      return;
    }

    modalAlerta?.classList.add("d-none");
    if (modalAlerta) modalAlerta.textContent = "";

    inputMoeda.value = item.moeda;
    selectFonte.value = item.fonte;
    inputReferencia.value = item.referencia;
    inputMargemCompra.value = item.margemCompra;
    inputMargemVenda.value = item.margemVenda;
    inputMotivo.value = "";
    actualizarPreVisualizacao();

    modal.classList.remove("d-none");
  }

  function fecharModal(): void {
    modal?.classList.add("d-none");
  }

  btnFecharModal?.addEventListener("click", fecharModal);
  btnCancelarModal?.addEventListener("click", fecharModal);
  btnRecarregar?.addEventListener("click", carregarTaxas);

  formEditar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!inputMoeda || !selectFonte || !inputReferencia || !inputMargemCompra || !inputMargemVenda || !inputMotivo || !modalAlerta || !btnSalvarModal) {
      return;
    }

    const moedaSel = inputMoeda.value as MoedaDivisa;
    const referencia = inputReferencia.value.trim();
    const margemCompra = inputMargemCompra.value.trim();
    const margemVenda = inputMargemVenda.value.trim();
    const motivo = inputMotivo.value.trim();
    const fonte = selectFonte.value as "demonstracao" | "oficial";

    if (!motivo) {
      modalAlerta.textContent = "Indique o motivo da alteração. É obrigatório para a pista de auditoria.";
      modalAlerta.classList.remove("d-none");
      inputMotivo.focus();
      return;
    }

    btnSalvarModal.disabled = true;
    const btnText = btnSalvarModal.querySelector(".btn-text");
    const btnSpinner = btnSalvarModal.querySelector(".btn-spinner");
    btnText?.classList.add("d-none");
    btnSpinner?.classList.remove("d-none");

    try {
      await api.atualizarTaxa(moedaSel, {
        referencia,
        margemCompra,
        margemVenda,
        motivo,
        fonte,
      });

      fecharModal();
      notificar(alerta, `Taxa de ${moedaSel} actualizada e registada na auditoria.`);
      await carregarTaxas();
    } catch (err) {
      if (err instanceof ApiError) {
        modalAlerta.textContent = err.message;
      } else {
        modalAlerta.textContent = "Não foi possível gravar a alteração. Tente novamente.";
      }
      modalAlerta.classList.remove("d-none");
    } finally {
      btnSalvarModal.disabled = false;
      btnText?.classList.remove("d-none");
      btnSpinner?.classList.add("d-none");
    }
  });

  await carregarTaxas();
}
