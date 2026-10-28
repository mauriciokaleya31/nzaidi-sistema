import { api, type ClienteItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export async function renderizarKyc(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">KYC & Verificação de Identidade</h1>
        <p class="view-subtitle">Análise diligente de dossiês, validação documental e detecção de riscos AML/PEP.</p>
      </div>
      <div class="view-actions">
        <button id="btn-atualizar-kyc" class="btn btn-secondary" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Atualizar Fila
        </button>
      </div>
    </div>

    <!-- Contadores da Fila de Verificação -->
    <div class="dashboard-grid mb-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="card stat-card" style="border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s, box-shadow 0.15s;" data-filtro-kyc="pendente">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Pendentes</span>
        </div>
        <div class="card-body">
          <div id="stat-pendentes" style="font-size: 26px; font-weight: 700; color: #f59e0b;">0</div>
          <small class="text-muted">Aguardam primeira triagem</small>
        </div>
      </div>

      <div class="card stat-card" style="border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s, box-shadow 0.15s;" data-filtro-kyc="em_analise">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Em Análise</span>
        </div>
        <div class="card-body">
          <div id="stat-em-analise" style="font-size: 26px; font-weight: 700; color: #3b82f6;">0</div>
          <small class="text-muted">Atribuídos a oficiais</small>
        </div>
      </div>

      <div class="card stat-card" style="border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s, box-shadow 0.15s;" data-filtro-kyc="actualizacao_necessaria">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Docs Requeridos</span>
        </div>
        <div class="card-body">
          <div id="stat-docs-req" style="font-size: 26px; font-weight: 700; color: #8b5cf6;">0</div>
          <small class="text-muted">Aguardam resposta do cliente</small>
        </div>
      </div>

      <div class="card stat-card" style="border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s, box-shadow 0.15s;" data-filtro-kyc="aprovado">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Aprovados</span>
        </div>
        <div class="card-body">
          <div id="stat-aprovados" style="font-size: 26px; font-weight: 700; color: #10b981;">0</div>
          <small class="text-muted">Conformes com a regulamentação</small>
        </div>
      </div>

      <div class="card stat-card" style="border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s, box-shadow 0.15s;" data-filtro-kyc="rejeitado">
        <div class="card-header" style="padding-bottom: 2px;">
          <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Rejeitados</span>
        </div>
        <div class="card-body">
          <div id="stat-rejeitados" style="font-size: 26px; font-weight: 700; color: #ef4444;">0</div>
          <small class="text-muted">Inconformidades ou recusas AML</small>
        </div>
      </div>
    </div>

    <!-- Tabela de Dossiês com Filtros -->
    <div class="card">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <input type="text" id="filtro-busca-kyc" class="form-control" placeholder="Buscar por nome, BI/Passaporte ou NIF..." style="min-width: 280px;" />
          <select id="filtro-estado-kyc" class="form-control" style="width: auto;">
            <option value="">Todos os Estados KYC</option>
            <option value="pendente">Pendente de Triagem</option>
            <option value="em_analise">Em Análise</option>
            <option value="actualizacao_necessaria">Atualização Necessária</option>
            <option value="aprovado">Aprovado</option>
            <option value="rejeitado">Rejeitado</option>
          </select>
        </div>
        <span id="contador-tabela-kyc" class="badge" style="background: #e2e8f0; color: #475569;">0 dossiês</span>
      </div>

      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cliente / Titular</th>
                <th>Documento</th>
                <th>NIF</th>
                <th>Data Submissão</th>
                <th>Nível Risco</th>
                <th>Estado KYC</th>
                <th style="text-align: right;">Acções</th>
              </tr>
            </thead>
            <tbody id="tabela-corpo-kyc">
              <tr><td colspan="7" style="text-align: center; padding: 24px;">A carregar dossiês de identidade...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Dossiê Completo de KYC -->
    <div id="modal-dossie-kyc" class="modal-backdrop" style="display: none;">
      <div class="modal-box modal-lg" style="max-width: 900px;">
        <div class="modal-header">
          <h2 id="modal-dossie-titulo" class="modal-title">Dossiê de Verificação de Identidade (KYC)</h2>
          <button id="btn-fechar-modal-dossie" class="btn-icon" type="button" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body" id="modal-dossie-conteudo">
          <div class="loading-state">A carregar dossiê completo...</div>
        </div>
      </div>
    </div>
  `;

  // Função para renderizar o badge de estado KYC
  function obterBadgeKyc(estado: string): string {
    switch (estado) {
      case "aprovado":
        return `<span class="badge badge-success">Aprovado</span>`;
      case "rejeitado":
        return `<span class="badge badge-danger">Rejeitado</span>`;
      case "em_analise":
        return `<span class="badge badge-info">Em Análise</span>`;
      case "actualizacao_necessaria":
        return `<span class="badge badge-warning">Docs Requeridos</span>`;
      case "pendente":
      default:
        return `<span class="badge badge-warning">Pendente</span>`;
    }
  }

  function obterBadgeRisco(risco: string): string {
    switch (risco) {
      case "alto":
        return `<span class="badge badge-danger">Alto Risco</span>`;
      case "medio":
        return `<span class="badge badge-warning">Médio Risco</span>`;
      case "baixo":
      default:
        return `<span class="badge badge-success">Baixo Risco</span>`;
    }
  }

  // Carregar contadores e lista
  let estadoSelecionado = "";
  let buscaDigitada = "";

  async function carregarEstatisticas(): Promise<void> {
    try {
      const stats = await api.obterEstatisticasKyc();
      const elPend = container.querySelector("#stat-pendentes");
      const elEmAnalise = container.querySelector("#stat-em-analise");
      const elDocsReq = container.querySelector("#stat-docs-req");
      const elAprov = container.querySelector("#stat-aprovados");
      const elRejeit = container.querySelector("#stat-rejeitados");

      if (elPend) elPend.textContent = String(stats.pendentes);
      if (elEmAnalise) elEmAnalise.textContent = String(stats.emAnalise);
      if (elDocsReq) elDocsReq.textContent = String(stats.actualizacaoNecessaria);
      if (elAprov) elAprov.textContent = String(stats.aprovados);
      if (elRejeit) elRejeit.textContent = String(stats.rejeitados);
    } catch {}
  }

  async function carregarTabelaKyc(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-corpo-kyc");
    const contador = container.querySelector<HTMLElement>("#contador-tabela-kyc");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">A carregar dossiês...</td></tr>`;

    try {
      const clientes = await api.listarClientes(buscaDigitada, estadoSelecionado);
      if (contador) contador.textContent = `${clientes.length} dossiês encontrados`;

      if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 32px;">Nenhum dossiê de identidade encontrado com os filtros aplicados.</td></tr>`;
        return;
      }

      tbody.innerHTML = clientes.map((c: ClienteItem) => `
        <tr>
          <td>
            <div style="font-weight: 600; color: #031d42;">${escapeHtml(c.nome)}</div>
            <div class="text-muted" style="font-size: 11px;">${escapeHtml(c.email || c.telefone)}</div>
          </td>
          <td>
            <strong>${c.tipoDocumento.toUpperCase()}</strong>: ${escapeHtml(c.numeroDocumento)}
          </td>
          <td>${escapeHtml(c.nif)}</td>
          <td>${new Date(c.criadoEm).toLocaleDateString("pt-AO")}</td>
          <td>${obterBadgeRisco(c.nivelRisco)}</td>
          <td>${obterBadgeKyc(c.estadoKyc)}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-primary btn-abrir-dossie" data-id="${c.id}" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: 4px;">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Avaliar Dossiê
            </button>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll<HTMLButtonElement>(".btn-abrir-dossie").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (id) void abrirModalDossie(id);
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar dossiês KYC.</td></tr>`;
    }
  }

  // Visualizador e Avaliador de Dossiê
  async function abrirModalDossie(clienteId: string): Promise<void> {
    const modal = container.querySelector<HTMLElement>("#modal-dossie-kyc");
    const conteudo = container.querySelector<HTMLElement>("#modal-dossie-conteudo");
    if (!modal || !conteudo) return;

    modal.style.display = "flex";
    conteudo.innerHTML = `<div class="loading-state">A carregar registos, ficheiros e validações...</div>`;

    try {
      const det = await api.obterDetalhesCliente(clienteId);
      const cli = det.cliente;
      const docs = det.documentos || [];
      const historico = det.historicoKyc || [];
      const inconsistencias = det.inconsistenciasKyc || [];

      conteudo.innerHTML = `
        <!-- Painel de Inconsistências & Alertas Regulatórios -->
        ${inconsistencias.length > 0 ? `
          <div class="alert-box alert-warning" style="margin-bottom: 20px;">
            <strong style="display: block; margin-bottom: 6px;">Alertas Automáticos de Inconsistência Detectados:</strong>
            <ul style="margin: 0; padding-left: 20px;">
              ${inconsistencias.map((i: string) => `<li>${escapeHtml(i)}</li>`).join("")}
            </ul>
          </div>
        ` : `
          <div class="alert-box alert-success" style="margin-bottom: 20px;">
            Sem divergências cadastrais automáticas identificadas nos dados declarados.
          </div>
        `}

        <!-- Comparador de Dados Cadastrais -->
        <div class="card mb-4" style="background: #f8fafc;">
          <div class="card-header"><h3 class="card-title" style="font-size: 14px;">Dados Declarados do Cliente</h3></div>
          <div class="card-body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; font-size: 13px;">
            <div><span class="text-muted">Nome Completo:</span><br><strong>${escapeHtml(cli.nome)}</strong></div>
            <div><span class="text-muted">Documento:</span><br><strong>${cli.tipoDocumento.toUpperCase()} ${escapeHtml(cli.numeroDocumento)}</strong></div>
            <div><span class="text-muted">NIF:</span><br><strong>${escapeHtml(cli.nif)}</strong></div>
            <div><span class="text-muted">Data Nascimento:</span><br><strong>${cli.dataNascimento ? new Date(cli.dataNascimento).toLocaleDateString("pt-AO") : "Não informada"}</strong></div>
            <div><span class="text-muted">Validade Documento:</span><br><strong>${cli.documentoValidade ? new Date(cli.documentoValidade).toLocaleDateString("pt-AO") : "Não informada"}</strong></div>
            <div><span class="text-muted">Profissão:</span><br><strong>${escapeHtml(cli.profissao || "Não indicada")}</strong></div>
            <div><span class="text-muted">Entidade Empregadora:</span><br><strong>${escapeHtml(cli.entidadeEmpregadora || "Não indicada")}</strong></div>
            <div><span class="text-muted">Pessoa Exposta (PEP):</span><br><strong>${cli.pep ? "SIM (Diligência Reforçada)" : "Não"}</strong></div>
          </div>
        </div>

        <!-- Documentos Submetidos -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title" style="font-size: 14px;">Documentos Anexados (${docs.length})</h3></div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Ficheiro</th>
                    <th>Validação</th>
                    <th>Data Envio</th>
                    <th style="text-align: right;">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${docs.length === 0 ? `<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 16px;">Nenhum ficheiro documental anexado até ao momento.</td></tr>` : docs.map((d: any) => `
                    <tr>
                      <td><strong>${escapeHtml(d.tipoDocumento)}</strong></td>
                      <td>${escapeHtml(d.nomeArquivo)}</td>
                      <td><span class="badge ${d.estadoValidacao === 'valido' ? 'badge-success' : 'badge-warning'}">${d.estadoValidacao}</span></td>
                      <td>${new Date(d.enviadoEm).toLocaleDateString("pt-AO")}</td>
                      <td style="text-align: right;">
                        <a href="/api/v1/clientes/${cli.id}/documentos/${d.id}/download" target="_blank" class="btn btn-sm btn-secondary">
                          Descarregar Ficheiro
                        </a>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Formulário de Decisão Regulamentar -->
        <div class="card" style="border: 2px solid #031d42; background: #ffffff;">
          <div class="card-header" style="background: #031d42; color: #ffffff;">
            <h3 class="card-title" style="color: #ffffff; font-size: 14px;">Decisão Regulamentar de KYC</h3>
          </div>
          <div class="card-body">
            <form id="form-decisao-kyc">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div>
                  <label class="form-label">Ação / Decisão:</label>
                  <select id="kyc-nova-decisao" class="form-control" required>
                    <option value="aprovado">Aprovar Dossiê (Conforme)</option>
                    <option value="actualizacao_necessaria">Solicitar Documentos Adicionais</option>
                    <option value="rejeitado">Rejeitar Dossiê (Inconforme)</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Classificação de Risco AML:</label>
                  <select id="kyc-nivel-risco" class="form-control" required>
                    <option value="baixo" ${cli.nivelRisco === 'baixo' ? 'selected' : ''}>Baixo Risco</option>
                    <option value="medio" ${cli.nivelRisco === 'medio' ? 'selected' : ''}>Médio Risco</option>
                    <option value="alto" ${cli.nivelRisco === 'alto' ? 'selected' : ''}>Alto Risco (EDD Requerida)</option>
                  </select>
                </div>
              </div>

              <div class="form-group mb-4">
                <label class="form-label">Parecer Técnico / Motivo Obrigatório:</label>
                <textarea id="kyc-motivo-texto" class="form-control" rows="3" placeholder="Indique a fundamentação técnica ou os documentos em falta exigidos..." required minlength="5"></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="btn btn-secondary" id="btn-cancelar-modal-dossie">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btn-submeter-decisao-kyc">
                  Gravar Decisão Auditada
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Histórico de Decisões Prévias -->
        ${historico.length > 0 ? `
          <div style="margin-top: 20px;">
            <h4 style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Pista de Decisões KYC Anteriores</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${historico.map((h: any) => `
                <div style="padding: 10px 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>${h.estadoNovo.toUpperCase()}</strong> (${h.nivelRisco.toUpperCase()}) por <em>${escapeHtml(h.decididoPorNome)}</em>
                    <span class="text-muted">${new Date(h.momento).toLocaleString("pt-AO")}</span>
                  </div>
                  <div style="margin-top: 4px; color: #475569;">${escapeHtml(h.motivo || "Sem observações")}</div>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      `;

      conteudo.querySelector("#btn-cancelar-modal-dossie")?.addEventListener("click", () => {
        modal.style.display = "none";
      });

      const formDecisao = conteudo.querySelector<HTMLFormElement>("#form-decisao-kyc");
      formDecisao?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const novaDecisao = (conteudo.querySelector("#kyc-nova-decisao") as HTMLSelectElement).value;
        const nivelRisco = (conteudo.querySelector("#kyc-nivel-risco") as HTMLSelectElement).value;
        const motivo = (conteudo.querySelector("#kyc-motivo-texto") as HTMLTextAreaElement).value.trim();

        if (motivo.length < 5) {
          alert("O parecer técnico / motivo da decisão deve ter pelo menos 5 caracteres.");
          return;
        }

        try {
          if (novaDecisao === "actualizacao_necessaria") {
            await api.solicitarDocumentosKyc(cli.id, motivo);
          } else {
            await api.decidirKyc(cli.id, {
              estadoNovo: novaDecisao as any,
              nivelRisco: nivelRisco as any,
              motivo,
            });
          }

          alert("Decisão de KYC gravada com sucesso.");
          modal.style.display = "none";
          void carregarEstatisticas();
          void carregarTabelaKyc();
        } catch (err: any) {
          alert(`Erro ao gravar decisão: ${err.message}`);
        }
      });
    } catch {
      conteudo.innerHTML = `<div class="alert-box alert-error">Erro ao carregar dossiê completo do cliente.</div>`;
    }
  }

  // Fechar modal
  container.querySelector("#btn-fechar-modal-dossie")?.addEventListener("click", () => {
    const modal = container.querySelector<HTMLElement>("#modal-dossie-kyc");
    if (modal) modal.style.display = "none";
  });

  // Filtros
  container.querySelectorAll(".stat-card").forEach((card) => {
    card.addEventListener("click", () => {
      const f = card.getAttribute("data-filtro-kyc") || "";
      const select = container.querySelector<HTMLSelectElement>("#filtro-estado-kyc");
      if (select) select.value = f;
      estadoSelecionado = f;
      void carregarTabelaKyc();
    });
  });

  const inputBusca = container.querySelector<HTMLInputElement>("#filtro-busca-kyc");
  inputBusca?.addEventListener("input", () => {
    buscaDigitada = inputBusca.value;
    void carregarTabelaKyc();
  });

  const selectEstado = container.querySelector<HTMLSelectElement>("#filtro-estado-kyc");
  selectEstado?.addEventListener("change", () => {
    estadoSelecionado = selectEstado.value;
    void carregarTabelaKyc();
  });

  container.querySelector("#btn-atualizar-kyc")?.addEventListener("click", () => {
    void carregarEstatisticas();
    void carregarTabelaKyc();
  });

  void carregarEstatisticas();
  void carregarTabelaKyc();
}
