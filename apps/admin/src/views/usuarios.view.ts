import { api, type UsuarioItem, type FuncaoUsuario } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { solicitarMotivoAcao, confirmarModal, mostrarToast } from "../components/modal-dialogo.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function obterEtiquetaFuncao(funcao: string): { label: string; classe: string } {
  switch (funcao) {
    case "gestao":
      return { label: "Gestão & Direção", classe: "badge-gestao" };
    case "compliance":
      return { label: "Compliance & Risco", classe: "badge-compliance" };
    case "tesouraria":
      return { label: "Tesouraria & Caixa", classe: "badge-tesouraria" };
    case "atendente":
    default:
      return { label: "Atendente de Balcão", classe: "badge-atendente" };
  }
}

export async function renderizarUsuarios(container: HTMLElement): Promise<void> {
  const usuarioLogado = authState.getUsuario();
  if (!usuarioLogado) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestão de Equipa & Utilizadores</h1>
        <p class="view-subtitle">Controlo centralizado de operadores, permissões RBAC, auditoria individual e suporte.</p>
      </div>
      <div class="view-actions" style="display: flex; gap: 10px;">
        <button id="btn-atualizar-usuarios" class="btn btn-secondary" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Atualizar Lista
        </button>
        <button id="btn-novo-usuario" class="btn btn-primary" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px;">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Registar Novo Funcionário
        </button>
      </div>
    </div>

    <!-- Tabela de Utilizadores -->
    <div class="card">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title">Equipa Interna Credenciada</h3>
        <span id="contador-usuarios-total" class="badge" style="background: #e2e8f0; color: #475569;">0 utilizadores</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Email Institucional</th>
              <th>Contacto</th>
              <th>Perfil / Função</th>
              <th>Estado</th>
              <th>Último Acesso</th>
              <th style="text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-usuarios-corpo">
            <tr>
              <td colspan="7" class="text-center text-muted" style="padding: 24px;">A carregar utilizadores...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Detalhes e Gestão Completa de Utilizador -->
    <div id="modal-detalhes-usuario" class="modal-backdrop" style="display: none;">
      <div class="modal-box modal-lg" style="max-width: 880px;">
        <div class="modal-header">
          <h2 id="modal-user-titulo" class="modal-title">Ficha Operacional do Funcionário</h2>
          <button id="btn-fechar-modal-user" class="btn-icon" type="button" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body" id="modal-user-conteudo">
          <div class="loading-state">A carregar detalhes completos...</div>
        </div>
      </div>
    </div>

    <!-- Modal Novo Funcionário -->
    <div id="modal-novo-usuario-box" class="modal-backdrop" style="display: none;">
      <div class="modal-box" style="max-width: 540px;">
        <div class="modal-header">
          <h2 class="modal-title">Registar Novo Funcionário</h2>
          <button id="btn-fechar-modal-novo-user" class="btn-icon" type="button" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-criar-funcionario">
            <div class="form-group mb-3">
              <label class="form-label">Nome Completo:</label>
              <input type="text" id="novo-user-nome" class="form-control" placeholder="ex.: Teresa Maria dos Santos" required minlength="3" />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Email Institucional (@nzaidi.ao):</label>
              <input type="email" id="novo-user-email" class="form-control" placeholder="ex.: teresa.santos@nzaidi.ao" required />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Contacto Telefónico:</label>
              <input type="tel" id="novo-user-telefone" class="form-control" placeholder="ex.: +244923000222" />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Perfil de Acesso (Função RBAC):</label>
              <select id="novo-user-funcao" class="form-control" required>
                <option value="atendente">Atendente de Balcão (Caixa e Atendimento)</option>
                <option value="compliance">Compliance & Risco (Aprovação KYC e AML)</option>
                <option value="tesouraria">Tesouraria (Liquidações e Contabilidade)</option>
                <option value="gestao">Gestão Geral (Administração Completa)</option>
              </select>
            </div>

            <div class="form-group mb-4">
              <label class="form-label">Palavra-passe Inicial (Mínimo 10 caracteres):</label>
              <input type="password" id="novo-user-senha" class="form-control" placeholder="Palavra-passe temporária segura" required minlength="10" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" id="btn-cancelar-novo-user">Cancelar</button>
              <button type="submit" class="btn btn-primary">Registar Funcionário</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  async function carregarListaUsuarios(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-usuarios-corpo");
    const contador = container.querySelector<HTMLElement>("#contador-usuarios-total");
    if (!tbody) return;

    try {
      const usuarios = await api.listarUsuarios();
      if (contador) contador.textContent = `${usuarios.length} utilizadores`;

      if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">Nenhum funcionário encontrado.</td></tr>`;
        return;
      }

      tbody.innerHTML = usuarios.map((u: UsuarioItem) => {
        const badge = obterEtiquetaFuncao(u.funcao);
        const ehProprio = u.id === usuarioLogado?.id;
        const estaBloqueado = Boolean((u as any).bloqueadoEm);

        return `
          <tr>
            <td>
              <div style="font-weight: 600; color: #031d42;">${escapeHtml(u.nome)} ${ehProprio ? '<span class="badge badge-info" style="font-size: 10px;">Você</span>' : ''}</div>
              <div class="text-muted" style="font-size: 11px;">ID: ${u.id.substring(0, 8)}...</div>
            </td>
            <td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(u.telefone || 'Não indicado')}</td>
            <td><span class="badge ${badge.classe}">${badge.label}</span></td>
            <td>
              ${estaBloqueado ? `
                <span class="badge badge-danger">Bloqueado</span>
              ` : u.ativo ? `
                <span class="badge badge-success">Ativo</span>
              ` : `
                <span class="badge badge-warning">Desativado</span>
              `}
            </td>
            <td class="text-muted" style="font-size: 12px;">
              ${u.ultimoLoginEm ? new Date(u.ultimoLoginEm).toLocaleDateString("pt-AO", { hour: "2-digit", minute: "2-digit" }) : "Nunca acedeu"}
            </td>
            <td style="text-align: right;">
              <button class="btn btn-sm btn-primary btn-detalhes-user" data-id="${u.id}" type="button">
                Gerir Ficha &rarr;
              </button>
            </td>
          </tr>
        `;
      }).join("");

      tbody.querySelectorAll<HTMLButtonElement>(".btn-detalhes-user").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (id) void abrirModalDetalhesUser(id);
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 24px;">Erro ao carregar utilizadores.</td></tr>`;
    }
  }

  // Modal com Estatísticas, Impersonação, Bloqueio e Edição
  async function abrirModalDetalhesUser(userId: string): Promise<void> {
    const modal = container.querySelector<HTMLElement>("#modal-detalhes-usuario");
    const conteudo = container.querySelector<HTMLElement>("#modal-user-conteudo");
    if (!modal || !conteudo) return;

    modal.style.display = "flex";
    conteudo.innerHTML = `<div class="loading-state">A carregar detalhes completos do utilizador...</div>`;

    try {
      const res = await api.obterDetalhesUsuario(userId);
      const u = res.usuario;
      const stats = res.estatisticas;
      const sessoes = res.sessoesAtivas || [];
      const ehProprio = u.id === usuarioLogado?.id;
      const estaBloqueado = Boolean(u.bloqueadoEm);

      conteudo.innerHTML = `
        <!-- Barra de Ações Administrativas -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; align-items: center;">
          <strong style="color: #031d42; font-size: 13px; margin-right: 8px;">Ações Administrativas:</strong>

          ${!ehProprio && u.ativo ? `
            <button id="btn-impersonar-user-act" class="btn btn-sm btn-primary" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: 4px;">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Entrar na Conta (Modo Suporte)
            </button>
          ` : ''}

          ${!ehProprio ? (estaBloqueado ? `
            <button id="btn-desbloquear-user-act" class="btn btn-sm btn-secondary" type="button" style="color: #10b981;">
              Desbloquear Conta
            </button>
          ` : `
            <button id="btn-bloquear-user-act" class="btn btn-sm btn-secondary" type="button" style="color: #ef4444;">
              Bloquear Conta (com Motivo)
            </button>
          `) : ''}

          ${!ehProprio ? `
            <button id="btn-alternar-ativo-act" class="btn btn-sm btn-secondary" type="button">
              ${u.ativo ? 'Desativar Conta' : 'Reativar Conta'}
            </button>
          ` : ''}

          <button id="btn-terminar-sessoes-user-act" class="btn btn-sm btn-secondary" type="button">
            Terminar Todas as Sessões
          </button>
        </div>

        ${estaBloqueado ? `
          <div class="alert-box alert-error mb-3">
            <strong>CONTA BLOQUEADA:</strong> Bloqueada em ${new Date(u.bloqueadoEm).toLocaleString("pt-AO")}.<br>
            <em>Motivo: ${escapeHtml(u.bloqueadoMotivo || 'Inconformidade administrativa')}</em>
          </div>
        ` : ''}

        <!-- Estatísticas Operacionais do Funcionário -->
        <div class="dashboard-grid mb-4" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          <div class="card" style="padding: 12px; background: #f8fafc;">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">Ações Auditadas</div>
            <div style="font-size: 20px; font-weight: 700; color: #031d42;">${stats.totalAuditorias}</div>
          </div>
          <div class="card" style="padding: 12px; background: #f8fafc;">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">KYC Aprovados</div>
            <div style="font-size: 20px; font-weight: 700; color: #10b981;">${stats.totalKycAprovados}</div>
          </div>
          <div class="card" style="padding: 12px; background: #f8fafc;">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">KYC Rejeitados</div>
            <div style="font-size: 20px; font-weight: 700; color: #ef4444;">${stats.totalKycRejeitados}</div>
          </div>
          <div class="card" style="padding: 12px; background: #f8fafc;">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">Sessões de Caixa</div>
            <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${stats.totalCaixasOperados}</div>
          </div>
        </div>

        <!-- Formulário de Edição do Utilizador -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title" style="font-size: 14px;">Editar Dados do Funcionário</h3></div>
          <div class="card-body">
            <form id="form-editar-user-admin">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Nome Completo:</label>
                  <input type="text" id="edit-user-nome" class="form-control" value="${escapeHtml(u.nome)}" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Contacto Telefónico:</label>
                  <input type="text" id="edit-user-tel" class="form-control" value="${escapeHtml(u.telefone || '')}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Email Institucional:</label>
                  <input type="email" id="edit-user-email" class="form-control" value="${escapeHtml(u.email)}" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Função / Perfil RBAC:</label>
                  <select id="edit-user-funcao" class="form-control" ${ehProprio ? 'disabled' : ''}>
                    <option value="atendente" ${u.funcao === 'atendente' ? 'selected' : ''}>Atendente de Balcão</option>
                    <option value="compliance" ${u.funcao === 'compliance' ? 'selected' : ''}>Compliance & Risco</option>
                    <option value="tesouraria" ${u.funcao === 'tesouraria' ? 'selected' : ''}>Tesouraria</option>
                    <option value="gestao" ${u.funcao === 'gestao' ? 'selected' : ''}>Gestão Geral</option>
                  </select>
                </div>
              </div>
              <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary">Gravar Alterações</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Sessões Ativas -->
        <div class="card">
          <div class="card-header"><h3 class="card-title" style="font-size: 14px;">Sessões Ativas (${sessoes.length})</h3></div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Início</th>
                    <th>IP</th>
                    <th>Navegador / Dispositivo</th>
                    <th>Expira Em</th>
                  </tr>
                </thead>
                <tbody>
                  ${sessoes.length === 0 ? `<tr><td colspan="4" class="text-muted" style="text-align: center; padding: 16px;">Nenhuma sessão ativa no momento.</td></tr>` : sessoes.map((s: any) => `
                    <tr>
                      <td>${new Date(s.criadoEm).toLocaleString("pt-AO")}</td>
                      <td>${escapeHtml(s.ip || '127.0.0.1')}</td>
                      <td class="text-muted" style="font-size: 11px;">${escapeHtml(s.userAgent || 'Desconhecido')}</td>
                      <td>${new Date(s.expiraEm).toLocaleTimeString("pt-AO")}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Eventos das Ações
      conteudo.querySelector("#form-editar-user-admin")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await api.atualizarUsuario(u.id, {
            nome: (conteudo.querySelector("#edit-user-nome") as HTMLInputElement).value.trim(),
            telefone: (conteudo.querySelector("#edit-user-tel") as HTMLInputElement).value.trim() || null,
            email: (conteudo.querySelector("#edit-user-email") as HTMLInputElement).value.trim(),
            funcao: (conteudo.querySelector("#edit-user-funcao") as HTMLSelectElement).value,
          });
          mostrarToast("Utilizador atualizado com sucesso.", "sucesso");
          void carregarListaUsuarios();
        } catch (err: any) {
          mostrarToast(`Erro ao atualizar: ${err.message}`, "erro");
        }
      });

      // Impersonar (Acesso Auditado de Suporte)
      conteudo.querySelector("#btn-impersonar-user-act")?.addEventListener("click", async () => {
        const motivo = await solicitarMotivoAcao({
          titulo: "Assumir Conta de Utilizador",
          subtitulo: `Membro da equipa: ${u.nome} (${u.email})`,
          labelMotivo: "Indique o motivo de auditoria ou suporte para assumir a conta:",
          placeholder: "Ex.: Auditoria de permissões de tesouraria / Suporte técnico à estação de trabalho",
          textoConfirmar: "Iniciar Modo Suporte",
          perigo: false,
          minimoCaracteres: 5,
        });

        if (!motivo) return;

        try {
          await api.impersonarUsuario(u.id, motivo);
          mostrarToast(`Modo de suporte iniciado como ${u.nome}.`, "sucesso");
          setTimeout(() => window.location.reload(), 400);
        } catch (err: any) {
          mostrarToast(`Erro na impersonação: ${err.message}`, "erro");
        }
      });

      // Bloquear
      conteudo.querySelector("#btn-bloquear-user-act")?.addEventListener("click", async () => {
        const motivo = await solicitarMotivoAcao({
          titulo: "Bloquear Acesso de Utilizador",
          subtitulo: `Funcionário: ${u.nome}`,
          labelMotivo: "Indique o motivo formal para bloquear o acesso:",
          placeholder: "Ex.: Suspensão preventiva / Desligamento da empresa",
          textoConfirmar: "Bloquear Acesso",
          perigo: true,
          minimoCaracteres: 5,
        });

        if (!motivo) return;

        try {
          await api.bloquearUsuario(u.id, motivo);
          mostrarToast("Utilizador bloqueado e sessões encerradas.", "sucesso");
          modal.style.display = "none";
          void carregarListaUsuarios();
        } catch (err: any) {
          mostrarToast(`Erro ao bloquear: ${err.message}`, "erro");
        }
      });

      // Desbloquear
      conteudo.querySelector("#btn-desbloquear-user-act")?.addEventListener("click", async () => {
        const confirmou = await confirmarModal({
          titulo: "Desbloquear Utilizador",
          mensagem: `Deseja realmente desbloquear a conta de ${u.nome}? O funcionário poderá autenticar-se novamente no sistema.`,
          textoConfirmar: "Desbloquear",
          perigo: false,
        });
        if (!confirmou) return;

        try {
          await api.desbloquearUsuario(u.id);
          mostrarToast("Utilizador desbloqueado com sucesso.", "sucesso");
          modal.style.display = "none";
          void carregarListaUsuarios();
        } catch (err: any) {
          mostrarToast(`Erro ao desbloquear: ${err.message}`, "erro");
        }
      });

      // Terminar Sessões
      conteudo.querySelector("#btn-terminar-sessoes-user-act")?.addEventListener("click", async () => {
        const confirmou = await confirmarModal({
          titulo: "Revogar Sessões Ativas",
          mensagem: `Deseja terminar todas as sessões ativas de ${u.nome}? Todas as ligações abertas serão fechadas imediatamente.`,
          textoConfirmar: "Terminar Sessões",
          perigo: true,
        });
        if (!confirmou) return;

        try {
          await api.terminarSessoesUsuario(u.id);
          mostrarToast("Todas as sessões do utilizador foram revogadas.", "sucesso");
          void abrirModalDetalhesUser(u.id);
        } catch (err: any) {
          mostrarToast(`Erro: ${err.message}`, "erro");
        }
      });

      // Alternar Ativo/Inativo
      conteudo.querySelector("#btn-alternar-ativo-act")?.addEventListener("click", async () => {
        const novoAtivo = !u.ativo;
        const confirmou = await confirmarModal({
          titulo: `${novoAtivo ? 'Reativar' : 'Desativar'} Conta`,
          mensagem: `Deseja ${novoAtivo ? 'reativar' : 'desativar'} a conta de ${u.nome}?`,
          textoConfirmar: novoAtivo ? "Reativar" : "Desativar",
          perigo: !novoAtivo,
        });
        if (!confirmou) return;

        try {
          await api.alternarStatusUsuario(u.id, novoAtivo);
          mostrarToast(`Conta ${novoAtivo ? 'reativada' : 'desativada'} com sucesso.`, "sucesso");
          modal.style.display = "none";
          void carregarListaUsuarios();
        } catch (err: any) {
          mostrarToast(`Erro: ${err.message}`, "erro");
        }
      });
    } catch {
      conteudo.innerHTML = `<div class="alert-box alert-error">Erro ao carregar detalhes do utilizador.</div>`;
    }
  }

  // Modais de Fecho
  container.querySelector("#btn-fechar-modal-user")?.addEventListener("click", () => {
    const modal = container.querySelector<HTMLElement>("#modal-detalhes-usuario");
    if (modal) modal.style.display = "none";
  });

  const modalNovo = container.querySelector<HTMLElement>("#modal-novo-usuario-box");
  container.querySelector("#btn-novo-usuario")?.addEventListener("click", () => {
    if (modalNovo) modalNovo.style.display = "flex";
  });
  container.querySelector("#btn-fechar-modal-novo-user")?.addEventListener("click", () => {
    if (modalNovo) modalNovo.style.display = "none";
  });
  container.querySelector("#btn-cancelar-novo-user")?.addEventListener("click", () => {
    if (modalNovo) modalNovo.style.display = "none";
  });

  // Submissão de Novo Utilizador
  container.querySelector("#form-criar-funcionario")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nome: (container.querySelector("#novo-user-nome") as HTMLInputElement).value.trim(),
      email: (container.querySelector("#novo-user-email") as HTMLInputElement).value.trim(),
      telefone: (container.querySelector("#novo-user-telefone") as HTMLInputElement).value.trim() || undefined,
      funcao: (container.querySelector("#novo-user-funcao") as HTMLSelectElement).value as FuncaoUsuario,
      senha: (container.querySelector("#novo-user-senha") as HTMLInputElement).value,
    };

    try {
      await api.criarUsuario(payload);
      mostrarToast("Funcionário registado com sucesso.", "sucesso");
      if (modalNovo) modalNovo.style.display = "none";
      void carregarListaUsuarios();
    } catch (err: any) {
      mostrarToast(`Erro ao criar utilizador: ${err.message}`, "erro");
    }
  });

  container.querySelector("#btn-atualizar-usuarios")?.addEventListener("click", () => {
    void carregarListaUsuarios();
  });

  void carregarListaUsuarios();
}
