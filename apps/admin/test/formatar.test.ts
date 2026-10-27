import { describe, it, expect } from "vitest";
import { esc, formatarDecimal, formatarMontante, formatarPercentagem, formatarTaxa, iniciais } from "../src/ui/formatar.js";

const NBSP = " ";

describe("Formatação de apresentação do backoffice", () => {
  it("agrupa milhares e usa vírgula decimal sem passar por vírgula flutuante", () => {
    expect(formatarMontante("AOA", "1000000.00")).toBe(`1${NBSP}000${NBSP}000,00${NBSP}Kz`);
    expect(formatarMontante("USD", "150")).toBe(`US$${NBSP}150,00`);
    expect(formatarMontante("EUR", "0.1")).toBe(`0,10${NBSP}€`);
  });

  it("devolve o texto original quando o montante é inválido e um travessão quando falta", () => {
    expect(formatarMontante("AOA", "abc")).toBe("abc AOA");
    expect(formatarMontante("AOA", null)).toBe("—");
  });

  it("formata taxas com 4 casas e margens em percentagem", () => {
    expect(formatarTaxa("1009.83")).toBe(`1${NBSP}009,8300`);
    expect(formatarPercentagem("0.0250")).toBe(`2,50${NBSP}%`);
    expect(formatarDecimal("-1234.5", 2)).toBe(`-1${NBSP}234,50`);
  });

  it("calcula iniciais e escapa HTML vindo da API", () => {
    expect(iniciais("Manuel António Domingos")).toBe("MA");
    expect(esc(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
