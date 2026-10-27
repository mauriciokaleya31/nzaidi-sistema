/**
 * Mapa de navegação do backoffice: uma só definição para o menu lateral,
 * a barra inferior do telemóvel, a pesquisa de páginas e o trilho do cabeçalho.
 * A visibilidade segue as permissões da sessão; a autorização real é sempre da API.
 */
import type { NomeIcone } from "@nzaidi/design-system";
import { authState } from "../state/auth.state.js";

export interface ItemNavegacao {
  id: string;
  rota: string;
  titulo: string;
  tituloCurto: string;
  descricao: string;
  icone: NomeIcone;
  grupo: string;
  /** Basta uma destas permissões para o item aparecer. */
  permissoes?: string[];
}

export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  {
    id: "nav-dashboard",
    rota: "#dashboard",
    titulo: "Visão geral",
    tituloCurto: "Início",
    descricao: "Resumo do dia, cotações e filas de trabalho",
    icone: "painel",
    grupo: "Operação",
  },
  {
    id: "nav-balcao",
    rota: "#balcao",
    titulo: "Balcão de câmbios",
    tituloCurto: "Balcão",
    descricao: "Compra e venda de divisas com emissão de borderô",
    icone: "balcao",
    grupo: "Operação",
    permissoes: ["operacoes:registar"],
  },
  {
    id: "nav-operacoes",
    rota: "#operacoes",
    titulo: "Operações",
    tituloCurto: "Operações",
    descricao: "Diário de operações cambiais registadas",
    icone: "operacoes",
    grupo: "Operação",
    permissoes: ["operacoes:consultar"],
  },
  {
    id: "nav-caixa",
    rota: "#caixa",
    titulo: "Caixa e tesouraria",
    tituloCurto: "Caixa",
    descricao: "Abertura, movimentos e fecho do caixa",
    icone: "caixa",
    grupo: "Operação",
    permissoes: ["caixa:consultar"],
  },
  {
    id: "nav-clientes",
    rota: "#clientes",
    titulo: "Clientes e KYC",
    tituloCurto: "Clientes",
    descricao: "Registo, diligência e dossiê documental",
    icone: "clientes",
    grupo: "Clientes e conformidade",
    permissoes: ["clientes:consultar"],
  },
  {
    id: "nav-auditoria",
    rota: "#auditoria",
    titulo: "Pista de auditoria",
    tituloCurto: "Auditoria",
    descricao: "Registo imutável de acções",
    icone: "auditoria",
    grupo: "Clientes e conformidade",
    permissoes: ["ver_auditoria"],
  },
  {
    id: "nav-taxas",
    rota: "#taxas",
    titulo: "Taxas de câmbio",
    tituloCurto: "Taxas",
    descricao: "Referência BNA, margens e taxas de balcão",
    icone: "taxas",
    grupo: "Mercado",
    permissoes: ["ver_taxas"],
  },
  {
    id: "nav-usuarios",
    rota: "#usuarios",
    titulo: "Equipa e acessos",
    tituloCurto: "Equipa",
    descricao: "Utilizadores internos e perfis",
    icone: "equipa",
    grupo: "Administração",
    permissoes: ["gerir_usuarios"],
  },
];

export function itensVisiveis(): ItemNavegacao[] {
  return ITENS_NAVEGACAO.filter((item) => !item.permissoes || item.permissoes.some((p) => authState.temPermissao(p)));
}

export function itemDaRota(rota: string): ItemNavegacao | undefined {
  return ITENS_NAVEGACAO.find((i) => i.rota === rota) ?? ITENS_NAVEGACAO[0];
}
