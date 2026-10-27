import { api, ApiError, type CaixaAtivoResposta } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { decimal } from "@nzaidi/dominio";
import { aCarregar, botaoFecharModal, cabecalhoPagina, estadoCaixa, icone, moeda, NOMES_MOEDA, notificar, vazio } from "../ui/componentes.js";
import { esc, formatarDataHora, formatarMontante } from "../ui/formatar.js";

const MOEDAS_CAIXA = ["AOA", "USD", "EUR"] as const;

function eZero(texto: string): boolean {
  try {
    return decimal(texto).isZero();
  } catch {
    return false;
  }
}

export async function renderizarCaixa(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) return;

  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: "Caixa e tesouraria",
      descricao: "Abertura, suprimentos, sangrias e fecho do caixa do balcão, com conferência física por moeda.",
      idAccoes: "caixa-acoes-topo",
    })}

    <div id="alerta-caixa" class="nz-alerta d-none"></div>

    <div id="caixa-conteudo">
      <div class="nz-painel">${aCarregar(6, "A verificar o estado do caixa")}</div>
    </div>

    <!-- Modal Suprimento / Sangria -->
    <div id="modal-movimento" class="nz-modal d-none" role="dialog" aria-modal="true" aria-labelledby="modal-mov-titulo">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="modal-mov-titulo">Registar movimento de caixa</h2>
            <p class="nz-modal__descricao" id="modal-mov-descricao">O movimento fica registado no caixa e na pista de auditoria.</p>
          </div>
          ${botaoFecharModal("btn-fechar-modal-mov")}
        </div>
        <form id="form-movimento" class="modal-form">
          <div class="nz-modal__corpo">
            <input type="hidden" id="mov-tipo" />
            <div id="modal-erro-mov" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

            <div class="nz-grelha-campos">
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="mov-moeda">Moeda</label>
                <select id="mov-moeda" class="nz-seletor">
                  <option value="AOA">Kwanza (AOA)</option>
                  <option value="USD">Dólar norte-americano (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="mov-montante">Montante<span class="nz-campo__obrigatorio">*</span></label>
                <input type="text" id="mov-montante" class="nz-entrada nz-entrada--numero" placeholder="0.00" inputmode="decimal" autocomplete="off" required />
              </div>
            </div>

            <div class="nz-campo">
              <label class="nz-campo__rotulo" for="mov-descricao">Motivo<span class="nz-campo__obrigatorio">*</span></label>
              <input type="text" id="mov-descricao" class="nz-entrada" placeholder="Ex.: suprimento a partir do cofre central" required />
            </div>
          </div>

          <div class="nz-modal__rodape">
            <button type="button" id="btn-cancelar-mov" class="nz-botao nz-botao--secundario">Cancelar</button>
            <button type="submit" id="btn-salvar-mov" class="nz-botao nz-botao--primario">Confirmar movimento</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Fecho de Caixa -->
    <div id="modal-fecho" class="nz-modal nz-modal--largo d-none" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-fecho">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="titulo-modal-fecho">Fecho e conferência do caixa</h2>
            <p class="nz-modal__descricao">Conte o numerário na gaveta e introduza o valor apurado em cada moeda. O fecho não pode ser desfeito.</p>
          </div>
          ${botaoFecharModal("btn-fechar-modal-fecho")}
        </div>
        <form id="form-fecho" class="modal-form">
          <div class="nz-modal__corpo">
            <div id="modal-erro-fecho" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

            <div class="conferencia" role="table" aria-label="Conferência por moeda">
              <div class="conferencia__linha conferencia__linha--cabecalho" role="row">
                <span role="columnheader">Moeda</span>
                <span role="columnheader" class="nz-tabela__direita">Esperado</span>
                <span role="columnheader">Contado</span>
                <span role="columnheader" class="nz-tabela__direita">Diferença</span>
              </div>
              ${MOEDAS_CAIXA.map(
                (m) => `
                <div class="conferencia__linha" role="row">
                  <span role="cell" class="conferencia__moeda">${moeda(m)}<span>${NOMES_MOEDA[m]}</span></span>
                  <span role="cell" class="nz-valor nz-tabela__direita conferencia__esperado" data-label="Esperado" id="fecho-esperado-${m.toLowerCase()}">—</span>
                  <span role="cell" class="nz-campo">
                    <label class="nz-visualmente-oculto" for="fecho-${m.toLowerCase()}">Contagem em ${m}</label>
                    <input type="text" id="fecho-${m.toLowerCase()}" class="nz-entrada nz-entrada--numero" required placeholder="0.00" inputmode="decimal" autocomplete="off" />
                  </span>
                  <span role="cell" class="nz-valor nz-tabela__direita conferencia__diferenca" data-label="Diferença" id="fecho-diferenca-${m.toLowerCase()}">—</span>
                </div>`
              ).join("")}
            </div>

            <div class="nz-campo">
              <label class="nz-campo__rotulo" for="fecho-justificativa">Justificação de quebras ou sobras</label>
              <textarea
                id="fecho-justificativa"
                class="nz-area-texto"
                rows="3"
                placeholder="Explique qualquer diferença entre o valor contado e o saldo calculado pelo sistema."
              ></textarea>
              <span class="nz-campo__ajuda" id="fecho-ajuda">Obrigatória se houver diferença em alguma moeda.</span>
            </div>
          </div>

          <div class="nz-modal__rodape">
            <button type="button" id="btn-cancelar-fecho" class="nz-botao nz-botao--secundario">Cancelar</button>
            <button type="submit" id="btn-salvar-fecho" class="nz-botao nz-botao--perigo">${icone("cadeado")}Fechar caixa</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const containerConteudo = container.querySelector<HTMLDivElement>("#caixa-conteudo");
  const acoesTopo = container.querySelector<HTMLDivElement>("#caixa-acoes-topo");
  const alerta = container.querySelector<HTMLDivElement>("#alerta-caixa");

  const modalMov = container.querySelector<HTMLDivElement>("#modal-movimento");
  const modalFecho = container.querySelector<HTMLDivElement>("#modal-fecho");
  const formMov = container.querySelector<HTMLFormElement>("#form-movimento");
  const formFecho = container.querySelector<HTMLFormElement>("#form-fecho");

  // Caixa e saldos em vigor. Os formulários dos modais existem uma só vez na vista,
  // por isso os seus ouvintes são ligados uma só vez e lêem sempre o caixa actual.
  let caixaActual: CaixaAtivoResposta | null = null;

  /** Diferença contado − esperado, só para apresentação. A decisão é do servidor. */
  function actualizarDiferencas(): void {
    if (!caixaActual) return;
    let haDiferenca = false;
    for (const m of MOEDAS_CAIXA) {
      const id = m.toLowerCase();
      const esperado = caixaActual.saldos[m].saldoEsperado;
      const entrada = container.querySelector<HTMLInputElement>(`#fecho-${id}`);
      const alvo = container.querySelector<HTMLElement>(`#fecho-diferenca-${id}`);
      if (!alvo) continue;
      try {
        const diferenca = decimal((entrada?.value ?? "").trim()).minus(decimal(esperado));
        const texto = formatarMontante(m, diferenca.toFixed(2));
        alvo.textContent = diferenca.isZero() ? "Sem diferença" : `${diferenca.isPositive() ? "+" : ""}${texto}`;
        alvo.className = `nz-valor nz-tabela__direita conferencia__diferenca ${
          diferenca.isZero() ? "conferencia__diferenca--certo" : "conferencia__diferenca--erro"
        }`;
        entrada?.removeAttribute("aria-invalid");
        if (!diferenca.isZero()) haDiferenca = true;
      } catch {
        alvo.textContent = "Valor inválido";
        alvo.className = "nz-valor nz-tabela__direita conferencia__diferenca conferencia__diferenca--erro";
        if (entrada?.value.trim()) entrada.setAttribute("aria-invalid", "true");
      }
    }
    const ajuda = container.querySelector<HTMLElement>("#fecho-ajuda");
    if (ajuda) {
      ajuda.textContent = haDiferenca
        ? "Há diferenças na contagem: a justificação é obrigatória."
        : "Obrigatória se houver diferença em alguma moeda.";
      ajuda.className = haDiferenca ? "nz-campo__erro" : "nz-campo__ajuda";
    }
  }

  for (const m of MOEDAS_CAIXA) {
    container.querySelector(`#fecho-${m.toLowerCase()}`)?.addEventListener("input", actualizarDiferencas);
  }

  // Fecho do modal
  container.querySelector("#btn-fechar-modal-mov")?.addEventListener("click", () => modalMov?.classList.add("d-none"));
  container.querySelector("#btn-cancelar-mov")?.addEventListener("click", () => modalMov?.classList.add("d-none"));
  container.querySelector("#btn-fechar-modal-fecho")?.addEventListener("click", () => modalFecho?.classList.add("d-none"));
  container.querySelector("#btn-cancelar-fecho")?.addEventListener("click", () => modalFecho?.classList.add("d-none"));

  // Submissão do movimento manual
  formMov?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!caixaActual) return;
    const tipo = (container.querySelector("#mov-tipo") as HTMLInputElement).value as any;
    const moedaMov = (container.querySelector("#mov-moeda") as HTMLSelectElement).value as any;
    const montante = (container.querySelector("#mov-montante") as HTMLInputElement).value;
    const descricao = (container.querySelector("#mov-descricao") as HTMLInputElement).value;
    const erroMov = container.querySelector("#modal-erro-mov") as HTMLDivElement;
    const btnSalvar = container.querySelector<HTMLButtonElement>("#btn-salvar-mov");

    btnSalvar?.setAttribute("aria-busy", "true");
    try {
      await api.movimentarCaixa(caixaActual.caixa.id, { tipo, moeda: moedaMov, montante, descricao });
      modalMov?.classList.add("d-none");
      formMov.reset();
      notificar(alerta, tipo === "sangria" ? "Sangria registada no caixa." : "Suprimento registado no caixa.");
      await atualizarVisualizacao();
    } catch (err) {
      erroMov.textContent = err instanceof ApiError ? err.message : "Não foi possível registar o movimento.";
      erroMov.classList.remove("d-none");
    } finally {
      btnSalvar?.removeAttribute("aria-busy");
    }
  });

  // Submissão do Fecho de Caixa
  formFecho?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!caixaActual) return;
    const contadoAoa = (container.querySelector("#fecho-aoa") as HTMLInputElement).value;
    const contadoUsd = (container.querySelector("#fecho-usd") as HTMLInputElement).value;
    const contadoEur = (container.querySelector("#fecho-eur") as HTMLInputElement).value;
    const justificativa = (container.querySelector("#fecho-justificativa") as HTMLTextAreaElement).value;
    const erroFecho = container.querySelector("#modal-erro-fecho") as HTMLDivElement;
    const btnSalvar = container.querySelector<HTMLButtonElement>("#btn-salvar-fecho");

    btnSalvar?.setAttribute("aria-busy", "true");
    try {
      await api.fecharCaixa(caixaActual.caixa.id, {
        saldoContadoAoa: contadoAoa,
        saldoContadoUsd: contadoUsd,
        saldoContadoEur: contadoEur,
        justificativaDiferenca: justificativa,
      });

      modalFecho?.classList.add("d-none");
      notificar(alerta, "Caixa fechado. A conferência ficou registada.");
      await atualizarVisualizacao();
    } catch (err) {
      erroFecho.textContent = err instanceof ApiError ? err.message : "Não foi possível fechar o caixa.";
      erroFecho.classList.remove("d-none");
    } finally {
      btnSalvar?.removeAttribute("aria-busy");
    }
  });

  async function atualizarVisualizacao(): Promise<void> {
    if (!containerConteudo || !acoesTopo) return;
    containerConteudo.innerHTML = `<div class="nz-painel">${aCarregar(6, "A verificar o estado do caixa")}</div>`;
    acoesTopo.innerHTML = "";

    try {
      const dadosCaixa: CaixaAtivoResposta | null = await api.obterCaixaAtivo();
      caixaActual = dadosCaixa && dadosCaixa.caixa ? dadosCaixa : null;

      if (!dadosCaixa || !dadosCaixa.caixa) {
        // Operador sem caixa aberto: apresentar ecrã de Abertura
        containerConteudo.innerHTML = `
          <section class="nz-painel abertura-caixa" aria-labelledby="titulo-abertura">
            <div class="nz-painel__cabecalho">
              <div>
                <h2 class="nz-painel__titulo" id="titulo-abertura">${icone("caixa")}Abrir caixa</h2>
                <p class="nz-painel__subtitulo">${esc(usuario?.nome)} não tem nenhum caixa aberto. Registe os fundos iniciais entregues pela tesouraria.</p>
              </div>
              ${estadoCaixa("fechado")}
            </div>
            <form id="form-abrir-caixa" class="nz-painel__corpo nz-formulario">
              <div id="erro-abertura" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="abrir-agencia">Agência ou ponto de atendimento</label>
                <input type="text" id="abrir-agencia" class="nz-entrada" value="Balcão Maianga - Sede" required />
              </div>

              <fieldset class="nz-seccao-formulario">
                <legend class="nz-seccao-formulario__titulo">Fundos iniciais</legend>
                <div class="nz-grelha-campos nz-grelha-campos--3">
                  <div class="nz-campo">
                    <label class="nz-campo__rotulo" for="abrir-aoa">Kwanza</label>
                    <div class="nz-entrada-grupo">
                      <input type="text" id="abrir-aoa" class="nz-entrada nz-entrada--numero" value="1000000.00" inputmode="decimal" required />
                      <span class="nz-entrada-grupo__sufixo">AOA</span>
                    </div>
                  </div>
                  <div class="nz-campo">
                    <label class="nz-campo__rotulo" for="abrir-usd">Dólar</label>
                    <div class="nz-entrada-grupo">
                      <input type="text" id="abrir-usd" class="nz-entrada nz-entrada--numero" value="2000.00" inputmode="decimal" required />
                      <span class="nz-entrada-grupo__sufixo">USD</span>
                    </div>
                  </div>
                  <div class="nz-campo">
                    <label class="nz-campo__rotulo" for="abrir-eur">Euro</label>
                    <div class="nz-entrada-grupo">
                      <input type="text" id="abrir-eur" class="nz-entrada nz-entrada--numero" value="1000.00" inputmode="decimal" required />
                      <span class="nz-entrada-grupo__sufixo">EUR</span>
                    </div>
                  </div>
                </div>
                <span class="nz-campo__ajuda">Confirme os valores com a guia de entrega da tesouraria. Use ponto para as casas decimais.</span>
              </fieldset>

              <div class="abertura-caixa__accoes">
                <button type="submit" class="nz-botao nz-botao--primario nz-botao--lg" id="btn-abrir-caixa">
                  ${icone("visto")}Abrir caixa e iniciar atendimento
                </button>
              </div>
            </form>
          </section>
        `;

        const formAbrir = containerConteudo.querySelector<HTMLFormElement>("#form-abrir-caixa");
        formAbrir?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const agencia = (containerConteudo.querySelector("#abrir-agencia") as HTMLInputElement).value;
          const saldoAoa = (containerConteudo.querySelector("#abrir-aoa") as HTMLInputElement).value;
          const saldoUsd = (containerConteudo.querySelector("#abrir-usd") as HTMLInputElement).value;
          const saldoEur = (containerConteudo.querySelector("#abrir-eur") as HTMLInputElement).value;
          const erroDiv = containerConteudo.querySelector("#erro-abertura") as HTMLDivElement;
          const btnAbrir = containerConteudo.querySelector<HTMLButtonElement>("#btn-abrir-caixa");

          btnAbrir?.setAttribute("aria-busy", "true");
          try {
            await api.abrirCaixa({
              saldoInicialAoa: saldoAoa,
              saldoInicialUsd: saldoUsd,
              saldoInicialEur: saldoEur,
              agencia,
            });

            notificar(alerta, "Caixa aberto. Já pode registar operações no balcão.");
            await atualizarVisualizacao();
          } catch (err) {
            erroDiv.textContent = err instanceof ApiError ? err.message : "Não foi possível abrir o caixa.";
            erroDiv.classList.remove("d-none");
          } finally {
            btnAbrir?.removeAttribute("aria-busy");
          }
        });
        return;
      }

      // Caixa está aberto: Exibir resumo e ferramentas operacionais
      const { caixa, saldos } = dadosCaixa;

      acoesTopo.innerHTML = `
        <button id="btn-suprimento" class="nz-botao nz-botao--secundario">
          ${icone("entrada")}Suprimento
        </button>
        <button id="btn-sangria" class="nz-botao nz-botao--secundario">
          ${icone("saida")}Sangria
        </button>
        <button id="btn-abrir-fecho" class="nz-botao nz-botao--perigo-contorno">
          ${icone("cadeado")}Fechar caixa
        </button>
      `;

      containerConteudo.innerHTML = `
        <section class="nz-painel sessao-caixa" aria-label="Sessão de caixa">
          <div class="sessao-caixa__item">
            <span class="nz-rotulo">Caixa</span>
            <strong class="nz-mono">${esc(caixa.numeroCaixa)}</strong>
          </div>
          <div class="sessao-caixa__item">
            <span class="nz-rotulo">Agência</span>
            <strong>${esc(caixa.agencia)}</strong>
          </div>
          <div class="sessao-caixa__item">
            <span class="nz-rotulo">Operador</span>
            <strong>${esc(caixa.operadorNome)}</strong>
          </div>
          <div class="sessao-caixa__item">
            <span class="nz-rotulo">Aberto em</span>
            <strong>${formatarDataHora(caixa.abertoEm)}</strong>
          </div>
          <div class="sessao-caixa__estado">${estadoCaixa(caixa.estado)}</div>
        </section>

        <div class="posicoes">
          ${MOEDAS_CAIXA.map((m) => {
            const s = saldos[m];
            return `
            <section class="nz-painel posicao saldo-card" aria-label="Posição em ${NOMES_MOEDA[m]}">
              <div class="posicao__topo">
                ${moeda(m, "lg")}
                <span class="posicao__nome">${NOMES_MOEDA[m]}</span>
              </div>
              <div class="posicao__rotulo nz-rotulo">Saldo esperado</div>
              <div class="posicao__valor nz-valor">${formatarMontante(m, s.saldoEsperado)}</div>
              <dl class="nz-descricao posicao__detalhe">
                <div><dt>Saldo inicial</dt><dd class="nz-valor">${formatarMontante(m, s.saldoInicial)}</dd></div>
                <div><dt>${icone("entrada", "nz-icone--sm em-linha nz-valor--entrada")}Entradas</dt><dd class="nz-valor${eZero(s.entradas) ? "" : " nz-valor--entrada"}">${eZero(s.entradas) ? "" : "+"}${formatarMontante(m, s.entradas)}</dd></div>
                <div><dt>${icone("saida", "nz-icone--sm em-linha nz-valor--saida")}Saídas</dt><dd class="nz-valor${eZero(s.saidas) ? "" : " nz-valor--saida"}">${eZero(s.saidas) ? "" : "−"}${formatarMontante(m, s.saidas)}</dd></div>
              </dl>
            </section>`;
          }).join("")}
        </div>

        <p class="nota-rodape">${icone("info", "nz-icone--sm")}O saldo esperado resulta do saldo inicial, das operações confirmadas e dos movimentos registados. No fecho, compare-o com a contagem física.</p>
      `;

      // Eventos para Suprimento, Sangria e Fecho
      const btnSuprimento = acoesTopo.querySelector("#btn-suprimento");
      const btnSangria = acoesTopo.querySelector("#btn-sangria");
      const btnAbrirFecho = acoesTopo.querySelector("#btn-abrir-fecho");

      function abrirMovimento(tipo: "suprimento" | "sangria"): void {
        (container.querySelector("#mov-tipo") as HTMLInputElement).value = tipo;
        (container.querySelector("#modal-mov-titulo") as HTMLElement).textContent =
          tipo === "suprimento" ? "Registar suprimento" : "Registar sangria";
        (container.querySelector("#modal-mov-descricao") as HTMLElement).textContent =
          tipo === "suprimento"
            ? "Entrada de numerário no caixa, por exemplo a partir do cofre central."
            : "Saída de numerário do caixa para o cofre.";
        container.querySelector("#modal-erro-mov")?.classList.add("d-none");
        modalMov?.classList.remove("d-none");
      }

      btnSuprimento?.addEventListener("click", () => abrirMovimento("suprimento"));
      btnSangria?.addEventListener("click", () => abrirMovimento("sangria"));

      btnAbrirFecho?.addEventListener("click", () => {
        for (const m of MOEDAS_CAIXA) {
          const id = m.toLowerCase();
          (container.querySelector(`#fecho-${id}`) as HTMLInputElement).value = saldos[m].saldoEsperado;
          const esperado = container.querySelector<HTMLElement>(`#fecho-esperado-${id}`);
          if (esperado) esperado.textContent = formatarMontante(m, saldos[m].saldoEsperado);
        }
        container.querySelector("#modal-erro-fecho")?.classList.add("d-none");
        actualizarDiferencas();
        modalFecho?.classList.remove("d-none");
      });
    } catch {
      containerConteudo.innerHTML = `<div class="nz-painel">${vazio({
        icone: "alerta",
        titulo: "Não foi possível carregar o caixa",
        texto: "Verifique a ligação ao servidor e tente novamente.",
        variante: "erro",
        accoes: `<button type="button" class="nz-botao nz-botao--secundario" data-accao="tentar">${icone("actualizar")}Tentar novamente</button>`,
      })}</div>`;
      containerConteudo.querySelector('[data-accao="tentar"]')?.addEventListener("click", () => void atualizarVisualizacao());
    }
  }

  await atualizarVisualizacao();
}
