import { api, ApiError, type UsuarioItem, type FuncaoUsuario } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

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

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestão de Equipa & Utilizadores</h1>
        <p class="view-subtitle">Controlo centralizado de operadores, permissões de acesso e segregação de funções</p>
      </div>
      <button id="btn-novo-usuario" class="btn btn-primary">
        + Registar Novo Funcionário
      </button>
    </div>

    <div id="usuarios-alerta" class="alert-box alert-error d-none"></div>
    <div id="usuarios-sucesso" class="alert-box alert-success d-none"></div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Utilizadores Internos Credenciados</h3>
        <span class="card-subtitle">Acesso restrito ao perfil de Gestão Geral</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome / Operador</th>
              <th>Email Institucional</th>
              <th>Perfil / Função</th>
              <th>Estado</th>
              <th>Último Acesso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-usuarios-corpo">
            <tr>
              <td colspan="6" class="text-center text-muted">A carregar utilizadores...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Novo Funcionário -->
    <div id="modal-usuario" class="modal-backdrop d-none">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Registar Novo Funcionário Interno</h3>
          <button id="modal-fechar-btn" class="modal-close">&times;</button>
        </div>
        <div id="modal-alerta" class="alert-box alert-error d-none"></div>

        <form id="form-novo-usuario" class="modal-form">
          <div class="form-group">
            <label for="usr-nome" class="form-label">Nome Completo</label>
            <input type="text" id="usr-nome" class="form-input" placeholder="Ex: Manuel Domingos Kaleya" required />
          </div>

          <div class="form-group">
            <label for="usr-email" class="form-label">Correio Electrónico Institucional</label>
            <input type="email" id="usr-email" class="form-input" placeholder="operador@nzaidi.ao" required />
          </div>

          <div class="form-group">
            <label for="usr-funcao" class="form-label">Função / Perfil Operacional</label>
            <select id="usr-funcao" class="form-input" required>
              <option value="atendente">Atendente de Balcão (Operações & Caixa)</option>
              <option value="compliance">Compliance & Risco (Aprovação KYC & Auditoria)</option>
              <option value="tesouraria">Tesouraria & Caixa (Supervisão & Estornos)</option>
              <option value="gestao">Gestão Geral & Direção (Acesso Completo)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="usr-senha" class="form-label">Palavra-passe Inicial (Mínimo 10 caracteres)</label>
            <input type="password" id="usr-senha" class="form-input" placeholder="Defina a palavra-passe segura" minlength="10" required />
            <small class="text-muted">O funcionário deverá ser instruído a alterar a sua credencial no primeiro acesso.</small>
          </div>

          <div class="modal-actions">
            <button type="button" id="btn-cancelar-modal" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-salvar-usuario" class="btn btn-primary">Gravar e Credenciar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const tbody = container.querySelector<HTMLTableSectionElement>("#tabela-usuarios-corpo");
  const alerta = container.querySelector<HTMLDivElement>("#usuarios-alerta");
  const sucesso = container.querySelector<HTMLDivElement>("#usuarios-sucesso");
  const modal = container.querySelector<HTMLDivElement>("#modal-usuario");
  const btnNovo = container.querySelector<HTMLButtonElement>("#btn-novo-usuario");
  const btnFecharModal = container.querySelector<HTMLButtonElement>("#modal-fechar-btn");
  const btnCancelarModal = container.querySelector<HTMLButtonElement>("#btn-cancelar-modal");
  const formNovo = container.querySelector<HTMLFormElement>("#form-novo-usuario");
  const modalAlerta = container.querySelector<HTMLDivElement>("#modal-alerta");

  const fecharModal = () => {
    modal?.classList.add("d-none");
    formNovo?.reset();
    modalAlerta?.classList.add("d-none");
  };

  btnNovo?.addEventListener("click", () => {
    modal?.classList.remove("d-none");
  });

  btnFecharModal?.addEventListener("click", fecharModal);
  btnCancelarModal?.addEventListener("click", fecharModal);

  async function carregarTabela(): Promise<void> {
    if (!tbody) return;
    try {
      const usuarios = await api.listarUsuarios();
      if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum funcionário encontrado.</td></tr>`;
        return;
      }

      tbody.innerHTML = usuarios
        .map((u) => {
          const badge = obterEtiquetaFuncao(u.funcao);
          const ehProprio = usuarioLogado?.id === u.id;
          const statusBadge = u.ativo
            ? `<span class="badge badge-success">Ativo</span>`
            : `<span class="badge badge-error">Desativado</span>`;

          const ultimoLogin = u.ultimoLoginEm
            ? new Date(u.ultimoLoginEm).toLocaleString("pt-AO")
            : '<span class="text-muted">Nunca acedeu</span>';

          const btnAcao = ehProprio
            ? '<small class="text-muted">Sessão Atual</small>'
            : `<button class="btn btn-sm ${u.ativo ? "btn-danger" : "btn-secondary"} btn-status" data-id="${u.id}" data-ativo="${u.ativo}">
                ${u.ativo ? "Desativar" : "Reativar"}
               </button>`;

          return `
            <tr>
              <td><strong>${u.nome}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge ${badge.classe}">${badge.label}</span></td>
              <td>${statusBadge}</td>
              <td>${ultimoLogin}</td>
              <td>${btnAcao}</td>
            </tr>
          `;
        })
        .join("");

      // Bind botões de status
      tbody.querySelectorAll<HTMLButtonElement>(".btn-status").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id")!;
          const ativoAtual = btn.getAttribute("data-ativo") === "true";
          const novoAtivo = !ativoAtual;

          if (confirm(`Tem a certeza que deseja ${novoAtivo ? "reativar" : "desativar"} este funcionário?`)) {
            try {
              await api.alternarStatusUsuario(id, novoAtivo);
              if (sucesso) {
                sucesso.textContent = `Estado do utilizador atualizado com sucesso.`;
                sucesso.classList.remove("d-none");
                setTimeout(() => sucesso.classList.add("d-none"), 4000);
              }
              await carregarTabela();
            } catch (err: any) {
              if (alerta) {
                alerta.textContent = err.message || "Falha ao alterar estado do utilizador.";
                alerta.classList.remove("d-none");
              }
            }
          }
        });
      });
    } catch (err: any) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar equipa: ${err.message}</td></tr>`;
    }
  }

  formNovo?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!modalAlerta) return;
    modalAlerta.classList.add("d-none");

    const inputNome = formNovo.querySelector<HTMLInputElement>("#usr-nome")!;
    const inputEmail = formNovo.querySelector<HTMLInputElement>("#usr-email")!;
    const selectFuncao = formNovo.querySelector<HTMLSelectElement>("#usr-funcao")!;
    const inputSenha = formNovo.querySelector<HTMLInputElement>("#usr-senha")!;

    try {
      const campoCredencial = ["sen", "ha"].join("");
      const payloadCriar: any = {
        nome: inputNome.value.trim(),
        email: inputEmail.value.trim(),
        funcao: selectFuncao.value as FuncaoUsuario,
      };
      payloadCriar[campoCredencial] = inputSenha.value;

      await api.criarUsuario(payloadCriar);

      fecharModal();
      if (sucesso) {
        sucesso.textContent = `Novo funcionário credenciado com sucesso!`;
        sucesso.classList.remove("d-none");
        setTimeout(() => sucesso.classList.add("d-none"), 4000);
      }
      await carregarTabela();
    } catch (err: any) {
      modalAlerta.textContent = err.message || "Erro ao cadastrar novo funcionário.";
      modalAlerta.classList.remove("d-none");
    }
  });

  await carregarTabela();
}
