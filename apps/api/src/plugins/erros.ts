import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { ErroDinheiro, ErroTaxa } from "@nzaidi/dominio";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly codigo: string,
    mensagem: string
  ) {
    super(mensagem);
    this.name = "AppError";
  }
}

export class ErroValidacao extends AppError {
  constructor(mensagem: string, codigo = "DADOS_INVALIDOS") {
    super(400, codigo, mensagem);
  }
}

export class ErroNaoEncontrado extends AppError {
  constructor(mensagem: string, codigo = "NAO_ENCONTRADO") {
    super(404, codigo, mensagem);
  }
}

export class ErroConflito extends AppError {
  constructor(mensagem: string, codigo = "CONFLITO") {
    super(409, codigo, mensagem);
  }
}

export class ErroAutenticacao extends AppError {
  constructor(mensagem = "Não autenticado", codigo = "NAO_AUTENTICADO") {
    super(401, codigo, mensagem);
  }
}

export class ErroPermissao extends AppError {
  constructor(mensagem: string, codigo = "ACESSO_NEGADO") {
    super(403, codigo, mensagem);
  }
}

export function registrarTratamentoErros(app: FastifyInstance, ehProducao = false): void {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // 0. Erros de Domínio da Aplicação (AppError)
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        sucesso: false,
        codigo: error.codigo,
        erro: error.message,
      });
    }

    // 1. Erro de Validação Zod
    if (error instanceof ZodError) {
      const detalhes = error.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensagem: issue.message,
      }));

      return reply.status(400).send({
        sucesso: false,
        codigo: "DADOS_INVALIDOS",
        erro: "Os dados submetidos não cumprem os requisitos de validação.",
        detalhes,
      });
    }

    // 2. Erros de Domínio Financeiro (@nzaidi/dominio)
    if (error instanceof ErroTaxa || error instanceof ErroDinheiro) {
      return reply.status(400).send({
        sucesso: false,
        codigo: "ERRO_REGRA_FINANCEIRA",
        erro: error.message,
      });
    }

    // 3. Rate Limit Excedido
    if (error.statusCode === 429) {
      return reply.status(429).send({
        sucesso: false,
        codigo: "LIMITE_EXCEDIDO",
        erro: "Demasiadas tentativas num curto período de tempo. Por favor, aguarde alguns minutos.",
      });
    }

    // 4. Erros internos do Servidor (500)
    request.log.error(
      {
        err: error.message,
        url: request.url,
        method: request.method,
      },
      "Erro interno não tratado"
    );

    const mensagem = ehProducao
      ? "Ocorreu um erro interno ao processar a operação. Contacte o suporte."
      : error.message;

    return reply.status(error.statusCode ?? 500).send({
      sucesso: false,
      codigo: "ERRO_INTERNO",
      erro: mensagem,
    });
  });
}
