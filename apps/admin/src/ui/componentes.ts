/**
 * Peças de interface reutilizadas pelas vistas do backoffice.
 * Só apresentação: devolvem HTML com as classes do design system (`nz-`).
 */
import { icone, type NomeIcone } from "@nzaidi/design-system";
import { esc } from "./formatar.js";

export type VarianteEstado = "sucesso" | "aviso" | "erro" | "info" | "pendente" | "neutro";

export function estado(rotulo: string, variante: VarianteEstado, extra = ""): string {
  return `<span class="nz-estado nz-estado--${variante}${extra ? ` ${extra}` : ""}">${esc(rotulo)}</span>`;
}

/* ---------------------------------------------------------------- Estados do domínio */

const ESTADOS_KYC: Record<string, [string, VarianteEstado]> = {
  aprovado: ["Aprovado", "sucesso"],
  pendente: ["Pendente", "aviso"],
  em_analise: ["Em análise", "pendente"],
  actualizacao_necessaria: ["Actualização pedida", "info"],
  rejeitado: ["Rejeitado", "erro"],
};

export function estadoKyc(valorEstado: string): string {
  const [rotulo, variante] = ESTADOS_KYC[valorEstado] ?? [valorEstado, "neutro"];
  return estado(rotulo, variante);
}

const ESTADOS_OPERACAO: Record<string, [string, VarianteEstado]> = {
  confirmada: ["Confirmada", "sucesso"],
  cancelada: ["Cancelada", "neutro"],
  estornada: ["Estornada", "erro"],
};

export function estadoOperacao(valorEstado: string): string {
  const [rotulo, variante] = ESTADOS_OPERACAO[valorEstado] ?? [valorEstado, "neutro"];
  return estado(rotulo, variante);
}

const ESTADOS_CAIXA: Record<string, [string, VarianteEstado]> = {
  aberto: ["Caixa aberto", "sucesso"],
  fechado: ["Caixa fechado", "neutro"],
  pendente_aprovacao: ["A aguardar aprovação", "pendente"],
};

/** Compra: a NZAIDI recebe divisa do cliente. Venda: a NZAIDI entrega divisa ao cliente. */
export function tipoOperacao(tipo: string): string {
  return tipo === "compra"
    ? `<span class="tipo-operacao tipo-operacao--compra">${icone("entrada", "nz-icone--sm")}Compra</span>`
    : `<span class="tipo-operacao tipo-operacao--venda">${icone("saida", "nz-icone--sm")}Venda</span>`;
}

export function estadoCaixa(valorEstado: string): string {
  const [rotulo, variante] = ESTADOS_CAIXA[valorEstado] ?? [valorEstado, "neutro"];
  return estado(rotulo, variante);
}

export function fonteTaxa(fonte: string): string {
  return fonte === "oficial" ? estado("Oficial", "sucesso") : estado("Demonstração", "aviso");
}

export function risco(nivel: string): string {
  const rotulos: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };
  return `<span class="nz-risco nz-risco--${esc(nivel)}" title="Risco ${esc(rotulos[nivel] ?? nivel)}">
    <span class="nz-risco__barras" aria-hidden="true"><i></i><i></i><i></i></span>${esc(rotulos[nivel] ?? nivel)}
  </span>`;
}

export const ROTULOS_FUNCAO: Record<string, string> = {
  gestao: "Gestão e direcção",
  compliance: "Compliance e risco",
  tesouraria: "Tesouraria",
  atendente: "Atendimento de balcão",
};

export function rotuloFuncao(funcao: string | null | undefined): string {
  if (!funcao) return "Sistema";
  return ROTULOS_FUNCAO[funcao] ?? funcao;
}

export function etiquetaFuncao(funcao: string | null | undefined): string {
  return `<span class="nz-etiqueta etiqueta-funcao etiqueta-funcao--${esc(funcao ?? "sistema")}">${esc(rotuloFuncao(funcao))}</span>`;
}

