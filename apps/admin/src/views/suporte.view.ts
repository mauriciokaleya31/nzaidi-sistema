import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { mostrarToast } from "../components/modal-dialogo.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto || "";
  return div.innerHTML;
}

export async function renderizarSuporteAdmin(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  let filtroEstado: string = "";
  let atendimentos: any[] = [];
  let atendimentoSelecionado: any = null;
  let mensagensAtendimento: any[] = [];
  let operadores: any[] = [];
  let intervaloAtualizacao: any = null;

  async function carregarDados() {
    try {
      const [lista, listaOps] = await Promise.all([
        api.listarAtendimentosSuporte(filtroEstado ? { estado: filtroEstado } : undefined),
        api.listarOperadoresSuporte(),
      ]);
      atendimentos = lista;
      operadores = listaOps;

      if (atendimentoSelecionado) {
        const atual = atendimentos.find((a) => a.id === atendimentoSelecionado.id);
        if (atual) {
          atendimentoSelecionado = atual;
        }
        await carregarMensagens(atendimentoSelecionado.id, false);
      }
    } catch (e: any) {
      mostrarToast(e.message || "Falha ao carregar atendimentos de suporte", "erro");
    }
  }

  async function carregarMensagens(atendimentoId: string, rolar: boolean = true) {
    try {
      mensagensAtendimento = await api.listarMensagensSuporteAdmin(atendimentoId);
      renderizarPainelMensagens();
      if (rolar) {
        const box = document.getElementById("admin-mensagens-scroll");
        if (box) box.scrollTop = box.scrollHeight;
      }
    } catch {}
  }

  function render() {
    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 20px;">
        <div>
          <h1 class="view-title" style="color: #08264F; font-size: 1.5rem; font-weight: 800;">Centro de Atendimento e Suporte</h1>
          <p class="view-subtitle" style="color: #64748b; font-size: 0.9rem;">Fila de pedidos dos clientes, chat em tempo real e resolução de ocorrências.</p>
        </div>
        <div class="view-actions">
          <button id="btn-atualizar-suporte" class="btn btn-secondary" type="button" style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Actualizar Fila</span>
          </button>
        </div>
      </div>

      <!-- Filtros Rápidos de Estado -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn-filtro-estado ${filtroEstado === "" ? "ativo" : ""}" data-estado="" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: ${filtroEstado === "" ? "#08264F" : "#ffffff"}; color: ${filtroEstado === "" ? "#ffffff" : "#475569"}; font-weight: 600; cursor: pointer;">Todos (${atendimentos.length})</button>
        <button class="btn-filtro-estado ${filtroEstado === "pendente" ? "ativo" : ""}" data-estado="pendente" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #fed7aa; background: ${filtroEstado === "pendente" ? "#ea580c" : "#fff7ed"}; color: ${filtroEstado === "pendente" ? "#ffffff" : "#c2410c"}; font-weight: 600; cursor: pointer;">Pendentes</button>
        <button class="btn-filtro-estado ${filtroEstado === "em_atendimento" ? "ativo" : ""}" data-estado="em_atendimento" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #bfdbfe; background: ${filtroEstado === "em_atendimento" ? "#2563eb" : "#eff6ff"}; color: ${filtroEstado === "em_atendimento" ? "#ffffff" : "#1d4ed8"}; font-weight: 600; cursor: pointer;">Em Atendimento</button>
        <button class="btn-filtro-estado ${filtroEstado === "resolvido" ? "ativo" : ""}" data-estado="resolvido" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #bbf7d0; background: ${filtroEstado === "resolvido" ? "#16a34a" : "#f0fdf4"}; color: ${filtroEstado === "resolvido" ? "#ffffff" : "#15803d"}; font-weight: 600; cursor: pointer;">Resolvidos</button>
        <button class="btn-filtro-estado ${filtroEstado === "encerrado" ? "ativo" : ""}" data-estado="encerrado" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: ${filtroEstado === "encerrado" ? "#64748b" : "#f8fafc"}; color: ${filtroEstado === "encerrado" ? "#ffffff" : "#64748b"}; font-weight: 600; cursor: pointer;">Encerrados</button>
      </div>

      <!-- Layout Dividido: Fila à Esquerda, Detalhes e Chat à Direita -->
      <div style="display: grid; grid-template-columns: 380px 1fr; gap: 20px; min-height: 600px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03); overflow: hidden;">
        
        <!-- Coluna Esquerda: Lista de Atendimentos -->
        <div style="border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; background: #f8fafc;">
          <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
            <input type="text" id="busca-suporte-input" placeholder="Pesquisar por assunto ou cliente..." style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem;" />
          </div>

          <div id="lista-atendimentos-admin" style="flex: 1; overflow-y: auto; max-height: 650px;">
            ${renderizarListaAtendimentos()}
          </div>
        </div>

        <!-- Coluna Direita: Conversa e Painel de Operações -->
        <div id="painel-conversa-admin" style="display: flex; flex-direction: column; background: #ffffff;">
          ${renderizarConteudoConversa()}
        </div>

      </div>
    `;

    vincularEventos();
  }

  function renderizarListaAtendimentos(): string {
    if (atendimentos.length === 0) {
      return `
        <div style="padding: 40px 20px; text-align: center; color: #94a3b8;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="40" height="40" style="margin-bottom: 10px; opacity: 0.6;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <div style="font-weight: 600; font-size: 0.9rem;">Nenhum pedido encontrado</div>
          <p style="font-size: 0.8rem; margin-top: 4px;">Não há atendimentos para o filtro selecionado.</p>
        </div>
      `;
    }

    return atendimentos
      .map((item) => {
        const selecionado = atendimentoSelecionado?.id === item.id;
        let badgeCor = "#ea580c";
        let badgeBg = "#fff7ed";
        let estadoLabel = "Pendente";

        if (item.estado === "em_atendimento") {
          badgeCor = "#2563eb";
          badgeBg = "#eff6ff";
          estadoLabel = "Em Atendimento";
        } else if (item.estado === "resolvido") {
          badgeCor = "#16a34a";
          badgeBg = "#f0fdf4";
          estadoLabel = "Resolvido";
        } else if (item.estado === "encerrado") {
          badgeCor = "#64748b";
          badgeBg = "#f1f5f9";
          estadoLabel = "Encerrado";
        }

        const dataFormatada = new Date(item.criado_em).toLocaleDateString("pt-AO", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
          <div class="card-ticket-admin ${selecionado ? "selecionado" : ""}" data-id="${item.id}" style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; background: ${selecionado ? "#f1f5f9" : "#ffffff"}; border-left: ${selecionado ? "4px solid #08264F" : "4px solid transparent"}; transition: all 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #08264F;">#${escapeHtml(item.numero_protocolo || item.id.substring(0, 8))}</span>
              <span style="font-size: 0.7rem; font-weight: 700; color: ${badgeCor}; background: ${badgeBg}; padding: 2px 8px; border-radius: 99px;">${estadoLabel}</span>
            </div>
            <div style="font-weight: 700; color: #0f172a; font-size: 0.9rem; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.assunto)}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #64748b;">
              <span>${escapeHtml(item.cliente_nome || "Cliente")}</span>
              <span>${dataFormatada}</span>
            </div>
            <div style="margin-top: 6px; font-size: 0.7rem; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>Operador: <strong>${escapeHtml(item.operador_nome || "Por atribuir")}</strong></span>
              <span style="text-transform: capitalize;">${escapeHtml(item.categoria)}</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderizarConteudoConversa(): string {
    if (!atendimentoSelecionado) {
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; padding: 40px;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: #f8fafc; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h3 style="font-size: 1.1rem; color: #08264F; font-weight: 700; margin-bottom: 6px;">Selecione um Atendimento</h3>
          <p style="font-size: 0.85rem; max-width: 320px; text-align: center;">Escolha um pedido de suporte na fila à esquerda para visualizar as mensagens e interagir com o cliente.</p>
        </div>
      `;
    }

    const item = atendimentoSelecionado;
    const souOperador = usuario && item.operador_id === usuario.id;

    return `
      <!-- Cabeçalho do Atendimento -->
      <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 style="font-size: 1.15rem; font-weight: 800; color: #08264F; margin: 0;">${escapeHtml(item.assunto)}</h2>
            <span style="font-size: 0.75rem; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 6px; font-weight: 600;">#${escapeHtml(item.numero_protocolo || item.id.substring(0, 8))}</span>
          </div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">
            Cliente: <strong style="color: #0f172a;">${escapeHtml(item.cliente_nome || "Cliente")}</strong> (${escapeHtml(item.cliente_email || "")}) · Categoria: <strong>${escapeHtml(item.categoria)}</strong>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          ${
            !souOperador && item.estado !== "encerrado"
              ? `<button id="btn-admin-assumir" class="btn btn-primary" type="button" style="padding: 6px 12px; font-size: 0.8rem;">Assumir Atendimento</button>`
              : ""
          }

          ${
            item.estado !== "encerrado"
              ? `
            <div style="display: flex; align-items: center; gap: 4px;">
              <select id="select-transferir-operador" class="form-control" style="padding: 6px 10px; font-size: 0.8rem; min-width: 140px;">
                <option value="">Transferir para...</option>
                ${operadores
                  .filter((op) => op.id !== item.operador_id)
                  .map((op) => `<option value="${op.id}">${escapeHtml(op.nome)}</option>`)
                  .join("")}
              </select>
              <button id="btn-admin-transferir" class="btn btn-secondary" type="button" style="padding: 6px 12px; font-size: 0.8rem;">Transferir</button>
            </div>
            `
              : ""
          }

          ${
            item.estado !== "resolvido" && item.estado !== "encerrado"
              ? `<button id="btn-admin-marcar-resolvido" class="btn btn-success" type="button" style="padding: 6px 12px; font-size: 0.8rem; background: #16a34a; color: #ffffff; border: 0; border-radius: 6px;">Marcar Resolvido</button>`
              : ""
          }

          ${
            item.estado !== "encerrado"
              ? `<button id="btn-admin-encerrar" class="btn btn-secondary" type="button" style="padding: 6px 12px; font-size: 0.8rem; color: #dc2626; border-color: #fecaca;">Encerrar</button>`
              : `<span style="font-size: 0.8rem; color: #64748b; font-weight: 700; background: #f1f5f9; padding: 6px 12px; border-radius: 6px;">Atendimento Encerrado</span>`
          }
        </div>
      </div>

      <!-- Área de Mensagens (Scrollável) -->
      <div id="admin-mensagens-scroll" style="flex: 1; padding: 20px; overflow-y: auto; max-height: 480px; display: flex; flex-direction: column; gap: 14px; background: #fafafa;">
        ${renderizarBalõesMensagens()}
      </div>

      <!-- Barra de Envio de Resposta -->
      ${
        item.estado !== "encerrado"
          ? `
        <div style="padding: 16px 20px; border-top: 1px solid #e2e8f0; background: #ffffff;">
          <form id="form-resposta-admin" style="display: flex; flex-direction: column; gap: 10px;">
            <textarea id="texto-resposta-admin" rows="3" placeholder="Escreva aqui a sua resposta para o cliente..." required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 0.85rem; resize: none;"></textarea>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 0.75rem; color: #94a3b8;">
                O cliente receberá uma notificação instantânea e poderá responder pelo portal.
              </div>
              <button type="submit" id="btn-enviar-resposta-admin" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                <span>Enviar Resposta</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
              </button>
            </div>
          </form>
        </div>
      `
          : ""
      }
    `;
  }

  function renderizarBalõesMensagens(): string {
    if (mensagensAtendimento.length === 0) {
      return `<div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 0.85rem;">A carregar histórico da conversa...</div>`;
    }

    return mensagensAtendimento
      .map((msg) => {
        const ehOperador = msg.remetente_tipo === "operador" || msg.remetente_tipo === "admin";
        const hora = new Date(msg.criado_em).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        return `
          <div style="display: flex; flex-direction: column; align-items: ${ehOperador ? "flex-end" : "flex-start"}; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 0.7rem; color: #64748b;">
              <strong>${escapeHtml(msg.remetente_nome || (ehOperador ? "Operador NZAIDI" : "Cliente"))}</strong>
              <span>${hora}</span>
            </div>
            <div style="max-width: 75%; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; line-height: 1.4; word-break: break-word; background: ${
              ehOperador ? "#08264F" : "#ffffff"
            }; color: ${ehOperador ? "#ffffff" : "#0f172a"}; border: ${
              ehOperador ? "none" : "1px solid #e2e8f0"
            }; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
              ${escapeHtml(msg.mensagem)}
              ${
                msg.anexo_url
                  ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${ehOperador ? "rgba(255,255,255,0.2)" : "#e2e8f0"}; font-size: 0.75rem;">
                  <a href="${msg.anexo_url}" target="_blank" style="color: ${ehOperador ? "#F2C879" : "#08264F"}; text-decoration: underline; font-weight: 600;">Ver anexo em anexo</a>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderizarPainelMensagens() {
    const el = document.getElementById("admin-mensagens-scroll");
    if (el) {
      el.innerHTML = renderizarBalõesMensagens();
    }
  }

  function vincularEventos() {
    // Filtros de estado
    container.querySelectorAll(".btn-filtro-estado").forEach((btn) => {
      btn.addEventListener("click", async () => {
        filtroEstado = btn.getAttribute("data-estado") || "";
        await carregarDados();
        render();
      });
    });

    // Actualizar Lista
    container.querySelector("#btn-atualizar-suporte")?.addEventListener("click", async () => {
      await carregarDados();
      render();
      mostrarToast("Fila de suporte actualizada", "sucesso");
    });

    // Selecionar Ticket
    container.querySelectorAll(".card-ticket-admin").forEach((card) => {
      card.addEventListener("click", async () => {
        const id = card.getAttribute("data-id");
        if (id) {
          atendimentoSelecionado = atendimentos.find((a) => a.id === id) || null;
          render();
          if (atendimentoSelecionado) {
            await carregarMensagens(atendimentoSelecionado.id, true);
          }
        }
      });
    });

    // Assumir Atendimento
    container.querySelector("#btn-admin-assumir")?.addEventListener("click", async () => {
      if (!atendimentoSelecionado) return;
      try {
        await api.assumirAtendimentoSuporte(atendimentoSelecionado.id);
        mostrarToast("Atendimento atribuído a si com sucesso!", "sucesso");
        await carregarDados();
        render();
      } catch (err: any) {
        mostrarToast(err.message || "Erro ao assumir atendimento", "erro");
      }
    });

    // Transferir Atendimento
    container.querySelector("#btn-admin-transferir")?.addEventListener("click", async () => {
      if (!atendimentoSelecionado) return;
      const select = container.querySelector("#select-transferir-operador") as HTMLSelectElement | null;
      const novoOpId = select?.value;
      if (!novoOpId) {
        mostrarToast("Por favor selecione o operador de destino", "aviso");
        return;
      }
      try {
        await api.transferirAtendimentoSuporte(atendimentoSelecionado.id, novoOpId, "Transferência administrativa");
        mostrarToast("Atendimento transferido com sucesso!", "sucesso");
        await carregarDados();
        render();
      } catch (err: any) {
        mostrarToast(err.message || "Erro ao transferir atendimento", "erro");
      }
    });

    // Marcar como Resolvido
    container.querySelector("#btn-admin-marcar-resolvido")?.addEventListener("click", async () => {
      if (!atendimentoSelecionado) return;
      try {
        await api.atualizarEstadoSuporte(atendimentoSelecionado.id, "resolvido", "Resolvido pelo suporte operacional");
        mostrarToast("Atendimento marcado como resolvido!", "sucesso");
        await carregarDados();
        render();
      } catch (err: any) {
        mostrarToast(err.message || "Erro ao atualizar atendimento", "erro");
      }
    });

    // Encerrar Atendimento
    container.querySelector("#btn-admin-encerrar")?.addEventListener("click", async () => {
      if (!atendimentoSelecionado) return;
      if (!confirm("Tem a certeza de que deseja encerrar este atendimento?")) return;
      try {
        await api.atualizarEstadoSuporte(atendimentoSelecionado.id, "encerrado", "Encerrado pelo operador");
        mostrarToast("Atendimento encerrado com sucesso!", "sucesso");
        await carregarDados();
        render();
      } catch (err: any) {
        mostrarToast(err.message || "Erro ao encerrar atendimento", "erro");
      }
    });

    // Enviar Resposta
    const formResp = container.querySelector("#form-resposta-admin") as HTMLFormElement | null;
    formResp?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!atendimentoSelecionado) return;

      const textarea = container.querySelector("#texto-resposta-admin") as HTMLTextAreaElement | null;
      const msg = textarea?.value.trim() || "";
      if (!msg) return;

      const btnSubmit = container.querySelector("#btn-enviar-resposta-admin") as HTMLButtonElement | null;
      if (btnSubmit) btnSubmit.disabled = true;

      try {
        await api.enviarMensagemSuporteAdmin(atendimentoSelecionado.id, { mensagem: msg });
        if (textarea) textarea.value = "";
        await carregarMensagens(atendimentoSelecionado.id, true);
        mostrarToast("Resposta enviada com sucesso ao cliente!", "sucesso");
      } catch (err: any) {
        mostrarToast(err.message || "Falha ao enviar resposta", "erro");
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
      }
    });
  }

  await carregarDados();
  render();

  // Polling leve para novas mensagens se tiver um atendimento selecionado
  if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
  intervaloAtualizacao = setInterval(() => {
    if (atendimentoSelecionado && atendimentoSelecionado.estado !== "encerrado") {
      carregarMensagens(atendimentoSelecionado.id, false);
    }
  }, 5000);
}
