import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UsersRepository } from "./users.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { hashSenha } from "./hash.js";
import { exigirAutenticacao, exigirPermissao } from "../../plugins/auth.plugin.js";
import { FUNCOES, type FuncaoUsuario } from "./matriz.js";

const CriarUsuarioSchema = z.object({
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Endereço de email inválido"),
  senha: z.string().min(10, "A palavra-passe deve ter no mínimo 10 caracteres"),
  funcao: z.enum(FUNCOES, {
    errorMap: () => ({ message: "Função inválida. Opções: atendente, compliance, tesouraria, gestao" }),
  }),
});

const AlterarStatusSchema = z.object({
  ativo: z.boolean(),
});

export function registrarRotasUsuarios(
  app: FastifyInstance,
  usersRepo: UsersRepository,
  auditoriaRepo: AuditoriaRepository
): void {
  // 1. Listar Funcionários Internos
  app.get(
    "/api/v1/usuarios",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (_request, reply) => {
      const lista = usersRepo.listar();
      return reply.status(200).send({
        sucesso: true,
        dados: lista,
      });
    }
  );

  // 2. Criar Novo Funcionário
  app.post(
    "/api/v1/usuarios",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const dados = CriarUsuarioSchema.parse(request.body);

      // Verificar se o email já existe
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

  // 3. Ativar/Desativar Funcionário
  app.patch(
    "/api/v1/usuarios/:id/status",
    { preHandler: [exigirAutenticacao, exigirPermissao("gerir_usuarios")] },
    async (request, reply) => {
      const usuarioLogado = request.usuario!;
      const { id } = request.params as { id: string };
      const { ativo } = AlterarStatusSchema.parse(request.body);

      // Não permitir desativar a própria conta
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
}
