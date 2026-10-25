import type { FastifyRequest, FastifyReply } from "fastify";
import type { UsersRepository } from "../modules/autenticacao/users.repository.js";
import type { SessionsRepository } from "../modules/autenticacao/sessions.repository.js";
import { type FuncaoUsuario, type Permissao, usuarioTemPermissao } from "../modules/autenticacao/matriz.js";

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  funcao: FuncaoUsuario;
  sessaoId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    usuario?: UsuarioAutenticado | undefined;
  }
}

export function criarMiddlewareAutenticacao(
  usersRepo: UsersRepository,
  sessionsRepo: SessionsRepository
) {
  return async function autenticarOpcional(request: FastifyRequest, _reply: FastifyReply) {
    const cookieToken = request.cookies["nzaidi_sessao"];
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = cookieToken || bearerToken;

    if (!token) return;

    const sessao = sessionsRepo.buscarSessaoAtiva(token);
    if (!sessao) return;

    const usuario = usersRepo.buscarPorId(sessao.usuarioId);
    if (!usuario || !usuario.ativo) return;

    request.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      funcao: usuario.funcao,
      sessaoId: sessao.id,
    };
  };
}

export async function exigirAutenticacao(request: FastifyRequest, reply: FastifyReply) {
  if (!request.usuario) {
    return reply.status(401).send({
      sucesso: false,
      erro: "Autenticação obrigatória para aceder a este recurso.",
      codigo: "NAO_AUTENTICADO",
    });
  }
}

export function exigirPermissao(permissao: Permissao) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.usuario) {
      return reply.status(401).send({
        sucesso: false,
        erro: "Autenticação obrigatória.",
        codigo: "NAO_AUTENTICADO",
      });
    }

    if (!usuarioTemPermissao(request.usuario.funcao, permissao)) {
      return reply.status(403).send({
        sucesso: false,
        erro: `Acesso negado: a função '${request.usuario.funcao}' não possui a permissão '${permissao}'.`,
        codigo: "ACESSO_NEGADO",
      });
    }
  };
}
