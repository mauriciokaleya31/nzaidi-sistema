import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

interface ReporteItem {
  id: string;
  dataReferencia: string;
  tipoMapa: "cambio" | "remessa";
  totalOperacoes: number;
  volumeAoa: string;
  reporteZero: boolean;
  estadoSuptech: string;
  estadoSsif: string;
  nomeArquivo: string;
  geradoEm: string;
}

export async function renderizarBna(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Reportes Regulamentares ao BNA</h1>
        <p class="view-subtitle">Supervisão e Mapas Diários de Câmbio e Remessas (Plataformas Suptech e SSIF)</p>
      </div>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-gerar-bna-modal">⚡ Gerar Mapas Diários</button>
      </div>
    </div>

    <div id="alerta-bna-container"></div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <h2 class="card-title">Diretrizes Regulamentares BNA (Avisos BNA & Prazos)</h2>
      </div>
      <div class="card-body">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
          <div style="padding: 1rem; background: rgba(5,45,98,0.03); border-left: 3px solid #CC9638; border-radius: 4px;">
            <strong>Hora de Corte:</strong> 18:30 (Fuso de Luanda).
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 0.25rem;">Geração automática às 18:30 e envio obrigatório diário.</div>
          </div>
          <div style="padding: 1rem; background: rgba(5,45,98,0.03); border-left: 3px solid #052D62; border-radius: 4px;">
            <strong>Reporte a Zero:</strong> Obrigatório em dias sem operações.
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 0.25rem;">Declara formalmente ao BNA a ausência de movimento sem sofrer penalizações.</div>
          </div>
          <div style="padding: 1rem; background: rgba(5,45,98,0.03); border-left: 3px solid #16a34a; border-radius: 4px;">
            <strong>Plataformas Oficiais:</strong> Suptech & SSIF.
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 0.25rem;">Descarregue os arquivos CSV gerados e registe os protocolos de submissão.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Histórico de Mapas Gerados para o Regulador</h2>
        <button class="btn btn-secondary btn-sm" id="btn-atualizar-bna">🔄 Atualizar</button>
      </div>
      <div class="card-body" id="tabela-bna-container">
        <div class="loading-state">A carregar registos de reportes BNA...</div>
      </div>
    </div>

    <!-- Modal de Geração de Reporte -->
    <div class="modal-backdrop" id="modal-gerar-bna" style="display: none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Gerar Mapas do BNA</h3>
          <button class="modal-close" id="btn-fechar-modal-bna">&times;</button>
        </div>
        <form id="form-gerar-bna">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Data de Referência (AAAA-MM-DD)</label>
              <input type="date" class="form-input" id="campo-data-bna" required />
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Mapa</label>
              <select class="form-input" id="campo-tipo-mapa">
                <option value="ambos">Ambos (Mapa de Câmbio + Mapa de Remessas)</option>
                <option value="cambio">Apenas Mapa de Câmbio</option>
                <option value="remessa">Apenas Mapa de Remessas</option>
              </select>
            </div>
            <p class="text-muted" style="font-size: 0.85rem;">
              * Caso a data selecionada não contenha operações registadas, será gerado o <strong>Reporte a Zero</strong> oficial.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancelar-modal-bna">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-submeter-geracao">⚡ Confirmar & Gerar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Carregar dados e alerta
  await carregarAlertaHoje();
  await carregarTabelaReportes();

  // Eventos
  const modal = document.getElementById("modal-gerar-bna");
  const btnAbrirModal = document.getElementById("btn-gerar-bna-modal");
  const btnFecharModal = document.getElementById("btn-fechar-modal-bna");
  const btnCancelarModal = document.getElementById("btn-cancelar-modal-bna");
  const campoData = document.getElementById("campo-data-bna") as HTMLInputElement;

  if (campoData) {
    campoData.value = new Date().toISOString().slice(0, 10);
  }

  btnAbrirModal?.addEventListener("click", () => {
    if (modal) modal.style.display = "flex";
  });

  const fecharModal = () => {
    if (modal) modal.style.display = "none";
  };
  btnFecharModal?.addEventListener("click", fecharModal);
  btnCancelarModal?.addEventListener("click", fecharModal);

  document.getElementById("btn-atualizar-bna")?.addEventListener("click", () => {
    void carregarAlertaHoje();
    void carregarTabelaReportes();
  });

  const formGerar = document.getElementById("form-gerar-bna") as HTMLFormElement;
  formGerar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dataRef = campoData.value;
    const tipoMapa = (document.getElementById("campo-tipo-mapa") as HTMLSelectElement).value;

    try {
      const btn = document.getElementById("btn-submeter-geracao") as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = "A gerar mapas...";

      const res = await api.post<{ sucesso: boolean; mensagem: string }>("/bna/reportes/gerar", {
        dataReferencia: dataRef,
        tipoMapa,
      });

      alert(res.mensagem);
      fecharModal();
      await carregarAlertaHoje();
      await carregarTabelaReportes();
    } catch (err: any) {
      alert("Erro ao gerar reporte BNA: " + err.message);
    } finally {
      const btn = document.getElementById("btn-submeter-geracao") as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "⚡ Confirmar & Gerar";
      }
    }
  });

  async function carregarAlertaHoje(): Promise<void> {
    const alertaContainer = document.getElementById("alerta-bna-container");
    if (!alertaContainer) return;

    try {
      const res = await api.get<{
        sucesso: boolean;
        alerta: {
          alerta: boolean;
          horaLuanda: string;
          dataHojeLuanda: string;
          mapaCambioGerado: boolean;
          mapaRemessaGerado: boolean;
          mensagem?: string;
        };
      }>("/bna/alerta-hoje");

      if (res.sucesso && res.alerta.alerta) {
        alertaContainer.innerHTML = `
          <div class="alert-box alert-error" style="margin-bottom: 1.5rem; border: 2px solid #ef4444; background: #fef2f2; padding: 1rem; border-radius: 8px;">
            <div style="font-size: 1.1rem; font-weight: bold; color: #b91c1c;">⚠️ ALERTA REGULATÓRIO BNA DAS 18:35</div>
            <div style="color: #991b1b; margin-top: 0.25rem;">${res.alerta.mensagem}</div>
            <div style="margin-top: 0.5rem;">
              <button class="btn btn-primary btn-sm" id="btn-resolver-alerta-hoje">⚡ Gerar Mapas de Hoje Imediatamente</button>
            </div>
          </div>
        `;
        document.getElementById("btn-resolver-alerta-hoje")?.addEventListener("click", () => {
          if (modal) {
            campoData.value = res.alerta.dataHojeLuanda;
            modal.style.display = "flex";
          }
        });
      } else {
        alertaContainer.innerHTML = "";
      }
    } catch {
      alertaContainer.innerHTML = "";
    }
  }

  async function carregarTabelaReportes(): Promise<void> {
    const tabelaContainer = document.getElementById("tabela-bna-container");
    if (!tabelaContainer) return;

    try {
      const res = await api.get<{ sucesso: boolean; itens: ReporteItem[]; total: number }>("/bna/reportes");
      const itens = res.itens;

      if (itens.length === 0) {
        tabelaContainer.innerHTML = `
          <div class="text-muted" style="text-align: center; padding: 2rem;">
            Nenhum reporte do BNA gerado até ao momento. Clique em "Gerar Mapas Diários" para criar os primeiros arquivos.
          </div>
        `;
        return;
      }

      tabelaContainer.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data Ref.</th>
                <th>Tipo</th>
                <th>Volume (AOA)</th>
                <th>Operações</th>
                <th>Estado Suptech</th>
                <th>Estado SSIF</th>
                <th>Ficheiro Oficial</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${itens
                .map((r: ReporteItem) => {
                  const badgeZero = r.reporteZero
                    ? '<span class="badge" style="background: #64748b; color: white;">Reporte a Zero</span>'
                    : `<span class="badge badge-success">${r.totalOperacoes} ops</span>`;

                  const badgeSuptech =
                    r.estadoSuptech === "submetido"
                      ? '<span class="badge badge-success">✓ Submetido</span>'
                      : '<span class="badge badge-warning">Pendente</span>';

                  const badgeSsif =
                    r.estadoSsif === "submetido"
                      ? '<span class="badge badge-success">✓ Submetido</span>'
                      : '<span class="badge badge-warning">Pendente</span>';

                  return `
                    <tr>
                      <td><strong>${r.dataReferencia}</strong></td>
                      <td><span class="badge ${r.tipoMapa === "cambio" ? "badge-info" : "badge-secondary"}">${r.tipoMapa.toUpperCase()}</span></td>
                      <td>${r.volumeAoa} Kz</td>
                      <td>${badgeZero}</td>
                      <td>${badgeSuptech}</td>
                      <td>${badgeSsif}</td>
                      <td>
                        <a href="/api/v1/bna/reportes/${r.id}/download" class="btn btn-secondary btn-sm" download target="_blank">
                          📥 CSV
                        </a>
                      </td>
                      <td>
                        ${
                          r.estadoSuptech !== "submetido" || r.estadoSsif !== "submetido"
                            ? `<button class="btn btn-primary btn-sm btn-submeter-reg" data-id="${r.id}">✓ Registar Envio</button>`
                            : '<span class="text-muted" style="font-size: 0.85rem;">Concluído</span>'
                        }
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      // Eventos de submissão
      tabelaContainer.querySelectorAll(".btn-submeter-reg").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute("data-id")!;
          if (!confirm("Confirmar que este mapa diário foi formalmente submetido nas plataformas do BNA?")) return;

          try {
            await api.post(`/bna/reportes/${id}/submissao`, { plataforma: "ambas" });
            alert("Submissão no Suptech e SSIF registada com sucesso!");
            await carregarTabelaReportes();
          } catch (err: any) {
            alert("Erro ao registar submissão: " + err.message);
          }
        });
      });
    } catch (err: any) {
      tabelaContainer.innerHTML = `<div class="alert-box alert-error">Erro ao carregar reportes: ${err.message}</div>`;
    }
  }
}
