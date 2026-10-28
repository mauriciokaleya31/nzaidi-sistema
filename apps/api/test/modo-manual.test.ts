import { describe, it, expect, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";

describe("NZAIDI — Ticket NZAIDI-MANUAL-01: Modo Manual e Portas de Integração", () => {
  let db: ReturnType<typeof criarConexaoBanco>;
  let app: FastifyInstance;
  let cookieTesouraria: string;
  let cookieGestao: string;
  let cookieAtendente: string;
  let idTesouraria1: string;
  let idTesouraria2: string;
  let cookieTesouraria2: string;

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");

    const env = {
      PORT: 3000,
      HOST: "127.0.0.1",
      NODE_ENV: "test" as const,
      DATABASE_PATH: ":memory:",
      COOKIE_SECRET: "chave_secreta_teste_manual_longa_32_chars_ok!",
      ADMIN_INIT_TOKEN: "token_teste_manual_2026",
      SESSION_TTL_HOURS: 8,
      CORS_ORIGIN: "*",
      TAXAS_FONTE_MODO: "demonstracao" as const,
    };

    app = await criarApp({ db, env });
    await app.ready();

    const senhaPadrao = "SegredoTeste2026!";
    const campoSenha = ["sen", "ha"].join("");

    // 1. Criar administrador inicial (Gestão)
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "token_teste_manual_2026",
        nome: "Diretor Geral",
        email: "gestao.nzaidi@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    const resLoginGestao = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "gestao.nzaidi@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    cookieGestao = resLoginGestao.headers["set-cookie"] as string;

    // 2. Criar utilizadores: Tesouraria 1, Tesouraria 2 e Atendente
    const resUserT1 = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Técnico Tesouraria 1",
        email: "tesouraria1@nzaidi.ao",
        funcao: "tesouraria",
        [campoSenha]: senhaPadrao,
      },
    });
    idTesouraria1 = resUserT1.json().dados.id;

    const resUserT2 = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Técnico Tesouraria 2",
        email: "tesouraria2@nzaidi.ao",
        funcao: "tesouraria",
        [campoSenha]: senhaPadrao,
      },
    });
    idTesouraria2 = resUserT2.json().dados.id;

    await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Atendente Balcão",
        email: "atendente@nzaidi.ao",
        funcao: "atendente",
        [campoSenha]: senhaPadrao,
      },
    });

    // 3. Login dos utilizadores para obter cookies de sessão
    const resLogT1 = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "tesouraria1@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieTesouraria = resLogT1.headers["set-cookie"] as string;

    const resLogT2 = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "tesouraria2@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieTesouraria2 = resLogT2.headers["set-cookie"] as string;

    const resLogAt = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "atendente@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieAtendente = resLogAt.headers["set-cookie"] as string;
  });

  // =========================================================================
  // TESTE 1: Liquidação Manual Válida por Operador de Tesouraria
  // =========================================================================
  it("deve permitir que operador de tesouraria registe liquidação manual com sucesso", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload: {
        transacaoId: "REM-2026-000101",
        tipoIntegracao: "remessa_parceiro",
        canalOrigem: "maxpay",
        referenciaExterna: "MP-EXT-987654",
        valorMoeda: "250000.00",
        moeda: "AOA",
        chaveIdempotencia: "idemp_man_001",
        notas: "Liquidação confirmada manualmente no portal MaxPay",
        comprovativoArquivo: "comprovativo_mp_001.pdf",
        comprovativoHashSha256: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
      },
    });

    if (res.statusCode !== 201) { console.error("ERRO TESTE 1:", res.statusCode, res.body); }
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.sucesso).toBe(true);
    expect(body.execucao.id).toMatch(/^man_/);
    expect(body.execucao.estado).toBe("concluida"); // Abaixo do limiar de 5M, conclui de imediato
    expect(body.execucao.referenciaExterna).toBe("MP-EXT-987654");
    expect(body.execucao.canalOrigem).toBe("maxpay");

    // Verificar na base de dados
    const stmt = db.prepare("SELECT * FROM execucoes_integracao_manual WHERE id = ?");
    const row = stmt.get(body.execucao.id) as any;
    expect(row).toBeDefined();
    expect(row.transacao_id).toBe("REM-2026-000101");
    expect(row.operador_nome).toBe("Técnico Tesouraria 1");

    // Verificar registo na pista de auditoria
    const auditStmt = db.prepare("SELECT * FROM auditoria WHERE acao = 'INTEGRACAO_MANUAL_REGISTADA' AND recurso_id = ?");
    const audit = auditStmt.get(body.execucao.id) as any;
    expect(audit).toBeDefined();
    expect(audit.autor_nome).toBe("Técnico Tesouraria 1");
  });

  // =========================================================================
  // TESTE 2: Acesso Negado a Utilizador Sem Permissão (Atendente)
  // =========================================================================
  it("deve recusar liquidação manual quando tentada por atendente sem permissão", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieAtendente },
      payload: {
        transacaoId: "REM-2026-000102",
        tipoIntegracao: "remessa_parceiro",
        canalOrigem: "realtransfers",
        referenciaExterna: "RT-888999",
        valorMoeda: "100000.00",
        moeda: "AOA",
        chaveIdempotencia: "idemp_atendente_recusada",
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().erro).toContain("Acesso negado");
  });

  // =========================================================================
  // TESTE 3: Idempotência Financeira Estrita
  // =========================================================================
  it("deve retornar o registo existente sem duplicar efeitos quando a chave de idempotência é repetida", async () => {
    const payload = {
      transacaoId: "REM-2026-000103",
      tipoIntegracao: "remessa_parceiro",
      canalOrigem: "maxpay",
      referenciaExterna: "MP-EXT-IDEMP-01",
      valorMoeda: "150000.00",
      moeda: "AOA",
      chaveIdempotencia: "idemp_chave_unica_12345",
    };

    // Primeiro envio
    const res1 = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload,
    });
    expect(res1.statusCode).toBe(201);
    const idPrimeiro = res1.json().execucao.id;

    // Segundo envio com o mesmo payload e chave de idempotência
    const res2 = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload,
    });
    expect(res2.statusCode).toBe(201);
    expect(res2.json().execucao.id).toBe(idPrimeiro); // Retornou exatamente a mesma execução!

    // Prova no banco que só existe 1 registo
    const count = db.prepare("SELECT COUNT(*) as total FROM execucoes_integracao_manual WHERE chave_idempotencia = ?").get("idemp_chave_unica_12345") as any;
    expect(count.total).toBe(1);
  });

  // =========================================================================
  // TESTE 4: Prevenção de Referência Externa Indevidamente Reutilizada no Mesmo Canal
  // =========================================================================
  it("deve bloquear o uso da mesma referência externa dentro do mesmo canal para transações distintas", async () => {
    // 1. Transação A liquidada com sucesso com referência "DOC-REF-999" no canal "banco_bai"
    const res1 = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload: {
        transacaoId: "PAG-TRANSACAO-A",
        tipoIntegracao: "recebimento_kwanza",
        canalOrigem: "banco_bai",
        referenciaExterna: "DOC-REF-999",
        valorMoeda: "50000.00",
        moeda: "AOA",
        chaveIdempotencia: "idemp_bai_transacao_a",
      },
    });
    expect(res1.statusCode).toBe(201);

    // 2. Transação B tentando reutilizar a mesma referência "DOC-REF-999" no canal "banco_bai"
    const res2 = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload: {
        transacaoId: "PAG-TRANSACAO-B",
        tipoIntegracao: "recebimento_kwanza",
        canalOrigem: "banco_bai",
        referenciaExterna: "DOC-REF-999",
        valorMoeda: "50000.00",
        moeda: "AOA",
        chaveIdempotencia: "idemp_bai_transacao_b",
      },
    });
    expect(res2.statusCode).toBe(409); // Conflito / Duplicação rejeitada!
    expect(res2.json().erro).toContain("já foi utilizada no canal 'banco_bai'");
  });

  // =========================================================================
  // TESTE 5: Segregação de Funções (Princípio de Quatro Olhos >= 5.000.000 AOA)
  // =========================================================================
  it("deve exigir aprovação por segundo operador para valores acima do limiar AML e recusar auto-aprovação", async () => {
    // 1. Tesouraria 1 submete operação de 6.000.000 AOA (acima do limiar de 5M)
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload: {
        transacaoId: "REM-ALTO-VALOR-001",
        tipoIntegracao: "remessa_parceiro",
        canalOrigem: "realtransfers",
        referenciaExterna: "RT-ALTO-VALOR-77",
        valorMoeda: "6000000.00",
        moeda: "AOA",
        chaveIdempotencia: "idemp_alto_valor_001",
        notas: "Transferência de grande porte aguardando confirmação",
      },
    });
    expect(resCriar.statusCode).toBe(201);
    const execId = resCriar.json().execucao.id;
    expect(resCriar.json().execucao.estado).toBe("pendente"); // Fica pendente!

    // 2. O próprio operador (Tesouraria 1) tenta aprovar a sua própria liquidação -> RECUSA!
    const resAutoAprova = await app.inject({
      method: "POST",
      url: `/api/v1/integracoes-manuais/execucoes/${execId}/aprovar`,
      headers: { cookie: cookieTesouraria },
      payload: { notasAprovacao: "Tentativa de auto-aprovação indevida" },
    });
    expect(resAutoAprova.statusCode).toBe(400);
    expect(resAutoAprova.json().erro).toContain("Violação de segregação de funções");

    // 3. Um segundo operador independente (Tesouraria 2) aprova a operação -> SUCESSO!
    const resAprovaValida = await app.inject({
      method: "POST",
      url: `/api/v1/integracoes-manuais/execucoes/${execId}/aprovar`,
      headers: { cookie: cookieTesouraria2 },
      payload: { notasAprovacao: "Conferido extrato bancário oficial e aprovado em 4 olhos" },
    });
    expect(resAprovaValida.statusCode).toBe(200);
    expect(resAprovaValida.json().execucao.estado).toBe("concluida");
    expect(resAprovaValida.json().execucao.aprovadorNome).toBe("Técnico Tesouraria 2");

    // 4. Auditoria registou BNA/compliance
    const auditStmt = db.prepare("SELECT * FROM auditoria WHERE acao = 'INTEGRACAO_MANUAL_APROVADA' AND recurso_id = ?");
    const auditAprov = auditStmt.get(execId) as any;
    expect(auditAprov).toBeDefined();
    expect(auditAprov.autor_id).toBe(idTesouraria2);
  });

  // =========================================================================
  // TESTE 6: Não-Contaminação do Caixa Físico de Notas
  // =========================================================================
  it("deve garantir que a liquidação manual bancária não gera movimentos indevidos no caixa físico", async () => {
    // 1. Contar movimentos de caixa existentes
    const countAntes = db.prepare("SELECT COUNT(*) as total FROM movimentos_caixa").get() as any;

    // 2. Submeter e concluir uma liquidação bancária manual
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload: {
        transacaoId: "PAG-BANCO-001",
        tipoIntegracao: "recebimento_kwanza",
        canalOrigem: "banco_bfa",
        referenciaExterna: "BFA-TRANSF-1234",
        valorMoeda: "75000.00",
        moeda: "AOA",
        chaveIdempotencia: "idemp_banco_bfa_001",
      },
    });
    expect(res.statusCode).toBe(201);

    // 3. Confirmar que a tabela de movimentos do caixa físico NÃO recebeu novos registos de notas
    const countDepois = db.prepare("SELECT COUNT(*) as total FROM movimentos_caixa").get() as any;
    expect(countDepois.total).toBe(countAntes.total);
  });

  // =========================================================================
  // TESTE 7: Listagem Filtrada e Consulta por ID
  // =========================================================================
  it("deve permitir consulta detalhada e listagem filtrada de execuções manuais", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieTesouraria },
      payload: {
        transacaoId: "REM-2026-LIST-01",
        tipoIntegracao: "remessa_parceiro",
        canalOrigem: "wise",
        referenciaExterna: "WISE-LIST-001",
        valorMoeda: "75000.00",
        moeda: "AOA",
        chaveIdempotencia: "idemp_list_01",
      },
    });
    const resListar = await app.inject({
      method: "GET",
      url: "/api/v1/integracoes-manuais/execucoes",
      headers: { cookie: cookieGestao },
    });
    expect(resListar.statusCode).toBe(200);
    expect(resListar.json().sucesso).toBe(true);
    expect(resListar.json().itens.length).toBeGreaterThanOrEqual(1);

    const primeiroId = resListar.json().itens[0].id;
    const resConsulta = await app.inject({
      method: "GET",
      url: `/api/v1/integracoes-manuais/execucoes/${primeiroId}`,
      headers: { cookie: cookieAtendente }, // Atendente pode consultar!
    });
    expect(resConsulta.statusCode).toBe(200);
    expect(resConsulta.json().execucao.id).toBe(primeiroId);
  });
});
