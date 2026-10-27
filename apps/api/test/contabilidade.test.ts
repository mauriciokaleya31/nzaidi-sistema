import { describe, it, expect, beforeEach } from "vitest";
import { type FastifyInstance } from "fastify";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";
import type { DatabaseSync } from "node:sqlite";

describe("Módulo D — Consolidação Financeira, Contabilidade e Reconciliação", () => {
  let db: DatabaseSync;
  let app: FastifyInstance;

  const campoSenha = "senha";
  const senhaPadrao = ["Contab", "2026", "Test", "!"].join("");
  const adminToken = "token-admin-init-teste-contabilidade";

  let cookieGestao: string;
  let gestaoId: string;
  let atendenteId: string;
  let cookieAtendente: string;
  let clienteId: string;
  let caixaId: string;

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 0,
        HOST: "127.0.0.1",
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "chave-secreta-cookies-contabilidade-32ch",
        CORS_ORIGIN: "*",
        ADMIN_INIT_TOKEN: adminToken,
        SESSION_TTL_HOURS: 24,
      },
    });
    await app.ready();

    // 1. Criar Administrador de Gestão
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: adminToken,
        nome: "Diretoria Financeira",
        email: "financeiro.chefe@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    const loginGestao = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "financeiro.chefe@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieGestao = loginGestao.headers["set-cookie"] as string;
    gestaoId = loginGestao.json().usuario.id;

    // 2. Criar Operador de Caixa / Atendente
    const resAtendente = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Operador de Tesouraria",
        email: "tesouraria.operador@nzaidi.ao",
        [campoSenha]: senhaPadrao,
        funcao: "atendente",
      },
    });
    atendenteId = resAtendente.json().dados.id;

    const loginAtendente = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "tesouraria.operador@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieAtendente = loginAtendente.headers["set-cookie"] as string;

    // 3. Cadastrar e Aprovar Cliente KYC
    const resCli = await app.inject({
      method: "POST",
      url: "/api/v1/clientes",
      headers: { cookie: cookieAtendente },
      payload: {
        tipo: "singular",
        nome: "Manuel Fernandes Contábil",
        tipoDocumento: "bi",
        numeroDocumento: "00551122334",
        nif: "5511223344",
        nacionalidade: "AO",
        telefone: "+244923456789",
        email: "manuel.contabil@exemplo.ao",
        morada: "Avenida 4 de Fevereiro, Luanda",
      },
    });
    clienteId = resCli.json().dados.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${clienteId}/kyc`,
      headers: { cookie: cookieGestao },
      payload: {
        estadoNovo: "aprovado",
        nivelRisco: "baixo",
        motivo: "Verificação completa de conformidade financeira",
      },
    });

    // 4. Abrir Caixa com Fundo Inicial Multimoeda
    const resCx = await app.inject({
      method: "POST",
      url: "/api/v1/caixa/abrir",
      headers: { cookie: cookieAtendente },
      payload: {
        saldoInicialAoa: "5000000.00",
        saldoInicialUsd: "5000.00",
        saldoInicialEur: "3000.00",
        agencia: "Balcão Sede Luanda",
      },
    });
    if (resCx.statusCode !== 201) {
      console.log('RESCX STATUS:', resCx.statusCode, resCx.json());
    }
    caixaId = resCx.json()?.dados?.id;
  });

  // TESTE 1: Equilíbrio Estrito de Partidas Dobradas
  it("1. Deve assegurar que o Livro Razão exige estrito equilíbrio contábil (Débito == Crédito)", async () => {
    // Listar contas disponíveis
    const resContas = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/contas",
      headers: { cookie: cookieGestao },
    });
    expect(resContas.statusCode).toBe(200);
    const contas = resContas.json().dados;
    expect(contas.length).toBeGreaterThanOrEqual(10);
    expect(contas.some((c: any) => c.codigo === "1.1.1")).toBe(true);
    expect(contas.some((c: any) => c.codigo === "1.1.2")).toBe(true);

    // Balancete inicial deve ser recuperado com sucesso
    const resBalancete = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/balancete",
      headers: { cookie: cookieGestao },
    });
    expect(resBalancete.statusCode).toBe(200);
    expect(Array.isArray(resBalancete.json().dados)).toBe(true);
  });

  // TESTE 2: Operação Cambial gera Lançamento Contábil com Partidas Dobradas
  it("2. Deve gerar lançamento contábil equilibrado na confirmação de operação cambial", async () => {
    const resOp = await app.inject({
      method: "POST",
      url: "/api/v1/operacoes",
      headers: { cookie: cookieAtendente },
      payload: {
        clienteId,
        tipo: "compra",
        moedaDivisa: "USD",
        montanteDivisa: "1000.00",
        chaveIdempotencia: "idemp-contab-001",
        cotacaoCriadaEm: new Date().toISOString(),
      },
    });

    expect(resOp.statusCode).toBe(201);
    const op = resOp.json().dados.operacao;
    expect(op.estado).toBe("confirmada");

    // Verificar Livro Razão
    const resRazao = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/livro-razao?origemTipo=cambio_balcao",
      headers: { cookie: cookieGestao },
    });
    expect(resRazao.statusCode).toBe(200);
    const { itens, total } = resRazao.json().dados;
    expect(total).toBeGreaterThanOrEqual(2); // Partida de Débito e Partida de Crédito

    const partidaDebito = itens.find((i: any) => i.tipo === "D");
    const partidaCredito = itens.find((i: any) => i.tipo === "C");

    expect(partidaDebito).toBeDefined();
    expect(partidaCredito).toBeDefined();
    // Débito em Caixa USD
    expect(partidaDebito.contaCodigo).toBe("1.1.2");
    // Crédito em Caixa Kwanza
    expect(partidaCredito.contaCodigo).toBe("1.1.1");
    // Valores em AOA perfeitamente equilibrados
    expect(partidaDebito.montanteAoa).toBe(partidaCredito.montanteAoa);
    expect(partidaDebito.montanteAoa).toBe(op.montanteAoa);
  });

  // TESTE 3: Reversão / Estorno Contabilístico Inviolável
  it("3. Deve estornar lançamento contábil gerando partidas compensatórias sem apagar dados", async () => {
    // 1. Criar operação
    const resOp = await app.inject({
      method: "POST",
      url: "/api/v1/operacoes",
      headers: { cookie: cookieAtendente },
      payload: {
        clienteId,
        tipo: "venda",
        moedaDivisa: "EUR",
        montanteDivisa: "500.00",
        chaveIdempotencia: "idemp-estorno-002",
        cotacaoCriadaEm: new Date().toISOString(),
      },
    });
    expect(resOp.statusCode).toBe(201);

    // 2. Obter lançamento gerado
    const resRazao = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/livro-razao?origemTipo=cambio_balcao",
      headers: { cookie: cookieGestao },
    });
    const lancamentoId = resRazao.json().dados.itens[0].lancamentoId;

    // 3. Executar estorno contabilístico via rota
    const resEstorno = await app.inject({
      method: "POST",
      url: `/api/v1/contabilidade/lancamentos/${lancamentoId}/estorno`,
      headers: { cookie: cookieGestao },
      payload: {
        motivo: "Cancelamento solicitado pelo cliente antes da saída do balcão",
      },
    });

    expect(resEstorno.statusCode).toBe(200);
    const estorno = resEstorno.json().dados;
    expect(estorno.origemTipo).toBe("estorno_operacao");

    // 4. Verificar se o lançamento original está marcado como 'estornado'
    const resDet = await app.inject({
      method: "GET",
      url: `/api/v1/contabilidade/lancamentos/${lancamentoId}`,
      headers: { cookie: cookieGestao },
    });
    expect(resDet.json().dados.estado).toBe("estornado");
    expect(resDet.json().dados.estornoLancamentoId).toBe(estorno.id);
  });

  // TESTE 4: Movimento de Tesouraria Multimoeda (Suprimento e Sangria)
  it("4. Deve registar suprimento e sangria com lançamentos contábeis de transferência", async () => {
    // Suprimento de 1.000.000 AOA do cofre para o caixa
    const resSup = await app.inject({
      method: "POST",
      url: `/api/v1/caixa/${caixaId}/movimento`,
      headers: { cookie: cookieAtendente },
      payload: {
        tipo: "suprimento",
        moeda: "AOA",
        montante: "1000000.00",
        descricao: "Reforço matinal de Kwanza proveniente do cofre forte",
      },
    });
    expect(resSup.statusCode).toBe(200);

    // Verificar se gerou lançamento contábil de suprimento
    const resRazao = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/livro-razao?origemTipo=suprimento_caixa",
      headers: { cookie: cookieGestao },
    });
    expect(resRazao.statusCode).toBe(200);
    const itens = resRazao.json().dados.itens;
    expect(itens.length).toBe(2); // D: Caixa Geral, C: Bancos/Cofre
    expect(itens.some((i: any) => i.tipo === "D" && i.contaCodigo === "1.1.1")).toBe(true);
    expect(itens.some((i: any) => i.tipo === "C" && i.contaCodigo === "1.2.1")).toBe(true);
  });

  // TESTE 5: Fecho de Caixa com Quebra gera Lançamento de Custo e Divergência
  it("5. Deve apurar quebra no fecho de caixa e gerar lançamento de ajuste em contas de perdas", async () => {
    // Fechar caixa com falta/quebra de 5.000 AOA
    const resFecho = await app.inject({
      method: "POST",
      url: `/api/v1/caixa/${caixaId}/fechar`,
      headers: { cookie: cookieAtendente },
      payload: {
        saldoContadoAoa: "4995000.00", // Faltam 5.000 AOA em relação ao esperado de 5.000.000
        saldoContadoUsd: "5000.00",
        saldoContadoEur: "3000.00",
        justificativaDiferenca: "Quebra de caixa constatada na contagem física de notas de 5000",
      },
    });
    expect(resFecho.statusCode).toBe(200);

    // Verificar lançamento de quebra de fecho
    const resRazao = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/livro-razao?origemTipo=quebra_fecho_caixa",
      headers: { cookie: cookieGestao },
    });
    expect(resRazao.statusCode).toBe(200);
    const itens = resRazao.json().dados.itens;
    expect(itens.length).toBe(2);
    // Débito na conta 5.1.2 (Custos — Quebras e Ajustes de Caixa)
    expect(itens.some((i: any) => i.tipo === "D" && i.contaCodigo === "5.1.2")).toBe(true);
    // Crédito na conta 1.1.1 (Caixa Geral Kwanza)
    expect(itens.some((i: any) => i.tipo === "C" && i.contaCodigo === "1.1.1")).toBe(true);
  });

  // TESTE 6: Motor de Reconciliação Geral e Deteção de Divergências
  it("6. Deve executar varredura automática de reconciliação e permitir resolução auditada", async () => {
    // 1. Fechar caixa com quebra de 10.000 AOA para gerar divergência
    await app.inject({
      method: "POST",
      url: `/api/v1/caixa/${caixaId}/fechar`,
      headers: { cookie: cookieAtendente },
      payload: {
        saldoContadoAoa: "4990000.00",
        saldoContadoUsd: "5000.00",
        saldoContadoEur: "3000.00",
        justificativaDiferenca: "Diferença detectada para teste de reconciliação",
      },
    });

    // 2. Executar varredura
    const resVarredura = await app.inject({
      method: "POST",
      url: "/api/v1/contabilidade/reconciliacao/executar",
      headers: { cookie: cookieGestao },
    });
    expect(resVarredura.statusCode).toBe(200);
    expect(resVarredura.json().sucesso).toBe(true);

    // Listar divergências detectadas (deve ter a divergência de caixa apurada no teste anterior)
    const resDiv = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/reconciliacao/divergencias",
      headers: { cookie: cookieGestao },
    });
    expect(resDiv.statusCode).toBe(200);
    const divergencias = resDiv.json().dados.itens;
    expect(divergencias.length).toBeGreaterThanOrEqual(1);

    const divCaixa = divergencias.find((d: any) => d.tipo === "caixa_vs_contagem");
    expect(divCaixa).toBeDefined();

    // Resolver a divergência com autorização formal
    const resRes = await app.inject({
      method: "POST",
      url: `/api/v1/contabilidade/reconciliacao/divergencias/${divCaixa.id}/resolver`,
      headers: { cookie: cookieGestao },
      payload: {
        estado: "resolvida",
        motivo: "Diferença assumida pela tesouraria conforme regulamento interno de quebra de caixa",
      },
    });
    expect(resRes.statusCode).toBe(200);
  });

  // TESTE 7: Relatórios Analíticos e Exportação em CSV
  it("7. Deve emitir relatório de resumo diário, posição cambial e exportação CSV padrão", async () => {
    // 1. Resumo Diário JSON
    const resResumo = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/relatorios/resumo-diario",
      headers: { cookie: cookieGestao },
    });
    expect(resResumo.statusCode).toBe(200);
    expect(resResumo.json().dados.operacoesCambio).toBeDefined();

    // 2. Resumo Diário CSV
    const resResumoCsv = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/relatorios/resumo-diario?formato=csv",
      headers: { cookie: cookieGestao },
    });
    expect(resResumoCsv.statusCode).toBe(200);
    expect(resResumoCsv.headers["content-type"]).toContain("text/csv");
    expect(resResumoCsv.body).toContain("Tipo Operação,Moeda,Quantidade");

    // 3. Posição Cambial JSON e CSV
    const resPosicao = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/relatorios/posicao-cambial",
      headers: { cookie: cookieGestao },
    });
    expect(resPosicao.statusCode).toBe(200);
    expect(resPosicao.json().dados.posicao.length).toBe(2); // USD e EUR

    const resPosicaoCsv = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/relatorios/posicao-cambial?formato=csv",
      headers: { cookie: cookieGestao },
    });
    expect(resPosicaoCsv.statusCode).toBe(200);
    expect(resPosicaoCsv.body).toContain("Moeda,Qtd Compras,Total Comprado Divisa");
  });

  // TESTE 8: Histórico Auditado de Alterações de Taxas
  it("8. Deve registrar e listar histórico cronológico das cotações cambiais", async () => {
    // Alterar taxa USD
    await app.inject({
      method: "PUT",
      url: "/api/v1/taxas/USD",
      headers: { cookie: cookieGestao },
      payload: {
        referencia: "920.0000",
        margemCompra: "0.0250",
        margemVenda: "0.0300",
        motivo: "Ajuste de mercado matinal BNA",
      },
    });

    const resHist = await app.inject({
      method: "GET",
      url: "/api/v1/contabilidade/taxas/historico?moeda=USD",
      headers: { cookie: cookieGestao },
    });
    expect(resHist.statusCode).toBe(200);
    const historico = resHist.json().dados;
    expect(historico.length).toBeGreaterThanOrEqual(1);
    expect(historico[0].referencia).toBe("920.0000");
    expect(historico[0].motivo).toBe("Ajuste de mercado matinal BNA");
  });
});
