import { renderizarCentroSuporte } from "./views/suporte.view.js";
import "./styles.css";
import { authState } from "./auth.state.js";
import { api } from "./api.js";
import { renderLoginView } from "./views/login.view.js";
import { renderPerfilView } from "./views/perfil.view.js";
import { inicializarChatSuporte } from "./components/chat-suporte.js";

const appRoot = document.getElementById("app") as HTMLElement;

// Estado global em memória
let taxasAtuais: any = {
  USD: { compra: 897.19, venda: 938.39, refBna: 915.50 },
  EUR: { compra: 965.50, venda: 1009.83, refBna: 985.20 }
};

let operacoesRecentes: any[] = [];
let globoAtivo = false;
let temporizadorCambio: any = null;
let segundosCambio = 90;
let operacaoCambio: "comprar" | "vender" = "comprar";

function obterTema(): "light" | "dark" {
  return (localStorage.getItem("nzaidi_theme") as "light" | "dark") || "light";
}

function aplicarTema(tema: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", tema);
  localStorage.setItem("nzaidi_theme", tema);
}

function alternarTema(): void {
  const novo = obterTema() === "dark" ? "light" : "dark";
  aplicarTema(novo);
  atualizarBotaoTema();
}

function atualizarBotaoTema(): void {
  const btns = document.querySelectorAll(".btn-tema-toggle");
  const tema = obterTema();
  btns.forEach((btn) => {
    btn.innerHTML =
      tema === "dark"
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><span>Modo Claro</span>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg><span>Modo Escuro</span>`;
  });
}

const fmt = (n: number, d = 2) =>
  new Intl.NumberFormat("pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

function formatarDataLuanda(): string {
  const agora = new Date();
  const opcoes: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Luanda",
  };
  const f = agora.toLocaleDateString("pt-AO", opcoes);
  return f.charAt(0).toUpperCase() + f.slice(1);
}

function obterSaudacaoLuanda(): string {
  try {
    const h = Number(
      new Intl.DateTimeFormat("pt-PT", { hour: "numeric", hour12: false, timeZone: "Africa/Luanda" }).format(new Date())
    );
    return h < 12 ? "Bom dia" : h < 19 ? "Boa tarde" : "Boa noite";
  } catch (e) {
    return "Olá";
  }
}

/* ==========================================================================
   EFEITOS VISUAIS E ANIMAÇÕES 3D (IDÊNTICOS AO PROTÓTIPO)
   ========================================================================== */

function criarMoeda(cls: string, simbolo: string, x: number, y: number, i: number, escala: number) {
  const m = document.createElement("div");
  m.className = "moeda " + cls;
  m.style.left = x + "px";
  m.style.top = y + "px";
  m.style.setProperty("--i", String(i));
  m.style.transform = "scale(" + escala + ")";
  m.style.animationDelay = (-i * 1.7) + "s";

  const g = document.createElement("div");
  g.className = "gira";
  g.style.animationDelay = (-i * 2.3) + "s";

  for (let k = 0; k < 9; k++) {
    const a = document.createElement("div");
    a.className = "aresta";
    a.style.transform = "translateZ(" + k + "px)";
    g.appendChild(a);
  }

  const f = document.createElement("div");
  f.className = "face frente";
  f.textContent = simbolo;
  g.appendChild(f);

  const t = document.createElement("div");
  t.className = "face tras";
  t.textContent = simbolo;
  g.appendChild(t);

  m.appendChild(g);
  return m;
}

function montarPalcoMoedas(id: string, lista: any[]) {
  const p = document.getElementById(id);
  if (!p) return;
  p.innerHTML = "";
  lista.forEach((c, i) => {
    const s = document.createElement("div");
    s.className = "sombra-moeda";
    s.style.left = (c[2] + 0) + "px";
    s.style.top = (c[3] + 130 * c[4]) + "px";
    s.style.setProperty("--i", String(i));
    p.appendChild(s);
    p.appendChild(criarMoeda(c[0], c[1], c[2], c[3], i, c[4]));
  });
}

function ativarEfeitoTilt() {
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduzir) return;

  document.querySelectorAll(".tilt").forEach((el: any) => {
    el.addEventListener("pointermove", (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-y * 9}deg) rotateY(${x * 11}deg) translateZ(4px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

function animarContadores(raiz: HTMLElement) {
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  raiz.querySelectorAll("[data-count]").forEach((el: any) => {
    const alvo = parseFloat(el.dataset.count);
    const inteiro = el.dataset.int;
    const dur = reduzir ? 0 : 1100;
    const t0 = performance.now();
    function passo(t: number) {
      const p = dur ? Math.min(1, (t - t0) / dur) : 1;
      const v = alvo * (1 - Math.pow(1 - p, 3));
      el.textContent = inteiro ? Math.round(v) : fmt(v);
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  });

  const anel = raiz.querySelector("#anel-a") as SVGElement | null;
  if (anel) {
    anel.style.strokeDashoffset = "389.6";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        anel.style.strokeDashoffset = "0";
      })
    );
  }
}

/* ==========================================================================
   GLOBO 3D EM CANVAS (REMESSAS)
   ========================================================================== */

function inicializarGloboCanvas() {
  const cv = document.getElementById("globo") as HTMLCanvasElement | null;
  if (!cv) return;
  const cx = cv.getContext("2d");
  if (!cx) return;

  let ang = -0.45;
  const pts: [number, number, number][] = [];
  const N = 700;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = Math.PI * (3 - Math.sqrt(5)) * i;
    pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }

  function ll(lat: number, lon: number): [number, number, number] {
    const la = (lat * Math.PI) / 180;
    const lo = (lon * Math.PI) / 180;
    return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
  }

  const luanda = ll(-8.8, 13.2);
  const destinos = [ll(38.7, -9.1), ll(-23.5, -46.6), ll(-26.2, 28.0), ll(25.2, 55.3)];

  function proj(p: [number, number, number], a: number): [number, number, number] {
    const x = p[0] * Math.cos(a) + p[2] * Math.sin(a);
    const z = -p[0] * Math.sin(a) + p[2] * Math.cos(a);
    return [x, -p[1], z];
  }

  function desenhar() {
    if (!globoAtivo) return;
    const W = cv!.width, H = cv!.height, R = 190, ox = W / 2, oy = H / 2;
    cx!.clearRect(0, 0, W, H);

    const g = cx!.createRadialGradient(ox - 60, oy - 70, 20, ox, oy, R);
    g.addColorStop(0, "rgba(43,93,168,.55)");
    g.addColorStop(1, "rgba(6,26,58,.2)");
    cx!.fillStyle = g;
    cx!.beginPath();
    cx!.arc(ox, oy, R, 0, 7);
    cx!.fill();

    pts.forEach((p) => {
      const q = proj(p, ang);
      if (q[2] < 0) return;
      cx!.fillStyle = "rgba(201,214,236," + (0.25 + q[2] * 0.6) + ")";
      cx!.beginPath();
      cx!.arc(ox + q[0] * R, oy + q[1] * R, 1.6, 0, 7);
      cx!.fill();
    });

    const L = proj(luanda, ang);
    destinos.forEach((d, i) => {
      const D = proj(d, ang);
      if (L[2] < -0.2 && D[2] < -0.2) return;
      const x1 = ox + L[0] * R, y1 = oy + L[1] * R, x2 = ox + D[0] * R, y2 = oy + D[1] * R;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 70;
      cx!.strokeStyle = "rgba(242,200,121,.85)";
      cx!.lineWidth = 2;
      cx!.setLineDash([6, 6]);
      cx!.lineDashOffset = -(performance.now() / 40 + i * 9);
      cx!.beginPath();
      cx!.moveTo(x1, y1);
      cx!.quadraticCurveTo(mx, my, x2, y2);
      cx!.stroke();
      cx!.setLineDash([]);
      if (D[2] > 0) {
        cx!.fillStyle = "#F2C879";
        cx!.beginPath();
        cx!.arc(x2, y2, 4.5, 0, 7);
        cx!.fill();
      }
    });

    if (L[2] > 0) {
      cx!.fillStyle = "#FFFFFF";
      cx!.beginPath();
      cx!.arc(ox + L[0] * R, oy + L[1] * R, 6.5, 0, 7);
      cx!.fill();
      cx!.strokeStyle = "#F2C879";
      cx!.lineWidth = 3;
      cx!.stroke();
    }

    ang += 0.0035;
    requestAnimationFrame(desenhar);
  }

  globoAtivo = true;
  desenhar();
}

/* ==========================================================================
   CARTÃO 3D VIRAR E REFLEXO DE BRILHO
   ========================================================================== */

function inicializarCartao3D() {
  const c3 = document.getElementById("cartao3d");
  if (!c3) return;

  function virar() {
    c3!.classList.toggle("virado");
    c3!.setAttribute("aria-pressed", String(c3!.classList.contains("virado")));
  }

  c3.addEventListener("click", virar);
  c3.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      virar();
    }
  });

  c3.addEventListener("pointermove", (e: PointerEvent) => {
    if (c3.classList.contains("virado")) return;
    const r = c3.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    c3.style.transform = `rotateX(${-y * 16}deg) rotateY(${x * 20}deg)`;
    const frente = c3.querySelector(".frente") as HTMLElement;
    if (frente) frente.style.setProperty("--brilho", `${x * 120}%`);
  });

  c3.addEventListener("pointerleave", () => {
    if (!c3.classList.contains("virado")) c3.style.transform = "";
  });

  const btnAvisar = document.getElementById("btn-avisar");
  btnAvisar?.addEventListener("click", async () => {
    try {
      await api.registarListaEsperaCartoes();
    } catch (e) {}
    btnAvisar.innerHTML = '<svg width="18" height="18"><use href="#i-sino"/></svg> Pedido Registado';
    (btnAvisar as HTMLButtonElement).disabled = true;
    const exp = document.getElementById("espera-txt");
    if (exp) exp.textContent = "Está na lista de espera prioritária. Avisamos por email e SMS assim que o serviço estiver disponível.";
  });
}

/* ==========================================================================
   CONVERSOR & ASSISTENTE DE CÂMBIO COM RELÓGIO DE 90s
   ========================================================================== */

function inicializarConversorCambio() {
  const $ = (id: string) => document.getElementById(id) as any;
  const pagoInput = $("pago");
  const receboInput = $("recebo");
  const divisaSelect = $("divisa");
  const taxaTxt = $("taxa-txt");
  const rTaxa = $("r-taxa");
  const rPaga = $("r-paga");
  const rRecebe = $("r-recebe");
  const tagPago = $("tag-pago");
  const btnTroca = $("btn-troca");
  const btnContinuar = $("btn-continuar");
  const arco = $("arco");
  const relogioTxt = $("relogio-txt");

  if (!pagoInput || !receboInput) return;

  function lerValor(v: string): number {
    return parseFloat(String(v).replace(/[\s\u00a0\u202f]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
  }

  function calcular() {
    const divisa = divisaSelect.value as "USD" | "EUR";
    const taxaConfig = taxasAtuais[divisa] || { compra: 900, venda: 940 };
    const t = operacaoCambio === "comprar" ? taxaConfig.venda : taxaConfig.compra;
    const v = lerValor(pagoInput.value);

    let rec = 0;
    if (operacaoCambio === "comprar") {
      rec = v > 0 && t > 0 ? v / t : 0;
      receboInput.value = fmt(rec);
      if (rPaga) rPaga.textContent = "Kz " + fmt(v);
      if (rRecebe) rRecebe.textContent = fmt(rec) + " " + divisa;
    } else {
      rec = v * t;
      receboInput.value = fmt(rec);
      if (rPaga) rPaga.textContent = fmt(v) + " " + divisa;
      if (rRecebe) rRecebe.textContent = "Kz " + fmt(rec);
    }

    if (taxaTxt) taxaTxt.textContent = `1 ${divisa} = ${fmt(t)} Kz`;
    if (rTaxa) rTaxa.textContent = `1 ${divisa} = ${fmt(t, 4)} Kz`;
    if (tagPago) tagPago.textContent = operacaoCambio === "comprar" ? "Kz" : divisa;
  }

  function iniciarRelogio() {
    clearInterval(temporizadorCambio);
    segundosCambio = 90;
    if (btnContinuar) {
      btnContinuar.disabled = false;
      btnContinuar.textContent = "Continuar para o pagamento";
    }

    function tick() {
      const m = Math.floor(segundosCambio / 60);
      const s = String(segundosCambio % 60).padStart(2, "0");
      if (relogioTxt) {
        relogioTxt.textContent = segundosCambio > 0 ? `Válida por ${m}:${s}` : "Cotação expirada";
      }
      if (arco) {
        arco.style.strokeDashoffset = String(113.1 * (1 - segundosCambio / 90));
        arco.style.stroke = segundosCambio <= 15 ? "#B42318" : "";
      }
      if (segundosCambio <= 0) {
        clearInterval(temporizadorCambio);
        if (btnContinuar) btnContinuar.textContent = "Pedir nova cotação";
      }
      segundosCambio--;
    }
    tick();
    temporizadorCambio = setInterval(tick, 1000);
  }

  document.querySelectorAll(".seg button").forEach((b: any) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg button").forEach((x: any) => x.setAttribute("aria-pressed", String(x === b)));
      operacaoCambio = b.dataset.op;
      pagoInput.value = operacaoCambio === "comprar" ? "500 000" : "500";
      calcular();
      iniciarRelogio();
    });
  });

  pagoInput.addEventListener("input", calcular);
  divisaSelect?.addEventListener("change", () => {
    calcular();
    iniciarRelogio();
  });

  let rot = 0;
  btnTroca?.addEventListener("click", () => {
    rot += 180;
    btnTroca.style.transform = `rotate(${rot}deg)`;
    const outro = document.querySelector('.seg button[aria-pressed="false"]') as HTMLButtonElement | null;
    outro?.click();
  });

  btnContinuar?.addEventListener("click", async () => {
    if (segundosCambio <= 0) {
      iniciarRelogio();
      return;
    }
    const divisa = divisaSelect.value;
    const valor = lerValor(pagoInput.value);
    btnContinuar.disabled = true;
    btnContinuar.textContent = "A processar pedido...";
    try {
      await api.criarPedidoCambio({
        tipoOperacao: operacaoCambio === "comprar" ? "compra" : "venda",
        moeda: divisa as "USD" | "EUR",
        montanteDivisa: String(operacaoCambio === "comprar" ? lerValor(receboInput.value) : valor),
        finalidade: "Operação cambial online",
        metodoPagamento: "MULTICAIXA_EXPRESS",
      });
      alert("Pedido de câmbio registado com sucesso! Acompanhe o estado no seu histórico.");
      window.location.hash = "#dashboard";
    } catch (err: any) {
      alert(err.message || "Erro ao criar pedido de câmbio.");
    } finally {
      btnContinuar.disabled = false;
      btnContinuar.textContent = "Continuar para o pagamento";
    }
  });

  calcular();
  iniciarRelogio();
}

/* ==========================================================================
   DOCUMENTOS KYC & UPLOAD REAL
   ========================================================================== */

function inicializarUploadDocumentos() {
  const zona = document.getElementById("largar");
  const ficheiroInput = document.getElementById("ficheiro") as HTMLInputElement | null;
  const textoLargar = document.getElementById("largar-t");

  if (!zona || !ficheiroInput) return;

  async function processarArquivo(f: File) {
    if (!f) return;
    if (textoLargar) textoLargar.textContent = `A enviar: ${f.name}...`;
    const leitor = new FileReader();
    leitor.onload = async () => {
      const base64: string = (leitor.result as string).split(",")[1] ?? "";
      try {
        const tipoDocSel = (document.getElementById("select-tipo-doc-upload") as HTMLSelectElement)?.value || "bi_frente";
        await api.submeterDocumento(tipoDocSel, f.name || "documento.pdf", base64);
        if (textoLargar) textoLargar.textContent = `Enviado com sucesso: ${f.name}`;
        alert("Documento submetido para validação da equipa de conformidade!");
      } catch (err: any) {
        alert(err.message || "Erro ao submeter documento.");
        if (textoLargar) textoLargar.textContent = "Erro ao enviar. Tente novamente.";
      }
    };
    leitor.readAsDataURL(f);
  }

  ["dragenter", "dragover"].forEach((ev) =>
    zona.addEventListener(ev, (e) => {
      e.preventDefault();
      zona.classList.add("sobre");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    zona.addEventListener(ev, (e) => {
      e.preventDefault();
      zona.classList.remove("sobre");
    })
  );

  zona.addEventListener("drop", (e: DragEvent) => {
    const f = e.dataTransfer?.files[0];
    if (f) processarArquivo(f);
  });

  ficheiroInput.addEventListener("change", () => {
    const f = ficheiroInput.files?.[0];
    if (f) processarArquivo(f);
  });
}

/* ==========================================================================
   ROTEAMENTO POR HASH E MONTAGEM DO PORTAL
   ========================================================================== */

const rotasValidas = ["dashboard", "cambio", "remessas", "cartoes", "documentos", "perfil", "suporte"];

const fazerLogout = async () => {
  await authState.logout();
  renderizarApp();
};

function alternarVista(rotaNome: string) {
  let r = rotaNome;
  if (!rotasValidas.includes(r)) r = "dashboard";

  document.querySelectorAll(".vista").forEach((v) => {
    v.classList.remove("ativa", "entra");
  });

  const vistaAlvo = document.getElementById("v-" + r);
  if (vistaAlvo) {
    vistaAlvo.classList.add("ativa");
    void vistaAlvo.offsetWidth;
    vistaAlvo.classList.add("entra");
    animarContadores(vistaAlvo);

    if (r === "dashboard") {
      atualizarSaudacaoENome();
    }

        if (r === "suporte") {
      const containerSuporte = document.getElementById("suporte-view-container");
      if (containerSuporte) {
        renderizarCentroSuporte(containerSuporte);
      }
    }

    if (r === "perfil") {
      const containerPerfil = document.getElementById("perfil-view-container");
      if (containerPerfil) {
        renderPerfilView(containerPerfil, fazerLogout);
      }
    }
  }

  // Atualizar links da sidebar desktop, topo e barra mobile
  document.querySelectorAll(".sidebar-nav-link, .nav a, .barra a").forEach((a: any) => {
    const href = a.getAttribute("href") || "";
    const ativo = href === "#" + r;
    a.toggleAttribute("aria-current", ativo);
    if (ativo) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  // Ativar globo no canvas somente na rota de remessas
  globoAtivo = r === "remessas";
  if (globoAtivo) {
    inicializarGloboCanvas();
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

async function carregarDadosReais() {
  try {
    const resTaxas = await api.obterTaxas();
    if (resTaxas && Array.isArray(resTaxas)) {
      resTaxas.forEach((t: any) => {
        if (t.moeda === "USD" || t.moeda === "EUR") {
          taxasAtuais[t.moeda] = {
            compra: Number(t.taxaCompra),
            venda: Number(t.taxaVenda),
            refBna: Number(t.taxaReferencia || t.taxaCompra),
          };
        }
      });
    }
  } catch (e) {}

  try {
    const pedidosCambio = await api.listarPedidosCambio();
    operacoesRecentes = Array.isArray(pedidosCambio) ? pedidosCambio : [];
  } catch (e) {}
}

function extrairPrimeiroEUltimoNome(nomeCompleto: string): string {
  const partes = (nomeCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Manuel";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[1]}`;
}

function atualizarSaudacaoENome(nomeParam?: string) {
  const elSaudacao = document.getElementById("saudacao");
  const elNome = document.getElementById("dash-cliente-nome");
  const saudacao = obterSaudacaoLuanda();
  
  const nomeReal = nomeParam || authState.cliente?.nome || localStorage.getItem("nzaidi_cliente_nome") || "Manuel Domingos";
  if (authState.cliente?.nome) {
    try {
      localStorage.setItem("nzaidi_cliente_nome", authState.cliente.nome);
    } catch {}
  }
  const nomeExibir = extrairPrimeiroEUltimoNome(nomeReal);

  if (elSaudacao) {
    elSaudacao.textContent = saudacao;
  }
  if (elNome) {
    elNome.textContent = nomeExibir;
    elNome.title = nomeReal;
  }

  // Garantia absoluta contra qualquer template string residual não interpolada
  const elTDash = document.getElementById("t-dash");
  if (elTDash && elTDash.innerHTML.includes("${clienteNome}")) {
    elTDash.innerHTML = elTDash.innerHTML.replace(/\$\{clienteNome\}/g, nomeExibir);
  }
  if (appRoot && appRoot.innerHTML.includes("${clienteNome}")) {
    appRoot.innerHTML = appRoot.innerHTML.replace(/\$\{clienteNome\}/g, nomeExibir);
  }
}

function renderizarAppShell() {
  const cliente = authState.cliente;
  const clienteNome = cliente?.nome || localStorage.getItem("nzaidi_cliente_nome") || "Manuel Domingos";
  if (cliente?.nome) {
    try {
      localStorage.setItem("nzaidi_cliente_nome", cliente.nome);
    } catch {}
  }
  const primeiroNomeExibir = extrairPrimeiroEUltimoNome(clienteNome);
  const iniciais = clienteNome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const saudacao = obterSaudacaoLuanda();
  const dataHoje = formatarDataLuanda();

  appRoot.innerHTML = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="gOuro" x1="0" x2="1"><stop offset="0" stop-color="#F2C879"/><stop offset="1" stop-color="#D5983E"/></linearGradient>
    <symbol id="i-casa" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></symbol>
    <symbol id="i-troca" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3"/></symbol>
    <symbol id="i-aviao" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></symbol>
    <symbol id="i-cartao" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 10h19" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 2h9l5 5v15H6z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9 13l2 2 4-4"/></symbol>
    <symbol id="i-pessoa" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></symbol>
    <symbol id="i-escudo" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8.5 12l2.5 2.5 4.5-5"/></symbol>
    <symbol id="i-sino" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 21h4"/></symbol>
    <symbol id="i-ajuda" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
    <symbol id="i-nuvem" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 16V8m0 0l-3 3m3-3l3 3M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8"/></symbol>
  </defs>
</svg>

    <div class="app-shell">
      <!-- SIDEBAR NO LADO ESQUERDO (DESKTOP) -->
      <aside class="sidebar-desktop">
        <div class="sidebar-brand-box">
          <a class="marca dark-brand" href="#dashboard" aria-label="NZAIDI, Início">
            <img src="./simbolo.png" alt="NZAIDI" width="40" height="40" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
            <span class="marca-fallback-svg" style="display:none; width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#072042,#0D3873); border:1.5px solid #F2C879; align-items:center; justify-content:center; color:#F2C879; font-weight:800; font-size:16px;">NZ</span>
            <b>NZAIDI</b>
          </a>
          <span class="selo-portal-sidebar">Portal do cliente</span>
        </div>

        <nav class="sidebar-nav-list" aria-label="Menu Principal">
          <a href="#dashboard" class="sidebar-nav-link" aria-current="page"><svg><use href="#i-casa"/></svg><span>Visão geral</span></a>
          <a href="#cambio" class="sidebar-nav-link"><svg><use href="#i-troca"/></svg><span>Câmbios</span></a>
          <a href="#remessas" class="sidebar-nav-link"><svg><use href="#i-aviao"/></svg><span>Remessas</span></a>
          <a href="#cartoes" class="sidebar-nav-link"><svg><use href="#i-cartao"/></svg><span>Cartões Visa</span></a>
          <a href="#documentos" class="sidebar-nav-link"><svg><use href="#i-doc"/></svg><span>Documentos KYC</span></a>
          <a href="#perfil" class="sidebar-nav-link"><svg><use href="#i-pessoa"/></svg><span>Minha conta</span></a>
          <a href="#suporte" id="sidebar-link-suporte" class="sidebar-nav-link"><svg><use href="#i-ajuda"/></svg><span>Centro de Suporte</span></a>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user-card">
            <div class="avatar">${cliente?.avatarUrl || localStorage.getItem("nzaidi_avatar_url") ? `<img src="${cliente?.avatarUrl || localStorage.getItem("nzaidi_avatar_url")}" alt="${clienteNome}" class="avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : iniciais}</div>
            <div class="sidebar-user-info">
              <div class="u-nome" title="${clienteNome}">${clienteNome}</div>
              <div class="u-estado">Conta Verificada</div>
            </div>
            <button id="btn-sidebar-logout" class="btn-sidebar-logout" title="Terminar sessão" aria-label="Terminar sessão">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- ÁREA DE CONTEÚDO PRINCIPAL (À DIREITA DA SIDEBAR) -->
      <div class="app-main-area">
        <!-- Topo Mobile Responsivo (visível em telemóveis e tablets) -->
        <header class="topo-mobile-bar">
          <div class="topo-mobile-marca">
            <img src="./simbolo.png" alt="NZAIDI" width="34" height="34" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
            <span class="marca-fallback-svg" style="display:none; width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg,#072042,#0D3873); border:1px solid #F2C879; align-items:center; justify-content:center; color:#F2C879; font-weight:800; font-size:14px;">NZ</span>
            <span>NZAIDI</span>
          </div>
          <div class="topo-mobile-acoes">
            <button class="btn-tema-toggle btn-mobile-acao" type="button" aria-label="Alternar tema"></button>
            <button id="btn-mobile-chat-suporte" class="btn-mobile-acao" type="button" title="Apoio e Suporte">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </button>
            <a href="#perfil" class="topo-mobile-avatar" aria-label="Minha conta">
              ${cliente?.avatarUrl || localStorage.getItem("nzaidi_avatar_url") ? `<img src="${cliente?.avatarUrl || localStorage.getItem("nzaidi_avatar_url")}" alt="Perfil" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : iniciais}
            </a>
          </div>
        </header>

        <!-- Topo com Selo BNA, Data e Ações Alinhadas à Direita (Desktop) -->
        <header class="topo-desktop-bar">
          <div class="bna-indicator-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Supervisão BNA · NZAIDI Câmbios</span>
          </div>

          <div class="topo-desktop-actions">
            <span class="data-topo-desktop">${dataHoje}</span>
            
            <!-- Botão e Dropdown de Notificações -->
            <div class="notificacoes-topo-wrapper" style="position: relative;">
              <button id="btn-notificacoes-topo" class="btn-notificacao-sino" type="button" aria-label="Notificações">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <span id="badge-notificacoes" class="badge-notificacao-contador" style="display: none;">0</span>
              </button>

              <div id="dropdown-notificacoes" class="dropdown-notificacoes-painel" style="display: none;">
                <div class="dropdown-notificacoes-cabecalho">
                  <strong>Notificações</strong>
                  <button id="btn-marcar-todas-lidas" type="button">Marcar todas como lidas</button>
                </div>
                <div id="lista-notificacoes-topo" class="lista-notificacoes-corpo">
                  <div class="notificacoes-vazio">A carregar notificações...</div>
                </div>
              </div>
            </div>

            <button id="btn-toggle-theme" class="btn-tema-toggle" type="button"></button>
          </div>
        </header>

        <main id="main-content">
          <!-- VIEW 0: DASHBOARD -->
          <section class="vista" id="v-dashboard" aria-labelledby="t-dash">
  <div class="heroi">
    <div>
      <span class="selo" style="--i:0"><svg width="16" height="16"><use href="#i-escudo"/></svg>Conta verificada</span>
      <h1 id="t-dash" style="--i:1"><span id="saudacao">${saudacao}</span>, <span id="dash-cliente-nome">${primeiroNomeExibir}</span></h1>
      <p style="--i:2">O que quer fazer hoje? Troque moeda ou envie dinheiro para quem gosta, com a taxa à vista antes de confirmar.</p>
      <div class="acoes" style="--i:3">
        <a class="btn btn-ouro" href="#cambio"><svg><use href="#i-troca"/></svg>Trocar moeda</a>
        <a class="btn btn-vidro" href="#remessas"><svg><use href="#i-aviao"/></svg>Enviar remessa</a>
      </div>
    </div>
    <div class="palco" id="palco-moedas" aria-hidden="true"></div>
    <div class="faixa"></div>
  </div>

  <div class="grelha">
    <article class="cartao c8" style="--i:0">
      <div class="linha-tit"><h2>Taxas de hoje</h2><span class="atualizado"><i class="ponto"></i>Atualizadas às <span class="hora">14:32</span></span></div>
      <p class="sub">Em kwanzas. A taxa final é confirmada quando faz o pedido.</p>
      <div class="taxas">
        <div class="taxa tilt">
          <div class="taxa-topo"><span class="mini-moeda">$</span><div><div class="taxa-cod">USD</div><div class="taxa-nome">Dólar americano</div></div><span class="taxa-ref">Ref. BNA 915,50</span></div>
          <div class="par"><div><small>Você vende</small><strong class="num" data-count="897.19">0</strong><em>nós compramos</em></div>
            <div class="vende"><small>Você compra</small><strong class="num" data-count="938.39">0</strong><em>nós vendemos</em></div></div>
          <svg class="spark" viewBox="0 0 200 42" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 L25 28 L50 31 L75 24 L100 26 L125 18 L150 21 L175 14 L200 16" fill="none" stroke="#D5983E" stroke-width="2.5" stroke-linecap="round"/></svg>
        </div>
        <div class="taxa tilt">
          <div class="taxa-topo"><span class="mini-moeda">€</span><div><div class="taxa-cod">EUR</div><div class="taxa-nome">Euro</div></div><span class="taxa-ref">Ref. BNA 985,20</span></div>
          <div class="par"><div><small>Você vende</small><strong class="num" data-count="965.50">0</strong><em>nós compramos</em></div>
            <div class="vende"><small>Você compra</small><strong class="num" data-count="1009.83">0</strong><em>nós vendemos</em></div></div>
          <svg class="spark" viewBox="0 0 200 42" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 L25 24 L50 20 L75 26 L100 21 L125 23 L150 17 L175 19 L200 14" fill="none" stroke="#2B5DA8" stroke-width="2.5" stroke-linecap="round"/></svg>
        </div>
      </div>
    </article>
    <article class="cartao c4" style="--i:1">
      <h2>Atalhos</h2><p class="sub">O que mais usa, num toque.</p>
      <div class="atalhos">
        <a class="atalho tilt" href="#cambio"><div class="ic o"><svg><use href="#i-troca"/></svg></div><b>Trocar</b><span>Dólar ou euro</span></a>
        <a class="atalho tilt" href="#remessas"><div class="ic m"><svg><use href="#i-aviao"/></svg></div><b>Enviar</b><span>Para o exterior</span></a>
        <a class="atalho tilt" href="#cartoes"><div class="ic c"><svg><use href="#i-cartao"/></svg></div><b>Cartão</b><span>Em breve</span></a>
        <a class="atalho tilt" href="#documentos"><div class="ic v"><svg><use href="#i-doc"/></svg></div><b>Documentos</b><span>Tudo em dia</span></a>
      </div>
    </article>
    <article class="cartao c12" style="--i:2">
      <div class="linha-tit"><h2>Atividade recente</h2><a href="#remessas" class="btn btn-claro" style="min-height:36px;padding:8px 14px;font-size:13.5px">Ver tudo</a></div>
      <ul class="lista">
        <li><div class="ic o" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center"><svg width="20" height="20"><use href="#i-troca"/></svg></div>
          <div><div class="t">Compra de dólares</div><div class="d">Hoje, 10:15 · Borderô BOR-2026-000118</div></div>
          <div class="valor num">+ 500,00 USD<small>Kz 469 195,00</small></div></li>
        <li><div class="ic m" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center"><svg width="20" height="20"><use href="#i-aviao"/></svg></div>
          <div><div class="t">Remessa para Ana Ferreira</div><div class="d">Ontem · Portugal <span class="estado and">Em processamento</span></div></div>
          <div class="valor num">1 000,00 EUR<small>Kz 1 009 830,00</small></div></li>
        <li><div class="ic v" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center"><svg width="20" height="20"><use href="#i-doc"/></svg></div>
          <div><div class="t">Documentos aprovados</div><div class="d">28 out · Equipa de conformidade</div></div>
          <span class="estado ok">Concluído</span></li>
      </ul>
    </article>
  </div>
</section>

          <!-- VIEW 1: CÂMBIO -->
          <section class="vista" id="v-cambio" aria-labelledby="t-cambio">
  <div class="heroi">
    <div>
      <h1 id="t-cambio" style="--i:0">Trocar moeda</h1>
      <p style="--i:1">Escreva quanto quer trocar. Vê logo quanto recebe, antes de confirmar.</p>
      <div class="passos" style="--i:2" aria-label="Passos">
        <span class="passo on" style="color:#fff"><i>1</i>Montante</span><span class="traco"></span>
        <span class="passo" style="color:#9DB1D6"><i style="border-color:#3A5A8F">2</i>Pagamento</span><span class="traco"></span>
        <span class="passo" style="color:#9DB1D6"><i style="border-color:#3A5A8F">3</i>Confirmação</span><span class="traco"></span>
        <span class="passo" style="color:#9DB1D6"><i style="border-color:#3A5A8F">4</i>Comprovativo</span>
      </div>
    </div>
    <div class="palco" id="palco-troca" aria-hidden="true"></div>
    <div class="faixa"></div>
  </div>
  <div class="grelha">
    <article class="cartao c7" style="--i:0">
      <div class="seg" role="group" aria-label="Tipo de operação">
        <button type="button" aria-pressed="true" data-op="comprar">Comprar divisa</button>
        <button type="button" aria-pressed="false" data-op="vender">Vender divisa</button>
      </div>
      <div class="campo"><label for="pago">Eu pago</label>
        <div class="entrada"><input id="pago" inputmode="decimal" value="500 000" aria-describedby="nota-taxa"><span class="moeda-tag" id="tag-pago">Kz</span></div></div>
      <div class="troca-wrap"><button class="troca" id="btn-troca" type="button" aria-label="Trocar o sentido"><svg><use href="#i-troca"/></svg></button></div>
      <div class="campo"><label for="recebo">Eu recebo</label>
        <div class="entrada"><input id="recebo" readonly tabindex="-1"><select id="divisa" aria-label="Moeda"><option value="USD">USD</option><option value="EUR">EUR</option></select></div></div>
      <div class="cotacao" id="cotacao">
        <b class="num" id="taxa-txt">1 USD = 938,39 Kz</b>
        <div class="relogio" aria-live="polite"><svg viewBox="0 0 44 44"><circle class="fundo" cx="22" cy="22" r="18"/><circle class="arco" id="arco" cx="22" cy="22" r="18" stroke-dasharray="113.1" stroke-dashoffset="0"/></svg><span id="relogio-txt">Válida por 1:30</span></div>
      </div>
      <p class="nota" id="nota-taxa">Se pagar por transferência ou referência, o valor é recalculado à taxa do momento em que o pagamento for confirmado.</p>
      <button class="btn btn-marinho" type="button" style="width:100%;margin-top:16px" id="btn-continuar">Continuar para o pagamento</button>
    </article>
    <article class="cartao c5" style="--i:1">
      <h2>Resumo</h2><p class="sub">Confira antes de continuar.</p>
      <div class="resumo-l"><span>Você paga</span><b class="num" id="r-paga">Kz 500 000,00</b></div>
      <div class="resumo-l"><span>Taxa aplicada</span><b class="num" id="r-taxa">1 USD = 938,3875 Kz</b></div>
      <div class="resumo-l"><span>Comissão</span><b>Incluída na taxa</b></div>
      <div class="resumo-l"><span>Entrega</span><b>A escolher no passo seguinte</b></div>
      <div class="recebe"><small>Você recebe</small><strong class="num" id="r-recebe">532,83 USD</strong></div>
      <div class="confianca"><svg><use href="#i-escudo"/></svg><span>Casa de câmbios licenciada e supervisionada pelo Banco Nacional de Angola.</span></div>
    </article>
  </div>
</section>

          <!-- VIEW 2: REMESSAS -->
          <section class="vista" id="v-remessas" aria-labelledby="t-rem">
  <div class="heroi">
    <div>
      <h1 id="t-rem" style="--i:0">Enviar dinheiro ao exterior</h1>
      <p style="--i:1">Para a família, para estudos ou para pagar um serviço. Acompanha cada passo até o dinheiro chegar.</p>
      <div class="acoes" style="--i:2"><a class="btn btn-ouro" href="#form-rem"><svg><use href="#i-aviao"/></svg>Nova remessa</a></div>
    </div>
    <div class="palco" style="height:240px" aria-hidden="true"><canvas class="globo" id="globo" width="520" height="480" style="--i:0"></canvas></div>
    <div class="faixa"></div>
  </div>
  <div class="grelha">
    <article class="cartao c7" id="form-rem" style="--i:0">
      <h2>Para quem envia</h2><p class="sub">Confirme os dados com cuidado. Um IBAN errado atrasa a remessa.</p>
      <div class="form-grid">
        <div class="campo"><label for="pais">País de destino</label><select id="pais" class="ctl"><option>Portugal</option><option>Brasil</option><option>África do Sul</option><option>Emirados Árabes Unidos</option></select></div>
        <div class="campo"><label for="rmoeda">Moeda</label><select id="rmoeda" class="ctl"><option>EUR · Euro</option><option>USD · Dólar</option></select></div>
        <div class="campo inteiro"><label for="nome">Nome completo do beneficiário</label><input id="nome" class="ctl" value="Ana Maria Ferreira"></div>
        <div class="campo inteiro"><label for="iban">IBAN ou número de conta</label><input id="iban" class="ctl" value="PT50 0000 0000 0000 0000 0000 0"></div>
        <div class="campo"><label for="fin">Finalidade</label><select id="fin" class="ctl"><option>Apoio familiar</option><option>Estudos</option><option>Saúde</option><option>Pagamento de serviço</option></select></div>
        <div class="campo"><label for="mont">Montante a enviar</label><input id="mont" class="ctl num" value="1 000,00 EUR"></div>
      </div>
      <div class="aviso">Total a pagar: <b class="num">Kz 1 009 830,00</b> (exemplo). Paga por Multicaixa Express, referência, transferência ou no balcão.</div>
      <button class="btn btn-marinho" type="button" style="width:100%;margin-top:16px">Continuar para o pagamento</button>
    </article>
    <article class="cartao c5" style="--i:1">
      <h2>A sua última remessa</h2><p class="sub">Para Ana Ferreira · 1 000,00 EUR</p>
      <div class="linha-temp">
        <div class="marco ok"><b>Pagamento confirmado</b><span>Ontem, 09:12</span></div>
        <div class="marco ok"><b>Verificação concluída</b><span>Ontem, 09:20</span></div>
        <div class="marco ag"><b>Enviada ao parceiro</b><span>Em processamento</span></div>
        <div class="marco"><b>Entregue a Ana</b><span>Avisamos quando chegar</span></div>
      </div>
      <a class="btn btn-claro" href="#remessas" style="width:100%;margin-top:6px">Descarregar comprovativo</a>
    </article>
  </div>
</section>

          <!-- VIEW 3: CARTÕES VISA -->
          <section class="vista" id="v-cartoes" aria-labelledby="t-cart">
  <div class="heroi">
    <div>
      <h1 id="t-cart" style="--i:0">Cartão virtual em dólares</h1>
      <p style="--i:1">Para compras na internet, subscrições e viagens. Estamos a preparar este serviço.</p>
      <div class="acoes" style="--i:2"><button class="btn btn-ouro" type="button" id="btn-avisar"><svg><use href="#i-sino"/></svg>Avisar-me quando estiver disponível</button></div>
    </div>
    <div class="cena-cartao" aria-label="Pré-visualização do cartão. Toque para virar.">
      <div class="cartao3d" id="cartao3d" tabindex="0" role="button" aria-pressed="false" style="--i:0">
        <div class="cara frente"><div class="padrao"></div><div class="fita">Em breve</div>
          <img src="data:image/png;base64,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" alt="" width="34" height="34" style="position:relative">
          <div class="chip"></div><div class="numero">•••• •••• •••• 4271</div>
          <div class="rodape"><div>MANUEL A.<br>Válido até 10/29</div><div class="rede">Visa</div></div></div>
        <div class="cara costas"><div class="tarja"></div><div class="assin">•••</div><p style="margin:0 22px;font-size:11.5px;color:#C9D6EC">Os dados do cartão só aparecem por instantes, a seu pedido.</p></div>
      </div>
    </div>
    <div class="faixa"></div>
  </div>
  <div class="grelha">
    <article class="cartao c6" style="--i:0">
      <h2>Como vai funcionar</h2><p class="sub">Quando o serviço abrir.</p>
      <ul class="vantagens">
        <li><div class="ic o"><svg><use href="#i-troca"/></svg></div><div><b>Carrega em kwanzas</b><div class="sub" style="margin:0">Paga em kwanzas e o saldo fica em dólares.</div></div></li>
        <li><div class="ic m"><svg><use href="#i-escudo"/></svg></div><div><b>Congela quando quiser</b><div class="sub" style="margin:0">Um toque bloqueia o cartão se algo parecer estranho.</div></div></li>
        <li><div class="ic v"><svg><use href="#i-cartao"/></svg></div><div><b>Dados protegidos</b><div class="sub" style="margin:0">O número completo só aparece por instantes, quando pede.</div></div></li>
      </ul>
    </article>
    <article class="cartao c6" style="--i:1">
      <h2>Lista de espera</h2><p class="sub" id="espera-txt">Ainda não está na lista. Toque em "Avisar-me" e avisamos por email quando abrir.</p>
      <div class="confianca"><svg><use href="#i-escudo"/></svg><span>Só abrimos o serviço depois de todas as autorizações estarem confirmadas.</span></div>
    </article>
  </div>
</section>

          <!-- VIEW 4: DOCUMENTOS KYC -->
          <section class="vista" id="v-documentos" aria-labelledby="t-docs">
  <div class="heroi">
    <div>
      <span class="selo" style="--i:0"><svg width="16" height="16"><use href="#i-escudo"/></svg>Identidade verificada</span>
      <h1 id="t-docs" style="--i:1">Os seus documentos</h1>
      <p style="--i:2">Está tudo em dia. Avisamos antes de algum documento caducar.</p>
    </div>
    <div class="cena-cartao" style="height:230px"><div class="bi3d tilt" style="--i:0" aria-hidden="true">
      <div class="t">REPÚBLICA DE ANGOLA · BILHETE DE IDENTIDADE</div>
      <div class="foto">MA</div>
      <div class="lin" style="top:60px;width:150px"></div><div class="lin" style="top:80px;width:110px"></div>
      <div class="lin" style="top:100px;width:160px"></div><div class="lin" style="top:120px;width:90px"></div>
      <div class="lin" style="top:150px;width:170px;background:#E2C68E"></div><div class="scan"></div></div></div>
    <div class="faixa"></div>
  </div>
  <div class="grelha">
    <article class="cartao c4" style="--i:0;display:flex;flex-direction:column;align-items:center;text-align:center">
      <h2>Verificação</h2><p class="sub">3 de 3 documentos aprovados</p>
      <div class="anel"><svg viewBox="0 0 150 150"><circle class="f" cx="75" cy="75" r="62"/><circle class="a" id="anel-a" cx="75" cy="75" r="62" stroke-dasharray="389.6" stroke-dashoffset="389.6"/></svg>
        <div class="meio"><div><b class="num" data-count="100" data-int="1">0</b><span>% completo</span></div></div></div>
    </article>
    <article class="cartao c8" style="--i:1">
      <h2>Documentos enviados</h2><p class="sub">Toque num documento para ver os detalhes.</p>
      <div class="doc"><div class="ic v" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center"><svg width="20" height="20"><use href="#i-doc"/></svg></div><div><b>Bilhete de identidade</b><div class="sub" style="margin:0">Válido até dezembro de 2029</div></div><span class="estado ok">Aprovado</span></div>
      <div class="doc"><div class="ic v" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center"><svg width="20" height="20"><use href="#i-doc"/></svg></div><div><b>NIF</b><div class="sub" style="margin:0">Número de identificação fiscal</div></div><span class="estado ok">Aprovado</span></div>
      <div class="doc"><div class="ic o" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center"><svg width="20" height="20"><use href="#i-doc"/></svg></div><div><b>Comprovativo de morada</b><div class="sub" style="margin:0">Atualize até março de 2027</div></div><span class="estado and">Atualizar em breve</span></div>
      <div class="campo mb-3" style="margin-bottom: 14px;">
        <label for="select-tipo-doc-upload" style="font-size: 13px; font-weight: 700; color: var(--suave); margin-bottom: 6px; display: block;">Tipo de Documento a Enviar</label>
        <select id="select-tipo-doc-upload" class="ctl" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--borda); background: var(--cartao); font-size: 14px; font-weight: 600;">
          <option value="bi_frente">Bilhete de Identidade (Frente)</option>
          <option value="bi_verso">Bilhete de Identidade (Verso)</option>
          <option value="passaporte">Passaporte (Página Principal)</option>
          <option value="comprovativo_morada">Comprovativo de Morada / Residência</option>
          <option value="nif_empresa">Certidão Comercial / Cartão NIF</option>
          <option value="declaracao_rendimentos">Declaração de Rendimentos / Salário</option>
        </select>
      </div>
      <label class="largar" id="largar"><input type="file" hidden id="ficheiro"><svg width="30" height="30" style="color:var(--ouro)"><use href="#i-nuvem"/></svg><b id="largar-t">Arraste um documento para aqui</b><span>ou toque para escolher. PDF, JPG ou PNG.</span></label>
    </article>
  </div>
</section>

          <!-- VIEW 5: MINHA CONTA / PERFIL -->
          <section class="vista" id="v-perfil" aria-labelledby="t-perf">
            <div id="perfil-view-container"></div>
          </section>
        
          <!-- VIEW 6: CENTRO DE SUPORTE -->
          <section class="vista" id="v-suporte" aria-label="Centro de Suporte" style="padding: 1.5rem 0;">
            <div id="suporte-view-container"></div>
          </section>
        </main>
      </div>

      <!-- BARRA MÓVEL INFERIOR (DISPOSITIVOS MÓVEIS) -->
      <nav class="barra" aria-label="Navegação móvel">
        <a href="#dashboard"><svg><use href="#i-casa"/></svg>Início</a>
        <a href="#cambio"><svg><use href="#i-troca"/></svg>Câmbios</a>
        <a href="#remessas"><svg><use href="#i-aviao"/></svg>Remessas</a>
        <a href="#cartoes"><svg><use href="#i-cartao"/></svg>Cartões</a>
        <a href="#suporte"><svg><use href="#i-ajuda"/></svg>Suporte</a>
        <a href="#documentos"><svg><use href="#i-doc"/></svg>Docs</a>
        <a href="#perfil"><svg><use href="#i-pessoa"/></svg>Conta</a>
      </nav>
    </div>
  `;

  // Inicializar palcos 3D
  montarPalcoMoedas("palco-moedas", [
    ["", "$", 60, 20, 1],
    ["prata", "€", 210, 70, 0.82],
    ["azul", "Kz", 140, 120, 0.7],
  ]);
  montarPalcoMoedas("palco-troca", [
    ["", "$", 70, 50, 1],
    ["azul", "Kz", 220, 60, 0.9],
  ]);

  // Eventos de componentes
  ativarEfeitoTilt();
  inicializarCartao3D();
  inicializarConversorCambio();
  inicializarUploadDocumentos();

  // Saudação e Nome Dinâmico do Cliente
  atualizarSaudacaoENome(clienteNome);

  // --- Centro de Notificações e Sincronização em Tempo Real ---
  async function atualizarNotificacoesTopo() {
    try {
      const res = await api.obterNotificacoesApi();
      const badge = document.getElementById("badge-notificacoes");
      const lista = document.getElementById("lista-notificacoes-topo");

      if (badge) {
        if (res.naoLidas > 0) {
          badge.textContent = String(res.naoLidas);
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      }

      if (lista) {
        if (res.dados.length === 0) {
          lista.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: #94a3b8; font-size: 0.8rem;">Não tem notificações de momento.</div>';
        } else {
          lista.innerHTML = res.dados.map((n: any) => `
            <div class="item-notif ${n.lida ? '' : 'nao-lida'}" data-id="${n.id}" style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; cursor: pointer; background: ${n.lida ? '#ffffff' : '#f0fdf4'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px;">
                <strong style="font-size: 0.8rem; color: #08264F;">${n.titulo}</strong>
                <span style="font-size: 0.65rem; color: #94a3b8;">${new Date(n.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style="font-size: 0.75rem; color: #64748b; line-height: 1.3;">${n.mensagem}</div>
            </div>
          `).join("");

          lista.querySelectorAll(".item-notif").forEach((item) => {
            item.addEventListener("click", async () => {
              const id = item.getAttribute("data-id");
              if (id) {
                await api.marcarNotificacaoApiLida(id);
                atualizarNotificacoesTopo();
              }
            });
          });
        }
      }
    } catch {}
  }

  // Toggle dropdown de notificações
  const btnNotif = document.getElementById("btn-notificacoes-topo");
  const dropdownNotif = document.getElementById("dropdown-notificacoes");
  btnNotif?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdownNotif) {
      dropdownNotif.style.display = dropdownNotif.style.display === "block" ? "none" : "block";
    }
  });

  document.addEventListener("click", () => {
    if (dropdownNotif) dropdownNotif.style.display = "none";
  });

  document.getElementById("btn-marcar-todas-lidas")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await api.marcarTodasNotificacoesApiLidas();
    atualizarNotificacoesTopo();
  });

  atualizarNotificacoesTopo();

  // Escutar evento de atualização de avatar em tempo real
  window.addEventListener("nzaidi-avatar-atualizado", (e: any) => {
    const novaUrl = e.detail?.avatarUrl;
    if (novaUrl) {
      document.querySelectorAll(".sidebar-user-card .avatar, .topo-mobile-avatar, .header-user-avatar").forEach((el) => {
        el.innerHTML = `<img src="${novaUrl}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      });
    }
  });

  document.getElementById("btn-toggle-theme")?.addEventListener("click", alternarTema);
  atualizarBotaoTema();

  // Inicializar Chat de Suporte
  inicializarChatSuporte();

  const abrirSuporte = () => {
    window.dispatchEvent(new CustomEvent("abrir-suporte"));
  };
  document.getElementById("sidebar-link-suporte")?.addEventListener("click", abrirSuporte);
  document.getElementById("btn-mobile-chat-suporte")?.addEventListener("click", abrirSuporte);

  // Logout
  const fazerLogout = async () => {
    await authState.logout();
    renderizarApp();
  };
  document.getElementById("btn-sidebar-logout")?.addEventListener("click", fazerLogout);
  document.querySelectorAll(".btn-acao-logout, #btn-perfil-logout").forEach((b) => b.addEventListener("click", fazerLogout));

  // Escutar mudança de rota
  window.addEventListener("hashchange", () => {
    const r = (location.hash || "#dashboard").slice(1);
    alternarVista(r);
  });

  // Rota inicial
  const rInicial = (location.hash || "#dashboard").slice(1);
  alternarVista(rInicial);
}

function renderizarApp() {
  if (!authState.cliente) {
    renderLoginView(appRoot, () => {
      renderizarApp();
    });
    return;
  }

  renderizarAppShell();
}

async function iniciar() {
  const temaSalvo = obterTema();
  aplicarTema(temaSalvo);

  appRoot.innerHTML = `
    <div style="min-height: 100vh; display: grid; place-items: center; background: #061A3A; color: #fff; font-family: Sora, sans-serif;">
      <div style="text-align: center;">
        <img src="./simbolo.png" alt="NZAIDI" width="64" height="64" style="margin-bottom: 16px; border-radius: 14px; object-fit: cover;" onerror="this.style.display='none';" />
        <div style="font-size: 1.2rem; font-weight: 700; letter-spacing: 0.1em;">NZAIDI</div>
        <div style="font-size: 0.85rem; color: #D5983E; margin-top: 6px;">A carregar Portal do Cliente...</div>
      </div>
    </div>
  `;

  await authState.inicializar();
  await carregarDadosReais();
  renderizarApp();
  atualizarSaudacaoENome();
}

iniciar();
