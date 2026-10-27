import { api, type ClienteItem, type OperacaoItem, type TaxaItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import {
  aCarregar,
  cabecalhoPagina,
  estadoCaixa,
  estadoKyc,
  estadoOperacao,
  fonteTaxa,
  icone,
  moeda,
  rotuloFuncao,
  tipoOperacao,
  vazio,
} from "../ui/componentes.js";
import { esc, formatarDataHora, formatarHora, formatarMontante, formatarTaxa, iniciais } from "../ui/formatar.js";
import { itensVisiveis } from "../ui/navegacao.js";

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 19) return "Boa tarde";
  return "Boa noite";
}

function erroSeccao(texto: string): string {
  return vazio({ icone: "alerta", titulo: "Informação indisponível", texto, variante: "erro" });
}

export async function renderizarDashboard(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  const podeBalcao = authState.temPermissao("operacoes:registar");
  const podeCaixa = authState.temPermissao("caixa:consultar");
  const podeOperacoes = authState.temPermissao("operacoes:consultar");
  const podeKyc = authState.temPermissao("kyc:analisar") || authState.temPermissao("kyc:aprovar");
  const primeiroNome = usuario.nome.split(/\s+/)[0] ?? usuario.nome;
  const hoje = new Date().toLocaleDateString("pt-AO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const atalhos = itensVisiveis().filter((i) => i.rota !== "#dashboard");

  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: `${saudacao()}, ${esc(primeiroNome)}`,
      descricao: `<span class="primeira-maiuscula">${esc(hoje)}</span> · ${esc(rotuloFuncao(usuario.funcao))}`,
      accoes: `
        ${authState.temPermissao("ver_taxas") ? `<a href="#taxas" class="nz-botao nz-botao--secundario">${icone("taxas")}Tabela de taxas</a>` : ""}
        ${podeBalcao ? `<a href="#balcao" class="nz-botao nz-botao--primario">${icone("mais")}Nova operação</a>` : ""}
      `,
    })}

    <div id="dash-aviso-demo"></div>

    <section class="nz-kpis dash-kpis" aria-label="Indicadores do dia">
      <div id="dash-taxas-container" class="dash-kpis__taxas">
        <div class="nz-kpi">${aCarregar(3, "A carregar cotações")}</div>
        <div class="nz-kpi">${aCarregar(3, "A carregar cotações")}</div>
      </div>
      ${podeCaixa ? `<div id="dash-caixa" class="nz-kpi">${aCarregar(3, "A carregar caixa")}</div>` : ""}
      ${podeKyc ? `<div id="dash-kyc-kpi" class="nz-kpi">${aCarregar(3, "A carregar fila KYC")}</div>` : ""}
    </section>

    <div class="dash-grelha">
      <div class="dash-grelha__principal">
        ${
          podeOperacoes
            ? `
          <section class="nz-painel">
            <div class="nz-painel__cabecalho">
              <div>
                <h2 class="nz-painel__titulo">Últimas operações</h2>
                <p class="nz-painel__subtitulo">Registos mais recentes do balcão, por ordem de entrada</p>
              </div>
              <a href="#operacoes" class="nz-botao nz-botao--fantasma nz-botao--sm">Ver diário ${icone("seta-direita")}</a>
            </div>
            <div id="dash-operacoes">${aCarregar(5, "A carregar operações")}</div>
          </section>`
            : ""
        }

        <section class="nz-painel">
          <div class="nz-painel__cabecalho">
            <div>
              <h2 class="nz-painel__titulo">Acesso rápido</h2>
              <p class="nz-painel__subtitulo">Áreas disponíveis para o seu perfil</p>
            </div>
          </div>
          <div class="atalhos">
            ${atalhos
              .map(
                (a) => `
              <a href="${a.rota}" class="atalho">
                <span class="atalho__icone">${icone(a.icone)}</span>
                <span class="atalho__texto">
                  <span class="atalho__titulo">${a.titulo}</span>
                  <span class="atalho__descricao">${a.descricao}</span>
                </span>
                ${icone("chevron-direita", "nz-icone--sm atalho__seta")}
              </a>`
              )
              .join("")}
          </div>
        </section>
      </div>

      <aside class="dash-grelha__lateral">
        ${
          podeKyc
            ? `
          <section class="nz-painel">
            <div class="nz-painel__cabecalho">
              <div>
                <h2 class="nz-painel__titulo">Fila de conformidade</h2>
                <p class="nz-painel__subtitulo">Clientes à espera de decisão KYC</p>
              </div>
              <a href="#clientes" class="nz-botao nz-botao--fantasma nz-botao--sm">Abrir ${icone("seta-direita")}</a>
            </div>
            <div id="dash-kyc">${aCarregar(4, "A carregar fila KYC")}</div>
          </section>`
            : ""
        }

        <section class="nz-painel dash-conformidade">
          <div class="nz-painel__corpo">
            <div class="dash-conformidade__titulo">${icone("auditoria")}<span>Registo regulatório</span></div>
            <p>Operações, consultas e alterações de taxas ficam registadas na pista de auditoria, com autor, hora e endereço de origem.</p>
            <div class="system-status-indicator" id="dash-estado-api">
              <span class="status-indicator-dot online" aria-hidden="true"></span>
              <span>Ligação ao servidor activa</span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  `;

  const avisoDemo = container.querySelector<HTMLDivElement>("#dash-aviso-demo");
  const estadoApi = container.querySelector<HTMLDivElement>("#dash-estado-api");

  function marcarApiIndisponivel(): void {
    if (estadoApi) {
      estadoApi.innerHTML = `<span class="status-indicator-dot" aria-hidden="true"></span><span>Sem resposta do servidor</span>`;
    }
  }

  // Cotações em vigor
  const carregarTaxas = (async () => {
    const containerTaxas = container.querySelector<HTMLDivElement>("#dash-taxas-container");
    if (!containerTaxas) return;
    try {
      const taxas: TaxaItem[] = await api.listarTaxas();
      if (!taxas || taxas.length === 0) {
        containerTaxas.innerHTML = `<div class="nz-kpi">${vazio({ icone: "taxas", titulo: "Sem taxas configuradas", texto: "A gestão ainda não publicou taxas de câmbio." })}</div>`;
        return;
      }
      if (taxas.some((t) => t.fonte !== "oficial") && avisoDemo) {
        avisoDemo.innerHTML = `<p class="nz-aviso-demo">${icone("alerta", "nz-icone--sm")}Há taxas em modo de demonstração. Não correspondem à fixação oficial do dia.</p>`;
      }
      containerTaxas.innerHTML = taxas
        .map(
          (t) => `
          <a href="#taxas" class="nz-kpi kpi-cotacao">
            <div class="nz-kpi__topo">
              <span class="nz-kpi__rotulo">${moeda(t.moeda)}Cotação</span>
              ${fonteTaxa(t.fonte)}
            </div>
            <div class="kpi-cotacao__valores">
              <div>
                <span class="nz-rotulo">Compra</span>
                <span class="kpi-cotacao__valor nz-valor">${formatarTaxa(t.compra)}</span>
              </div>
              <div>
                <span class="nz-rotulo">Venda</span>
                <span class="kpi-cotacao__valor nz-valor">${formatarTaxa(t.venda)}</span>
              </div>
            </div>
            <span class="nz-kpi__detalhe">Referência BNA ${formatarTaxa(t.referencia)} Kz · actualizada às ${formatarHora(t.atualizadoEm)}</span>
          </a>`
        )
        .join("");
    } catch {
      marcarApiIndisponivel();
      containerTaxas.innerHTML = `<div class="nz-kpi">${erroSeccao("Não foi possível obter as cotações em vigor.")}</div>`;
    }
  })();

  // Caixa do operador
  const carregarCaixa = (async () => {
    const alvo = container.querySelector<HTMLDivElement>("#dash-caixa");
    if (!alvo) return;
    try {
      const dados = await api.obterCaixaAtivo();
      if (!dados || !dados.caixa) {
        alvo.outerHTML = `
          <a href="#caixa" class="nz-kpi" id="dash-caixa">
            <div class="nz-kpi__topo"><span class="nz-kpi__rotulo">${icone("caixa")}O seu caixa</span>${estadoCaixa("fechado")}</div>
            <div class="nz-kpi__valor kpi-texto">Sem caixa aberto</div>
            <span class="nz-kpi__detalhe">Abra o caixa para registar operações ${icone("seta-direita", "nz-icone--sm em-linha")}</span>
          </a>`;
        return;
      }
      alvo.outerHTML = `
        <a href="#caixa" class="nz-kpi" id="dash-caixa">
          <div class="nz-kpi__topo"><span class="nz-kpi__rotulo">${icone("caixa")}O seu caixa</span>${estadoCaixa(dados.caixa.estado)}</div>
          <div class="nz-kpi__valor nz-valor">${formatarMontante("AOA", dados.saldos.AOA.saldoEsperado)}</div>
          <span class="nz-kpi__detalhe nz-valor">${formatarMontante("USD", dados.saldos.USD.saldoEsperado)} · ${formatarMontante("EUR", dados.saldos.EUR.saldoEsperado)}</span>
          <span class="nz-kpi__detalhe nz-mono">${esc(dados.caixa.numeroCaixa)}</span>
        </a>`;
    } catch {
      alvo.innerHTML = erroSeccao("Não foi possível consultar o estado do caixa.");
    }
  })();

  // Últimas operações
  const carregarOperacoes = (async () => {
    const alvo = container.querySelector<HTMLDivElement>("#dash-operacoes");
    if (!alvo) return;
    try {
      const operacoes: OperacaoItem[] = await api.listarOperacoes(6);
      if (!operacoes || operacoes.length === 0) {
        alvo.innerHTML = vazio({
          icone: "operacoes",
          titulo: "Ainda não há operações registadas",
          texto: "As operações confirmadas no balcão aparecem aqui assim que forem registadas.",
          accoes: podeBalcao ? `<a href="#balcao" class="nz-botao nz-botao--secundario">${icone("mais")}Registar operação</a>` : "",
        });
        return;
      }
      alvo.innerHTML = `
        <div class="nz-tabela-envoltorio">
          <table class="nz-tabela nz-tabela--cartoes">
            <thead>
              <tr>
                <th>Operação</th>
                <th>Tipo</th>
                <th class="nz-tabela__direita">Divisa</th>
                <th class="nz-tabela__direita">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${operacoes
                .map(
                  (o) => `
                <tr>
                  <td data-principal>
                    <span class="nz-tabela__principal nz-mono">${esc(o.numeroOperacao)}</span>
                    <span class="nz-tabela__secundario">${formatarDataHora(o.criadoEm)} · ${esc(o.operadorNome)}</span>
                  </td>
                  <td data-label="Tipo">${tipoOperacao(o.tipo)}</td>
                  <td data-label="Divisa" class="nz-valor">${formatarMontante(o.moedaDivisa, o.montanteDivisa)}</td>
                  <td data-label="Total" class="nz-valor nz-tabela__principal">${formatarMontante("AOA", o.montanteAoa)}</td>
                  <td data-label="Estado">${estadoOperacao(o.estado)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
    } catch {
      alvo.innerHTML = erroSeccao("Não foi possível carregar as operações recentes.");
    }
  })();

  // Fila de conformidade (KYC)
  const carregarKyc = (async () => {
    const alvo = container.querySelector<HTMLDivElement>("#dash-kyc");
    const kpi = container.querySelector<HTMLDivElement>("#dash-kyc-kpi");
    if (!alvo && !kpi) return;
    try {
      const [pendentes, emAnalise] = await Promise.all([api.listarClientes("", "pendente"), api.listarClientes("", "em_analise")]);
      const fila: ClienteItem[] = [...emAnalise, ...pendentes];
      const limite = fila.length >= 50;
      if (kpi) {
        kpi.outerHTML = `
          <a href="#clientes" class="nz-kpi" id="dash-kyc-kpi">
            <div class="nz-kpi__topo"><span class="nz-kpi__rotulo">${icone("clientes")}Fila KYC</span>${fila.length ? estadoKyc("pendente") : ""}</div>
            <div class="nz-kpi__valor nz-valor">${fila.length}${limite ? "+" : ""}<small>${fila.length === 1 ? "cliente" : "clientes"}</small></div>
            <span class="nz-kpi__detalhe">${emAnalise.length} em análise · ${pendentes.length}${pendentes.length >= 50 ? "+" : ""} pendentes</span>
          </a>`;
      }
      if (!alvo) return;
      if (fila.length === 0) {
        alvo.innerHTML = vazio({ icone: "sucesso", titulo: "Fila em dia", texto: "Não há clientes à espera de decisão de conformidade." });
        return;
      }
      alvo.innerHTML = `
        <ul class="nz-lista">
          ${fila
            .slice(0, 6)
            .map(
              (c) => `
            <li>
              <a class="nz-lista__item" href="#clientes">
                <span class="nz-avatar" aria-hidden="true">${esc(iniciais(c.nome))}</span>
                <span class="nz-lista__conteudo">
                  <span class="nz-lista__titulo">${esc(c.nome)}</span>
                  <span class="nz-lista__subtitulo">Registado ${formatarDataHora(c.criadoEm)}</span>
                </span>
                ${estadoKyc(c.estadoKyc)}
              </a>
            </li>`
            )
            .join("")}
        </ul>
        ${fila.length > 6 ? `<div class="nz-painel__rodape"><span>Mais ${fila.length - 6}${limite ? "+" : ""} na fila</span><a href="#clientes">Ver todos</a></div>` : ""}`;
    } catch {
      if (alvo) alvo.innerHTML = erroSeccao("Não foi possível carregar a fila de conformidade.");
      if (kpi) kpi.innerHTML = erroSeccao("Fila KYC indisponível.");
    }
  })();

  await Promise.all([carregarTaxas, carregarCaixa, carregarOperacoes, carregarKyc]);
}
