import { api } from "../api.js";
import { authState } from "../auth.state.js";

export function renderizarCentroSuporte(container: HTMLElement): void {
  let atendimentos: any[] = [];
  let atendimentoSelecionadoId: string | null = null;
  let mensagensAtendimento: any[] = [];
  let carregando = true;
  let enviandoMensagem = false;
  let modalNovoAberto = false;
  let pollingTimer: any = null;
  let anexoBase64: string | undefined = undefined;
  let anexoNome: string | undefined = undefined;
  let anexoTipo: string | undefined = undefined;

  async function carregarDados() {
    try {
      atendimentos = await api.listarAtendimentosSuporte();
      if (!atendimentoSelecionadoId && atendimentos.length > 0) {
        atendimentoSelecionadoId = atendimentos[0].id;
      }
      if (atendimentoSelecionadoId) {
        mensagensAtendimento = await api.listarMensagensSuporte(atendimentoSelecionadoId);
      }
    } catch (e) {
      console.error("Falha ao carregar suporte:", e);
    } finally {
      carregando = false;
      render();
    }
  }

  function renderizarBadgeEstado(estado: string): string {
    switch (estado) {
      case "pendente":
        return `<span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 700;">A aguardar operador</span>`;
      case "em_atendimento":
        return `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 700;">Em atendimento</span>`;
      case "resolvido":
        return `<span style="background: #e8f6ef; color: #0e8f6e; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 700;">Resolvido</span>`;
      case "encerrado":
        return `<span style="background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 700;">Encerrado</span>`;
      default:
        return "";
    }
  }

  function render() {
    const atual = atendimentos.find((a) => a.id === atendimentoSelecionadoId);

    container.innerHTML = `
      <div class="suporte-container" style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; height: calc(100vh - 140px); min-height: 550px;">
        <!-- Coluna Esquerda: Lista de Conversas -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden;">
          <div style="padding: 1.25rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="font-size: 1.15rem; font-weight: 800; color: #08264F; margin: 0;">Centro de Suporte</h2>
              <div style="font-size: 0.75rem; color: #64748b;">Atendimento ao cliente NZAIDI</div>
            </div>
            <button id="btn-novo-atendimento" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem; background: #08264F;">
              + Nova conversa
            </button>
          </div>

          <div style="flex: 1; overflow-y: auto; padding: 0.5rem;">
            ${atendimentos.length === 0 ? `
              <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8; font-size: 0.85rem;">
                Ainda não tem conversas de suporte abertas.<br/>Clique em "+ Nova conversa" para iniciar.
              </div>
            ` : atendimentos.map((a) => `
              <div class="item-atendimento ${a.id === atendimentoSelecionadoId ? 'ativo' : ''}" data-id="${a.id}" style="padding: 12px; border-radius: 10px; margin-bottom: 6px; cursor: pointer; border: 1px solid ${a.id === atendimentoSelecionadoId ? '#d9a441' : '#f1f5f9'}; background: ${a.id === atendimentoSelecionadoId ? '#fefce8' : '#ffffff'}; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                  <strong style="font-size: 0.85rem; color: #08264F; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${a.assunto}
                  </strong>
                  ${renderizarBadgeEstado(a.estado)}
                </div>
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">
                  ${a.operadorNome ? `Operador: <strong>${a.operadorNome}</strong>` : 'A aguardar atribuição'}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94a3b8;">
                  <span>${new Date(a.atualizadoEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  ${a.mensagensNaoLidas > 0 ? `<span style="background: #b42318; color: #ffffff; padding: 1px 6px; border-radius: 99px; font-weight: 700; font-size: 0.65rem;">${a.mensagensNaoLidas} nova(s)</span>` : ''}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Coluna Direita: Janela do Chat -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden;">
          ${!atual ? `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <p style="margin-top: 1rem; font-size: 0.95rem;">Selecione uma conversa à esquerda ou inicie uma nova.</p>
            </div>
          ` : `
            <!-- Topo do Chat -->
            <div style="padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fafbfc;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #08264F; margin: 0;">${atual.assunto}</h3>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                  Categoria: <strong>${atual.categoria.toUpperCase()}</strong> • Responsável: <strong>${atual.operadorNome || "Equipa de Apoio NZAIDI"}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${renderizarBadgeEstado(atual.estado)}
                <button id="btn-atualizar-chat" class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.75rem;" title="Atualizar mensagens">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
              </div>
            </div>

            <!-- Feed de Mensagens -->
            <div id="feed-mensagens-suporte" style="flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; background: #f8fafc;">
              ${mensagensAtendimento.map((m) => {
                const souEu = m.remetenteTipo === "cliente";
                const ehSistema = m.remetenteTipo === "sistema";

                if (ehSistema) {
                  return `
                    <div style="text-align: center; margin: 8px 0;">
                      <span style="display: inline-block; background: #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 99px; font-size: 0.7rem; font-weight: 600;">
                        ${m.mensagem}
                      </span>
                    </div>
                  `;
                }

                return `
                  <div style="display: flex; flex-direction: column; align-items: ${souEu ? 'flex-end' : 'flex-start'};">
                    <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 2px;">
                      ${souEu ? 'Você' : `Atendimento: ${m.remetenteNome}`} • ${new Date(m.criadoEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style="max-width: 75%; background: ${souEu ? '#08264F' : '#ffffff'}; color: ${souEu ? '#ffffff' : '#08264F'}; padding: 12px 16px; border-radius: 14px; border: ${souEu ? 'none' : '1px solid #e2e8f0'}; box-shadow: 0 2px 6px rgba(0,0,0,0.03); font-size: 0.9rem; line-height: 1.4;">
                      ${m.mensagem}

                      ${m.anexoBase64 ? `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${souEu ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}; font-size: 0.75rem;">
                          <a href="${m.anexoBase64}" download="${m.anexoNome || 'anexo'}" style="color: ${souEu ? '#fde047' : '#0369a1'}; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            ${m.anexoNome || 'Descarregar Anexo'}
                          </a>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>

            <!-- Formulário de Envio -->
            <form id="form-enviar-mensagem-suporte" style="padding: 1rem 1.5rem; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px;">
              ${anexoNome ? `
                <div style="display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; color: #08264F; width: fit-content;">
                  <span>Anexo: ${anexoNome}</span>
                  <button type="button" id="btn-remover-anexo" style="border: 0; background: transparent; cursor: pointer; color: #b42318;">×</button>
                </div>
              ` : ''}

              <div style="display: flex; gap: 8px; align-items: center;">
                <label for="input-file-anexo" style="cursor: pointer; padding: 8px; border-radius: 8px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0;" title="Anexar documento ou imagem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </label>
                <input type="file" id="input-file-anexo" style="display: none;" accept="image/png,image/jpeg,application/pdf" />

                <input type="text" id="input-texto-mensagem" placeholder="Escreva a sua mensagem para o operador..." style="flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem;" required autocomplete="off" />

                <button type="submit" class="btn btn-primary" style="padding: 10px 18px; background: #08264F; border-radius: 10px;" ${enviandoMensagem ? 'disabled' : ''}>
                  Enviar
                </button>
              </div>
            </form>
          `}
        </div>

        <!-- Modal Iniciar Novo Atendimento -->
        ${modalNovoAberto ? `
          <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(8,38,79,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
            <div class="modal-card" style="background: #ffffff; border-radius: 16px; padding: 2rem; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #08264F; margin: 0 0 0.5rem;">Iniciar Atendimento de Suporte</h3>
              <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1.25rem;">
                A nossa equipa técnica e de conformidade responderá através desta conversa em tempo real.
              </p>

              <form id="form-criar-atendimento">
                <div class="form-group" style="margin-bottom: 1rem;">
                  <label class="form-label" for="novo-assunto" style="font-weight: 700;">Assunto da solicitação</label>
                  <input type="text" id="novo-assunto" class="form-input" placeholder="Ex: Dúvida sobre liquidação cambial" required />
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                  <label class="form-label" for="nova-categoria" style="font-weight: 700;">Categoria</label>
                  <select id="nova-categoria" class="form-input" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;">
                    <option value="duvida">Dúvida Geral</option>
                    <option value="cambio">Operação Cambial</option>
                    <option value="remessa">Remessa Internacional</option>
                    <option value="cartao">Cartões Virtuais</option>
                    <option value="kyc">Documentação e Validação KYC</option>
                    <option value="reclamacao">Reclamação ou Alerta</option>
                    <option value="outro">Outro assunto</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 1.25rem;">
                  <label class="form-label" for="nova-mensagem" style="font-weight: 700;">Mensagem inicial</label>
                  <textarea id="nova-mensagem" class="form-input" rows="4" placeholder="Descreva em detalhe a sua dúvida ou necessidade..." required style="width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-family: inherit;"></textarea>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                  <button type="button" id="btn-cancelar-novo" class="btn btn-secondary">Cancelar</button>
                  <button type="submit" class="btn btn-primary" style="background: #08264F;">Iniciar Conversa</button>
                </div>
              </form>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    vincularEventos();
  }

  function vincularEventos() {
    // Seleção de atendimento
    container.querySelectorAll(".item-atendimento").forEach((el) => {
      el.addEventListener("click", async () => {
        const id = el.getAttribute("data-id");
        if (id && id !== atendimentoSelecionadoId) {
          atendimentoSelecionadoId = id;
          carregando = true;
          render();
          mensagensAtendimento = await api.listarMensagensSuporte(id);
          carregando = false;
          render();
          const feed = container.querySelector("#feed-mensagens-suporte");
          if (feed) feed.scrollTop = feed.scrollHeight;
        }
      });
    });

    // Botão novo atendimento
    container.querySelector("#btn-novo-atendimento")?.addEventListener("click", () => {
      modalNovoAberto = true;
      render();
    });

    container.querySelector("#btn-cancelar-novo")?.addEventListener("click", () => {
      modalNovoAberto = false;
      render();
    });

    // Submissão do novo atendimento
    container.querySelector("#form-criar-atendimento")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const assunto = (container.querySelector("#novo-assunto") as HTMLInputElement).value;
      const categoria = (container.querySelector("#nova-categoria") as HTMLSelectElement).value;
      const mensagemInicial = (container.querySelector("#nova-mensagem") as HTMLTextAreaElement).value;

      try {
        const res = await api.criarAtendimentoSuporte({
          assunto,
          categoria,
          mensagemInicial,
        });
        modalNovoAberto = false;
        atendimentoSelecionadoId = res.atendimento.id;
        await carregarDados();
      } catch (err: any) {
        alert("Erro ao criar atendimento: " + (err.message || "Tente novamente."));
      }
    });

    // Anexo de arquivo
    const fileInput = container.querySelector("#input-file-anexo") as HTMLInputElement;
    fileInput?.addEventListener("change", (e: any) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 3_000_000) {
        alert("O anexo não pode exceder 3 MB.");
        return;
      }
      anexoNome = f.name;
      anexoTipo = f.type;
      const reader = new FileReader();
      reader.onload = () => {
        anexoBase64 = reader.result as string;
        render();
      };
      reader.readAsDataURL(f);
    });

    container.querySelector("#btn-remover-anexo")?.addEventListener("click", () => {
      anexoNome = undefined;
      anexoBase64 = undefined;
      anexoTipo = undefined;
      render();
    });

    // Enviar mensagem
    container.querySelector("#form-enviar-mensagem-suporte")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!atendimentoSelecionadoId) return;

      const inputTexto = container.querySelector("#input-texto-mensagem") as HTMLInputElement;
      const texto = inputTexto.value.trim();
      if (!texto) return;

      try {
        enviandoMensagem = true;
        render();
        const payloadMsg: any = { mensagem: texto };
        if (anexoNome) payloadMsg.anexoNome = anexoNome;
        if (anexoTipo) payloadMsg.anexoTipo = anexoTipo;
        if (anexoBase64) payloadMsg.anexoBase64 = anexoBase64;
        await api.enviarMensagemSuporte(atendimentoSelecionadoId, payloadMsg);
        anexoNome = undefined;
        anexoBase64 = undefined;
        anexoTipo = undefined;
        mensagensAtendimento = await api.listarMensagensSuporte(atendimentoSelecionadoId);
      } catch (err: any) {
        alert("Erro ao enviar mensagem: " + err.message);
      } finally {
        enviandoMensagem = false;
        render();
        const feed = container.querySelector("#feed-mensagens-suporte");
        if (feed) feed.scrollTop = feed.scrollHeight;
      }
    });

    // Atualizar chat
    container.querySelector("#btn-atualizar-chat")?.addEventListener("click", async () => {
      if (atendimentoSelecionadoId) {
        mensagensAtendimento = await api.listarMensagensSuporte(atendimentoSelecionadoId);
        render();
      }
    });
  }

  carregarDados();
}
