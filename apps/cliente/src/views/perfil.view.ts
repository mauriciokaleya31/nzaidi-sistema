import { authState } from "../auth.state.js";

export function renderPerfilView(container: HTMLElement, onLogout: () => void): void {
  const perfil = authState.perfil;
  const cliente = authState.cliente;

  if (!cliente || !perfil) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem;">A carregar perfil...</div>`;
    return;
  }

  container.innerHTML = `
    <div>
      <div style="margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.5rem; font-weight: 700;">Dados da Conta e Perfil</h1>
        <p style="color: var(--cor-texto-mutado); font-size: 0.9rem;">
          Consulte as informações cadastrais e de segurança da sua conta NZAIDI.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
        <!-- Cartão de Dados Pessoais -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Dados de Identificação</h2>
            <span class="badge badge-${cliente.estado}">${cliente.estado}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem;">
            <div>
              <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Nome Completo</span>
              <strong>${cliente.nome}</strong>
            </div>

            <div class="form-row">
              <div>
                <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">NIF (Número de Identificação Fiscal)</span>
                <strong>${cliente.nif}</strong>
              </div>
              <div>
                <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Tipo de Cliente</span>
                <strong style="text-transform: capitalize;">${cliente.tipo}</strong>
              </div>
            </div>

            <div class="form-row">
              <div>
                <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Documento (${cliente.tipoDocumento.toUpperCase()})</span>
                <strong>${cliente.numeroDocumento}</strong>
              </div>
              <div>
                <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Nacionalidade</span>
                <strong>${cliente.nacionalidade}</strong>
              </div>
            </div>

            <div>
              <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Morada Registada</span>
              <strong>${cliente.morada}</strong>
            </div>

            <div>
              <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Data de Adesão ao NZAIDI</span>
              <strong>${new Date(cliente.criadoEm).toLocaleDateString("pt-AO")}</strong>
            </div>
          </div>
        </div>

        <!-- Contactos e Segurança -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="card-header">
              <h2 class="card-title">Contactos & Estatísticas</h2>
              <span class="badge badge-${cliente.estadoKyc}">KYC ${cliente.estadoKyc}</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem; margin-bottom: 1.5rem;">
              <div>
                <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Correio Electrónico</span>
                <strong>${perfil.credencial.email}</strong>
              </div>

              <div>
                <span style="color: var(--cor-texto-mutado); font-size: 0.8rem; display: block;">Telefone de Notificações</span>
                <strong>${perfil.credencial.telefone || cliente.telefone}</strong>
              </div>

              <!-- Indicadores da Conta -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-top: 0.75rem;">
                <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; text-align: center; border: 1px solid var(--cor-borda);">
                  <div style="font-size: 1.35rem; font-weight: 700; color: var(--cor-primaria);">${perfil.estatisticas.pedidosCambioTotal}</div>
                  <div style="font-size: 0.7rem; color: var(--cor-texto-mutado);">Câmbios</div>
                </div>
                <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; text-align: center; border: 1px solid var(--cor-borda);">
                  <div style="font-size: 1.35rem; font-weight: 700; color: var(--cor-primaria);">${perfil.estatisticas.pedidosRemessaTotal}</div>
                  <div style="font-size: 0.7rem; color: var(--cor-texto-mutado);">Remessas</div>
                </div>
                <div style="background: #0f172a; padding: 0.75rem; border-radius: 6px; text-align: center; border: 1px solid var(--cor-borda);">
                  <div style="font-size: 1.35rem; font-weight: 700; color: var(--cor-primaria);">${perfil.estatisticas.documentosTotal}</div>
                  <div style="font-size: 0.7rem; color: var(--cor-texto-mutado);">Documentos</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button id="btn-encerrar-sessao" class="btn btn-danger btn-block">
              Terminar Sessão com Segurança
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector("#btn-encerrar-sessao")?.addEventListener("click", async () => {
    await authState.logout();
    onLogout();
  });
}
