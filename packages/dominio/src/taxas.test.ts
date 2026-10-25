import { describe, expect, it } from "vitest";
import { ErroTaxa, calcularTaxas, kwanzasAoVenderDivisa, kwanzasParaComprarDivisa } from "./taxas.js";

// Valores fictícios de teste. Não são taxas nem margens da NZAIDI.
const limites = { minima: "0", maxima: "0.10" };
const usd = { moeda: "USD", referencia: "912.5000", margemCompra: "0.015", margemVenda: "0.02" } as const;

describe("taxas", () => {
  it("aplica a fórmula confirmada (R-07)", () => {
    const t = calcularTaxas(usd, limites);
    expect(t.venda.toFixed(4)).toBe("930.7500"); // 912.5 × 1.02
    expect(t.compra.toFixed(4)).toBe("898.8125"); // 912.5 × 0.985
  });

  it("a margem favorece sempre a NZAIDI: compra < referência < venda", () => {
    const t = calcularTaxas(usd, limites);
    expect(t.compra.lessThan(t.referencia)).toBe(true);
    expect(t.venda.greaterThan(t.referencia)).toBe(true);
  });

  it("arredonda as taxas a 4 casas", () => {
    const t = calcularTaxas({ ...usd, referencia: "1000.12345", margemVenda: "0" , margemCompra: "0" }, limites);
    expect(t.venda.toFixed(4)).toBe("1000.1235");
  });

  it("recusa margens fora do intervalo e referências inválidas", () => {
    expect(() => calcularTaxas({ ...usd, margemVenda: "0.5" }, limites)).toThrow(ErroTaxa);
    expect(() => calcularTaxas({ ...usd, margemCompra: "-0.01" }, limites)).toThrow(ErroTaxa);
    expect(() => calcularTaxas({ ...usd, referencia: "0" }, limites)).toThrow(ErroTaxa);
    expect(() => calcularTaxas({ ...usd, referencia: "abc" }, limites)).toThrow(ErroTaxa);
    expect(() => calcularTaxas(usd, { minima: "-0.1", maxima: "0.1" })).toThrow(ErroTaxa);
  });

  it("converte montantes com arredondamento a 2 casas", () => {
    const t = calcularTaxas(usd, limites);
    expect(kwanzasParaComprarDivisa(t, "100").toFixed(2)).toBe("93075.00");
    expect(kwanzasAoVenderDivisa(t, "100").toFixed(2)).toBe("89881.25");
    expect(kwanzasAoVenderDivisa(t, "0.33").toFixed(2)).toBe("296.61"); // 296.608125
  });

  it("recusa montantes nulos ou negativos", () => {
    const t = calcularTaxas(usd, limites);
    expect(() => kwanzasParaComprarDivisa(t, "0")).toThrow(ErroTaxa);
    expect(() => kwanzasAoVenderDivisa(t, "-5")).toThrow(ErroTaxa);
  });
});
