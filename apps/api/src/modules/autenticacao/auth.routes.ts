import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UsersRepository } from "./users.repository.js";
import type { SessionsRepository } from "./sessions.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { hashSenha, verificarSenha } from "./hash.js";
import { exigirAutenticacao } from "../../plugins/auth.plugin.js";
import { MATRIZ_PERMISSOES } from "./matriz.js";

const LoginSchema = z.object({
  email: z.string().email("Endereço de email inválido"),
  senha: z.string().min(1, "A palavra-passe é obrigatória"),
});

const PrimeiroAdminSchema = z.object({
  tokenInicializacao: z.string().min(1, "O token de inicialização é obrigatório"),
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Endereço de email inválido"),
  senha: z.string().min(10, "A palavra-passe deve ter no mínimo 10 caracteres"),
});

export function registrarRotasAuth(
  app: FastifyInstance,
  usersRepo: UsersRepository,
  sessionsRepo: SessionsRepository,
  auditoriaRepo: AuditoriaRepository,
  tokenAdminEsperado: string,
  sessionTtlHoras: number
): void {
  // 1. Login
  app.post("/api/v1/auth/login", async (request, reply) => {
    const dados = LoginSchema.parse(request.body);
    const ip = request.ip;
    const userAgent = request.headers["user-agent"] ?? null;

    const usuario = usersRepo.buscarPorEmail(dados.email);

    // Proteção contra enumeração: mesmo tempo de resposta simulado
    if (!usuario) {
      // Hash dummy para mitigar timing attack
      await verificarSenha("dummy-password", "$scrypt$16384$8$1$0000$0000");
      auditoriaRepo.registar({
        acao: "LOGIN_FALHADO",
        recurso: "auth",
        detalhes: { motivo: "Utilizador não encontrado", emailTentativa: dados.email },
        ip,
        userAgent,
      });

      return reply.status(401).send({
        sucesso: false,
        codigo: "CREDENCIAS_INVALIDAS",
        erro: "Email ou palavra-passe incorretos.",
      });
    }

    if (!usuario.ativo) {
      auditoriaRepo.registar({
        autorId: usuario.id,
        autorNome: usuario.nome,
        acao: "LOGIN_BLOQUEADO",
        recurso: "auth",
        detalhes: { motivo: "Conta desativada" },
        ip,
        userAgent,
      });

      return reply.status(403).send({
        sucesso: false,
        codigo: "CONTA_DESATIVADA",
        erro: "Esta conta de utilizador encontra-se desativada. Contacte a gestão.",
      });
    }

    const senhaCorreta = await verificarSenha(dados.senha, usuario.senhaHash);
    if (!senhaCorreta) {
      auditoriaRepo.registar({
        autorId: usuario.id,
        autorNome: usuario.nome,
        acao: "LOGIN_FALHADO",
        recurso: "auth",
        detalhes: { motivo: "Palavra-passe incorreta" },
        ip,
        userAgent,
      });

      return reply.status(401).send({
        sucesso: false,
        codigo: "CREDENCIAS_INVALIDAS",
        erro: "Email ou palavra-passe incorretos.",
      });
    }

    // Criar Sessão Segura
    const sessao = sessionsRepo.criarSessao(usuario.id, sessionTtlHoras, ip, userAgent);
    usersRepo.atualizarUltimoLogin(usuario.id);

    auditoriaRepo.registar({
      autorId: usuario.id,
      autorNome: usuario.nome,
      autorFuncao: usuario.funcao,
      acao: "LOGIN_SUCESSO",
      recurso: "auth",
      recursoId: sessao.id,
      ip,
      userAgent,
    });

    const ehProducao = process.env["NODE_ENV"] === "production";

    reply.setCookie("nzaidi_sessao", sessao.id, {
      path: "/",
      httpOnly: true,
      secure: ehProducao,
      sameSite: "lax",
      maxAge: sessionTtlHoras * 3600,
      signed: false,
    });

    return reply.status(200).send({
      sucesso: true,
      mensagem: "Autenticação realizada com sucesso.",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        funcao: usuario.funcao,
        permissoes: MATRIZ_PERMISSOES[usuario.funcao],
      },
      sessao: {
        token: sessao.id,
        expiraEm: sessao.expiraEm,
      },
    });
  });

  // 2. Logout
  app.post("/api/v1/auth/logout", { preHandler: [exigirAutenticacao] }, async (request, reply) => {
    const usuario = request.usuario!;
    sessionsRepo.revogarSessao(usuario.sessaoId);

    auditoriaRepo.registar({
      autorId: usuario.id,
      autorNome: usuario.nome,
      autorFuncao: usuario.funcao,
      acao: "LOGOUT",
      recurso: "auth",
      recursoId: usuario.sessaoId,
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null,
    });

    reply.clearCookie("nzaidi_sessao", { path: "/" });

    return reply.status(200).send({
      sucesso: true,
      mensagem: "Sessão encerrada com sucesso.",
    });
  });

  // 3. Me (dados da sessão atual)
  app.get("/api/v1/auth/me", { preHandler: [exigirAutenticacao] }, async (request, reply) => {
    const usuario = request.usuario!;

    return reply.status(200).send({
      sucesso: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        funcao: usuario.funcao,
        permissoes: MATRIZ_PERMISSOES[usuario.funcao],
      },
    });
  });

  // 4. Criação Segura do Primeiro Administrador (Bootstrap inicial)
  app.post("/api/v1/auth/primeiro-admin", async (request, reply) => {
    // Se já existirem utilizadores, este endpoint fica permanentemente bloqueado
    const total = usersRepo.totalUsuarios();
    if (total > 0) {
      return reply.status(403).send({
        sucesso: false,
        codigo: "INICIALIZACAO_JA_CONCLUIDA",
        erro: "O sistema já possui utilizadores registados. O registo inicial encontra-se desativado.",
      });
    }

    const dados = PrimeiroAdminSchema.parse(request.body);

    if (dados.tokenInicializacao !== tokenAdminEsperado) {
      auditoriaRepo.registar({
        acao: "TENTATIVA_INICIALIZACAO_FALHADA",
        recurso: "bootstrap",
        detalhes: { motivo: "Token de inicialização inválido" },
        ip: request.ip,
      });

      return reply.status(401).send({
        sucesso: false,
        codigo: "TOKEN_INVALIDO",
        erro: "Token de inicialização administrativa incorreto.",
      });
    }

    const hash = await hashSenha(dados.senha);
    const novoAdmin = usersRepo.criar({
      nome: dados.nome,
      email: dados.email,
      senhaHash: hash,
      funcao: "gestao", // Função administrativa máxima
    });

    auditoriaRepo.registar({
      autorId: novoAdmin.id,
      autorNome: novoAdmin.nome,
      autorFuncao: novoAdmin.funcao,
      acao: "PRIMEIRO_ADMIN_CRIADO",
      recurso: "usuarios",
      recursoId: novoAdmin.id,
      detalhes: { email: novoAdmin.email },
      ip: request.ip,
    });

    return reply.status(201).send({
      sucesso: true,
      mensagem: "Primeiro administrador de Gestão criado com sucesso. O endpoint inicial foi desativado.",
      admin: {
        id: novoAdmin.id,
        nome: novoAdmin.nome,
        email: novoAdmin.email,
        funcao: novoAdmin.funcao,
      },
    });
  });
}
