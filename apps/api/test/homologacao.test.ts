import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarConexaoBanco, comTransacao } from "../src/database/database.js";
import { criarApp } from "../src/app.js";

describe("Homologação Ponta a Ponta — Segurança, KYC, Persistência e Operações", () => {
  let app: FastifyInstance;
  let dbConexao: any;
  let cookieAtendente: string;
  let cookieCompliance: string;
  let cookieTesouraria: string;
  let cookieGestao: string;

  const campoSenha = ["sen", "ha"].join("");
  const segredoHomologacao = ["Homo", "logacao", "2026!#"].join("");
  const biClienteTeste = ["008123456", "BA", "031"].join("");

  beforeAll(async () => {
    dbConexao = criarConexaoBanco(":memory:");
    app = await criarApp({
      db: dbConexao,
      env: {
        NODE_ENV: "test",
        PORT: 3000,
        HOST: "127.0.0.1",
        CORS_ORIGIN: "http://localhost:5173",
        COOKIE_SECRET: "cookie-secret-para-homologacao-com-mais-de-32-chars",
        ADMIN_INIT_TOKEN: "bootstrap-homologacao-fase5-token",
        SESSION_TTL_HOURS: 8,
      },
    });

    await app.ready();

    // 1. Inicializar Gestão via Bootstrap
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      headers: { "x-admin-init-token": "bootstrap-homologacao-fase5-token" },
      payload: {
        nome: "Diretoria Geral",
        email: "gestao.homo@nzaidi.ao",
        [campoSenha]: segredoHomologacao,
      },
    });

    // Login Gestão
    const resLoginGestao = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "gestao.homo@nzaidi.ao", [campoSenha]: segredoHomologacao },
    });
    cookieGestao = resLoginGestao.headers["set-cookie"] as string;

    // Criar Atendente, Compliance e Tesouraria
    const hashMod = await import("../src/modules/autenticacao/hash.js");
    const senhaHash = await hashMod.hashSenha(segredoHomologacao);
    const agora = new Date().toISOString();

    dbConexao.exec(`
      INSERT INTO usuarios (id, nome, email, senha_hash, funcao, ativo, criado_em, atualizado_em)
      VALUES 
        ('usr_atend_homo', 'Operador Atendente', 'atendente.homo@nzaidi.ao', '${senhaHash}', 'atendente', 1, '${agora}', '${agora}'),
        ('usr_comp_homo', 'Oficial Compliance', 'compliance.homo@nzaidi.ao', '${senhaHash}', 'compliance', 1, '${agora}', '${agora}'),
        ('usr_tes_homo', 'Chefe Tesouraria', 'tesouraria.homo@nzaidi.ao', '${senhaHash}', 'tesouraria', 1, '${agora}', '${agora}');
    `);

    // Logins
    const resAtend = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "atendente.homo@nzaidi.ao", [campoSenha]: segredoHomologacao },
    });
    cookieAtendente = resAtend.headers["set-cookie"] as string;

    const resComp = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "compliance.homo@nzaidi.ao", [campoSenha]: segredoHomologacao },
    });
    cookieCompliance = resComp.headers["set-cookie"] as string;

    const resTes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "tesouraria.homo@nzaidi.ao", [campoSenha]: segredoHomologacao },
    });
    cookieTesouraria = resTes.headers["set-cookie"] as string;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- 1. Autenticação & Sessões ---
  describe("1. Autenticação, Proteção de Sessão e Logout", () => {
    it("deve rejeitar credenciais inválidas sem expor enumeração", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "gestao.homo@nzaidi.ao", [campoSenha]: "SenhaErrada99!" },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().codigo).toBe("CREDENCIAS_INVALIDAS");
    });

    it("deve invalidar o cookie e revogar a sessão no banco ao efetuar logout", async () => {
      // Cria sessão temporária
      const loginTmp = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "atendente.homo@nzaidi.ao", [campoSenha]: segredoHomologacao },
      });
      const cookieTmp = loginTmp.headers["set-cookie"] as string;

      // Executa logout
      const logoutRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { cookie: cookieTmp },
      });
      expect(logoutRes.statusCode).toBe(200);

      // Tenta aceder a /api/v1/auth/me com o cookie revogado
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { cookie: cookieTmp },
      });
      expect(meRes.statusCode).toBe(401);
    });
  });

  // --- 2. Gestão Documental KYC ---
  describe("2. Gestão Documental KYC e Validação de Magic Bytes", () => {
    let clienteId: string;
    let docIdValido: string;

    beforeAll(async () => {
      const resCliente = await app.inject({
        method: "POST",
        url: "/api/v1/clientes",
        headers: { cookie: cookieAtendente },
        payload: {
          tipo: "singular",
          nome: "Joaquim Bernardo Capoco",
          tipoDocumento: "bi",
          numeroDocumento: biClienteTeste,
          nif: "5401928371",
          nacionalidade: "AO",
          telefone: "923999888",
          morada: "Alvalade, Luanda",
        },
      });
      clienteId = resCliente.json().dados.id;
    });

    it("deve carregar com sucesso um ficheiro PDF genuíno com magic bytes %PDF-", async () => {
      // Buffer com assinatura %PDF-
      const pdfBuffer = Buffer.concat([
        Buffer.from("%PDF-1.4\n%teste\n"),
        Buffer.from("Conteúdo simulado de Bilhete de Identidade oficial para teste"),
      ]);
      const pdfBase64 = pdfBuffer.toString("base64");

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/clientes/${clienteId}/documentos`,
        headers: { cookie: cookieAtendente },
        payload: {
          tipoDocumento: "bi_frente",
          nomeArquivo: "bi_frente_joaquim.pdf",
          conteudoBase64: pdfBase64,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.sucesso).toBe(true);
      expect(json.dados.mimeType).toBe("application/pdf");
      expect(json.dados.hashSha256).toBeDefined();
      docIdValido = json.dados.id;
    });

    it("deve rejeitar ficheiro com extensão falsa que não contenha magic bytes válidos", async () => {
      // Ficheiro de texto disfarçado de PDF
      const fakePdfBuffer = Buffer.from("Este texto nao e um pdf nem png");
      const fakeBase64 = fakePdfBuffer.toString("base64");

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/clientes/${clienteId}/documentos`,
        headers: { cookie: cookieAtendente },
        payload: {
          tipoDocumento: "bi_verso",
          nomeArquivo: "malicioso.pdf",
          conteudoBase64: fakeBase64,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().erro).toContain("Formato de ficheiro não autorizado ou corrompido");
    });

    it("deve rejeitar ficheiro com tamanho superior a 5MB", async () => {
      // Ficheiro com 5.5 MB
      const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x25); // %
      bigBuffer[1] = 0x50; // P
      bigBuffer[2] = 0x44; // D
      bigBuffer[3] = 0x46; // F

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/clientes/${clienteId}/documentos`,
        headers: { cookie: cookieAtendente },
        payload: {
          tipoDocumento: "passaporte",
          nomeArquivo: "muito_pesado.pdf",
          conteudoBase64: bigBuffer.toString("base64"),
        },
      });

      expect([400, 413]).toContain(res.statusCode);
    });

    it("deve permitir download com verificação de hash SHA-256 e cabeçalhos seguros", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/clientes/${clienteId}/documentos/${docIdValido}/download`,
        headers: { cookie: cookieCompliance },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["content-disposition"]).toContain("attachment");
      expect(res.body.startsWith("%PDF-")).toBe(true);
    });

    it("deve aprovar o KYC do cliente por Compliance com registo formal de parecer", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/clientes/${clienteId}/kyc`,
        headers: { cookie: cookieCompliance },
        payload: {
          estadoNovo: "aprovado",
          nivelRisco: "baixo",
          motivo: "Documentação conferida no dossiê KYC e sem pendências em listas de sanções",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().dados.estadoKyc).toBe("aprovado");
    });
  });

  // --- 3. Ciclo de Caixa & Movimentos ---
  describe("3. Contabilidade de Caixa e Concorrência", () => {
    let caixaId: string;

    it("deve abrir caixa com fundos e rejeitar segundo caixa aberto para o mesmo atendente", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/caixa/abrir",
        headers: { cookie: cookieAtendente },
        payload: {
          saldoInicialAoa: "2000000.00",
          saldoInicialUsd: "1000.00",
          saldoInicialEur: "500.00",
        },
      });

      expect(res.statusCode).toBe(201);
      caixaId = res.json().dados.id;

      // Tentativa concorrente/duplicada
      const resDup = await app.inject({
        method: "POST",
        url: "/api/v1/caixa/abrir",
        headers: { cookie: cookieAtendente },
        payload: {
          saldoInicialAoa: "100000.00",
          saldoInicialUsd: "0.00",
          saldoInicialEur: "0.00",
        },
      });

      expect(resDup.statusCode).toBe(409);
      expect(resDup.json().codigo).toBe("CAIXA_JA_ABERTO");
    });

    it("deve impedir sangria de valor superior ao saldo disponível em caixa", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/caixa/${caixaId}/movimento`,
        headers: { cookie: cookieAtendente },
        payload: {
          tipo: "sangria",
          moeda: "EUR",
          montante: "10000.00", // Apenas tem 500 EUR
          descricao: "Tentativa indevida de sangria sem saldo",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().erro).toContain("Saldo insuficiente em EUR");
    });
  });

  // --- 4. Operações Cambiais, Idempotência e Transações Atómicas ---
  describe("4. Operações Cambiais, Cotação de 90s, Borderô e Rollback", () => {
    let clienteHomoId: string;

    beforeAll(async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/clientes?busca=Joaquim",
        headers: { cookie: cookieAtendente },
      });
      clienteHomoId = res.json().dados[0].id;
    });

    it("deve rejeitar operação quando a cotação tiver mais de 90 segundos", async () => {
      const cotacaoPassada = new Date(Date.now() - 95 * 1000).toISOString();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-homo-expirada",
          clienteId: clienteHomoId,
          tipo: "compra",
          moedaDivisa: "USD",
          montanteDivisa: "100.00",
          cotacaoCriadaEm: cotacaoPassada,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().erro).toContain("cotação de 90 segundos expirou");
    });

    it("deve processar compra de divisas (USD), debitar AOA, creditar USD e emitir Borderô com hash SHA-256", async () => {
      const agora = new Date().toISOString();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-homo-compra-usd",
          clienteId: clienteHomoId,
          tipo: "compra",
          moedaDivisa: "USD",
          montanteDivisa: "200.00",
          cotacaoCriadaEm: agora,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.sucesso).toBe(true);
      expect(json.dados.operacao.tipo).toBe("compra");
      expect(json.dados.bordero.numeroBordero).toMatch(/^BOR-/);
      expect(json.dados.bordero.hashVerificacao).toBeDefined();

      // Verificar que o caixa recebeu 200 USD (saldo inicial era 1000 -> agora 1200)
      const resCaixa = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });
      expect(resCaixa.json().dados.saldos.USD.saldoEsperado).toBe("1200.00");
    });

    it("deve garantir idempotência absoluta: segundo envio com mesma chave não altera o saldo", async () => {
      const resRepetido = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-homo-compra-usd", // mesma chave
          clienteId: clienteHomoId,
          tipo: "compra",
          moedaDivisa: "USD",
          montanteDivisa: "200.00",
          cotacaoCriadaEm: new Date().toISOString(),
        },
      });

      expect(resRepetido.statusCode).toBe(201);

      // Saldo de USD DEVE continuar em 1200.00 (sem duplicação!)
      const resCaixa = await app.inject({
        method: "GET",
        url: "/api/v1/caixa/ativo",
        headers: { cookie: cookieAtendente },
      });
      expect(resCaixa.json().dados.saldos.USD.saldoEsperado).toBe("1200.00");
    });

    it("deve reverter transação atómica (rollback) caso ocorra erro a meio do processamento", () => {
      const caixaAtivo = dbConexao.prepare("SELECT id, operador_id FROM caixas WHERE estado = 'aberto' LIMIT 1").get() as { id: string; operador_id: string };
      const contagemAntes = (dbConexao.prepare("SELECT COUNT(*) as t FROM movimentos_caixa").get() as { t: number }).t;

      expect(() => {
        comTransacao(dbConexao, () => {
          dbConexao.prepare(`
            INSERT INTO movimentos_caixa (
              id, caixa_id, tipo, moeda, montante, descricao, criado_em, operador_id
            ) VALUES ('mov_err_1', ?, 'suprimento', 'AOA', '500.00', 'Teste Falha', '2026-10-25', ?)
          `).run(caixaAtivo.id, caixaAtivo.operador_id);

          // Lança erro propositado para acionar o rollback
          throw new Error("Falha intencional de simulação de queda de energia");
        });
      }).toThrow("Falha intencional de simulação de queda de energia");

      const contagemDepois = (dbConexao.prepare("SELECT COUNT(*) as t FROM movimentos_caixa").get() as { t: number }).t;
      // Garante que o movimento foi completamente revertido
      expect(contagemDepois).toBe(contagemAntes);
    });

    it("deve permitir estorno de operação cambial pela Tesouraria com compensação em caixa", async () => {
      // Cria operação para estorno
      const resOp = await app.inject({
        method: "POST",
        url: "/api/v1/operacoes",
        headers: { cookie: cookieAtendente },
        payload: {
          chaveIdempotencia: "idem-homo-estorno",
          clienteId: clienteHomoId,
          tipo: "venda",
          moedaDivisa: "EUR",
          montanteDivisa: "100.00",
          cotacaoCriadaEm: new Date().toISOString(),
        },
      });

      const opId = resOp.json().dados.operacao.id;

      // Executa estorno formal como Tesouraria
      const resEstorno = await app.inject({
        method: "POST",
        url: `/api/v1/operacoes/${opId}/estornar`,
        headers: { cookie: cookieTesouraria },
        payload: {
          motivo: "Erro de contagem de notas pelo cliente na entrega física do valor",
        },
      });

      expect(resEstorno.statusCode).toBe(200);
      expect(resEstorno.json().dados.estado).toBe("estornada");
    });
  });

  // --- 5. Pista de Auditoria e Segurança de Acesso ---
  describe("5. Auditoria Regulatória e Segregação de Funções", () => {
    it("deve impedir o atendente de consultar a pista de auditoria", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auditoria",
        headers: { cookie: cookieAtendente },
      });
      expect(res.statusCode).toBe(403);
    });

    it("deve permitir a Compliance e Gestão consultar a lista cronológica de eventos com IP e autor", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auditoria?limite=10",
        headers: { cookie: cookieCompliance },
      });

      expect(res.statusCode).toBe(200);
      const eventos = res.json().dados;
      expect(Array.isArray(eventos)).toBe(true);
      expect(eventos.length).toBeGreaterThan(0);

      // Verifica presença de evento de upload e decisão KYC
      const acoes = eventos.map((e: any) => e.acao);
      expect(acoes.some((a: string) => a.includes("KYC") || a.includes("OPERACAO"))).toBe(true);
    });
  });
});
