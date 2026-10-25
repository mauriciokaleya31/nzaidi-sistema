import { describe, expect, it } from "vitest";
import { ErroDinheiro, decimal, formatar, somar, valor } from "./dinheiro.js";

describe("dinheiro", () => {
  it("soma em decimal exato (sem erro de vírgula flutuante)", () => {
    const r = somar(valor("AOA", "0.1"), valor("AOA", "0.2"));
    expect(r.montante.toString()).toBe("0.3");
  });

  it("recusa números JS, texto ambíguo e vírgula decimal", () => {
    expect(() => decimal(0.1 as unknown as string)).toThrow(ErroDinheiro);
    expect(() => decimal("1,5")).toThrow(ErroDinheiro);
    expect(() => decimal("1e3")).toThrow(ErroDinheiro);
    expect(() => decimal("")).toThrow(ErroDinheiro);
  });

  it("recusa mais de duas casas decimais em vez de arredondar em silêncio", () => {
    expect(() => valor("USD", "10.005")).toThrow(ErroDinheiro);
  });

  it("recusa moedas não suportadas e somas entre moedas diferentes", () => {
    expect(() => valor("GBP", "1")).toThrow(ErroDinheiro);
    expect(() => somar(valor("USD", "1"), valor("EUR", "1"))).toThrow(ErroDinheiro);
  });

  it("formata em português de Angola", () => {
    expect(formatar(valor("AOA", "1234567.89"))).toBe("1 234 567,89 Kz");
    expect(formatar(valor("USD", "1000"))).toBe("US$ 1 000,00");
    expect(formatar(valor("EUR", "250.5"))).toBe("250,50 €");
    expect(formatar(valor("AOA", "-15"))).toBe("-15,00 Kz");
  });

  it("formata valores muito grandes sem perder precisão", () => {
    expect(formatar(valor("AOA", "98765432109876543.21"))).toBe(
      "98 765 432 109 876 543,21 Kz",
    );
  });
});
