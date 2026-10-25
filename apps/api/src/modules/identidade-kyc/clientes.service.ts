import { randomUUID } from "node:crypto";
import type { ClientesRepository } from "./clientes.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type { Cliente, CriarClienteInput, DecisaoKycInput, RegistoKyc } from "./clientes.types.js";
import { ErroValidacao, ErroNaoEncontrado, ErroConflito, ErroPermissao } from "../../plugins/erros.js";

export interface ContextoOperador {
  id: string;
  nome: string;
  funcao: string;
  ip?: string | null;
}

export class ClientesService {
  constructor(
    private clientesRepo: ClientesRepository,
    private auditoriaRepo: AuditoriaRepository
  ) {}

  public async criarCliente(dados: CriarClienteInput, operador: ContextoOperador): Promise<Cliente> {
    // 1. Deteção de duplicados
    const duplicadoDoc = this.clientesRepo.buscarPorDocumento(dados.tipoDocumento, dados.numeroDocumento);
    if (duplicadoDoc) {
      throw new ErroConflito(
        `Já existe um cliente registado com este ${dados.tipoDocumento.toUpperCase()}: ${dados.numeroDocumento}`,
        "CLIENTE_DUPLICADO"
      );
    }

    const agora = new Date().toISOString();
    const cliente: Cliente = {
      id: `cli_${randomUUID()}`,
      tipo: dados.tipo,
      nome: dados.nome.trim(),
      tipoDocumento: dados.tipoDocumento,
      numeroDocumento: dados.numeroDocumento.trim(),
      nif: dados.nif.trim(),
      nacionalidade: dados.nacionalidade.toUpperCase(),
      telefone: dados.telefone.trim(),
      email: dados.email ? dados.email.trim().toLowerCase() : null,
      morada: dados.morada.trim(),
      estado: "ativo",
      estadoKyc: "pendente",
      nivelRisco: "baixo",
      criadoEm: agora,
      atualizadoEm: agora,
    };

    this.clientesRepo.inserir(cliente);

    // Auditoria obrigatória
    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "CLIENTE_CRIAR",
      recurso: "clientes",
      recursoId: cliente.id,
      detalhes: {
        tipo: cliente.tipo,
        nome: cliente.nome,
        documento: cliente.tipoDocumento,
        nif: cliente.nif,
      },
      ip: operador.ip,
    });

    return cliente;
  }

  public buscarClientePorId(id: string): Cliente {
    const cliente = this.clientesRepo.buscarPorId(id);
    if (!cliente) {
      throw new ErroNaoEncontrado(`Cliente não encontrado com ID: ${id}`);
    }
    return cliente;
  }

  public listarClientes(
    busca?: string,
    estadoKyc?: string,
    limite = 50,
    offset = 0
  ): { itens: Cliente[]; total: number } {
    return this.clientesRepo.listar(busca, estadoKyc, limite, offset);
  }

  public processarDecisaoKyc(
    clienteId: string,
    dados: DecisaoKycInput,
    operador: ContextoOperador
  ): Cliente {
    const cliente = this.buscarClientePorId(clienteId);

    // Segregação de funções: apenas compliance e gestão aprovam/rejeitam KYC
    if (dados.estadoNovo === "aprovado" || dados.estadoNovo === "rejeitado") {
      if (operador.funcao !== "compliance" && operador.funcao !== "gestao") {
        throw new ErroPermissao("Apenas os perfis de Compliance e Gestão podem aprovar ou rejeitar KYC.");
      }
    }

    const agora = new Date().toISOString();
    const estadoAnterior = cliente.estadoKyc;

    this.clientesRepo.atualizarEstadoKyc(clienteId, dados.estadoNovo, dados.nivelRisco, agora);

    const registoKyc: RegistoKyc = {
      id: `kyc_${randomUUID()}`,
      clienteId,
      estadoAnterior,
      estadoNovo: dados.estadoNovo,
      nivelRisco: dados.nivelRisco,
      decididoPorId: operador.id,
      decididoPorNome: operador.nome,
      motivo: dados.motivo,
      momento: agora,
    };

    this.clientesRepo.inserirRegistoKyc(registoKyc);

    // Pista de auditoria regulatória
    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "KYC_DECISAO",
      recurso: "clientes",
      recursoId: clienteId,
      detalhes: {
        estadoAnterior,
        estadoNovo: dados.estadoNovo,
        nivelRisco: dados.nivelRisco,
        motivo: dados.motivo,
      },
      ip: operador.ip,
    });

    return {
      ...cliente,
      estadoKyc: dados.estadoNovo,
      nivelRisco: dados.nivelRisco,
      atualizadoEm: agora,
    };
  }

  public obterHistoricoKyc(clienteId: string): RegistoKyc[] {
    this.buscarClientePorId(clienteId);
    return this.clientesRepo.obterHistoricoKyc(clienteId);
  }
}
