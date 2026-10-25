import { describe, it, expect, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarConexaoBanco, comTransacao, proximoNumeroSequencial } from "../src/database/database.js";
import { criarApp } from "../src/app.js";
import { UsersRepository } from "../src/modules/autenticacao/users.repository.js";
import { SessionsRepository } from "../src/modules/autenticacao/sessions.repository.js";
import { ClientesRepository } from "../src/modules/identidade-kyc/clientes.repository.js";
import { CaixaRepository } from "../src/modules/contabilidade-tesouraria/caixa.repository.js";
import { TaxasRepository, TaxasService } from "../src/modules/taxas-cambio/taxas.service.js";
import { AuditoriaRepository } from "../src/modules/auditoria/auditoria.repository.js";
import { OperacoesRepository } from "../src/modules/operacoes-cambio/operacoes.repository.js";
import { OperacoesService } from "../src/modules/operacoes-cambio/operacoes.service.js";
import { BnaRepository } from "../src/modules/reportes-bna/bna.repository.js";
import { BnaService } from "../src/modules/reportes-bna/bna.service.js";
import { RemessasRepository } from "../src/modules/remessas/remessas.repository.js";
import { RemessasService } from "../src/modules/remessas/remessas.service.js";

describe("NZAIDI — Prioridade 1: Testes Regulatórios BNA, Remessas e Borderôs Atómicos", () => {
  let db: ReturnType<typeof criarConexaoBanco>;
  let app: FastifyInstance;
  let cookieAdmin: string;
  let cookieAtendente: string;

  let clienteAprovadoId: string;
  let clientePendenteId: string;
  let caixaAtendenteId: string;

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");

    const env = {
      PORT: 3000,
      HOST: "127.0.0.1",
      NODE_ENV: "test" as const,
      DATABASE_PATH: ":memory:",
      STORAGE_KYC_PATH: "./storage/test_kyc",
      ADMIN_INIT_TOKEN: "token_teste_bna_2026",
      COOKIE_SECRET: "chave_secreta_teste_bna_longa_32_chars_ok!",
      SESSION_TTL_HOURS: 8,
      CORS_ORIGIN: "*",
    };

    app = await criarApp({ db, env });
    await app.ready();

    // 1. Criar administrador (Gestão)
    const resInit = await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "token_teste_bna_2026",
        nome: "Admin BNA",
        email: "gestao.bna@nzaidi.ao",
        senha: "SenhaSeguraBNA2026!",
      },
    });
    expect(resInit.statusCode).toBe(201);

    const loginAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "gestao.bna@nzaidi.ao",
        senha: "SenhaSeguraBNA2026!",
      },
    });
    expect(loginAdmin.statusCode).toBe(200);
    cookieAdmin = loginAdmin.headers["set-cookie"] as string;

    // 2. Criar atendente
    const resAtendente = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { cookie: cookieAdmin },
      payload: {
        nome: "Atendente Luanda",
        email: "atendente.luanda@nzaidi.ao",
        funcao: "atendente",
        senha: "SenhaAtendente2026!",
      },
    });
    expect(resAtendente.statusCode).toBe(201);
    const atendenteId = resAtendente.json().dados.id;

    const loginAtendente = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "atendente.luanda@nzaidi.ao",
        senha: "SenhaAtendente2026!",
      },
    });
    expect(loginAtendente.statusCode).toBe(200);
    cookieAtendente = loginAtendente.headers["set-cookie"] as string;

    // 3. Cadastrar clientes (um aprovado e um pendente)
    const clientesRepo = new ClientesRepository(db);
    clienteAprovadoId = "cli_aprovado_1";
    clientesRepo.inserir({
      id: clienteAprovadoId,
      tipo: "singular",
      nome: "Mateus Domingos Afonso",
      tipoDocumento: "bi",
      numeroDocumento: "009988776LA042",
      nif: "5412345678",
      nacionalidade: "AO",
      telefone: "+244923000111",
      email: "mateus@exemplo.ao",
      morada: "Rua Rainha Ginga, Maianga, Luanda",
      estado: "ativo",
      estadoKyc: "aprovado",
      nivelRisco: "baixo",
      criadoEm: "2026-10-25T10:00:00.000Z",
      atualizadoEm: "2026-10-25T10:00:00.000Z",
    });

    clientePendenteId = "cli_pendente_2";
    clientesRepo.inserir({
      id: clientePendenteId,
      tipo: "singular",
      nome: "Teresa Antónia",
      tipoDocumento: "passaporte",
      numeroDocumento: "N1234567",
      nif: "5499999999",
      nacionalidade: "AO",
      telefone: "+244924000222",
      email: "teresa@exemplo.ao",
      morada: "Alvalade, Luanda",
      estado: "ativo",
      estadoKyc: "pendente",
      nivelRisco: "medio",
      criadoEm: "2026-10-25T10:00:00.000Z",
      atualizadoEm: "2026-10-25T10:00:00.000Z",
    });

    // 4. Abrir Caixa para o atendente com liquidez
    const resCaixa = await app.inject({
      method: "POST",
      url: "/api/v1/caixa/abrir",
      headers: { cookie: cookieAtendente },
      payload: {
        saldoInicialAoa: "50000000.00",
        saldoInicialUsd: "50000.00",
        saldoInicialEur: "30000.00",
      },
    });
    expect(resCaixa.statusCode).toBe(201);
    caixaAtendenteId = resCaixa.json().dados.id;
  });

  // =========================================================================
  // TESTE 1: BORDERÔS — SEQUENCIAMENTO ATÓMICO SEM FALHAS E ROLLBACK SEGURO
  // =========================================================================
  it("deve atribuir numeração sequencial atómica aos borderôs e provar que reversão a meio não deixa falhas (sem gaps)", async () => {
    const anoAtual = new Date().getFullYear();

    // 1. Prova de geração atómica da sequência inicial
    const seq1 = proximoNumeroSequencial(db, "teste_bordero", "BOR", anoAtual);
    const seq2 = proximoNumeroSequencial(db, "teste_bordero", "BOR", anoAtual);
    expect(seq1).toBe(`BOR-${anoAtual}-000001`);
    expect(seq2).toBe(`BOR-${anoAtual}-000002`);

    // 2. Simulação de transação que falha a meio (Rollback)
    try {
      comTransacao(db, () => {
        const seqFalha = proximoNumeroSequencial(db, "teste_bordero", "BOR", anoAtual);
        expect(seqFalha).toBe(`BOR-${anoAtual}-000003`);
        // Erro intencional que dispara ROLLBACK da transação
        throw new Error("Erro forçado na transação para testar reversão atómica");
      });
    } catch (e: any) {
      expect(e.message).toContain("Erro forçado");
    }

    // 3. Prova irrefutável de ausência de falhas/gaps:
    // Como a transação sofreu rollback, o contador voltou atómicamente ao valor anterior (2).
    // O próximo borderô recebe exatamente BOR-2026-000003!
    const seq3 = proximoNumeroSequencial(db, "teste_bordero", "BOR", anoAtual);
    expect(seq3).toBe(`BOR-${anoAtual}-000003`);

    const seq4 = proximoNumeroSequencial(db, "teste_bordero", "BOR", anoAtual);
    expect(seq4).toBe(`BOR-${anoAtual}-000004`);
  });

  it("deve emitir borderô real de balcão e manter número intacto se for estornado", async () => {
    const agoraIso = new Date().toISOString();

    const resOp = await app.inject({
      method: "POST",
      url: "/api/v1/operacoes",
      headers: { cookie: cookieAtendente },
      payload: {
        chaveIdempotencia: "idemp_bordero_teste_001",
        clienteId: clienteAprovadoId,
        tipo: "compra",
        moedaDivisa: "USD",
        montanteDivisa: "500.00",
        cotacaoCriadaEm: agoraIso,
      },
    });
    expect(resOp.statusCode).toBe(201);
    const bordero = resOp.json().dados.bordero;
    expect(bordero.numeroBordero).toMatch(/^BOR-\d{4}-\d{6}$/);
    const numeroOriginal = bordero.numeroBordero;

    // Estorno da operação pela gestão
    const resEstorno = await app.inject({
      method: "POST",
      url: `/api/v1/operacoes/${resOp.json().dados.operacao.id}/estornar`,
      headers: { cookie: cookieAdmin },
      payload: {
        motivo: "Erro na digitação do montante presencial pelo operador",
      },
    });
    expect(resEstorno.statusCode).toBe(200);

    // Consulta direta do borderô na base de dados para provar que mantém o número
    const stmt = db.prepare("SELECT * FROM borderos WHERE numero_bordero = ?");
    const borDb = stmt.get(numeroOriginal) as any;
    expect(borDb).toBeDefined();
    expect(borDb.numero_bordero).toBe(numeroOriginal);
    expect(borDb.estado).toBe("anulado");
    expect(borDb.motivo_anulacao).toContain("Erro na digitação");
  });

  // =========================================================================
  // TESTE 2: REPORTES BNA — SUPTECH, SSIF, REPORTE A ZERO E RELÓGIO 18:35
  // =========================================================================
  it("deve gerar mapa diário de câmbio e remessas para o BNA com operações reais", async () => {
    const dataHoje = new Date().toISOString().slice(0, 10);

    // Regista uma operação de balcão para ter dados no dia
    await app.inject({
      method: "POST",
      url: "/api/v1/operacoes",
      headers: { cookie: cookieAtendente },
      payload: {
        chaveIdempotencia: "idemp_op_bna_001",
        clienteId: clienteAprovadoId,
        tipo: "venda",
        moedaDivisa: "USD",
        montanteDivisa: "1000.00",
        cotacaoCriadaEm: new Date().toISOString(),
      },
    });

    // Geração manual do reporte BNA pelo perfil de Gestão
    const resGera = await app.inject({
      method: "POST",
      url: "/api/v1/bna/reportes/gerar",
      headers: { cookie: cookieAdmin },
      payload: {
        dataReferencia: dataHoje,
        tipoMapa: "ambos",
      },
    });
    expect(resGera.statusCode).toBe(201);
    const reportes = resGera.json().reportes;
    expect(reportes.cambio.totalOperacoes).toBeGreaterThanOrEqual(1);
    expect(reportes.cambio.reporteZero).toBe(false);
    expect(reportes.cambio.conteudoArquivo).toContain("DATA_OPERACAO;NUMERO_BORDERO;CLIENTE_NIF");
    expect(reportes.cambio.conteudoArquivo).toContain("5412345678");

    // Prova do download do arquivo oficial
    const resDownload = await app.inject({
      method: "GET",
      url: `/api/v1/bna/reportes/${reportes.cambio.id}/download`,
      headers: { cookie: cookieAdmin },
    });
    expect(resDownload.statusCode).toBe(200);
    expect(resDownload.headers["content-type"]).toContain("text/csv");
    expect(resDownload.body).toContain("5412345678");

    // Registo de submissão nas plataformas Suptech e SSIF
    const resSub = await app.inject({
      method: "POST",
      url: `/api/v1/bna/reportes/${reportes.cambio.id}/submissao`,
      headers: { cookie: cookieAdmin },
      payload: { plataforma: "ambas" },
    });
    expect(resSub.statusCode).toBe(200);
    expect(resSub.json().reporte.estadoSuptech).toBe("submetido");
    expect(resSub.json().reporte.estadoSsif).toBe("submetido");
  });

  it("deve obrigatoriamente gerar REPORTE A ZERO quando o dia não tem operações", async () => {
    const dataSemMovimento = "2026-01-01"; // Feriado de Ano Novo sem movimento

    const resGeraZero = await app.inject({
      method: "POST",
      url: "/api/v1/bna/reportes/gerar",
      headers: { cookie: cookieAdmin },
      payload: {
        dataReferencia: dataSemMovimento,
        tipoMapa: "cambio",
      },
    });
    expect(resGeraZero.statusCode).toBe(201);
    const reporte = resGeraZero.json().reporte;
    expect(reporte.totalOperacoes).toBe(0);
    expect(reporte.reporteZero).toBe(true);
    expect(reporte.volumeAoa).toBe("0.00");
    expect(reporte.conteudoArquivo).toContain("SEM_MOVIMENTO");
    expect(reporte.conteudoArquivo).toContain("REPORTE A ZERO (SEM OPERAÇÕES)");
  });

  it("deve verificar alerta das 18:35 de Luanda com relógio simulado", async () => {
    const bnaRepo = new BnaRepository(db);
    const auditoriaRepo = new AuditoriaRepository(db);
    const bnaService = new BnaService(bnaRepo, auditoriaRepo);

    // 1. Simulação antes das 18:35 (ex: 18:30 em Luanda = 17:30 UTC) -> SEM alerta
    const relogio1830 = new Date("2026-10-25T17:30:00.000Z"); // 18:30 Luanda
    const res1830 = bnaService.verificarAlertaReporteHoje(relogio1830);
    expect(res1830.alerta).toBe(false);

    // 2. Simulação às 18:35 em Luanda (= 17:35 UTC) sem mapas gerados -> ALERTA ATIVO!
    const relogio1835 = new Date("2026-10-25T17:35:00.000Z"); // 18:35 Luanda
    const res1835 = bnaService.verificarAlertaReporteHoje(relogio1835);
    expect(res1835.alerta).toBe(true);
    expect(res1835.mensagem).toContain("ALERTA REGULATÓRIO");
    expect(res1835.mensagem).toContain("18:35");

    // 3. Após gerar os reportes do dia, às 18:40 o alerta cessa automaticamente
    bnaService.gerarReportesData(res1835.dataHojeLuanda, { id: "test", nome: "Testador" });
    const relogio1840 = new Date("2026-10-25T17:40:00.000Z"); // 18:40 Luanda
    const res1840 = bnaService.verificarAlertaReporteHoje(relogio1840);
    expect(res1840.alerta).toBe(false);
  }, 20000);

  // =========================================================================
  // TESTE 3: REMESSAS INTERNACIONAIS — MAXPAY, REALTRANSFERS E IDEMPOTÊNCIA
  // =========================================================================
  it("deve registar remessa internacional no balcão e despachar via adaptador MaxPay", async () => {
    const resRemessa = await app.inject({
      method: "POST",
      url: "/api/v1/remessas",
      headers: { cookie: cookieAtendente },
      payload: {
        chaveIdempotencia: "idemp_rem_maxpay_001",
        clienteRemetenteId: clienteAprovadoId,
        beneficiarioNome: "Carlos Alberto Ferreira",
        beneficiarioPais: "PT",
        beneficiarioBanco: "Millennium BCP",
        beneficiarioContaIban: "PT50003300001234567890123",
        moeda: "EUR",
        valorMoeda: "200.00",
        parceiro: "maxpay",
      },
    });
    expect(resRemessa.statusCode).toBe(201);
    const rem = resRemessa.json().remessa;
    expect(rem.numeroRemessa).toMatch(/^REM-\d{4}-\d{6}$/);
    expect(rem.parceiro).toBe("maxpay");
    expect(rem.estado).toBe("enviada");
    expect(rem.referenciaParceiro).toMatch(/^MP-\d{4}-/);

    // Prova de Idempotência: mesmo pedido com a mesma chave retorna a remessa existente sem duplicar
    const resDuplicado = await app.inject({
      method: "POST",
      url: "/api/v1/remessas",
      headers: { cookie: cookieAtendente },
      payload: {
        chaveIdempotencia: "idemp_rem_maxpay_001",
        clienteRemetenteId: clienteAprovadoId,
        beneficiarioNome: "Carlos Alberto Ferreira",
        beneficiarioPais: "PT",
        beneficiarioBanco: "Millennium BCP",
        beneficiarioContaIban: "PT50003300001234567890123",
        moeda: "EUR",
        valorMoeda: "200.00",
        parceiro: "maxpay",
      },
    });
    expect(resDuplicado.statusCode).toBe(201);
    expect(resDuplicado.json().remessa.id).toBe(rem.id);
  });

  it("deve recusar remessa se o cliente remetente não tiver KYC aprovado", async () => {
    const resRemessaRecusada = await app.inject({
      method: "POST",
      url: "/api/v1/remessas",
      headers: { cookie: cookieAtendente },
      payload: {
        chaveIdempotencia: "idemp_rem_recusa_kyc",
        clienteRemetenteId: clientePendenteId, // Cliente com KYC pendente
        beneficiarioNome: "Maria dos Santos",
        beneficiarioPais: "US",
        beneficiarioBanco: "Chase Bank",
        beneficiarioContaIban: "US1234567890",
        moeda: "USD",
        valorMoeda: "500.00",
        parceiro: "realtransfers",
      },
    });
    expect(resRemessaRecusada.statusCode).toBe(400);
    expect(resRemessaRecusada.json().erro).toContain("KYC aprovado");
  });

  it("deve cancelar remessa e estornar valor cobrado por LANÇAMENTO CONTRÁRIO no caixa", async () => {
    // 1. Cria remessa
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/remessas",
      headers: { cookie: cookieAtendente },
      payload: {
        chaveIdempotencia: "idemp_rem_cancelar_001",
        clienteRemetenteId: clienteAprovadoId,
        beneficiarioNome: "Ana Paula Silva",
        beneficiarioPais: "ZA",
        beneficiarioBanco: "Standard Bank SA",
        beneficiarioContaIban: "ZA987654321",
        moeda: "USD",
        valorMoeda: "100.00",
        parceiro: "realtransfers",
      },
    });
    expect(resCriar.statusCode).toBe(201);
    const remId = resCriar.json().remessa.id;
    const totalCobrado = resCriar.json().remessa.totalCobradoAoa;

    // 2. Cancelar remessa pela Gestão
    const resCancela = await app.inject({
      method: "POST",
      url: `/api/v1/remessas/${remId}/cancelar`,
      headers: { cookie: cookieAdmin },
      payload: {
        motivo: "Cancelamento solicitado pelo remetente antes do pagamento externo",
      },
    });
    expect(resCancela.statusCode).toBe(200);
    expect(resCancela.json().remessa.estado).toBe("cancelada");

    // 3. Prova do lançamento contrário no caixa (saída de Kwanza igual ao valor cobrado)
    const stmt = db.prepare("SELECT * FROM movimentos_caixa WHERE operacao_id = ? AND tipo = 'remessa_saida'");
    const movSaida = stmt.get(remId) as any;
    expect(movSaida).toBeDefined();
    expect(movSaida.tipo).toBe("remessa_saida");
    expect(parseFloat(movSaida.montante)).toBeLessThan(0);
    expect(Math.abs(parseFloat(movSaida.montante))).toBe(parseFloat(totalCobrado));
  });
});
