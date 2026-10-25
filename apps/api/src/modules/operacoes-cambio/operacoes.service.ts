import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  decimal,
  D,
  type Decimal,
  criarCotacao,
  estaValida,
  kwanzasAoVenderDivisa,
  kwanzasParaComprarDivisa,
  type TaxasCalculadas,
} from "@nzaidi/dominio";
import type { OperacoesRepository } from "./operacoes.repository.js";
import type { ClientesRepository } from "../identidade-kyc/clientes.repository.js";
import type { CaixaRepository } from "../contabilidade-tesouraria/caixa.repository.js";
import type { TaxasService } from "../taxas-cambio/taxas.service.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type {
  OperacaoCambio,
  Bordero,
  CriarOperacaoInput,
  EstornarOperacaoInput,
} from "./operacoes.types.js";
import {
  ErroValidacao,
  ErroNaoEncontrado,
  ErroPermissao,
} from "../../plugins/erros.js";
import { comTransacao } from "../../database/database.js";

export interface ContextoOperador {
  id: string;
  nome: string;
  funcao: string;
  ip?: string | null;
}

export class OperacoesService {
  constructor(
    private db: DatabaseSync,
    private operacoesRepo: OperacoesRepository,
    private clientesRepo: ClientesRepository,
    private caixaRepo: CaixaRepository,
    private taxasService: TaxasService,
    private auditoriaRepo: AuditoriaRepository
  ) {}

