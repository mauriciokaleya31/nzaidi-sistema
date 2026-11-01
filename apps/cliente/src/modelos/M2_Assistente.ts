import { icone } from "../components/icones.js";
import { TEXTOS } from "../textos/pt-AO.js";

export interface M2Passo {
  numero: number;
  rotulo: string;
}

export interface M2Config {
  titulo: string;
  passos: M2Passo[];
  passoAtual: number;
  conteudoHtml: string;
  resumoHtml: string;
  podeVoltar: boolean;
  podeContinuar: boolean;
  rotuloContinuar?: string;
  rotuloVoltar?: string;
  aCarregar?: boolean;
}

export function renderizarM2Assistente(config: M2Config): string {
  return `
    <div class="m2-assistente-container">
      <div class="m2-stepper-header">
        <h1 class="m2-title">${config.titulo}</h1>

        <!-- Indicador de Passos -->
        <div class="m2-stepper" role="progressbar" aria-valuenow="${config.passoAtual}" aria-valuemin="1" aria-valuemax="${config.passos.length}">
          ${config.passos
            .map((p) => {
              const concluido = p.numero < config.passoAtual;
              const ativo = p.numero === config.passoAtual;
              const classe = concluido ? "concluido" : ativo ? "ativo" : "pendente";

              return `
              <div class="m2-step-item ${classe}">
                <div class="m2-step-circle">
                  ${concluido ? icone("sucesso", 16) : p.numero}
                </div>
                <span class="m2-step-label">${p.rotulo}</span>
              </div>
            `;
            })
            .join('<div class="m2-step-divider"></div>')}
        </div>
      </div>

      <!-- Layout em 2 Colunas: Formulário / Conteúdo e Resumo Lateral -->
      <div class="m2-grid-layout">
        <div class="m2-main-content">
          <div class="card m2-content-card">
            ${config.conteudoHtml}
          </div>

          <!-- Botões de Ação do Assistente -->
          <div class="m2-actions-bar">
            ${
              config.podeVoltar
                ? `<button type="button" id="btn-m2-voltar" class="btn btn-secondary">
                    ${icone("setaEsquerda", 18)}
                    <span>${config.rotuloVoltar || TEXTOS.botoes.voltar}</span>
                  </button>`
                : `<div></div>`
            }

            <button
              type="button"
              id="btn-m2-continuar"
              class="btn btn-primary"
              ${!config.podeContinuar || config.aCarregar ? "disabled" : ""}
            >
              ${
                config.aCarregar
                  ? `${icone("relogio", 18)} <span>A processar...</span>`
                  : `<span>${config.rotuloContinuar || TEXTOS.botoes.continuar}</span> ${icone("setaDireita", 18)}`
              }
            </button>
          </div>
        </div>

        <!-- Coluna de Resumo -->
        <div class="m2-sidebar-summary">
          <div class="card m2-summary-card">
            <h2 class="m2-summary-title">Resumo do Pedido</h2>
            <div class="m2-summary-body">
              ${config.resumoHtml}
            </div>
            <div class="m2-trust-badge">
              ${icone("seguranca", 16)}
              <span>Operação sob regulação do Banco Nacional de Angola</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