export function moeda(codigo: string, tamanho: "" | "lg" = ""): string {
  const c = esc(codigo);
  return `<span class="nz-moeda nz-moeda--${c.toLowerCase()}${tamanho ? ` nz-moeda--${tamanho}` : ""}">${c}</span>`;
}

export const NOMES_MOEDA: Record<string, string> = {
  AOA: "Kwanza",
  USD: "Dólar norte-americano",
  EUR: "Euro",
};

/* ---------------------------------------------------------------- Estrutura de página */

export function cabecalhoPagina(opcoes: { titulo: string; descricao?: string; accoes?: string; idAccoes?: string }): string {
  return `
    <header class="pagina-cabecalho">
      <div class="pagina-cabecalho__texto">
        <h1 class="pagina-cabecalho__titulo">${opcoes.titulo}</h1>
        ${opcoes.descricao ? `<p class="pagina-cabecalho__descricao">${opcoes.descricao}</p>` : ""}
      </div>
      <div class="pagina-cabecalho__accoes nz-grupo-botoes"${opcoes.idAccoes ? ` id="${opcoes.idAccoes}"` : ""}>${opcoes.accoes ?? ""}</div>
    </header>
  `;
}

export function vazio(opcoes: {
  icone: NomeIcone;
  titulo: string;
  texto?: string;
  accoes?: string;
  variante?: "" | "erro" | "aviso";
}): string {
  return `
    <div class="nz-vazio${opcoes.variante ? ` nz-vazio--${opcoes.variante}` : ""}">
      <span class="nz-vazio__icone">${icone(opcoes.icone)}</span>
      <p class="nz-vazio__titulo">${opcoes.titulo}</p>
      ${opcoes.texto ? `<p class="nz-vazio__texto">${opcoes.texto}</p>` : ""}
      ${opcoes.accoes ? `<div class="nz-grupo-botoes">${opcoes.accoes}</div>` : ""}
    </div>
  `;
}

export function semAcesso(texto: string): string {
  return `<div class="nz-painel">${vazio({
    icone: "cadeado",
    titulo: "Acesso não autorizado",
    texto,
    variante: "aviso",
    accoes: `<a class="nz-botao nz-botao--secundario" href="#dashboard">${icone("seta-esquerda")}Voltar à visão geral</a>`,
  })}</div>`;
}

export function aCarregar(linhas = 5, rotulo = "A carregar"): string {
  return `<div class="nz-esqueleto" role="status" aria-live="polite"><span class="nz-visualmente-oculto">${esc(rotulo)}…</span>${'<div class="nz-esqueleto__linha"></div>'.repeat(linhas)}</div>`;
}

/** Botão de fechar dos modais. */
export function botaoFecharModal(id: string): string {
  return `<button type="button" id="${id}" class="nz-modal__fechar" aria-label="Fechar">${icone("fechar")}</button>`;
}

/** Mostra uma notificação num contentor de alerta já existente na vista. */
export function notificar(
  alvo: HTMLElement | null,
  mensagem: string,
  variante: "sucesso" | "erro" | "aviso" | "info" = "sucesso",
  duracao = 5000
): void {
  if (!alvo) return;
  const icones: Record<string, NomeIcone> = { sucesso: "sucesso", erro: "erro", aviso: "alerta", info: "info" };
  alvo.className = `nz-alerta nz-alerta--${variante} nz-alerta--flutuante`;
  alvo.setAttribute("role", variante === "erro" ? "alert" : "status");
  alvo.innerHTML = `${icone(icones[variante] ?? "info")}<div>${esc(mensagem)}</div>`;
  alvo.classList.remove("d-none");
  window.setTimeout(() => alvo.classList.add("d-none"), duracao);
}

/** Mostra uma mensagem de erro dentro de um formulário (sem flutuar). */
export function mostrarErro(alvo: HTMLElement | null, mensagem: string): void {
  if (!alvo) return;
  alvo.className = "nz-alerta nz-alerta--erro";
  alvo.setAttribute("role", "alert");
  alvo.innerHTML = `${icone("erro")}<div>${esc(mensagem)}</div>`;
}

export { icone };
