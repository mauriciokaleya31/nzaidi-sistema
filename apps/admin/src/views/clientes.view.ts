import { api, ApiError, type ClienteItem } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { aCarregar, botaoFecharModal, cabecalhoPagina, estadoKyc, icone, notificar, risco, vazio } from "../ui/componentes.js";
import { esc, formatarData, formatarDataHora, iniciais } from "../ui/formatar.js";

const ROTULOS_DOCUMENTO: Record<string, string> = {
  bi: "BI",
  passaporte: "Passaporte",
  cartao_residente: "Cartão de residente",
  nif_empresa: "NIF de empresa",
  bi_frente: "BI, frente",
  bi_verso: "BI, verso",
  comprovativo_morada: "Comprovativo de morada",
  declaracao_rendimentos: "Declaração de rendimentos",
};

export async function renderizarClientes(container: HTMLElement): Promise<void> {
  const podeCriar = authState.temPermissao("clientes:criar");
  const podeAprovarKyc = authState.temPermissao("kyc:analisar") || authState.temPermissao("kyc:aprovar");

  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: "Clientes e KYC",
      descricao: "Registo e diligência prévia de pessoas singulares e colectivas, nos termos da Lei n.º 5/20 e das normas do BNA.",
      accoes: podeCriar
        ? `<button id="btn-novo-cliente" class="nz-botao nz-botao--primario">${icone("utilizador-mais")}Novo cliente</button>`
        : "",
    })}

    <div id="alerta-clientes" class="nz-alerta d-none"></div>

    <section class="nz-painel">
      <div class="barra-filtros" role="search">
        <div class="nz-entrada-grupo barra-filtros__pesquisa">
          ${icone("pesquisa")}
          <input
            type="search"
            id="input-busca-cliente"
            class="nz-entrada"
            placeholder="Nome, documento, NIF ou telefone"
            aria-label="Pesquisar clientes"
          />
        </div>
        <select id="select-filtro-kyc" class="nz-seletor" aria-label="Filtrar por estado KYC">
          <option value="">Todos os estados KYC</option>
          <option value="aprovado">Aprovado</option>
          <option value="pendente">Pendente</option>
          <option value="em_analise">Em análise</option>
          <option value="rejeitado">Rejeitado</option>
        </select>
      </div>
      <div id="tabela-clientes-container">${aCarregar(6, "A carregar clientes")}</div>
    </section>

    <!-- Modal Novo Cliente -->
    <div id="modal-cliente" class="nz-modal nz-modal--largo d-none" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-cliente">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="titulo-modal-cliente">Registar novo cliente</h2>
            <p class="nz-modal__descricao">O cliente fica com KYC pendente até à decisão de compliance.</p>
          </div>
          ${botaoFecharModal("btn-fechar-modal-cliente")}
        </div>
        <form id="form-criar-cliente" class="modal-form">
          <div class="nz-modal__corpo">
            <div id="modal-erro-cliente" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

            <fieldset class="nz-seccao-formulario">
              <legend class="nz-seccao-formulario__titulo">Identificação</legend>
              <div class="nz-grelha-campos">
                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="novo-tipo">Tipo de pessoa</label>
                  <select id="novo-tipo" class="nz-seletor">
                    <option value="singular">Pessoa singular (particular)</option>
                    <option value="colectivo">Pessoa colectiva (empresa)</option>
                  </select>
                </div>
                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="novo-nacionalidade">Nacionalidade</label>
                  <input type="text" id="novo-nacionalidade" class="nz-entrada" value="AO" required autocapitalize="characters" />
                  <span class="nz-campo__ajuda">Código do país, por exemplo AO.</span>
                </div>
                <div class="nz-campo nz-campo--inteiro">
                  <label class="nz-campo__rotulo" for="novo-nome">Nome completo ou denominação social<span class="nz-campo__obrigatorio">*</span></label>
                  <input type="text" id="novo-nome" class="nz-entrada" required minlength="3" placeholder="Como consta no documento" autocomplete="off" />
                </div>
              </div>
            </fieldset>

            <fieldset class="nz-seccao-formulario">
              <legend class="nz-seccao-formulario__titulo">Documento e fiscalidade</legend>
              <div class="nz-grelha-campos">
                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="novo-tipo-doc">Tipo de documento</label>
                  <select id="novo-tipo-doc" class="nz-seletor">
                    <option value="bi">Bilhete de Identidade (BI)</option>
                    <option value="passaporte">Passaporte</option>
                    <option value="cartao_residente">Cartão de Residente</option>
                    <option value="nif_empresa">NIF de Empresa</option>
                  </select>
                </div>
                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="novo-num-doc">Número do documento<span class="nz-campo__obrigatorio">*</span></label>
                  <input type="text" id="novo-num-doc" class="nz-entrada nz-mono" required minlength="5" autocomplete="off" autocapitalize="characters" />
                </div>
                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="novo-nif">NIF<span class="nz-campo__obrigatorio">*</span></label>
                  <input type="text" id="novo-nif" class="nz-entrada nz-mono" required minlength="5" inputmode="numeric" autocomplete="off" />
                </div>
              </div>
            </fieldset>

            <fieldset class="nz-seccao-formulario">
              <legend class="nz-seccao-formulario__titulo">Contactos e morada</legend>
              <div class="nz-grelha-campos">
                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="novo-telefone">Telefone<span class="nz-campo__obrigatorio">*</span></label>
                  <input type="tel" id="novo-telefone" class="nz-entrada" required minlength="7" inputmode="tel" autocomplete="off" placeholder="9XX XXX XXX" />
                </div>
                <div class="nz-campo">
                  <label class="nz-campo__rotulo" for="novo-email">Correio electrónico <span class="nz-texto-discreto">(opcional)</span></label>
                  <input type="email" id="novo-email" class="nz-entrada" inputmode="email" autocomplete="off" autocapitalize="off" />
                </div>
                <div class="nz-campo nz-campo--inteiro">
                  <label class="nz-campo__rotulo" for="novo-morada">Morada de residência ou sede<span class="nz-campo__obrigatorio">*</span></label>
                  <input type="text" id="novo-morada" class="nz-entrada" required minlength="5" autocomplete="off" placeholder="Rua, número, bairro, município" />
                </div>
              </div>
            </fieldset>
          </div>

          <div class="nz-modal__rodape">
            <button type="button" id="btn-cancelar-cliente" class="nz-botao nz-botao--secundario">Cancelar</button>
            <button type="submit" id="btn-salvar-cliente" class="nz-botao nz-botao--primario">Registar cliente</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Análise KYC -->
    <div id="modal-kyc" class="nz-modal d-none" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-kyc">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="titulo-modal-kyc">Decisão KYC e avaliação de risco</h2>
            <p class="nz-modal__descricao">A decisão e o parecer ficam registados na pista de auditoria.</p>
          </div>
          ${botaoFecharModal("btn-fechar-modal-kyc")}
        </div>
        <form id="form-decisao-kyc" class="modal-form">
          <div class="nz-modal__corpo">
            <input type="hidden" id="kyc-cliente-id" />
            <div id="modal-erro-kyc" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

            <div class="nz-campo">
              <label class="nz-campo__rotulo" for="kyc-cliente-nome">Cliente em análise</label>
              <input type="text" id="kyc-cliente-nome" class="nz-entrada" readonly disabled />
            </div>

            <div class="nz-grelha-campos">
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="kyc-decisao">Decisão de conformidade</label>
                <select id="kyc-decisao" class="nz-seletor">
                  <option value="aprovado">Aprovar (habilita operações de câmbio)</option>
                  <option value="em_analise">Manter em análise (diligência adicional)</option>
                  <option value="actualizacao_necessaria">Pedir actualização de documento</option>
                  <option value="rejeitado">Rejeitar (bloqueia operações)</option>
                </select>
              </div>
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="kyc-risco">Classificação de risco AML</label>
                <select id="kyc-risco" class="nz-seletor">
                  <option value="baixo">Risco baixo</option>
                  <option value="medio">Risco médio</option>
                  <option value="alto">Risco alto (PEP ou diligência reforçada)</option>
                </select>
              </div>
            </div>

            <div class="nz-campo">
              <label class="nz-campo__rotulo" for="kyc-motivo">Parecer de compliance<span class="nz-campo__obrigatorio">*</span></label>
              <textarea
                id="kyc-motivo"
                class="nz-area-texto"
                rows="4"
                placeholder="Resultado da verificação documental e da consulta às listas restritivas."
                required
              ></textarea>
              <span class="nz-campo__ajuda">Obrigatório. Este texto é guardado de forma permanente.</span>
            </div>
          </div>

          <div class="nz-modal__rodape">
            <button type="button" id="btn-cancelar-kyc" class="nz-botao nz-botao--secundario">Cancelar</button>
            <button type="submit" id="btn-salvar-kyc" class="nz-botao nz-botao--primario">Registar decisão</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Documentos KYC -->
    <div id="modal-docs" class="nz-modal nz-modal--largo d-none" role="dialog" aria-modal="true" aria-labelledby="docs-cliente-nome">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="docs-cliente-nome">Documentos anexados</h2>
            <p class="nz-modal__descricao">Dossiê documental KYC. Os ficheiros são verificados pelo servidor antes de serem aceites.</p>
          </div>
          ${botaoFecharModal("btn-fechar-modal-docs")}
        </div>
        <div class="nz-modal__corpo">
          <input type="hidden" id="docs-cliente-id" />

          <div id="lista-documentos-container">${aCarregar(3, "A carregar documentos")}</div>

          <form id="form-upload-doc" class="dossie-carregar">
            <h3 class="nz-seccao-formulario__titulo">${icone("carregar", "nz-icone--sm")}Anexar documento</h3>
            <div id="modal-erro-upload" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>
            <div class="nz-grelha-campos">
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="upload-tipo-doc">Tipo de documento</label>
                <select id="upload-tipo-doc" class="nz-seletor">
                  <option value="bi_frente">BI, frente</option>
                  <option value="bi_verso">BI, verso</option>
                  <option value="passaporte">Passaporte (página principal)</option>
                  <option value="nif_empresa">Certidão comercial ou NIF</option>
                  <option value="comprovativo_morada">Comprovativo de morada</option>
                  <option value="declaracao_rendimentos">Declaração de rendimentos ou origem dos fundos</option>
                </select>
              </div>
              <div class="nz-campo">
                <label class="nz-campo__rotulo" for="upload-input-file">Ficheiro</label>
                <input type="file" id="upload-input-file" class="nz-entrada" accept=".pdf,image/png,image/jpeg" required />
                <span class="nz-campo__ajuda">PDF, PNG ou JPEG, até 5 MB.</span>
              </div>
            </div>
            <button type="submit" id="btn-enviar-doc" class="nz-botao nz-botao--secundario">
              ${icone("carregar")}Anexar ao dossiê
            </button>
          </form>
        </div>
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
    containerTabela.innerHTML = aCarregar(6, "A carregar clientes");

    const termo = inputBusca?.value.trim() || undefined;
    const estadoKycFiltro = selectFiltroKyc?.value || undefined;

    try {
      listaClientes = await api.listarClientes(termo, estadoKycFiltro);
      if (!listaClientes || listaClientes.length === 0) {
        containerTabela.innerHTML =
          termo || estadoKycFiltro
            ? vazio({
                icone: "pesquisa",
                titulo: "Nenhum cliente encontrado",
                texto: "Nenhum registo corresponde à pesquisa ou ao filtro seleccionado.",
              })
            : vazio({
                icone: "clientes",
                titulo: "Ainda não há clientes registados",
                texto: "Registe o primeiro cliente para iniciar a diligência KYC.",
                accoes: podeCriar
                  ? `<button type="button" class="nz-botao nz-botao--primario" data-accao="novo-cliente">${icone("utilizador-mais")}Novo cliente</button>`
                  : "",
              });
        containerTabela.querySelector('[data-accao="novo-cliente"]')?.addEventListener("click", () => btnNovoCliente?.click());
        return;
      }

      containerTabela.innerHTML = `
        <div class="nz-tabela-envoltorio">
          <table class="nz-tabela nz-tabela--cartoes">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>NIF</th>
                <th>Telefone</th>
                <th>Estado KYC</th>
                <th>Risco</th>
                <th>Registo</th>
                <th class="nz-tabela__direita">Acções</th>
              </tr>
            </thead>
            <tbody>
              ${listaClientes
                .map(
                  (c) => `
                <tr>
                  <td data-principal>
                    <div class="celula-pessoa">
                      <span class="nz-avatar" aria-hidden="true">${esc(iniciais(c.nome))}</span>
                      <div>
                        <span class="nz-tabela__principal">${esc(c.nome)}</span>
                        <span class="nz-tabela__secundario">${c.tipo === "singular" ? "Pessoa singular" : "Pessoa colectiva"}${c.estado !== "ativo" ? ` · ${esc(c.estado)}` : ""}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Documento"><span class="nz-etiqueta">${esc(ROTULOS_DOCUMENTO[c.tipoDocumento] ?? c.tipoDocumento)}</span> <span class="nz-mono">${esc(c.numeroDocumento)}</span></td>
                  <td data-label="NIF" class="nz-mono">${esc(c.nif)}</td>
                  <td data-label="Telefone" class="nz-valor">${esc(c.telefone)}</td>
                  <td data-label="Estado KYC">${estadoKyc(c.estadoKyc)}</td>
                  <td data-label="Risco">${risco(c.nivelRisco)}</td>
                  <td data-label="Registo" class="nz-texto-discreto">${formatarData(c.criadoEm)}</td>
                  <td class="nz-tabela__accoes">
                    <div class="nz-grupo-botoes">
                      <button class="nz-botao nz-botao--secundario nz-botao--sm btn-ver-docs" data-id="${esc(c.id)}" data-nome="${esc(c.nome)}">
                        ${icone("pasta")}Dossiê
                      </button>
                      ${
                        podeAprovarKyc
                          ? `
                        <button class="nz-botao nz-botao--secundario nz-botao--sm btn-analisar-kyc" data-id="${esc(c.id)}" data-nome="${esc(c.nome)}">
                          ${icone("auditoria")}Avaliar KYC
                        </button>
                      `
                          : ""
                      }
                    </div>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="nz-painel__rodape">
          <span class="nz-paginacao__info">${listaClientes.length} ${listaClientes.length === 1 ? "cliente" : "clientes"}${listaClientes.length >= 50 ? " (primeiros 50 resultados; refine a pesquisa)" : ""}</span>
        </div>
      `;

      containerTabela.querySelectorAll(".btn-ver-docs").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id")!;
          const nome = btn.getAttribute("data-nome")!;
          abrirModalDocs(id, nome);
        });
      });

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
      containerTabela.innerHTML = vazio({
        icone: "alerta",
        titulo: "Não foi possível carregar os clientes",
        texto: "Verifique a ligação ao servidor e tente novamente.",
        variante: "erro",
        accoes: `<button type="button" class="nz-botao nz-botao--secundario" data-accao="tentar">${icone("actualizar")}Tentar novamente</button>`,
      });
      containerTabela.querySelector('[data-accao="tentar"]')?.addEventListener("click", () => void carregarLista());
    }
  }

  const modalDocs = container.querySelector<HTMLDivElement>("#modal-docs");
  const btnFecharDocs = container.querySelector<HTMLButtonElement>("#btn-fechar-modal-docs");
  const docsClienteId = container.querySelector<HTMLInputElement>("#docs-cliente-id");
  const docsClienteNome = container.querySelector<HTMLElement>("#docs-cliente-nome");
  const listaDocsContainer = container.querySelector<HTMLDivElement>("#lista-documentos-container");
  const formUploadDoc = container.querySelector<HTMLFormElement>("#form-upload-doc");
  const modalErroUpload = container.querySelector<HTMLDivElement>("#modal-erro-upload");

  btnFecharDocs?.addEventListener("click", () => modalDocs?.classList.add("d-none"));

  async function abrirModalDocs(id: string, nome: string): Promise<void> {
    if (!modalDocs || !docsClienteId || !docsClienteNome || !listaDocsContainer) return;
    docsClienteId.value = id;
    docsClienteNome.textContent = `Dossiê KYC de ${nome}`;
    modalErroUpload?.classList.add("d-none");
    modalDocs.classList.remove("d-none");

    await carregarDocumentosDoCliente(id);
  }

  async function carregarDocumentosDoCliente(clienteId: string): Promise<void> {
    if (!listaDocsContainer) return;
    listaDocsContainer.innerHTML = aCarregar(3, "A consultar ficheiros anexados");

    try {
      const docs = await api.listarDocumentosKyc(clienteId);
      if (!docs || docs.length === 0) {
        listaDocsContainer.innerHTML = `<div class="dossie-vazio">${vazio({
          icone: "pasta",
          titulo: "Dossiê sem documentos",
          texto: "Anexe o documento de identificação e o comprovativo de morada para avançar com a diligência.",
        })}</div>`;
        return;
      }

      listaDocsContainer.innerHTML = `
        <ul class="docs-list dossie">
          ${docs
            .map(
              (d: any) => `
            <li class="dossie__item">
              <span class="dossie__icone">${icone("documento")}</span>
              <div class="dossie__texto">
                <span class="dossie__tipo">${esc(ROTULOS_DOCUMENTO[d.tipoDocumento] ?? d.tipoDocumento)}</span>
                <span class="dossie__meta">${esc(d.nomeArquivo)} · ${(Number(d.tamanhoBytes) / 1024).toFixed(1).replace(".", ",")} KB · ${formatarDataHora(d.enviadoEm)}</span>
              </div>
              <a href="${api.obterUrlDownloadDocumento(clienteId, d.id)}" target="_blank" rel="noopener" class="nz-botao nz-botao--secundario nz-botao--sm">
                ${icone("descarregar")}Descarregar
              </a>
            </li>
          `
            )
            .join("")}
        </ul>
      `;
    } catch {
      listaDocsContainer.innerHTML = vazio({
        icone: "alerta",
        titulo: "Não foi possível listar os documentos",
        texto: "Tente novamente dentro de instantes.",
        variante: "erro",
      });
    }
  }

  formUploadDoc?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!docsClienteId || !modalErroUpload) return;
    const inputFile = container.querySelector<HTMLInputElement>("#upload-input-file");
    const selectTipoDoc = container.querySelector<HTMLSelectElement>("#upload-tipo-doc");
    const btnEnviar = container.querySelector<HTMLButtonElement>("#btn-enviar-doc");

    if (!inputFile?.files || inputFile.files.length === 0 || !inputFile.files[0]) {
      modalErroUpload.textContent = "Seleccione um ficheiro PDF, PNG ou JPEG.";
      modalErroUpload.classList.remove("d-none");
      return;
    }

    const file = inputFile.files[0];
    if (file.size > 5 * 1024 * 1024) {
      modalErroUpload.textContent = "O ficheiro excede o tamanho máximo de 5 MB.";
      modalErroUpload.classList.remove("d-none");
      return;
    }

    btnEnviar?.setAttribute("aria-busy", "true");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(",")[1];
        if (!base64String) throw new Error("Falha ao ler dados do ficheiro.");

        await api.carregarDocumentoKyc(docsClienteId.value, {
          tipoDocumento: selectTipoDoc?.value || "bi_frente",
          nomeArquivo: file.name,
          conteudoBase64: base64String,
        });

        modalErroUpload.classList.add("d-none");
        inputFile.value = "";
        await carregarDocumentosDoCliente(docsClienteId.value);
      } catch (err) {
        modalErroUpload.textContent = err instanceof ApiError ? err.message : "Não foi possível anexar o documento.";
        modalErroUpload.classList.remove("d-none");
      } finally {
        btnEnviar?.removeAttribute("aria-busy");
      }
    };
    reader.readAsDataURL(file);
  });

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
    const btnSalvar = container.querySelector<HTMLButtonElement>("#btn-salvar-cliente");

    btnSalvar?.setAttribute("aria-busy", "true");
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
      formCliente.reset();
      notificar(alerta, `Cliente ${nome} registado. O KYC fica pendente até à decisão de compliance.`);
      await carregarLista();
    } catch (err) {
      if (modalErroCliente) {
        modalErroCliente.textContent = err instanceof ApiError ? err.message : "Não foi possível registar o cliente.";
        modalErroCliente.classList.remove("d-none");
      }
    } finally {
      btnSalvar?.removeAttribute("aria-busy");
    }
  });

  formKyc?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!kycClienteId || !kycDecisao || !kycRisco || !kycMotivo) return;
    const btnSalvar = container.querySelector<HTMLButtonElement>("#btn-salvar-kyc");

    btnSalvar?.setAttribute("aria-busy", "true");
    try {
      await api.decidirKyc(kycClienteId.value, {
        estadoNovo: kycDecisao.value as any,
        nivelRisco: kycRisco.value as any,
        motivo: kycMotivo.value.trim(),
      });

      modalKyc?.classList.add("d-none");
      notificar(alerta, "Decisão KYC registada na pista de auditoria.");
      await carregarLista();
    } catch (err) {
      if (modalErroKyc) {
        modalErroKyc.textContent = err instanceof ApiError ? err.message : "Não foi possível registar a decisão KYC.";
        modalErroKyc.classList.remove("d-none");
      }
    } finally {
      btnSalvar?.removeAttribute("aria-busy");
    }
  });

  await carregarLista();
}
