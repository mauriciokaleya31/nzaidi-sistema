import { icone } from "../components/icones.js";

export interface M4Secao {
  id: string;
  rotulo: string;
  icone: any;
  renderizar: () => string;
}

export interface M4Config {
  titulo: string;
  subtitulo: string;
  secoes: M4Secao[];
  secaoAtivaId: string;
}

export function renderizarM4Definicoes(config: M4Config): string {
  const secaoAtiva = config.secoes.find((s) => s.id === config.secaoAtivaId) || config.secoes[0];

  return `
    <div class="m4-definicoes-container">
      <div class="m4-header">
        <h1 class="m4-title">${config.titulo}</h1>
        <p class="m4-subtitle">${config.subtitulo}</p>
      </div>

      <div class="m4-layout-grid">
        <!-- Navegação por Abas -->
        <nav class="m4-tabs-nav" aria-label="Secções de Definições">
          ${config.secoes
            .map((s) => {
              const ativo = s.id === secaoAtiva.id;
              return `
              <button
                type="button"
                class="m4-tab-btn ${ativo ? "ativo" : ""}"
                data-secao="${s.id}"
                aria-selected="${ativo}"
              >
                <span class="m4-tab-icon">${icone(s.icone, 18)}</span>
                <span class="m4-tab-label">${s.rotulo}</span>
              </button>
            `;
            })
            .join("")}
        </nav>

        <!-- Conteúdo da Secção Ativa -->
        <div class="m4-content-area" id="m4-conteudo-secao">
          ${secaoAtiva.renderizar()}
        </div>
      </div>
    </div>
  `;
}
