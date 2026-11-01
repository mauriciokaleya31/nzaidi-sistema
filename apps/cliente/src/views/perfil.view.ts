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
  let permissoesSessao: any = null;
  let dadosConfig2fa: any = null;
  let modal2faAberto = false;
  let modalDesativar2faAberto = false;
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

    // Listeners de Avatar / Fotografia de Perfil
    const inputFoto = container.querySelector("#input-foto-avatar") as HTMLInputElement | null;
    inputFoto?.addEventListener("change", async () => {
      const f = inputFoto.files?.[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) {
        mensagemErro = "A imagem selecionada deve ter no máximo 5MB.";
        render();
        return;
      }
      const leitor = new FileReader();
      leitor.onload = async () => {
        const base64 = leitor.result as string;
        try {
          aGuardar = true;
          render();
          await api.atualizarPerfil({ avatarUrl: base64 });
          if (authState.cliente) authState.cliente.avatarUrl = base64;
          localStorage.setItem("nzaidi_avatar_url", base64);
          mensagemSucesso = "Fotografia de perfil atualizada com sucesso.";
          mensagemErro = "";
        } catch (err: any) {
          mensagemErro = err.message || "Erro ao atualizar fotografia de perfil.";
        } finally {
          aGuardar = false;
          render();
          document.querySelectorAll(".sidebar-user-card .avatar, .header-user-avatar").forEach((el) => {
            el.innerHTML = `<img src="${base64}" alt="Avatar" class="avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
          });
        }
      };
      leitor.readAsDataURL(f);
    });

    container.querySelector("#btn-remover-avatar")?.addEventListener("click", async () => {
      try {
        aGuardar = true;
        render();
        await api.atualizarPerfil({ avatarUrl: "" });
        if (authState.cliente) authState.cliente.avatarUrl = undefined;
        localStorage.removeItem("nzaidi_avatar_url");
        mensagemSucesso = "Fotografia de perfil removida com sucesso.";
        mensagemErro = "";
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao remover fotografia.";
      } finally {
        aGuardar = false;
        render();
      }
    });

    container.querySelector("#btn-perfil-logout")?.addEventListener("click", () => {
      onLogout();
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

      
      // Listeners de Permissões de Sessão
      container.querySelector("#form-permissoes-sessao")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const chkCambio = (container.querySelector("#chk-perm-cambio") as HTMLInputElement).checked;
        const chkRemessas = (container.querySelector("#chk-perm-remessas") as HTMLInputElement).checked;
        const chk2faOps = (container.querySelector("#chk-perm-2fa-ops") as HTMLInputElement).checked;
        const chkNotif = (container.querySelector("#chk-perm-notif-login") as HTMLInputElement).checked;

        try {
          aGuardar = true;
          render();
          await api.salvarPermissoesSessao({
            permitirCambioOnline: chkCambio,
            permitirRemessasOnline: chkRemessas,
            exigir2faOperacoes: chk2faOps,
            notificarLoginNovoDispositivo: chkNotif,
          });
          permissoesSessao = {
            permitirCambioOnline: chkCambio,
            permitirRemessasOnline: chkRemessas,
            exigir2faOperacoes: chk2faOps,
            notificarLoginNovoDispositivo: chkNotif,
            manterSessaoAtiva: true,
          };
          mensagemSucesso = "Permissões de sessão atualizadas e guardadas na base de dados com sucesso!";
          mensagemErro = "";
        } catch (err: any) {
          mensagemErro = err.message || "Erro ao guardar permissões.";
        } finally {
          aGuardar = false;
          render();
        }
      });

      container.querySelector("#btn-terminar-outras-sessoes")?.addEventListener("click", async () => {
        try {
          aGuardar = true;
          render();
          const res = await api.terminarOutrasSessoes();
          mensagemSucesso = `Todas as restantes sessões ativas foram encerradas (${res.dados?.totalEncerradas || 0} canceladas).`;
          mensagemErro = "";
        } catch (err: any) {
          mensagemErro = err.message || "Erro ao terminar sessões.";
        } finally {
          aGuardar = false;
          render();
        }
      });

      // 2FA - Configurar e Ativar
      container.querySelector("#btn-configurar-2fa")?.addEventListener("click", async () => {
        try {
          aGuardar = true;
          render();
          const res = await api.configurar2fa();
          dadosConfig2fa = res.dados;
          modal2faAberto = true;
        } catch (err: any) {
          mensagemErro = err.message || "Falha ao gerar configuração 2FA.";
        } finally {
          aGuardar = false;
          render();
        }
      });

      container.querySelector("#btn-fechar-modal-2fa")?.addEventListener("click", () => {
        modal2faAberto = false;
        render();
      });

      container.querySelector("#form-confirmar-2fa")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const codigo = (container.querySelector("#input-codigo-totp") as HTMLInputElement).value;
        try {
          aGuardar = true;
          render();
          await api.ativar2fa(codigo);
          if (authState.perfil?.credencial) {
            (authState.perfil.credencial as any).doisFatoresAtivo = true;
          }
          modal2faAberto = false;
          mensagemSucesso = "Autenticação de Dois Factores ativada com sucesso!";
          mensagemErro = "";
        } catch (err: any) {
          mensagemErro = err.message || "Código incorreto.";
        } finally {
          aGuardar = false;
          render();
        }
      });

      // 2FA - Desativar
      container.querySelector("#btn-abrir-desativar-2fa")?.addEventListener("click", () => {
        modalDesativar2faAberto = true;
        render();
      });

      container.querySelector("#btn-fechar-desativar-2fa")?.addEventListener("click", () => {
        modalDesativar2faAberto = false;
        render();
      });

      container.querySelector("#form-confirmar-desativar-2fa")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const senha = (container.querySelector("#input-senha-desativar-2fa") as HTMLInputElement).value;
        try {
          aGuardar = true;
          render();
          await api.desativar2fa(senha);
          if (authState.perfil?.credencial) {
            (authState.perfil.credencial as any).doisFatoresAtivo = false;
          }
          modalDesativar2faAberto = false;
          mensagemSucesso = "Autenticação de dois factores desativada.";
          mensagemErro = "";
        } catch (err: any) {
          mensagemErro = err.message || "Erro ao desativar 2FA.";
        } finally {
          aGuardar = false;
          render();
        }
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
    const iniciais = cliente.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    const avatarUrl = cliente.avatarUrl || localStorage.getItem("nzaidi_avatar_url") || "";
    return `
      <!-- Cartão com Fotografia de Perfil e Informações Rápidas -->
      <div class="card p-large mb-medium perfil-avatar-card" style="margin-bottom: 24px;">
        <div class="perfil-avatar-flex" style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          <div class="perfil-avatar-preview-box" style="position: relative; width: 84px; height: 84px;">
            ${
              avatarUrl
                ? `<img src="${avatarUrl}" alt="${cliente.nome}" class="perfil-avatar-img" style="width: 84px; height: 84px; border-radius: 50%; object-fit: cover; box-shadow: 0 4px 14px rgba(0,0,0,0.15); border: 3px solid var(--cartao);" />`
                : `<div class="perfil-avatar-iniciais" style="width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, var(--marinho), #1B4E95); color: #fff; font-size: 26px; font-weight: 700; display: grid; place-items: center; border: 3px solid var(--ouro);">${iniciais}</div>`
            }
            <label for="input-foto-avatar" style="position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; background: var(--ouro); border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);" title="Alterar fotografia">
              ${icone("editar", 14)}
            </label>
            <input type="file" id="input-foto-avatar" accept="image/png, image/jpeg, image/webp" hidden />
          </div>
          <div class="perfil-avatar-meta" style="flex: 1; min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h3 style="margin: 0; font-size: 20px; font-weight: 800; font-family: Sora, sans-serif;">${cliente.nome}</h3>
              <span class="badge badge-${cliente.estadoKyc}" style="font-size: 11px; padding: 4px 10px; border-radius: 99px; font-weight: 700; background: rgba(14, 143, 110, 0.15); color: var(--verde);">
                ${icone("sucesso", 12)} ${obterRotuloVerificacao(cliente.estadoKyc)}
              </span>
            </div>
            <p class="text-suave" style="margin: 6px 0 12px; font-size: 13.5px; color: var(--suave);">Cliente NZAIDI desde ${formatarDataCurta(cliente.criadoEm)} · NIF: ${cliente.nif}</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <label for="input-foto-avatar" class="btn btn-secondary btn-sm" style="cursor: pointer; padding: 8px 14px; font-size: 13px;">
                ${icone("enviarFicheiro", 14)} <span style="margin-left: 6px;">Trocar fotografia</span>
              </label>
              ${
                avatarUrl
                  ? `<button type="button" id="btn-remover-avatar" class="btn btn-claro btn-sm" style="padding: 8px 14px; font-size: 13px; color: var(--vermelho);">Remover fotografia</button>`
                  : ""
              }
            </div>
          </div>
        </div>
      </div>

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
    const doisFatoresAtivo = authState.perfil?.credencial ? (authState.perfil.credencial as any).doisFatoresAtivo : false;
    const p = permissoesSessao || {
      permitirCambioOnline: true,
      permitirRemessasOnline: true,
      exigir2faOperacoes: false,
      notificarLoginNovoDispositivo: true,
      manterSessaoAtiva: true,
    };

    return `
      <div class="card p-large">
        <h2 class="card-title-lg">Segurança da Conta</h2>
        <span class="card-subtitle-sm">Gira a palavra-passe, autenticação de dois factores e permissões de sessão</span>

        <!-- 1. Palavra-passe -->
        <form id="form-mudar-palavra-passe" class="form-layout mt-large">
          <h3 class="card-title-sm">Alterar palavra-passe</h3>
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

        <hr class="divider-line" style="margin: 2rem 0; border: none; border-top: 1px solid #e2e8f0;" />

        <!-- 2. Autenticação de Dois Factores (2FA TOTP) -->
        <div class="security-2fa-block">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 99px; background: ${doisFatoresAtivo ? "#e8f6ef" : "#fef3f2"}; color: ${doisFatoresAtivo ? "#0e8f6e" : "#b42318"}; font-size: 0.75rem; font-weight: 700; margin-bottom: 6px;">
                ${doisFatoresAtivo ? "● 2FA ATIVO E PROTEGIDO" : "○ 2FA DESATIVADO"}
              </div>
              <h3 class="card-title-sm" style="margin: 0;">Autenticação de Dois Factores (2FA TOTP)</h3>
              <p class="text-suave" style="margin: 4px 0 0; max-width: 580px;">
                Adicione uma camada extra de segurança à sua conta. Ao iniciar sessão, será solicitado um código gerado pela sua aplicação autenticadora (Google Authenticator ou Microsoft Authenticator).
              </p>
            </div>

            <div>
              ${doisFatoresAtivo ? `
                <button id="btn-abrir-desativar-2fa" class="btn btn-secondary" style="color: #b42318; border-color: #fecdca;">
                  Desativar 2FA
                </button>
              ` : `
                <button id="btn-configurar-2fa" class="btn btn-primary" style="background: #08264F;">
                  Ativar 2FA
                </button>
              `}
            </div>
          </div>

          ${modal2faAberto && dadosConfig2fa ? `
            <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(8,38,79,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
              <div class="modal-card" style="background: #ffffff; border-radius: 16px; padding: 2rem; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <h3 style="font-size: 1.3rem; font-weight: 800; color: #08264F; margin: 0 0 0.5rem;">Configurar Autenticação de Dois Factores</h3>
                <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1.25rem;">
                  1. Abra a sua aplicação de autenticação e leia o código QR abaixo ou insira o código manual.
                </p>

                <div style="text-align: center; margin-bottom: 1.25rem;">
                  ${dadosConfig2fa.qrCodeSvg}
                  <div style="margin-top: 8px; font-family: monospace; font-size: 0.85rem; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px dashed #cbd5e1; user-select: all;">
                    ${dadosConfig2fa.segredoBase32}
                  </div>
                </div>

                <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px 14px; margin-bottom: 1.25rem;">
                  <strong style="color: #b45309; font-size: 0.8rem; display: block; margin-bottom: 4px;">Códigos de Recuperação (Guarde num local seguro):</strong>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-family: monospace; font-size: 0.75rem; color: #78350f;">
                    ${dadosConfig2fa.codigosRecuperacao.map((c: string) => `<span>• ${c}</span>`).join("")}
                  </div>
                </div>

                <form id="form-confirmar-2fa">
                  <div class="form-group" style="margin-bottom: 1rem;">
                    <label class="form-label" for="input-codigo-totp" style="font-weight: 700;">2. Insira o código de 6 dígitos gerado:</label>
                    <input type="text" id="input-codigo-totp" class="form-input" maxlength="6" placeholder="000000" style="text-align: center; font-size: 1.5rem; letter-spacing: 6px; font-weight: 800;" required />
                  </div>

                  <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" id="btn-fechar-modal-2fa" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Confirmar e Ativar</button>
                  </div>
                </form>
              </div>
            </div>
          ` : ""}

          ${modalDesativar2faAberto ? `
            <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(8,38,79,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
              <div class="modal-card" style="background: #ffffff; border-radius: 16px; padding: 2rem; max-width: 440px; width: 100%;">
                <h3 style="font-size: 1.2rem; font-weight: 800; color: #b42318; margin: 0 0 0.5rem;">Desativar Autenticação 2FA</h3>
                <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;">
                  Confirme a sua palavra-passe para desativar a proteção de dois factores.
                </p>
                <form id="form-confirmar-desativar-2fa">
                  <div class="form-group" style="margin-bottom: 1rem;">
                    <label class="form-label" for="input-senha-desativar-2fa">Palavra-passe da conta</label>
                    <input type="password" id="input-senha-desativar-2fa" class="form-input" required />
                  </div>
                  <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" id="btn-fechar-desativar-2fa" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="background: #b42318;">Confirmar Desativação</button>
                  </div>
                </form>
              </div>
            </div>
          ` : ""}
        </div>

        <hr class="divider-line" style="margin: 2rem 0; border: none; border-top: 1px solid #e2e8f0;" />

        <!-- 3. Permissões de Sessão -->
        <div class="security-permissions-block">
          <h3 class="card-title-sm">Permissões e Controlo de Sessão</h3>
          <p class="text-suave" style="margin-bottom: 1.25rem;">
            Defina que operações e privilégios são autorizados para a sua conta e gira as sessões abertas.
          </p>

          <form id="form-permissoes-sessao" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.5rem;">
            <label style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
              <input type="checkbox" id="chk-perm-cambio" ${p.permitirCambioOnline ? "checked" : ""} style="width: 18px; height: 18px;" />
              <div>
                <strong style="color: #08264F; font-size: 0.9rem;">Permitir operações de câmbio online</strong>
                <div style="color: #64748b; font-size: 0.75rem;">Autorizar compra e venda de moeda com liquidação bancária</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
              <input type="checkbox" id="chk-perm-remessas" ${p.permitirRemessasOnline ? "checked" : ""} style="width: 18px; height: 18px;" />
              <div>
                <strong style="color: #08264F; font-size: 0.9rem;">Permitir remessas internacionais diretas</strong>
                <div style="color: #64748b; font-size: 0.75rem;">Permitir transferências para beneficiários no estrangeiro</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
              <input type="checkbox" id="chk-perm-2fa-ops" ${p.exigir2faOperacoes ? "checked" : ""} style="width: 18px; height: 18px;" />
              <div>
                <strong style="color: #08264F; font-size: 0.9rem;">Exigir 2FA para operações de valor elevado</strong>
                <div style="color: #64748b; font-size: 0.75rem;">Solicitar confirmação TOTP para transacções superiores a 500.000 Kz</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
              <input type="checkbox" id="chk-perm-notif-login" ${p.notificarLoginNovoDispositivo ? "checked" : ""} style="width: 18px; height: 18px;" />
              <div>
                <strong style="color: #08264F; font-size: 0.9rem;">Notificar inícios de sessão em novos navegadores</strong>
                <div style="color: #64748b; font-size: 0.75rem;">Receber alerta imediato de segurança quando aceder a partir de outro terminal</div>
              </div>
            </label>

            <div style="display: flex; gap: 10px; margin-top: 6px;">
              <button type="submit" id="btn-salvar-permissoes" class="btn btn-primary" style="background: #0e8f6e;">
                Guardar Permissões de Sessão
              </button>
            </div>
          </form>

          <div style="padding-top: 1rem; border-top: 1px dashed #e2e8f0;">
            <h4 style="font-size: 0.95rem; font-weight: 700; color: #08264F; margin: 0 0 4px;">Sessões ativas noutros dispositivos</h4>
            <p class="text-suave" style="margin-bottom: 10px;">Encerre imediatamente todas as sessões abertas noutros telemóveis ou computadores.</p>
            <button id="btn-terminar-outras-sessoes" class="btn btn-secondary">
              ${icone("sair", 16)} Terminar outras sessões
            </button>
          </div>
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
