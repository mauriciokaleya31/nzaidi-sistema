import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UsersRepository } from "./users.repository.js";
import type { SessionsRepository } from "./sessions.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { hashSenha, verificarSenha } from "./hash.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";
import { FUNCOES, type FuncaoUsuario } from "./matriz.js";

const CriarUsuarioSchema = z.object({
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Endereço de email inválido"),
  senha: z.string().min(10, "A palavra-passe deve ter no mínimo 10 caracteres"),
  funcao: z.enum(FUNCOES, {
    errorMap: () => ({ message: "Função inválida. Opções: atendente, compliance, tesouraria, gestao" }),
  }),
  telefone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

const AtualizarUsuarioAdminSchema = z.object({
  nome: z.string().min(3).optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  funcao: z.enum(FUNCOES).optional(),
});

const BloquearUsuarioSchema = z.object({
  motivo: z.string().min(5, "O motivo do bloqueio é obrigatório e deve ter pelo menos 5 caracteres"),
});

const ImpersonarUsuarioSchema = z.object({
  motivo: z.string().optional().default("Acesso administrativo de suporte técnico e verificação operacional"),
});

const AtualizarPerfilProprioSchema = z.object({
  nome: z.string().min(3).optional(),
  telefone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

const AlterarSenhaPropriaSchema = z.object({
  senhaAtual: z.string().min(1, "A palavra-passe atual é obrigatória"),
  novaSenha: z.string().min(10, "A nova palavra-passe deve ter no mínimo 10 caracteres"),
});

export function registrarRotasUsuarios(
  app: FastifyInstance,
  usersRepo: UsersRepository,
  sessionsRepo: SessionsRepository,
  auditoriaRepo: AuditoriaRepository
): void {
  // 1. Obter perfil do próprio utilizador logado
  app.get(
    "/api/v1/usuarios/me",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const completo = usersRepo.buscarPorId(usuarioLogado.id);
      if (!completo) {
        return reply.status(404).send({ sucesso: false, erro: "Utilizador não encontrado" });
      }

      const { senhaHash: _, ...dados } = completo;
      return reply.send({
        sucesso: true,
        dados,
      });
    }
  );

  // 2. Atualizar perfil do próprio utilizador (Self-Service)
  app.patch(
    "/api/v1/usuarios/me",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = AtualizarPerfilProprioSchema.parse(request.body);

      usersRepo.atualizarPerfil(usuarioLogado.id, {
        nome: dados.nome,
        telefone: dados.telefone,
        avatarUrl: dados.avatarUrl,
      });

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "PERFIL_ATUALIZADO",
        recurso: "usuarios",
        recursoId: usuarioLogado.id,
        detalhes: { camposAtualizados: Object.keys(dados) },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      const atualizado = usersRepo.buscarPorId(usuarioLogado.id);
      const { senhaHash: _, ...dadosSemSenha } = atualizado!;

      return reply.send({
        sucesso: true,
        mensagem: "Perfil atualizado com sucesso.",
        dados: dadosSemSenha,
      });
    }
  );

  // 3. Alterar senha própria
  app.post(
    "/api/v1/usuarios/me/senha",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = AlterarSenhaPropriaSchema.parse(request.body);

      const usuarioDb = usersRepo.buscarPorId(usuarioLogado.id);
      if (!usuarioDb) {
        return reply.status(404).send({ sucesso: false, erro: "Utilizador não encontrado" });
      }

      const senhaValida = await verificarSenha(dados.senhaAtual, usuarioDb.senhaHash);
      if (!senhaValida) {
        return reply.status(400).send({
          sucesso: false,
          codigo: "SENHA_ATUAL_INVALIDA",
          erro: "A palavra-passe atual indicada está incorreta.",
        });
      }

      const novaSenhaHash = await hashSenha(dados.novaSenha);
      usersRepo.atualizarSenha(usuarioLogado.id, novaSenhaHash);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "SENHA_ALTERADA",
        recurso: "usuarios",
        recursoId: usuarioLogado.id,
        detalhes: { alteradoPor: "self_service" },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.send({
        sucesso: true,
        mensagem: "Palavra-passe alterada com sucesso.",
      });
    }
  );

  // 4. Listar sessões ativas próprias
  app.get(
    "/api/v1/usuarios/me/sessoes",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const sessoes = sessionsRepo.listarSessoesAtivas(usuarioLogado.id);
      return reply.send({
        sucesso: true,
        dados: sessoes,
      });
    }
  );

  // 5. Encerrar sessão remota própria
  app.delete(
    "/api/v1/usuarios/me/sessoes/:sessaoId",
    { preHandler: [exigirAutenticacao] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { sessaoId } = request.params as { sessaoId: string };

      sessionsRepo.revogarSessao(sessaoId);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "SESSAO_REVOGADA_REMOTAMENTE",
        recurso: "sessoes",
        recursoId: sessaoId,
        detalhes: { revogadoPorUsuario: usuarioLogado.id },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.send({
        sucesso: true,
        mensagem: "Sessão revogada com sucesso.",
      });
    }
  );

  // 6. Listar Funcionários Internos (Gestão e Consulta)
  app.get(
    "/api/v1/usuarios",
    { preHandler: [exigirAutenticacao, exigirPermissao("usuarios:consultar")] },
    async (_request, reply) => {
      const lista = usersRepo.listar();
      return reply.status(200).send({
        sucesso: true,
        dados: lista,
      });
    }
  );

  // 7. Obter Detalhes Completos de um Utilizador (com Estatísticas e Sessões Ativas)
  app.get(
    "/api/v1/usuarios/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("usuarios:consultar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const detalhes = usersRepo.buscarDetalhesCompletos(id);

      if (!detalhes) {
        return reply.status(404).send({
          sucesso: false,
          codigo: "USUARIO_NAO_ENCONTRADO",
          erro: "Utilizador não encontrado no sistema.",
        });
      }

      const sessoesAtivas = sessionsRepo.listarSessoesAtivas(id);

      return reply.send({
        sucesso: true,
        dados: {
          ...detalhes,
          sessoesAtivas,
        },
      });
    }
  );

  // 8. Criar Novo Funcionário
  app.post(
    "/api/v1/usuarios",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = CriarUsuarioSchema.parse(request.body);

      const existente = usersRepo.buscarPorEmail(dados.email);
      if (existente) {
        return reply.status(409).send({
          sucesso: false,
          codigo: "EMAIL_JA_REGISTADO",
          erro: "Já existe um funcionário registado com este endereço de email.",
        });
      }

      const senhaHash = await hashSenha(dados.senha);
      const novoUsuario = usersRepo.criar({
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        funcao: dados.funcao as FuncaoUsuario,
        telefone: dados.telefone,
        avatarUrl: dados.avatarUrl,
      });

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "USUARIO_CRIADO",
        recurso: "usuarios",
        recursoId: novoUsuario.id,
        detalhes: {
          novoUsuarioId: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          funcao: novoUsuario.funcao,
        },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: `Funcionário ${novoUsuario.nome} (${novoUsuario.funcao}) registado com sucesso.`,
        dados: {
          id: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          funcao: novoUsuario.funcao,
          ativo: novoUsuario.ativo,
          criadoEm: novoUsuario.criadoEm,
        },
      });
    }
  );

  // 9. Atualizar Utilizador por Administrador
  app.patch(
    "/api/v1/usuarios/:id",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };
      const dados = AtualizarUsuarioAdminSchema.parse(request.body);

      const alvo = usersRepo.buscarPorId(id);
      if (!alvo) {
        return reply.status(404).send({
          sucesso: false,
          codigo: "USUARIO_NAO_ENCONTRADO",
          erro: "Utilizador não encontrado.",
        });
      }

      usersRepo.atualizarPerfil(id, dados);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "USUARIO_EDITADO_ADMIN",
        recurso: "usuarios",
        recursoId: id,
        detalhes: { dadosAtualizados: dados },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Dados de ${alvo.nome} atualizados com sucesso.`,
      });
    }
  );

  // 9.1 Alterar Status (Ativar/Desativar Funcionário)
  app.patch(
    "/api/v1/usuarios/:id/status",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };
      const { ativo } = z.object({ ativo: z.boolean() }).parse(request.body);

      if (id === usuarioLogado.id && !ativo) {
        return reply.status(400).send({
          sucesso: false,
          codigo: "OPERACAO_INVALIDA",
          erro: "Não é permitido desativar a própria conta de utilizador em sessão.",
        });
      }

      const alvo = usersRepo.buscarPorId(id);
      if (!alvo) {
        return reply.status(404).send({
          sucesso: false,
          codigo: "USUARIO_NAO_ENCONTRADO",
          erro: "Utilizador não encontrado no sistema.",
        });
      }

      usersRepo.atualizarStatus(id, ativo);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: ativo ? "USUARIO_ATIVADO" : "USUARIO_DESATIVADO",
        recurso: "usuarios",
        recursoId: id,
        detalhes: {
          alvoId: id,
          nome: alvo.nome,
          email: alvo.email,
          novoEstadoAtivo: ativo,
        },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.status(200).send({
        sucesso: true,
        mensagem: `Conta de ${alvo.nome} foi ${ativo ? "reativada" : "desativada"} com sucesso.`,
      });
    }
  );

  // 10. Bloquear Utilizador com Motivo Obrigatório
  app.post(
    "/api/v1/usuarios/:id/bloquear",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };
      const { motivo } = BloquearUsuarioSchema.parse(request.body);

      if (id === usuarioLogado.id) {
        return reply.status(400).send({
          sucesso: false,
          codigo: "AUTO_BLOQUEIO_PROIBIDO",
          erro: "Não é permitido bloquear a própria conta.",
        });
      }

      const alvo = usersRepo.buscarPorId(id);
      if (!alvo) {
        return reply.status(404).send({ sucesso: false, erro: "Utilizador não encontrado." });
      }

      usersRepo.bloquear(id, motivo);
      sessionsRepo.revogarTodasDoUsuario(id);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "USUARIO_BLOQUEADO",
        recurso: "usuarios",
        recursoId: id,
        detalhes: { motivo, alvoNome: alvo.nome, alvoEmail: alvo.email },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Utilizador ${alvo.nome} foi bloqueado com sucesso e as suas sessões foram encerradas.`,
      });
    }
  );

  // 11. Desbloquear Utilizador
  app.post(
    "/api/v1/usuarios/:id/desbloquear",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };

      const alvo = usersRepo.buscarPorId(id);
      if (!alvo) {
        return reply.status(404).send({ sucesso: false, erro: "Utilizador não encontrado." });
      }

      usersRepo.desbloquear(id);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "USUARIO_DESBLOQUEADO",
        recurso: "usuarios",
        recursoId: id,
        detalhes: { alvoNome: alvo.nome, alvoEmail: alvo.email },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Utilizador ${alvo.nome} foi desbloqueado com sucesso.`,
      });
    }
  );

  // 12. Terminar Todas as Sessões Ativas de um Utilizador
  app.post(
    "/api/v1/usuarios/:id/terminar-sessoes",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };

      const alvo = usersRepo.buscarPorId(id);
      if (!alvo) {
        return reply.status(404).send({ sucesso: false, erro: "Utilizador não encontrado." });
      }

      sessionsRepo.revogarTodasDoUsuario(id);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "SESSOES_ENCERRADAS_ADMIN",
        recurso: "usuarios",
        recursoId: id,
        detalhes: { alvoNome: alvo.nome, acao: "revogar_todas_sessoes" },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Todas as sessões ativas de ${alvo.nome} foram terminadas.`,
      });
    }
  );

  // 13. Entrar na Conta de Funcionário (Impersonação Administrativa com Auditoria)
  app.post(
    "/api/v1/usuarios/:id/impersonar",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };
      const { motivo } = ImpersonarUsuarioSchema.parse(request.body);

      if (id === usuarioLogado.id) {
        return reply.status(400).send({
          sucesso: false,
          codigo: "AUTO_IMPERSONACAO_INVALIDA",
          erro: "Não é necessário impersonar a sua própria conta ativa.",
        });
      }

      const alvo = usersRepo.buscarPorId(id);
      if (!alvo) {
        return reply.status(404).send({ sucesso: false, erro: "Utilizador não encontrado." });
      }

      if (!alvo.ativo) {
        return reply.status(400).send({
          sucesso: false,
          codigo: "USUARIO_INATIVO",
          erro: "Não é possível assumir a sessão de uma conta desativada ou bloqueada.",
        });
      }

      // Cria a sessão com impersonação rastreada
      const sessao = sessionsRepo.criarSessao(
        alvo.id,
        2, // TTL curto de 2 horas para suporte
        request.ip,
        request.headers["user-agent"] ?? null,
        usuarioLogado.id,
        usuarioLogado.nome
      );

      // Grava na tabela de auditoria de impersonação
      const impId = randomUUID();
      const agora = new Date().toISOString();
      const db = (usersRepo as any).db;
      db.prepare(`
        INSERT INTO impersonacoes_auditoria (id, admin_id, admin_nome, alvo_tipo, alvo_id, alvo_nome, motivo, iniciado_em, ip, user_agent)
        VALUES (?, ?, ?, 'usuario', ?, ?, ?, ?, ?, ?)
      `).run(impId, usuarioLogado.id, usuarioLogado.nome, alvo.id, alvo.nome, motivo, agora, request.ip, request.headers["user-agent"] ?? null);

      auditoriaRepo.registar({
        autorId: usuarioLogado.id,
        autorNome: usuarioLogado.nome,
        autorFuncao: usuarioLogado.funcao,
        acao: "IMPERSONACAO_INICIADA",
        recurso: "usuarios",
        recursoId: alvo.id,
        detalhes: {
          alvoId: alvo.id,
          alvoNome: alvo.nome,
          alvoFuncao: alvo.funcao,
          motivo,
          sessaoId: sessao.id,
        },
        ip: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });

      // Configura o cookie de sessão para o browser
      reply.setCookie("nzaidi_sessao", sessao.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env["NODE_ENV"] === "production",
        maxAge: 2 * 3600,
      });

      return reply.send({
        sucesso: true,
        mensagem: `Sessão de suporte iniciada para ${alvo.nome} (${alvo.funcao}).`,
        token: sessao.id,
        usuario: {
          id: alvo.id,
          nome: alvo.nome,
          email: alvo.email,
          funcao: alvo.funcao,
          impersonadoPor: usuarioLogado.nome,
        },
      });
    }
  );
}
