import { describe, it, expect } from "vitest";
import { formatarMontante, formatarTaxa } from "../src/formatadores/moeda.js";

describe("Formatador Único de Números e Moeda (pt-AO)", () => {
  it("deve formatar montante simples de 897.19 para Kz 897,19", () => {
    const formatado = formatarMontante("897.19", "AOA");
    expect(formatado).toContain("897,19");
    expect(formatado).toMatch(/^Kz\s+897,19$/);
  });

  it("deve formatar taxa exata com 4 casas para 938.3875", () => {
    const taxa = formatarTaxa("938.3875", 4);
    expect(taxa).toBe("938,3875");
  });

  it("deve formatar montante com separador de milhares fino para 1009.83", () => {
    const formatado = formatarMontante("1009.83", "AOA");
    expect(formatado).toMatch(/1[\s\u00A0]009,83/);
  });

  it("deve formatar montante grande de 1009830 com separadores e duas casas", () => {
    const formatado = formatarMontante("1009830", "AOA");
    expect(formatado).toMatch(/1[\s\u00A0]009[\s\u00A0]830,00/);
  });

  it("deve formatar valores em USD e EUR com seus símbolos padronizados", () => {
    const usd = formatarMontante("500", "USD");
    expect(usd).toMatch(/US\$\s+500,00/);

    const eur = formatarMontante("250", "EUR");
    expect(eur).toMatch(/250,00\s+€/);
  });
});
