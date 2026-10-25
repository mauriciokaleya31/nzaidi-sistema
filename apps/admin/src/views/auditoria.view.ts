import { api, type EventoAuditoria } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export async function renderizarAuditoria(container: HTMLElement): Promise<void> {
  if (!authState.temPermissao("auditoria:consultar")) {
    container.innerHTML = `
      <div class="alert-box alert-error">
        <strong>Acesso Negado:</strong> O seu perfil de utilizador não tem autorização para aceder à Pista de Auditoria Regulatória.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Pista de Auditoria Regulatória</h1>
        <p class="view-subtitle">Registo imutável de todas as acções administrativas e operacionais (Conformidade BNA)</p>
      </div>
      <div class="view-actions">
        <button id="btn-recarregar-auditoria" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Actualizar Registos
        </button>
      </div>
    </div>

    <div class="alert-box alert-info">
      <strong>Garantia de Não-Repúdio:</strong> Os eventos apresentados abaixo são gravados atomicamente no banco de dados com carimbo de tempo, perfil do operador e endereço IP de origem.
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Últimos Eventos Registados (Máx. 50)</h2>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive" id="tabela-auditoria-container">
          <div class="loading-state">A carregar registos de auditoria...</div>
        </div>
      </div>
    </div>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-auditoria-container");
  const btnRecarregar = container.querySelector<HTMLButtonElement>("#btn-recarregar-auditoria");

  async function carregarAuditoria(): Promise<void> {
    if (!containerTabela) return;
    containerTabela.innerHTML = `<div class="loading-state">A carregar registos de auditoria...</div>`;

    try {
      const eventos: EventoAuditoria[] = await api.listarAuditoria(50);
      if (!eventos || eventos.length === 0) {
        containerTabela.innerHTML = `<p class="p-4 text-muted">Nenhum registo de auditoria encontrado.</p>`;
        return;
      }

      containerTabela.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Data & Hora</th>
              <th>Operador</th>
              <th>Perfil</th>
              <th>Acção</th>
              <th>Recurso</th>
              <th>Detalhes</th>
              <th>IP Origem</th>
            </tr>
          </thead>
          <tbody>
            ${eventos
              .map((ev) => {
                let detalhesFormatados = "-";
                if (ev.detalhesJson) {
                  try {
                    const parsed = JSON.parse(ev.detalhesJson);
                    detalhesFormatados = `<code>${JSON.stringify(parsed, null, 1)}</code>`;
                  } catch {
                    detalhesFormatados = `<code>${ev.detalhesJson}</code>`;
                  }
                }

                return `
                  <tr>
                    <td><small class="text-nowrap">${new Date(ev.momento).toLocaleString("pt-AO")}</small></td>
                    <td><strong>${ev.autorNome ?? ev.autorId ?? "Sistema"}</strong></td>
                    <td>
                      <span class="badge ${
                        ev.autorFuncao === "gestao"
                          ? "badge-gestao"
                          : ev.autorFuncao === "compliance"
                          ? "badge-compliance"
                          : ev.autorFuncao === "tesouraria"
                          ? "badge-tesouraria"
                          : "badge-atendente"
                      }">
                        ${ev.autorFuncao ?? "sistema"}
                      </span>
                    </td>
                    <td><span class="badge badge-action">${ev.acao}</span></td>
                    <td><code>${ev.recurso}${ev.recursoId ? `:${ev.recursoId}` : ""}</code></td>
                    <td class="detalhes-cell">${detalhesFormatados}</td>
                    <td><small class="text-muted">${ev.ip ?? "127.0.0.1"}</small></td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      `;
    } catch {
      containerTabela.innerHTML = `
        <div class="p-4 text-center">
          <p class="text-danger">Erro ao carregar o registo de auditoria. Certifique-se de que a sua sessão possui as permissões necessárias.</p>
        </div>
      `;
    }
  }

  btnRecarregar?.addEventListener("click", carregarAuditoria);
  await carregarAuditoria();
}
