import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export async function renderizarNotificacoes(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Centro de Notificações & Alertas</h1>
        <p class="view-subtitle">Avisos do sistema, alertas de conformidade regulamentar, limites de caixa e eventos críticos.</p>
      </div>
      <div class="view-actions" style="display: flex; gap: 10px;">
        <button id="btn-marcar-todas-lidas" class="btn btn-secondary" type="button">
          Marcar Todas como Lidas
        </button>
        <button id="btn-recarregar-notifs" class="btn btn-primary" type="button">
          Actualizar Notificações
        </button>
      </div>
    </div>

    <!-- Filtros de Notificação -->
    <div class="card mb-4">
      <div class="card-body" style="padding: 16px;">
        <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
          <div>
            <select id="filtro-categoria-notif" class="form-control">
              <option value="">Todas as Categorias</option>
              <option value="kyc">KYC & Diligência</option>
              <option value="cambio">Operações de Câmbio</option>
              <option value="remessa">Remessas de Valores</option>
              <option value="caixa">Tesouraria & Caixa</option>
              <option value="seguranca">Segurança & Autenticação</option>
              <option value="sistema">Sistema & Plataforma</option>
            </select>
          </div>
          <div>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
              <input type="checkbox" id="filtro-apenas-nao-lidas" />
              Apenas notificações não lidas
            </label>
          </div>
          <span id="contador-notifs-badge" class="badge" style="margin-left: auto; background: #e2e8f0; color: #475569;">0 notificações</span>
        </div>
      </div>
    </div>

    <!-- Lista de Notificações -->
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div id="lista-notificacoes-container" style="display: flex; flex-direction: column;">
          <div class="loading-state" style="padding: 32px; text-align: center;">A carregar notificações...</div>
        </div>
      </div>
    </div>
  `;

  let apenasNaoLidas = false;
  let categoriaFiltro = "";

  async function carregarLista(): Promise<void> {
    const box = container.querySelector<HTMLElement>("#lista-notificacoes-container");
    const contador = container.querySelector<HTMLElement>("#contador-notifs-badge");
    if (!box) return;

    box.innerHTML = `<div class="loading-state" style="padding: 32px; text-align: center;">A carregar notificações...</div>`;

    try {
      const res = await api.listarNotificacoes(apenasNaoLidas, categoriaFiltro);
      const lista = res.itens || [];

      if (contador) contador.textContent = `${lista.length} notificações (${res.totalNaoLidas} não lidas)`;

      if (lista.length === 0) {
        box.innerHTML = `
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="margin-bottom: 12px; color: #94a3b8;">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <div style="font-size: 15px; font-weight: 600;">Sem notificações no momento</div>
            <p style="font-size: 13px; margin: 4px 0 0 0;">Não existem alertas pendentes com os filtros selecionados.</p>
          </div>
        `;
        return;
      }

      box.innerHTML = lista.map((n: any) => `
        <div class="notificacao-row ${n.lida ? 'lida' : 'nao-lida'}" style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 16px; align-items: flex-start; background: ${n.lida ? '#ffffff' : '#f8fafc'}; transition: background 0.2s;">
          <div style="margin-top: 2px;">
            <span class="dot-prioridade prioridade-${n.prioridade}" style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; background: ${n.prioridade === 'critica' || n.prioridade === 'alta' ? '#ef4444' : '#3b82f6'};"></span>
          </div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge badge-info" style="font-size: 10px; text-transform: uppercase;">${escapeHtml(n.categoria)}</span>
                <strong style="color: #031d42; font-size: 14px;">${escapeHtml(n.titulo)}</strong>
              </div>
              <span class="text-muted" style="font-size: 12px;">${new Date(n.criadoEm).toLocaleString("pt-AO")}</span>
            </div>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">${escapeHtml(n.mensagem)}</p>
            <div style="display: flex; gap: 12px; align-items: center;">
              ${n.linkAcao ? `
                <a href="${escapeHtml(n.linkAcao)}" class="btn-link-sm" style="font-size: 12px;">Abrir Registo Directo &rarr;</a>
              ` : ''}
              ${!n.lida ? `
                <button class="btn-link-sm btn-marcar-lida" data-id="${n.id}" type="button" style="font-size: 12px; color: var(--text-muted); cursor: pointer; background: none; border: none; padding: 0;">
                  Marcar como lida
                </button>
              ` : `
                <span class="text-muted" style="font-size: 11px;">Lida</span>
              `}
            </div>
          </div>
        </div>
      `).join("");

      box.querySelectorAll<HTMLButtonElement>(".btn-marcar-lida").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (id) {
            await api.marcarNotificacaoLida(id);
            void carregarLista();
          }
        });
      });
    } catch {
      box.innerHTML = `<div class="alert-box alert-error">Erro ao carregar lista de notificações.</div>`;
    }
  }

  // Eventos
  container.querySelector("#btn-marcar-todas-lidas")?.addEventListener("click", async () => {
    await api.marcarTodasNotificacoesLidas();
    void carregarLista();
  });

  container.querySelector("#btn-recarregar-notifs")?.addEventListener("click", () => {
    void carregarLista();
  });

  const checkNaoLidas = container.querySelector<HTMLInputElement>("#filtro-apenas-nao-lidas");
  checkNaoLidas?.addEventListener("change", () => {
    apenasNaoLidas = checkNaoLidas.checked;
    void carregarLista();
  });

  const selectCat = container.querySelector<HTMLSelectElement>("#filtro-categoria-notif");
  selectCat?.addEventListener("change", () => {
    categoriaFiltro = selectCat.value;
    void carregarLista();
  });

  void carregarLista();
}
