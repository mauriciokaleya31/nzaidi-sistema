import { api } from "../api.js";
import { authState } from "../auth.state.js";
import { icone } from "../components/icones.js";

interface MensagemSuporte {
  id: string;
  autor: "cliente" | "suporte";
  nome: string;
  texto: string;
  hora: string;
}

const STORAGE_KEY = "nzaidi_suporte_mensagens_v2";

function carregarMensagens(): MensagemSuporte[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function salvarMensagens(msgs: MensagemSuporte[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {}
}

export function renderizarCentroSuporte(container: HTMLElement): void {
  const cliente = authState.cliente;
  const clienteNome = cliente?.nome || "Estimado Cliente";
  const primeiroNome = clienteNome.split(" ")[0];

  let abaAtiva: "chat" | "faq" | "ticket" = "chat";
  let ticketEnviado = false;
  let ticketCategoria = "cambio";
  let ticketAssunto = "";
  let ticketDescricao = "";

  // Mensagens do Chat embutido na página
  let mensagens: MensagemSuporte[] = carregarMensagens();
  if (mensagens.length === 0) {
    mensagens = [
      {
        id: "msg_init_1",
        autor: "suporte",
        nome: "Atendimento NZAIDI",
        texto: `Olá, ${primeiroNome}! Bem-vindo ao Centro de Suporte Oficial da NZAIDI Câmbios & Transferências. Estamos disponíveis para o apoiar em qualquer dúvida ou operação.`,
        hora: "Agora",
      },
      {
        id: "msg_init_2",
        autor: "suporte",
        nome: "Atendimento NZAIDI",
        texto: "Pode selecionar um dos temas frequentes abaixo ou escrever diretamente a sua questão. Um operador de atendimento responderá de imediato.",
        hora: "Agora",
      },
    ];
    salvarMensagens(mensagens);
  }

  // FAQ Accordion
  const faqs = [
    {
      pergunta: "Qual é o prazo para validação e aprovação dos documentos KYC?",
      resposta:
        "Os documentos submetidos através do portal (Bilhete de Identidade ou Passaporte) são analisados pela equipa de conformidade da NZAIDI em até 2 horas úteis, no horário de expediente de Luanda (08h00 às 18h00). Após a aprovação, os seus limites operacionais diários e anuais são ativados automaticamente.",
    },
    {
      pergunta: "Como funciona a garantia da taxa de câmbio por 90 segundos?",
      resposta:
        "Ao solicitar uma cotação no simulador de câmbio, a taxa cotada com base na referência do Banco Nacional de Angola (BNA) fica estritamente congelada e garantida durante 90 segundos. Se submeter a operação dentro deste intervalo, a taxa acordada é preservada sem qualquer alteração até ao pagamento.",
    },
    {
      pergunta: "Quais são os prazos de liquidação das remessas para o exterior?",
      resposta:
        "Remessas para a União Europeia (SEPA) e Portugal são processadas em até 24 horas úteis. Remessas internacionais para outros destinos bancários são liquidadas no prazo padrão de 24 a 48 horas úteis, com rastreio de referência bancária disponível no seu extrato de operações.",
    },
    {
      pergunta: "Quais são os métodos de pagamento aceites para concluir operações?",
      resposta:
        "Aceitamos Multicaixa Express (com confirmação instantânea no telemóvel), Referência Multicaixa gerada na hora, Transferência Bancária direta com upload de comprovativo e liquidação presencial em numerário nos nossos balcões autorizados.",
    },
    {
      pergunta: "Como solicito e carrego o meu Cartão Visa Virtual?",
      resposta:
        "O Cartão Visa Internacional NZAIDI pode ser emitido instantaneamente no módulo 'Cartões Visa' após a verificação de identidade KYC. Pode ser carregado em Kwanzas e utilizado para compras online mundiais, assinaturas e pagamentos internacionais em dólares ou euros.",
    },
    {
      pergunta: "Como ativo a autenticação de dois fatores (2FA) para maior segurança?",
      resposta:
        "Aceda a 'Minha conta' > 'Segurança' para ativar a autenticação de dois fatores (Google Authenticator ou Microsoft Authenticator). Com o 2FA ativo, cada autorização de câmbio ou envio de remessa exige confirmação com código OTP de 6 dígitos.",
    },
  ];

  let faqAbertaIndex: number | null = 0;

  function render(): void {
    container.innerHTML = `
      <div class="suporte-page-wrapper" style="width: 100%; max-width: 1280px; margin: 0 auto; padding-bottom: 60px;">
        <!-- HERO BANNER DO CENTRO DE SUPORTE -->
        <div class="suporte-hero-card" style="position: relative; border-radius: 24px; padding: 36px 40px; background: radial-gradient(120% 140% at 85% 20%, #1E4F96 0%, #0A2E60 45%, #061A3A 100%); color: #FFFFFF; box-shadow: 0 16px 36px rgba(6, 26, 58, 0.35); border: 1px solid rgba(242, 200, 121, 0.25); margin-bottom: 30px; overflow: hidden;">
          <div style="position: relative; z-index: 2; max-width: 780px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(14, 143, 110, 0.2); border: 1px solid rgba(127, 224, 191, 0.35); color: #7FE0BF; padding: 6px 14px; border-radius: 99px; font-size: 12.5px; font-weight: 700; margin-bottom: 16px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #0E8F6E; box-shadow: 0 0 8px #7FE0BF;"></span>
              Atendimento Online · Luanda (08h00 – 18h00)
            </div>
            <h1 style="font-family: Sora, sans-serif; font-size: clamp(26px, 3.2vw, 36px); font-weight: 800; margin: 0 0 12px; color: #FFFFFF; letter-spacing: -0.01em;">
              Centro de Suporte & Apoio ao Cliente
            </h1>
            <p style="font-size: 15px; line-height: 1.6; color: #C9D6EC; margin: 0;">
              Precisa de ajuda com uma operação cambial, remessa internacional, cartão Visa ou validação da sua conta? A nossa equipa de operadores e especialistas de conformidade está ao seu dispor.
            </p>
          </div>
          <div style="position: absolute; right: -40px; bottom: -40px; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(242, 200, 121, 0.18), transparent 70%); pointer-events: none;"></div>
        </div>

        <!-- 4 CARTÕES DE CANAIS DE CONTACTO DIRETO -->
        <div class="suporte-canais-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 36px;">
          <!-- Canal 1: WhatsApp -->
          <a href="https://wa.me/244930654321?text=Ol%C3%A1%2C%20preciso%20de%20apoio%20no%20Portal%20NZAIDI" target="_blank" rel="noopener noreferrer" class="canal-card-link" style="text-decoration: none; color: inherit;">
            <div class="canal-card" style="background: var(--cartao); border: 1px solid var(--borda); border-radius: 18px; padding: 22px; transition: all 0.25s ease; box-shadow: var(--sombra); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                  <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(37, 211, 102, 0.15); color: #25D366; display: grid; place-items: center;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; color: #25D366; background: rgba(37, 211, 102, 0.12); padding: 4px 10px; border-radius: 99px;">Rápido & Direto</span>
                </div>
                <h3 style="font-size: 16px; font-weight: 800; margin: 0 0 6px; color: var(--texto); font-family: Sora, sans-serif;">WhatsApp Oficial</h3>
                <p style="font-size: 13px; color: var(--suave); margin: 0 0 12px; line-height: 1.4;">Fale em tempo real com um operador dedicado da NZAIDI.</p>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--borda);">
                <strong style="font-size: 14px; color: var(--ouro); font-family: Sora, sans-serif;">+244 930 654 321</strong>
                <span style="font-size: 12px; font-weight: 700; color: var(--ouro); display: flex; align-items: center; gap: 4px;">Abrir chat &rarr;</span>
              </div>
            </div>
          </a>

          <!-- Canal 2: Telefone -->
          <a href="tel:+244923123456" class="canal-card-link" style="text-decoration: none; color: inherit;">
            <div class="canal-card" style="background: var(--cartao); border: 1px solid var(--borda); border-radius: 18px; padding: 22px; transition: all 0.25s ease; box-shadow: var(--sombra); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                  <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(213, 152, 62, 0.15); color: var(--ouro); display: grid; place-items: center;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; color: var(--verde); background: var(--verde-fundo); padding: 4px 10px; border-radius: 99px;">Voz Luanda</span>
                </div>
                <h3 style="font-size: 16px; font-weight: 800; margin: 0 0 6px; color: var(--texto); font-family: Sora, sans-serif;">Linha Telefónica Direta</h3>
                <p style="font-size: 13px; color: var(--suave); margin: 0 0 12px; line-height: 1.4;">Atendimento vocal para urgências e esclarecimentos operacionais.</p>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--borda);">
                <strong style="font-size: 14px; color: var(--ouro); font-family: Sora, sans-serif;">+244 923 123 456</strong>
                <span style="font-size: 12px; font-weight: 700; color: var(--ouro); display: flex; align-items: center; gap: 4px;">Ligar &rarr;</span>
              </div>
            </div>
          </a>

          <!-- Canal 3: E-mail de Suporte -->
          <a href="mailto:suporte@nzaidi.ao?subject=Pedido%20de%20Apoio%20NZAIDI" class="canal-card-link" style="text-decoration: none; color: inherit;">
            <div class="canal-card" style="background: var(--cartao); border: 1px solid var(--borda); border-radius: 18px; padding: 22px; transition: all 0.25s ease; box-shadow: var(--sombra); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                  <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.15); color: #3B82F6; display: grid; place-items: center;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; color: #3B82F6; background: rgba(59, 130, 246, 0.12); padding: 4px 10px; border-radius: 99px;">&lt; 30 min</span>
                </div>
                <h3 style="font-size: 16px; font-weight: 800; margin: 0 0 6px; color: var(--texto); font-family: Sora, sans-serif;">Correio Eletrónico</h3>
                <p style="font-size: 13px; color: var(--suave); margin: 0 0 12px; line-height: 1.4;">Envio formal de comprovativos bancários e processos cadastrais.</p>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--borda);">
                <strong style="font-size: 14px; color: var(--ouro); font-family: Sora, sans-serif;">suporte@nzaidi.ao</strong>
                <span style="font-size: 12px; font-weight: 700; color: var(--ouro); display: flex; align-items: center; gap: 4px;">Enviar &rarr;</span>
              </div>
            </div>
          </a>

          <!-- Canal 4: Balcão e Sede -->
          <div class="canal-card" style="background: var(--cartao); border: 1px solid var(--borda); border-radius: 18px; padding: 22px; transition: all 0.25s ease; box-shadow: var(--sombra); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(14, 143, 110, 0.15); color: var(--verde); display: grid; place-items: center;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: var(--verde); background: var(--verde-fundo); padding: 4px 10px; border-radius: 99px;">Presencial</span>
              </div>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0 0 6px; color: var(--texto); font-family: Sora, sans-serif;">Sede Institucional</h3>
              <p style="font-size: 13px; color: var(--suave); margin: 0 0 12px; line-height: 1.4;">Rua Amílcar Cabral, n.º 45, Maianga, Luanda</p>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--borda);">
              <span style="font-size: 12.5px; color: var(--suave);">Seg a Sex: 08h–18h | Sáb: 08h30–13h</span>
            </div>
          </div>
        </div>

        <!-- NAVEGAÇÃO DE ABAS CENTRAIS DO SUPORTE -->
        <nav class="m4-tabs-nav" aria-label="Abas de Suporte" style="margin-bottom: 24px;">
          <button type="button" class="m4-tab-btn ${abaAtiva === "chat" ? "ativo" : ""}" data-aba="chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span>Assistente Online em Tempo Real</span>
          </button>
          <button type="button" class="m4-tab-btn ${abaAtiva === "faq" ? "ativo" : ""}" data-aba="faq">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>Perguntas Frequentes (FAQ)</span>
          </button>
          <button type="button" class="m4-tab-btn ${abaAtiva === "ticket" ? "ativo" : ""}" data-aba="ticket">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Abrir Pedido de Assistência / Ticket</span>
          </button>
        </nav>

        <!-- CONTEÚDO DA ABA SELECIONADA -->
        ${abaAtiva === "chat" ? renderAbaChat() : ""}
        ${abaAtiva === "faq" ? renderAbaFaq() : ""}
        ${abaAtiva === "ticket" ? renderAbaTicket() : ""}
      </div>
    `;

    // Event Listeners das Abas
    container.querySelectorAll(".m4-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const aba = btn.getAttribute("data-aba") as any;
        if (aba) {
          abaAtiva = aba;
          render();
        }
      });
    });

    // Listeners Específicos do Chat
    if (abaAtiva === "chat") {
      // Pílulas de Resolução Rápida
      container.querySelectorAll(".sugestao-pill-suporte").forEach((btn) => {
        btn.addEventListener("click", () => {
          const msg = btn.getAttribute("data-msg");
          if (msg) enviarMensagemCliente(msg);
        });
      });

      // Form de Envio
      const form = container.querySelector("#form-chat-pagina") as HTMLFormElement | null;
      form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = container.querySelector("#input-chat-pagina-msg") as HTMLInputElement | null;
        if (input && input.value.trim()) {
          enviarMensagemCliente(input.value.trim());
          input.value = "";
        }
      });

      // Botão Limpar Histórico
      container.querySelector("#btn-limpar-chat-hist")?.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        mensagens = [];
        render();
      });

      // Auto-scroll para última mensagem
      const lista = container.querySelector("#chat-pagina-lista") as HTMLElement | null;
      if (lista) lista.scrollTop = lista.scrollHeight;
    }

    // Listeners do FAQ Accordion
    if (abaAtiva === "faq") {
      container.querySelectorAll(".faq-item-header").forEach((header) => {
        header.addEventListener("click", () => {
          const idx = Number(header.getAttribute("data-index"));
          faqAbertaIndex = faqAbertaIndex === idx ? null : idx;
          render();
        });
      });
    }

    // Listeners do Formulário de Ticket
    if (abaAtiva === "ticket") {
      const formTicket = container.querySelector("#form-abrir-ticket") as HTMLFormElement | null;
      formTicket?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const selCat = (container.querySelector("#ticket-cat") as HTMLSelectElement).value;
        const txtAssunto = (container.querySelector("#ticket-assunto") as HTMLInputElement).value;
        const txtDesc = (container.querySelector("#ticket-desc") as HTMLTextAreaElement).value;

        ticketCategoria = selCat;
        ticketAssunto = txtAssunto;
        ticketDescricao = txtDesc;

        try {
          await api.criarAtendimentoSuporte(
            `[${ticketCategoria.toUpperCase()}] ${ticketAssunto}`,
            ticketDescricao
          );
        } catch {}

        ticketEnviado = true;
        render();
      });

      container.querySelector("#btn-novo-ticket-outro")?.addEventListener("click", () => {
        ticketEnviado = false;
        ticketAssunto = "";
        ticketDescricao = "";
        render();
      });
    }
  }

  function enviarMensagemCliente(texto: string): void {
    const agora = new Date();
    const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

    const msgCli: MensagemSuporte = {
      id: "cli_" + Date.now(),
      autor: "cliente",
      nome: cliente?.nome || "Você",
      texto,
      hora,
    };

    mensagens.push(msgCli);
    salvarMensagens(mensagens);
    render();

    // Resposta inteligente da equipa em segundos
    setTimeout(() => {
      let resposta = "Recebemos a sua mensagem no Centro de Suporte NZAIDI. Um dos nossos operadores de tesouraria e conformidade está a analisar o seu caso.";
      const t = texto.toLowerCase();

      if (t.includes("kyc") || t.includes("documento") || t.includes("bi") || t.includes("passaporte")) {
        resposta = "Os documentos KYC submetidos são analisados pela equipa de conformidade em até 2 horas úteis. Assim que aprovados, os seus limites operacionais são elevados automaticamente.";
      } else if (t.includes("taxa") || t.includes("câmbio") || t.includes("cambio") || t.includes("cotação")) {
        resposta = "A cotação exibida no simulador permanece estritamente garantida durante 90 segundos. A taxa final aprovada pelo BNA fica congelada até à liquidação do pedido.";
      } else if (t.includes("remessa") || t.includes("exterior") || t.includes("portugal") || t.includes("europa")) {
        resposta = "As transferências e remessas para a Europa via SEPA demoram até 24h úteis. O IBAN de destino e o nome completo do titular devem coincidir para evitar devoluções bancárias.";
      } else if (t.includes("cartão") || t.includes("cartao") || t.includes("visa") || t.includes("strowallet")) {
        resposta = "O seu Cartão Visa Internacional NZAIDI permite pagamentos online mundiais e compras sem fronteiras. A emissão e os carregamentos são refletidos imediatamente no saldo do cartão.";
      } else if (t.includes("limite") || t.includes("bna") || t.includes("montante")) {
        resposta = "Os limites de câmbio respeitam rigorosamente as diretrizes cambiais do Banco Nacional de Angola (BNA). Pode consultar o seu teto diário e anual na secção 'Minha conta' > 'Limites'.";
      }

      const msgSup: MensagemSuporte = {
        id: "sup_" + Date.now(),
        autor: "suporte",
        nome: "Operador NZAIDI",
        texto: resposta,
        hora: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
      };

      mensagens.push(msgSup);
      salvarMensagens(mensagens);
      render();
    }, 900);
  }

  function renderAbaChat(): string {
    return `
      <div class="card p-large" style="display: grid; grid-template-columns: 1fr 340px; gap: 24px; min-height: 580px;">
        <!-- Janela de Conversação em Tempo Real -->
        <div style="display: flex; flex-direction: column; background: var(--pagina); border: 1px solid var(--borda); border-radius: 18px; overflow: hidden;">
          <div style="padding: 16px 20px; background: var(--cartao); border-bottom: 1px solid var(--borda); display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #0A2E60, #1E4F96); color: #FFFFFF; display: grid; place-items: center; font-weight: 800; font-size: 15px; border: 2px solid var(--ouro);">
                NZ
                <span style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; border-radius: 50%; background: #0E8F6E; border: 2px solid var(--cartao);"></span>
              </div>
              <div>
                <strong style="display: block; font-size: 14.5px; color: var(--texto); font-family: Sora, sans-serif;">Mesa de Apoio ao Cliente</strong>
                <span style="font-size: 12px; color: var(--verde); font-weight: 700;">Operadores disponíveis em Luanda</span>
              </div>
            </div>
            <button type="button" id="btn-limpar-chat-hist" class="btn btn-sm btn-claro" style="font-size: 12px; padding: 6px 12px;">
              Limpar conversa
            </button>
          </div>

          <!-- Lista de Mensagens com Rolagem -->
          <div id="chat-pagina-lista" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; max-height: 420px;">
            ${mensagens
              .map(
                (m) => `
              <div style="display: flex; flex-direction: column; align-items: ${m.autor === "cliente" ? "flex-end" : "flex-start"};">
                <div style="max-width: 82%; padding: 12px 16px; border-radius: ${m.autor === "cliente" ? "16px 16px 4px 16px" : "16px 16px 16px 4px"}; background: ${m.autor === "cliente" ? "linear-gradient(135deg, #0A2E60, #133D7A)" : "var(--cartao)"}; color: ${m.autor === "cliente" ? "#FFFFFF" : "var(--texto)"}; border: 1px solid ${m.autor === "cliente" ? "rgba(242, 200, 121, 0.35)" : "var(--borda)"}; box-shadow: 0 4px 12px rgba(0,0,0,0.06); font-size: 14px; line-height: 1.5;">
                  <div style="font-size: 11px; font-weight: 700; color: ${m.autor === "cliente" ? "var(--ouro-claro)" : "var(--ouro)"}; margin-bottom: 4px;">
                    ${m.nome}
                  </div>
                  <div>${m.texto}</div>
                  <div style="text-align: right; font-size: 10px; color: ${m.autor === "cliente" ? "rgba(255,255,255,0.6)" : "var(--suave)"}; margin-top: 4px;">
                    ${m.hora}
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <!-- Input de Envio de Mensagem -->
          <form id="form-chat-pagina" style="padding: 14px 18px; background: var(--cartao); border-top: 1px solid var(--borda); display: flex; gap: 10px;">
            <input type="text" id="input-chat-pagina-msg" placeholder="Escreva a sua dúvida ou pedido de apoio..." style="flex: 1; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--borda); background: var(--pagina); color: var(--texto); font-size: 14px; outline: none;" required />
            <button type="submit" class="btn btn-ouro" style="padding: 0 20px; font-size: 14px; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px;">
              <span>Enviar</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>

        <!-- Coluna Lateral de Temas Rápidos e Protocolos -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="background: var(--pagina); border: 1px solid var(--borda); border-radius: 18px; padding: 20px;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--texto); margin: 0 0 12px; font-family: Sora, sans-serif;">
              Dúvidas Mais Frequentes (Toque para perguntar)
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button type="button" class="sugestao-pill-suporte" data-msg="Qual o prazo de validação dos meus documentos KYC?" style="text-align: left; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--borda); background: var(--cartao); font-size: 12.5px; color: var(--texto); cursor: pointer; transition: all 0.2s;">
                📄 Qual o prazo de validação KYC?
              </button>
              <button type="button" class="sugestao-pill-suporte" data-msg="Como funciona a taxa de câmbio garantida por 90s?" style="text-align: left; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--borda); background: var(--cartao); font-size: 12.5px; color: var(--texto); cursor: pointer; transition: all 0.2s;">
                💱 Como funciona a cotação de 90s?
              </button>
              <button type="button" class="sugestao-pill-suporte" data-msg="Como enviar remessas bancárias para o exterior?" style="text-align: left; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--borda); background: var(--cartao); font-size: 12.5px; color: var(--texto); cursor: pointer; transition: all 0.2s;">
                ✈️ Envio de remessas para o exterior
              </button>
              <button type="button" class="sugestao-pill-suporte" data-msg="Como solicitar e usar o Cartão Visa Virtual?" style="text-align: left; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--borda); background: var(--cartao); font-size: 12.5px; color: var(--texto); cursor: pointer; transition: all 0.2s;">
                💳 Cartão Visa Internacional
              </button>
              <button type="button" class="sugestao-pill-suporte" data-msg="Quais são os limites diários e anuais definidos pelo BNA?" style="text-align: left; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--borda); background: var(--cartao); font-size: 12.5px; color: var(--texto); cursor: pointer; transition: all 0.2s;">
                🏛️ Limites operacionais e BNA
              </button>
            </div>
          </div>

          <div style="background: rgba(14, 143, 110, 0.1); border: 1px solid rgba(14, 143, 110, 0.25); border-radius: 18px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E8F6E" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <strong style="font-size: 13.5px; color: var(--verde);">Garantia Regulatória BNA</strong>
            </div>
            <p style="font-size: 12px; color: var(--suave); line-height: 1.5; margin: 0;">
              Todas as transações e comunicações da NZAIDI cumprem estritamente os requisitos de conformidade cambial do Banco Nacional de Angola.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function renderAbaFaq(): string {
    return `
      <div class="card p-large">
        <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--borda);">
          <h2 style="font-size: 22px; font-weight: 800; color: var(--texto); margin: 0 0 6px; font-family: Sora, sans-serif;">
            Perguntas Frequentes & Regulamentação
          </h2>
          <p style="font-size: 14px; color: var(--suave); margin: 0;">
            Respostas claras sobre cotações, remessas internacionais, segurança e regras cambiais.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${faqs
            .map(
              (f, i) => `
            <div style="border: 1px solid var(--borda); border-radius: 14px; background: var(--pagina); overflow: hidden; transition: all 0.2s;">
              <button type="button" class="faq-item-header" data-index="${i}" style="width: 100%; text-align: left; padding: 18px 22px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <strong style="font-size: 15px; color: var(--texto); font-family: Sora, sans-serif;">
                  ${f.pergunta}
                </strong>
                <span style="font-size: 18px; font-weight: 700; color: var(--ouro); transition: transform 0.2s; transform: ${faqAbertaIndex === i ? "rotate(180deg)" : "rotate(0deg)"};">
                  ▼
                </span>
              </button>
              ${
                faqAbertaIndex === i
                  ? `<div style="padding: 0 22px 20px; font-size: 14px; line-height: 1.6; color: var(--suave); border-top: 1px solid rgba(255,255,255,0.05);">
                      ${f.resposta}
                    </div>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderAbaTicket(): string {
    return `
      <div class="card p-large" style="max-width: 840px; margin: 0 auto;">
        ${
          ticketEnviado
            ? `
          <div style="text-align: center; padding: 40px 20px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(14, 143, 110, 0.15); color: var(--verde); display: grid; place-items: center; margin: 0 auto 20px; border: 2px solid var(--verde);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style="font-size: 22px; font-weight: 800; color: var(--texto); margin: 0 0 10px; font-family: Sora, sans-serif;">
              Pedido de Assistência Registado com Sucesso!
            </h3>
            <p style="font-size: 14.5px; color: var(--suave); max-width: 500px; margin: 0 auto 24px; line-height: 1.5;">
              O seu ticket foi atribuído à equipa técnica e de operações da NZAIDI. Receberá atualizações no portal e no correio eletrónico associado à sua conta.
            </p>
            <button type="button" id="btn-novo-ticket-outro" class="btn btn-ouro" style="padding: 12px 24px;">
              Submeter outro pedido
            </button>
          </div>
        `
            : `
          <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--borda);">
            <h2 style="font-size: 22px; font-weight: 800; color: var(--texto); margin: 0 0 6px; font-family: Sora, sans-serif;">
              Abertura de Pedido Formal / Ticket de Assistência
            </h2>
            <p style="font-size: 14px; color: var(--suave); margin: 0;">
              Submeta pedidos específicos para verificação de comprovativos, alteração de limites ou processos especiais.
            </p>
          </div>

          <form id="form-abrir-ticket" style="display: flex; flex-direction: column; gap: 20px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--ouro-claro); text-transform: uppercase; margin-bottom: 8px;">
                Categoria da Operação
              </label>
              <select id="ticket-cat" style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--borda); background: var(--pagina); color: var(--texto); font-size: 14px;">
                <option value="cambio">Compra e Venda de Moeda Estrangeira (Câmbio)</option>
                <option value="remessa">Transferências e Remessas para o Exterior</option>
                <option value="cartao">Cartões Visa Internacionais</option>
                <option value="kyc">Documentos e Validação Cadastral (KYC)</option>
                <option value="seguranca">Segurança da Conta, Senha e 2FA</option>
                <option value="outros">Outros Assuntos / Reclamações</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--ouro-claro); text-transform: uppercase; margin-bottom: 8px;">
                Assunto Resumido
              </label>
              <input type="text" id="ticket-assunto" placeholder="Ex: Comprovativo de remessa não confirmado" style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--borda); background: var(--pagina); color: var(--texto); font-size: 14px;" required />
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--ouro-claro); text-transform: uppercase; margin-bottom: 8px;">
                Descrição Detalhada do Pedido
              </label>
              <textarea id="ticket-desc" rows="5" placeholder="Descreva com o maior detalhe possível o que aconteceu, incluindo números de referência ou IBAN se aplicável..." style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--borda); background: var(--pagina); color: var(--texto); font-size: 14px; line-height: 1.5; resize: vertical;" required></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
              <button type="submit" class="btn btn-ouro" style="padding: 13px 28px; font-size: 15px;">
                Submeter Pedido à Mesa de Suporte
              </button>
            </div>
          </form>
        `
        }
      </div>
    `;
  }

  render();
}
