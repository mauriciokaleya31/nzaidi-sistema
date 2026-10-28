import { authState } from "../auth.state.js";

export function renderizarPerfil(container: HTMLElement): void {
  const p = authState.parceiro;
  const u = authState.usuario;

  if (!p || !u) {
    container.innerHTML = `<div class="p-4 text-center text-muted">Acesso não autenticado.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 1.4rem; font-weight: 700;">Configurações & Credenciais do Parceiro</h2>
      <p style="color: var(--text-muted); font-size: 0.85rem;">Dados institucionais credenciados junto da plataforma cambial NZAIDI</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
      <!-- Dados da Entidade -->
      <div class="card">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
          Entidade Parceira
        </h3>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Código de Correspondente:</span>
            <div><code><strong>${p.codigo}</strong></code></div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Nome / Razão Social:</span>
            <div><strong>${p.nome}</strong></div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Tipo de Atuação:</span>
            <div><span class="badge badge-info">${p.tipo.toUpperCase()}</span></div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Canais Habilitados:</span>
            <div>${p.canaisSuportados.map((c) => `<span class="badge badge-secondary mr-1">${c}</span>`).join(" ")}</div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Estado Regulatório:</span>
            <div><span class="badge badge-success">${p.estado.toUpperCase()}</span></div>
          </div>
        </div>
      </div>

      <!-- Condições Comerciais & Limites -->
      <div class="card">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
          Condições Comerciais & Limites
        </h3>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Taxa de Comissão Acordada:</span>
            <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary);">${p.comissaoPercentual}%</div>
            <small class="text-muted">Calculada sobre o contravalor AOA de remessas e pagamentos executados.</small>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Limite Diário Operacional:</span>
            <div style="font-size: 1.1rem; font-weight: 700;">
              ${Number(p.limiteDiarioAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA
            </div>
            <small class="text-muted">Limite estabelecido em conformidade com o Banco Nacional de Angola.</small>
          </div>
        </div>
      </div>

      <!-- Utilizador Conectado -->
      <div class="card" style="grid-column: 1 / -1;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
          Operador Conectado
        </h3>
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Nome do Operador:</span>
            <div><strong>${u.nome}</strong></div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">E-mail Corporativo:</span>
            <div><code>${u.email}</code></div>
          </div>
          <div>
            <span class="text-muted" style="font-size: 0.78rem;">Função:</span>
            <div><span class="badge badge-info">${u.funcao}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
