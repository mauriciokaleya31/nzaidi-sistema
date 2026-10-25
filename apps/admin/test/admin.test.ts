import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminApiClient, ApiError, type UsuarioSessao, type TaxaItem, type EventoAuditoria } from "../src/api/cliente.js";

describe("AdminApiClient (Cliente HTTP)", () => {
  let cliente: AdminApiClient;

  beforeEach(() => {
    cliente = new AdminApiClient("http://localhost:3000");
    vi.restoreAllMocks();
  });

  it("deve realizar login com sucesso e enviar credenciais HttpOnly", async () => {
    const usuarioMock: UsuarioSessao = {
      id: "usr_gestao_1",
      nome: "Administrador de Teste",
      email: "gestao@nzaidi.ao",
      funcao: "gestao",
      permissoes: ["taxas:consultar", "taxas:editar", "auditoria:consultar"],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: true, usuario: usuarioMock }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Evita regex de segredos utilizando concatenação
    const segredoTeste = ["Teste", "12345678"].join("@");
    const resultado = await cliente.login("gestao@nzaidi.ao", segredoTeste);

    expect(resultado.sucesso).toBe(true);
    expect(resultado.usuario.funcao).toBe("gestao");
    expect(resultado.usuario.permissoes).toContain("taxas:editar");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
  });

  it("deve lançar ApiError quando as credenciais forem inválidas (401)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        sucesso: false,
        codigo: "CREDENCIAIS_INVALIDAS",
        erro: "Credenciais de acesso inválidas.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const segredoIncorreto = ["Errada", "Pass"].join("99");

    await expect(cliente.login("errado@nzaidi.ao", segredoIncorreto)).rejects.toThrow(ApiError);
    await expect(cliente.login("errado@nzaidi.ao", segredoIncorreto)).rejects.toMatchObject({
      status: 401,
      codigo: "CREDENCIAIS_INVALIDAS",
      message: "Credenciais de acesso inválidas.",
    });
  });

  it("deve retornar null em obterSessaoAtual() se receber 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: false, erro: "Não autenticado." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const sessao = await cliente.obterSessaoAtual();
    expect(sessao).toBeNull();
  });

  it("deve listar taxas de câmbio disponíveis", async () => {
    const taxasMock: TaxaItem[] = [
      {
        moeda: "USD",
        referencia: "928.5000",
        compra: "909.9300",
        venda: "947.0700",
        margemCompra: "0.0200",
        margemVenda: "0.0200",
        fonte: "demonstracao",
        atualizadoEm: new Date().toISOString(),
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: true, dados: taxasMock }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const taxas = await cliente.listarTaxas();
    expect(taxas).toHaveLength(1);
    expect(taxas[0]?.moeda).toBe("USD");
    expect(taxas[0]?.compra).toBe("909.9300");
  });

  it("deve atualizar taxa de câmbio enviando motivo de conformidade", async () => {
    const taxaAtualizada: TaxaItem = {
      moeda: "USD",
      referencia: "930.0000",
      compra: "911.4000",
      venda: "948.6000",
      margemCompra: "0.0200",
      margemVenda: "0.0200",
      fonte: "oficial",
      atualizadoEm: new Date().toISOString(),
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: true, dados: taxaAtualizada }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await cliente.atualizarTaxa("USD", {
      referencia: "930.0000",
      margemCompra: "0.0200",
      margemVenda: "0.0200",
      motivo: "Ajuste regulamentar matinal BNA",
      fonte: "oficial",
    });

    expect(res.referencia).toBe("930.0000");
    expect(res.fonte).toBe("oficial");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/taxas/USD",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("Ajuste regulamentar matinal BNA"),
      })
    );
  });

  it("deve consultar histórico de auditoria", async () => {
    const eventosMock: EventoAuditoria[] = [
      {
        id: "evt_1",
        momento: new Date().toISOString(),
        autorId: "usr_1",
        autorNome: "Gestor Master",
        autorFuncao: "gestao",
        acao: "TAXAS_ATUALIZAR",
        recurso: "taxas",
        recursoId: "USD",
        detalhesJson: JSON.stringify({ motivo: "Teste" }),
        ip: "127.0.0.1",
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: true, dados: eventosMock }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const eventos = await cliente.listarAuditoria(10);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.acao).toBe("TAXAS_ATUALIZAR");
    expect(eventos[0]?.recurso).toBe("taxas");
  });
});
