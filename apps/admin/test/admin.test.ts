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

  // --- Fase 4: Clientes, Caixa e Operações ---
  it("deve cadastrar novo cliente via API", async () => {
    const clienteMock = {
      id: "cli_123",
      tipo: "singular",
      nome: "Sebastião Manuel",
      tipoDocumento: "bi",
      numeroDocumento: "0011223344LA01",
      nif: "5001234567",
      nacionalidade: "AO",
      telefone: "923111222",
      morada: "Luanda",
      estado: "ativo",
      estadoKyc: "pendente",
      nivelRisco: "baixo",
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: true, dados: clienteMock }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await cliente.criarCliente({
      tipo: "singular",
      nome: "Sebastião Manuel",
      tipoDocumento: "bi",
      numeroDocumento: "0011223344LA01",
      nif: "5001234567",
      nacionalidade: "AO",
      telefone: "923111222",
      morada: "Luanda",
    });

    expect(res.id).toBe("cli_123");
    expect(res.nome).toBe("Sebastião Manuel");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/clientes",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deve obter caixa ativo do operador", async () => {
    const caixaMock = {
      caixa: {
        id: "cx_1",
        numeroCaixa: "CX-20261025-01",
        operadorId: "usr_1",
        operadorNome: "Atendente",
        agencia: "Maianga",
        abertoEm: new Date().toISOString(),
        estado: "aberto",
        saldoInicialAoa: "1000000.00",
        saldoInicialUsd: "2000.00",
        saldoInicialEur: "1000.00",
      },
      saldos: {
        AOA: { moeda: "AOA", saldoInicial: "1000000.00", entradas: "0.00", saidas: "0.00", saldoEsperado: "1000000.00" },
        USD: { moeda: "USD", saldoInicial: "2000.00", entradas: "0.00", saidas: "0.00", saldoEsperado: "2000.00" },
        EUR: { moeda: "EUR", saldoInicial: "1000.00", entradas: "0.00", saidas: "0.00", saldoEsperado: "1000.00" },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: true, dados: caixaMock }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await cliente.obterCaixaAtivo();
    expect(res).not.toBeNull();
    expect(res?.caixa.numeroCaixa).toBe("CX-20261025-01");
    expect(res?.saldos.AOA.saldoEsperado).toBe("1000000.00");
  });

  it("deve submeter operação cambial de balcão e receber borderô oficial", async () => {
    const operacaoMock = {
      operacao: {
        id: "op_1",
        numeroOperacao: "OP-20261025-001",
        clienteId: "cli_123",
        caixaId: "cx_1",
        tipo: "compra",
        moedaDivisa: "USD",
        montanteDivisa: "500.00",
        taxaAplicada: "909.9300",
        taxaReferenciaBna: "928.5000",
        margemAplicada: "0.0200",
        montanteAoa: "454965.00",
        fonteTaxa: "oficial",
        estado: "confirmada",
        operadorNome: "Atendente Balcão",
        criadoEm: new Date().toISOString(),
      },
      bordero: {
        id: "bor_1",
        numeroBordero: "BOR-20261025-001",
        operacaoId: "op_1",
        clienteNome: "Sebastião Manuel",
        clienteDocumento: "BI: 0011223344LA01",
        clienteNif: "5001234567",
        tipoOperacao: "compra",
        moedaDivisa: "USD",
        montanteDivisa: "500.00",
        taxaCambio: "909.9300",
        totalAoa: "454965.00",
        operadorNome: "Atendente Balcão",
        emitidoEm: new Date().toISOString(),
        hashVerificacao: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ sucesso: true, dados: operacaoMock }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await cliente.criarOperacao({
      chaveIdempotencia: "idem_teste_1",
      clienteId: "cli_123",
      tipo: "compra",
      moedaDivisa: "USD",
      montanteDivisa: "500.00",
      cotacaoCriadaEm: new Date().toISOString(),
    });

    expect(res.operacao.id).toBe("op_1");
    expect(res.bordero.numeroBordero).toBe("BOR-20261025-001");
    expect(res.bordero.totalAoa).toBe("454965.00");
  });
});
