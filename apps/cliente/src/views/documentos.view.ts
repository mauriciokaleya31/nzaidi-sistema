import { api, type DocumentoKyc } from "../api.js";
import { authState } from "../auth.state.js";

export function renderDocumentosView(container: HTMLElement): void {
  let documentos: DocumentoKyc[] = [];
  let carregando = true;
  let submetendo = false;
  let erroMsg = "";
  let sucessoMsg = "";

  async function carregarDados() {
    try {
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
      nif_empresa: "Certidão Comercial / Cartão NIF",
      comprovativo_morada: "Comprovativo de Morada / Residência",
      declaracao_rendimentos: "Declaração de Rendimentos / Salário",
    };
    return mapa[tipo] || tipo;
  }

  function render() {
    const cliente = authState.cliente;
    if (!cliente) return;

    container.innerHTML = `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.5rem; font-weight: 700;">Documentação de Identificação (KYC)</h1>
          <p style="color: var(--cor-texto-mutado); font-size: 0.9rem;">
            Mantenha a sua identificação atualizada para operar com limites plenos em câmbios e remessas.
          </p>
        </div>

        ${sucessoMsg ? `<div class="alert-box alert-success">${sucessoMsg}</div>` : ""}
        ${erroMsg ? `<div class="alert-box alert-error">${erroMsg}</div>` : ""}

        <!-- Estado Geral da Conta -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.85rem; color: var(--cor-texto-mutado);">Estado Atual da sua Conta:</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--cor-texto-forte); margin-top: 0.2rem;">
              ${
                cliente.estadoKyc === "aprovado"
                  ? "Identidade Verificada & Aprovada"
                  : cliente.estadoKyc === "em_analise"
                  ? "Em Análise pela Equipa de Conformidade"
                  : cliente.estadoKyc === "rejeitado" || cliente.estadoKyc === "actualizacao_necessaria"
                  ? "Reenvio de Documentos Necessário"
                  : "Aguardando Envio de Documentos"
              }
            </div>
          </div>
          <span class="badge badge-${cliente.estadoKyc}">
            ${cliente.estadoKyc}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <!-- Formulário de Upload -->
          <div class="card">
            <h2 class="card-title" style="margin-bottom: 1rem;">Submeter Novo Documento</h2>

            <form id="form-upload-doc">
              <div class="form-group">
                <label class="form-label">Tipo de Documento</label>
                <select id="doc-tipo" class="form-select" required>
                  <option value="bi_frente">Bilhete de Identidade (Frente)</option>
                  <option value="bi_verso">Bilhete de Identidade (Verso)</option>
                  <option value="passaporte">Passaporte (Página Principal)</option>
                  <option value="comprovativo_morada">Comprovativo de Morada (Factura de Água/Luz/Atestado)</option>
                  <option value="nif_empresa">Certidão Comercial / Cartão NIF de Empresa</option>
                  <option value="declaracao_rendimentos">Declaração de Rendimentos / Extracto Bancário</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Ficheiro (PDF, PNG ou JPEG — máx. 5 MB)</label>
                <input type="file" id="doc-ficheiro" class="form-input" accept=".pdf,image/png,image/jpeg" required>
                <small style="display: block; margin-top: 0.35rem; color: var(--cor-texto-mutado); font-size: 0.75rem;">
                  Apenas imagens ou PDFs legíveis e genuínos são aceites. Ficheiros adulterados são rejeitados pelo sistema.
                </small>
              </div>

              <button type="submit" class="btn btn-primary btn-block" ${submetendo ? "disabled" : ""}>
                ${submetendo ? "A carregar e verificar..." : "Enviar Documento"}
              </button>
            </form>
          </div>

          <!-- Requisitos e Normas de Aceitação -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h2 class="card-title" style="margin-bottom: 1rem;">Requisitos de Aceitação</h2>
              <ul style="color: var(--cor-texto-mutado); font-size: 0.85rem; line-height: 1.6; margin-left: 1.25rem;">
                <li><strong>Legibilidade:</strong> Os 4 cantos do documento devem estar visíveis e o texto nítido.</li>
                <li><strong>Validade:</strong> O documento não pode estar expirado à data da apresentação.</li>
                <li><strong>Formatos Suportados:</strong> PDF (.pdf), Imagem PNG (.png) ou JPEG (.jpg, .jpeg).</li>
                <li><strong>Segurança:</strong> Todos os ficheiros são armazenados em cofre seguro fora da Internet pública com assinatura SHA-256 de integridade.</li>
              </ul>
            </div>

            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(196, 155, 69, 0.1); border-left: 3px solid var(--cor-primaria); border-radius: 4px; font-size: 0.8rem; color: #fde047;">
              Em conformidade com a Lei de Prevenção e Combate ao Branqueamento de Capitais e Financiamento do Terrorismo (Lei n.º 5/20).
            </div>
          </div>
        </div>

        <!-- Tabela de Documentos Enviados -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Documentos Submetidos</h2>
            <span style="font-size: 0.85rem; color: var(--cor-texto-mutado);">${documentos.length} documento(s)</span>
          </div>

          ${
            documentos.length === 0
              ? `<div style="text-align: center; padding: 2.5rem 1rem; color: var(--cor-texto-mutado);">Nenhum documento submetido até ao momento. Utilize o formulário acima para enviar a sua identificação.</div>`
              : `
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nome do Ficheiro</th>
                    <th>Tamanho</th>
                    <th>Data de Envio</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${documentos.map((d) => `
                    <tr>
                      <td><strong>${formatarTipoDocumento(d.tipoDocumento)}</strong></td>
                      <td>${d.nomeArquivo}</td>
                      <td>${(d.tamanhoBytes / 1024).toFixed(1)} KB</td>
                      <td>${new Date(d.enviadoEm).toLocaleString("pt-AO")}</td>
                      <td><span class="badge badge-${d.estadoValidacao}">${d.estadoValidacao === "valido" ? "Validado" : d.estadoValidacao}</span></td>
                      <td>
                        <a href="${api.obterUrlDownload(d.id)}" target="_blank" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">
                          Visualizar
                        </a>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;

    // Listener de Upload
    container.querySelector("#form-upload-doc")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tipo = (container.querySelector("#doc-tipo") as HTMLSelectElement).value;
      const fileInput = container.querySelector("#doc-ficheiro") as HTMLInputElement;

      if (!fileInput.files || fileInput.files.length === 0 || !fileInput.files[0]) {
        erroMsg = "Por favor seleccione um ficheiro para enviar.";
        render();
        return;
      }

      const file = fileInput.files[0];
      const nomeFicheiro = file.name;

      // Validação de Tamanho Frontend (5 MB)
      if (file.size > 5 * 1024 * 1024) {
        erroMsg = `O ficheiro seleccionado excede o tamanho máximo de 5 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
        render();
        return;
      }

      try {
        submetendo = true;
        erroMsg = "";
        sucessoMsg = "";
        render();

        // Leitura em Base64
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const rawBase64 = (reader.result as string).split(",")[1] ?? "";
            await api.submeterDocumento(tipo, nomeFicheiro, rawBase64);
            sucessoMsg = `Documento "${nomeFicheiro}" submetido com sucesso e integrado para análise!`;
            await carregarDados();
          } catch (err: any) {
            erroMsg = err.message || "Erro ao enviar o documento.";
          } finally {
            submetendo = false;
            render();
          }
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        submetendo = false;
        erroMsg = err.message || "Erro ao processar o ficheiro.";
        render();
      }
    });
  }

  render();
  carregarDados();
}
