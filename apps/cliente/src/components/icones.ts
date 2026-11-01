/**
 * Sistema Unificado de Ícones Lucide — NZAIDI Portal do Cliente
 * Regras estritas do projeto:
 * - Traço fixo: 1,75 px (stroke-width: 1.75)
 * - Tamanho padrão: 20 px (listas e botões) e 24 px (navegação)
 * - Cor: herdada do texto (currentColor)
 * - Um ícone por conceito, sempre o mesmo.
 */

export type ConceitoIcone =
  | "inicio"
  | "cambio"
  | "remessas"
  | "cartoes"
  | "documentos"
  | "conta"
  | "notificacoes"
  | "ajuda"
  | "editar"
  | "descarregar"
  | "enviarFicheiro"
  | "seguranca"
  | "sair"
  | "copiar"
  | "pesquisar"
  | "filtrar"
  | "maisOpcoes"
  | "sucesso"
  | "aviso"
  | "erro"
  | "informacao"
  | "calendario"
  | "relogio"
  | "setaDireita"
  | "setaEsquerda"
  | "fechar"
  | "ver"
  | "ocultar"
  | "trocar";

// Vetores SVG oficiais da biblioteca Lucide com stroke-width 1.75 e viewBox 0 0 24 24
const SVGS_LUCIDE: Record<ConceitoIcone, string> = {
  // Início: house
  inicio: `<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
  
  // Câmbio: arrow-left-right
  cambio: `<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>`,
  trocar: `<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>`,

  // Remessas: send
  remessas: `<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.94"/>`,

  // Cartões: credit-card
  cartoes: `<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>`,

  // Documentos: file-check
  documentos: `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>`,

  // Conta: user-round
  conta: `<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>`,

  // Notificações: bell
  notificacoes: `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`,

  // Ajuda: circle-help
  ajuda: `<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>`,

  // Editar: pencil
  editar: `<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>`,

  // Descarregar: download
  descarregar: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>`,

  // Enviar ficheiro: upload
  enviarFicheiro: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>`,

  // Segurança: shield-check
  seguranca: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,

  // Sair: log-out
  sair: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>`,

  // Copiar: copy
  copiar: `<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`,

  // Pesquisar: search
  pesquisar: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,

  // Filtrar: sliders-horizontal
  filtrar: `<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>`,

  // Mais opções: ellipsis
  maisOpcoes: `<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>`,

  // Sucesso: circle-check
  sucesso: `<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>`,

  // Aviso: triangle-alert
  aviso: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>`,

  // Erro: circle-x
  erro: `<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>`,

  // Informação: info
  informacao: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,

  // Calendário: calendar
  calendario: `<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>`,

  // Relógio: clock
  relogio: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,

  // Setas e Controles
  setaDireita: `<path d="m9 18 6-6-6-6"/>`,
  setaEsquerda: `<path d="m15 18-6-6 6-6"/>`,
  fechar: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  ver: `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>`,
  ocultar: `<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><line x1="2" x2="22" y1="2" y2="22"/>`,
};

/**
 * Gera marcação SVG oficial Lucide com stroke-width 1.75 e dimensões configuráveis.
 */
export function icone(
  conceito: ConceitoIcone,
  tamanho: number = 20,
  classeExtra: string = ""
): string {
  const caminho = SVGS_LUCIDE[conceito] || SVGS_LUCIDE.informacao;
  const classe = classeExtra ? ` class="lucide-icon ${classeExtra}"` : ` class="lucide-icon"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"${classe} aria-hidden="true">${caminho}</svg>`;
}
