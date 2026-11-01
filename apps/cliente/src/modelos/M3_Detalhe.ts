import { icone } from "../components/icones.js";
import { TEXTOS } from "../textos/pt-AO.js";

export interface M3TimelineItem {
  titulo: string;
  descricao?: string;
  dataHora?: string;
  estado: "concluido" | "atual" | "pendente";
}

export interface M3DadoCampo {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  copiavel?: boolean;
}

export interface M3Config {
  titulo: string;
  subtitulo: string;
  referencia: string;
  estadoBadgeHtml: string;
  linhaTemporal: M3TimelineItem[];
  dadosPrincipais: M3DadoCampo[];
  resumoValoresHtml: string;
  botaoVoltarRota: string;
  botaoComprovativo?: {
    rotulo: string;
    onClick: () => void;
  };
}

export function renderizarM3Detalhe(config: M3Config): string {
  return `
    <div class="m3-detalhe-container">
      <div class="m3-top-navigation">
        <a href="#${config.botaoVoltarRota}" class="btn-link-voltar">
          ${icone("setaEsquerda", 16)} ${TEXTOS.botoes.voltar}
        </a>
      </div>

      <!-- Cabeçalho do Detalhe -->
      <div class="card m3-header-card">
        <div class="m3-header-info">
          <div class="m3-ref-badge">
            <span>Referência:</span>
            <code>${config.referencia}</code>
          </div>
          <h1 class="m3-title">${config.titulo}</h1>
          <p class="m3-subtitle">${config.subtitulo}</p>
        </div>
        <div class="m3-header-status">
          ${config.estadoBadgeHtml}
        </div>
      </div>

      <!-- Linha Temporal do Estado -->
      <div class="card m3-timeline-card">
        <h2 class="card-title-sm">Linha Temporal do Processamento</h2>
        <div class="m3-timeline">
          ${config.linhaTemporal
            .map((item) => `
            <div class="m3-timeline-step ${item.estado}">
              <div class="m3-timeline-icon">
                ${
                  item.estado === "concluido"
                    ? icone("sucesso", 16)
                    : item.estado === "atual"
                    ? icone("relogio", 16)
                    : `<span class="dot"></span>`
                }
              </div>
              <div class="m3-timeline-content">
                <span class="m3-timeline-title">${item.titulo}</span>
                ${item.dataHora ? `<small class="m3-timeline-date">${item.dataHora}</small>` : ""}
                ${item.descricao ? `<p class="m3-timeline-desc">${item.descricao}</p>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Grelha de Dados e Comprovativo -->
      <div class="grid-cards">
        <div class="card m3-dados-card">
          <h2 class="card-title-sm">Informação Detalhada</h2>
          <div class="m3-campos-grid">
            ${config.dadosPrincipais
              .map(
                (c) => `
              <div class="m3-campo-item ${c.destaque ? "destaque" : ""}">
                <span class="m3-campo-label">${c.rotulo}</span>
                <div class="m3-campo-value-row">
                  <strong class="m3-campo-value">${c.valor}</strong>
                  ${
                    c.copiavel
                      ? `<button class="btn-copiar-mini" onclick="navigator.clipboard.writeText('${c.valor}')" title="${TEXTOS.botoes.copiar}">
                          ${icone("copiar", 14)}
                        </button>`
                      : ""
                  }
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="card m3-resumo-card">
          <h2 class="card-title-sm">Liquidação Financeira</h2>
          <div class="m3-resumo-body">
            ${config.resumoValoresHtml}
          </div>

          ${
            config.botaoComprovativo
              ? `
            <div class="m3-comprovativo-action">
              <button id="btn-m3-comprovativo" class="btn btn-primary btn-block">
                ${icone("descarregar", 18)}
                <span>${config.botaoComprovativo.rotulo}</span>
              </button>
            </div>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}
