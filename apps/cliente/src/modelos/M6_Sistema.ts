import { icone } from "../components/icones.js";
import { TEXTOS } from "../textos/pt-AO.js";

export function renderizar404(): string {
  return `
    <div class="m6-sistema-container">
      <div class="card m6-card">
        <div class="m6-icon-wrap text-alerta">
          ${icone("aviso", 48)}
        </div>
        <h1 class="m6-title">Página Não Encontrada</h1>
        <p class="m6-desc">O endereço que tentou aceder não existe ou foi transferido.</p>
        <a href="#/dashboard" class="btn btn-primary mt-medium">
          ${icone("inicio", 18)}
          <span>Voltar ao Início</span>
        </a>
      </div>
    </div>
  `;
}

export function renderizarSemLigacao(): string {
  return `
    <div class="m6-sistema-container">
      <div class="card m6-card">
        <div class="m6-icon-wrap text-erro">
          ${icone("erro", 48)}
        </div>
        <h1 class="m6-title">Sem Ligação à Internet</h1>
        <p class="m6-desc">Verifique a sua ligação de rede para continuar a operar no portal financeiro com segurança.</p>
        <button onclick="window.location.reload()" class="btn btn-primary mt-medium">
          ${icone("trocar", 18)}
          <span>Tentar Novamente</span>
        </button>
      </div>
    </div>
  `;
}

export function renderizarAvisoSessaoExpirar(): string {
  return `
    <div class="modal-backdrop" id="modal-sessao-expirar">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-icon-badge text-alerta">${icone("aviso", 24)}</div>
          <h2 class="modal-title">A sua sessão vai terminar</h2>
        </div>
        <div class="modal-body">
          <p>Por motivos de segurança e conformidade cambial, as sessões inativas são encerradas automaticamente.</p>
        </div>
        <div class="modal-actions">
          <button id="btn-terminar-sessao-agora" class="btn btn-secondary">
            ${TEXTOS.botoes.terminarSessao}
          </button>
          <button id="btn-continuar-sessao" class="btn btn-primary">
            Continuar Sessão
          </button>
        </div>
      </div>
    </div>
  `;
}
