import { icone } from "../components/icones.js";
import { TEXTOS } from "../textos/pt-AO.js";

export interface M5Config {
  titulo: string;
  subtitulo: string;
  formularioHtml: string;
  rodapeHtml?: string;
}

export function renderizarM5Autenticacao(config: M5Config): string {
  return `
    <div class="m5-auth-page">
      <div class="m5-auth-card">
        <div class="m5-brand-block">
          <div class="m5-logo-wrap">
            <span class="m5-brand-mark">NZ</span>
          </div>
          <h1 class="m5-brand-title">${TEXTOS.empresa.sigla}</h1>
          <span class="m5-brand-sub">${TEXTOS.empresa.subtitulo}</span>
        </div>

        <div class="m5-header">
          <h2 class="m5-title">${config.titulo}</h2>
          <p class="m5-subtitle">${config.subtitulo}</p>
        </div>

        <div class="m5-form-body">
          ${config.formularioHtml}
        </div>

        ${config.rodapeHtml ? `<div class="m5-footer">${config.rodapeHtml}</div>` : ""}

        <div class="m5-bna-compliance">
          ${icone("seguranca", 14)}
          <span>Supervisão e Licenciamento pelo Banco Nacional de Angola (BNA)</span>
        </div>
      </div>
    </div>
  `;
}
