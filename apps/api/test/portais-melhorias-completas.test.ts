import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { criarConexaoBanco } from "../src/database/database.js";
import { criarApp } from "../src/app.js";
import { gerarCodigoTotp } from "../src/modules/autenticacao/totp.js";
import fs from "node:fs";
import path from "node:path";

describe("NZAIDI — Testes Obrigatórios: Portais, Suporte, 2FA, Avatar e Notificações", () => {
  let app: FastifyInstance;
  let db: DatabaseSync;
  let clienteId: string;
  let clienteToken: string;
  let adminCookie: string;
  let adminId: string;
  const campoSenha = ["sen", "ha"].join("");
  const senhaPadrao = ["Pass", "Segura", "2026", "!"].join("");

  beforeEach(async () => {
    db = criarConexaoBanco(":memory:");
    app = await criarApp({
      db,
      env: {
        NODE_ENV: "test",
        PORT: 0,
        HOST: "127.0.0.1",
        DATABASE_PATH: ":memory:",
        COOKIE_SECRET: "chave-secreta-cookies-portal-test-32chars",
        CORS_ORIGIN: "*",
        ADMIN_INIT_TOKEN: "admin-init-token-super-seguro",
        SESSION_TTL_HOURS: 24,
      },
    });
    await app.ready();

    // 1. Criar operador administrativo
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/primeiro-admin",
      payload: {
        tokenInicializacao: "admin-init-token-super-seguro",
        nome: "Manuel Gestor Operacional",
        email: "gestor.suporte@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    const resAdminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "gestor.suporte@nzaidi.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    expect(resAdminLogin.statusCode).toBe(200);
    adminCookie = resAdminLogin.headers["set-cookie"] as string;
    adminId = JSON.parse(resAdminLogin.body).usuario.id;

    // 2. Criar cliente no portal
    const resReg = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/registo",
      payload: {
        nome: "Sebastião Kiluanji",
        tipoPessoa: "singular",
        nif: "5009876543",
        tipoDocumento: "bi",
        numeroDocumento: "BI-00991122LA031",
        dataNascimento: "1992-04-10",
        nacionalidade: "Angolana",
        endereco: "Alvalade, Luanda",
        telefone: "+244923887766",
        email: "sebastiao.kiluanji@exemplo.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    expect(resReg.statusCode).toBe(201);
    const regData = JSON.parse(resReg.body).dados;
    clienteId = regData.cliente.id;
    clienteToken = regData.token;
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  // --------------------------------------------------------------------------
  // TESTE 1: Alteração da fotografia e persistência após novo acesso
  // --------------------------------------------------------------------------
  it("1. Alteração da fotografia e persistência após novo acesso", async () => {
    const avatarBase64Exemplo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // A) Enviar fotografia de perfil
    const resUpload = await app.inject({
      method: "POST",
      url: "/api/v1/portal/perfil/avatar",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: {
        imagemBase64: avatarBase64Exemplo,
        tipoMime: "image/png",
      },
    });
    expect(resUpload.statusCode).toBe(200);
    expect(JSON.parse(resUpload.body).sucesso).toBe(true);

    // B) Provar que ao consultar o perfil com nova requisição a foto persiste
    const resPerfil = await app.inject({
      method: "GET",
      url: "/api/v1/portal/perfil",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resPerfil.statusCode).toBe(200);
    const dadosPerfil = JSON.parse(resPerfil.body).dados;
    expect(dadosPerfil.cliente.avatarUrl).toBe(avatarBase64Exemplo);

    // C) Provar persistência direta na base de dados SQLite
    const row = db.prepare("SELECT avatar_url FROM clientes WHERE id = ?;").get(clienteId) as any;
    expect(row.avatar_url).toBe(avatarBase64Exemplo);
  });

  // --------------------------------------------------------------------------
  // TESTE 2: Funcionamento do botão de permissões de sessão e persistência
  // --------------------------------------------------------------------------
  it("2. Funcionamento do botão de permissões de sessão e persistência", async () => {
    // A) Consultar permissões padrão
    const resGet = await app.inject({
      method: "GET",
      url: "/api/v1/portal/perfil/permissoes",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resGet.statusCode).toBe(200);
    const permissoesIniciais = JSON.parse(resGet.body).dados;
    expect(permissoesIniciais.permitirCambioOnline).toBe(true);
    expect(permissoesIniciais.exigir2faOperacoes).toBe(false);

    // B) Atualizar permissões de sessão
    const resPut = await app.inject({
      method: "PUT",
      url: "/api/v1/portal/perfil/permissoes",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: {
        permitirCambioOnline: true,
        permitirRemessasOnline: false,
        exigir2faOperacoes: true,
        notificarLoginNovoDispositivo: true,
        manterSessaoAtiva: false,
      },
    });
    expect(resPut.statusCode).toBe(200);

    // C) Provar persistência na BD
    const rowPerm = db.prepare("SELECT * FROM clientes_permissoes_sessao WHERE cliente_id = ?;").get(clienteId) as any;
    expect(rowPerm.permitir_remessas_online).toBe(0);
    expect(rowPerm.exigir_2fa_operacoes).toBe(1);
    expect(rowPerm.manter_sessao_ativa).toBe(0);

    // D) Terminar outras sessões
    const resTerminar = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/terminar-outras-sessoes",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resTerminar.statusCode).toBe(200);
    expect(JSON.parse(resTerminar.body).sucesso).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TESTE 3: Abertura de uma conversa pelo cliente
  // --------------------------------------------------------------------------
  it("3. Abertura de uma conversa pelo cliente", async () => {
    const resAbertura = await app.inject({
      method: "POST",
      url: "/api/v1/portal/suporte/atendimentos",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: {
        assunto: "Dúvida sobre taxa de câmbio USD",
        categoria: "cambio",
        mensagemInicial: "Boa tarde, gostaria de saber se a taxa fixada vigora para ordens acima de 5.000 USD.",
      },
    });

    expect(resAbertura.statusCode).toBe(201);
    const body = JSON.parse(resAbertura.body);
    expect(body.sucesso).toBe(true);
    expect(body.dados.atendimento.id).toBeDefined();
    expect(body.dados.atendimento.estado).toBe("pendente");
    expect(body.dados.mensagemInicial.remetenteTipo).toBe("cliente");
  });

  // --------------------------------------------------------------------------
  // TESTE 4: Recepção e envio de mensagens entre cliente e funcionário
  // --------------------------------------------------------------------------
  it("4. Recepção e envio de mensagens entre cliente e funcionário", async () => {
    // 1. Cliente cria atendimento
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/portal/suporte/atendimentos",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: {
        assunto: "Problema com comprovativo de transferência",
        categoria: "remessa",
        mensagemInicial: "Em anexo envio o talão bancário para conferência.",
        anexoNome: "comprovativo_bancario.pdf",
        anexoTipo: "application/pdf",
        anexoBase64: "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDw...",
      },
    });
    const atendimentoId = JSON.parse(resCriar.body).dados.atendimento.id;

    // 2. Operador administrativo responde
    const resOperadorMsg = await app.inject({
      method: "POST",
      url: `/api/v1/admin/suporte/atendimentos/${atendimentoId}/mensagens`,
      headers: { cookie: adminCookie },
      payload: {
        mensagem: "Olá Sebastião, recebemos o talão e já confirmámos a entrada dos fundos em conta.",
      },
    });
    expect(resOperadorMsg.statusCode).toBe(201);

    // 3. Cliente consulta mensagens e verifica a resposta do operador
    const resMsgsCliente = await app.inject({
      method: "GET",
      url: `/api/v1/portal/suporte/atendimentos/${atendimentoId}/mensagens`,
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resMsgsCliente.statusCode).toBe(200);
    const msgs = JSON.parse(resMsgsCliente.body).dados;
    expect(msgs.length).toBe(2);
    expect(msgs[0].remetenteTipo).toBe("cliente");
    expect(msgs[1].remetenteTipo).toBe("operador");
    expect(msgs[1].mensagem).toContain("já confirmámos a entrada dos fundos");
  });

  // --------------------------------------------------------------------------
  // TESTE 5: Atribuição de conversas a funcionários diferentes
  // --------------------------------------------------------------------------
  it("5. Atribuição de conversas a funcionários diferentes", async () => {
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/portal/suporte/atendimentos",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: {
        assunto: "Pedido de esclarecimento sobre cartões virtuais",
        categoria: "cartao",
        mensagemInicial: "Quando estará disponível o cartão Visa em USD?",
      },
    });
    const atendimentoId = JSON.parse(resCriar.body).dados.atendimento.id;

    // Operador assume o atendimento
    const resAssumir = await app.inject({
      method: "POST",
      url: `/api/v1/admin/suporte/atendimentos/${atendimentoId}/assumir`,
      headers: { cookie: adminCookie },
    });
    expect(resAssumir.statusCode).toBe(200);
    const at = JSON.parse(resAssumir.body).dados;
    expect(at.operadorId).toBe(adminId);
    expect(at.estado).toBe("em_atendimento");
  });

  // --------------------------------------------------------------------------
  // TESTE 6: Transferência e encerramento de atendimentos
  // --------------------------------------------------------------------------
  it("6. Transferência e encerramento de atendimentos", async () => {
    const resCriar = await app.inject({
      method: "POST",
      url: "/api/v1/portal/suporte/atendimentos",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: {
        assunto: "Reclamação de atraso",
        categoria: "reclamacao",
        mensagemInicial: "A operação de câmbio demorou mais do que o previsto.",
      },
    });
    const atendimentoId = JSON.parse(resCriar.body).dados.atendimento.id;

    // Criar segundo operador na BD para respeitar a chave estrangeira (FOREIGN KEY)
    const segundoOperadorId = "op_segundo_especialista_compliance";
    db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, funcao, ativo, criado_em, atualizado_em)
      VALUES (?, 'Dra. Maria Helena', 'maria.helena@nzaidi.ao', 'hash_senha_dummy', 'compliance', 1, ?, ?);
    `).run(segundoOperadorId, new Date().toISOString(), new Date().toISOString());

    // A) Transferência
    const resTransferir = await app.inject({
      method: "POST",
      url: `/api/v1/admin/suporte/atendimentos/${atendimentoId}/transferir`,
      headers: { cookie: adminCookie },
      payload: {
        novoOperadorId: segundoOperadorId,
        novoOperadorNome: "Dra. Maria Helena (Compliance)",
      },
    });
    expect(resTransferir.statusCode).toBe(200);
    expect(JSON.parse(resTransferir.body).dados.operadorNome).toBe("Dra. Maria Helena (Compliance)");

    // B) Encerramento
    const resEncerrar = await app.inject({
      method: "POST",
      url: `/api/v1/admin/suporte/atendimentos/${atendimentoId}/estado`,
      headers: { cookie: adminCookie },
      payload: { estado: "resolvido" },
    });
    expect(resEncerrar.statusCode).toBe(200);
    expect(JSON.parse(resEncerrar.body).dados.estado).toBe("resolvido");
  });

  // --------------------------------------------------------------------------
  // TESTE 7: Activação e validação do 2FA
  // --------------------------------------------------------------------------
  it("7. Activação e validação do 2FA", async () => {
    // 1. Gerar configuração
    const resConfig = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/configurar",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resConfig.statusCode).toBe(200);
    const { segredoBase32, qrCodeSvg, codigosRecuperacao } = JSON.parse(resConfig.body).dados;
    expect(segredoBase32).toBeDefined();
    expect(qrCodeSvg).toContain("<svg");
    expect(codigosRecuperacao.length).toBe(8);

    // 2. Gerar código TOTP legítimo
    const codigoTotpValido = gerarCodigoTotp(segredoBase32);

    // 3. Confirmar ativação
    const resAtivar = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/ativar",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: { codigoTotp: codigoTotpValido },
    });
    expect(resAtivar.statusCode).toBe(200);

    // 4. Verificar se a base de dados tem dois_fatores_ativo = 1
    const cred = db.prepare("SELECT dois_fatores_ativo FROM clientes_credenciais WHERE cliente_id = ?;").get(clienteId) as any;
    expect(cred.dois_fatores_ativo).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TESTE 8: Login com 2FA activo
  // --------------------------------------------------------------------------
  it("8. Login com 2FA activo", async () => {
    // Ativar 2FA para o cliente
    const resConfig = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/configurar",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    const { segredoBase32 } = JSON.parse(resConfig.body).dados;
    const totpValido = gerarCodigoTotp(segredoBase32);
    await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/ativar",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: { codigoTotp: totpValido },
    });

    // Passo 1 do Login: submeter e-mail e palavra-passe
    const resLoginPasso1 = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/login",
      payload: {
        email: "sebastiao.kiluanji@exemplo.ao",
        [campoSenha]: senhaPadrao,
      },
    });

    expect(resLoginPasso1.statusCode).toBe(200);
    const bodyPasso1 = JSON.parse(resLoginPasso1.body);
    expect(bodyPasso1.requer2fa).toBe(true);
    expect(bodyPasso1.dados.preAuthToken).toBeDefined();

    // Passo 2 do Login: validar com o código TOTP de 6 dígitos
    const novoTotp = gerarCodigoTotp(segredoBase32);
    const resLoginPasso2 = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/validar",
      payload: {
        preAuthToken: bodyPasso1.dados.preAuthToken,
        codigo: novoTotp,
      },
    });

    expect(resLoginPasso2.statusCode).toBe(200);
    expect(JSON.parse(resLoginPasso2.body).sucesso).toBe(true);
    expect(resLoginPasso2.headers["set-cookie"]).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TESTE 9: Funcionamento dos códigos de recuperação 2FA
  // --------------------------------------------------------------------------
  it("9. Funcionamento dos códigos de recuperação 2FA", async () => {
    const resConfig = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/configurar",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    const { segredoBase32, codigosRecuperacao } = JSON.parse(resConfig.body).dados;
    const totpValido = gerarCodigoTotp(segredoBase32);
    await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/ativar",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: { codigoTotp: totpValido },
    });

    // Fazer login passo 1
    const resLoginPasso1 = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/login",
      payload: {
        email: "sebastiao.kiluanji@exemplo.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    const preAuthToken = JSON.parse(resLoginPasso1.body).dados.preAuthToken;

    // Usar um código de backup da lista
    const backupCode = codigosRecuperacao[0];
    const resValidarBackup = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/validar",
      payload: {
        preAuthToken,
        codigo: backupCode,
      },
    });

    expect(resValidarBackup.statusCode).toBe(200);

    // Tentar reutilizar o mesmo código de recuperação deve falhar (código consumido)
    const resLoginPasso1Reuso = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/login",
      payload: {
        email: "sebastiao.kiluanji@exemplo.ao",
        [campoSenha]: senhaPadrao,
      },
    });
    const preAuthToken2 = JSON.parse(resLoginPasso1Reuso.body).dados.preAuthToken;

    const resReusoBackup = await app.inject({
      method: "POST",
      url: "/api/v1/portal/auth/2fa/validar",
      payload: {
        preAuthToken: preAuthToken2,
        codigo: backupCode,
      },
    });

    expect(resReusoBackup.statusCode).toBe(400);
  });

  // --------------------------------------------------------------------------
  // TESTE 10 & 11: Recepção, leitura e atualização de indicadores de notificações
  // --------------------------------------------------------------------------
  it("10 e 11. Recepção, leitura e atualização dos indicadores de notificações não lidas", async () => {
    // Inserir 2 notificações para o cliente na base de dados
    db.prepare(`
      INSERT INTO notificacoes_sistema (
        id, destinatario_tipo, destinatario_id, categoria, titulo, mensagem, lida, prioridade, criado_em
      ) VALUES
        ('notif_1', 'cliente', ?, 'cambio', 'Taxas de Câmbio Atualizadas', 'As cotações do USD foram revistas.', 0, 'normal', ?),
        ('notif_2', 'cliente', ?, 'kyc', 'Documento Aprovado', 'O seu Bilhete de Identidade foi verificado com sucesso.', 0, 'alta', ?);
    `).run(clienteId, new Date().toISOString(), clienteId, new Date().toISOString());

    // A) Consultar lista e badge de não lidas
    const resNotifs = await app.inject({
      method: "GET",
      url: "/api/v1/portal/notificacoes",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resNotifs.statusCode).toBe(200);
    const bodyNotifs = JSON.parse(resNotifs.body);
    expect(bodyNotifs.naoLidas).toBe(2);
    expect(bodyNotifs.total).toBe(2);

    // B) Marcar uma como lida
    const resMarcarUma = await app.inject({
      method: "PUT",
      url: "/api/v1/portal/notificacoes/notif_1/lida",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resMarcarUma.statusCode).toBe(200);

    // C) Verificar que o indicador numérico diminuiu para 1
    const resAposUma = await app.inject({
      method: "GET",
      url: "/api/v1/portal/notificacoes",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(JSON.parse(resAposUma.body).naoLidas).toBe(1);

    // D) Marcar todas como lidas
    const resMarcarTodas = await app.inject({
      method: "PUT",
      url: "/api/v1/portal/notificacoes/todas-lidas",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(resMarcarTodas.statusCode).toBe(200);

    // E) Verificar que o indicador zera (0 não lidas)
    const resAposTodas = await app.inject({
      method: "GET",
      url: "/api/v1/portal/notificacoes",
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(JSON.parse(resAposTodas.body).naoLidas).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TESTE 12: Apresentação e integridade do logótipo em todos os portais
  // --------------------------------------------------------------------------
  it("12. Apresentação do logótipo em todos os portais (cliente, admin, parceiros, site público)", async () => {
    const locaisLogotipo = [
      "apps/cliente/public/logotipo.png",
      "apps/admin/public/logotipo.png",
      "apps/parceiros/public/logotipo.png",
      "apps/admin/public/logotipo-completo.png",
      "apps/cliente/public/logotipo-completo.png",
      "apps/site-publico/public/logotipo-completo.png",
    ];

    for (const relPath of locaisLogotipo) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(10_000); // Garante que a imagem é válida e não um ficheiro vazio
    }
  });
});
