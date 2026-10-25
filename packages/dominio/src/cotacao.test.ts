import { describe, expect, it } from "vitest";
import { ErroCotacao, criarCotacao, estaValida, taxaNaConfirmacao } from "./cotacao.js";
import { decimal } from "./dinheiro.js";

const t0 = new Date("2026-10-25T10:00:00Z");
const mais = (s: number) => new Date(t0.getTime() + s * 1000);

describe("cotação", () => {
  it("vale 90 segundos por omissão", () => {
    const c = criarCotacao(decimal("930.75"), t0);
    expect(c.expiraEm.toISOString()).toBe("2026-10-25T10:01:30.000Z");
    expect(estaValida(c, mais(89.999))).toBe(true);
    expect(estaValida(c, mais(90))).toBe(false);
  });

  it("aceita validade configurada e recusa valores inválidos", () => {
    expect(criarCotacao(decimal("1"), t0, 120).expiraEm.toISOString()).toBe("2026-10-25T10:02:00.000Z");
    expect(() => criarCotacao(decimal("1"), t0, 0)).toThrow(ErroCotacao);
    expect(() => criarCotacao(decimal("1"), t0, 1.5)).toThrow(ErroCotacao);
  });

  it("dentro da validade aplica a taxa cotada", () => {
    const c = criarCotacao(decimal("930.75"), t0);
    const r = taxaNaConfirmacao(c, mais(60), decimal("935.00"));
    expect(r).toMatchObject({ recotada: false });
    expect(r.taxa.toString()).toBe("930.75");
  });

  it("fora da validade recota à taxa da confirmação e guarda as duas (R-08)", () => {
    const c = criarCotacao(decimal("930.75"), t0);
    const r = taxaNaConfirmacao(c, mais(3600), decimal("935.00"));
    expect(r.recotada).toBe(true);
    expect(r.taxa.toString()).toBe("935");
    expect(r.taxaCotada.toString()).toBe("930.75");
  });

  it("recusa confirmação anterior à cotação", () => {
    const c = criarCotacao(decimal("930.75"), t0);
    expect(() => taxaNaConfirmacao(c, mais(-1), decimal("1"))).toThrow(ErroCotacao);
  });
});
