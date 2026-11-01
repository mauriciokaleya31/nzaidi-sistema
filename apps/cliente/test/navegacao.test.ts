import { describe, it, expect } from "vitest";
import { TEXTOS } from "../src/textos/pt-AO.js";

describe("Regras de Navegação e Textos Oficiais (pt-AO)", () => {
  it("deve conter a lista fixa de nomes de navegação", () => {
    expect(TEXTOS.navegacao.inicio).toBe("Início");
    expect(TEXTOS.navegacao.cambio).toBe("Câmbio");
    expect(TEXTOS.navegacao.remessas).toBe("Remessas");
    expect(TEXTOS.navegacao.cartoes).toBe("Cartões");
    expect(TEXTOS.navegacao.documentos).toBe("Documentos");
    expect(TEXTOS.navegacao.minhaConta).toBe("Minha conta");
  });

  it("não deve incluir Cartões na navegação principal quando o serviço está inativo", () => {
    const servicoCartoesAtivo = false;
    const itensNav = [
      { rota: "/dashboard", rotulo: TEXTOS.navegacao.inicio },
      { rota: "/cambio", rotulo: TEXTOS.navegacao.cambio },
      { rota: "/remessas", rotulo: TEXTOS.navegacao.remessas },
    ];

    if (servicoCartoesAtivo) {
      itensNav.push({ rota: "/cartoes", rotulo: TEXTOS.navegacao.cartoes });
    }

    itensNav.push(
      { rota: "/documentos", rotulo: TEXTOS.navegacao.documentos },
      { rota: "/perfil", rotulo: TEXTOS.navegacao.minhaConta }
    );

    const contemCartoes = itensNav.some((i) => i.rotulo === "Cartões" || i.rotulo === "Cartões Visa");
    expect(contemCartoes).toBe(false);
    expect(itensNav.map((i) => i.rotulo)).toEqual([
      "Início",
      "Câmbio",
      "Remessas",
      "Documentos",
      "Minha conta",
    ]);
  });

  it("deve incluir Cartões na navegação quando o serviço é ativado pela administração", () => {
    const servicoCartoesAtivo = true;
    const itensNav = [
      { rota: "/dashboard", rotulo: TEXTOS.navegacao.inicio },
      { rota: "/cambio", rotulo: TEXTOS.navegacao.cambio },
      { rota: "/remessas", rotulo: TEXTOS.navegacao.remessas },
    ];

    if (servicoCartoesAtivo) {
      itensNav.push({ rota: "/cartoes", rotulo: TEXTOS.navegacao.cartoes });
    }

    itensNav.push(
      { rota: "/documentos", rotulo: TEXTOS.navegacao.documentos },
      { rota: "/perfil", rotulo: TEXTOS.navegacao.minhaConta }
    );

    const rotulos = itensNav.map((i) => i.rotulo);
    expect(rotulos).toContain("Cartões");
    expect(rotulos.length).toBe(6);
  });
});
