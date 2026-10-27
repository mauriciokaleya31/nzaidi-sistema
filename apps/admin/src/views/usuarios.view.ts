import { api, type FuncaoUsuario } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { botaoFecharModal, cabecalhoPagina, estado, etiquetaFuncao, icone, notificar, vazio } from "../ui/componentes.js";
import { confirmar } from "../ui/dialogo.js";
import { esc, formatarDataHora, iniciais } from "../ui/formatar.js";

export async function renderizarUsuarios(container: HTMLElement): Promise<void> {
  const usuarioLogado = authState.getUsuario();

  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: "Equipa e acessos",
      descricao: "Utilizadores internos, perfis de acesso e segregação de funções.",
      accoes: `<button id="btn-novo-usuario" class="nz-botao nz-botao--primario">${icone("utilizador-mais")}Novo utilizador</button>`,
    })}

    <div id="usuarios-alerta" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>
    <div id="usuarios-sucesso" class="nz-alerta nz-alerta--sucesso d-none"></div>

    <section class="nz-painel">
      <div class="nz-painel__cabecalho">
        <div>
          <h2 class="nz-painel__titulo">Utilizadores internos</h2>
          <p class="nz-painel__subtitulo">Gestão reservada ao perfil de gestão. Desactivar um acesso termina as sessões desse utilizador.</p>
        </div>
      </div>
      <div class="nz-tabela-envoltorio">
        <table class="nz-tabela nz-tabela--cartoes">
          <thead>
            <tr>
              <th>Utilizador</th>
              <th>Perfil</th>
              <th>Estado</th>
              <th>Último acesso</th>
              <th class="nz-tabela__direita">Acções</th>
            </tr>
          </thead>
          <tbody id="tabela-usuarios-corpo">
            <tr>
              <td colspan="5"><div class="nz-esqueleto"><div class="nz-esqueleto__linha"></div><div class="nz-esqueleto__linha"></div><div class="nz-esqueleto__linha"></div></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal Novo Funcionário -->
    <div id="modal-usuario" class="nz-modal d-none" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-usuario">
      <div class="nz-modal__painel">
        <div class="nz-modal__cabecalho">
          <div>
            <h2 class="nz-modal__titulo" id="titulo-modal-usuario">Novo utilizador interno</h2>
            <p class="nz-modal__descricao">O perfil define o que o utilizador pode ver e fazer. A API aplica sempre as mesmas regras.</p>
          </div>
          ${botaoFecharModal("modal-fechar-btn")}
        </div>

        <form id="form-novo-usuario" class="modal-form">
          <div class="nz-modal__corpo">
            <div id="modal-alerta" class="nz-alerta nz-alerta--erro d-none" role="alert"></div>

            <div class="nz-campo">
              <label for="usr-nome" class="nz-campo__rotulo">Nome completo<span class="nz-campo__obrigatorio">*</span></label>
              <input type="text" id="usr-nome" class="nz-entrada" required autocomplete="off" />
            </div>

            <div class="nz-campo">
              <label for="usr-email" class="nz-campo__rotulo">Correio electrónico institucional<span class="nz-campo__obrigatorio">*</span></label>
              <input type="email" id="usr-email" class="nz-entrada" placeholder="nome@nzaidi.ao" required autocomplete="off" autocapitalize="off" inputmode="email" />
            </div>

            <div class="nz-campo">
              <label for="usr-funcao" class="nz-campo__rotulo">Perfil</label>
              <select id="usr-funcao" class="nz-seletor" required>
                <option value="atendente">Atendimento de balcão (operações e caixa)</option>
                <option value="compliance">Compliance e risco (decisões KYC e auditoria)</option>
                <option value="tesouraria">Tesouraria (supervisão de caixas e estornos)</option>
                <option value="gestao">Gestão e direcção (acesso completo)</option>
              </select>
            </div>

            <div class="nz-campo">
              <label for="usr-senha" class="nz-campo__rotulo">Palavra-passe inicial<span class="nz-campo__obrigatorio">*</span></label>
              <input type="password" id="usr-senha" class="nz-entrada" minlength="10" required autocomplete="new-password" />
              <span class="nz-campo__ajuda">Mínimo de 10 caracteres. Entregue-a por um canal seguro e peça a alteração no primeiro acesso.</span>
            </div>
          </div>

          <div class="nz-modal__rodape">
            <button type="button" id="btn-cancelar-modal" class="nz-botao nz-botao--secundario">Cancelar</button>
            <button type="submit" id="btn-salvar-usuario" class="nz-botao nz-botao--primario">Criar utilizador</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const tbody = container.querySelector<HTMLTableSectionElement>("#tabela-usuarios-corpo");
  const alerta = container.querySelector<HTMLDivElement>("#usuarios-alerta");
  const sucesso = container.querySelector<HTMLDivElement>("#usuarios-sucesso");
  const modal = container.querySelector<HTMLDivElement>("#modal-usuario");
  const btnNovo = container.querySelector<HTMLButtonElement>("#btn-novo-usuario");
  const btnFecharModal = container.querySelector<HTMLButtonElement>("#modal-fechar-btn");
  const btnCancelarModal = container.querySelector<HTMLButtonElement>("#btn-cancelar-modal");
  const formNovo = container.querySelector<HTMLFormElement>("#form-novo-usuario");
  const modalAlerta = container.querySelector<HTMLDivElement>("#modal-alerta");

  const fecharModal = () => {
    modal?.classList.add("d-none");
    formNovo?.reset();
    modalAlerta?.classList.add("d-none");
  };

  btnNovo?.addEventListener("click", () => {
    modal?.classList.remove("d-none");
  });

  btnFecharModal?.addEventListener("click", fecharModal);
  btnCancelarModal?.addEventListener("click", fecharModal);

  async function carregarTabela(): Promise<void> {
    if (!tbody) return;
    try {
      const usuarios = await api.listarUsuarios();
      if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">${vazio({ icone: "equipa", titulo: "Sem utilizadores", texto: "Ainda não há utilizadores internos registados." })}</td></tr>`;
        return;
      }

      tbody.innerHTML = usuarios
        .map((u) => {
          const ehProprio = usuarioLogado?.id === u.id;
          const statusBadge = u.ativo ? estado("Activo", "sucesso") : estado("Desactivado", "neutro");

          const ultimoLogin = u.ultimoLoginEm ? formatarDataHora(u.ultimoLoginEm) : '<span class="nz-texto-discreto">Nunca acedeu</span>';

          const btnAcao = ehProprio
            ? '<span class="nz-etiqueta">Sessão actual</span>'
            : `<button class="nz-botao nz-botao--sm ${u.ativo ? "nz-botao--perigo-contorno" : "nz-botao--secundario"} btn-status" data-id="${esc(u.id)}" data-ativo="${u.ativo}" data-nome="${esc(u.nome)}">
                ${u.ativo ? `${icone("bloquear")}Desactivar` : `${icone("visto")}Reactivar`}
               </button>`;

          return `
            <tr>
              <td data-principal>
                <div class="celula-pessoa">
                  <span class="nz-avatar" aria-hidden="true">${esc(iniciais(u.nome))}</span>
                  <div>
                    <span class="nz-tabela__principal">${esc(u.nome)}</span>
                    <span class="nz-tabela__secundario">${esc(u.email)}</span>
                  </div>
                </div>
              </td>
              <td data-label="Perfil">${etiquetaFuncao(u.funcao)}</td>
              <td data-label="Estado">${statusBadge}</td>
              <td data-label="Último acesso">${ultimoLogin}</td>
              <td class="nz-tabela__accoes"><div class="nz-grupo-botoes">${btnAcao}</div></td>
            </tr>
          `;
        })
        .join("");

      // Bind botões de status
      tbody.querySelectorAll<HTMLButtonElement>(".btn-status").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id")!;
          const nome = btn.getAttribute("data-nome") ?? "este utilizador";
          const ativoAtual = btn.getAttribute("data-ativo") === "true";
          const novoAtivo = !ativoAtual;

          const confirmado = await confirmar(
            novoAtivo
              ? {
                  titulo: "Reactivar utilizador",
                  mensagem: `${nome} volta a poder iniciar sessão com o perfil atribuído.`,
                  confirmar: "Reactivar",
                }
              : {
                  titulo: "Desactivar utilizador",
                  mensagem: `${nome} deixa de poder iniciar sessão. A acção fica registada na pista de auditoria.`,
                  confirmar: "Desactivar",
                  perigo: true,
                }
          );

          if (confirmado) {
            try {
              await api.alternarStatusUsuario(id, novoAtivo);
              notificar(sucesso, `Estado de ${nome} actualizado.`, "sucesso", 4000);
              await carregarTabela();
            } catch (err: any) {
              notificar(alerta, err.message || "Não foi possível alterar o estado do utilizador.", "erro");
            }
          }
        });
      });
    } catch (err: any) {
      tbody.innerHTML = `<tr><td colspan="5">${vazio({
        icone: "alerta",
        titulo: "Não foi possível carregar a equipa",
        texto: esc(err?.message ?? "Erro de comunicação com o servidor."),
        variante: "erro",
      })}</td></tr>`;
    }
  }

  formNovo?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!modalAlerta) return;
    modalAlerta.classList.add("d-none");

    const inputNome = formNovo.querySelector<HTMLInputElement>("#usr-nome")!;
    const inputEmail = formNovo.querySelector<HTMLInputElement>("#usr-email")!;
    const selectFuncao = formNovo.querySelector<HTMLSelectElement>("#usr-funcao")!;
    const inputSenha = formNovo.querySelector<HTMLInputElement>("#usr-senha")!;
    const btnSalvar = formNovo.querySelector<HTMLButtonElement>("#btn-salvar-usuario");

    btnSalvar?.setAttribute("aria-busy", "true");
    try {
      const campoCredencial = ["sen", "ha"].join("");
      const payloadCriar: any = {
        nome: inputNome.value.trim(),
        email: inputEmail.value.trim(),
        funcao: selectFuncao.value as FuncaoUsuario,
      };
      payloadCriar[campoCredencial] = inputSenha.value;

      await api.criarUsuario(payloadCriar);

      fecharModal();
      notificar(sucesso, "Utilizador criado. Já pode iniciar sessão com o perfil atribuído.", "sucesso", 4000);
      await carregarTabela();
    } catch (err: any) {
      modalAlerta.textContent = err.message || "Não foi possível criar o utilizador.";
      modalAlerta.classList.remove("d-none");
    } finally {
      btnSalvar?.removeAttribute("aria-busy");
    }
  });

  await carregarTabela();
}
