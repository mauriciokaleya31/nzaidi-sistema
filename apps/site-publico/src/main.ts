/**
 * NZAIDI — Controlador interativo do Website Público
 */
import "./estilo.css";
import { SimuladorCambio } from "./simulador.js";
import { type MoedaDivisa } from "@nzaidi/dominio";

document.addEventListener("DOMContentLoaded", () => {
  const simulador = new SimuladorCambio();

  // Elementos do DOM do Simulador
  const btnComprar = document.getElementById("tab-comprar") as HTMLButtonElement | null;
  const btnVender = document.getElementById("tab-vender") as HTMLButtonElement | null;
  const inputMontante = document.getElementById("input-montante") as HTMLInputElement | null;
  const seletorMoeda = document.getElementById("seletor-moeda") as HTMLSelectElement | null;
  const valorResultadoEl = document.getElementById("resultado-valor") as HTMLElement | null;
  const rotuloOperacaoEl = document.getElementById("rotulo-operacao") as HTMLElement | null;
  const taxaAplicadaEl = document.getElementById("taxa-aplicada") as HTMLElement | null;
  const tempoTimerEl = document.getElementById("tempo-timer") as HTMLElement | null;
  const badgeTimerEl = document.getElementById("badge-timer") as HTMLElement | null;
  const btnRecotar = document.getElementById("btn-recotar") as HTMLButtonElement | null;
  const msgErroEl = document.getElementById("simulador-erro") as HTMLElement | null;
  const cardTaxaUsdEl = document.getElementById("card-taxa-usd") as HTMLElement | null;
  const cardTaxaEurEl = document.getElementById("card-taxa-eur") as HTMLElement | null;

  // Renderizar Tabela de Taxas do Dia
  function atualizarTabelaTaxas() {
    const tabela = simulador.getTabelaCompleta();
    const usd = tabela.USD;
    const eur = tabela.EUR;

    if (cardTaxaUsdEl && usd) {
      cardTaxaUsdEl.innerHTML = `
        <div class="card-taxa-topo">
          <div class="card-taxa-moeda">
            <span class="bandeira-icone">${usd.bandeira}</span>
            <div class="moeda-info-texto">
              <h4>${usd.nome}</h4>
              <p>USD / AOA</p>
            </div>
          </div>
          <span class="badge badge-neutro">Hoje</span>
        </div>
        <div class="card-taxa-valores">
          <div class="valor-box">
            <div class="valor-box-rotulo">A NZAIDI Compra</div>
            <div class="valor-box-num">${usd.taxas.compra.toFixed(4)} Kz</div>
          </div>
          <div class="valor-box">
            <div class="valor-box-rotulo">A NZAIDI Vende</div>
            <div class="valor-box-num">${usd.taxas.venda.toFixed(4)} Kz</div>
          </div>
        </div>
        <div class="taxa-ref-nota">
          <span>Referência BNA: ${usd.taxas.referencia.toFixed(4)} Kz</span>
          <span>Margens: -${(Number(usd.parametro.margemCompra) * 100).toFixed(1)}% / +${(Number(usd.parametro.margemVenda) * 100).toFixed(1)}%</span>
        </div>
      `;
    }

    if (cardTaxaEurEl && eur) {
      cardTaxaEurEl.innerHTML = `
        <div class="card-taxa-topo">
          <div class="card-taxa-moeda">
            <span class="bandeira-icone">${eur.bandeira}</span>
            <div class="moeda-info-texto">
              <h4>${eur.nome}</h4>
              <p>EUR / AOA</p>
            </div>
          </div>
          <span class="badge badge-neutro">Hoje</span>
        </div>
        <div class="card-taxa-valores">
          <div class="valor-box">
            <div class="valor-box-rotulo">A NZAIDI Compra</div>
            <div class="valor-box-num">${eur.taxas.compra.toFixed(4)} Kz</div>
          </div>
          <div class="valor-box">
            <div class="valor-box-rotulo">A NZAIDI Vende</div>
            <div class="valor-box-num">${eur.taxas.venda.toFixed(4)} Kz</div>
          </div>
        </div>
        <div class="taxa-ref-nota">
          <span>Referência BNA: ${eur.taxas.referencia.toFixed(4)} Kz</span>
          <span>Margens: -${(Number(eur.parametro.margemCompra) * 100).toFixed(1)}% / +${(Number(eur.parametro.margemVenda) * 100).toFixed(1)}%</span>
        </div>
      `;
    }
  }

  // Atualizar visualização do Simulador
  function atualizarSimulador() {
    const estado = simulador.calcularEstado();

    // Timer
    if (tempoTimerEl && badgeTimerEl) {
      tempoTimerEl.textContent = `${estado.tempoRestanteSegundos}s`;
      if (estado.expirada) {
        badgeTimerEl.classList.add("expirado");
        tempoTimerEl.textContent = "Expirada";
      } else {
        badgeTimerEl.classList.remove("expirado");
      }
    }

    // Erros e resultados
    if (msgErroEl) {
      if (estado.erro) {
        msgErroEl.textContent = estado.erro;
        msgErroEl.style.display = "block";
      } else {
        msgErroEl.style.display = "none";
      }
    }

    if (rotuloOperacaoEl) {
      if (estado.operacao === "comprar") {
        rotuloOperacaoEl.textContent = "Total estimado a pagar em Kwanzas:";
      } else {
        rotuloOperacaoEl.textContent = "Total estimado a receber em Kwanzas:";
      }
    }

    if (valorResultadoEl) {
      if (estado.resultado) {
        valorResultadoEl.textContent = estado.resultado.montanteKzFormatado;
      } else {
        valorResultadoEl.textContent = "--- Kz";
      }
    }

    if (taxaAplicadaEl) {
      const taxaVal = estado.cotacao.taxa.toFixed(4);
      const tipo = estado.operacao === "comprar" ? "Venda" : "Compra";
      taxaAplicadaEl.textContent = `1 ${estado.moeda} = ${taxaVal} Kz (${tipo})`;
    }

    if (btnRecotar) {
      if (estado.expirada) {
        btnRecotar.classList.remove("secundario");
        btnRecotar.textContent = "⚠️ Cotação Expirada — Clique para Recotar";
      } else {
        btnRecotar.classList.add("secundario");
        btnRecotar.textContent = "↻ Atualizar / Recotar Agora";
      }
    }
  }

  // Event Listeners
  if (btnComprar && btnVender) {
    btnComprar.addEventListener("click", () => {
      btnComprar.classList.add("ativa");
      btnVender.classList.remove("ativa");
      simulador.setOperacao("comprar");
      atualizarSimulador();
    });

    btnVender.addEventListener("click", () => {
      btnVender.classList.add("ativa");
      btnComprar.classList.remove("ativa");
      simulador.setOperacao("vender");
      atualizarSimulador();
    });
  }

  if (inputMontante) {
    inputMontante.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      simulador.setMontante(target.value);
      atualizarSimulador();
    });
  }

  if (seletorMoeda) {
    seletorMoeda.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      simulador.setMoeda(target.value as MoedaDivisa);
      atualizarSimulador();
    });
  }

  if (btnRecotar) {
    btnRecotar.addEventListener("click", () => {
      simulador.recotar();
      atualizarSimulador();
    });
  }

  // Temporizador de 1 segundo para atualização do cronômetro de 90s
  setInterval(() => {
    atualizarSimulador();
  }, 1000);

  // Inicializações
  atualizarTabelaTaxas();
  atualizarSimulador();

  // Menu Mobile
  const btnMenuMobile = document.getElementById("btn-menu-mobile");
  const menuMobile = document.getElementById("menu-mobile");
  if (btnMenuMobile && menuMobile) {
    btnMenuMobile.addEventListener("click", () => {
      menuMobile.classList.toggle("aberto");
    });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const btn = item.querySelector(".faq-pergunta");
    if (btn) {
      btn.addEventListener("click", () => {
        const estaAberto = item.classList.contains("aberto");
        faqItems.forEach((i) => i.classList.remove("aberto"));
        if (!estaAberto) {
          item.classList.add("aberto");
        }
      });
    }
  });
});
