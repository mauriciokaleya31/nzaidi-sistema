import { api, type DashboardResumo } from "../api.js";

export async function renderizarDashboard(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="card p-4 text-center">
      <p class="text-muted">A carregar métricas e indicadores do parceiro...</p>
    </div>
  `;

  try {
    const dados: DashboardResumo = await api.obterDashboardResumo();
    const m = dados.metricas;
    const p = dados.parceiro;

    const volumeDivisasStr = Object.entries(m.volumeTotalDivisa)
      .map(([moeda, val]) => `${Number(val).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} ${moeda}`)
      .join(" | ") || "0,00";

    container.innerHTML = `
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700;">Painel de Controlo do Parceiro</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Entidade: <strong>${p.nome}</strong> (<code>${p.codigo}</code>) — Limite Diário: ${Number(p.limiteDiarioAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
          </p>
        </div>
        <div>
          <span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 14px;">
            Comissão Contratada: ${p.comissaoPercentual}%
          </span>
        </div>
      </div>

      <!-- Grid de Estatísticas -->
      <div class="stats-grid">
        <div class="card stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <div class="stat-label">Total Recebidas</div>
            <div class="stat-val">${m.totalRecebidas}</div>
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-icon" style="background-color: rgba(245, 158, 11, 0.15); color: var(--warning);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div class="stat-label">Pendentes / Processamento</div>
            <div class="stat-val" style="color: var(--warning);">${m.pendentes + m.emProcessamento}</div>
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-icon" style="background-color: rgba(16, 185, 129, 0.15); color: var(--primary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <div class="stat-label">Liquidadas / Sucesso</div>
            <div class="stat-val" style="color: var(--primary);">${m.concluidas}</div>
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-icon" style="background-color: rgba(239, 68, 68, 0.15); color: var(--danger);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div>
            <div class="stat-label">Devolvidas</div>
            <div class="stat-val" style="color: var(--danger);">${m.devolvidas}</div>
          </div>
        </div>
      </div>

      <!-- Resumo Financeiro & Canais -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 28px;">
        <div class="card">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 16px;">Volume & Comissões Acumuladas</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span class="text-muted">Volume em Divisas:</span>
              <strong>${volumeDivisasStr}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span class="text-muted">Contravalor Total AOA:</span>
              <strong>${Number(m.volumeTotalAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 4px;">
              <span class="text-muted">Comissão Gerada para o Parceiro:</span>
              <strong style="color: var(--primary); font-size: 1.1rem;">
                ${Number(m.comissaoAcumuladaAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
              </strong>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 16px;">Canais & Adaptadores de Integração</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${dados.adaptadores
              .map(
                (ad) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <div>
                  <strong>${ad.nome}</strong>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Canal: <code>${ad.canal}</code> | Modo: ${ad.modo === "manual_assistido" ? "Manual Assistido" : "API Automática"}</div>
                </div>
                <span class="badge ${ad.configurado ? "badge-success" : "badge-warning"}">
                  ${ad.status}
                </span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>

      <!-- Tabela de Operações Recentes -->
      <div class="card p-0">
        <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 1.05rem; font-weight: 700;">Instruções Recentes Atribuídas</h3>
          <a href="#remessas" class="btn btn-sm btn-secondary">Ver Todas as Remessas &rarr;</a>
        </div>
        <div class="table-responsive">
          ${
            dados.recentes.length === 0
              ? `<div class="p-4 text-center text-muted">Nenhuma instrução pendente ou recente atribuída a este parceiro.</div>`
              : `
            <table class="table">
              <thead>
                <tr>
                  <th>Referência</th>
                  <th>Canal</th>
                  <th>Beneficiário</th>
                  <th>Destino</th>
                  <th>Montante</th>
                  <th>Estado</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                ${dados.recentes
                  .map((op) => {
                    const statusClass =
                      op.estado === "liquidada"
                        ? "badge-success"
                        : op.estado === "pendente" || op.estado === "em_processamento"
                        ? "badge-warning"
                        : "badge-danger";

                    return `
                    <tr>
                      <td><code><strong>${op.id}</strong></code></td>
                      <td><span class="badge badge-secondary">${op.canal.toUpperCase()}</span></td>
                      <td>
                        <strong>${op.beneficiarioNome}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${op.beneficiarioBanco}</div>
                      </td>
                      <td>${op.beneficiarioPais}</td>
                      <td><strong>${Number(op.montante).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} ${op.moeda}</strong></td>
                      <td><span class="badge ${statusClass}">${op.estado.toUpperCase()}</span></td>
                      <td><small class="text-muted">${new Date(op.criadoEm).toLocaleDateString("pt-AO")}</small></td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          `
          }
        </div>
      </div>
    `;
  } catch (err: any) {
    container.innerHTML = `
      <div class="card p-4 alert-box alert-error">
        <strong>Falha ao carregar dashboard:</strong> ${err.message || "Erro de ligação."}
      </div>
    `;
  }
}
