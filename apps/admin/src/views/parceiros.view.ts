import { api, type ParceiroItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { confirmarModal, mostrarToast, solicitarMotivoAcao } from "../components/modal-dialogo.js";

export async function renderizarParceiros(container: HTMLElement): Promise<void> {
  const podeGerir = authState.temPermissao("usuarios:gerir");
  const podeImpersonar = authState.temPermissao("clientes:impersonar");

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestão de Parceiros Comerciais</h1>
        <p class="view-subtitle">Controlo de correspondentes cambiais, canais de remessas e limites operacionais (Módulo B)</p>
      </div>
      <div>
        ${
          podeGerir
            ? `<button id="btn-novo-parceiro" class="btn btn-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Novo Parceiro Comercial</button>`
            : ""
        }
      </div>
    </div>

    <div class="card p-0 mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h3 class="card-title">Entidades Parceiras Credenciadas</h3>
        <span class="badge badge-info" id="badge-total-parceiros">A carregar...</span>
      </div>
      <div id="tabela-parceiros-container" class="table-responsive">
        <div class="loading-state p-4 text-center">A carregar lista de parceiros comerciais...</div>
      </div>
    </div>

    <!-- Modal Novo Parceiro Comercial -->
    <div id="modal-parceiro" class="modal-overlay d-none">
      <div class="modal-container" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title">Registar Novo Parceiro Comercial</h3>
          <button id="btn-fechar-modal-parceiro" class="btn-fechar-modal">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div id="modal-erro-parceiro" class="alert-box alert-error d-none"></div>

          <form id="form-criar-parceiro">
            <div class="form-row">
              <div class="form-group col-md-6">
                <label>Código do Parceiro *</label>
                <input type="text" id="parc-codigo" class="form-control" placeholder="Ex: PARC-MAXPAY" required />
                <small class="text-muted">Identificador único da entidade.</small>
              </div>
              <div class="form-group col-md-6">
                <label>Tipo de Atuação *</label>
                <select id="parc-tipo" class="form-control" required>
                  <option value="remessas">Remessas Internacionais</option>
                  <option value="pagamentos">Pagamentos Locais & Correspondente</option>
                  <option value="cambio">Operações Cambiais</option>
                  <option value="correspondente">Correspondente Bancário</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Nome / Razão Social da Entidade *</label>
              <input type="text" id="parc-nome" class="form-control" placeholder="Ex: MaxPay Global Financial Services" required />
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label>Comissão Contratada (%) *</label>
                <input type="number" step="0.01" min="0" max="10" id="parc-comissao" class="form-control" value="0.50" required />
              </div>
              <div class="form-group col-md-6">
                <label>Limite Diário Operacional (AOA) *</label>
                <input type="text" id="parc-limite" class="form-control" value="50000000.00" required />
              </div>
            </div>

            <div class="form-group">
              <label>Canais de Pagamento Autorizados * (separados por vírgula)</label>
              <input type="text" id="parc-canais" class="form-control" value="maxpay, remessa_parceiro" required />
              <small class="text-muted">Exemplo: maxpay, realtransfers, wise</small>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <h4 class="font-bold mb-2">Utilizador Administrador Inicial</h4>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label>Nome do Responsável *</label>
                <input type="text" id="parc-admin-nome" class="form-control" placeholder="Ex: Gestor Parceiro" required />
              </div>
              <div class="form-group col-md-6">
                <label>E-mail Corporativo de Acesso *</label>
                <input type="email" id="parc-admin-email" class="form-control" placeholder="gestor@parceiro.com" required />
              </div>
            </div>

            <div class="form-group">
              <label>Palavra-passe Inicial de Acesso *</label>
              <input type="password" id="parc-admin-senha" class="form-control" placeholder="Mínimo 8 caracteres" minlength="8" required />
            </div>

            <div class="modal-footer mt-4 d-flex justify-content-end gap-2">
              <button type="button" id="btn-cancelar-parceiro" class="btn btn-secondary">Cancelar</button>
              <button type="submit" id="btn-salvar-parceiro" class="btn btn-primary">Registar Entidade Parceira</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-parceiros-container")!;
  const badgeTotal = container.querySelector<HTMLElement>("#badge-total-parceiros")!;
  const modal = container.querySelector<HTMLDivElement>("#modal-parceiro")!;
  const btnNovo = container.querySelector<HTMLButtonElement>("#btn-novo-parceiro");
  const btnFechar = container.querySelector<HTMLButtonElement>("#btn-fechar-modal-parceiro");
  const btnCancelar = container.querySelector<HTMLButtonElement>("#btn-cancelar-parceiro");
  const form = container.querySelector<HTMLFormElement>("#form-criar-parceiro")!;
  const erroBox = container.querySelector<HTMLDivElement>("#modal-erro-parceiro")!;

  async function carregarLista(): Promise<void> {
    try {
      containerTabela.innerHTML = `<div class="loading-state p-4 text-center">A carregar lista de parceiros comerciais...</div>`;
      const lista = await api.listarParceirosAdmin();

      badgeTotal.textContent = `${lista.length} Registados`;

      if (lista.length === 0) {
        containerTabela.innerHTML = `
          <div class="empty-state p-4 text-center">
            <p class="text-muted">Nenhum parceiro comercial registado de momento.</p>
          </div>
        `;
        return;
      }

      containerTabela.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Entidade Parceira</th>
              <th>Tipo</th>
              <th>Canais</th>
              <th>Comissão</th>
              <th>Limite Diário</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${lista
              .map((p) => {
                const statusBadge =
                  p.estado === "ativo"
                    ? "badge-success"
                    : p.estado === "suspenso"
                    ? "badge-warning"
                    : "badge-danger";

                return `
                <tr>
                  <td><code><strong>${p.codigo}</strong></code></td>
                  <td>
                    <div><strong>${p.nome}</strong></div>
                    <small class="text-muted">Desde: ${new Date(p.criadoEm).toLocaleDateString("pt-AO")}</small>
                  </td>
                  <td><span class="badge badge-info">${p.tipo.toUpperCase()}</span></td>
                  <td>
                    ${p.canaisSuportados
                      .map((c) => `<span class="badge badge-secondary mr-1">${c}</span>`)
                      .join("")}
                  </td>
                  <td><strong>${p.comissaoPercentual}%</strong></td>
                  <td>${Number(p.limiteDiarioAoa).toLocaleString("pt-AO", { minimumFractionDigits: 2 })} AOA</td>
                  <td><span class="badge ${statusBadge}">${p.estado.toUpperCase()}</span></td>
                  <td>
                    ${
                      podeImpersonar
                        ? `
                      <button class="btn btn-sm btn-outline-warning btn-entrar-parceiro mr-1" data-id="${p.id}" data-nome="${p.nome}" title="Entrar no Portal do Parceiro">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Entrar na Conta
                      </button>
                    `
                        : ""
                    }
                    ${
                      podeGerir
                        ? `
                      <button class="btn btn-sm btn-outline-secondary btn-status-parceiro" data-id="${p.id}" data-estado="${p.estado}" data-nome="${p.nome}">
                        ${p.estado === "ativo" ? "Suspender" : "Ativar"}
                      </button>
                    `
                        : ""
                    }
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      `;

      // Listeners de Impersonação do Parceiro (Entrada Direta sem pedir motivo)
      if (podeImpersonar) {
        containerTabela.querySelectorAll(".btn-entrar-parceiro").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-id")!;
            const nome = btn.getAttribute("data-nome")!;

            const btnOriginal = btn.textContent;
            try {
              btn.setAttribute("disabled", "true");
              btn.textContent = "A aceder...";

              const res = await api.impersonarParceiroAdmin(id);
              if (res.sucesso && res.dados) {
                try {
                  localStorage.setItem("nzaidi_parceiro_token", res.dados.token);
                  localStorage.setItem("nzaidi_parceiro_dados", JSON.stringify(res.dados.parceiro));
                } catch {}
                mostrarToast(`A abrir Portal dos Parceiros (${nome})...`, "sucesso");
                const urlParceiro = `/parceiro/?sessao_suporte=${res.dados.token}#dashboard`;
                const novaAba = window.open(urlParceiro, "_blank");
                if (!novaAba) {
                  window.location.href = urlParceiro;
                }
              } else {
                mostrarToast(res.erro || "Falha ao personificar entidade parceira.", "erro");
              }
            } catch (err: any) {
              mostrarToast("Erro ao aceder à conta: " + (err.message || "Erro de ligação."), "erro");
            } finally {
              btn.removeAttribute("disabled");
              btn.textContent = btnOriginal;
            }
          });
        });
      }

      // Listeners de Status
      if (podeGerir) {
        containerTabela.querySelectorAll(".btn-status-parceiro").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-id")!;
            const estadoAtual = btn.getAttribute("data-estado")!;
            const nome = btn.getAttribute("data-nome")!;
            const novoEstado = estadoAtual === "ativo" ? "suspenso" : "ativo";

            let motivoSuspensao: string | undefined;
            if (novoEstado === "suspenso") {
              const m = await solicitarMotivoAcao({
                titulo: "Suspender Conta de Parceiro Comercial",
                subtitulo: `Entidade Parceira: ${nome}`,
                motivosPredefinidos: [
                  "Incumprimento de SLA de liquidação internacional de remessas",
                  "Divergência financeira detetada na reconciliação de instruções",
                  "Suspensão preventiva de Compliance e Auditoria BNA",
                  "Manutenção técnica ou revisão contratual da linha de correspondência",
                  "Outro motivo específico (detalhar abaixo)",
                ],
                textoConfirmar: "Confirmar Suspensão",
                perigo: true,
              });
              if (!m) return;
              motivoSuspensao = m;
            } else {
              const confirmar = await confirmarModal({
                titulo: "Reativar Parceiro Comercial",
                subtitulo: `Entidade: ${nome}`,
                mensagem: `Confirma a reativação operacional do parceiro "${nome}"?`,
                textoConfirmar: "Reativar Parceiro",
                perigo: false,
              });
              if (!confirmar) return;
            }

            try {
              btn.setAttribute("disabled", "true");
              await api.alterarStatusParceiroAdmin(id, novoEstado, motivoSuspensao);
              mostrarToast(
                novoEstado === "suspenso"
                  ? `Parceiro suspenso e notificação enviada por e-mail à entidade.`
                  : `Parceiro reativado com sucesso.`,
                "sucesso"
              );
              await carregarLista();
            } catch (err: any) {
              mostrarToast("Erro ao alterar estado: " + (err.message || "Falha de comunicação."), "erro");
              btn.removeAttribute("disabled");
            }
          });
        });
      }
    } catch {
      containerTabela.innerHTML = `<p class="p-4 text-danger text-center">Falha ao carregar lista de parceiros comerciais.</p>`;
    }
  }

  // Modais de Criação
  if (btnNovo) {
    btnNovo.addEventListener("click", () => {
      form.reset();
      erroBox.classList.add("d-none");
      modal.classList.remove("d-none");
    });
  }

  function fecharModal(): void {
    modal.classList.add("d-none");
  }

  btnFechar?.addEventListener("click", fecharModal);
  btnCancelar?.addEventListener("click", fecharModal);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erroBox.classList.add("d-none");

    const codigo = (container.querySelector("#parc-codigo") as HTMLInputElement).value.trim();
    const nome = (container.querySelector("#parc-nome") as HTMLInputElement).value.trim();
    const tipo = (container.querySelector("#parc-tipo") as HTMLSelectElement).value as any;
    const comissaoPercentual = (container.querySelector("#parc-comissao") as HTMLInputElement).value.trim();
    const limiteDiarioAoa = (container.querySelector("#parc-limite") as HTMLInputElement).value.trim();
    const canaisRaw = (container.querySelector("#parc-canais") as HTMLInputElement).value;
    const canaisSuportados = canaisRaw.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);

    const nomeAdmin = (container.querySelector("#parc-admin-nome") as HTMLInputElement).value.trim();
    const emailAdmin = (container.querySelector("#parc-admin-email") as HTMLInputElement).value.trim();
    const senhaAdmin = (container.querySelector("#parc-admin-senha") as HTMLInputElement).value;

    const btnSubmit = container.querySelector("#btn-salvar-parceiro") as HTMLButtonElement;
    btnSubmit.setAttribute("disabled", "true");
    btnSubmit.textContent = "A registar...";

    try {
      await api.criarParceiroAdmin({
        codigo,
        nome,
        tipo,
        canaisSuportados,
        comissaoPercentual,
        limiteDiarioAoa,
        nomeAdmin,
        emailAdmin,
        senhaAdmin,
      });

      fecharModal();
      await carregarLista();
    } catch (err: any) {
      erroBox.textContent = err.message || "Erro ao registar parceiro comercial.";
      erroBox.classList.remove("d-none");
    } finally {
      btnSubmit.removeAttribute("disabled");
      btnSubmit.textContent = "Registar Entidade Parceira";
    }
  });

  await carregarLista();
}
