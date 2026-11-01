import { authState } from "../auth.state.js";
import { icone } from "./icones.js";

interface MensagemChat {
  id: string;
  autor: "cliente" | "suporte";
  nome: string;
  texto: string;
  hora: string;
}

const STORAGE_KEY = "nzaidi_suporte_mensagens";

function carregarMensagensSalvas(): MensagemChat[] {
  try {
    const dados = localStorage.getItem(STORAGE_KEY);
    if (dados) return JSON.parse(dados);
  } catch {}
  return [];
}

function salvarMensagens(mensagens: MensagemChat[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mensagens));
  } catch {}
}

export function inicializarChatSuporte(): void {
  let aberto = false;
  const cliente = authState.cliente;
  const clienteNome = cliente?.nome || "Estimado Cliente";
  const primeiroNome = clienteNome.split(" ")[0];

  // Elemento container do Chat
  let chatWrapper = document.getElementById("nzaidi-chat-suporte-wrapper");
  if (!chatWrapper) {
    chatWrapper = document.createElement("div");
    chatWrapper.id = "nzaidi-chat-suporte-wrapper";
    document.body.appendChild(chatWrapper);
  }

  let mensagens: MensagemChat[] = carregarMensagensSalvas();
  if (mensagens.length === 0) {
    mensagens = [
      {
        id: "m_1",
        autor: "suporte",
        nome: "Atendimento NZAIDI",
        texto: `Olá, ${primeiroNome}! Bem-vindo ao canal direto de apoio da NZAIDI – Casa de Câmbios & Transferência. Estamos online em Luanda para o ajudar.`,
        hora: "Agora",
      },
      {
        id: "m_2",
        autor: "suporte",
        nome: "Atendimento NZAIDI",
        texto: "Pode tirar dúvidas sobre compra e venda de moeda, acompanhamento de remessas, envio de comprovativos ou estado da sua conta KYC.",
        hora: "Agora",
      },
    ];
    salvarMensagens(mensagens);
  }

  function renderChat() {
    if (!chatWrapper) return;

    chatWrapper.innerHTML = `
      <!-- Botão Flutuante de Apoio -->
      <button id="btn-toggle-chat-suporte" class="btn-chat-flutuante" type="button" aria-label="Abrir Apoio ao Cliente">
        ${
          aberto
            ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
            : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg><span class="badge-chat-online"></span>`
        }
        <span class="btn-chat-txt">Apoio NZAIDI</span>
      </button>

      <!-- Janela Modal do Chat -->
      <div id="janela-chat-suporte" class="janela-chat ${aberto ? "aberta" : ""}">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="chat-avatar-oficial">
              <img src="/logotipo.png" alt="NZAIDI" />
            </div>
            <div>
              <div class="chat-header-titulo">Apoio ao Cliente NZAIDI</div>
              <div class="chat-header-status">
                <span class="ponto-verde"></span>
                <span>Operadores Online · Balcão Central</span>
              </div>
            </div>
          </div>
          <button id="btn-fechar-chat" class="btn-chat-fechar" type="button" title="Fechar chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="chat-banner-aviso">
          ${icone("seguranca", 14)}
          <span>Canal encriptado e integrado à equipa de operações do Backoffice.</span>
        </div>

        <!-- Corpo com Balões de Conversa -->
        <div class="chat-mensagens" id="chat-mensagens-lista">
          ${mensagens
            .map(
              (m) => `
            <div class="balao-wrap ${m.autor}">
              <div class="balao-autor">${m.nome}</div>
              <div class="balao-texto">${m.texto}</div>
              <div class="balao-hora">${m.hora}</div>
            </div>
          `
            )
            .join("")}
        </div>

        <!-- Sugestões Rápidas -->
        <div class="chat-sugestoes">
          <button type="button" class="sugestao-pill" data-msg="Qual é o prazo de aprovação dos meus documentos KYC?">Aprovação KYC</button>
          <button type="button" class="sugestao-pill" data-msg="Como funciona a taxa de câmbio garantida?">Taxa congelada</button>
          <button type="button" class="sugestao-pill" data-msg="Preciso de ajuda com uma remessa internacional.">Ajuda em Remessa</button>
        </div>

        <!-- Formulário de Envio -->
        <form id="form-chat-envio" class="chat-input-bar">
          <input type="text" id="input-chat-msg" placeholder="Escreva a sua mensagem..." required autocomplete="off" />
          <button type="submit" id="btn-chat-enviar" aria-label="Enviar mensagem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    `;

    // Eventos
    chatWrapper.querySelector("#btn-toggle-chat-suporte")?.addEventListener("click", () => {
      aberto = !aberto;
      renderChat();
      if (aberto) scrollParaFim();
    });

    chatWrapper.querySelector("#btn-fechar-chat")?.addEventListener("click", () => {
      aberto = false;
      renderChat();
    });

    chatWrapper.querySelectorAll(".sugestao-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const texto = btn.getAttribute("data-msg");
        if (texto) enviarMensagemCliente(texto);
      });
    });

    const form = chatWrapper.querySelector("#form-chat-envio") as HTMLFormElement | null;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = chatWrapper?.querySelector("#input-chat-msg") as HTMLInputElement | null;
      if (input && input.value.trim()) {
        enviarMensagemCliente(input.value.trim());
        input.value = "";
      }
    });

    if (aberto) scrollParaFim();
  }

  function scrollParaFim() {
    setTimeout(() => {
      const lista = document.getElementById("chat-mensagens-lista");
      if (lista) lista.scrollTop = lista.scrollHeight;
    }, 50);
  }

  function enviarMensagemCliente(texto: string) {
    const agora = new Date();
    const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

    const nova: MensagemChat = {
      id: "cli_" + Date.now(),
      autor: "cliente",
      nome: cliente?.nome || "Você",
      texto,
      hora,
    };

    mensagens.push(nova);
    salvarMensagens(mensagens);
    renderChat();

    // Resposta inteligente e humanizada do operador
    setTimeout(() => {
      let resposta = "Recebemos a sua mensagem e registámos na fila de atendimento da equipa de operações da NZAIDI. Um operador responderá em instantes.";

      const t = texto.toLowerCase();
      if (t.includes("kyc") || t.includes("documento")) {
        resposta = "Os documentos submetidos no portal são analisados pela equipa de conformidade em até 2 horas úteis. Assim que validados, os seus limites diários são ativados automaticamente.";
      } else if (t.includes("taxa") || t.includes("câmbio") || t.includes("cambio")) {
        resposta = "A taxa cotada no simulador tem validade de 90 segundos para submissão do pedido. Pode concluir o pagamento via Multicaixa Express ou transferência bancária.";
      } else if (t.includes("remessa") || t.includes("exterior")) {
        resposta = "Para remessas internacionais, certifique-se de que o IBAN e o nome do beneficiário coincidem com o registo bancário de destino para evitar devoluções.";
      }

      mensagens.push({
        id: "sup_" + Date.now(),
        autor: "suporte",
        nome: "Operador de Atendimento",
        texto: resposta,
        hora: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
      });
      salvarMensagens(mensagens);
      renderChat();
    }, 1200);
  }

  // Listener para botões externos que queiram abrir o suporte
  window.addEventListener("abrir-suporte", () => {
    aberto = true;
    renderChat();
  });

  renderChat();
}
