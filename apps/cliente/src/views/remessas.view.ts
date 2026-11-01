import { api, type TaxaItem, type PedidoRemessa, type BeneficiarioGuardado } from "../api.js";
import { icone } from "../components/icones.js";
import { TEXTOS, obterRotuloEstadoRemessa } from "../textos/pt-AO.js";
import { formatarMontante, formatarTaxa, formatarDataHora } from "../formatadores/moeda.js";
import { renderizarM2Assistente } from "../modelos/M2_Assistente.js";
import { renderizarM3Detalhe } from "../modelos/M3_Detalhe.js";

export function renderRemessasView(container: HTMLElement, subRota: string = ""): void {
  let taxas: TaxaItem[] = [];
  let remessas: PedidoRemessa[] = [];
  let beneficiarios: BeneficiarioGuardado[] = [];
  let carregando = true;

  // Estado da Lista
  let filtroTexto = "";
  let filtroEstado = "todos";

  // Estado da Nova Remessa (4 Passos)
  let passoAtual = 1;
  let moedaDestino: "EUR" | "USD" = "EUR";
  let montanteDivisa = "500.00";
  let beneficiarioNome = "";
  let beneficiarioPais = "Portugal";
  let beneficiarioBanco = "";
  let beneficiarioIban = "";
  let beneficiarioSwift = "";
  let finalidade = "Apoio familiar directo a parentes";
  let metodoPagamento = "mcx";
  let salvarBeneficiario = true;
  let aSubmeter = false;
  let remessaCriadaSucesso: PedidoRemessa | null = null;

  async function carregarDados() {
    try {
      carregando = true;
      const [listaTaxas, listaRemessas] = await Promise.all([
        api.obterTaxas(),
        api.listarPedidosRemessas(),
      ]);
      taxas = listaTaxas;
      remessas = listaRemessas;
      beneficiarios = api.listarBeneficiarios();
    } catch (e) {
      console.error("Erro ao carregar dados de remessas:", e);
    } finally {
      carregando = false;
      render();
    }
  }

  function calcularCustos() {
    const item = taxas.find((t) => t.moeda === moedaDestino);
    const taxa = item ? parseFloat(item.venda) || 0 : 0;
    const montante = parseFloat(montanteDivisa) || 0;
    const contravalor = montante * taxa;
    const comissao = Math.max(contravalor * 0.02, 2500);
    const totalAoa = contravalor + comissao;
    return { taxa, contravalor, comissao, totalAoa };
  }

  function render() {
    if (subRota === "beneficiarios") {
      renderBeneficiarios();
      return;
    }

    if (subRota && subRota !== "nova") {
      renderDetalhe(subRota);
      return;
    }

    if (subRota === "nova") {
      renderNovaAssistente();
      return;
    }

    renderLista();
  }

  function renderLista() {
    const filtradas = remessas.filter((r) => {
      const bateTexto =
        !filtroTexto ||
        r.id.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        r.beneficiarioNome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        r.beneficiarioPais.toLowerCase().includes(filtroTexto.toLowerCase());
      const bateEstado = filtroEstado === "todos" || r.estado === filtroEstado;
      return bateTexto && bateEstado;
    });

    container.innerHTML = `
      <div class="m1-lista-container">
        <div class="m1-header">
          <div>
            <h1 class="m1-title">Remessas Internacionais</h1>
            <p class="m1-subtitle">Envie fundos para o exterior com rastreabilidade, rapidez e supervisão cambial.</p>
          </div>
          <div class="header-actions-row">
            <a href="#/remessas/beneficiarios" class="btn btn-secondary">
              ${icone("conta", 16)} <span>Beneficiários</span>
            </a>
            <a href="#/remessas/nova" class="btn btn-primary">
              ${icone("remessas", 18)} <span>${TEXTOS.botoes.enviarRemessa}</span>
            </a>
          </div>
        </div>

        <div class="m1-toolbar">
          <div class="m1-search-box">
            <span class="m1-search-icon">${icone("pesquisar", 18)}</span>
            <input
              type="text"
              id="input-pesquisa-remessa"
              class="m1-search-input"
              placeholder="Pesquisar por beneficiário, país ou referência..."
              value="${filtroTexto}"
            />
          </div>

          <div class="m1-filters-row">
            <div class="m1-filter-group">
              <label for="filtro-estado-remessa">Estado da Remessa</label>
              <select id="filtro-estado-remessa" class="m1-filter-select">
                <option value="todos" ${filtroEstado === "todos" ? "selected" : ""}>Todos os estados</option>
                <option value="pendente_revisao" ${filtroEstado === "pendente_revisao" ? "selected" : ""}>Aguarda pagamento</option>
                <option value="em_processamento" ${filtroEstado === "em_processamento" ? "selected" : ""}>Em análise</option>
                <option value="executada" ${filtroEstado === "executada" ? "selected" : ""}>Enviada</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card m1-table-card">
          ${
            filtradas.length === 0
              ? `
            <div class="m1-empty-state">
              <div class="m1-empty-icon">${icone("remessas", 32)}</div>
              <p class="m1-empty-text">${TEXTOS.vazios.semRemessa}</p>
              <a href="#/remessas/nova" class="btn btn-primary mt-medium">
                ${TEXTOS.botoes.enviarRemessa}
              </a>
            </div>
          `
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Ref. Remessa</th>
                    <th>Beneficiário</th>
                    <th>País & Banco</th>
                    <th>Montante</th>
                    <th>Total em Kwanzas</th>
                    <th>Data</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtradas
                    .map(
                      (r) => `
                    <tr>
                      <td><code>${r.id}</code></td>
                      <td><strong>${r.beneficiarioNome}</strong></td>
                      <td>${r.beneficiarioPais} • ${r.beneficiarioBanco}</td>
                      <td><strong>${formatarMontante(r.montanteDivisa, r.moedaDestino)}</strong></td>
                      <td>${formatarMontante(r.totalAoa, "AOA")}</td>
                      <td>${formatarDataHora(r.criadoEm)}</td>
                      <td><span class="badge badge-${r.estado}">${obterRotuloEstadoRemessa(r.estado)}</span></td>
                      <td>
                        <a href="#/remessas/${r.id}" class="btn btn-secondary btn-sm">
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
            <div class="m1-pagination-footer">
              <span>Total: <strong>${filtradas.length}</strong> registo(s)</span>
            </div>
          `
          }
        </div>
      </div>
    `;

    container.querySelector("#input-pesquisa-remessa")?.addEventListener("input", (e) => {
      filtroTexto = (e.target as HTMLInputElement).value;
      render();
    });

    container.querySelector("#filtro-estado-remessa")?.addEventListener("change", (e) => {
      filtroEstado = (e.target as HTMLSelectElement).value;
      render();
    });
  }

  function renderNovaAssistente() {
    const { taxa, contravalor, comissao, totalAoa } = calcularCustos();

    const passos = [
      { numero: 1, rotulo: "Destino e valor" },
      { numero: 2, rotulo: "Beneficiário" },
      { numero: 3, rotulo: "Pagamento" },
      { numero: 4, rotulo: "Confirmação" },
    ];

    let conteudoHtml = "";
    if (passoAtual === 1) {
      conteudoHtml = `
        <div class="stepper-step-body">
          <h2 class="card-title-md">Destino e Montante da Remessa</h2>
          <p class="text-suave mb-medium">Defina a divisa pretendida para o envio e o valor correspondente.</p>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="select-moeda-remessa">Moeda de Destino</label>
              <select id="select-moeda-remessa" class="form-select">
                <option value="EUR" ${moedaDestino === "EUR" ? "selected" : ""}>EUR — Euro (Europa / Portugal / Espanha)</option>
                <option value="USD" ${moedaDestino === "USD" ? "selected" : ""}>USD — Dólar Americano (EUA / Internacional)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="input-montante-remessa">Montante a Enviar</label>
              <input type="number" id="input-montante-remessa" class="form-input" min="20" step="10" value="${montanteDivisa}" required />
            </div>
          </div>

          <div class="form-group mt-medium">
            <label class="form-label" for="select-finalidade-remessa">Finalidade Regulamentar</label>
            <select id="select-finalidade-remessa" class="form-select">
              <option value="Apoio familiar directo a parentes">Apoio familiar directo a parentes</option>
              <option value="Pagamento de propinas / estudos universitários">Pagamento de propinas / estudos universitários</option>
              <option value="Despesas médicas e tratamentos de saúde">Despesas médicas e tratamentos de saúde</option>
              <option value="Prestação de serviços / honorários profissionais">Prestação de serviços / honorários profissionais</option>
              <option value="Outras operações legalmente autorizadas">Outras operações legalmente autorizadas</option>
            </select>
          </div>
        </div>
      `;
    } else if (passoAtual === 2) {
      conteudoHtml = `
        <div class="stepper-step-body">
          <div class="card-header-clean">
            <div>
              <h2 class="card-title-md">Dados do Beneficiário</h2>
              <p class="text-suave">Indique a conta de destino no exterior para crédito dos fundos.</p>
            </div>
            ${
              beneficiarios.length > 0
                ? `
              <div class="dropdown-quick-pick">
                <select id="select-beneficiario-guardado" class="form-select-sm">
                  <option value="">Escolher guardado...</option>
                  ${beneficiarios.map((b) => `<option value="${b.id}">${b.nome} (${b.pais})</option>`).join("")}
                </select>
              </div>
            `
                : ""
            }
          </div>

          <div class="form-group mt-medium">
            <label class="form-label" for="input-ben-nome">Nome Completo do Beneficiário</label>
            <input type="text" id="input-ben-nome" class="form-input" placeholder="Nome exatamente como consta no banco" value="${beneficiarioNome}" required />
          </div>

          <div class="form-row mt-medium">
            <div class="form-group">
              <label class="form-label" for="select-ben-pais">País de Destino</label>
              <select id="select-ben-pais" class="form-select" required>
                <option value="Portugal" ${beneficiarioPais === "Portugal" ? "selected" : ""}>Portugal</option>
                <option value="Espanha" ${beneficiarioPais === "Espanha" ? "selected" : ""}>Espanha</option>
                <option value="França" ${beneficiarioPais === "França" ? "selected" : ""}>França</option>
                <option value="Reino Unido" ${beneficiarioPais === "Reino Unido" ? "selected" : ""}>Reino Unido</option>
                <option value="Estados Unidos" ${beneficiarioPais === "Estados Unidos" ? "selected" : ""}>Estados Unidos</option>
                <option value="Brasil" ${beneficiarioPais === "Brasil" ? "selected" : ""}>Brasil</option>
                <option value="África do Sul" ${beneficiarioPais === "África do Sul" ? "selected" : ""}>África do Sul</option>
                <option value="Outro País" ${beneficiarioPais === "Outro País" ? "selected" : ""}>Outro País</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="input-ben-banco">Banco de Destino</label>
              <input type="text" id="input-ben-banco" class="form-input" placeholder="Ex: Millennium BCP, Santander, etc." value="${beneficiarioBanco}" required />
            </div>
          </div>

          <div class="form-row mt-medium">
            <div class="form-group">
              <label class="form-label" for="input-ben-iban">IBAN / Conta Bancária Internacional</label>
              <input type="text" id="input-ben-iban" class="form-input" placeholder="Ex: PT500033..." value="${beneficiarioIban}" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="input-ben-swift">Código SWIFT / BIC (opcional)</label>
              <input type="text" id="input-ben-swift" class="form-input" placeholder="Ex: BCPOPTPL" value="${beneficiarioSwift}" />
            </div>
          </div>

          <div class="checkbox-option mt-medium">
            <label>
              <input type="checkbox" id="check-salvar-ben" ${salvarBeneficiario ? "checked" : ""} />
              <span>Guardar este beneficiário para envios futuros</span>
            </label>
          </div>
        </div>
      `;
    } else if (passoAtual === 3) {
      conteudoHtml = `
        <div class="stepper-step-body">
          <h2 class="card-title-md">Método de Liquidação da Remessa</h2>
          <p class="text-suave mb-medium">Indique como pretende proceder ao pagamento do contravalor em Kwanzas.</p>

          <div class="payment-methods-grid">
            <label class="payment-option ${metodoPagamento === "mcx" ? "selecionado" : ""}">
              <input type="radio" name="metodo-pag-rem" value="mcx" ${metodoPagamento === "mcx" ? "checked" : ""} />
              <div class="payment-option-content">
                <strong>Multicaixa Express</strong>
                <span>Liquidação direta e autorização instantânea</span>
              </div>
            </label>

            <label class="payment-option ${metodoPagamento === "ref" ? "selecionado" : ""}">
              <input type="radio" name="metodo-pag-rem" value="ref" ${metodoPagamento === "ref" ? "checked" : ""} />
              <div class="payment-option-content">
                <strong>Pagamento por Referência</strong>
                <span>Entidade e referência para liquidação multicaixa</span>
              </div>
            </label>

            <label class="payment-option ${metodoPagamento === "balcao" ? "selecionado" : ""}">
              <input type="radio" name="metodo-pag-rem" value="balcao" ${metodoPagamento === "balcao" ? "checked" : ""} />
              <div class="payment-option-content">
                <strong>Liquidação no Balcão NZAIDI</strong>
                <span>Pagamento presencial na agência autorizada</span>
              </div>
            </label>
          </div>
        </div>
      `;
    } else {
      conteudoHtml = `
        <div class="stepper-step-body">
          <h2 class="card-title-md">Confirmação da Remessa Internacional</h2>
          <p class="text-suave mb-medium">Verifique os dados da ordem de remessa antes da transmissão definitiva.</p>

          <div class="confirmation-review-box">
            <div class="review-row">
              <span>Beneficiário:</span>
              <strong>${beneficiarioNome}</strong>
            </div>
            <div class="review-row">
              <span>Destino:</span>
              <strong>${beneficiarioPais} • ${beneficiarioBanco}</strong>
            </div>
            <div class="review-row">
              <span>IBAN:</span>
              <code>${beneficiarioIban}</code>
            </div>
            <div class="review-row">
              <span>Montante a Entregar:</span>
              <strong>${formatarMontante(montanteDivisa, moedaDestino)}</strong>
            </div>
            <div class="review-row">
              <span>Taxa de Câmbio de Venda:</span>
              <strong>${formatarTaxa(taxa, 4)} AOA</strong>
            </div>
            <div class="review-row">
              <span>Comissão Operacional:</span>
              <strong>${formatarMontante(comissao, "AOA")}</strong>
            </div>
            <div class="review-row">
              <span>Total a Liquidar:</span>
              <strong class="text-huge">${formatarMontante(totalAoa, "AOA")}</strong>
            </div>
          </div>
        </div>
      `;
    }

    const resumoLateralHtml = `
      <div class="stepper-side-summary">
        <div class="summary-line">
          <span>Montante a Enviar:</span>
          <strong>${formatarMontante(montanteDivisa, moedaDestino)}</strong>
        </div>
        <div class="summary-line">
          <span>Contravalor Divisa:</span>
          <strong>${formatarMontante(contravalor, "AOA")}</strong>
        </div>
        <div class="summary-line">
          <span>Comissão NZAIDI:</span>
          <strong>${formatarMontante(comissao, "AOA")}</strong>
        </div>
        <hr class="summary-hr" />
        <div class="summary-total-line">
          <span>Total a Pagar:</span>
          <span class="summary-total-val">${formatarMontante(totalAoa, "AOA")}</span>
        </div>
      </div>
    `;

    container.innerHTML = renderizarM2Assistente({
      titulo: "Nova Remessa Internacional",
      passos,
      passoAtual,
      conteudoHtml,
      resumoHtml: resumoLateralHtml,
      podeVoltar: passoAtual > 1,
      podeContinuar: true,
      rotuloContinuar: passoAtual === 4 ? TEXTOS.botoes.confirmarPedido : TEXTOS.botoes.continuar,
      rotuloVoltar: TEXTOS.botoes.voltar,
      aCarregar: aSubmeter,
    });

    // Listeners do Assistente
    container.querySelector("#select-moeda-remessa")?.addEventListener("change", (e) => {
      moedaDestino = (e.target as HTMLSelectElement).value as any;
      render();
    });

    container.querySelector("#input-montante-remessa")?.addEventListener("input", (e) => {
      montanteDivisa = (e.target as HTMLInputElement).value;
    });

    container.querySelector("#select-beneficiario-guardado")?.addEventListener("change", (e) => {
      const id = (e.target as HTMLSelectElement).value;
      const b = beneficiarios.find((item) => item.id === id);
      if (b) {
        beneficiarioNome = b.nome;
        beneficiarioPais = b.pais;
        beneficiarioBanco = b.banco;
        beneficiarioIban = b.iban;
        beneficiarioSwift = b.swift || "";
        render();
      }
    });

    container.querySelector("#input-ben-nome")?.addEventListener("input", (e) => {
      beneficiarioNome = (e.target as HTMLInputElement).value;
    });

    container.querySelector("#select-ben-pais")?.addEventListener("change", (e) => {
      beneficiarioPais = (e.target as HTMLSelectElement).value;
    });

    container.querySelector("#input-ben-banco")?.addEventListener("input", (e) => {
      beneficiarioBanco = (e.target as HTMLInputElement).value;
    });

    container.querySelector("#input-ben-iban")?.addEventListener("input", (e) => {
      beneficiarioIban = (e.target as HTMLInputElement).value;
    });

    container.querySelector("#btn-m2-voltar")?.addEventListener("click", () => {
      if (passoAtual > 1) {
        passoAtual--;
        render();
      }
    });

    container.querySelector("#btn-m2-continuar")?.addEventListener("click", async () => {
      if (passoAtual === 1) {
        if (!montanteDivisa || parseFloat(montanteDivisa) < 20) {
          alert("O montante mínimo para remessa internacional é de 20 divisa.");
          return;
        }
        passoAtual = 2;
        render();
      } else if (passoAtual === 2) {
        if (!beneficiarioNome.trim() || !beneficiarioIban.trim() || !beneficiarioBanco.trim()) {
          alert("Por favor preencha todos os campos obrigatórios do beneficiário.");
          return;
        }
        if (salvarBeneficiario) {
          api.salvarBeneficiario({
            nome: beneficiarioNome,
            pais: beneficiarioPais,
            banco: beneficiarioBanco,
            iban: beneficiarioIban,
            swift: beneficiarioSwift,
          });
          beneficiarios = api.listarBeneficiarios();
        }
        passoAtual = 3;
        render();
      } else if (passoAtual === 3) {
        passoAtual = 4;
        render();
      } else if (passoAtual === 4) {
        try {
          aSubmeter = true;
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
            metodoPagamento,
          });
          alert(TEXTOS.sucessos.remessaCriada);
          window.location.hash = `#/remessas/${novo.id}`;
        } catch (err: any) {
          alert(err.message || TEXTOS.erros.generico);
        } finally {
          aSubmeter = false;
          render();
        }
      }
    });
  }

  async function renderDetalhe(id: string) {
    const remessa = remessas.find((r) => r.id === id) || (await api.obterPedidoRemessa(id));
    if (!remessa) {
      container.innerHTML = `
        <div class="m1-empty-state">
          <p>Remessa internacional não encontrada.</p>
          <a href="#/remessas" class="btn btn-secondary mt-small">${TEXTOS.botoes.voltar}</a>
        </div>
      `;
      return;
    }

    container.innerHTML = renderizarM3Detalhe({
      titulo: `Remessa para ${remessa.beneficiarioPais}`,
      subtitulo: `Referência ${remessa.id} • Submetida a ${formatarDataHora(remessa.criadoEm)}`,
      referencia: remessa.id,
      estadoBadgeHtml: `<span class="badge badge-${remessa.estado}">${obterRotuloEstadoRemessa(remessa.estado)}</span>`,
      linhaTemporal: [
        {
          titulo: "Ordem de Remessa Registada",
          descricao: "Apresentação e gravação da ordem nos servidores NZAIDI.",
          dataHora: formatarDataHora(remessa.criadoEm),
          estado: "concluido",
        },
        {
          titulo: "Revisão e Validação Cambial",
          descricao: "Verificação dos dados da conta bancária de destino e conformidade BNA.",
          estado: remessa.estado === "executada" || remessa.estado === "entregue" ? "concluido" : "atual",
        },
        {
          titulo: "Liquidação no Banco Correspondente",
          descricao: "Transferência executada para a conta do beneficiário.",
          estado: remessa.estado === "entregue" ? "concluido" : remessa.estado === "executada" ? "atual" : "pendente",
        },
      ],
      dadosPrincipais: [
        { rotulo: "Beneficiário", valor: remessa.beneficiarioNome, destaque: true },
        { rotulo: "País & Banco", valor: `${remessa.beneficiarioPais} • ${remessa.beneficiarioBanco}` },
        { rotulo: "IBAN", valor: remessa.beneficiarioIban, copiavel: true },
        { rotulo: "Montante a Entregar", valor: formatarMontante(remessa.montanteDivisa, remessa.moedaDestino), destaque: true },
        { rotulo: "Taxa de Venda", valor: `${formatarTaxa(remessa.taxaCambio, 4)} AOA` },
        { rotulo: "Finalidade", valor: remessa.finalidade },
      ],
      resumoValoresHtml: `
        <div class="summary-line">
          <span>Montante Divisa:</span>
          <strong>${formatarMontante(remessa.montanteDivisa, remessa.moedaDestino)}</strong>
        </div>
        <div class="summary-line">
          <span>Comissão de Serviço:</span>
          <strong>${formatarMontante(remessa.comissaoAoa, "AOA")}</strong>
        </div>
        <hr class="summary-hr" />
        <div class="summary-total-line">
          <span>Total Pago em Kwanzas:</span>
          <span class="summary-total-val">${formatarMontante(remessa.totalAoa, "AOA")}</span>
        </div>
      `,
      botaoVoltarRota: "/remessas",
      botaoComprovativo: {
        rotulo: TEXTOS.botoes.descarregarComprovativo,
        onClick: () => window.print(),
      },
    });

    container.querySelector("#btn-m3-comprovativo")?.addEventListener("click", () => {
      window.print();
    });
  }

  function renderBeneficiarios() {
    container.innerHTML = `
      <div class="m1-lista-container">
        <div class="m3-top-navigation">
          <a href="#/remessas" class="btn-link-voltar">
            ${icone("setaEsquerda", 16)} ${TEXTOS.botoes.voltar}
          </a>
        </div>

        <div class="m1-header">
          <div>
            <h1 class="m1-title">Beneficiários Guardados</h1>
            <p class="m1-subtitle">Gira as contas bancárias frequentes para envio de remessas sem redigitar dados.</p>
          </div>
        </div>

        <div class="card p-large mt-medium">
          <h2 class="card-title-md">Adicionar Novo Beneficiário</h2>
          <form id="form-add-ben" class="form-layout mt-small">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nome Completo</label>
                <input type="text" id="add-ben-nome" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">País</label>
                <select id="add-ben-pais" class="form-select">
                  <option value="Portugal">Portugal</option>
                  <option value="Espanha">Espanha</option>
                  <option value="França">França</option>
                  <option value="Reino Unido">Reino Unido</option>
                  <option value="Estados Unidos">Estados Unidos</option>
                  <option value="Brasil">Brasil</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Banco</label>
                <input type="text" id="add-ben-banco" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">IBAN</label>
                <input type="text" id="add-ben-iban" class="form-input" required />
              </div>
            </div>
            <button type="submit" class="btn btn-primary mt-small">
              ${icone("conta", 16)} Guardar Beneficiário
            </button>
          </form>
        </div>

        <div class="card mt-large">
          <div class="card-header-clean">
            <h2 class="card-title-md">Lista de Beneficiários</h2>
            <span class="activity-counter">${beneficiarios.length} guardado(s)</span>
          </div>

          ${
            beneficiarios.length === 0
              ? `
            <div class="m1-empty-state">
              <p>${TEXTOS.vazios.semBeneficiarios}</p>
            </div>
          `
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>País</th>
                    <th>Banco</th>
                    <th>IBAN</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${beneficiarios
                    .map(
                      (b) => `
                    <tr>
                      <td><strong>${b.nome}</strong></td>
                      <td>${b.pais}</td>
                      <td>${b.banco}</td>
                      <td><code>${b.iban}</code></td>
                      <td>
                        <button class="btn btn-secondary btn-sm btn-del-ben" data-id="${b.id}">
                          ${icone("fechar", 14)} Eliminar
                        </button>
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

    container.querySelector("#form-add-ben")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = (container.querySelector("#add-ben-nome") as HTMLInputElement).value;
      const pais = (container.querySelector("#add-ben-pais") as HTMLSelectElement).value;
      const banco = (container.querySelector("#add-ben-banco") as HTMLInputElement).value;
      const iban = (container.querySelector("#add-ben-iban") as HTMLInputElement).value;

      api.salvarBeneficiario({ nome, pais, banco, iban });
      beneficiarios = api.listarBeneficiarios();
      render();
    });

    container.querySelectorAll(".btn-del-ben").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (id && confirm("Deseja eliminar este beneficiário guardado?")) {
          api.excluirBeneficiario(id);
          beneficiarios = api.listarBeneficiarios();
          render();
        }
      });
    });
  }

  carregarDados();
}
