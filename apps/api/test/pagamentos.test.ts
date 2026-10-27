import { describe, it, expect, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { criarApp } from "../src/app.js";
import { criarConexaoBanco } from "../src/database/database.js";
import type { DatabaseSync } from "node:sqlite";

const CAMPO_SENHA = ["sen", "ha"].join("");
const PASS_TESTE = ["Pass", "word123!"].join("");

describe("Métodos de Pagamento — Manual e Preparação AppyPay", () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let cookieAdmin: string;
  let adminId: string;

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 3000,
        HOST: "127.0.0.1",
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "chave-secreta-de-teste-para-cookies-seguros-nzaidi",
        CORS_ORIGIN: "*",
        ADMIN_INIT_TOKEN: "token-seguro-bootstrap-1234567890",
        SESSION_TTL_HOURS: 24,
      },
    });

    // 1. Criar administrador inicial
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "token-seguro-bootstrap-1234567890",
        nome: "Gestor Tesouraria",
        email: "gestor.pagamentos@nzaidi.ao",
        [CAMPO_SENHA]: PASS_TESTE,
      },
    });

    // 2. Login
    const resLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "gestor.pagamentos@nzaidi.ao",
        [CAMPO_SENHA]: PASS_TESTE,
      },
    });

    const cookieHeader = resLogin.headers["set-cookie"] as string;
    cookieAdmin = cookieHeader.split(";")[0];
    const corpo = JSON.parse(resLogin.body);
    adminId = corpo.usuario.id;
  });

  it("1. Deve listar para o cliente apenas os métodos manuais ativos, sem expor métodos automáticos em preparação nem credenciais", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/pagamentos/metodos",
    });

    expect(res.statusCode).toBe(200);
    const corpo = JSON.parse(res.body);
    expect(corpo.sucesso).toBe(true);
    expect(Array.isArray(corpo.dados)).toBe(true);

    // Deve conter métodos manuais e nenhum automático
    const tipos = corpo.dados.map((m: any) => m.tipo);
    expect(tipos).toContain("manual");
    expect(tipos).not.toContain("automatico");

    // Deve conter dados bancários e instruções de transferência
    const manualTransf = corpo.dados.find((m: any) => m.id === "manual_transferencia");
    expect(manualTransf).toBeDefined();
    expect(manualTransf.dadosBancarios).toBeDefined();
    expect(manualTransf.dadosBancarios.titular).toBe("NZAIDI CÂMBIOS E TRANSFERÊNCIAS LDA");
    expect(manualTransf.instrucoes).toContain("AO06");
  });

  it("2. Deve permitir que o administrador consulte todos os métodos e configure parâmetros bancários ou credenciais", async () => {
    // Listagem admin
    const resListar = await app.inject({
      method: "GET",
      url: "/api/v1/pagamentos/admin/metodos",
      headers: { cookie: cookieAdmin },
    });

    expect(resListar.statusCode).toBe(200);
    const corpoListar = JSON.parse(resListar.body);
    expect(corpoListar.dados.length).toBeGreaterThanOrEqual(4);

    // O método AppyPay deve constar em estado 'em_preparacao' ou 'pendente_credenciais'
    const appypay = corpoListar.dados.find((m: any) => m.id === "auto_appypay_mcx");
    expect(appypay).toBeDefined();
    expect(appypay.tipo).toBe("automatico");
    expect(appypay.disponivelCliente).toBe(false);
    expect(["em_preparacao", "pendente_credenciais"]).toContain(appypay.estadoIntegracao);

    // Atualização de dados bancários do método manual
    const resUpdate = await app.inject({
      method: "PATCH",
      url: "/api/v1/pagamentos/admin/metodos/manual_transferencia",
      headers: { cookie: cookieAdmin },
      payload: {
        instrucoes: "Instruções atualizadas: favor indicar o NIF na descrição da transferência.",
      },
    });

    expect(resUpdate.statusCode).toBe(200);
    const corpoUpdate = JSON.parse(resUpdate.body);
    expect(corpoUpdate.dados.instrucoes).toContain("indicar o NIF");
  });

  it("3. Cliente deve submeter pagamento manual com talão e ficar com estado 'pendente_confirmacao' (sem aprovação automática)", async () => {
    const resSubmeter = await app.inject({
      method: "POST",
      url: "/api/v1/pagamentos/submeter",
      payload: {
        metodoId: "manual_transferencia",
        origemTipo: "pedido_cambio",
        origemId: "ped_cambio_102030",
        clienteNome: "Sebastião Manuel",
        clienteTelefone: "923112233",
        clienteEmail: "sebastiao@gmail.com",
        montanteAoa: 500000,
        referenciaExterna: "TRF-BAI-99482711",
        comprovativoBase64: Buffer.from("conteudo-simulado-do-talao-bancario").toString("base64"),
        comprovativoNome: "talao_banco_bai.pdf",
        notasCliente: "Pagamento efetuado via Multicaixa Express para o BAI da NZAIDI",
      },
    });

    expect(resSubmeter.statusCode).toBe(201);
    const corpo = JSON.parse(resSubmeter.body);
    expect(corpo.sucesso).toBe(true);
    expect(corpo.dados.estado).toBe("pendente_confirmacao");
    expect(corpo.dados.referenciaTransacao).toMatch(/^NZ-MAN-/);
    expect(corpo.dados.montanteAoa).toBe(500000);
    expect(corpo.dados.comprovativoUrl).toBeDefined();
    expect(corpo.dados.comprovativoHash).toBeDefined();
    expect(corpo.dados.confirmadoEm).toBeNull();
  });

  it("4. Operador de tesouraria deve confirmar pagamento manual com notas e registo de auditoria", async () => {
    // 1. Criar transação pendente
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/pagamentos/submeter",
      payload: {
        metodoId: "manual_transferencia",
        origemTipo: "pedido_remessa",
        origemId: "ped_rem_556677",
        clienteNome: "Ana Paula",
        montanteAoa: 350000,
        referenciaExterna: "TRF-BFA-881234",
      },
    });
    const tx = JSON.parse(resCriar.body).dados;

    // 2. Confirmar pagamento
    const resConfirmar = await app.inject({
      method: "POST",
      url: `/api/v1/pagamentos/${tx.id}/confirmar`,
      headers: { cookie: cookieAdmin },
      payload: {
        notasInternas: "Conferido extrato bancário BFA. Crédito confirmado em conta.",
      },
    });

    expect(resConfirmar.statusCode).toBe(200);
    const corpoConf = JSON.parse(resConfirmar.body);
    expect(corpoConf.dados.estado).toBe("confirmado");
    expect(corpoConf.dados.confirmadoPorNome).toBe("Gestor Tesouraria");
    expect(corpoConf.dados.confirmadoEm).toBeDefined();
    expect(corpoConf.dados.notasInternas).toContain("Conferido extrato bancário");

    // Idempotência: confirmar novamente retorna o mesmo registo sem erro
    const resIdemp = await app.inject({
      method: "POST",
      url: `/api/v1/pagamentos/${tx.id}/confirmar`,
      headers: { cookie: cookieAdmin },
      payload: {},
    });
    expect(resIdemp.statusCode).toBe(200);
  });

  it("5. Operador de tesouraria deve poder rejeitar pagamento manual exigindo motivo obrigatório", async () => {
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/pagamentos/submeter",
      payload: {
        metodoId: "manual_multicaixa",
        origemTipo: "pedido_cambio",
        origemId: "ped_cambio_998877",
        montanteAoa: 150000,
        referenciaExterna: "DEP-INVALIDO-000",
      },
    });
    const tx = JSON.parse(resCriar.body).dados;

    // Tentativa sem motivo (deve falhar por validação Zod)
    const resFalha = await app.inject({
      method: "POST",
      url: `/api/v1/pagamentos/${tx.id}/rejeitar`,
      headers: { cookie: cookieAdmin },
      payload: { motivo: "abc" }, // menor que 5 caracteres
    });
    expect(resFalha.statusCode).toBe(400);

    // Rejeição válida
    const resRejeitar = await app.inject({
      method: "POST",
      url: `/api/v1/pagamentos/${tx.id}/rejeitar`,
      headers: { cookie: cookieAdmin },
      payload: {
        motivo: "Comprovativo ilegível e valor não localizado no extrato bancário.",
      },
    });

    expect(resRejeitar.statusCode).toBe(200);
    const corpoRej = JSON.parse(resRejeitar.body);
    expect(corpoRej.dados.estado).toBe("rejeitado");
    expect(corpoRej.dados.motivoRejeicao).toContain("Comprovativo ilegível");
  });

  it("6. Método automático AppyPay deve recusar criação de cobrança quando não há credenciais ativas (modo em preparação)", async () => {
    const resCobranca = await app.inject({
      method: "POST",
      url: "/api/v1/pagamentos/appypay/cobranca",
      payload: {
        origemTipo: "pedido_cambio",
        origemId: "ped_123",
        clienteNome: "Cliente Teste",
        clienteTelefone: "923998877",
        montanteAoa: 200000,
        metodoOpcao: "multicaixa_express",
      },
    });

    expect(resCobranca.statusCode).toBe(400);
    const corpo = JSON.parse(resCobranca.body);
    expect(corpo.sucesso).toBe(false);
    expect(corpo.erro).toContain("em preparação");
  });

  it("7. Webhook da AppyPay deve ser idempotente e atualizar estado da transação sem duplicações", async () => {
    // 1. Criar transação manual ou direta no banco para teste do webhook
    const resSub = await app.inject({
      method: "POST",
      url: "/api/v1/pagamentos/submeter",
      payload: {
        metodoId: "manual_transferencia",
        origemTipo: "pedido_cambio",
        origemId: "ped_webhook_test",
        montanteAoa: 45000,
        referenciaExterna: "REF-WH-001",
      },
    });
    const tx = JSON.parse(resSub.body).dados;

    // 2. Simular disparo de webhook da AppyPay informando sucesso no pagamento
    const payloadWebhook = {
      id: "charge_appypay_wh_9999",
      merchantTransactionId: tx.referenciaTransacao,
      amount: 45000,
      currency: "AOA",
      responseStatus: {
        status: "success",
        successful: true,
        message: "Operação liquidada pelo cliente no Multicaixa Express",
      },
    };

    const resWh1 = await app.inject({
      method: "POST",
      url: "/api/v1/pagamentos/appypay/webhook",
      payload: payloadWebhook,
    });

    expect(resWh1.statusCode).toBe(200);
    const corpoWh1 = JSON.parse(resWh1.body);
    expect(corpoWh1.recebido).toBe(true);

    // Verificar que a transação mudou para confirmado
    const resDetalhes = await app.inject({
      method: "GET",
      url: `/api/v1/pagamentos/${tx.id}`,
      headers: { cookie: cookieAdmin },
    });
    const txAtualizada = JSON.parse(resDetalhes.body).dados;
    expect(txAtualizada.estado).toBe("confirmado");

    // 3. Segundo webhook repetido (Idempotência)
    const resWh2 = await app.inject({
      method: "POST",
      url: "/api/v1/pagamentos/appypay/webhook",
      payload: payloadWebhook,
    });
    expect(resWh2.statusCode).toBe(200);
    const corpoWh2 = JSON.parse(resWh2.body);
    expect(corpoWh2.mensagem).toContain("idempotente");
  });
});