  public async criarOperacao(
    dados: CriarOperacaoInput,
    operador: ContextoOperador
  ): Promise<{ operacao: OperacaoCambio; bordero: Bordero }> {
    // 1. Idempotência: se a operação já foi processada, retorna-a sem duplicar
    if (dados.chaveIdempotencia) {
      const existente = this.operacoesRepo.buscarPorChaveIdempotencia(dados.chaveIdempotencia);
      if (existente) {
        const borderoExistente = this.operacoesRepo.buscarBorderoPorOperacaoId(existente.id);
        if (borderoExistente) {
          return { operacao: existente, bordero: borderoExistente };
        }
      }
    }

    // 2. Validação do Cliente e Conformidade KYC
    const cliente = this.clientesRepo.buscarPorId(dados.clienteId);
    if (!cliente) {
      throw new ErroNaoEncontrado(`Cliente não encontrado com ID: ${dados.clienteId}`);
    }
    if (cliente.estado !== "ativo") {
      throw new ErroValidacao("O cadastro deste cliente encontra-se inativo ou bloqueado.");
    }
    if (cliente.estadoKyc !== "aprovado") {
      throw new ErroValidacao(
        `Operação cambial recusada: O cliente possui diligência KYC '${cliente.estadoKyc}'. Apenas clientes com KYC 'aprovado' podem realizar operações cambiais.`
      );
    }

    // 3. Validação do Caixa Ativo do Operador
    const caixa = this.caixaRepo.buscarCaixaAbertoPorOperador(operador.id);
    if (!caixa) {
      throw new ErroValidacao(
        "O operador não possui nenhum caixa aberto no momento. Abra um caixa antes de efetuar operações de balcão."
      );
    }

    // 4. Validação da Taxa de Câmbio e da Cotação (Regra dos 90 Segundos)
    const cotacaoMomento = new Date(dados.cotacaoCriadaEm);
    if (isNaN(cotacaoMomento.getTime())) {
      throw new ErroValidacao("Carimbo de data da cotação inválido.");
    }

    const taxaConfig = this.taxasService.obterTaxaCalculada(dados.moedaDivisa);
    const taxasCalculadas: TaxasCalculadas = {
      moeda: dados.moedaDivisa,
      referencia: decimal(taxaConfig.referencia),
      compra: decimal(taxaConfig.compra),
      venda: decimal(taxaConfig.venda),
    };

    const taxaAplicadaDecimal = dados.tipo === "compra" ? taxasCalculadas.compra : taxasCalculadas.venda;

    // Cria cotação com a taxa oficial e valida expiração (90s)
    const cotacao = criarCotacao(taxaAplicadaDecimal, cotacaoMomento, 90);
    const agora = new Date();
    if (!estaValida(cotacao, agora)) {
      throw new ErroValidacao(
        "A cotação de 90 segundos expirou. Por favor efetue uma nova simulação para obter a cotação em vigor."
      );
    }

    // 5. Cálculo Financeiro Rigoroso com @nzaidi/dominio
    const montanteDivisaDec = decimal(dados.montanteDivisa);
    if (montanteDivisaDec.lessThanOrEqualTo(0)) {
      throw new ErroValidacao("O montante da divisa tem de ser superior a zero.");
    }

    let montanteAoaDec: Decimal;
    let margemAplicada: string;

    if (dados.tipo === "compra") {
      // Cliente entrega divisa, NZAIDI entrega Kwanza
      montanteAoaDec = kwanzasAoVenderDivisa(taxasCalculadas, dados.montanteDivisa);
      margemAplicada = taxaConfig.margemCompra;
    } else {
      // Cliente entrega Kwanza, NZAIDI entrega divisa
      montanteAoaDec = kwanzasParaComprarDivisa(taxasCalculadas, dados.montanteDivisa);
      margemAplicada = taxaConfig.margemVenda;
    }

    // 6. Verificação de Saldo Suficiente em Caixa
    const saldos = this.caixaRepo.calcularSaldos(caixa);

    if (dados.tipo === "compra") {
      // NZAIDI tem de pagar montanteAoa ao cliente
      const saldoAoaDisponivel = decimal(saldos.AOA.saldoEsperado);
      if (montanteAoaDec.greaterThan(saldoAoaDisponivel)) {
        throw new ErroValidacao(
          `Saldo insuficiente em Kwanza (AOA) no caixa para liquidar a operação. Necessário: ${montanteAoaDec.toFixed(2)} AOA, Disponível: ${saldoAoaDisponivel.toFixed(2)} AOA`
        );
      }
    } else {
      // NZAIDI tem de entregar divisa (USD/EUR) ao cliente
      const saldoDivisaDisponivel = decimal(saldos[dados.moedaDivisa].saldoEsperado);
      if (montanteDivisaDec.greaterThan(saldoDivisaDisponivel)) {
        throw new ErroValidacao(
          `Saldo insuficiente em ${dados.moedaDivisa} no caixa para liquidar a operação. Necessário: ${montanteDivisaDec.toFixed(2)} ${dados.moedaDivisa}, Disponível: ${saldoDivisaDisponivel.toFixed(2)} ${dados.moedaDivisa}`
        );
      }
    }

    // 7. Persistência Atómica (Operação + Movimentos Caixa + Borderô + Auditoria)
    const agoraIso = agora.toISOString();
    const dataNum = agoraIso.slice(0, 10).replace(/-/g, "");
    const timeNum = agoraIso.slice(11, 19).replace(/:/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    const operacaoId = `op_${randomUUID()}`;
    const numeroOperacao = `OP-${dataNum}-${timeNum}-${randomSuffix}`;
    const numeroBordero = `BOR-${dataNum}-${timeNum}-${randomSuffix}`;

    const operacao: OperacaoCambio = {
      id: operacaoId,
      numeroOperacao,
      chaveIdempotencia: dados.chaveIdempotencia,
      clienteId: cliente.id,
      caixaId: caixa.id,
      tipo: dados.tipo,
      moedaDivisa: dados.moedaDivisa,
      montanteDivisa: montanteDivisaDec.toFixed(2),
      taxaAplicada: taxaAplicadaDecimal.toFixed(4),
      taxaReferenciaBna: taxasCalculadas.referencia.toFixed(4),
      margemAplicada,
      montanteAoa: montanteAoaDec.toFixed(2),
      fonteTaxa: taxaConfig.fonte,
      estado: "confirmada",
      operadorId: operador.id,
      operadorNome: operador.nome,
      criadoEm: agoraIso,
    };

    // Hash de verificação criptográfica SHA-256 para inviolabilidade do borderô
    const dadosParaHash = `${numeroBordero}|${numeroOperacao}|${cliente.id}|${operacao.tipo}|${operacao.moedaDivisa}|${operacao.montanteDivisa}|${operacao.montanteAoa}|${operacao.taxaAplicada}|${operador.id}|${agoraIso}`;
    const hashVerificacao = createHash("sha256").update(dadosParaHash).digest("hex");

    const bordero: Bordero = {
      id: `bor_${randomUUID()}`,
      numeroBordero,
      operacaoId,
      clienteNome: cliente.nome,
      clienteDocumento: `${cliente.tipoDocumento.toUpperCase()}: ${cliente.numeroDocumento}`,
      clienteNif: cliente.nif,
      tipoOperacao: operacao.tipo,
      moedaDivisa: operacao.moedaDivisa,
      montanteDivisa: operacao.montanteDivisa,
      taxaCambio: operacao.taxaAplicada,
      totalAoa: operacao.montanteAoa,
      operadorNome: operador.nome,
      emitidoEm: agoraIso,
      hashVerificacao,
    };

    return comTransacao(this.db, () => {
      // 7.1 Grava operação
      this.operacoesRepo.inserirOperacao(operacao);

      // 7.2 Movimentos de caixa de contrapartida
      if (operacao.tipo === "compra") {
        // Entrada de divisa no caixa (+divisa)
        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: caixa.id,
          tipo: "cambio_entrada",
          moeda: operacao.moedaDivisa,
          montante: operacao.montanteDivisa,
          operacaoId: operacao.id,
          descricao: `Compra de câmbio (${operacao.numeroOperacao}) - Entrada ${operacao.moedaDivisa}`,
          criadoEm: agoraIso,
          operadorId: operador.id,
        });

        // Saída de Kwanza do caixa (-AOA)
        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: caixa.id,
          tipo: "cambio_saida",
          moeda: "AOA",
          montante: new D(operacao.montanteAoa).negated().toFixed(2),
          operacaoId: operacao.id,
          descricao: `Pagamento de câmbio (${operacao.numeroOperacao}) - Saída AOA`,
          criadoEm: agoraIso,
          operadorId: operador.id,
        });
      } else {
        // Venda: Entrada de Kwanza no caixa (+AOA)
        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: caixa.id,
          tipo: "cambio_entrada",
          moeda: "AOA",
          montante: operacao.montanteAoa,
          operacaoId: operacao.id,
          descricao: `Recebimento de câmbio (${operacao.numeroOperacao}) - Entrada AOA`,
          criadoEm: agoraIso,
          operadorId: operador.id,
        });

        // Saída de divisa do caixa (-divisa)
        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: caixa.id,
          tipo: "cambio_saida",
          moeda: operacao.moedaDivisa,
          montante: new D(operacao.montanteDivisa).negated().toFixed(2),
          operacaoId: operacao.id,
          descricao: `Entrega de divisa (${operacao.numeroOperacao}) - Saída ${operacao.moedaDivisa}`,
          criadoEm: agoraIso,
          operadorId: operador.id,
        });
      }

      // 7.3 Emissão do borderô
      this.operacoesRepo.inserirBordero(bordero);

      // 7.4 Registo indelével na auditoria
      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "OPERACAO_CAMBIO_CONFIRMADA",
        recurso: "operacoes_cambio",
        recursoId: operacao.id,
        detalhes: {
          numeroOperacao: operacao.numeroOperacao,
          numeroBordero: bordero.numeroBordero,
          cliente: cliente.nome,
          tipo: operacao.tipo,
          divisa: operacao.moedaDivisa,
          montanteDivisa: operacao.montanteDivisa,
          montanteAoa: operacao.montanteAoa,
          taxa: operacao.taxaAplicada,
          caixa: caixa.numeroCaixa,
        },
        ip: operador.ip,
      });

      return { operacao, bordero };
    });
  }

  public buscarOperacaoPorId(id: string): { operacao: OperacaoCambio; bordero: Bordero | null } {
    const operacao = this.operacoesRepo.buscarPorId(id);
    if (!operacao) {
      throw new ErroNaoEncontrado(`Operação não encontrada: ${id}`);
    }
    const bordero = this.operacoesRepo.buscarBorderoPorOperacaoId(id);
    return { operacao, bordero };
  }

  public listarOperacoes(
    limite = 50,
    offset = 0,
    clienteId?: string,
    caixaId?: string
  ): { itens: OperacaoCambio[]; total: number } {
    return this.operacoesRepo.listarOperacoes(limite, offset, clienteId, caixaId);
  }

  public estornarOperacao(
    operacaoId: string,
    dados: EstornarOperacaoInput,
    operador: ContextoOperador
  ): OperacaoCambio {
    if (operador.funcao !== "gestao" && operador.funcao !== "tesouraria") {
      throw new ErroPermissao("Apenas os perfis de Gestão e Tesouraria podem efetuar estorno de operações.");
    }

    const { operacao } = this.buscarOperacaoPorId(operacaoId);
    if (operacao.estado !== "confirmada") {
      throw new ErroValidacao(`A operação já se encontra ${operacao.estado}. Não pode ser estornada.`);
    }

    const agora = new Date().toISOString();

    return comTransacao(this.db, () => {
      // 1. Marca operação como estornada
      this.operacoesRepo.estornarOperacao(operacaoId, dados.motivo, agora, operador.id);

      // 2. Movimentos compensatórios de estorno no caixa
      if (operacao.tipo === "compra") {
        // Estorno da compra: sai a divisa (-divisa) e devolve-se o Kwanza (+AOA)
        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: operacao.caixaId,
          tipo: "sangria",
          moeda: operacao.moedaDivisa,
          montante: new D(operacao.montanteDivisa).negated().toFixed(2),
          operacaoId: operacao.id,
          descricao: `Estorno de compra (${operacao.numeroOperacao}) - Reversão divisa`,
          criadoEm: agora,
          operadorId: operador.id,
        });

        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: operacao.caixaId,
          tipo: "suprimento",
          moeda: "AOA",
          montante: operacao.montanteAoa,
          operacaoId: operacao.id,
          descricao: `Estorno de compra (${operacao.numeroOperacao}) - Reversão Kwanza`,
          criadoEm: agora,
          operadorId: operador.id,
        });
      } else {
        // Estorno da venda: devolve-se a divisa (+divisa) e sai o Kwanza (-AOA)
        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: operacao.caixaId,
          tipo: "suprimento",
          moeda: operacao.moedaDivisa,
          montante: operacao.montanteDivisa,
          operacaoId: operacao.id,
          descricao: `Estorno de venda (${operacao.numeroOperacao}) - Reversão divisa`,
          criadoEm: agora,
          operadorId: operador.id,
        });

        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: operacao.caixaId,
          tipo: "sangria",
          moeda: "AOA",
          montante: new D(operacao.montanteAoa).negated().toFixed(2),
          operacaoId: operacao.id,
          descricao: `Estorno de venda (${operacao.numeroOperacao}) - Reversão Kwanza`,
          criadoEm: agora,
          operadorId: operador.id,
        });
      }

      // 3. Auditoria
      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "OPERACAO_CAMBIO_ESTORNADA",
        recurso: "operacoes_cambio",
        recursoId: operacao.id,
        detalhes: {
          numeroOperacao: operacao.numeroOperacao,
          motivo: dados.motivo,
        },
        ip: operador.ip,
      });

      return this.operacoesRepo.buscarPorId(operacaoId)!;
    });
  }
}
