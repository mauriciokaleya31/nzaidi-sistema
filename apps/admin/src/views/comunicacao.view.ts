import { api } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { confirmarModal, mostrarToast } from "../components/modal-dialogo.js";

function escapeHtml(texto: string): string {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export async function renderizarComunicacao(container: HTMLElement): Promise<void> {
  const usuario = authState.getUsuario();
  if (!usuario) {
    window.location.hash = "#login";
    return;
  }

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Comunicação, Anúncios & Campanhas</h1>
        <p class="view-subtitle">Gestão de avisos operacionais, dicas de educação financeira e campanhas segmentadas.</p>
      </div>
      <div class="view-actions" style="display: flex; gap: 10px;">
        <button id="btn-novo-anuncio" class="btn btn-primary" type="button">
          + Criar Novo Anúncio
        </button>
        <button id="btn-nova-dica" class="btn btn-secondary" type="button">
          + Nova Dica Financeira
        </button>
        <button id="btn-nova-campanha" class="btn btn-secondary" type="button">
          + Nova Campanha de Email
        </button>
      </div>
    </div>

    <!-- Navegação por Abas -->
    <div class="tab-nav mb-4" style="display: flex; gap: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
      <button class="btn btn-tab active" data-tab="tab-anuncios">Anúncios & Avisos Operacionais</button>
      <button class="btn btn-tab" data-tab="tab-dicas">Dicas de Educação Financeira</button>
      <button class="btn btn-tab" data-tab="tab-campanhas">Campanhas de Email</button>
    </div>

    <!-- ABA 1: ANÚNCIOS -->
    <div id="tab-anuncios" class="tab-pane active">
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">Anúncios & Banners Publicados</h3>
          <span id="contador-anuncios" class="badge" style="background: #e2e8f0; color: #475569;">0 anúncios</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Destino</th>
                  <th>Público</th>
                  <th>Estado</th>
                  <th>Criado Em</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="tabela-anuncios-corpo">
                <tr><td colspan="6" style="text-align: center; padding: 20px;">A carregar anúncios...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ABA 2: DICAS -->
    <div id="tab-dicas" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">Dicas Exibidas no Portal do Cliente & Website</h3>
          <span id="contador-dicas" class="badge" style="background: #e2e8f0; color: #475569;">0 dicas</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Título da Dica</th>
                  <th>Categoria</th>
                  <th>Estado</th>
                  <th>Data</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="tabela-dicas-corpo">
                <tr><td colspan="6" style="text-align: center; padding: 20px;">A carregar dicas...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ABA 3: CAMPANHAS DE EMAIL -->
    <div id="tab-campanhas" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">Campanhas de Email & Notificações Segmentadas</h3>
          <span id="contador-campanhas" class="badge" style="background: #e2e8f0; color: #475569;">0 campanhas</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Assunto</th>
                  <th>Segmento Alvo</th>
                  <th>Destinatários</th>
                  <th>Estado</th>
                  <th>Envio</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody id="tabela-campanhas-corpo">
                <tr><td colspan="6" style="text-align: center; padding: 20px;">A carregar campanhas...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Novo Anúncio -->
    <div id="modal-anuncio" class="modal-backdrop" style="display: none;">
      <div class="modal-box" style="max-width: 600px;">
        <div class="modal-header">
          <h2 class="modal-title">Novo Anúncio ou Aviso</h2>
          <button id="btn-fechar-modal-anuncio" class="btn-icon">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-criar-anuncio">
            <div class="form-group mb-3">
              <label class="form-label">Título do Anúncio:</label>
              <input type="text" id="anuncio-titulo" class="form-control" placeholder="ex.: Manutenção Programada do Sistema" required minlength="3" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label class="form-label">Canal de Destino:</label>
                <select id="anuncio-destino" class="form-control" required>
                  <option value="todos">Todos os Canais</option>
                  <option value="portal_cliente">Portal do Cliente</option>
                  <option value="portal_parceiro">Portal dos Parceiros</option>
                  <option value="website">Website Público</option>
                </select>
              </div>
              <div>
                <label class="form-label">Estado:</label>
                <select id="anuncio-estado" class="form-control" required>
                  <option value="publicado">Publicado Imediatamente</option>
                  <option value="rascunho">Rascunho Interno</option>
                </select>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Conteúdo / Mensagem:</label>
              <textarea id="anuncio-conteudo" class="form-control" rows="4" placeholder="Escreva os detalhes do aviso..." required minlength="5"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" id="btn-canc-anuncio">Cancelar</button>
              <button type="submit" class="btn btn-primary">Gravar Anúncio</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Nova Dica -->
    <div id="modal-dica" class="modal-backdrop" style="display: none;">
      <div class="modal-box" style="max-width: 540px;">
        <div class="modal-header">
          <h2 class="modal-title">Nova Dica Financeira</h2>
          <button id="btn-fechar-modal-dica" class="btn-icon">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-criar-dica">
            <div class="form-group mb-3">
              <label class="form-label">Título da Dica:</label>
              <input type="text" id="dica-titulo" class="form-control" placeholder="ex.: Como proteger as suas credenciais" required minlength="3" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <label class="form-label">Categoria:</label>
                <select id="dica-categoria" class="form-control" required>
                  <option value="seguranca">Segurança & Prevenção</option>
                  <option value="cambio">Câmbio de Moedas</option>
                  <option value="remessas">Remessas Internacionais</option>
                  <option value="educacao_financeira">Educação Financeira</option>
                  <option value="geral">Geral</option>
                </select>
              </div>
              <div>
                <label class="form-label">Ordem de Exibição:</label>
                <input type="number" id="dica-ordem" class="form-control" value="1" min="1" max="99" required />
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Texto da Dica:</label>
              <textarea id="dica-conteudo" class="form-control" rows="3" placeholder="Mensagem educativa..." required minlength="5"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" id="btn-canc-dica">Cancelar</button>
              <button type="submit" class="btn btn-primary">Registar Dica</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Nova Campanha -->
    <div id="modal-campanha" class="modal-backdrop" style="display: none;">
      <div class="modal-box" style="max-width: 650px;">
        <div class="modal-header">
          <h2 class="modal-title">Nova Campanha de Email</h2>
          <button id="btn-fechar-modal-campanha" class="btn-icon">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-criar-campanha">
            <div class="form-group mb-3">
              <label class="form-label">Assunto do Email:</label>
              <input type="text" id="campanha-assunto" class="form-control" placeholder="ex.: Novas taxas de câmbio disponíveis no NZAIDI" required minlength="3" />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Segmento Alvo de Destinatários:</label>
              <select id="campanha-segmento" class="form-control" required>
                <option value="todos">Todos os Clientes Registados</option>
                <option value="kyc_aprovado">Apenas Clientes com KYC Aprovado</option>
                <option value="kyc_pendente">Clientes com Pendências de Documentação</option>
                <option value="empresas">Empresas e Pessoas Coletivas</option>
                <option value="parceiros">Rede de Parceiros Comerciais</option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Conteúdo HTML do Email:</label>
              <textarea id="campanha-html" class="form-control" rows="5" placeholder="<h2>Olá, caro cliente NZAIDI!</h2><p>Informamos que...</p>" required minlength="10"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" id="btn-canc-campanha">Cancelar</button>
              <button type="submit" class="btn btn-primary">Criar Campanha</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Alternância de Abas
  container.querySelectorAll<HTMLButtonElement>(".btn-tab").forEach((btnTab) => {
    btnTab.addEventListener("click", () => {
      container.querySelectorAll(".btn-tab").forEach((b) => b.classList.remove("active"));
      container.querySelectorAll(".tab-pane").forEach((p) => ((p as HTMLElement).style.display = "none"));
      btnTab.classList.add("active");
      const tabId = btnTab.getAttribute("data-tab");
      const alvo = container.querySelector<HTMLElement>(`#${tabId}`);
      if (alvo) alvo.style.display = "block";
    });
  });

  // Carregamento de Anúncios
  async function carregarAnuncios(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-anuncios-corpo");
    const contador = container.querySelector<HTMLElement>("#contador-anuncios");
    if (!tbody) return;

    try {
      const res = await api.listarAnuncios();
      if (contador) contador.textContent = `${res.length} anúncios`;

      if (res.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 24px;">Sem anúncios registados.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.map((a: any) => `
        <tr>
          <td>
            <div style="font-weight: 600; color: #031d42;">${escapeHtml(a.titulo)}</div>
            <div class="text-muted" style="font-size: 11px;">${escapeHtml(a.conteudo.substring(0, 60))}...</div>
          </td>
          <td><span class="badge badge-info">${a.destino.toUpperCase()}</span></td>
          <td>${escapeHtml(a.publicoAlvo)}</td>
          <td><span class="badge ${a.estado === 'publicado' ? 'badge-success' : 'badge-warning'}">${a.estado.toUpperCase()}</span></td>
          <td class="text-muted" style="font-size: 12px;">${new Date(a.criadoEm).toLocaleDateString("pt-AO")}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-secondary btn-del-anuncio" data-id="${a.id}" type="button" style="color: #ef4444;">
              Remover
            </button>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll<HTMLButtonElement>(".btn-del-anuncio").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          if (confirm("Deseja remover este anúncio?")) {
            await api.removerAnuncio(id);
            void carregarAnuncios();
          }
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar anúncios.</td></tr>`;
    }
  }

  // Carregamento de Dicas
  async function carregarDicas(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-dicas-corpo");
    const contador = container.querySelector<HTMLElement>("#contador-dicas");
    if (!tbody) return;

    try {
      const res = await api.listarDicas();
      if (contador) contador.textContent = `${res.length} dicas`;

      if (res.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 24px;">Sem dicas registadas.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.map((d: any) => `
        <tr>
          <td><strong>#${d.ordem}</strong></td>
          <td>
            <div style="font-weight: 600; color: #031d42;">${escapeHtml(d.titulo)}</div>
            <div class="text-muted" style="font-size: 11px;">${escapeHtml(d.conteudo)}</div>
          </td>
          <td><span class="badge badge-gestao">${d.categoria.toUpperCase()}</span></td>
          <td><span class="badge badge-success">${d.estado.toUpperCase()}</span></td>
          <td class="text-muted" style="font-size: 12px;">${new Date(d.criadoEm).toLocaleDateString("pt-AO")}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-secondary btn-del-dica" data-id="${d.id}" type="button" style="color: #ef4444;">
              Remover
            </button>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll<HTMLButtonElement>(".btn-del-dica").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          const confirmou = await confirmarModal({
            titulo: "Remover Dica",
            mensagem: "Deseja realmente remover esta dica informativa?",
            textoConfirmar: "Remover",
            perigo: true,
          });
          if (confirmou) {
            await api.removerDica(id);
            mostrarToast("Dica informativa removida.", "sucesso");
            void carregarDicas();
          }
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar dicas.</td></tr>`;
    }
  }

  // Carregamento de Campanhas
  async function carregarCampanhas(): Promise<void> {
    const tbody = container.querySelector<HTMLElement>("#tabela-campanhas-corpo");
    const contador = container.querySelector<HTMLElement>("#contador-campanhas");
    if (!tbody) return;

    try {
      const res = await api.listarCampanhas();
      if (contador) contador.textContent = `${res.length} campanhas`;

      if (res.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 24px;">Sem campanhas criadas.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.map((c: any) => `
        <tr>
          <td>
            <div style="font-weight: 600; color: #031d42;">${escapeHtml(c.assunto)}</div>
            <div class="text-muted" style="font-size: 11px;">ID: ${c.id.substring(0, 8)}...</div>
          </td>
          <td><span class="badge badge-info">${c.segmentoAlvo.toUpperCase()}</span></td>
          <td>${c.totalDestinatarios || 'Base completa'}</td>
          <td><span class="badge ${c.estado === 'enviada' ? 'badge-success' : 'badge-warning'}">${c.estado.toUpperCase()}</span></td>
          <td class="text-muted" style="font-size: 12px;">${c.enviadaEm ? new Date(c.enviadaEm).toLocaleString("pt-AO") : "Pendente"}</td>
          <td style="text-align: right;">
            ${c.estado !== 'enviada' ? `
              <button class="btn btn-sm btn-primary btn-disparar-campanha" data-id="${c.id}" type="button">
                Disparar Campanha
              </button>
            ` : `
              <span class="text-muted" style="font-size: 12px; color: #10b981; font-weight: 600;">Disparada (${c.totalEnviados} enviados)</span>
            `}
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll<HTMLButtonElement>(".btn-disparar-campanha").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          const confirmou = await confirmarModal({
            titulo: "Disparar Campanha de Email",
            mensagem: "Deseja disparar esta campanha de email para o segmento selecionado através do provedor activo?",
            textoConfirmar: "Disparar Agora",
            perigo: false,
          });
          if (confirmou) {
            try {
              const r = await api.dispararCampanha(id);
              mostrarToast(`Campanha enviada com sucesso para ${r.totalEnviados} destinatários.`, "sucesso");
              void carregarCampanhas();
            } catch (err: any) {
              mostrarToast(`Erro: ${err.message}`, "erro");
            }
          }
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger" style="text-align: center; padding: 24px;">Erro ao carregar campanhas.</td></tr>`;
    }
  }

  // Modais de Criação
  const modalAnuncio = container.querySelector<HTMLElement>("#modal-anuncio");
  container.querySelector("#btn-novo-anuncio")?.addEventListener("click", () => {
    if (modalAnuncio) modalAnuncio.style.display = "flex";
  });
  container.querySelector("#btn-fechar-modal-anuncio")?.addEventListener("click", () => {
    if (modalAnuncio) modalAnuncio.style.display = "none";
  });
  container.querySelector("#btn-canc-anuncio")?.addEventListener("click", () => {
    if (modalAnuncio) modalAnuncio.style.display = "none";
  });

  container.querySelector("#form-criar-anuncio")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.criarAnuncio({
        titulo: (container.querySelector("#anuncio-titulo") as HTMLInputElement).value.trim(),
        destino: (container.querySelector("#anuncio-destino") as HTMLSelectElement).value,
        estado: (container.querySelector("#anuncio-estado") as HTMLSelectElement).value,
        conteudo: (container.querySelector("#anuncio-conteudo") as HTMLTextAreaElement).value.trim(),
        publicoAlvo: "todos",
      });
      mostrarToast("Anúncio criado com sucesso.", "sucesso");
      if (modalAnuncio) modalAnuncio.style.display = "none";
      (container.querySelector("#form-criar-anuncio") as HTMLFormElement).reset();
      void carregarAnuncios();
    } catch (err: any) {
      mostrarToast(`Erro: ${err.message}`, "erro");
    }
  });

  const modalDica = container.querySelector<HTMLElement>("#modal-dica");
  container.querySelector("#btn-nova-dica")?.addEventListener("click", () => {
    if (modalDica) modalDica.style.display = "flex";
  });
  container.querySelector("#btn-fechar-modal-dica")?.addEventListener("click", () => {
    if (modalDica) modalDica.style.display = "none";
  });
  container.querySelector("#btn-canc-dica")?.addEventListener("click", () => {
    if (modalDica) modalDica.style.display = "none";
  });

  container.querySelector("#form-criar-dica")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.criarDica({
        titulo: (container.querySelector("#dica-titulo") as HTMLInputElement).value.trim(),
        categoria: (container.querySelector("#dica-categoria") as HTMLSelectElement).value,
        ordem: parseInt((container.querySelector("#dica-ordem") as HTMLInputElement).value, 10),
        conteudo: (container.querySelector("#dica-conteudo") as HTMLTextAreaElement).value.trim(),
      });
      mostrarToast("Dica registada com sucesso.", "sucesso");
      if (modalDica) modalDica.style.display = "none";
      (container.querySelector("#form-criar-dica") as HTMLFormElement).reset();
      void carregarDicas();
    } catch (err: any) {
      mostrarToast(`Erro: ${err.message}`, "erro");
    }
  });

  const modalCampanha = container.querySelector<HTMLElement>("#modal-campanha");
  container.querySelector("#btn-nova-campanha")?.addEventListener("click", () => {
    if (modalCampanha) modalCampanha.style.display = "flex";
  });
  container.querySelector("#btn-fechar-modal-campanha")?.addEventListener("click", () => {
    if (modalCampanha) modalCampanha.style.display = "none";
  });
  container.querySelector("#btn-canc-campanha")?.addEventListener("click", () => {
    if (modalCampanha) modalCampanha.style.display = "none";
  });

  container.querySelector("#form-criar-campanha")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.criarCampanha({
        assunto: (container.querySelector("#campanha-assunto") as HTMLInputElement).value.trim(),
        segmentoAlvo: (container.querySelector("#campanha-segmento") as HTMLSelectElement).value,
        modeloHtml: (container.querySelector("#campanha-html") as HTMLTextAreaElement).value.trim(),
        totalDestinatarios: 250,
      });
      mostrarToast("Campanha criada com sucesso.", "sucesso");
      if (modalCampanha) modalCampanha.style.display = "none";
      (container.querySelector("#form-criar-campanha") as HTMLFormElement).reset();
      void carregarCampanhas();
    } catch (err: any) {
      mostrarToast(`Erro: ${err.message}`, "erro");
    }
  });

  void carregarAnuncios();
  void carregarDicas();
  void carregarCampanhas();
}
