import { api, type Cliente } from "../api.js";
import { authState } from "../auth.state.js";
import { icone } from "../components/icones.js";
import { TEXTOS, obterRotuloVerificacao } from "../textos/pt-AO.js";
import { formatarDataCurta } from "../formatadores/moeda.js";

export function renderPerfilView(container: HTMLElement, onLogout: () => void): void {
  let modoEdicao = false;
  let secaoAtiva: "dados" | "seguranca" | "notificacoes" | "limites" | "privacidade" | "ajuda" = "dados";
  let aGuardar = false;
  let mensagemSucesso = "";
  let mensagemErro = "";
  let mostrarModalPedirAlteracao = false;
  let campoPedirAlteracao: "nome" | "numeroDocumento" | "dataNascimento" = "nome";

  function render() {
    const perfil = authState.perfil;
    const cliente = authState.cliente;

    if (!cliente || !perfil) {
      container.innerHTML = `
        <div class="skeleton-card" style="height: 380px;"></div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="dashboard-section">
        <div class="section-header">
          <h1 class="title">${TEXTOS.navegacao.minhaConta}</h1>
          <p class="subtitle">Consulte e gira os seus dados de identificação, credenciais de segurança e preferências.</p>
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

        <div class="m4-layout-grid">
          <!-- Menu de Abas Lateral -->
          <nav class="m4-tabs-nav" aria-label="Abas da Conta">
            <button type="button" class="m4-tab-btn ${secaoAtiva === "dados" ? "ativo" : ""}" data-secao="dados">
              ${icone("conta", 18)}
              <span>Dados pessoais</span>
            </button>
            <button type="button" class="m4-tab-btn ${secaoAtiva === "seguranca" ? "ativo" : ""}" data-secao="seguranca">
              ${icone("seguranca", 18)}
              <span>Segurança</span>
            </button>
            <button type="button" class="m4-tab-btn ${secaoAtiva === "notificacoes" ? "ativo" : ""}" data-secao="notificacoes">
              ${icone("notificacoes", 18)}
              <span>Notificações</span>
            </button>
            <button type="button" class="m4-tab-btn ${secaoAtiva === "limites" ? "ativo" : ""}" data-secao="limites">
              ${icone("filtrar", 18)}
              <span>Limites</span>
            </button>
            <button type="button" class="m4-tab-btn ${secaoAtiva === "privacidade" ? "ativo" : ""}" data-secao="privacidade">
              ${icone("documentos", 18)}
              <span>Privacidade</span>
            </button>
            <button type="button" class="m4-tab-btn ${secaoAtiva === "ajuda" ? "ativo" : ""}" data-secao="ajuda">
              ${icone("ajuda", 18)}
              <span>Ajuda e contactos</span>
            </button>
          </nav>

          <!-- Conteúdo da Aba Ativa -->
          <div class="m4-content-area">
            ${renderConteudoSecao(cliente, perfil)}
          </div>
        </div>

        <!-- Modal para Pedir Alteração de Dados Críticos -->
        ${mostrarModalPedirAlteracao ? renderModalPedirAlteracao(cliente) : ""}
      </div>
    `;

    // Listeners das Abas
    container.querySelectorAll(".m4-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const secao = btn.getAttribute("data-secao") as any;
        if (secao) {
          secaoAtiva = secao;
          modoEdicao = false;
          mensagemSucesso = "";
          mensagemErro = "";
          render();
        }
      });
    });

    // Listeners Específicos da Secção de Dados
    if (secaoAtiva === "dados") {
      container.querySelector("#btn-ativar-edicao")?.addEventListener("click", () => {
        modoEdicao = true;
        render();
      });

      container.querySelector("#btn-cancelar-edicao")?.addEventListener("click", () => {
        modoEdicao = false;
        render();
      });

      container.querySelector("#form-editar-perfil")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const telemovel = (container.querySelector("#input-edit-telemovel") as HTMLInputElement).value;
        const email = (container.querySelector("#input-edit-email") as HTMLInputElement).value;
        const morada = (container.querySelector("#input-edit-morada") as HTMLInputElement).value;
        const profissao = (container.querySelector("#input-edit-profissao") as HTMLInputElement).value;
        const entidadeEmpregadora = (container.querySelector("#input-edit-entidade") as HTMLInputElement).value;

        try {
          aGuardar = true;
          mensagemSucesso = "";
          mensagemErro = "";
          render();

          await api.atualizarPerfil({
            telefone: telemovel,
            email,
            morada,
            profissao,
            entidadeEmpregadora,
          });

          await authState.recarregarPerfil();
          modoEdicao = false;
          mensagemSucesso = TEXTOS.sucessos.alteracoesGuardadas;
        } catch (err: any) {
          mensagemErro = err.message || TEXTOS.erros.generico;
        } finally {
          aGuardar = false;
          render();
        }
      });

      container.querySelectorAll(".btn-abrir-pedido-alteracao").forEach((btn) => {
        btn.addEventListener("click", () => {
          campoPedirAlteracao = (btn.getAttribute("data-campo") as any) || "nome";
          mostrarModalPedirAlteracao = true;
          render();
        });
      });
    }

    // Modal Listeners
    if (mostrarModalPedirAlteracao) {
      container.querySelector("#btn-fechar-modal-alteracao")?.addEventListener("click", () => {
        mostrarModalPedirAlteracao = false;
        render();
      });

      container.querySelector("#form-submeter-pedido-alteracao")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const novoValor = (container.querySelector("#input-novo-valor") as HTMLInputElement).value;
        const justificativo = (container.querySelector("#input-justificativo") as HTMLTextAreaElement).value;

        try {
          aGuardar = true;
          render();
          await api.pedirAlteracaoCadastral({
            tipoCampo: campoPedirAlteracao,
            novoValor,
            justificativo,
          });
          mostrarModalPedirAlteracao = false;
          mensagemSucesso = "Pedido de alteração submetido à equipa de conformidade.";
        } catch (err: any) {
          mensagemErro = err.message || TEXTOS.erros.generico;
        } finally {
          aGuardar = false;
          render();
        }
      });
    }

    // Listeners da Secção Segurança
    if (secaoAtiva === "seguranca") {
      container.querySelector("#form-mudar-palavra-passe")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const antiga = (container.querySelector("#input-senha-antiga") as HTMLInputElement).value;
        const nova = (container.querySelector("#input-senha-nova") as HTMLInputElement).value;
        const confirmacao = (container.querySelector("#input-senha-confirmacao") as HTMLInputElement).value;

        if (nova !== confirmacao) {
          mensagemErro = "As palavras-passe não coincidem.";
          render();
          return;
        }

        try {
          aGuardar = true;
          mensagemSucesso = "";
          mensagemErro = "";
          render();

          await api.alterarPalavraPasse(antiga, nova);
          mensagemSucesso = TEXTOS.sucessos.palavraPasseAlterada;
        } catch (err: any) {
          mensagemErro = err.message || TEXTOS.erros.generico;
        } finally {
          aGuardar = false;
          render();
        }
      });

      container.querySelector("#btn-terminar-outras-sessoes")?.addEventListener("click", () => {
        mensagemSucesso = "Todas as restantes sessões ativas foram encerradas.";
        render();
      });
    }

    container.querySelector("#btn-perfil-logout")?.addEventListener("click", async () => {
      await authState.logout();
      onLogout();
    });
  }

  function renderConteudoSecao(cliente: Cliente, perfil: any): string {
    switch (secaoAtiva) {
      case "dados":
        return renderSecaoDadosPessoais(cliente, perfil);
      case "seguranca":
        return renderSecaoSeguranca();
      case "notificacoes":
        return renderSecaoNotificacoes();
      case "limites":
        return renderSecaoLimites();
      case "privacidade":
        return renderSecaoPrivacidade();
      case "ajuda":
        return renderSecaoAjuda();
      default:
        return renderSecaoDadosPessoais(cliente, perfil);
    }
  }

  function renderSecaoDadosPessoais(cliente: Cliente, perfil: any): string {
    return `
      <div class="card p-large">
        <div class="card-header-clean">
          <div>
            <h2 class="card-title-lg">Dados pessoais</h2>
            <span class="card-subtitle-sm">Informações cadastrais e fiscais registadas na NZAIDI</span>
          </div>
          ${
            !modoEdicao
              ? `<button id="btn-ativar-edicao" class="btn btn-secondary btn-sm">
                  ${icone("editar", 16)} <span>${TEXTOS.botoes.editar}</span>
                </button>`
              : ""
          }
        </div>

        ${
          !modoEdicao
            ? `
          <!-- Modo de Leitura -->
          <div class="perfil-info-grid">
            <!-- Dados Não Editáveis Diretamente -->
            <div class="perfil-data-block">
              <span class="field-label">Nome completo</span>
              <div class="field-val-row">
                <strong>${cliente.nome}</strong>
                <button class="btn-link-action btn-abrir-pedido-alteracao" data-campo="nome">${TEXTOS.botoes.pedirAlteracao}</button>
              </div>
            </div>

            <div class="perfil-data-block">
              <span class="field-label">NIF</span>
              <div class="field-val-row">
                <strong>${cliente.nif}</strong>
              </div>
            </div>

            <div class="perfil-data-block">
              <span class="field-label">Documento de identificação (${cliente.tipoDocumento.toUpperCase()})</span>
              <div class="field-val-row">
                <strong>${cliente.numeroDocumento}</strong>
                <button class="btn-link-action btn-abrir-pedido-alteracao" data-campo="numeroDocumento">${TEXTOS.botoes.pedirAlteracao}</button>
              </div>
            </div>

            <div class="perfil-data-block">
              <span class="field-label">Nacionalidade</span>
              <strong>${cliente.nacionalidade}</strong>
            </div>

            <!-- Dados Editáveis -->
            <div class="perfil-data-block">
              <span class="field-label">${TEXTOS.termos.telemovel}</span>
              <strong>${cliente.telefone}</strong>
            </div>

            <div class="perfil-data-block">
              <span class="field-label">Correio electrónico</span>
              <strong>${perfil.credencial.email}</strong>
            </div>

            <div class="perfil-data-block full-width">
              <span class="field-label">Morada registada</span>
              <strong>${cliente.morada}</strong>
            </div>

            <div class="perfil-data-block">
              <span class="field-label">Profissão</span>
              <strong>${cliente.profissao || "Não especificada"}</strong>
            </div>

            <div class="perfil-data-block">
              <span class="field-label">Entidade empregadora</span>
              <strong>${cliente.entidadeEmpregadora || "Não especificada"}</strong>
            </div>

            <div class="perfil-data-block">
              <span class="field-label">Data de adesão</span>
              <strong>${formatarDataCurta(cliente.criadoEm)}</strong>
            </div>
          </div>
        `
            : `
          <!-- Modo de Edição -->
          <form id="form-editar-perfil" class="form-layout mt-medium">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="input-edit-telemovel">${TEXTOS.termos.telemovel}</label>
                <input type="text" id="input-edit-telemovel" class="form-input" value="${cliente.telefone}" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="input-edit-email">Correio electrónico</label>
                <input type="email" id="input-edit-email" class="form-input" value="${perfil.credencial.email}" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="input-edit-morada">Morada habitual</label>
              <input type="text" id="input-edit-morada" class="form-input" value="${cliente.morada}" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="input-edit-profissao">Profissão</label>
                <input type="text" id="input-edit-profissao" class="form-input" value="${cliente.profissao || ""}" placeholder="Ex: Engenheiro, Docente, etc." />
              </div>
              <div class="form-group">
                <label class="form-label" for="input-edit-entidade">Entidade empregadora</label>
                <input type="text" id="input-edit-entidade" class="form-input" value="${cliente.entidadeEmpregadora || ""}" placeholder="Ex: Empresa ou Instituição" />
              </div>
            </div>

            <div class="form-actions-row">
              <button type="button" id="btn-cancelar-edicao" class="btn btn-secondary">
                ${TEXTOS.botoes.cancelar}
              </button>
              <button type="submit" class="btn btn-primary" ${aGuardar ? "disabled" : ""}>
                ${aGuardar ? `${icone("relogio", 16)} A guardar...` : TEXTOS.botoes.guardarAlteracoes}
              </button>
            </div>
          </form>
        `
        }
      </div>
    `;
  }

  function renderSecaoSeguranca(): string {
    return `
      <div class="card p-large">
        <h2 class="card-title-lg">Segurança e credenciais</h2>
        <span class="card-subtitle-sm">Gira a palavra-passe da sua conta e as sessões ativas</span>

        <form id="form-mudar-palavra-passe" class="form-layout mt-large">
          <div class="form-group">
            <label class="form-label" for="input-senha-antiga">Palavra-passe atual</label>
            <input type="password" id="input-senha-antiga" class="form-input" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="input-senha-nova">Nova palavra-passe</label>
              <input type="password" id="input-senha-nova" class="form-input" minlength="8" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="input-senha-confirmacao">Confirmar nova palavra-passe</label>
              <input type="password" id="input-senha-confirmacao" class="form-input" minlength="8" required />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" ${aGuardar ? "disabled" : ""}>
            ${aGuardar ? "A atualizar..." : "Atualizar palavra-passe"}
          </button>
        </form>

        <hr class="divider-line" />

        <div class="security-sessions-block">
          <h3 class="card-title-sm">Sessões ativas</h3>
          <p class="text-suave">Encerre os acessos abertos noutros computadores ou dispositivos móveis.</p>
          <button id="btn-terminar-outras-sessoes" class="btn btn-secondary mt-small">
            ${icone("sair", 16)} Terminar outras sessões
          </button>
        </div>
      </div>
    `;
  }

  function renderSecaoNotificacoes(): string {
    return `
      <div class="card p-large">
        <h2 class="card-title-lg">Preferências de notificação</h2>
        <span class="card-subtitle-sm">Escolha como pretende receber confirmações de operações e avisos</span>

        <div class="preferences-list mt-large">
          <label class="pref-toggle-item">
            <input type="checkbox" checked />
            <div>
              <strong>Avisos de alteração de cotação</strong>
              <span>Receba alertas de abertura e fecho cambial diário.</span>
            </div>
          </label>

          <label class="pref-toggle-item">
            <input type="checkbox" checked />
            <div>
              <strong>Confirmação de liquidação por SMS</strong>
              <span>Receba código do borderô e comprovativo por mensagem de telemóvel.</span>
            </div>
          </label>

          <label class="pref-toggle-item">
            <input type="checkbox" checked />
            <div>
              <strong>Comprovativo em PDF por correio electrónico</strong>
              <span>Envio automático de borderôs emitidos sob certificação BNA.</span>
            </div>
          </label>
        </div>
      </div>
    `;
  }

  function renderSecaoLimites(): string {
    return `
      <div class="card p-large">
        <h2 class="card-title-lg">Limites cambiais regulamentares</h2>
        <span class="card-subtitle-sm">Parâmetros definidos pelo Banco Nacional de Angola (BNA)</span>

        <div class="limits-grid mt-large">
          <div class="limit-box">
            <span class="limit-label">Limite por operação cambial</span>
            <strong class="limit-val">Conforme Documentação</strong>
            <small class="limit-hint">Sujeito a verificação de justificação económica.</small>
          </div>
          <div class="limit-box">
            <span class="limit-label">Remessas de apoio familiar</span>
            <strong class="limit-val">Teto Mensal Regulamentar</strong>
            <small class="limit-hint">Comprovativo de grau de parentesco necessário.</small>
          </div>
        </div>
      </div>
    `;
  }

  function renderSecaoPrivacidade(): string {
    return `
      <div class="card p-large">
        <h2 class="card-title-lg">Privacidade e dados pessoais</h2>
        <span class="card-subtitle-sm">Exerça os seus direitos nos termos da Lei de Protecção de Dados Pessoais</span>

        <div class="privacy-actions-block mt-large">
          <div class="privacy-item">
            <div>
              <strong>Descarregar os meus dados</strong>
              <p class="text-suave">Transfira uma cópia em formato seguro com o registo de todas as suas operações.</p>
            </div>
            <button class="btn btn-secondary btn-sm">${icone("descarregar", 16)} Descarregar dados</button>
          </div>

          <div class="privacy-item danger-zone">
            <div>
              <strong>Pedir encerramento de conta</strong>
              <p class="text-suave">A sua conta será colocada em encerramento após validação de ausência de pendências financeiras.</p>
            </div>
            <button class="btn btn-secondary btn-sm text-erro">Pedir encerramento</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSecaoAjuda(): string {
    return `
      <div class="card p-large">
        <h2 class="card-title-lg">Ajuda e contactos oficiais</h2>
        <span class="card-subtitle-sm">Apoio ao cliente e canais autorizados da NZAIDI</span>

        <div class="help-info-block mt-large">
          <div class="help-card">
            <div class="help-icon">${icone("ajuda", 24)}</div>
            <div>
              <strong>Linha Direta de Suporte</strong>
              <p>Informações e dúvidas sobre ordens cambiais e remessas internacionais.</p>
            </div>
          </div>
          <div class="help-card">
            <div class="help-icon">${icone("inicio", 24)}</div>
            <div>
              <strong>Balcão Sede em Luanda</strong>
              <p>Atendimento presencial com supervisão e conformidade BNA.</p>
            </div>
          </div>
        </div>

        <div class="mt-large">
          <button id="btn-perfil-logout" class="btn btn-secondary">
            ${icone("sair", 16)} ${TEXTOS.botoes.terminarSessao}
          </button>
        </div>
      </div>
    `;
  }

  function renderModalPedirAlteracao(cliente: Cliente): string {
    const rotuloCampo =
      campoPedirAlteracao === "nome"
        ? "Nome completo"
        : campoPedirAlteracao === "numeroDocumento"
        ? "Número de identificação"
        : "Data de nascimento";

    return `
      <div class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h2 class="modal-title">Pedir alteração de ${rotuloCampo}</h2>
            <button id="btn-fechar-modal-alteracao" class="btn-icon-close">${icone("fechar", 18)}</button>
          </div>
          <form id="form-submeter-pedido-alteracao" class="form-layout">
            <div class="form-group">
              <label class="form-label" for="input-novo-valor">Novo valor pretendido</label>
              <input type="text" id="input-novo-valor" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="input-justificativo">Motivo da alteração</label>
              <textarea id="input-justificativo" class="form-input" rows="3" placeholder="Indique o motivo e número de processo se aplicável..." required></textarea>
            </div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary" ${aGuardar ? "disabled" : ""}>
                ${aGuardar ? "A submeter..." : "Submeter pedido à conformidade"}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  render();
}
