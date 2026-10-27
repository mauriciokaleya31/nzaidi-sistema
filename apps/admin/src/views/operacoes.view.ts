import { api, type OperacaoItem } from "../api/cliente.js";
import {
  aCarregar,
  botaoFecharModal,
  cabecalhoPagina,
  estadoOperacao,
  fonteTaxa,
  icone,
  moeda,
  tipoOperacao,
  vazio,
} from "../ui/componentes.js";
import { esc, formatarDataHora, formatarMontante, formatarPercentagem, formatarTaxa } from "../ui/formatar.js";
import { authState } from "../state/auth.state.js";

const POR_PAGINA = 15;
/** Máximo que a API devolve por pedido (GET /api/v1/operacoes). */
const LIMITE_API = 100;

/**
 * Diário de operações (só leitura). Usa o endpoint existente GET /api/v1/operacoes;
 * filtros e paginação são feitos sobre os registos mais recentes devolvidos pela API.
 */
export async function renderizarOperacoes(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: "Operações",
      descricao: "Diário das operações cambiais registadas no balcão. Os registos são imutáveis; correcções fazem-se por estorno.",
      accoes: `
        <button type="button" id="btn-recarregar-operacoes" class="nz-botao nz-botao--secundario">${icone("actualizar")}Actualizar</button>
        ${authState.temPermissao("operacoes:registar") ? `<a href="#balcao" class="nz-botao nz-botao--primario">${icone("mais")}Nova operação</a>` : ""}
      `,
    })}

    <section class="nz-painel">
      <div class="barra-filtros" role="search">
        <div class="nz-entrada-grupo barra-filtros__pesquisa">
          ${icone("pesquisa")}
          <input type="search" id="filtro-op-texto" class="nz-entrada" placeholder="N.º de operação ou operador" aria-label="Pesquisar operações" />
        </div>
        <select id="filtro-op-tipo" class="nz-seletor" aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          <option value="compra">Compra</option>
          <option value="venda">Venda</option>
        </select>
        <select id="filtro-op-moeda" class="nz-seletor" aria-label="Filtrar por moeda">
          <option value="">Todas as moedas</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <select id="filtro-op-estado" class="nz-seletor" aria-label="Filtrar por estado">
          <option value="">Todos os estados</option>
          <option value="confirmada">Confirmada</option>
          <option value="estornada">Estornada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      <div id="tabela-operacoes-container">${aCarregar(8, "A carregar operações")}</div>
      <div class="nz-painel__rodape nz-paginacao d-none" id="paginacao-operacoes"></div>
    </section>

    <div id="modal-operacao" class="nz-modal d-none" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-operacao">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="titulo-modal-operacao">Detalhe da operação</h2>
            <p class="nz-modal__descricao nz-mono" id="subtitulo-modal-operacao"></p>
          </div>
          ${botaoFecharModal("btn-fechar-modal-operacao")}
        </div>
        <div class="nz-modal__corpo" id="corpo-modal-operacao"></div>
      </div>
    </div>
  `;

  const alvo = container.querySelector<HTMLDivElement>("#tabela-operacoes-container");
  const paginacao = container.querySelector<HTMLDivElement>("#paginacao-operacoes");
  const filtroTexto = container.querySelector<HTMLInputElement>("#filtro-op-texto");
  const filtroTipo = container.querySelector<HTMLSelectElement>("#filtro-op-tipo");
  const filtroMoeda = container.querySelector<HTMLSelectElement>("#filtro-op-moeda");
  const filtroEstado = container.querySelector<HTMLSelectElement>("#filtro-op-estado");
  const modal = container.querySelector<HTMLDivElement>("#modal-operacao");
  const corpoModal = container.querySelector<HTMLDivElement>("#corpo-modal-operacao");
  const subtituloModal = container.querySelector<HTMLElement>("#subtitulo-modal-operacao");

  let todas: OperacaoItem[] = [];
  let pagina = 1;

  function filtradas(): OperacaoItem[] {
    const termo = (filtroTexto?.value ?? "").trim().toLowerCase();
    return todas.filter(
      (o) =>
        (!termo || o.numeroOperacao.toLowerCase().includes(termo) || o.operadorNome.toLowerCase().includes(termo)) &&
        (!filtroTipo?.value || o.tipo === filtroTipo.value) &&
        (!filtroMoeda?.value || o.moedaDivisa === filtroMoeda.value) &&
        (!filtroEstado?.value || o.estado === filtroEstado.value)
    );
  }

  function desenhar(): void {
    if (!alvo || !paginacao) return;
    const lista = filtradas();
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    pagina = Math.min(pagina, paginas);
    const inicio = (pagina - 1) * POR_PAGINA;
    const visiveis = lista.slice(inicio, inicio + POR_PAGINA);

    if (todas.length === 0) {
      paginacao.classList.add("d-none");
      alvo.innerHTML = vazio({
        icone: "operacoes",
        titulo: "Ainda não há operações registadas",
        texto: "Quando uma operação for confirmada no balcão, fica registada neste diário.",
      });
      return;
    }
    if (lista.length === 0) {
      paginacao.classList.add("d-none");
      alvo.innerHTML = vazio({
        icone: "filtro",
        titulo: "Nenhuma operação corresponde aos filtros",
        texto: "Altere ou limpe os filtros para ver mais resultados.",
        accoes: `<button type="button" class="nz-botao nz-botao--secundario" id="btn-limpar-filtros-op">Limpar filtros</button>`,
      });
      alvo.querySelector("#btn-limpar-filtros-op")?.addEventListener("click", () => {
        if (filtroTexto) filtroTexto.value = "";
        if (filtroTipo) filtroTipo.value = "";
        if (filtroMoeda) filtroMoeda.value = "";
        if (filtroEstado) filtroEstado.value = "";
        desenhar();
      });
      return;
    }

    alvo.innerHTML = `
      <div class="nz-tabela-envoltorio">
        <table class="nz-tabela nz-tabela--cartoes">
          <thead>
            <tr>
              <th>Operação</th>
              <th>Data</th>
              <th>Tipo</th>
              <th class="nz-tabela__direita">Montante</th>
              <th class="nz-tabela__direita">Taxa</th>
              <th class="nz-tabela__direita">Total em kwanzas</th>
              <th>Operador</th>
              <th>Estado</th>
              <th><span class="nz-visualmente-oculto">Acções</span></th>
            </tr>
          </thead>
          <tbody>
            ${visiveis
              .map(
                (o) => `
              <tr data-seleccionavel data-id="${esc(o.id)}">
                <td data-principal>
                  <span class="nz-tabela__principal nz-mono">${esc(o.numeroOperacao)}</span>
                  <span class="nz-tabela__secundario so-telemovel">${formatarDataHora(o.criadoEm)}</span>
                </td>
                <td data-label="Data" class="so-computador">${formatarDataHora(o.criadoEm)}</td>
                <td data-label="Tipo">${tipoOperacao(o.tipo)}</td>
                <td data-label="Montante" class="nz-valor">${formatarMontante(o.moedaDivisa, o.montanteDivisa)}</td>
                <td data-label="Taxa" class="nz-valor">${formatarTaxa(o.taxaAplicada)}</td>
                <td data-label="Total" class="nz-valor nz-tabela__principal">${formatarMontante("AOA", o.montanteAoa)}</td>
                <td data-label="Operador">${esc(o.operadorNome)}</td>
                <td data-label="Estado">${estadoOperacao(o.estado)}</td>
                <td class="nz-tabela__accoes">
                  <button type="button" class="nz-botao nz-botao--fantasma nz-botao--sm btn-ver-operacao" data-id="${esc(o.id)}">Detalhe ${icone("chevron-direita")}</button>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    alvo.querySelectorAll<HTMLElement>("tr[data-id]").forEach((linha) => {
      linha.addEventListener("click", () => abrirDetalhe(linha.dataset.id ?? ""));
    });

    paginacao.classList.remove("d-none");
    paginacao.innerHTML = `
      <span class="nz-paginacao__info">${inicio + 1}–${inicio + visiveis.length} de ${lista.length}${todas.length >= LIMITE_API ? ` (últimos ${LIMITE_API} registos)` : ""}</span>
      <div class="nz-grupo-botoes">
        <button type="button" class="nz-botao nz-botao--secundario nz-botao--sm" id="btn-pagina-anterior" ${pagina <= 1 ? "disabled" : ""}>${icone("chevron-esquerda")}Anterior</button>
        <span class="nz-paginacao__info">Página ${pagina} de ${paginas}</span>
        <button type="button" class="nz-botao nz-botao--secundario nz-botao--sm" id="btn-pagina-seguinte" ${pagina >= paginas ? "disabled" : ""}>Seguinte${icone("chevron-direita")}</button>
      </div>
    `;
    paginacao.querySelector("#btn-pagina-anterior")?.addEventListener("click", () => {
      pagina--;
      desenhar();
    });
    paginacao.querySelector("#btn-pagina-seguinte")?.addEventListener("click", () => {
      pagina++;
      desenhar();
    });
  }

  function abrirDetalhe(id: string): void {
    const o = todas.find((x) => x.id === id);
    if (!o || !modal || !corpoModal) return;
    if (subtituloModal) subtituloModal.textContent = o.numeroOperacao;
    corpoModal.innerHTML = `
      <div class="detalhe-operacao__destaque">
        <div>
          <span class="nz-rotulo">Total em kwanzas</span>
          <div class="detalhe-operacao__total nz-valor">${formatarMontante("AOA", o.montanteAoa)}</div>
        </div>
        ${estadoOperacao(o.estado)}
      </div>
      <dl class="nz-descricao">
        <div><dt>Tipo</dt><dd>${tipoOperacao(o.tipo)}</dd></div>
        <div><dt>Moeda</dt><dd>${moeda(o.moedaDivisa)}</dd></div>
        <div><dt>Montante em divisa</dt><dd class="nz-valor">${formatarMontante(o.moedaDivisa, o.montanteDivisa)}</dd></div>
        <div><dt>Taxa aplicada</dt><dd class="nz-valor">${formatarTaxa(o.taxaAplicada)} Kz</dd></div>
        <div><dt>Referência BNA</dt><dd class="nz-valor">${formatarTaxa(o.taxaReferenciaBna)} Kz</dd></div>
        <div><dt>Margem aplicada</dt><dd class="nz-valor">${formatarPercentagem(o.margemAplicada)}</dd></div>
        <div><dt>Fonte da taxa</dt><dd>${fonteTaxa(o.fonteTaxa)}</dd></div>
        <div><dt>Operador</dt><dd>${esc(o.operadorNome)}</dd></div>
        <div><dt>Registada em</dt><dd>${formatarDataHora(o.criadoEm)}</dd></div>
        <div><dt>Caixa</dt><dd class="nz-mono">${esc(o.caixaId)}</dd></div>
        ${o.motivoEstorno ? `<div><dt>Motivo do estorno</dt><dd>${esc(o.motivoEstorno)}</dd></div>` : ""}
      </dl>
    `;
    modal.classList.remove("d-none");
  }

  async function carregar(): Promise<void> {
    if (!alvo) return;
    alvo.innerHTML = aCarregar(8, "A carregar operações");
    try {
      todas = await api.listarOperacoes(LIMITE_API);
      desenhar();
    } catch {
      paginacao?.classList.add("d-none");
      alvo.innerHTML = vazio({
        icone: "alerta",
        titulo: "Não foi possível carregar as operações",
        texto: "Verifique a ligação ao servidor e tente novamente.",
        variante: "erro",
        accoes: `<button type="button" class="nz-botao nz-botao--secundario" id="btn-tentar-operacoes">${icone("actualizar")}Tentar novamente</button>`,
      });
      alvo.querySelector("#btn-tentar-operacoes")?.addEventListener("click", () => void carregar());
    }
  }

  for (const filtro of [filtroTexto, filtroTipo, filtroMoeda, filtroEstado]) {
    filtro?.addEventListener("input", () => {
      pagina = 1;
      desenhar();
    });
  }
  container.querySelector("#btn-recarregar-operacoes")?.addEventListener("click", () => void carregar());
  container.querySelector("#btn-fechar-modal-operacao")?.addEventListener("click", () => modal?.classList.add("d-none"));

  await carregar();
}
