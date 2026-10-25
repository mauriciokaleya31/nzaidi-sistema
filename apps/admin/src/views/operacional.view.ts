import { authState } from "../state/auth.state.js";

export function renderizarOperacional(container: HTMLElement, tipo: "balcao" | "tesouraria" = "balcao"): void {
  const usuario = authState.getUsuario();
  const ehBalcao = tipo === "balcao";

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">${ehBalcao ? "Balcão Operacional de Câmbios" : "Tesouraria, Saldos & Fecho de Caixa"}</h1>
        <p class="view-subtitle">Módulo operacional integrado às regras cambiais e de conformidade</p>
      </div>
      <div class="view-actions">
        <span class="badge badge-warning">Em Preparação — Fase 4</span>
      </div>
    </div>

    <div class="alert-box alert-info">
      <strong>Planeamento de Engenharia:</strong> As regras de domínio e cálculos monetários seguros (arredondamento bancário BNA, IOF e limites) já se encontram validados no pacote <code>@nzaidi/dominio</code>. A interface de emissão de borderôs e liquidação física será implementada na <strong>Fase 4</strong>.
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">${ehBalcao ? "Atendimento ao Balcão" : "Gestão de Cofre & Caixas"}</h2>
        </div>
        <div class="card-body">
          <p class="mb-4">
            ${
              ehBalcao
                ? "Este módulo permitirá ao operador de balcão simular operações de compra e venda de moeda estrangeira, capturar a identificação do cliente (BI/Passaporte/NIF), calcular o imposto de selo e gerar o respectivo recibo/borderô formal."
                : "Este módulo permitirá ao responsável de tesouraria gerir a abertura e fecho de caixas por operador, conferir saldos físicos em Kwanza (AOA), Dólar (USD) e Euro (EUR), e reconciliar operações diárias."
            }
          </p>

          <h4 class="text-sm font-semibold mb-2">Requisitos Implementados & Prontos para Ligação:</h4>
          <ul class="lista-requisitos">
            <li>✓ Autenticação com sessão HttpOnly e RBAC (${usuario?.funcao ?? "operador"})</li>
            <li>✓ Cotações oficiais em tempo real obtidas da API Fastify</li>
            <li>✓ Validação estrita de tipos com TypeScript e Zod</li>
            <li>✓ Pista de auditoria regulatória para todos os registos</li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Fluxo Operacional Previsto</h2>
        </div>
        <div class="card-body">
          <div class="timeline-operacional">
            <div class="timeline-step">
              <span class="step-num">1</span>
              <div>
                <strong>Identificação do Cliente (KYC)</strong>
                <p class="text-sm text-muted">Validação de documento oficial e verificação de limites regulamentares BNA.</p>
              </div>
            </div>
            <div class="timeline-step">
              <span class="step-num">2</span>
              <div>
                <strong>Cotação & Cálculo Imediato</strong>
                <p class="text-sm text-muted">Aplicação da taxa comercial com margens e arredondamento a 2 casas decimais.</p>
              </div>
            </div>
            <div class="timeline-step">
              <span class="step-num">3</span>
              <div>
                <strong>Emissão de Borderô & Registo</strong>
                <p class="text-sm text-muted">Geração do comprovativo formal e envio imediato para pista de auditoria.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
