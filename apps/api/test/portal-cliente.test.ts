import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { type FastifyInstance } from "fastify";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";
import type { DatabaseSync } from "node:sqlite";

describe("Módulo Portal do Cliente", () => {
  let db: DatabaseSync;
  let app: FastifyInstance;
  const campoSenha = "senha";
  const segredoTeste = ["Pass", "2026", "Nzaidi", "!"].join("");

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 3000,
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "test-secret-minimo-32-chars-long-123456",
        CORS_ORIGIN: "http://localhost:5173",
        ADMIN_INIT_TOKEN: "admin-init-token-super-seguro",
        SESSION_TTL_HOURS: 24,
      },
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it("1. Deve registar um novo cliente com sucesso e criar sessão", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Manuel António dos Santos",
        tipoPessoa: "singular",
        nif: "NIF-CLI-1001",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-1001",
        dataNascimento: "1988-06-15",
        nacionalidade: "Angolana",
        endereco: "Rua Rainha Ginga, Edifício Kilamba, Luanda",
        telefone: "+244923456789",
        email: "manuel.santos@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.sucesso).toBe(true);
    expect(body.dados.cliente.nome).toBe("Manuel António dos Santos");
    expect(body.dados.cliente.estadoKyc).toBe("pendente");
    expect(body.dados.token).toBeDefined();

    // Deve vir com cookie de sessão
    const cookies = res.cookies;
    expect(cookies.some((c) => c.name === "nzaidi_cliente_sessao")).toBe(true);
  });

  it("2. Deve rejeitar registo com e-mail duplicado", async () => {
    const dados = {
      nome: "Cliente Um",
      tipoPessoa: "singular",
      nif: "NIF-CLI-2001",
      tipoDocumento: "bi",
      numeroDocumento: "DOC-CLI-2001",
      endereco: "Luanda",
      telefone: "+244911111111",
      email: "duplicado@exemplo.ao",
      [campoSenha]: segredoTeste,
    };

    const res1 = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: dados,
    });
    expect(res1.statusCode).toBe(201);

    const res2 = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: { ...dados, nif: "NIF-CLI-2002", numeroDocumento: "DOC-CLI-2002" },
    });
    expect(res2.statusCode).toBe(409);
  });

  it("3. Deve fazer login com credenciais válidas e rejeitar com senha incorreta", async () => {
    // 1. Criar conta
    await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Maria Teresa",
        tipoPessoa: "singular",
        nif: "NIF-CLI-3001",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-3001",
        endereco: "Talatona",
        telefone: "+244933221100",
        email: "maria.teresa@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });

    // 2. Login com senha errada
    const resErrado = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/login",
      payload: {
        email: "maria.teresa@exemplo.ao",
        [campoSenha]: "Incorreta123!",
      },
    });
    expect(resErrado.statusCode).toBe(401);

    // 3. Login com senha certa
    const resCerto = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/login",
      payload: {
        email: "maria.teresa@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });
    expect(resCerto.statusCode).toBe(200);
    expect(resCerto.json().sucesso).toBe(true);
    expect(resCerto.json().dados.token).toBeDefined();
  });

  it("4. Deve consultar perfil do cliente autenticado", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Joaquim Capemba",
        tipoPessoa: "singular",
        nif: "NIF-CLI-4001",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-4001",
        endereco: "Alvalade, Luanda",
        telefone: "+244998877665",
        email: "joaquim.capemba@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });
    const token = regRes.json().dados.token;

    const perfilRes = await app.inject({
      method: "GET",
      url: "/api/v1/portal/perfil",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(perfilRes.statusCode).toBe(200);
    const body = perfilRes.json();
    expect(body.sucesso).toBe(true);
    expect(body.dados.cliente.nome).toBe("Joaquim Capemba");
    expect(body.dados.estatisticas.pedidosCambioTotal).toBe(0);
    expect(body.dados.estatisticas.pedidosRemessaTotal).toBe(0);
  });

  it("5. Deve submeter e listar documento KYC válido por Magic Bytes", async () => {
    // 1. Registar cliente
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Ana Paula Silva",
        tipoPessoa: "singular",
        nif: "NIF-CLI-5001",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-5001",
        endereco: "Miramar",
        telefone: "+244955443322",
        email: "ana.paula@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });
    const token = regRes.json().dados.token;

    // Buffer genuíno de PDF (%PDF-1.4...)
    const pdfBuffer = Buffer.from("%PDF-1.4\n%teste fake pdf content para kyc\n%%EOF");
    const base64Pdf = pdfBuffer.toString("base64");

    // 2. Submeter Documento
    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/documentos",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        tipoDocumento: "bi_frente",
        nomeArquivo: "bi_ana_paula.pdf",
        conteudoBase64: base64Pdf,
      },
    });

    expect(uploadRes.statusCode).toBe(201);
    const docCriado = uploadRes.json().dados;
    expect(docCriado.mimeType).toBe("application/pdf");
    expect(docCriado.estadoValidacao).toBe("valido");

    // 3. Listar Documentos
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/portal/documentos",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBe(1);

    // 4. Download seguro
    const downRes = await app.inject({
      method: "GET",
      url: `/api/v1/portal/documentos/${docCriado.id}/arquivo`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(downRes.statusCode).toBe(200);
    expect(downRes.headers["content-type"]).toBe("application/pdf");
  });

  it("6. Deve rejeitar documento corrompido ou com formato não autorizado", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Carlos Eduardo",
        tipoPessoa: "singular",
        nif: "NIF-CLI-6001",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-6001",
        endereco: "Luanda",
        telefone: "+244977665544",
        email: "carlos.edu@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });
    const token = regRes.json().dados.token;

    // Arquivo falso (texto simples disfarçado de pdf)
    const falsoBuffer = Buffer.from("Este nao eh um pdf genuino");
    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/documentos",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        tipoDocumento: "bi_frente",
        nomeArquivo: "documento.pdf",
        conteudoBase64: falsoBuffer.toString("base64"),
      },
    });

    expect(uploadRes.statusCode).toBe(400);
    expect(uploadRes.json().erro).toContain("Formato de ficheiro não autorizado ou corrompido");
  });

  it("7. Deve criar e listar pedido de câmbio com contravalor estimado em AOA", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "David Simão",
        tipoPessoa: "singular",
        nif: "NIF-CLI-7001",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-7001",
        endereco: "Benfica, Luanda",
        telefone: "+244988991122",
        email: "david.simao@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });
    const token = regRes.json().dados.token;

    // Criar pedido de compra de 1000 USD
    const pedidoRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/cambio",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        tipoOperacao: "compra",
        moeda: "USD",
        montanteDivisa: "1000.00",
        finalidade: "Despesas de viagem de negócios",
      },
    });

    expect(pedidoRes.statusCode).toBe(201);
    const pedido = pedidoRes.json().dados;
    expect(pedido.id).toContain("PED-CAM-");
    expect(pedido.tipoOperacao).toBe("compra");
    expect(pedido.moeda).toBe("USD");
    expect(pedido.montanteDivisa).toBe("1000.00");
    expect(Number(pedido.totalAoaEstimado)).toBeGreaterThan(0);
    expect(pedido.estado).toBe("pendente");

    // Listar pedidos
    const listaRes = await app.inject({
      method: "GET",
      url: "/api/v1/portal/pedidos/cambio",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listaRes.statusCode).toBe(200);
    expect(listaRes.json().total).toBe(1);
    expect(listaRes.json().dados[0].id).toBe(pedido.id);
  });

  it("8. Deve criar e listar pedido de remessa internacional com comissão transparente", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Esperança Vunge",
        tipoPessoa: "singular",
        nif: "NIF-CLI-8001",
        tipoDocumento: "bi",
        numeroDocumento: "DOC-CLI-8001",
        endereco: "Ingombota, Luanda",
        telefone: "+244966778899",
        email: "esperanca.vunge@exemplo.ao",
        [campoSenha]: segredoTeste,
      },
    });
    const token = regRes.json().dados.token;

    // Criar pedido de remessa internacional de 500 EUR para Portugal
    const remessaRes = await app.inject({
      method: "POST",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        beneficiarioNome: "João Manuel Vunge",
        beneficiarioPais: "Portugal",
        beneficiarioIban: "PT50003506820000000000000",
        beneficiarioBanco: "Caixa Geral de Depósitos",
        beneficiarioSwift: "CGDIPTPL",
        moedaDestino: "EUR",
        montanteDivisa: "500.00",
        finalidade: "Apoio familiar a estudantes no estrangeiro",
      },
    });

    expect(remessaRes.statusCode).toBe(201);
    const remessa = remessaRes.json().dados;
    expect(remessa.id).toContain("PED-REM-");
    expect(remessa.beneficiarioPais).toBe("Portugal");
    expect(remessa.moedaDestino).toBe("EUR");
    expect(Number(remessa.comissaoAoa)).toBeGreaterThanOrEqual(2500);
    expect(Number(remessa.totalAoa)).toBeGreaterThan(0);
    expect(remessa.estado).toBe("pendente_revisao");

    // Listar remessas
    const listaRemessasRes = await app.inject({
      method: "GET",
      url: "/api/v1/portal/pedidos/remessas",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listaRemessasRes.statusCode).toBe(200);
    expect(listaRemessasRes.json().total).toBe(1);
    expect(listaRemessasRes.json().dados[0].id).toBe(remessa.id);
  });
});
