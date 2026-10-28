import { decimal, D } from "@nzaidi/dominio";
import { ErroValidacao, ErroNaoEncontrado, ErroConflito } from "../../plugins/erros.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type { IntegracoesManuaisRepository } from "./integracoes-manuais.repository.js";
import type {
  CriarExecucaoManualDTO,
  ExecucaoIntegracaoManual,
  EstadoExecucaoManual,
} from "./integracoes-manuais.types.js";

export interface ContextoOperador {
  id: string;
  nome: string;
  funcao: string;
  ip?: string | null;
}

// Limiar regulamentar de teste para segregação de funções (princípio de quatro olhos)
const LIMIAR_APROVACAO_QUATRO_OLHOS_AOA = decimal("5000000.00");

export class IntegracoesManuaisService {
  constructor(
    private repo: IntegracoesManuaisRepository,
    private auditoriaRepo: AuditoriaRepository
  ) {}

  /**
   * Submete uma liquidação manual de integração externa.
   * Garante idempotência estrita e validação de referência externa por canal.
   */
  public registarExecucaoManual(
    dto: CriarExecucaoManualDTO,
    operador: ContextoOperador
  ): ExecucaoIntegracaoManual {
    // 1. Idempotência por chave
    const existentePorChave = this.repo.buscarPorChaveIdempotencia(dto.chaveIdempotencia);
    if (existentePorChave) {
      // Pedido idêntico retorna o registo existente sem duplicar efeitos
      return existentePorChave;
    }

    // 2. Prevenção de reutilização indevida de referência externa dentro do mesmo canal
    const existentePorRef = this.repo.buscarPorCanalEReferencia(
      dto.canalOrigem,
      dto.referenciaExterna
    );
    if (existentePorRef) {
      throw new ErroConflito(
        `A referência externa '${dto.referenciaExterna}' já foi utilizada no canal '${dto.canalOrigem}' (ID: ${existentePorRef.id}).`
      );
    }

    // 3. Validação do montante
    const valor = decimal(dto.valorMoeda);
    if (valor.lte(new D(0))) {
      throw new ErroValidacao("O montante da liquidação manual deve ser estritamente positivo.");
    }

    // 4. Avaliação de alçada e segregação de funções
    // Se a moeda for AOA e o valor >= 5.000.000 AOA, exige aprovação por segundo operador
    const exigeQuatroOlhos =
      dto.moeda === "AOA" && valor.gte(LIMIAR_APROVACAO_QUATRO_OLHOS_AOA);

    const estadoInicial: EstadoExecucaoManual = exigeQuatroOlhos ? "pendente" : "concluida";
    const aprovadorInicial = exigeQuatroOlhos ? undefined : { id: operador.id, nome: operador.nome };

    // 5. Criação do registo no repositório
    const execucao = this.repo.criar(dto, operador, estadoInicial, aprovadorInicial);

    // 6. Registo na pista de auditoria
    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "INTEGRACAO_MANUAL_REGISTADA",
      recurso: "execucoes_integracao_manual",
      recursoId: execucao.id,
      detalhes: {
        transacaoId: dto.transacaoId,
        tipoIntegracao: dto.tipoIntegracao,
        canalOrigem: dto.canalOrigem,
        referenciaExterna: dto.referenciaExterna,
        valorMoeda: dto.valorMoeda,
        moeda: dto.moeda,
        estado: estadoInicial,
        exigeQuatroOlhos,
      },
      ip: operador.ip,
    });

    return execucao;
  }

  /**
   * Aprova uma execução manual que requer segregação de funções.
   * O aprovador NÃO pode ser o mesmo operador que criou a liquidação.
   */
  public aprovarExecucaoManual(
    execucaoId: string,
    aprovador: ContextoOperador,
    notasAprovacao?: string
  ): ExecucaoIntegracaoManual {
    const execucao = this.repo.buscarPorId(execucaoId);
    if (!execucao) {
      throw new ErroNaoEncontrado(`Execução manual não encontrada com ID: ${execucaoId}`);
    }

    if (execucao.estado !== "pendente") {
      throw new ErroValidacao(
        `A execução manual ${execucaoId} não pode ser aprovada porque está no estado '${execucao.estado}'.`
      );
    }

    // Segregação estrita de funções: criador != aprovador
    if (execucao.operadorId === aprovador.id) {
      throw new ErroValidacao(
        "Violação de segregação de funções: o operador que submeteu a liquidação manual não pode ser o mesmo que a aprova."
      );
    }

    this.repo.atualizarEstado(execucaoId, "concluida", {
      id: aprovador.id,
      nome: aprovador.nome,
    });

    this.auditoriaRepo.registar({
      autorId: aprovador.id,
      autorNome: aprovador.nome,
      autorFuncao: aprovador.funcao,
      acao: "INTEGRACAO_MANUAL_APROVADA",
      recurso: "execucoes_integracao_manual",
      recursoId: execucaoId,
      detalhes: {
        transacaoId: execucao.transacaoId,
        referenciaExterna: execucao.referenciaExterna,
        canalOrigem: execucao.canalOrigem,
        notasAprovacao,
      },
      ip: aprovador.ip,
    });

    return this.repo.buscarPorId(execucaoId)!;
  }

  /**
   * Rejeita uma execução manual pendente.
   */
  public rejeitarExecucaoManual(
    execucaoId: string,
    operador: ContextoOperador,
    motivo: string
  ): ExecucaoIntegracaoManual {
    const execucao = this.repo.buscarPorId(execucaoId);
    if (!execucao) {
      throw new ErroNaoEncontrado(`Execução manual não encontrada com ID: ${execucaoId}`);
    }

    if (execucao.estado !== "pendente") {
      throw new ErroValidacao(
        `A execução manual ${execucaoId} não pode ser rejeitada porque está no estado '${execucao.estado}'.`
      );
    }

    this.repo.atualizarEstado(execucaoId, "rejeitada", {
      id: operador.id,
      nome: operador.nome,
    });

    this.auditoriaRepo.registar({
      autorId: operador.id,
      autorNome: operador.nome,
      autorFuncao: operador.funcao,
      acao: "INTEGRACAO_MANUAL_REJEITADA",
      recurso: "execucoes_integracao_manual",
      recursoId: execucaoId,
      detalhes: {
        transacaoId: execucao.transacaoId,
        motivo,
      },
      ip: operador.ip,
    });

    return this.repo.buscarPorId(execucaoId)!;
  }

  public buscarPorId(id: string): ExecucaoIntegracaoManual {
    const execucao = this.repo.buscarPorId(id);
    if (!execucao) {
      throw new ErroNaoEncontrado(`Execução manual não encontrada com ID: ${id}`);
    }
    return execucao;
  }

  public listar(limite = 50, offset = 0, estado?: EstadoExecucaoManual): ExecucaoIntegracaoManual[] {
    return this.repo.listar(limite, offset, estado);
  }
}
