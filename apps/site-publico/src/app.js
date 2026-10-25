/*
 * Site público NZAIDI: comportamento da página.
 * Sem regras financeiras: as taxas chegam já calculadas pela API (taxas-cambio).
 * O conversor só multiplica pela taxa publicada, para dar um valor indicativo.
 */
(function () {
  "use strict";

  var config = window.NZAIDI_CONFIG || {};
  var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MOEDAS = { USD: "Dólar dos EUA", EUR: "Euro" };

  // Modo de demonstração: só com ?demo=1, sempre identificado como tal.
  var demo = /[?&]demo=1\b/.test(location.search);
  var TAXAS_DEMO = {
    atualizadoEm: new Date().toISOString(),
    origem: "Valores de demonstração",
    moedas: [
      { moeda: "USD", referencia: "912.5000", compra: "898.8125", venda: "930.7500" },
      { moeda: "EUR", referencia: "1050.0000", compra: "1034.2500", venda: "1071.0000" },
    ],
  };

  // ---------- Formatação (pt-AO, exata a partir de texto) ----------
  function formatarKz(texto) {
    var partes = String(texto).split(".");
    var inteira = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    var fracao = ((partes[1] || "") + "00").slice(0, 2);
    return inteira + "," + fracao + " Kz";
  }
  function formatarTaxa(texto) {
    var partes = String(texto).split(".");
    var inteira = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    var fracao = ((partes[1] || "") + "0000").slice(0, 4);
    return inteira + "," + fracao;
  }

  // Multiplicação decimal exata com inteiros grandes; resultado arredondado a 2 casas (metade para cima).
  function multiplicar(a, b) {
    function paraInteiro(s) {
      var p = s.split(".");
      var casas = (p[1] || "").length;
      return { n: BigInt(p[0] + (p[1] || "")), casas: casas };
    }
    var x = paraInteiro(a);
    var y = paraInteiro(b);
    var casas = x.casas + y.casas;
    var produto = x.n * y.n;
    if (casas > 2) {
      var fator = 10n ** BigInt(casas - 2);
      produto = (produto + fator / 2n) / fator;
      casas = 2;
    }
    var s = produto.toString().padStart(casas + 1, "0");
    return s.slice(0, s.length - casas) + "." + s.slice(s.length - casas).padEnd(2, "0");
  }

  function lerMontante(texto) {
    // Aceita "1 234,50", "1.234,50" e "1234.50". Com vírgula, os pontos são separadores de milhares.
    var limpo = String(texto).replace(/\s| /g, "");
    limpo = limpo.indexOf(",") >= 0 ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
    return /^\d+(\.\d{1,2})?$/.test(limpo) && Number(limpo) > 0 ? limpo : null;
  }

  // ---------- Tabela de taxas ----------
  var corpo = document.getElementById("taxas-corpo");
  var estado = document.getElementById("taxas-estado");
  var nota = document.getElementById("taxas-nota");
  var taxasAtuais = null;

  function linhaMoeda(codigo, celulas) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><div class="moeda-celula"><span class="moeda-celula__icone">' +
      (codigo === "USD" ? "$" : "€") +
      "</span><div><strong>" +
      codigo +
      "</strong><small>" +
      MOEDAS[codigo] +
      "</small></div></div></td>" +
      celulas;
    return tr;
  }

  function mostrarTaxas(dados) {
    corpo.innerHTML = "";
    taxasAtuais = dados;
    if (!dados) {
      ["USD", "EUR"].forEach(function (m) {
        corpo.appendChild(
          linhaMoeda(
            m,
            '<td class="nz-valor">—</td><td class="nz-valor">—</td><td class="nz-valor oculta-telemovel">—</td>',
          ),
        );
      });
      estado.innerHTML =
        '<span class="nz-estado nz-estado--pendente">A aguardar atualização</span><span>As taxas do dia serão publicadas aqui pela gestão.</span>';
      nota.textContent = "Para a taxa em vigor, contacte a loja ou visite-nos na Maianga.";
      return;
    }
    dados.moedas.forEach(function (t) {
      corpo.appendChild(
        linhaMoeda(
          t.moeda,
          '<td class="nz-valor">' +
            formatarTaxa(t.compra) +
            '</td><td class="nz-valor">' +
            formatarTaxa(t.venda) +
            '</td><td class="nz-valor oculta-telemovel">' +
            formatarTaxa(t.referencia) +
            "</td>",
        ),
      );
    });
    var quando = new Date(dados.atualizadoEm).toLocaleString("pt-AO", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Africa/Luanda",
    });
    estado.innerHTML = demo
      ? '<span class="nz-aviso-demo">Demonstração: estes valores não são taxas da NZAIDI.</span>'
      : '<span class="nz-estado nz-estado--sucesso">Atualizado</span><span>' + quando + " (hora de Luanda)</span>";
    nota.textContent = "Valores em kwanzas por 1 unidade de divisa. Origem: " + dados.origem + ".";
  }

  function carregarTaxas() {
    if (demo) return mostrarTaxas(TAXAS_DEMO);
    if (config.taxas) return mostrarTaxas(config.taxas);
    if (!config.urlTaxas) return mostrarTaxas(null);
    fetch(config.urlTaxas, { headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(mostrarTaxas)
      .catch(function () {
        mostrarTaxas(null);
      });
  }

  // ---------- Conversor indicativo ----------
  var form = document.getElementById("conversor");
  var campoMontante = document.getElementById("conv-montante");
  var campoMoeda = document.getElementById("conv-moeda");
  var saida = document.getElementById("conv-valor");

  function converter() {
    var sentido = form.querySelector('input[name="sentido"]:checked').value;
    var montante = lerMontante(campoMontante.value);
    campoMontante.setAttribute("aria-invalid", campoMontante.value && !montante ? "true" : "false");
    if (!taxasAtuais) {
      saida.textContent = "Taxas por publicar";
      return;
    }
    if (!montante) {
      saida.textContent = "—";
      return;
    }
    var taxa = taxasAtuais.moedas.filter(function (t) {
      return t.moeda === campoMoeda.value;
    })[0];
    if (!taxa) {
      saida.textContent = "—";
      return;
    }
    var kz = multiplicar(montante, sentido === "comprar" ? taxa.venda : taxa.compra);
    saida.textContent = (sentido === "comprar" ? "Paga " : "Recebe ") + formatarKz(kz);
  }
  form.addEventListener("input", converter);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
  });

  // ---------- Contactos (só os confirmados) ----------
  var contactos = config.contactos || {};
  Object.keys(contactos).forEach(function (chave) {
    var valor = contactos[chave];
    var bloco = document.querySelector('[data-contacto="' + chave + '"]');
    if (valor && bloco) {
      bloco.querySelector("dd").textContent = valor;
      bloco.hidden = false;
    }
  });
  document.querySelectorAll("[data-app]").forEach(function (a) {
    if (config.urlApp) a.href = config.urlApp;
  });

  // ---------- Menu ----------
  var menu = document.getElementById("menu");
  var botaoMenu = document.getElementById("menu-botao");
  function fecharMenu() {
    menu.classList.remove("menu--aberto");
    botaoMenu.setAttribute("aria-expanded", "false");
  }
  botaoMenu.addEventListener("click", function () {
    var aberto = menu.classList.toggle("menu--aberto");
    botaoMenu.setAttribute("aria-expanded", String(aberto));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) fecharMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharMenu();
  });

  // Cabeçalho com sombra ao rolar
  var cabecalho = document.getElementById("cabecalho");
  function aoRolar() {
    cabecalho.classList.toggle("cabecalho--rolado", window.scrollY > 8);
  }
  window.addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  // Ligação ativa no menu
  if ("IntersectionObserver" in window) {
    var ligacoes = menu.querySelectorAll('a[href^="#"]');
    var obsMenu = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          ligacoes.forEach(function (a) {
            a.classList.toggle("ativo", a.getAttribute("href") === "#" + en.target.id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    document.querySelectorAll("main section[id]").forEach(function (s) {
      obsMenu.observe(s);
    });
  }

  // ---------- Efeitos 3D ----------
  function inclinar(elemento, alvo, intensidade, base) {
    if (semMovimento) return;
    elemento.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = elemento.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      alvo.style.setProperty("--ry", (base.ry + x * intensidade).toFixed(2) + "deg");
      alvo.style.setProperty("--rx", (base.rx - y * intensidade).toFixed(2) + "deg");
    });
    elemento.addEventListener("pointerleave", function () {
      alvo.style.setProperty("--ry", base.ry + "deg");
      alvo.style.setProperty("--rx", base.rx + "deg");
    });
  }
  inclinar(document.getElementById("cena"), document.getElementById("palco"), 26, { rx: 8, ry: -14 });
  document.querySelectorAll("[data-inclinar]").forEach(function (el) {
    var base = el.classList.contains("ilustracao--loja") ? { rx: 2, ry: -6 } : { rx: 0, ry: 0 };
    inclinar(el, el, 10, base);
  });

  // ---------- Revelar ao rolar ----------
  if (!semMovimento && "IntersectionObserver" in window) {
    var alvos = document.querySelectorAll(
      ".seccao__cabeca, .servico, .passo, .taxas > *, .duas-colunas > *, .perguntas details, .chamada__caixa",
    );
    var obs = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("revelar--visivel");
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    alvos.forEach(function (el, i) {
      el.classList.add("revelar");
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      obs.observe(el);
    });
  }

  document.getElementById("ano").textContent = String(new Date().getFullYear());
  carregarTaxas();
  converter();
})();
