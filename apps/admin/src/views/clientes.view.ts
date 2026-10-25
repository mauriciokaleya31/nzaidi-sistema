import { api, ApiError, type ClienteItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";

export async function renderizarClientes(container: HTMLElement): Promise<void> {
  const podeCriar = authState.temPermissao("clientes:criar");
  const podeAprovarKyc = authState.temPermissao("kyc:analisar") || authState.temPermissao("kyc:aprovar");

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Gestão de Clientes & Conformidade KYC</h1>
        <p class="view-subtitle">Registo e diligência prévia de pessoas singulares e colectivas (Lei n.º 5/20 e BNA)</p>
      </div>
      <div class="view-actions">
        ${
          podeCriar
            ? `
          <button id="btn-novo-cliente" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 6px;">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Novo Cliente
          </button>
        `
            : ""
        }
      </div>
    </div>

    <div id="alerta-clientes" class="alert-box d-none"></div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="form-row">
          <div class="col-8">
            <input 
              type="text" 
              id="input-busca-cliente" 
              class="form-input" 
              placeholder="Pesquisar por nome, número de documento, NIF ou telefone..." 
            />
          </div>
          <div class="col-4">
            <select id="select-filtro-kyc" class="form-select">
              <option value="">Todos os Estados KYC</option>
              <option value="aprovado">Aprovado</option>
              <option value="pendente">Pendente</option>
              <option value="em_analise">Em Análise</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Ficheiro de Clientes Cadastrados</h2>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive" id="tabela-clientes-container">
          <div class="loading-state">A carregar registos de clientes...</div>
        </div>
      </div>
    </div>

    <!-- Modal Novo Cliente -->
    <div id="modal-cliente" class="modal-overlay d-none">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">Registar Novo Cliente</h3>
          <button id="btn-fechar-modal-cliente" class="btn-fechar-modal">&times;</button>
        </div>
        <form id="form-criar-cliente" class="modal-form">
          <div id="modal-erro-cliente" class="alert-box alert-error d-none"></div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Tipo de Pessoa</label>
              <select id="novo-tipo" class="form-select">
                <option value="singular">Pessoa Singular (Particular)</option>
                <option value="colectivo">Pessoa Colectiva (Empresa)</option>
              </select>
            </div>
            <div class="form-group col-6">
              <label class="form-label">Nacionalidade</label>
              <input type="text" id="novo-nacionalidade" class="form-input" value="AO" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="novo-nome">Nome Completo / Denominação Social</label>
            <input type="text" id="novo-nome" class="form-input" required placeholder="Ex: Manuel António Domingos" />
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Tipo de Documento</label>
              <select id="novo-tipo-doc" class="form-select">
                <option value="bi">Bilhete de Identidade (BI)</option>
                <option value="passaporte">Passaporte</option>
                <option value="cartao_residente">Cartão de Residente</option>
                <option value="nif_empresa">NIF de Empresa</option>
              </select>
            </div>
            <div class="form-group col-6">
              <label class="form-label" for="novo-num-doc">Número do Documento</label>
              <input type="text" id="novo-num-doc" class="form-input" required placeholder="Ex: Número do documento" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label" for="novo-nif">NIF</label>
              <input type="text" id="novo-nif" class="form-input" required placeholder="Ex: 5001928374" />
            </div>
            <div class="form-group col-6">
              <label class="form-label" for="novo-telefone">Telefone</label>
              <input type="text" id="novo-telefone" class="form-input" required placeholder="Ex: 923456789" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="novo-email">Correio Electrónico (Opcional)</label>
            <input type="email" id="novo-email" class="form-input" placeholder="cliente@exemplo.ao" />
          </div>

          <div class="form-group">
            <label class="form-label" for="novo-morada">Morada de Residência / Sede</label>
            <input type="text" id="novo-morada" class="form-input" required placeholder="Ex: Rua Comandante Gika, Luanda" />
          </div>

          <div class="modal-footer">
            <button type="button" id="btn-cancelar-cliente" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-salvar-cliente" class="btn btn-primary">Gravar Registo</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Análise KYC -->
    <div id="modal-kyc" class="modal-overlay d-none">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">Diligência Prévia KYC & Avaliação de Risco</h3>
          <button id="btn-fechar-modal-kyc" class="btn-fechar-modal">&times;</button>
        </div>
        <form id="form-decisao-kyc" class="modal-form">
          <input type="hidden" id="kyc-cliente-id" />
          <div id="modal-erro-kyc" class="alert-box alert-error d-none"></div>

          <div class="form-group">
            <label class="form-label">Cliente sob Análise</label>
            <input type="text" id="kyc-cliente-nome" class="form-input" readonly disabled />
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Decisão de Conformidade</label>
              <select id="kyc-decisao" class="form-select">
                <option value="aprovado">Aprovar KYC (Habilitar para Câmbio)</option>
                <option value="em_analise">Em Análise / Diligência Adicional</option>
                <option value="actualizacao_necessaria">Solicitar Atualização de Documento</option>
                <option value="rejeitado">Rejeitar (Bloquear Operações)</option>
              </select>
            </div>
            <div class="form-group col-6">
              <label class="form-label">Classificação de Risco AML</label>
              <select id="kyc-risco" class="form-select">
                <option value="baixo">Baixo Risco</option>
                <option value="medio">Médio Risco</option>
                <option value="alto">Alto Risco (PEP / Reforçada)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="kyc-motivo">
              Parecer Formal de Compliance <span class="required-indicator">* (Obrigatório)</span>
            </label>
            <textarea 
              id="kyc-motivo" 
              class="form-textarea" 
              rows="3" 
              placeholder="Descreva o parecer da verificação documental e checagem de listas restritivas..." 
              required
            ></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" id="btn-cancelar-kyc" class="btn btn-secondary">Cancelar</button>
            <button type="submit" id="btn-salvar-kyc" class="btn btn-primary">Submeter Decisão</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-clientes-container");
  const alerta = container.querySelector<HTMLDivElement>("#alerta-clientes");
  const inputBusca = container.querySelector<HTMLInputElement>("#input-busca-cliente");
  const selectFiltroKyc = container.querySelector<HTMLSelectElement>("#select-filtro-kyc");

  const modalCliente = container.querySelector<HTMLDivElement>("#modal-cliente");
  const btnNovoCliente = container.querySelector<HTMLButtonElement>("#btn-novo-cliente");
  const btnFecharCliente = container.querySelector<HTMLButtonElement>("#btn-fechar-modal-cliente");
  const btnCancelarCliente = container.querySelector<HTMLButtonElement>("#btn-cancelar-cliente");
  const formCliente = container.querySelector<HTMLFormElement>("#form-criar-cliente");
  const modalErroCliente = container.querySelector<HTMLDivElement>("#modal-erro-cliente");

  const modalKyc = container.querySelector<HTMLDivElement>("#modal-kyc");
  const btnFecharKyc = container.querySelector<HTMLButtonElement>("#btn-fechar-modal-kyc");
  const btnCancelarKyc = container.querySelector<HTMLButtonElement>("#btn-cancelar-kyc");
  const formKyc = container.querySelector<HTMLFormElement>("#form-decisao-kyc");
  const modalErroKyc = container.querySelector<HTMLDivElement>("#modal-erro-kyc");
  const kycClienteId = container.querySelector<HTMLInputElement>("#kyc-cliente-id");
  const kycClienteNome = container.querySelector<HTMLInputElement>("#kyc-cliente-nome");
  const kycDecisao = container.querySelector<HTMLSelectElement>("#kyc-decisao");
  const kycRisco = container.querySelector<HTMLSelectElement>("#kyc-risco");
  const kycMotivo = container.querySelector<HTMLTextAreaElement>("#kyc-motivo");

  let listaClientes: ClienteItem[] = [];

  async function carregarLista(): Promise<void> {
    if (!containerTabela) return;
    containerTabela.innerHTML = `<div class="loading-state">A carregar registos de clientes...</div>`;

    const termo = inputBusca?.value.trim() || undefined;
    const estadoKyc = selectFiltroKyc?.value || undefined;

    try {
      listaClientes = await api.listarClientes(termo, estadoKyc);
      if (!listaClientes || listaClientes.length === 0) {
        containerTabela.innerHTML = `<p class="p-4 text-muted">Nenhum cliente encontrado para os critérios selecionados.</p>`;
        return;
      }

      containerTabela.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>NIF</th>
              <th>Telefone</th>
              <th>Estado KYC</th>
              <th>Risco</th>
              <th>Data Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${listaClientes
              .map((c) => {
                const kycBadge =
                  c.estadoKyc === "aprovado"
                    ? "badge-success"
                    : c.estadoKyc === "rejeitado"
                    ? "badge-danger"
                    : "badge-warning";

                return `
                <tr>
                  <td>
                    <div><strong>${c.nome}</strong></div>
                    <small class="text-muted">${c.tipo === "singular" ? "Pessoa Singular" : "Empresa"}</small>
                  </td>
                  <td><code>${c.tipoDocumento.toUpperCase()}: ${c.numeroDocumento}</code></td>
                  <td>${c.nif}</td>
                  <td>${c.telefone}</td>
                  <td><span class="badge ${kycBadge}">${c.estadoKyc.toUpperCase()}</span></td>
                  <td><span class="badge badge-info">${c.nivelRisco.toUpperCase()}</span></td>
                  <td><small class="text-muted">${new Date(c.criadoEm).toLocaleDateString("pt-AO")}</small></td>
                  <td>
                    ${
                      podeAprovarKyc
                        ? `
                      <button class="btn btn-sm btn-secondary btn-analisar-kyc" data-id="${c.id}" data-nome="${c.nome}">
                        Avaliar KYC
                      </button>
                    `
                        : `<span class="text-muted text-sm">-</span>`
                    }
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      `;

      if (podeAprovarKyc) {
        containerTabela.querySelectorAll(".btn-analisar-kyc").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id")!;
            const nome = btn.getAttribute("data-nome")!;
            abrirModalKyc(id, nome);
          });
        });
      }
    } catch {
      containerTabela.innerHTML = `<p class="p-4 text-danger">Erro ao carregar lista de clientes.</p>`;
    }
  }

  function abrirModalKyc(id: string, nome: string): void {
    if (!modalKyc || !kycClienteId || !kycClienteNome || !kycMotivo) return;
    kycClienteId.value = id;
    kycClienteNome.value = nome;
    kycMotivo.value = "";
    modalErroKyc?.classList.add("d-none");
    modalKyc.classList.remove("d-none");
  }

  btnNovoCliente?.addEventListener("click", () => {
    modalErroCliente?.classList.add("d-none");
    modalCliente?.classList.remove("d-none");
  });

  btnFecharCliente?.addEventListener("click", () => modalCliente?.classList.add("d-none"));
  btnCancelarCliente?.addEventListener("click", () => modalCliente?.classList.add("d-none"));

  btnFecharKyc?.addEventListener("click", () => modalKyc?.classList.add("d-none"));
  btnCancelarKyc?.addEventListener("click", () => modalKyc?.classList.add("d-none"));

  inputBusca?.addEventListener("input", () => void carregarLista());
  selectFiltroKyc?.addEventListener("change", () => void carregarLista());

  formCliente?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = (container.querySelector("#novo-nome") as HTMLInputElement).value;
    const tipo = (container.querySelector("#novo-tipo") as HTMLSelectElement).value as any;
    const tipoDoc = (container.querySelector("#novo-tipo-doc") as HTMLSelectElement).value as any;
    const numDoc = (container.querySelector("#novo-num-doc") as HTMLInputElement).value;
    const nif = (container.querySelector("#novo-nif") as HTMLInputElement).value;
    const nacionalidade = (container.querySelector("#novo-nacionalidade") as HTMLInputElement).value;
    const telefone = (container.querySelector("#novo-telefone") as HTMLInputElement).value;
    const email = (container.querySelector("#novo-email") as HTMLInputElement).value || null;
    const morada = (container.querySelector("#novo-morada") as HTMLInputElement).value;

    try {
      await api.criarCliente({
        nome,
        tipo,
        tipoDocumento: tipoDoc,
        numeroDocumento: numDoc,
        nif,
        nacionalidade,
        telefone,
        email,
        morada,
      });

      modalCliente?.classList.add("d-none");
      if (alerta) {
        alerta.className = "alert-box alert-success";
        alerta.textContent = `Cliente ${nome} registado com sucesso!`;
        alerta.classList.remove("d-none");
        setTimeout(() => alerta.classList.add("d-none"), 5000);
      }
      await carregarLista();
    } catch (err) {
      if (modalErroCliente) {
        modalErroCliente.textContent = err instanceof ApiError ? err.message : "Erro ao registar cliente.";
        modalErroCliente.classList.remove("d-none");
      }
    }
  });

  formKyc?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!kycClienteId || !kycDecisao || !kycRisco || !kycMotivo) return;

    try {
      await api.decidirKyc(kycClienteId.value, {
        estadoNovo: kycDecisao.value as any,
        nivelRisco: kycRisco.value as any,
        motivo: kycMotivo.value.trim(),
      });

      modalKyc?.classList.add("d-none");
      if (alerta) {
        alerta.className = "alert-box alert-success";
        alerta.textContent = "Decisão de KYC e conformidade registada com sucesso na auditoria!";
        alerta.classList.remove("d-none");
        setTimeout(() => alerta.classList.add("d-none"), 5000);
      }
      await carregarLista();
    } catch (err) {
      if (modalErroKyc) {
        modalErroKyc.textContent = err instanceof ApiError ? err.message : "Erro ao submeter decisão KYC.";
        modalErroKyc.classList.remove("d-none");
      }
    }
  });

  await carregarLista();
}
