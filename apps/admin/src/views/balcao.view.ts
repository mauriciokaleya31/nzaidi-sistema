import { api, ApiError, type ClienteItem, type TaxaItem, type CaixaAtivoResposta } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { arredondarMontante, decimal, VALIDADE_COTACAO_SEGUNDOS, type MoedaDivisa } from "@nzaidi/dominio";
import { aCarregar, botaoFecharModal, cabecalhoPagina, estadoCaixa, icone, moeda, NOMES_MOEDA, vazio } from "../ui/componentes.js";
import { esc, formatarDataHora, formatarMontante, formatarTaxa } from "../ui/formatar.js";

export async function renderizarBalcao(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) return;

  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: "Balcão de câmbios",
      descricao: "Compra e venda de divisas ao balcão, com cotação válida por 90 segundos e borderô emitido no momento.",
      accoes: `<a href="#caixa" class="nz-botao nz-botao--secundario">${icone("caixa")}Gestão de caixa</a>`,
    })}

    <div id="alerta-balcao" class="nz-alerta d-none"></div>

    <div id="balcao-verificacao-caixa">
      <div class="nz-painel">${aCarregar(6, "A verificar o caixa do operador")}</div>
    </div>

    <!-- Modal Borderô de Câmbio Emitido -->
    <div id="modal-bordero" class="nz-modal nz-modal--largo d-none" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-bordero">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho nz-sem-impressao">
          <div>
            <h2 class="nz-modal__titulo" id="titulo-modal-bordero">Operação confirmada</h2>
            <p class="nz-modal__descricao">O borderô foi emitido e registado na pista de auditoria.</p>
          </div>
          ${botaoFecharModal("btn-fechar-modal-bordero")}
        </div>
        <div class="nz-modal__corpo" id="bordero-impresso-conteudo">
          <!-- Conteúdo formal formatado para impressão -->
        </div>
        <div class="nz-modal__rodape nz-sem-impressao">
          <button type="button" id="btn-concluir-bordero" class="nz-botao nz-botao--secundario">Nova operação</button>
          <button type="button" id="btn-imprimir-bordero" class="nz-botao nz-botao--primario">
            ${icone("imprimir")}Imprimir borderô
          </button>
        </div>
      </div>
    </div>
  `;

  const containerCaixa = container.querySelector<HTMLDivElement>("#balcao-verificacao-caixa");
  const modalBordero = container.querySelector<HTMLDivElement>("#modal-bordero");
  const conteudoBordero = container.querySelector<HTMLDivElement>("#bordero-impresso-conteudo");

  // 1. Verificar Caixa Ativo do Operador
  let dadosCaixa: CaixaAtivoResposta | null;
  let clientes: ClienteItem[];
  let taxas: TaxaItem[];
  try {
    dadosCaixa = await api.obterCaixaAtivo();
    if (!dadosCaixa || !dadosCaixa.caixa) {
      if (containerCaixa) {
        containerCaixa.innerHTML = `
          <div class="nz-painel">
            ${vazio({
              icone: "caixa",
              titulo: "Não tem um caixa aberto",
              texto: "Para comprar ou vender divisas ao balcão é obrigatório abrir o caixa com os fundos iniciais em kwanzas e em divisas entregues pela tesouraria.",
              accoes: `<a href="#caixa" class="nz-botao nz-botao--primario">${icone("caixa")}Abrir caixa</a>`,
            })}
          </div>
        `;
      }
      return;
    }

    // 2. Carregar Clientes com KYC aprovado e Taxas do Dia
    [clientes, taxas] = await Promise.all([api.listarClientes("", "aprovado"), api.listarTaxas()]);
  } catch (err) {
    if (containerCaixa) {
      containerCaixa.innerHTML = `<div class="nz-painel">${vazio({
        icone: "alerta",
        titulo: "Balcão indisponível",
        texto: err instanceof ApiError ? esc(err.message) : "Não foi possível contactar o servidor. Verifique a ligação e tente novamente.",
        variante: "erro",
        accoes: `<a href="#balcao" class="nz-botao nz-botao--secundario" id="btn-tentar-balcao">${icone("actualizar")}Tentar novamente</a>`,
      })}</div>`;
      containerCaixa.querySelector("#btn-tentar-balcao")?.addEventListener("click", (e) => {
        e.preventDefault();
        void renderizarBalcao(container);
      });
    }
    return;
  }

  if (!containerCaixa) return;

  const moedasDisponiveis = taxas.length ? taxas.map((t) => t.moeda) : (["USD", "EUR"] as MoedaDivisa[]);

  containerCaixa.innerHTML = `
    <div class="balcao">
      <!-- Painel de Execução da Operação -->
      <section class="nz-painel balcao__ticket" aria-labelledby="titulo-nova-operacao">
        <div class="nz-painel__cabecalho">
          <h2 class="nz-painel__titulo" id="titulo-nova-operacao">Nova operação cambial</h2>
          <span class="balcao__caixa">${estadoCaixa(dadosCaixa.caixa.estado)}<span class="nz-mono">${esc(dadosCaixa.caixa.numeroCaixa)}</span></span>
        </div>
        <form id="form-operacao-balcao" class="nz-painel__corpo nz-formulario" novalidate>
          <div id="erro-operacao" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

          <div class="balcao__passo">
            <span class="balcao__numero" aria-hidden="true">1</span>
            <div class="nz-campo">
              <label class="nz-campo__rotulo" for="op-cliente">Cliente com KYC aprovado</label>
              <select id="op-cliente" class="nz-seletor" required>
                <option value="">Seleccione o cliente…</option>
                ${clientes
                  .map(
                    (c) => `
                  <option value="${esc(c.id)}">${esc(c.nome)} · ${esc(c.tipoDocumento.toUpperCase())} ${esc(c.numeroDocumento)}</option>
                `
                  )
                  .join("")}
              </select>
              ${
                clientes.length === 0
                  ? `<span class="nz-campo__erro">Não há clientes com KYC aprovado. <a href="#clientes">Registar ou aprovar um cliente</a>.</span>`
                  : `<span class="nz-campo__ajuda">Só aparecem clientes com a diligência KYC aprovada.</span>`
              }
            </div>
          </div>

          <div class="balcao__passo">
            <span class="balcao__numero" aria-hidden="true">2</span>
            <div class="nz-formulario">
              <div class="nz-campo">
                <span class="nz-campo__rotulo" id="rotulo-op-tipo">Tipo de operação</span>
                <div class="nz-segmentado nz-segmentado--bloco" role="radiogroup" aria-labelledby="rotulo-op-tipo" data-controla="op-tipo">
                  <button type="button" class="nz-segmentado__opcao" role="radio" data-valor="compra" aria-checked="true">${icone("entrada", "nz-icone--sm")}Compra</button>
                  <button type="button" class="nz-segmentado__opcao" role="radio" data-valor="venda" aria-checked="false">${icone("saida", "nz-icone--sm")}Venda</button>
                </div>
                <select id="op-tipo" class="nz-visualmente-oculto" tabindex="-1" aria-hidden="true">
                  <option value="compra">Compra de divisa</option>
                  <option value="venda">Venda de divisa</option>
                </select>
                <span class="nz-campo__ajuda" id="ajuda-op-tipo">O cliente entrega divisa e recebe kwanzas.</span>
              </div>

              <div class="nz-grelha-campos">
                <div class="nz-campo">
                  <span class="nz-campo__rotulo" id="rotulo-op-moeda">Moeda</span>
                  <div class="nz-segmentado nz-segmentado--bloco" role="radiogroup" aria-labelledby="rotulo-op-moeda" data-controla="op-moeda">
                    ${moedasDisponiveis
                      .map((m, i) => `<button type="button" class="nz-segmentado__opcao" role="radio" data-valor="${esc(m)}" aria-checked="${i === 0}">${esc(m)}</button>`)
                      .join("")}
                  </div>
                  <select id="op-moeda" class="nz-visualmente-oculto" tabindex="-1" aria-hidden="true">
                    ${moedasDisponiveis.map((m) => `<option value="${esc(m)}">${esc(NOMES_MOEDA[m] ?? m)} (${esc(m)})</option>`).join("")}
                  </select>
                </div>

                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="op-montante">Montante em divisa</label>
                  <div class="nz-entrada-grupo">
                    <input type="text" id="op-montante" class="nz-entrada nz-entrada--numero balcao__montante" value="100.00" inputmode="decimal" autocomplete="off" required />
                    <span class="nz-entrada-grupo__sufixo" id="op-montante-sufixo">${esc(moedasDisponiveis[0] ?? "")}</span>
                  </div>
                  <span class="nz-campo__ajuda">Use ponto para as casas decimais (ex.: 150.00).</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Resumo e Cálculo Seguro em Tempo Real -->
          <div class="balcao__resumo simulador-resumo-box" aria-live="polite">
            <div class="balcao__resumo-topo">
              <span class="nz-rotulo">Cotação</span>
              <button type="button" id="sim-timer-texto" class="nz-estado nz-estado--info nz-estado--pulsar balcao__temporizador" title="Renovar cotação">${VALIDADE_COTACAO_SEGUNDOS}s restantes</button>
            </div>
            <div class="nz-progresso" aria-hidden="true"><div class="nz-progresso__barra" id="sim-timer-barra" style="width: 100%"></div></div>
            <dl class="nz-descricao">
              <div><dt>Taxa de balcão aplicada</dt><dd id="sim-taxa-texto" class="nz-valor">—</dd></div>
              <div><dt id="sim-entrega-rotulo">Cliente entrega</dt><dd id="sim-entrega-texto" class="nz-valor">—</dd></div>
              <div class="nz-descricao__total"><dt id="sim-recebe-rotulo">Total em kwanzas</dt><dd id="sim-total-texto" class="nz-valor">—</dd></div>
            </dl>
            <p class="balcao__nota">${icone("info", "nz-icone--sm")}Pré-visualização. O servidor recalcula e valida a taxa no momento da confirmação.</p>
          </div>

          <button type="submit" id="btn-submeter-operacao" class="nz-botao nz-botao--primario nz-botao--lg nz-botao--bloco">
            ${icone("visto")}Confirmar operação e emitir borderô
          </button>
        </form>
      </section>

      <!-- Saldos em Caixa & Cotações do Momento -->
      <aside class="balcao__lateral">
        <section class="nz-painel">
          <div class="nz-painel__cabecalho">
            <h2 class="nz-painel__titulo">Disponível no caixa</h2>
            <a href="#caixa" class="nz-botao nz-botao--fantasma nz-botao--sm">Detalhe ${icone("seta-direita")}</a>
          </div>
          <ul class="nz-lista balcao__saldos">
            ${(["AOA", "USD", "EUR"] as const)
              .map(
                (m) => `
              <li class="nz-lista__item">
                ${moeda(m)}
                <span class="nz-lista__conteudo nz-lista__subtitulo">${NOMES_MOEDA[m]}</span>
                <strong class="nz-valor">${formatarMontante(m, dadosCaixa.saldos[m].saldoEsperado)}</strong>
              </li>`
              )
              .join("")}
          </ul>
        </section>

        <section class="nz-painel">
          <div class="nz-painel__cabecalho">
            <h2 class="nz-painel__titulo">Tabela de balcão do dia</h2>
          </div>
          <table class="nz-tabela">
            <thead>
              <tr>
                <th>Moeda</th>
                <th class="nz-tabela__direita">Compra</th>
                <th class="nz-tabela__direita">Venda</th>
              </tr>
            </thead>
            <tbody>
              ${taxas
                .map(
                  (t) => `
                <tr>
                  <td>${moeda(t.moeda)}</td>
                  <td class="nz-valor">${formatarTaxa(t.compra)}</td>
                  <td class="nz-valor">${formatarTaxa(t.venda)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          ${
            taxas.some((t) => t.fonte !== "oficial")
              ? `<div class="nz-painel__corpo"><p class="nz-aviso-demo">${icone("alerta", "nz-icone--sm")}Taxas de demonstração, não oficiais.</p></div>`
              : ""
          }
        </section>
      </aside>
    </div>
  `;

  // Elementos do formulário e simulação
  const formOp = containerCaixa.querySelector<HTMLFormElement>("#form-operacao-balcao");
  const selectCliente = containerCaixa.querySelector<HTMLSelectElement>("#op-cliente");
  const selectTipo = containerCaixa.querySelector<HTMLSelectElement>("#op-tipo");
  const selectMoeda = containerCaixa.querySelector<HTMLSelectElement>("#op-moeda");
  const inputMontante = containerCaixa.querySelector<HTMLInputElement>("#op-montante");
  const simTaxa = containerCaixa.querySelector<HTMLElement>("#sim-taxa-texto");
  const simTotal = containerCaixa.querySelector<HTMLElement>("#sim-total-texto");
  const simTimer = containerCaixa.querySelector<HTMLElement>("#sim-timer-texto");
  const simBarra = containerCaixa.querySelector<HTMLElement>("#sim-timer-barra");
  const simEntrega = containerCaixa.querySelector<HTMLElement>("#sim-entrega-texto");
  const simEntregaRotulo = containerCaixa.querySelector<HTMLElement>("#sim-entrega-rotulo");
  const simRecebeRotulo = containerCaixa.querySelector<HTMLElement>("#sim-recebe-rotulo");
  const ajudaTipo = containerCaixa.querySelector<HTMLElement>("#ajuda-op-tipo");
  const sufixoMontante = containerCaixa.querySelector<HTMLElement>("#op-montante-sufixo");
  const erroDiv = containerCaixa.querySelector<HTMLDivElement>("#erro-operacao");
  const btnSubmeter = containerCaixa.querySelector<HTMLButtonElement>("#btn-submeter-operacao");

  // Controlos segmentados: espelham a escolha nas listas ocultas que o formulário lê
  containerCaixa.querySelectorAll<HTMLElement>(".nz-segmentado[data-controla]").forEach((grupo) => {
    const alvo = containerCaixa.querySelector<HTMLSelectElement>(`#${grupo.dataset.controla}`);
    const opcoes = Array.from(grupo.querySelectorAll<HTMLButtonElement>(".nz-segmentado__opcao"));
    opcoes.forEach((opcao, indice) => {
      opcao.tabIndex = opcao.getAttribute("aria-checked") === "true" ? 0 : -1;
      opcao.addEventListener("click", () => {
        opcoes.forEach((o) => {
          const activa = o === opcao;
          o.setAttribute("aria-checked", String(activa));
          o.tabIndex = activa ? 0 : -1;
        });
        if (alvo && alvo.value !== opcao.dataset.valor) {
          alvo.value = opcao.dataset.valor ?? "";
          alvo.dispatchEvent(new Event("change"));
        }
      });
      opcao.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const proxima = opcoes[(indice + (e.key === "ArrowRight" ? 1 : -1) + opcoes.length) % opcoes.length];
        proxima?.focus();
        proxima?.click();
      });
    });
  });

  let cotacaoCriadaEm = new Date().toISOString();
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let segundosRestantes = VALIDADE_COTACAO_SEGUNDOS;

  function desenharTemporizador(): void {
    if (simBarra) {
      simBarra.style.width = `${Math.max(0, (segundosRestantes / VALIDADE_COTACAO_SEGUNDOS) * 100)}%`;
      simBarra.style.backgroundColor = segundosRestantes <= 15 ? "var(--cor-erro)" : "";
    }
    if (!simTimer) return;
    if (segundosRestantes > 0) {
      simTimer.textContent = `${segundosRestantes}s restantes`;
      simTimer.className = `nz-estado ${segundosRestantes <= 15 ? "nz-estado--erro" : "nz-estado--info"} nz-estado--pulsar balcao__temporizador`;
    } else {
      simTimer.textContent = "Expirada · renovar cotação";
      simTimer.className = "nz-estado nz-estado--erro balcao__temporizador balcao__temporizador--expirado";
    }
  }

  function iniciarTimerCotacao(): void {
    if (timerInterval) clearInterval(timerInterval);
    segundosRestantes = VALIDADE_COTACAO_SEGUNDOS;
    cotacaoCriadaEm = new Date().toISOString();
    desenharTemporizador();

    timerInterval = setInterval(() => {
      // A vista foi substituída (mudança de página): parar o relógio
      if (!simTimer?.isConnected) {
        if (timerInterval) clearInterval(timerInterval);
        return;
      }
      segundosRestantes--;
      desenharTemporizador();
      if (segundosRestantes <= 0) {
        if (btnSubmeter) btnSubmeter.disabled = true;
        if (timerInterval) clearInterval(timerInterval);
      }
    }, 1000);
  }

  function recalcularSimulacao(): void {
    const moedaSel = (selectMoeda?.value || "USD") as MoedaDivisa;
    const tipo = selectTipo?.value || "compra";
    const taxaItem = taxas.find((t) => t.moeda === moedaSel);

    if (sufixoMontante) sufixoMontante.textContent = moedaSel;
    if (ajudaTipo) {
      ajudaTipo.textContent =
        tipo === "compra" ? "O cliente entrega divisa e recebe kwanzas." : "O cliente paga em kwanzas e recebe divisa.";
    }
    if (simEntregaRotulo) simEntregaRotulo.textContent = tipo === "compra" ? "Cliente entrega" : "Cliente recebe";
    if (simRecebeRotulo) simRecebeRotulo.textContent = tipo === "compra" ? "Cliente recebe em kwanzas" : "Cliente paga em kwanzas";

    // Pré-visualização em decimal exacto; o valor que conta é o calculado pelo servidor
    let montante: ReturnType<typeof decimal> | null;
    try {
      montante = decimal((inputMontante?.value || "").trim());
    } catch {
      montante = null;
    }

    if (!taxaItem || !montante || montante.lessThanOrEqualTo(0)) {
      if (simTaxa) simTaxa.textContent = taxaItem ? `${formatarTaxa(tipo === "compra" ? taxaItem.compra : taxaItem.venda)} Kz` : "—";
      if (simEntrega) simEntrega.textContent = "—";
      if (simTotal) simTotal.textContent = "—";
      inputMontante?.setAttribute("aria-invalid", inputMontante.value.trim() ? "true" : "false");
      return;
    }
    inputMontante?.removeAttribute("aria-invalid");

    const taxa = tipo === "compra" ? taxaItem.compra : taxaItem.venda;
    const total = arredondarMontante(montante.times(decimal(taxa)));

    if (simTaxa) simTaxa.textContent = `${formatarTaxa(taxa)} Kz`;
    if (simEntrega) simEntrega.textContent = formatarMontante(moedaSel, montante.toFixed(2));
    if (simTotal) simTotal.textContent = formatarMontante("AOA", total.toFixed(2));

    if (btnSubmeter) btnSubmeter.disabled = false;
    iniciarTimerCotacao();
  }

  selectTipo?.addEventListener("change", recalcularSimulacao);
  selectMoeda?.addEventListener("change", recalcularSimulacao);
  inputMontante?.addEventListener("input", recalcularSimulacao);
  simTimer?.addEventListener("click", recalcularSimulacao);

  recalcularSimulacao();

  // Submissão da operação cambial
  formOp?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectCliente?.value) {
      selectCliente?.setAttribute("aria-invalid", "true");
      selectCliente?.focus();
      if (erroDiv) {
        erroDiv.textContent = "Seleccione o cliente antes de confirmar a operação.";
        erroDiv.classList.remove("d-none");
      }
      return;
    }
    if (!selectTipo || !selectMoeda || !inputMontante) return;
    selectCliente.removeAttribute("aria-invalid");

    erroDiv?.classList.add("d-none");
    if (btnSubmeter) {
      btnSubmeter.disabled = true;
      btnSubmeter.setAttribute("aria-busy", "true");
    }

    // Chave de idempotência única no cliente
    const chaveIdempotencia = `idem_${crypto.randomUUID()}`;

    try {
      const res = await api.criarOperacao({
        chaveIdempotencia,
        clienteId: selectCliente.value,
        tipo: selectTipo.value as any,
        moedaDivisa: selectMoeda.value as any,
        montanteDivisa: inputMontante.value,
        cotacaoCriadaEm,
      });

      if (timerInterval) clearInterval(timerInterval);

      // Exibir Borderô no Modal
      if (conteudoBordero) {
        const b = res.bordero;
        conteudoBordero.innerHTML = `
          <article class="bordero bordero-box" aria-label="Borderô de câmbio">
            <header class="bordero__cabecalho">
              <div class="bordero__marca">
                <img src="/simbolo.png" alt="" width="36" height="36" />
                <div>
                  <strong>NZAIDI, Casa de Câmbios &amp; Transferência, Lda.</strong>
                  <span>Instituição financeira não bancária sujeita à supervisão do BNA</span>
                </div>
              </div>
              <div class="bordero__numero">
                <span class="nz-rotulo">Borderô de câmbio</span>
                <strong class="nz-mono">${esc(b.numeroBordero)}</strong>
              </div>
            </header>

            <section class="bordero__seccao">
              <h3 class="nz-rotulo">Cliente</h3>
              <dl class="nz-descricao">
                <div><dt>Nome</dt><dd>${esc(b.clienteNome)}</dd></div>
                <div><dt>Documento</dt><dd>${esc(b.clienteDocumento)}</dd></div>
                <div><dt>NIF</dt><dd>${esc(b.clienteNif)}</dd></div>
              </dl>
            </section>

            <section class="bordero__seccao">
              <h3 class="nz-rotulo">Operação</h3>
              <dl class="nz-descricao">
                <div><dt>Tipo</dt><dd>${b.tipoOperacao === "compra" ? "Compra de divisa" : "Venda de divisa"}</dd></div>
                <div><dt>Montante em divisa</dt><dd class="nz-valor">${formatarMontante(b.moedaDivisa, b.montanteDivisa)}</dd></div>
                <div><dt>Taxa de câmbio</dt><dd class="nz-valor">${formatarTaxa(b.taxaCambio)} Kz</dd></div>
                <div class="nz-descricao__total"><dt>Total liquidado</dt><dd class="nz-valor">${formatarMontante("AOA", b.totalAoa)}</dd></div>
              </dl>
            </section>

            <footer class="bordero__rodape">
              <div><span class="nz-rotulo">Operador</span>${esc(b.operadorNome)}</div>
              <div><span class="nz-rotulo">Emitido em</span>${formatarDataHora(b.emitidoEm)}</div>
              <div class="bordero__hash"><span class="nz-rotulo">Verificação (SHA-256)</span><code>${esc(b.hashVerificacao)}</code></div>
            </footer>
          </article>
        `;
      }

      modalBordero?.classList.remove("d-none");
    } catch (err) {
      if (erroDiv) {
        erroDiv.textContent = err instanceof ApiError ? err.message : "Não foi possível concluir a operação. Nada foi registado; tente novamente.";
        erroDiv.classList.remove("d-none");
      }
      if (btnSubmeter) btnSubmeter.disabled = false;
    } finally {
      btnSubmeter?.removeAttribute("aria-busy");
    }
  });

  // Modal Borderô botões
  container.querySelector("#btn-fechar-modal-bordero")?.addEventListener("click", () => {
    modalBordero?.classList.add("d-none");
    void renderizarBalcao(container);
  });
  container.querySelector("#btn-concluir-bordero")?.addEventListener("click", () => {
    modalBordero?.classList.add("d-none");
    void renderizarBalcao(container);
  });
  container.querySelector("#btn-imprimir-bordero")?.addEventListener("click", () => {
    window.print();
  });

}
