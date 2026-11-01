import { D, type Decimal, type Moeda } from "@nzaidi/dominio";

/**
 * Formatador Único do Portal do Cliente NZAIDI.
 * Utiliza @nzaidi/dominio e Decimal.js com precisão exata.
 * NUNCA passa por Number de vírgula flutuante nos cálculos.
 */

const ESPACO_FINO = "\u00A0"; // Espaço inseparável para agrupamento limpo

/**
 * Formata um montante monetário: ex. "Kz 1 009 830,00" ou "US$ 500,00" ou "500,00 €"
 */
export function formatarMontante(
  valorStr: string | number,
  moeda: "AOA" | "USD" | "EUR" = "AOA",
  incluirSimbolo = true
): string {
  try {
    const limpo = typeof valorStr === "number" ? valorStr.toFixed(2) : String(valorStr || "0").trim();
    const d = new D(limpo);
    const fixo = d.toFixed(2, D.ROUND_HALF_UP);
    const negativo = fixo.startsWith("-");
    const [inteira = "0", decimal = "00"] = (negativo ? fixo.slice(1) : fixo).split(".");
    const inteiraFormatada = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACO_FINO);

    const valorFormatado = `${negativo ? "-" : ""}${inteiraFormatada},${decimal}`;

    if (!incluirSimbolo) return valorFormatado;

    switch (moeda) {
      case "AOA":
        return `Kz ${valorFormatado}`;
      case "USD":
        return `US$ ${valorFormatado}`;
      case "EUR":
        return `${valorFormatado} €`;
      default:
        return `${valorFormatado} ${moeda}`;
    }
  } catch {
    return `Kz 0,00`;
  }
}

/**
 * Formata taxa de câmbio para cartões e resumos.
 * @param taxaStr Taxa em texto ou número
 * @param casasDecimais 2 para cartões de topo, 4 para taxas exatas de simulação/resumo
 */
export function formatarTaxa(taxaStr: string | number, casasDecimais: 2 | 4 = 2): string {
  try {
    const limpo = typeof taxaStr === "number" ? String(taxaStr) : String(taxaStr || "0").trim();
    const d = new D(limpo);
    const fixo = d.toFixed(casasDecimais, D.ROUND_HALF_UP);
    const [inteira = "0", decimal = casasDecimais === 2 ? "00" : "0000"] = fixo.split(".");
    const inteiraFormatada = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACO_FINO);
    return `${inteiraFormatada},${decimal}`;
  } catch {
    return casasDecimais === 2 ? "0,00" : "0,0000";
  }
}

/**
 * Formata data e hora no fuso horário oficial de Angola (Africa/Luanda).
 * Exemplo: "31 out 2026, 14:32"
 */
export function formatarDataHora(dataIso: string | Date | number): string {
  try {
    const d = typeof dataIso === "string" || typeof dataIso === "number" ? new Date(dataIso) : dataIso;
    if (isNaN(d.getTime())) return "Data em atualização";

    const formatador = new Intl.DateTimeFormat("pt-AO", {
      timeZone: "Africa/Luanda",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Formatar e limpar ponto do mês se houver (ex.: "31 de out. de 2026, 14:32" -> "31 out 2026, 14:32")
    const partes = formatador.formatToParts(d);
    let dia = "", mes = "", ano = "", hora = "", minuto = "";

    for (const p of partes) {
      if (p.type === "day") dia = p.value;
      if (p.type === "month") mes = p.value.replace(".", "");
      if (p.type === "year") ano = p.value;
      if (p.type === "hour") hora = p.value;
      if (p.type === "minute") minuto = p.value;
    }

    return `${dia} ${mes} ${ano}, ${hora}:${minuto}`;
  } catch {
    return "Data em atualização";
  }
}

/**
 * Formata data curta no fuso horário oficial (Africa/Luanda).
 * Exemplo: "31 out 2026"
 */
export function formatarDataCurta(dataIso: string | Date | number): string {
  try {
    const d = typeof dataIso === "string" || typeof dataIso === "number" ? new Date(dataIso) : dataIso;
    if (isNaN(d.getTime())) return "Data em atualização";

    const formatador = new Intl.DateTimeFormat("pt-AO", {
      timeZone: "Africa/Luanda",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const partes = formatador.formatToParts(d);
    let dia = "", mes = "", ano = "";
    for (const p of partes) {
      if (p.type === "day") dia = p.value;
      if (p.type === "month") mes = p.value.replace(".", "");
      if (p.type === "year") ano = p.value;
    }
    return `${dia} ${mes} ${ano}`;
  } catch {
    return "Data em atualização";
  }
}
