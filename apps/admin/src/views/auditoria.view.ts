import { api, type EventoAuditoria } from "../api/cliente.js";
import { authState } from "../state/auth.state.js";
import { aCarregar, cabecalhoPagina, etiquetaFuncao, icone, semAcesso, vazio } from "../ui/componentes.js";
import { esc, formatarDataHora } from "../ui/formatar.js";

/** Acções que indicam falha ou recusa ficam assinaladas para leitura rápida. */
function classeAccao(accao: string): string {
  if (/FALHAD|NEGAD|INVALID|BLOQUE|REJEIT|ESTORN/.test(accao)) return "accao-auditoria--alerta";
  if (/LOGIN|LOGOUT|SESSAO/.test(accao)) return "accao-auditoria--sessao";
  return "";
}

function detalhes(json: string | null | undefined): string {
  if (!json) return `<span class="nz-texto-discreto">—</span>`;
  let texto = json;
  try {
    texto = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    /* mostrar tal como foi gravado */
  }
  const resumo = texto.replace(/\s+/g, " ").slice(0, 60);
  return `
    <details class="detalhes-auditoria">
      <summary><span class="nz-mono">${esc(resumo)}${texto.length > 60 ? "…" : ""}</span></summary>
      <pre class="nz-mono">${esc(texto)}</pre>
    </details>`;
}

export async function renderizarAuditoria(container: HTMLElement): Promise<void> {
  // Mesmo nome que a API exige em GET /api/v1/auditoria (apps/api/.../auditoria.routes.ts)
  if (!authState.temPermissao("ver_auditoria")) {
    container.innerHTML = semAcesso("A pista de auditoria está reservada aos perfis de compliance e gestão.");
    return;
  }

  container.innerHTML = `
    ${cabecalhoPagina({
      titulo: "Pista de auditoria",
      descricao: "Registo imutável das acções administrativas e operacionais, com autor, perfil, hora e endereço de origem.",
      accoes: `<button id="btn-recarregar-auditoria" class="nz-botao nz-botao--secundario">${icone("actualizar")}Actualizar</button>`,
    })}

    <section class="nz-painel">
      <div class="barra-filtros" role="search">
        <div class="nz-entrada-grupo barra-filtros__pesquisa">
          ${icone("pesquisa")}
          <input type="search" id="filtro-auditoria-texto" class="nz-entrada" placeholder="Acção, recurso, operador ou IP" aria-label="Filtrar eventos" />
        </div>
        <select id="filtro-auditoria-perfil" class="nz-seletor" aria-label="Filtrar por perfil">
          <option value="">Todos os perfis</option>
          <option value="gestao">Gestão e direcção</option>
          <option value="compliance">Compliance e risco</option>
          <option value="tesouraria">Tesouraria</option>
          <option value="atendente">Atendimento de balcão</option>
          <option value="sistema">Sistema</option>
        </select>
      </div>
      <div id="tabela-auditoria-container">${aCarregar(8, "A carregar registos de auditoria")}</div>
      <div class="nz-painel__rodape">
        <span class="nz-paginacao__info" id="auditoria-contagem"></span>
        <span class="auditoria-garantia">${icone("cadeado", "nz-icone--sm")}Os eventos não podem ser alterados nem apagados.</span>
      </div>
    </section>
  `;

  const containerTabela = container.querySelector<HTMLDivElement>("#tabela-auditoria-container");
  const btnRecarregar = container.querySelector<HTMLButtonElement>("#btn-recarregar-auditoria");
  const filtroTexto = container.querySelector<HTMLInputElement>("#filtro-auditoria-texto");
  const filtroPerfil = container.querySelector<HTMLSelectElement>("#filtro-auditoria-perfil");
  const contagem = container.querySelector<HTMLElement>("#auditoria-contagem");

  let eventos: EventoAuditoria[] = [];

  function desenhar(): void {
    if (!containerTabela) return;
    const termo = (filtroTexto?.value ?? "").trim().toLowerCase();
    const perfil = filtroPerfil?.value ?? "";
    const lista = eventos.filter(
      (ev) =>
        (!perfil || (ev.autorFuncao ?? "sistema") === perfil) &&
        (!termo ||
          [ev.acao, ev.recurso, ev.recursoId, ev.autorNome, ev.ip, ev.detalhesJson].some((c) => (c ?? "").toLowerCase().includes(termo)))
    );

    if (contagem) contagem.textContent = `${lista.length} de ${eventos.length} eventos (últimos 50 registados)`;

    if (eventos.length === 0) {
      containerTabela.innerHTML = vazio({ icone: "auditoria", titulo: "Sem eventos registados", texto: "Ainda não existem registos na pista de auditoria." });
      return;
    }
    if (lista.length === 0) {
      containerTabela.innerHTML = vazio({ icone: "filtro", titulo: "Nenhum evento corresponde ao filtro", texto: "Altere o texto ou o perfil seleccionado." });
      return;
    }

    containerTabela.innerHTML = `
      <div class="nz-tabela-envoltorio">
        <table class="nz-tabela nz-tabela--cartoes tabela-auditoria">
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Operador</th>
              <th>Acção</th>
              <th>Recurso</th>
              <th>Detalhes</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            ${lista
              .map(
                (ev) => `
                <tr>
                  <td data-label="Data e hora" class="nz-valor">${formatarDataHora(ev.momento)}</td>
                  <td data-principal>
                    <span class="nz-tabela__principal">${esc(ev.autorNome ?? ev.autorId ?? "Sistema")}</span>
                    <span class="nz-tabela__secundario">${etiquetaFuncao(ev.autorFuncao)}</span>
                  </td>
                  <td data-label="Acção"><span class="accao-auditoria ${classeAccao(ev.acao)}">${esc(ev.acao)}</span></td>
                  <td data-label="Recurso"><code class="recurso-auditoria" title="${esc(ev.recurso)}${ev.recursoId ? `:${esc(ev.recursoId)}` : ""}">${esc(ev.recurso)}${ev.recursoId ? `<span>:${esc(ev.recursoId.length > 14 ? `${ev.recursoId.slice(0, 12)}…` : ev.recursoId)}</span>` : ""}</code></td>
                  <td data-label="Detalhes" class="detalhes-cell">${detalhes(ev.detalhesJson)}</td>
                  <td data-label="Origem" class="nz-mono nz-texto-discreto">${esc(ev.ip ?? "—")}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  async function carregarAuditoria(): Promise<void> {
    if (!containerTabela) return;
    containerTabela.innerHTML = aCarregar(8, "A carregar registos de auditoria");

    try {
      eventos = await api.listarAuditoria(50);
      desenhar();
    } catch {
      containerTabela.innerHTML = vazio({
        icone: "alerta",
        titulo: "Não foi possível carregar a pista de auditoria",
        texto: "Confirme que a sessão continua activa e que o seu perfil tem acesso à auditoria.",
        variante: "erro",
      });
    }
  }

  filtroTexto?.addEventListener("input", desenhar);
  filtroPerfil?.addEventListener("change", desenhar);
  btnRecarregar?.addEventListener("click", carregarAuditoria);
  await carregarAuditoria();
}
