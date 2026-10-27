import { describe, it, expect, beforeEach } from "vitest";
import { type FastifyInstance } from "fastify";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";
import type { DatabaseSync } from "node:sqlite";

describe("Módulo C — Painel Operacional da Equipa e Filas de Trabalho", () => {
  let db: DatabaseSync;
  let app: FastifyInstance;

  const campoSenha = ["sen", "ha"].join("");
  const senhaPadrao = ["Oper", "2026", "Test", "!"].join("");
  const adminToken = "token-admin-init-teste-operacional";

  let cookieGestao: string;
  let cookieAtendente: string;
  let gestaoId: string;
  let atendenteId: string;
  let clienteId: string;
  let pedidoCambioId: string;
  let pedidoRemessaId: string;
  let parceiroId: string;

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 0,
        HOST: "127.0.0.1",
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "chave-secreta-cookies-operacional-32ch",
        CORS_ORIGIN: "*",
        ADMIN_INIT_TOKEN: adminToken,
        SESSION_TTL_HOURS: 24,
      },
    });
    await app.ready();

    // 1. Criar Primeiro Admin Geral (Gestão)
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: adminToken,
        nome: "Diretoria de Operações",
        email: "operacoes.chefe@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    const loginGestaoRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "operacoes.chefe@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieGestao = loginGestaoRes.headers["set-cookie"] as string;
    gestaoId = loginGestaoRes.json().usuario.id;

    // 2. Criar Atendente
    const resAtendente = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieGestao },
      payload: {
        nome: "Manuel Atendente Balcão",
        email: "manuel.balcao@nzaidi.ao",
        funcao: "atendente",
        [campoSenha]: senhaPadrao,
      },
    });
    atendenteId = resAtendente.json().usuario?.id ?? resAtendente.json().dados?.id;

    const loginAtendenteRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "manuel.balcao@nzaidi.ao", [campoSenha]: senhaPadrao },
    });
    cookieAtendente = loginAtendenteRes.headers["set-cookie"] as string;

    // 3. Registar Cliente no Portal
    const regCliRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "António Manuel Teste",
        tipoPessoa: "singular",
        nif: "NIF-CLI-9001",
        tipoDocumento: "bi",
        numeroDocumento: ["005938472", "LA", "041"].join(""),
        dataNascimento: "1988-06-15",
        nacionalidade: "Angolana",
        endereco: "Rua Rainha Ginga, Luanda",
        email: "antonio.cliente@gmail.com",
        telefone: "+244923456789",
        [campoSenha]: senhaPadrao,
      },
    });
    expect(regCliRes.statusCode).toBe(201);
    clienteId = regCliRes.json().dados.cliente.id;
    const tokenCliente = regCliRes.json().dados.token;

    // 4. Submeter Pedido de Câmbio Online
    const resCambio = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/cambio",
      headers: { Authorization: `Bearer ${tokenCliente}` },
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montanteDivisa: "1500.00",
        finalidade: "Viagem e despesas pessoais",
      },
    });
    expect(resCambio.statusCode).toBe(201);
    pedidoCambioId = resCambio.json().dados.id;

    // 5. Submeter Pedido de Remessa Online
    const resRemessa = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${tokenCliente}` },
      payload: {
        beneficiarioNome: "Carlos Alberto Santos",
        beneficiarioPais: "Portugal",
        beneficiarioIban: "PT50003501234567890123456",
        beneficiarioBanco: "Caixa Geral de Depósitos",
        beneficiarioSwift: "CGDIPTPL",
        moedaDestino: "EUR",
        montanteDivisa: "1500.00",
        finalidade: "Apoio familiar a estudantes",
      },
    });
    expect(resRemessa.statusCode).toBe(201);
    pedidoRemessaId = resRemessa.json().dados.id;

    // 6. Criar Parceiro Comercial Ativo
    const resParc = await app.inject({
      method: "POST",
      url: "/api/v1/admin/parceiros",
      headers: { cookie: cookieGestao },
      payload: {
        codigo: "PARC-TESTE",
        nome: "Parceiro Teste Corredor",
        tipo: "remessas",
        canaisSuportados: ["maxpay", "remessa_parceiro"],
        comissaoPercentual: "1.00",
        limiteDiarioAoa: "50000000.00",
        emailAdmin: "operacoes@parceiroteste.com",
        nomeAdmin: "Gestor Parceiro Teste",
        senhaAdmin: senhaPadrao,
      },
    });
    parceiroId = resParc.json().dados.parceiro.id;
  });

  it("1. Deve obter resumo do Dashboard Operacional com contadores reais e atividade recente", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/operacional/dashboard",
      headers: { cookie: cookieGestao },
    });

    expect(res.statusCode).toBe(200);
    const dados = res.json().dados;
    expect(dados.pedidosCambioPendentes).toBeGreaterThanOrEqual(1);
    expect(dados.pedidosRemessasPendentes).toBeGreaterThanOrEqual(1);
    expect(dados.kycPendentes).toBeGreaterThanOrEqual(1);
    expect(dados.totalTarefasPendentes).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(dados.atividadesRecentes)).toBe(true);
  });

  it("2. Deve listar a Fila Única de Trabalho Consolidada com filtros por tipo e estado", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/operacional/fila",
      headers: { cookie: cookieGestao },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThanOrEqual(3);
    expect(body.dados.some((i: any) => i.tipo === "pedido_cambio")).toBe(true);
    expect(body.dados.some((i: any) => i.tipo === "pedido_remessa")).toBe(true);
    expect(body.dados.some((i: any) => i.tipo === "kyc_dossie")).toBe(true);

    // Filtrar apenas por pedidos de câmbio
    const resFiltro = await app.inject({
      method: "GET",
      url: "/api/v1/operacional/fila?tipo=pedido_cambio",
      headers: { cookie: cookieGestao },
    });
    expect(resFiltro.statusCode).toBe(200);
    expect(resFiltro.json().dados.every((i: any) => i.tipo === "pedido_cambio")).toBe(true);
  });

  it("3. Deve atribuir tarefa a um operador com prioridade e nota, gerando registo auditável", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/operacional/fila/pedido_cambio/${pedidoCambioId}/atribuir`,
      headers: { cookie: cookieGestao },
      payload: {
        responsavelId: atendenteId,
        prioridade: "urgente",
        notas: "Cliente VIP aguardando no balcão central.",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().dados.responsavelId).toBe(atendenteId);
    expect(res.json().dados.responsavelNome).toBe("Manuel Atendente Balcão");

    // Verificar na listagem da fila que a tarefa surge atribuída
    const resFila = await app.inject({
      method: "GET",
      url: `/api/v1/operacional/fila?tipo=pedido_cambio&responsavelId=${atendenteId}`,
      headers: { cookie: cookieGestao },
    });
    expect(resFila.statusCode).toBe(200);
    expect(resFila.json().dados.length).toBe(1);
    expect(resFila.json().dados[0].prioridade).toBe("urgente");
  });

  it("4. Deve processar aprovação de pedido de câmbio online", async () => {
    const resAprovar = await app.inject({
      method: "POST",
      url: `/api/v1/operacional/pedidos-cambio/${pedidoCambioId}/processar`,
      headers: { cookie: cookieGestao },
      payload: {
        decisao: "aprovar",
        notas: "Documentação conferida e cotação aprovada.",
      },
    });

    expect(resAprovar.statusCode).toBe(200);
    expect(resAprovar.json().dados.estado).toBe("aprovado");

    // Confirmar que o pedido de câmbio foi atualizado na base de dados
    const resDetalhe = await app.inject({
      method: "GET",
      url: `/api/v1/operacional/fila/pedido_cambio/${pedidoCambioId}`,
      headers: { cookie: cookieGestao },
    });
    expect(resDetalhe.statusCode).toBe(200);
    expect(resDetalhe.json().dados.estado).toBe("aprovado");
  });

  it("5. Deve processar encaminhamento de remessa online para parceiro comercial", async () => {
    const resAtribuir = await app.inject({
      method: "POST",
      url: `/api/v1/operacional/pedidos-remessas/${pedidoRemessaId}/processar`,
      headers: { cookie: cookieGestao },
      payload: {
        decisao: "atribuir_parceiro",
        parceiroId: parceiroId,
        notas: "Encaminhado para corredor europeu do parceiro.",
      },
    });

    expect(resAtribuir.statusCode).toBe(200);
    expect(resAtribuir.json().dados.estado).toBe("em_processamento");
    expect(resAtribuir.json().dados.parceiroNome).toBe("Parceiro Teste Corredor");

    // Verificar que o parceiro agora tem esta operação no seu módulo
    const opParceiro = db
      .prepare("SELECT * FROM operacoes_parceiros WHERE remessa_id = ?")
      .get(pedidoRemessaId) as any;
    expect(opParceiro).toBeDefined();
    expect(opParceiro.parceiro_id).toBe(parceiroId);
    expect(opParceiro.montante).toBe("1500.00");
  });

  it("6. Deve processar rejeição de pedido de remessa com motivo obrigatório", async () => {
    // Submeter nova remessa para testar rejeição
    const loginCli = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/login",
      payload: { email: "antonio.cliente@gmail.com", [campoSenha]: senhaPadrao },
    });
    const tokenCli = loginCli.json().dados.token;

    const resNovaRemessa = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${tokenCli}` },
      payload: {
        beneficiarioNome: "Destinatario Invalido",
        beneficiarioPais: "Portugal",
        beneficiarioIban: "PT50000000000000000000000",
        beneficiarioBanco: "Banco Desconhecido",
        moedaDestino: "EUR",
        montanteDivisa: "500.00",
        finalidade: "Apoio a despesas",
      },
    });
    expect(resNovaRemessa.statusCode).toBe(201);
    const novaRemessaId = resNovaRemessa.json().dados.id;

    const resRejeitar = await app.inject({
      method: "POST",
      url: `/api/v1/operacional/pedidos-remessas/${novaRemessaId}/processar`,
      headers: { cookie: cookieGestao },
      payload: {
        decisao: "rejeitar",
        motivoRejeicao: "IBAN do beneficiário rejeitado na pré-validação.",
      },
    });

    expect(resRejeitar.statusCode).toBe(200);
    expect(resRejeitar.json().dados.estado).toBe("rejeitada");

    const remessaNoBanco = db
      .prepare("SELECT estado, motivo_rejeicao FROM pedidos_remessas WHERE id = ?")
      .get(novaRemessaId) as any;
    expect(remessaNoBanco.estado).toBe("rejeitada");
    expect(remessaNoBanco.motivo_rejeicao).toContain("IBAN do beneficiário");
  });

  it("7. Deve validar documento KYC e consultar dossiê completo do cliente", async () => {
    // 1. Carregar documento para o cliente
    const pdfBuffer = Buffer.from("%PDF-1.4\n%teste fake pdf content para kyc operacional\n%%EOF");
    const uploadRes = await app.inject({
      method: "POST",
      url: `/api/v1/clientes/${clienteId}/documentos`,
      headers: { cookie: cookieGestao },
      payload: {
        tipoDocumento: "bi_frente",
        nomeArquivo: "bi_antonio.pdf",
        conteudoBase64: pdfBuffer.toString("base64"),
      },
    });
    expect(uploadRes.statusCode).toBe(201);
    const docId = uploadRes.json().dados.id;

    // 2. Aprovar o documento KYC
    const resAprovarDoc = await app.inject({
      method: "POST",
      url: `/api/v1/operacional/kyc/documentos/${docId}/decisao`,
      headers: { cookie: cookieGestao },
      payload: {
        statusValidacao: "aprovado",
      },
    });
    expect(resAprovarDoc.statusCode).toBe(200);

    // 3. Consultar dossiê completo
    const resDossie = await app.inject({
      method: "GET",
      url: `/api/v1/operacional/fila/kyc_dossie/${clienteId}`,
      headers: { cookie: cookieGestao },
    });
    expect(resDossie.statusCode).toBe(200);
    expect(resDossie.json().dados.cliente.id).toBe(clienteId);
    expect(resDossie.json().dados.documentos.length).toBeGreaterThanOrEqual(1);
    expect(resDossie.json().dados.documentos[0].estado_validacao).toBe("valido");
  });

  it("8. Deve listar sessões de caixa e alertas da equipa", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/operacional/caixas",
      headers: { cookie: cookieGestao },
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().dados)).toBe(true);
  });
});
