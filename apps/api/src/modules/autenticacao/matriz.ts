export const FUNCOES = ["atendente", "compliance", "tesouraria", "gestao"] as const;
export type FuncaoUsuario = (typeof FUNCOES)[number];

export type Permissao =
  | "ver_taxas"
  | "alterar_taxas"
  | "ver_auditoria"
  | "gerir_usuarios"
  | "registar_operacao_balcao"
  | "ver_operacoes"
  | "aprovar_casos_compliance"
  | "contabilidade_tesouraria"
  | "gerar_reportes_bna";

/**
 * Matriz de permissões estritas por função (docs/07, §2).
 * Nenhuma função tem acesso universal exceto se expressamente mapeado.
 */
export const MATRIZ_PERMISSOES: Record<FuncaoUsuario, readonly Permissao[]> = {
  atendente: [
    "ver_taxas",
    "registar_operacao_balcao",
    "ver_operacoes",
  ],
  compliance: [
    "ver_taxas",
    "ver_auditoria",
    "ver_operacoes",
    "aprovar_casos_compliance",
    "gerar_reportes_bna",
  ],
  tesouraria: [
    "ver_taxas",
    "ver_operacoes",
    "contabilidade_tesouraria",
    "gerar_reportes_bna",
  ],
  gestao: [
    "ver_taxas",
    "alterar_taxas", // R-07 e R-14: Só a gestão altera taxas e margens
    "ver_auditoria",
    "gerir_usuarios",
    "registar_operacao_balcao",
    "ver_operacoes",
    "aprovar_casos_compliance",
    "contabilidade_tesouraria",
    "gerar_reportes_bna",
  ],
};

export function usuarioTemPermissao(funcao: FuncaoUsuario, permissao: Permissao): boolean {
  const permissoes = MATRIZ_PERMISSOES[funcao];
  return permissoes.includes(permissao);
}
