import { mostrarToast } from "../components/modal-dialogo.js";
import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export async function renderizarPerfil(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Meu Perfil de Utilizador</h1>
        <p class="view-subtitle">Gestão dos seus dados de acesso, avatar institucional, credenciais e segurança de sessões.</p>
      </div>
    </div>

    <div class="dashboard-grid" style="grid-template-columns: 1fr 2fr; gap: 24px;">
      <!-- Coluna da Esquerda: Cartão de Identidade & Avatar -->
      <div class="card" style="text-align: center; padding: 24px;">
        <div style="position: relative; width: 110px; height: 110px; margin: 0 auto 16px auto;">
          <div id="avatar-preview-box" style="width: 110px; height: 110px; border-radius: 50%; background: #031d42; color: #cc9638; display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: 700; overflow: hidden; border: 3px solid #cc9638;">
            ${usuario.nome.charAt(0).toUpperCase()}
          </div>
          <label for="input-avatar-file" style="position: absolute; bottom: 0; right: 0; background: #031d42; color: #ffffff; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ffffff;" title="Carregar nova fotografia">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </label>
          <input type="file" id="input-avatar-file" accept="image/jpeg,image/png,image/webp" style="display: none;" />
        </div>

        <h2 id="perfil-card-nome" style="font-size: 18px; margin: 0 0 4px 0; color: #031d42;">${escapeHtml(usuario.nome)}</h2>
        <p id="perfil-card-email" class="text-muted" style="font-size: 13px; margin: 0 0 12px 0;">${escapeHtml(usuario.email)}</p>
        <span class="badge badge-gestao" style="font-size: 11px;">${usuario.funcao.toUpperCase()}</span>

        <div style="margin-top: 24px; text-align: left; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: var(--text-muted);">
          <div>ID de Utilizador: <strong style="color: #031d42;">${usuario.id.substring(0, 10)}...</strong></div>
          <div style="margin-top: 6px;">Segurança: <strong style="color: #10b981;">Autenticação Activa</strong></div>
        </div>
      </div>

      <!-- Coluna da Direita: Formulários de Dados e Segurança -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Formulário de Informação Pessoal -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Informações Pessoais & Contacto</h3>
          </div>
          <div class="card-body">
            <form id="form-perfil-dados">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label">Nome Completo:</label>
                  <input type="text" id="perfil-input-nome" class="form-control" value="${escapeHtml(usuario.nome)}" required minlength="3" />
                </div>
                <div class="form-group">
                  <label class="form-label">Contacto Telefónico:</label>
                  <input type="tel" id="perfil-input-tel" class="form-control" placeholder="+244923000111" />
                </div>
              </div>

              <div class="form-group mb-4">
                <label class="form-label">Correio Electrónico Institucional (Apenas Leitura):</label>
                <input type="email" class="form-control" value="${escapeHtml(usuario.email)}" disabled style="background: #f1f5f9; cursor: not-allowed;" />
                <small class="text-muted">A alteração de email institucional deve ser solicitada à Direcção de TI.</small>
              </div>

              <div style="display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary" id="btn-salvar-perfil">Gravar Informações</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Formulário de Alteração de Palavra-passe -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Segurança & Alteração de Palavra-passe</h3>
          </div>
          <div class="card-body">
            <form id="form-perfil-senha">
              <div class="form-group mb-3">
                <label class="form-label">Palavra-passe Actual:</label>
                <input type="password" id="senha-atual-input" class="form-control" placeholder="Introduza a sua palavra-passe actual" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label">Nova Palavra-passe:</label>
                  <input type="password" id="senha-nova-input" class="form-control" placeholder="Mínimo de 10 caracteres" required minlength="10" />
                </div>
                <div class="form-group">
                  <label class="form-label">Confirmar Nova Palavra-passe:</label>
                  <input type="password" id="senha-confirma-input" class="form-control" placeholder="Repita a nova palavra-passe" required minlength="10" />
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-secondary" style="border-color: #031d42; color: #031d42;">
                  Actualizar Palavra-passe
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Gestão de Sessões Ativas do Utilizador -->
        <div class="card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title">Sessões Activas & Dispositivos Conectados</h3>
            <button id="btn-recarregar-sessoes" class="btn btn-sm btn-secondary" type="button">Actualizar</button>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Início da Sessão</th>
                    <th>Endereço IP</th>
                    <th>Navegador / Sistema</th>
                    <th>Expira Em</th>
                    <th style="text-align: right;">Acção</th>
                  </tr>
                </thead>
                <tbody id="tabela-sessoes-perfil">
                  <tr><td colspan="5" style="text-align: center; padding: 16px;">A carregar sessões activas...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Carregar dados e avatar existentes
  let avatarBase64: string | null = null;

  async function carregarDadosCompletos(): Promise<void> {
    try {
      const dados = await api.obterPerfilProprio();
      const inputNome = container.querySelector<HTMLInputElement>("#perfil-input-nome");
      const inputTel = container.querySelector<HTMLInputElement>("#perfil-input-tel");
      const boxAvatar = container.querySelector<HTMLElement>("#avatar-preview-box");

      if (inputNome && dados.nome) inputNome.value = dados.nome;
      if (inputTel && dados.telefone) inputTel.value = dados.telefone;

      if (dados.avatarUrl && boxAvatar) {
        boxAvatar.innerHTML = `<img src="${dados.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;" />`;
        avatarBase64 = dados.avatarUrl;
      }
    } catch {}
  }

  // Carregar sessões ativas
  async function carregarSessoes(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-sessoes-perfil");
    if (!tbody) return;

    try {
      const sessoes = await api.listarSessoesProprias();
      if (!sessoes || sessoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 16px;">Apenas esta sessão local se encontra activa.</td></tr>`;
        return;
      }

      tbody.innerHTML = sessoes.map((s: any) => `
        <tr>
          <td>${new Date(s.criadoEm).toLocaleString("pt-AO")}</td>
          <td><strong>${escapeHtml(s.ip || '127.0.0.1')}</strong></td>
          <td class="text-muted" style="font-size: 11px;">${escapeHtml(s.userAgent || 'Navegador Web')}</td>
          <td>${new Date(s.expiraEm).toLocaleTimeString("pt-AO")}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-secondary btn-revogar-sessao" data-id="${s.id}" type="button" style="color: #ef4444;">
              Encerrar
            </button>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll<HTMLButtonElement>(".btn-revogar-sessao").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          if (confirm("Deseja revogar esta sessão activa?")) {
            await api.revogarSessaoPropria(id);
            mostrarToast("Sessão revogada.", "sucesso");
            void carregarSessoes();
          }
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="5" class="text-danger" style="text-align: center; padding: 16px;">Erro ao carregar sessões.</td></tr>`;
    }
  }

  // Upload e pré-visualização de avatar com validação de tamanho (2MB) e formato
  const inputFile = container.querySelector<HTMLInputElement>("#input-avatar-file");
  inputFile?.addEventListener("change", () => {
    const file = inputFile.files?.[0];
    if (!file) return;

    const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (!formatosPermitidos.includes(file.type)) {
      mostrarToast("Formato inválido. Por favor envie uma imagem JPG, PNG ou WebP.", "erro");
      inputFile.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      mostrarToast("A imagem selecionada é demasiado grande (máx 2 MB).", "erro");
      inputFile.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      avatarBase64 = e.target?.result as string;
      const box = container.querySelector<HTMLElement>("#avatar-preview-box");
      if (box) {
        box.innerHTML = `<img src="${avatarBase64}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  // Salvar Informações Pessoais
  container.querySelector("#form-perfil-dados")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = (container.querySelector("#perfil-input-nome") as HTMLInputElement).value.trim();
    const tel = (container.querySelector("#perfil-input-tel") as HTMLInputElement).value.trim();

    try {
      await api.atualizarPerfilProprio({
        nome,
        telefone: tel || null,
        avatarUrl: avatarBase64,
      });

      const elCardNome = container.querySelector("#perfil-card-nome");
      if (elCardNome) elCardNome.textContent = nome;

      mostrarToast("Perfil atualizado com sucesso.", "sucesso");
    } catch (err: any) {
      mostrarToast(`Erro ao guardar perfil: ${err.message}`, "erro");
    }
  });

  // Alterar Senha
  container.querySelector("#form-perfil-senha")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const atual = (container.querySelector("#senha-atual-input") as HTMLInputElement).value;
    const nova = (container.querySelector("#senha-nova-input") as HTMLInputElement).value;
    const confirma = (container.querySelector("#senha-confirma-input") as HTMLInputElement).value;

    if (nova !== confirma) {
      mostrarToast("A confirmação da nova palavra-passe não coincide.", "erro");
      return;
    }

    if (nova.length < 10) {
      mostrarToast("A nova palavra-passe deve conter pelo menos 10 caracteres.", "erro");
      return;
    }

    try {
      await api.alterarSenhaPropria({
        senhaAtual: atual,
        novaSenha: nova,
      });

      mostrarToast("Palavra-passe alterada com sucesso.", "sucesso");
      (container.querySelector("#form-perfil-senha") as HTMLFormElement).reset();
    } catch (err: any) {
      mostrarToast(`Erro ao alterar palavra-passe: ${err.message}`, "erro");
    }
  });

  container.querySelector("#btn-recarregar-sessoes")?.addEventListener("click", () => {
    void carregarSessoes();
  });

  void carregarDadosCompletos();
  void carregarSessoes();
}
