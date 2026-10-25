import { describe, it, expect } from "vitest";
import { SimuladorCambio } from "./simulador.js";

describe("SimuladorCambio (apps/site-publico)", () => {
  it("inicia com USD, operação comprar e cotação de 90s válida", () => {
    const s = new SimuladorCambio();
    const t0 = new Date();
    const estado = s.calcularEstado(t0);

    expect(estado.moeda).toBe("USD");
    expect(estado.operacao).toBe("comprar");
    expect(estado.expirada).toBe(false);
    expect(estado.tempoRestanteSegundos).toBeGreaterThan(0);
    expect(estado.tempoRestanteSegundos).toBeLessThanOrEqual(90);
    expect(estado.resultado).toBeDefined();
    expect(estado.resultado?.tipoTaxa).toBe("venda");
  });

  it("calcula conversão exata para compra de 100 USD (cliente paga Kz à taxa de venda)", () => {
    const s = new SimuladorCambio();
    s.setMontante("100.00");
    s.setOperacao("comprar");
    const estado = s.calcularEstado(new Date());

    expect(estado.erro).toBeUndefined();
    // Referencia USD = 915.5000, margem venda = 2.5% -> 915.5 * 1.025 = 938.3875 Kz/USD
    // 100 USD * 938.3875 = 93 838.75 Kz
    expect(estado.resultado?.valorKz.montante.toString()).toBe("93838.75");
    expect(estado.resultado?.montanteKzFormatado).toContain("93 838,75 Kz");
    expect(estado.resultado?.montanteDivisaFormatado).toContain("US$ 100,00");
  });

  it("calcula conversão exata para venda de 100 EUR (cliente entrega EUR e recebe Kz à taxa de compra)", () => {
    const s = new SimuladorCambio();
    s.setMoeda("EUR");
    s.setOperacao("vender");
    s.setMontante("100.00");
    const estado = s.calcularEstado(new Date());

    expect(estado.erro).toBeUndefined();
    // Referencia EUR = 985.2000, margem compra = 2.0% -> 985.2 * 0.98 = 965.4960 Kz/EUR
    // 100 EUR * 965.4960 = 96 549.60 Kz
    expect(estado.resultado?.valorKz.montante.toString()).toBe("96549.6");
    expect(estado.resultado?.montanteKzFormatado).toContain("96 549,60 Kz");
    expect(estado.resultado?.montanteDivisaFormatado).toContain("100,00 €");
  });

  it("rejeita montantes negativos ou com mais de 2 casas decimais", () => {
    const s = new SimuladorCambio();
    s.setMontante("-50");
    let estado = s.calcularEstado(new Date());
    expect(estado.erro).toContain("estritamente superior a zero");
    expect(estado.resultado).toBeUndefined();

    s.setMontante("100.555");
    estado = s.calcularEstado(new Date());
    expect(estado.erro).toContain("mais de 2 casas decimais");
  });

  it("respeita a expiração de 90 segundos e bloqueia cálculo até recotar", () => {
    const t0 = new Date(1700000000000);
    const s = new SimuladorCambio();
    s.recotar(t0);

    // 89 segundos depois: ainda válida
    const t89 = new Date(t0.getTime() + 89 * 1000);
    let estado = s.calcularEstado(t89);
    expect(estado.expirada).toBe(false);
    expect(estado.tempoRestanteSegundos).toBe(1);

    // 90 segundos depois: expirada
    const t90 = new Date(t0.getTime() + 90 * 1000);
    estado = s.calcularEstado(t90);
    expect(estado.expirada).toBe(true);
    expect(estado.erro).toContain("expirou");

    // Recotação com novo momento
    const t95 = new Date(t0.getTime() + 95 * 1000);
    s.recotar(t95);
    estado = s.calcularEstado(t95);
    expect(estado.expirada).toBe(false);
    expect(estado.tempoRestanteSegundos).toBe(90);
  });
});
