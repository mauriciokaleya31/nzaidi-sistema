import { api, type ClienteItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export async function renderizarClientes(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestão de Clientes</h1>
        <p class="view-subtitle">Base cadastral, histórico de operações cambiais, remessas e suporte ao cliente.</p>
      </div>
      <div class="view-actions" style="display: flex; gap: 10px;">
        <button id="btn-atualizar-clientes" class="btn btn-secondary" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Atualizar Lista
        </button>
        <button id="btn-novo-cliente" class="btn btn-primary" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Registar Novo Cliente
        </button>
      </div>
    </div>

    <!-- Filtros de Busca e Estado -->
    <div class="card mb-4">
      <div class="card-body" style="padding: 16px;">
        <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 260px;">
            <input type="text" id="busca-cliente" class="form-control" placeholder="Pesquisar por nome, documento, NIF ou telefone..." />
          </div>
          <div style="min-width: 160px;">
            <select id="filtro-estado-cliente" class="form-control">
              <option value="">Todos os Estados</option>
              <option value="ativo">Activo</option>
              <option value="inativo">Inactivo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
          <div style="min-width: 160px;">
            <select id="filtro-risco-cliente" class="form-control">
              <option value="">Todos os Riscos AML</option>
              <option value="baixo">Baixo Risco</option>
              <option value="medio">Médio Risco</option>
              <option value="alto">Alto Risco</option>
            </select>
          </div>
          <span id="contador-clientes" class="badge" style="background: #e2e8f0; color: #475569; padding: 8px 12px;">0 clientes</span>
        </div>
      </div>
    </div>

    <!-- Tabela Principal de Clientes -->
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Identificação</th>
                <th>Contacto</th>
                <th>Estado Conta</th>
                <th>KYC / Identidade</th>
                <th>Data Registo</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="tabela-clientes-corpo">
              <tr><td colspan="7" style="text-align: center; padding: 24px;">A carregar lista de clientes...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de Perfil e Ações do Cliente -->
    <div id="modal-perfil-cliente" class="modal-backdrop" style="display: none;">
      <div class="modal-box modal-lg" style="max-width: 960px;">
        <div class="modal-header">
          <h2 id="modal-cliente-titulo" class="modal-title">Ficha Individual do Cliente</h2>
          <button id="btn-fechar-modal-cliente" class="btn-icon" type="button" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body" id="modal-cliente-conteudo">
          <div class="loading-state">A carregar detalhes completos...</div>
        </div>
      </div>
    </div>

    <!-- Modal de Criação de Cliente -->
    <div id="modal-criar-cliente" class="modal-backdrop" style="display: none;">
      <div class="modal-box" style="max-width: 600px;">
        <div class="modal-header">
          <h2 class="modal-title">Registar Novo Cliente</h2>
          <button id="btn-fechar-modal-criar" class="btn-icon" type="button" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-cadastrar-cliente">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label class="form-label">Tipo de Cliente:</label>
                <select id="novo-tipo" class="form-control" required>
                  <option value="singular">Pessoa Singular</option>
                  <option value="colectivo">Pessoa Coletiva / Empresa</option>
                </select>
              </div>
              <div>
                <label class="form-label">Tipo Documento:</label>
                <select id="novo-tipo-doc" class="form-control" required>
                  <option value="bi">Bilhete de Identidade (BI)</option>
                  <option value="passaporte">Passaporte</option>
                  <option value="cartao_residente">Cartão de Residente</option>
                  <option value="nif_empresa">Certidão Comercial / NIF</option>
                </select>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Nome Completo / Denominação Social:</label>
              <input type="text" id="novo-nome" class="form-control" placeholder="ex.: Maria Esperança Fernandes" required minlength="3" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label class="form-label">N.º do Documento:</label>
                <input type="text" id="novo-num-doc" class="form-control" placeholder="N.º documento de identificação" required minlength="5" />
              </div>
              <div>
                <label class="form-label">NIF Fiscal:</label>
                <input type="text" id="novo-nif" class="form-control" placeholder="ex.: 5001928312" required minlength="5" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label class="form-label">Telemóvel / Telefone:</label>
                <input type="tel" id="novo-telefone" class="form-control" placeholder="ex.: +244923000111" required minlength="7" />
              </div>
              <div>
                <label class="form-label">Correio Electrónico:</label>
                <input type="email" id="novo-email" class="form-control" placeholder="ex.: cliente@email.ao" />
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Morada / Domicílio:</label>
              <input type="text" id="novo-morada" class="form-control" placeholder="ex.: Av. 4 de Fevereiro, Luanda" required minlength="5" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
              <button type="button" class="btn btn-secondary" id="btn-cancelar-criar">Cancelar</button>
              <button type="submit" class="btn btn-primary">Registar Cliente</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  let busca = "";
  let estadoFiltro = "";
  let riscoFiltro = "";

  async function carregarListaClientes(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-clientes-corpo");
    const contador = container.querySelector<HTMLElement>("#contador-clientes");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">A carregar clientes...</td></tr>`;

    try {
      const clientesOriginais = await api.listarClientes(busca);
      let clientes = clientesOriginais || [];

      if (estadoFiltro) clientes = clientes.filter((c: ClienteItem) => c.estado === estadoFiltro);
      if (riscoFiltro) clientes = clientes.filter((c: ClienteItem) => c.nivelRisco === riscoFiltro);

      if (contador) contador.textContent = `${clientes.length} clientes listados`;

      if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 32px;">Nenhum cliente encontrado com os critérios fornecidos.</td></tr>`;
        return;
      }

      tbody.innerHTML = clientes.map((c: ClienteItem) => `
        <tr>
          <td>
            <div style="font-weight: 600; color: #031d42;">${escapeHtml(c.nome)}</div>
            <div class="text-muted" style="font-size: 11px;">Tipo: ${c.tipo.toUpperCase()}</div>
          </td>
          <td>
            <strong>${c.tipoDocumento.toUpperCase()}</strong>: ${escapeHtml(c.numeroDocumento)}<br>
            <span class="text-muted" style="font-size: 11px;">NIF: ${escapeHtml(c.nif)}</span>
          </td>
          <td>
            <div>${escapeHtml(c.telefone)}</div>
            <div class="text-muted" style="font-size: 11px;">${escapeHtml(c.email || 'Sem email')}</div>
          </td>
          <td>
            <span class="badge ${c.estado === 'ativo' ? 'badge-success' : c.estado === 'bloqueado' ? 'badge-danger' : 'badge-warning'}">
              ${c.estado.toUpperCase()}
            </span>
          </td>
          <td>
            <span class="badge ${c.estadoKyc === 'aprovado' ? 'badge-success' : c.estadoKyc === 'rejeitado' ? 'badge-danger' : 'badge-warning'}">
              ${c.estadoKyc.toUpperCase()}
            </span>
          </td>
          <td class="text-muted" style="font-size: 12px;">${new Date(c.criadoEm).toLocaleDateString("pt-AO")}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-primary btn-ver-perfil-cli" data-id="${c.id}" type="button">
              Ficha do Cliente &rarr;
            </button>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll<HTMLButtonElement>(".btn-ver-perfil-cli").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (id) void abrirModalPerfilCliente(id);
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar clientes.</td></tr>`;
    }
  }

  // Visualizador e Gerenciador de Perfil do Cliente
  async function abrirModalPerfilCliente(clienteId: string): Promise<void> {
    const modal = container.querySelector<HTMLElement>("#modal-perfil-cliente");
    const conteudo = container.querySelector<HTMLElement>("#modal-cliente-conteudo");
    if (!modal || !conteudo) return;

    modal.style.display = "flex";
    conteudo.innerHTML = `<div class="loading-state">A carregar perfil, histórico cambial e remessas...</div>`;

    try {
      const det = await api.obterDetalhesCliente(clienteId);
      const cli = det.cliente;
      const cambios = det.cambios || [];
      const remessas = det.remessas || [];

      conteudo.innerHTML = `
        <!-- Barra de Ações Rápidas de Suporte -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; align-items: center;">
          <strong style="color: #031d42; font-size: 13px; margin-right: 8px;">Ações de Suporte:</strong>
          
          <button id="btn-impersonar-cliente-act" class="btn btn-sm btn-primary" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: 4px;">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Entrar na Conta do Cliente
          </button>

          ${cli.estado === 'bloqueado' ? `
            <button id="btn-desbloquear-cliente-act" class="btn btn-sm btn-secondary" type="button" style="color: #10b981;">
              Desbloquear Conta
            </button>
          ` : `
            <button id="btn-bloquear-cliente-act" class="btn btn-sm btn-secondary" type="button" style="color: #ef4444;">
              Bloquear Conta
            </button>
          `}

          <button id="btn-terminar-sessoes-cliente-act" class="btn btn-sm btn-secondary" type="button">
            Terminar Sessões Ativas
          </button>

          <a href="#kyc" class="btn btn-sm btn-secondary" style="margin-left: auto;">
            Abrir Dossiê KYC &rarr;
          </a>
        </div>

        <!-- Abas do Modal -->
        <div class="tab-nav mb-3" style="display: flex; gap: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          <button class="btn btn-sm btn-tab active" data-tab="tab-cadastral">Dados Cadastrais</button>
          <button class="btn btn-sm btn-tab" data-tab="tab-cambios">Histórico de Câmbios (${cambios.length})</button>
          <button class="btn btn-sm btn-tab" data-tab="tab-remessas">Remessas (${remessas.length})</button>
        </div>

        <!-- Conteúdo Aba 1: Dados Cadastrais com Edição -->
        <div id="tab-cadastral" class="tab-pane active">
          <form id="form-editar-cliente-cad">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
              <div class="form-group">
                <label class="form-label">Nome Completo:</label>
                <input type="text" id="edit-cli-nome" class="form-control" value="${escapeHtml(cli.nome)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Telemóvel / Contacto:</label>
                <input type="text" id="edit-cli-tel" class="form-control" value="${escapeHtml(cli.telefone)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Correio Electrónico:</label>
                <input type="email" id="edit-cli-email" class="form-control" value="${escapeHtml(cli.email || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Morada de Residência:</label>
                <input type="text" id="edit-cli-morada" class="form-control" value="${escapeHtml(cli.morada)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Profissão / Ocupação:</label>
                <input type="text" id="edit-cli-profissao" class="form-control" value="${escapeHtml(cli.profissao || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Entidade Empregadora:</label>
                <input type="text" id="edit-cli-empresa" class="form-control" value="${escapeHtml(cli.entidadeEmpregadora || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Finalidade da Relação:</label>
                <input type="text" id="edit-cli-finalidade" class="form-control" value="${escapeHtml(cli.finalidadeConta || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Residência Fiscal (País):</label>
                <input type="text" id="edit-cli-pais" class="form-control" value="${escapeHtml(cli.paisResidencia || 'AO')}" />
              </div>
            </div>

            <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
              <button type="submit" class="btn btn-primary">Gravar Alterações Cadastrais</button>
            </div>
          </form>
        </div>

        <!-- Conteúdo Aba 2: Câmbios -->
        <div id="tab-cambios" class="tab-pane" style="display: none;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Cotação</th>
                  <th>Estado</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                ${cambios.length === 0 ? `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 16px;">Sem registos de câmbio associados a este cliente.</td></tr>` : cambios.map((op: any) => `
                  <tr>
                    <td><strong>${escapeHtml(op.tipo || 'Câmbio')}</strong></td>
                    <td>${Number(op.montanteOrigem).toLocaleString('pt-AO')} ${op.moedaOrigem}</td>
                    <td>${Number(op.montanteDestino).toLocaleString('pt-AO')} ${op.moedaDestino}</td>
                    <td>${Number(op.taxaCambio).toFixed(2)}</td>
                    <td><span class="badge ${op.estado === 'concluida' ? 'badge-success' : 'badge-info'}">${op.estado}</span></td>
                    <td class="text-muted" style="font-size: 11px;">${new Date(op.criadoEm).toLocaleDateString('pt-AO')}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Conteúdo Aba 3: Remessas -->
        <div id="tab-remessas" class="tab-pane" style="display: none;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Beneficiário</th>
                  <th>País Destino</th>
                  <th>Envio</th>
                  <th>Recebimento</th>
                  <th>Comissão</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${remessas.length === 0 ? `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 16px;">Sem remessas associadas a este cliente.</td></tr>` : remessas.map((rem: any) => `
                  <tr>
                    <td><strong>${escapeHtml(rem.beneficiarioNome)}</strong></td>
                    <td>${escapeHtml(rem.paisDestino)}</td>
                    <td>${Number(rem.montanteEnvio).toLocaleString('pt-AO')} ${rem.moedaEnvio}</td>
                    <td>${Number(rem.montanteRecebimento).toLocaleString('pt-AO')} ${rem.moedaRecebimento}</td>
                    <td>${Number(rem.comissao).toLocaleString('pt-AO')} Kz</td>
                    <td><span class="badge badge-success">${rem.estado}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Controle de Abas
      conteudo.querySelectorAll<HTMLButtonElement>(".btn-tab").forEach((btnTab) => {
        btnTab.addEventListener("click", () => {
          conteudo.querySelectorAll(".btn-tab").forEach((b) => b.classList.remove("active"));
          conteudo.querySelectorAll(".tab-pane").forEach((p) => ((p as HTMLElement).style.display = "none"));
          btnTab.classList.add("active");
          const tabId = btnTab.getAttribute("data-tab");
          const alvo = conteudo.querySelector<HTMLElement>(`#${tabId}`);
          if (alvo) alvo.style.display = "block";
        });
      });

      // Gravar Edição Cadastral
      conteudo.querySelector("#form-editar-cliente-cad")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await api.atualizarCliente(cli.id, {
            nome: (conteudo.querySelector("#edit-cli-nome") as HTMLInputElement).value.trim(),
            telefone: (conteudo.querySelector("#edit-cli-tel") as HTMLInputElement).value.trim(),
            email: (conteudo.querySelector("#edit-cli-email") as HTMLInputElement).value.trim() || null,
            morada: (conteudo.querySelector("#edit-cli-morada") as HTMLInputElement).value.trim(),
            profissao: (conteudo.querySelector("#edit-cli-profissao") as HTMLInputElement).value.trim() || null,
            entidadeEmpregadora: (conteudo.querySelector("#edit-cli-empresa") as HTMLInputElement).value.trim() || null,
            finalidadeConta: (conteudo.querySelector("#edit-cli-finalidade") as HTMLInputElement).value.trim() || null,
            paisResidencia: (conteudo.querySelector("#edit-cli-pais") as HTMLInputElement).value.trim() || "AO",
          });
          alert("Dados cadastrais do cliente atualizados com sucesso.");
          void carregarListaClientes();
        } catch (err: any) {
          alert(`Erro ao atualizar: ${err.message}`);
        }
      });

      // Impersonar Cliente
      conteudo.querySelector("#btn-impersonar-cliente-act")?.addEventListener("click", async () => {
        const motivo = prompt("Indique o motivo formal de suporte para assumir a conta do cliente:");
        if (!motivo || motivo.trim().length < 5) {
          alert("O motivo formal de suporte é obrigatório (mínimo 5 caracteres).");
          return;
        }

        try {
          const res = await api.impersonarCliente(cli.id, motivo.trim());
          if (res.urlRedirecionamento) {
            window.open(res.urlRedirecionamento, "_blank");
          } else {
            alert("Sessão de suporte gerada com sucesso.");
          }
        } catch (err: any) {
          alert(`Erro na impersonação: ${err.message}`);
        }
      });

      // Bloquear Cliente
      conteudo.querySelector("#btn-bloquear-cliente-act")?.addEventListener("click", async () => {
        const motivo = prompt("Indique o motivo fundamentado para o bloqueio do cliente:");
        if (!motivo || motivo.trim().length < 5) {
          alert("O motivo do bloqueio é obrigatório.");
          return;
        }

        try {
          await api.bloquearCliente(cli.id, motivo.trim());
          alert("Cliente bloqueado com sucesso.");
          modal.style.display = "none";
          void carregarListaClientes();
        } catch (err: any) {
          alert(`Erro ao bloquear: ${err.message}`);
        }
      });

      // Desbloquear Cliente
      conteudo.querySelector("#btn-desbloquear-cliente-act")?.addEventListener("click", async () => {
        if (!confirm("Deseja realmente desbloquear este cliente?")) return;
        try {
          await api.desbloquearCliente(cli.id);
          alert("Cliente desbloqueado com sucesso.");
          modal.style.display = "none";
          void carregarListaClientes();
        } catch (err: any) {
          alert(`Erro ao desbloquear: ${err.message}`);
        }
      });

      // Terminar Sessões
      conteudo.querySelector("#btn-terminar-sessoes-cliente-act")?.addEventListener("click", async () => {
        if (!confirm("Deseja revogar todas as sessões ativas do cliente no portal?")) return;
        try {
          await api.terminarSessoesCliente(cli.id);
          alert("Sessões ativas do cliente terminadas com sucesso.");
        } catch (err: any) {
          alert(`Erro: ${err.message}`);
        }
      });
    } catch {
      conteudo.innerHTML = `<div class="alert-box alert-error">Erro ao carregar detalhes completos do cliente.</div>`;
    }
  }

  // Fechar modais
  container.querySelector("#btn-fechar-modal-cliente")?.addEventListener("click", () => {
    const modal = container.querySelector<HTMLElement>("#modal-perfil-cliente");
    if (modal) modal.style.display = "none";
  });

  const modalCriar = container.querySelector<HTMLElement>("#modal-criar-cliente");
  container.querySelector("#btn-novo-cliente")?.addEventListener("click", () => {
    if (modalCriar) modalCriar.style.display = "flex";
  });
  container.querySelector("#btn-fechar-modal-criar")?.addEventListener("click", () => {
    if (modalCriar) modalCriar.style.display = "none";
  });
  container.querySelector("#btn-cancelar-criar")?.addEventListener("click", () => {
    if (modalCriar) modalCriar.style.display = "none";
  });

  // Submeter Criação de Cliente
  container.querySelector("#form-cadastrar-cliente")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      tipo: (container.querySelector("#novo-tipo") as HTMLSelectElement).value as any,
      tipoDocumento: (container.querySelector("#novo-tipo-doc") as HTMLSelectElement).value as any,
      nome: (container.querySelector("#novo-nome") as HTMLInputElement).value.trim(),
      numeroDocumento: (container.querySelector("#novo-num-doc") as HTMLInputElement).value.trim(),
      nif: (container.querySelector("#novo-nif") as HTMLInputElement).value.trim(),
      nacionalidade: "Angolana",
      telefone: (container.querySelector("#novo-telefone") as HTMLInputElement).value.trim(),
      email: (container.querySelector("#novo-email") as HTMLInputElement).value.trim() || null,
      morada: (container.querySelector("#novo-morada") as HTMLInputElement).value.trim(),
    };

    try {
      await api.criarCliente(payload);
      alert("Cliente registado com sucesso.");
      if (modalCriar) modalCriar.style.display = "none";
      void carregarListaClientes();
    } catch (err: any) {
      alert(`Erro ao criar cliente: ${err.message}`);
    }
  });

  // Listeners de filtro
  const inputBusca = container.querySelector<HTMLInputElement>("#busca-cliente");
  inputBusca?.addEventListener("input", () => {
    busca = inputBusca.value;
    void carregarListaClientes();
  });

  const selEstado = container.querySelector<HTMLSelectElement>("#filtro-estado-cliente");
  selEstado?.addEventListener("change", () => {
    estadoFiltro = selEstado.value;
    void carregarListaClientes();
  });

  const selRisco = container.querySelector<HTMLSelectElement>("#filtro-risco-cliente");
  selRisco?.addEventListener("change", () => {
    riscoFiltro = selRisco.value;
    void carregarListaClientes();
  });

  container.querySelector("#btn-atualizar-clientes")?.addEventListener("click", () => {
    void carregarListaClientes();
  });

  void carregarListaClientes();
}
