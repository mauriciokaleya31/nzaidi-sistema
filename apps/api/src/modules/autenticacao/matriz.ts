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
  | "gerar_reportes_bna"
  // Permissões granulares da Fase 4
  | "clientes:criar"
  | "clientes:consultar"
  | "clientes:editar"
  | "kyc:analisar"
  | "kyc:aprovar"
  | "caixa:abrir"
  | "caixa:movimentar"
  | "caixa:fechar"
  | "caixa:consultar"
  | "operacoes:registar"
  | "operacoes:consultar"
  | "operacoes:estornar"
  | "usuarios:consultar"
  | "usuarios:gerir";

/**
 * Matriz de permissões estritas por função (docs/07, §2).
 * Nenhuma função tem acesso universal exceto se expressamente mapeado.
 */
export const MATRIZ_PERMISSOES: Record<FuncaoUsuario, readonly Permissao[]> = {
  atendente: [
    "ver_taxas",
    "registar_operacao_balcao",
    "ver_operacoes",
    "clientes:criar",
    "clientes:consultar",
    "caixa:abrir",
    "caixa:fechar",
    "caixa:consultar",
    "caixa:movimentar",
    "operacoes:registar",
    "operacoes:consultar",
  ],
  compliance: [
    "ver_taxas",
    "ver_auditoria",
    "ver_operacoes",
    "aprovar_casos_compliance",
    "gerar_reportes_bna",
    "clientes:consultar",
    "kyc:analisar",
    "kyc:aprovar",
    "operacoes:consultar",
  ],
  tesouraria: [
    "ver_taxas",
    "ver_operacoes",
    "contabilidade_tesouraria",
    "gerar_reportes_bna",
    "clientes:consultar",
    "caixa:abrir",
    "caixa:fechar",
    "caixa:consultar",
    "caixa:movimentar",
    "operacoes:consultar",
    "operacoes:estornar",
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
    "clientes:criar",
    "clientes:consultar",
    "clientes:editar",
    "kyc:analisar",
    "kyc:aprovar",
    "caixa:abrir",
    "caixa:fechar",
    "caixa:consultar",
    "caixa:movimentar",
    "operacoes:registar",
    "operacoes:consultar",
    "operacoes:estornar",
    "usuarios:consultar",
    "usuarios:gerir",
  ],
};

export function usuarioTemPermissao(funcao: FuncaoUsuario, permissao: Permissao): boolean {
  const permissoes = MATRIZ_PERMISSOES[funcao];
  return permissoes.includes(permissao);
}
