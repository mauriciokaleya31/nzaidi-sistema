/**
 * Formatação para apresentação (só leitura). Nenhuma regra financeira vive aqui:
 * os valores chegam da API como texto decimal e são apenas agrupados e pontuados
 * à maneira angolana, sem passar por números de vírgula flutuante.
 */
import { decimal, formatar, valor } from "@nzaidi/dominio";

const ESPACO_FINO = " ";

function agrupar(inteira: string): string {
  return inteira.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACO_FINO);
}

/** "1000000.00" em AOA → "1 000 000,00 Kz"; em USD → "US$ 150,00". Se o texto for inválido, devolve-o tal como veio. */
export function formatarMontante(moeda: string, montante: string | null | undefined): string {
  if (montante === null || montante === undefined || montante === "") return "—";
  try {
    return formatar(valor(moeda, montante)).replace(/ /g, ESPACO_FINO);
  } catch {
    return `${montante} ${moeda}`;
  }
}

/** Número decimal sem moeda, com casas fixas: "897.19" → "897,1900". */
export function formatarDecimal(texto: string | null | undefined, casas = 2): string {
  if (texto === null || texto === undefined || texto === "") return "—";
  try {
    const fixo = decimal(texto).toFixed(casas);
    const negativo = fixo.startsWith("-");
    const [inteira = "0", fracao] = (negativo ? fixo.slice(1) : fixo).split(".");
    return `${negativo ? "-" : ""}${agrupar(inteira)}${fracao ? `,${fracao}` : ""}`;
  } catch {
    return texto;
  }
}

/** Taxa de câmbio com 4 casas: "897.19" → "897,1900". */
export function formatarTaxa(texto: string | null | undefined): string {
  return formatarDecimal(texto, 4);
}

/** Margem em fracção para percentagem: "0.0200" → "2,00 %". */
export function formatarPercentagem(fraccao: string | null | undefined): string {
  if (fraccao === null || fraccao === undefined || fraccao === "") return "—";
  try {
    return `${formatarDecimal(decimal(fraccao).times(100).toString(), 2)}${ESPACO_FINO}%`;
  } catch {
    return fraccao;
  }
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
}

/** Iniciais para avatar: "Manuel António Domingos" → "MA". */
export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/** Escapa texto vindo da API antes de o inserir em HTML. */
export function esc(texto: unknown): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
