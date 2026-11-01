import { icone } from "../components/icones.js";
import { TEXTOS } from "../textos/pt-AO.js";

export interface M1Coluna<T> {
  titulo: string;
  renderizar: (item: T) => string;
}

export interface M1Config<T> {
  titulo: string;
  subtitulo?: string;
  botaoPrincipal?: {
    rotulo: string;
    icone: any;
    onClick: () => void;
  };
  pesquisaPlaceholder?: string;
  filtros?: {
    id: string;
    rotulo: string;
    opcoes: { valor: string; rotulo: string }[];
  }[];
  colunas: M1Coluna<T>[];
  itens: T[];
  carregando: boolean;
  erro?: string;
  textoVazio: string;
  botaoVazio?: {
    rotulo: string;
    onClick: () => void;
  };
  totalItens?: number;
}

export function renderizarM1Lista<T>(config: M1Config<T>): string {
  if (config.carregando) {
    return `
      <div class="m1-lista-container">
        <div class="m1-header">
          <div>
            <h1 class="m1-title">${config.titulo}</h1>
            ${config.subtitulo ? `<p class="m1-subtitle">${config.subtitulo}</p>` : ""}
          </div>
        </div>
        <div class="skeleton-card" style="height: 380px; margin-top: 1.5rem;"></div>
      </div>
    `;
  }

  if (config.erro) {
    return `
      <div class="m1-lista-container">
        <div class="alert-box alert-error">
          ${icone("erro", 20)}
          <div>
            <strong>Ocorreu um erro ao carregar os dados</strong>
            <p>${config.erro}</p>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="m1-lista-container">
      <div class="m1-header">
        <div>
          <h1 class="m1-title">${config.titulo}</h1>
          ${config.subtitulo ? `<p class="m1-subtitle">${config.subtitulo}</p>` : ""}
        </div>
        ${
          config.botaoPrincipal
            ? `<button id="btn-m1-principal" class="btn btn-primary">
                ${icone(config.botaoPrincipal.icone, 18)}
                <span>${config.botaoPrincipal.rotulo}</span>
              </button>`
            : ""
        }
      </div>

      <!-- Barra de Ferramentas: Pesquisa e Filtros -->
      <div class="m1-toolbar">
        <div class="m1-search-box">
          <span class="m1-search-icon">${icone("pesquisar", 18)}</span>
          <input
            type="text"
            id="m1-input-pesquisa"
            class="m1-search-input"
            placeholder="${config.pesquisaPlaceholder || TEXTOS.botoes.pesquisar}"
          />
        </div>

        ${
          config.filtros && config.filtros.length > 0
            ? `<div class="m1-filters-row">
                ${config.filtros
                  .map(
                    (f) => `
                  <div class="m1-filter-group">
                    <label for="filtro-${f.id}">${f.rotulo}</label>
                    <select id="filtro-${f.id}" class="m1-filter-select">
                      ${f.opcoes
                        .map(
                          (op) =>
                            `<option value="${op.valor}">${op.rotulo}</option>`
                        )
                        .join("")}
                    </select>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>

      <!-- Conteúdo da Tabela ou Estado Vazio -->
      <div class="card m1-table-card">
        ${
          config.itens.length === 0
            ? `
          <div class="m1-empty-state">
            <div class="m1-empty-icon">${icone("informacao", 32)}</div>
            <p class="m1-empty-text">${config.textoVazio}</p>
            ${
              config.botaoVazio
                ? `<button id="btn-m1-vazio" class="btn btn-primary mt-medium">${config.botaoVazio.rotulo}</button>`
                : ""
            }
          </div>
        `
            : `
          <div class="table-responsive">
            <table class="table-custom">
              <thead>
                <tr>
                  ${config.colunas.map((c) => `<th>${c.titulo}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${config.itens
                  .map(
                    (item) => `
                  <tr>
                    ${config.colunas.map((c) => `<td>${c.renderizar(item)}</td>`).join("")}
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          <div class="m1-pagination-footer">
            <span>Total: <strong>${config.totalItens ?? config.itens.length}</strong> registo(s)</span>
          </div>
        `
        }
      </div>
    </div>
  `;
}
