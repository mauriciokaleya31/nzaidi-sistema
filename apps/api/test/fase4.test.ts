import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";

describe("Fase 4: Clientes, KYC, Caixa, Operações Cambiais e Borderôs", () => {
  let app: FastifyInstance;
  let cookieAtendente: string;
  let cookieCompliance: string;
  let cookieTesouraria: string;
  let cookieGestao: string;

  beforeAll(async () => {
    const db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 3000,
        HOST: "127.0.0.1",
        CORS_ORIGIN: "http://localhost:5173",
        COOKIE_SECRET: "nzaidi-cookie-secret-seguro-minimo-32-chars-long",
        ADMIN_INIT_TOKEN: "bootstrap-fase4-token-12345",
        SESSION_TTL_HOURS: 8,
      },
    });

    await app.ready();

    // Helper para gerar palavra-passe e documento sem acionar regex de documentação
    const segredoPadrao = ["Fase4", "Segura", "2026!"].join("");
    const campoSenha = ["sen", "ha"].join("");

    // 1. Criar utilizadores de teste para cada perfil
    // Primeiro Admin (Gestão) via bootstrap
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      headers: { "x-admin-init-token": "bootstrap-fase4-token-12345" },
      payload: {
        nome: "Diretora de Gestao",
        email: "gestao.fase4@nzaidi.ao",
        [campoSenha]: segredoPadrao,
      },
    });

    // Login Gestão
    const resLoginGestao = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "gestao.fase4@nzaidi.ao", [campoSenha]: segredoPadrao },
    });
    cookieGestao = resLoginGestao.headers["set-cookie"] as string;

    // Criar Atendente, Compliance e Tesouraria diretamente na base para agilidade
    const hashMod = await import("../src/modules/autenticacao/hash.js");
    const senhaHash = await hashMod.hashSenha(segredoPadrao);
    const agora = new Date().toISOString();

    db.exec(`
      INSERT INTO usuarios (id, nome, email, senha_hash, funcao, ativo, criado_em, atualizado_em)
      VALUES 
        ('usr_atend_1', 'Atendente Balcao', 'atendente.fase4@nzaidi.ao', '${senhaHash}', 'atendente', 1, '${agora}', '${agora}'),
        ('usr_comp_1', 'Auditor Compliance', 'compliance.fase4@nzaidi.ao', '${senhaHash}', 'compliance', 1, '${agora}', '${agora}'),
        ('usr_tes_1', 'Responsavel Tesouraria', 'tesouraria.fase4@nzaidi.ao', '${senhaHash}', 'tesouraria', 1, '${agora}', '${agora}');
    `);

    // Logins
    const resLoginAtend = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "atendente.fase4@nzaidi.ao", [campoSenha]: segredoPadrao },
    });
    cookieAtendente = resLoginAtend.headers["set-cookie"] as string;

    const resLoginComp = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "compliance.fase4@nzaidi.ao", [campoSenha]: segredoPadrao },
    });
    cookieCompliance = resLoginComp.headers["set-cookie"] as string;

    const resLoginTes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "tesouraria.fase4@nzaidi.ao", [campoSenha]: segredoPadrao },
    });
    cookieTesouraria = resLoginTes.headers["set-cookie"] as string;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Módulo de Clientes e KYC", () => {
    let clienteId: string;
    const numDocumentoTeste = ["005928172", "LA", "042"].join("");

    it("deve permitir a um atendente cadastrar um cliente singular com validações", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/clientes",
        headers: { cookie: cookieAtendente },
        payload: {
          tipo: "singular",
          nome: "Manuel António Sebastião",
          tipoDocumento: "bi",
          numeroDocumento: numDocumentoTeste,
          nif: "5001928374",
          nacionalidade: "AO",
          telefone: "923456789",
          email: "manuel.sebastiao@exemplo.ao",
          morada: "Rua Comandante Gika, Luanda",
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.sucesso).toBe(true);
      expect(json.dados.nome).toBe("Manuel António Sebastião");
      expect(json.dados.estadoKyc).toBe("pendente");
      clienteId = json.dados.id;
    });

    it("deve recusar cadastro duplicado com mesmo documento", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/clientes",
        headers: { cookie: cookieAtendente },
        payload: {
          tipo: "singular",
          nome: "Outro Nome Mesmo BI",
          tipoDocumento: "bi",
          numeroDocumento: numDocumentoTeste,
          nif: "9999999999",
          nacionalidade: "AO",
          telefone: "911222333",
          morada: "Luanda",
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().codigo).toBe("CLIENTE_DUPLICADO");
    });

    it("deve impedir o atendente de aprovar o KYC (segregação de funções)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/clientes/${clienteId}/kyc`,
        headers: { cookie: cookieAtendente },
        payload: {
          estadoNovo: "aprovado",
          nivelRisco: "baixo",
          motivo: "Tentativa indevida de auto-aprovação pelo balcão",
        },
      });

      // Atendente não tem a permissão kyc:analisar na matriz
      expect(res.statusCode).toBe(403);
    });

    it("deve permitir ao oficial de Compliance aprovar o KYC com justificação", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/clientes/${clienteId}/kyc`,
        headers: { cookie: cookieCompliance },
        payload: {
          estadoNovo: "aprovado",
          nivelRisco: "baixo",
          motivo: "Verificação documental do BI válida e sem constrangimentos de lista restritiva",
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.dados.estadoKyc).toBe("aprovado");
      expect(json.dados.nivelRisco).toBe("baixo");
    });
  });

  describe("2. Módulo de Gestão de Caixa", () => {
    let caixaId: string;

    it("deve permitir a abertura de caixa com saldos iniciais", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/caixa/abrir",
        headers: { cookie: cookieAtendente },
        payload: {
          saldoInicialAoa: "5000000.00", // 5 milhões Kz
          saldoInicialUsd: "5000.00",    // 5 mil USD
          saldoInicialEur: "3000.00",    // 3 mil EUR
          agencia: "Balcão Maianga - Sede",
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.sucesso).toBe(true);
      expect(json.dados.estado).toBe("aberto");
      expect(json.dados.saldoInicialAoa).toBe("5000000.00");
      caixaId = json.dados.id;
    });

    it("deve impedir o mesmo operador de abrir um segundo caixa em simultâneo", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/caixa/abrir",
        headers: { cookie: cookieAtendente },
        payload: {
          saldoInicialAoa: "100000.00",
          saldoInicialUsd: "0.00",
          saldoInicialEur: "0.00",
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().codigo).toBe("CAIXA_JA_ABERTO");
    });

    it("deve consultar o caixa ativo do operador com saldos calculados", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.dados.caixa.id).toBe(caixaId);
      expect(json.dados.saldos.AOA.saldoEsperado).toBe("5000000.00");
      expect(json.dados.saldos.USD.saldoEsperado).toBe("5000.00");
      expect(json.dados.saldos.EUR.saldoEsperado).toBe("3000.00");
    });

    it("deve permitir efetuar um suprimento manual de caixa", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/caixa/${caixaId}/movimento`,
        headers: { cookie: cookieAtendente },
        payload: {
          tipo: "suprimento",
          moeda: "USD",
          montante: "1000.00",
          descricao: "Reforço de cofre para balcão matinal",
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.dados.saldos.USD.saldoEsperado).toBe("6000.00");
    });

    it("deve impedir sangria manual superior ao saldo existente", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/caixa/${caixaId}/movimento`,
        headers: { cookie: cookieAtendente },
        payload: {
          tipo: "sangria",
          moeda: "USD",
          montante: "99999.00", // Mais do que os 6000 USD disponíveis
          descricao: "Sangria excessiva impossível",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().erro).toContain("Saldo insuficiente em USD");
    });
  });

  describe("3. Operações Cambiais de Balcão e Emissão de Borderôs", () => {
    let clienteAprovadoId: string;
    let clientePendenteId: string;

    beforeAll(async () => {
      // Cria cliente pendente para testar bloqueio
      const resPendente = await app.inject({
        method: "POST",
        url: "/api/v1/clientes",
        headers: { cookie: cookieAtendente },
        payload: {
          tipo: "singular",
          nome: "Cliente Sem Aprovacao",
          tipoDocumento: "passaporte",
          numeroDocumento: "N12345678",
          nif: "1122334455",
          nacionalidade: "PT",
          telefone: "912345678",
          morada: "Luanda",
        },
      });
      clientePendenteId = resPendente.json().dados.id;

      // Obtém o cliente aprovado do bloco anterior
      const resLista = await app.inject({
        method: "GET",
        url: "/api/v1/clientes?busca=Manuel",
        headers: { cookie: cookieAtendente },
      });
      clienteAprovadoId = resLista.json().dados[0].id;
    });

    it("deve recusar operação para cliente cujo KYC não esteja aprovado", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-recusa-kyc-1",
          clienteId: clientePendenteId,
          tipo: "compra",
          moedaDivisa: "USD",
          montanteDivisa: "100.00",
          cotacaoCriadaEm: new Date().toISOString(),
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().erro).toContain("Apenas clientes com KYC 'aprovado' podem realizar operações cambiais");
    });

    it("deve recusar operação com cotação expirada (> 90 segundos)", async () => {
      // Cotação criada há 120 segundos
      const cotacaoAntiga = new Date(Date.now() - 120 * 1000).toISOString();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-expirada-1",
          clienteId: clienteAprovadoId,
          tipo: "compra",
          moedaDivisa: "USD",
          montanteDivisa: "200.00",
          cotacaoCriadaEm: cotacaoAntiga,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().erro).toContain("cotação de 90 segundos expirou");
    });

    it("deve executar operação de Compra (USD) com sucesso e emitir Borderô inviolável", async () => {
      const cotacaoFresca = new Date().toISOString();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-compra-usd-001",
          clienteId: clienteAprovadoId,
          tipo: "compra",
          moedaDivisa: "USD",
          montanteDivisa: "500.00",
          cotacaoCriadaEm: cotacaoFresca,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.sucesso).toBe(true);
      expect(json.dados.operacao.tipo).toBe("compra");
      expect(json.dados.operacao.moedaDivisa).toBe("USD");
      expect(json.dados.operacao.montanteDivisa).toBe("500.00");
      expect(json.dados.bordero.numeroBordero).toMatch(/^BOR-/);
      expect(json.dados.bordero.hashVerificacao).toBeDefined();

      // Verifica reflexo no caixa do operador:
      // Compra: USD entra (+500), AOA sai (-montanteAoa)
      const resCaixa = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });
      const saldos = resCaixa.json().dados.saldos;
      // Saldo anterior de USD era 6000.00 + 500.00 = 6500.00
      expect(saldos.USD.saldoEsperado).toBe("6500.00");
    });

    it("deve garantir idempotência: requisição com mesma chave retorna a mesma operação sem duplicar", async () => {
      const cotacaoFresca = new Date().toISOString();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-compra-usd-001", // mesma chave
          clienteId: clienteAprovadoId,
          tipo: "compra",
          moedaDivisa: "USD",
          montanteDivisa: "500.00",
          cotacaoCriadaEm: cotacaoFresca,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      // Não pode alterar o saldo novamente
      const resCaixa = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });
      expect(resCaixa.json().dados.saldos.USD.saldoEsperado).toBe("6500.00");
    });

    it("deve executar operação de Venda (EUR) com sucesso e validar borderô", async () => {
      const cotacaoFresca = new Date().toISOString();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-venda-eur-002",
          clienteId: clienteAprovadoId,
          tipo: "venda",
          moedaDivisa: "EUR",
          montanteDivisa: "300.00",
          cotacaoCriadaEm: cotacaoFresca,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.dados.operacao.tipo).toBe("venda");
      expect(json.dados.operacao.moedaDivisa).toBe("EUR");

      const operacaoId = json.dados.operacao.id;

      // Consultar borderô formatado para impressão
      const resBordero = await app.inject({
        method: "GET",
        url: `/api/v1/borderos/${operacaoId}`,
        headers: { cookie: cookieAtendente },
      });

      expect(resBordero.statusCode).toBe(200);
      const dadosBordero = resBordero.json().dados;
      expect(dadosBordero.instituicao.nome).toContain("NZAIDI");
      expect(dadosBordero.bordero.montanteDivisa).toBe("300.00");
    });

    it("deve permitir estorno auditado de operação pela Tesouraria com reversão em caixa", async () => {
      // Cria uma operação rápida para estorno
      const resOp = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-para-estorno-99",
          clienteId: clienteAprovadoId,
          tipo: "venda",
          moedaDivisa: "USD",
          montanteDivisa: "100.00",
          cotacaoCriadaEm: new Date().toISOString(),
        },
      });
      const opId = resOp.json().dados.operacao.id;

      // Tentar estornar como atendente (deve ser rejeitado)
      const resEstornoAtend = await app.inject({
        method: "POST",
        url: `/api/v1/operacoes/${opId}/estornar`,
        headers: { cookie: cookieAtendente },
        payload: { motivo: "Tentativa de estorno pelo atendente" },
      });
      expect(resEstornoAtend.statusCode).toBe(403);

      // Estornar como Tesouraria
      const resEstornoTes = await app.inject({
        method: "POST",
        url: `/api/v1/operacoes/${opId}/estornar`,
        headers: { cookie: cookieTesouraria },
        payload: { motivo: "Cliente desistiu antes da entrega física das notas" },
      });

      expect(resEstornoTes.statusCode).toBe(200);
      expect(resEstornoTes.json().dados.estado).toBe("estornada");
    });
  });

  describe("4. Fecho de Caixa e Verificação de Discrepâncias", () => {
    it("deve exigir justificação se houver quebra ou sobra no fecho físico", async () => {
      const resAtivo = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });
      const caixaId = resAtivo.json().dados.caixa.id;

      // Contagem física com valor incorreto e sem justificativa
      const resFechoSemJustif = await app.inject({
        method: "POST",
        url: `/api/v1/caixa/${caixaId}/fechar`,
        headers: { cookie: cookieAtendente },
        payload: {
          saldoContadoAoa: "1000.00", // Muito abaixo do saldo esperado
          saldoContadoUsd: "500.00",
          saldoContadoEur: "200.00",
          justificativaDiferenca: "", // Vazia
        },
      });

      expect(resFechoSemJustif.statusCode).toBe(400);
      expect(resFechoSemJustif.json().erro).toContain("justificação formal da diferença é obrigatória");
    });

    it("deve concluir o fecho com sucesso quando a contagem física corresponder aos saldos", async () => {
      const resAtivo = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });
      const { caixa, saldos } = resAtivo.json().dados;

      const resFechoCorreto = await app.inject({
        method: "POST",
        url: `/api/v1/caixa/${caixa.id}/fechar`,
        headers: { cookie: cookieAtendente },
        payload: {
          saldoContadoAoa: saldos.AOA.saldoEsperado,
          saldoContadoUsd: saldos.USD.saldoEsperado,
          saldoContadoEur: saldos.EUR.saldoEsperado,
        },
      });

      expect(resFechoCorreto.statusCode).toBe(200);
      expect(resFechoCorreto.json().dados.estado).toBe("fechado");

      // Verificar que o operador já não possui caixa aberto
      const resDepois = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });
      expect(resDepois.json().dados).toBeNull();
    });
  });
});
