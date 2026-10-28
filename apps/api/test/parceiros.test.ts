import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { type FastifyInstance } from "fastify";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";
import type { DatabaseSync } from "node:sqlite";

describe("Módulo B — Portal dos Parceiros e Integrações Comerciais", () => {
  let db: DatabaseSync;
  let app: FastifyInstance;

  const campoSenha = "senha";
  const senhaPadrao = ["Pass", "2026", "Parc", "!"].join("");
  const adminToken = "token-admin-init-teste-parceiros";

  let cookieAdmin: string;
  let parceiroAId: string;
  let parceiroBId: string;

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 0,
        HOST: "127.0.0.1",
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "chave-secreta-cookies-parceiros-32ch-min",
        CORS_ORIGIN: "*",
        ADMIN_INIT_TOKEN: adminToken,
        SESSION_TTL_HOURS: 24,
      },
    });
    await app.ready();

    // 1. Inicializar Admin Geral (Gestão)
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: adminToken,
        nome: "Diretoria Geral",
        email: "diretoria@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    const loginAdminRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "diretoria@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieAdmin = loginAdminRes.headers["set-cookie"] as string;

    // 2. Registar Parceiro A (MaxPay)
    const resParcA = await app.inject({
      method: "POST",
      url: "/api/v1/admin/parceiros",
      headers: { cookie: cookieAdmin },
      payload: {
        codigo: "PARC-MAXPAY",
        nome: "MaxPay Global Payments",
        tipo: "remessas",
        canaisSuportados: ["maxpay", "remessa_parceiro"],
        comissaoPercentual: "0.75",
        limiteDiarioAoa: "100000000.00",
        emailAdmin: "operacoes@maxpay.com",
        nomeAdmin: "Gestor MaxPay",
        senhaAdmin: senhaPadrao,
      },
    });
    expect(resParcA.statusCode).toBe(201);
    parceiroAId = resParcA.json().dados.parceiro.id;

    // 3. Registar Parceiro B (Realtransfers)
    const resParcB = await app.inject({
      method: "POST",
      url: "/api/v1/admin/parceiros",
      headers: { cookie: cookieAdmin },
      payload: {
        codigo: "PARC-REALTRANSFERS",
        nome: "Real Transfers Remittances",
        tipo: "remessas",
        canaisSuportados: ["realtransfers"],
        comissaoPercentual: "0.50",
        limiteDiarioAoa: "50000000.00",
        emailAdmin: "liquidacoes@realtransfers.com",
        nomeAdmin: "Gestor Realtransfers",
        senhaAdmin: senhaPadrao,
      },
    });
    expect(resParcB.statusCode).toBe(201);
    parceiroBId = resParcB.json().dados.parceiro.id;
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it("1. Deve autenticar parceiro comercial com sucesso e emitir sessão segura", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: {
        email: "operacoes@maxpay.com",
        [campoSenha]: senhaPadrao,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sucesso).toBe(true);
    expect(body.dados.parceiro.codigo).toBe("PARC-MAXPAY");
    expect(body.dados.usuario.email).toBe("operacoes@maxpay.com");
    expect(body.dados.token).toBeDefined();

    // Deve vir com cookie HttpOnly nzaidi_parceiro_sessao
    const cookies = res.cookies;
    expect(cookies.some((c) => c.name === "nzaidi_parceiro_sessao")).toBe(true);
  });

  it("2. Deve rejeitar login com palavra-passe errada ou utilizador inexistente", async () => {
    const resErrado = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: {
        email: "operacoes@maxpay.com",
        [campoSenha]: "SenhaErrada123!",
      },
    });
    expect(resErrado.statusCode).toBe(401);

    const resInexistente = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: {
        email: "fantasma@inexistente.com",
        [campoSenha]: senhaPadrao,
      },
    });
    expect(resInexistente.statusCode).toBe(401);
  });

  it("3. Deve bloquear acesso quando o parceiro é suspenso pela administração", async () => {
    // Suspender parceiro A
    const resSusp = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/parceiros/${parceiroAId}/status`,
      headers: { cookie: cookieAdmin },
      payload: { estado: "suspenso" },
    });
    expect(resSusp.statusCode).toBe(200);

    // Tentar login
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: {
        email: "operacoes@maxpay.com",
        [campoSenha]: senhaPadrao,
      },
    });
    expect(resLogin.statusCode).toBe(401);
    expect(resLogin.json().erro).toContain("suspensa");
  });

  it("4. DEVE GARANTIR ISOLAMENTO MULTITENANT ESTRITO ENTRE PARCEIROS (Parceiro A não vê nem toca no Parceiro B)", async () => {
    // 1. Iniciar sessão do Parceiro A e Parceiro B
    const loginA = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: { email: "operacoes@maxpay.com", [campoSenha]: senhaPadrao },
    });
    const tokenA = loginA.json().dados.token;

    const loginB = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: { email: "liquidacoes@realtransfers.com", [campoSenha]: senhaPadrao },
    });
    const tokenB = loginB.json().dados.token;

    // 2. Criar cliente e remessa no sistema
    const regCli = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Cliente Remetente Teste",
        tipoPessoa: "singular",
        nif: "NIF-CLI-REM-99",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-REM-99",
        dataNascimento: "1990-01-01",
        nacionalidade: "Angolana",
        endereco: "Luanda, Angola",
        telefone: "+244923000999",
        email: "cliente.remetente@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    const clienteToken = regCli.json().dados.token;

    // Aprovar KYC do cliente pelo admin para permitir remessa
    const clienteId = regCli.json().dados.cliente.id;
    await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${clienteId}/kyc`,
      headers: { cookie: cookieAdmin },
      payload: { decisao: "aprovado", nivelRisco: "baixo" },
    });

    const remessaRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${clienteToken}` },
      payload: {
        beneficiarioNome: "Ana Silva Europa",
        beneficiarioPais: "Portugal",
        beneficiarioIban: "PT50000100020003000400051",
        beneficiarioBanco: "Millennium BCP",
        moedaDestino: "EUR",
        montanteDivisa: "1000.00",
        finalidade: "Apoio Familiar",
      },
    });
    const remessaId = remessaRes.json().dados.id;

    // 3. Admin atribui a remessa ao Parceiro B (Realtransfers)
    const atribuirRes = await app.inject({
      method: "POST",
      url: `/api/v1/admin/parceiros/${parceiroBId}/atribuir-remessa`,
      headers: { cookie: cookieAdmin },
      payload: { remessaId, canal: "realtransfers" },
    });
    expect(atribuirRes.statusCode).toBe(201);
    const opParceiroBId = atribuirRes.json().dados.id;

    // 4. PARCEIRO A TENTA CONSULTAR OPERAÇÃO DO PARCEIRO B -> 404 NOT FOUND
    const resAcessoIndevido = await app.inject({
      method: "GET",
      url: `/api/v1/parceiro/operacoes/${opParceiroBId}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(resAcessoIndevido.statusCode).toBe(404);

    // 5. PARCEIRO A TENTA LIQUIDAR OPERAÇÃO DO PARCEIRO B -> 404 NOT FOUND
    const resLiquidarIndevido = await app.inject({
      method: "POST",
      url: `/api/v1/parceiro/operacoes/${opParceiroBId}/liquidar`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        referenciaExterna: "REF-HACK-001",
        chaveIdempotencia: "KEY-HACK-001",
      },
    });
    expect(resLiquidarIndevido.statusCode).toBe(404);

    // 6. Parceiro B consulta normalmente -> 200 OK
    const resAcessoLegitimo = await app.inject({
      method: "GET",
      url: `/api/v1/parceiro/operacoes/${opParceiroBId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(resAcessoLegitimo.statusCode).toBe(200);
    expect(resAcessoLegitimo.json().dados.beneficiarioNome).toBe("Ana Silva Europa");
  });

  it("5. Deve executar ciclo completo de remessa pelo parceiro: aceitar, liquidar com idempotência e auditoria", async () => {
    // 1. Iniciar sessão Parceiro A
    const loginA = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: { email: "operacoes@maxpay.com", [campoSenha]: senhaPadrao },
    });
    const tokenA = loginA.json().dados.token;

    // 2. Criar cliente e remessa
    const regCli = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Cliente Remetente Ciclo",
        tipoPessoa: "singular",
        nif: "NIF-CLI-CICLO-1",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-CICLO-1",
        dataNascimento: "1985-05-15",
        nacionalidade: "Angolana",
        endereco: "Talatona",
        telefone: "+244923111222",
        email: "ciclo.remetente@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    const clienteToken = regCli.json().dados.token;
    const clienteId = regCli.json().dados.cliente.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${clienteId}/kyc`,
      headers: { cookie: cookieAdmin },
      payload: { decisao: "aprovado", nivelRisco: "baixo" },
    });

    const remessaRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${clienteToken}` },
      payload: {
        beneficiarioNome: "João Carlos Lisboa",
        beneficiarioPais: "Portugal",
        beneficiarioIban: "PT50000100020003000400055",
        beneficiarioBanco: "Santander Totta",
        moedaDestino: "EUR",
        montanteDivisa: "2500.00",
        finalidade: "Pagamento de Propinas",
      },
    });
    const remessaId = remessaRes.json().dados.id;

    // 3. Atribuir ao Parceiro A
    const atribRes = await app.inject({
      method: "POST",
      url: `/api/v1/admin/parceiros/${parceiroAId}/atribuir-remessa`,
      headers: { cookie: cookieAdmin },
      payload: { remessaId, canal: "maxpay" },
    });
    const opId = atribRes.json().dados.id;

    // 4. Parceiro A aceita a remessa -> muda para em_processamento
    const aceitarRes = await app.inject({
      method: "POST",
      url: `/api/v1/parceiro/operacoes/${opId}/confirmar-recepcao`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: { notas: "Instrução enviada para compensação interbancária SEPA" },
    });
    expect(aceitarRes.statusCode).toBe(200);
    expect(aceitarRes.json().dados.estado).toBe("em_processamento");

    // 5. Parceiro A liquida a instrução com comprovativo e chave de idempotência
    const chaveIdempotencia = `CHV-LIQ-TEST-${Date.now()}`;
    const liquidarRes = await app.inject({
      method: "POST",
      url: `/api/v1/parceiro/operacoes/${opId}/liquidar`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        referenciaExterna: "MAX-SEPA-998811",
        comprovativoArquivo: "comprovativo_sepa_998811.pdf",
        comprovativoHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        notas: "Transferência creditada na conta de destino",
        chaveIdempotencia,
      },
    });
    expect(liquidarRes.statusCode).toBe(200);
    expect(liquidarRes.json().dados.estado).toBe("liquidada");
    expect(liquidarRes.json().dados.referenciaExterna).toBe("MAX-SEPA-998811");
    expect(liquidarRes.json().dados.liquidadoEm).toBeDefined();

    // 6. Teste de Idempotência: reenviar a mesma chave não gera erro e devolve o registo existente
    const replayRes = await app.inject({
      method: "POST",
      url: `/api/v1/parceiro/operacoes/${opId}/liquidar`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        referenciaExterna: "MAX-SEPA-998811",
        chaveIdempotencia,
      },
    });
    expect(replayRes.statusCode).toBe(200);
    expect(replayRes.json().dados.id).toBe(opId);
    expect(replayRes.json().dados.estado).toBe("liquidada");
  });

  it("6. Deve processar devolução de remessa com motivo e atualizar pedidos_remessas", async () => {
    const loginA = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: { email: "operacoes@maxpay.com", [campoSenha]: senhaPadrao },
    });
    const tokenA = loginA.json().dados.token;

    // Criar cliente e remessa
    const regCli = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Cliente Devolucao",
        tipoPessoa: "singular",
        nif: "NIF-CLI-DEV-1",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-DEV-1",
        dataNascimento: "1991-07-20",
        nacionalidade: "Angolana",
        endereco: "Luanda",
        telefone: "+244923333444",
        email: "dev.remetente@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    const clienteToken = regCli.json().dados.token;
    const clienteId = regCli.json().dados.cliente.id;

    await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${clienteId}/kyc`,
      headers: { cookie: cookieAdmin },
      payload: { decisao: "aprovado", nivelRisco: "baixo" },
    });

    const remessaRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${clienteToken}` },
      payload: {
        beneficiarioNome: "Carlos Manuel",
        beneficiarioPais: "Portugal",
        beneficiarioIban: "PT50000000000000000000000",
        beneficiarioBanco: "Banco Desconhecido",
        moedaDestino: "EUR",
        montanteDivisa: "500.00",
        finalidade: "Manutenção",
      },
    });
    const remessaId = remessaRes.json().dados.id;

    const atribRes = await app.inject({
      method: "POST",
      url: `/api/v1/admin/parceiros/${parceiroAId}/atribuir-remessa`,
      headers: { cookie: cookieAdmin },
      payload: { remessaId, canal: "maxpay" },
    });
    const opId = atribRes.json().dados.id;

    // Parceiro devolve por motivo de conta inválida
    const devRes = await app.inject({
      method: "POST",
      url: `/api/v1/parceiro/operacoes/${opId}/devolver`,
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        motivoDevolucao: "Conta bancária inexistente ou encerrada no banco de destino.",
      },
    });
    expect(devRes.statusCode).toBe(200);
    expect(devRes.json().dados.estado).toBe("devolvida");
    expect(devRes.json().dados.motivoDevolucao).toContain("encerrada");

    // Verificar se a remessa do cliente ficou rejeitada com o motivo
    const remessaConsulta = await app.inject({
      method: "GET",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${clienteToken}` },
    });
    const rem = remessaConsulta.json().dados[0];
    expect(rem.estado).toBe("rejeitada");
    expect(rem.motivoRejeicao).toContain("encerrada");
  });

  it("7. Deve processar lote de reconciliação e apontar divergências", async () => {
    const loginA = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/auth/login",
      payload: { email: "operacoes@maxpay.com", [campoSenha]: senhaPadrao },
    });
    const tokenA = loginA.json().dados.token;

    // Submeter lote de reconciliação
    const resRec = await app.inject({
      method: "POST",
      url: "/api/v1/parceiro/reconciliacao/processar",
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        dataReferencia: "2026-10-26",
        itens: [
          {
            referencia: "OPP-INEXISTENTE-999",
            referenciaExterna: "MAX-999",
            montante: "100.00",
            moeda: "EUR",
            estadoReportado: "liquidada",
          },
        ],
      },
    });

    expect(resRec.statusCode).toBe(200);
    const relatorio = resRec.json().dados;
    expect(relatorio.totalInstrucoes).toBe(1);
    expect(relatorio.totalDivergentes).toBe(1);
    expect(relatorio.detalhes[0].conciliado).toBe(false);
    expect(relatorio.detalhes[0].divergencia).toContain("não localizada");
  });

  it("8. Admin NZAIDI deve conseguir impersonar parceiro e aceder com perfil", async () => {
    const resImp = await app.inject({
      method: "POST",
      url: `/api/v1/admin/parceiros/${parceiroAId}/impersonar`,
      headers: { cookie: cookieAdmin },
    });

    expect(resImp.statusCode).toBe(200);
    const dados = resImp.json().dados;
    expect(dados.parceiro.codigo).toBe("PARC-MAXPAY");
    expect(dados.token).toBeDefined();
    expect(dados.redirectUrl).toBe("/parceiro/#/dashboard");

    // Com o token do parceiro gerado na impersonação, acede a /api/v1/parceiro/auth/me
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/parceiro/auth/me",
      headers: { Authorization: `Bearer ${dados.token}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().dados.parceiro.id).toBe(parceiroAId);
  });
});
