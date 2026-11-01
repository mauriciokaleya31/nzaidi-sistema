import { api, type DocumentoKyc } from "../api.js";
import { authState } from "../auth.state.js";
import { icone } from "../components/icones.js";
import { TEXTOS, obterRotuloEstadoDocumento, obterRotuloVerificacao } from "../textos/pt-AO.js";
import { formatarDataHora } from "../formatadores/moeda.js";

export function renderDocumentosView(container: HTMLElement): void {
  let documentos: DocumentoKyc[] = [];
  let carregando = true;
  let aSubmeter = false;
  let ficheiroPreview: string | null = null;
  let nomeFicheiroPreview = "";
  let mensagemSucesso = "";
  let mensagemErro = "";

  async function carregarDados() {
    try {
      carregando = true;
      documentos = await api.listarDocumentos();
    } catch (e) {
      console.error("Erro ao carregar documentos:", e);
    } finally {
      carregando = false;
      render();
    }
  }

  function formatarTipoDocumento(tipo: string): string {
    const mapa: Record<string, string> = {
      bi_frente: "Bilhete de Identidade (Frente)",
      bi_verso: "Bilhete de Identidade (Verso)",
      passaporte: "Passaporte (Página Principal)",
      comprovativo_morada: "Comprovativo de Morada / Residência",
      nif_empresa: "Certidão Comercial / Cartão NIF",
      declaracao_rendimentos: "Declaração de Rendimentos / Salário",
    };
    return mapa[tipo] || tipo;
  }

  function render() {
    const cliente = authState.cliente;
    if (!cliente) return;

    if (carregando) {
      container.innerHTML = `
        <div class="skeleton-card" style="height: 380px;"></div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="dashboard-section">
        <div class="section-header">
          <h1 class="title">${TEXTOS.navegacao.documentos}</h1>
          <p class="subtitle">Mantenha a sua verificação de identidade em conformidade com as normas regulamentares do BNA.</p>
        </div>

        ${
          mensagemSucesso
            ? `<div class="alert-box alert-success">${icone("sucesso", 18)} <span>${mensagemSucesso}</span></div>`
            : ""
        }
        ${
          mensagemErro
            ? `<div class="alert-box alert-error">${icone("erro", 18)} <span>${mensagemErro}</span></div>`
            : ""
        }

        <!-- Estado Geral da Verificação -->
        <div class="card p-large mb-large">
          <div class="card-header-clean">
            <div>
              <span class="field-label">Estado da sua Verificação de Identidade</span>
              <h2 class="card-title-lg mt-small">${obterRotuloVerificacao(cliente.estadoKyc)}</h2>
            </div>
            <span class="badge badge-${cliente.estadoKyc}">
              ${obterRotuloVerificacao(cliente.estadoKyc)}
            </span>
          </div>
          <p class="text-suave mt-small">
            A aprovação documental confere limites plenos para compras e vendas de moeda estrangeira e remessas internacionais.
          </p>
        </div>

        <div class="grid-cards">
          <!-- Formulário com Arrastar/Escolher e Pré-visualização -->
          <div class="card p-large">
            <h2 class="card-title-md">Enviar Documento</h2>
            <p class="text-suave mb-medium">Carregue ficheiros nítidos nos formatos PDF, PNG ou JPEG.</p>

            <form id="form-upload-doc" class="form-layout">
              <div class="form-group">
                <label class="form-label" for="select-tipo-doc">Tipo de Documento</label>
                <select id="select-tipo-doc" class="form-select" required>
                  <option value="bi_frente">Bilhete de Identidade (Frente)</option>
                  <option value="bi_verso">Bilhete de Identidade (Verso)</option>
                  <option value="passaporte">Passaporte (Página Principal)</option>
                  <option value="comprovativo_morada">Comprovativo de Morada (Água, Luz ou Atestado)</option>
                  <option value="nif_empresa">Certidão Comercial / Cartão NIF</option>
                  <option value="declaracao_rendimentos">Declaração de Rendimentos / Salário</option>
                </select>
              </div>

              <!-- Zona de Arraste (Dropzone) -->
              <div class="dropzone-box" id="dropzone-documento">
                <input type="file" id="input-file-doc" class="file-input-hidden" accept=".pdf,image/png,image/jpeg" />
                <div class="dropzone-content">
                  <div class="dropzone-icon">${icone("enviarFicheiro", 32)}</div>
                  <strong>Arraste o documento ou clique para escolher</strong>
                  <span class="dropzone-hint">Formatos: PDF, PNG, JPEG (Tamanho máx. 5 MB)</span>
                </div>
              </div>

              <!-- Pré-visualização -->
              ${
                ficheiroPreview
                  ? `
                <div class="preview-box mt-small">
                  <div class="preview-info">
                    ${icone("documentos", 18)}
                    <span>${nomeFicheiroPreview}</span>
                  </div>
                  <button type="button" id="btn-remover-preview" class="btn-link-action text-erro">
                    ${icone("fechar", 14)} Remover
                  </button>
                </div>
              `
                  : ""
              }

              <button
                type="submit"
                class="btn btn-primary btn-block mt-medium"
                ${aSubmeter || !ficheiroPreview ? "disabled" : ""}
              >
                ${
                  aSubmeter
                    ? `${icone("relogio", 16)} A enviar e verificar integridade...`
                    : `${icone("enviarFicheiro", 16)} ${TEXTOS.botoes.enviarDocumento}`
                }
              </button>
            </form>
          </div>

          <!-- Requisitos e Instruções -->
          <div class="card p-large">
            <h2 class="card-title-md">Critérios de Aceitação BNA</h2>
            <ul class="info-list mt-medium">
              <li><strong>Legibilidade Integral:</strong> As 4 extremidades do documento devem estar visíveis e os caracteres legíveis sem reflexos.</li>
              <li><strong>Prazo de Validade:</strong> O documento deve encontrar-se em vigor à data de apresentação.</li>
              <li><strong>Assinatura Digital de Integridade:</strong> Cada ficheiro é encriptado com cálculo do hash SHA-256 no momento do envio.</li>
            </ul>

            <div class="note note-success mt-large">
              ${icone("seguranca", 14)} Os seus dados são confidenciais e protegidos pela legislação de segurança bancária e PLD/CFT.
            </div>
          </div>
        </div>

        <!-- Tabela de Documentos Submetidos -->
        <div class="card p-large mt-large">
          <div class="card-header-clean">
            <h2 class="card-title-md">Documentos Submetidos</h2>
            <span class="activity-counter">${documentos.length} documento(s)</span>
          </div>

          ${
            documentos.length === 0
              ? `
            <div class="m1-empty-state">
              <p>${TEXTOS.vazios.semDocumentos}</p>
            </div>
          `
              : `
            <div class="table-responsive mt-medium">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Tipo de Documento</th>
                    <th>Nome do Ficheiro</th>
                    <th>Tamanho</th>
                    <th>Data de Envio</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${documentos
                    .map(
                      (d) => `
                    <tr>
                      <td><strong>${formatarTipoDocumento(d.tipoDocumento)}</strong></td>
                      <td>${d.nomeArquivo}</td>
                      <td>${(d.tamanhoBytes / 1024).toFixed(1)} KB</td>
                      <td>${formatarDataHora(d.enviadoEm)}</td>
                      <td><span class="badge badge-${d.estadoValidacao}">${obterRotuloEstadoDocumento(d.estadoValidacao)}</span></td>
                      <td>
                        <a href="${api.obterUrlDownload(d.id)}" target="_blank" class="btn btn-secondary btn-sm" rel="noopener">
                          ${icone("ver", 14)} Visualizar
                        </a>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;

    // Dropzone e Seleção de Ficheiro
    const dropzone = container.querySelector("#dropzone-documento") as HTMLElement;
    const fileInput = container.querySelector("#input-file-doc") as HTMLInputElement;

    dropzone?.addEventListener("click", () => fileInput?.click());

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone?.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        processarFicheiro(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        processarFicheiro(fileInput.files[0]);
      }
    });

    container.querySelector("#btn-remover-preview")?.addEventListener("click", () => {
      ficheiroPreview = null;
      nomeFicheiroPreview = "";
      render();
    });

    container.querySelector("#form-upload-doc")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!ficheiroPreview) return;
      const tipo = (container.querySelector("#select-tipo-doc") as HTMLSelectElement).value;

      try {
        aSubmeter = true;
        mensagemSucesso = "";
        mensagemErro = "";
        render();

        await api.submeterDocumento(tipo, nomeFicheiroPreview, ficheiroPreview);
        ficheiroPreview = null;
        nomeFicheiroPreview = "";
        mensagemSucesso = TEXTOS.sucessos.documentoEnviado;
        await carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || TEXTOS.erros.generico;
      } finally {
        aSubmeter = false;
        render();
      }
    });
  }

  function processarFicheiro(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      mensagemErro = TEXTOS.erros.ficheiroDemasiadoGrande;
      render();
      return;
    }

    nomeFicheiroPreview = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      ficheiroPreview = result.split(",")[1] || "";
      render();
    };
    reader.readAsDataURL(file);
  }

  carregarDados();
}
