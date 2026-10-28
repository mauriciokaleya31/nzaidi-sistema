import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { decimal, D } from "@nzaidi/dominio";
import type { RemessasRepository } from "./remessas.repository.js";
import type { ClientesRepository } from "../identidade-kyc/clientes.repository.js";
import type { CaixaRepository } from "../contabilidade-tesouraria/caixa.repository.js";
import type { TaxasService } from "../taxas-cambio/taxas.service.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type {
  Remessa,
  CriarRemessaInput,
  CancelarRemessaInput,
  ParceiroRemessaAdapter,
  ParceiroRemessa,
} from "./remessas.types.js";
import {
  MaxPaySimuladoAdapter,
  RealtransfersSimuladoAdapter,
} from "./adaptadores/parceiros.simulados.js";
import {
  ErroValidacao,
  ErroNaoEncontrado,
  ErroPermissao,
} from "../../plugins/erros.js";
import { comTransacao, proximoNumeroSequencial } from "../../database/database.js";

export interface ContextoOperador {
  id: string;
  nome: string;
  funcao: string;
  ip?: string | null;
}

export class RemessasService {
  private adaptadores: Map<ParceiroRemessa, ParceiroRemessaAdapter>;

  constructor(
    private db: DatabaseSync,
    private remessasRepo: RemessasRepository,
    private clientesRepo: ClientesRepository,
    private caixaRepo: CaixaRepository,
    private taxasService: TaxasService,
    private auditoriaRepo: AuditoriaRepository
  ) {
    this.adaptadores = new Map<ParceiroRemessa, ParceiroRemessaAdapter>([
      ["maxpay", new MaxPaySimuladoAdapter()],
      ["realtransfers", new RealtransfersSimuladoAdapter()],
    ]);
  }

  public async criarRemessa(
    dados: CriarRemessaInput,
    operador: ContextoOperador
  ): Promise<Remessa> {
    // 1. Chave de Idempotência: impede envio ou cobrança duplicada
    const existente = this.remessasRepo.buscarPorChaveIdempotencia(dados.chaveIdempotencia);
    if (existente) {
      return existente;
    }

    // 2. Validação do Remetente e Diligência KYC
    const cliente = this.clientesRepo.buscarPorId(dados.clienteRemetenteId);
    if (!cliente) {
      throw new ErroNaoEncontrado(`Cliente remetente não encontrado com ID: ${dados.clienteRemetenteId}`);
    }
    if (cliente.estado !== "ativo") {
      throw new ErroValidacao("O cliente remetente encontra-se inativo ou bloqueado para operações financeiras.");
    }
    if (cliente.estadoKyc !== "aprovado") {
      throw new ErroValidacao(
        `Remessa recusada: O cliente remetente possui estado KYC '${cliente.estadoKyc}'. Apenas clientes com KYC aprovado podem ordenar remessas internacionais.`
      );
    }

    // 3. Validação do Caixa Ativo do Operador
    const caixa = this.caixaRepo.buscarCaixaAbertoPorOperador(operador.id);
    if (!caixa) {
      throw new ErroValidacao(
        "O operador não possui nenhum caixa aberto no momento para rececionar o valor da remessa."
      );
    }

    // 4. Obtenção da Taxa de Câmbio de Venda e Cálculo do Valor em Kwanzas
    const taxaConfig = this.taxasService.obterTaxaCalculada(
      dados.moeda === "GBP" || dados.moeda === "ZAR" ? "USD" : dados.moeda
    );
    const taxaCambioDec = decimal(taxaConfig.venda);
    const valorMoedaDec = decimal(dados.valorMoeda);

    if (valorMoedaDec.lessThanOrEqualTo(0)) {
      throw new ErroValidacao("O valor a enviar na moeda de destino tem de ser superior a zero.");
    }

    const valorAoaDec = valorMoedaDec.times(taxaCambioDec);

    // 5. Cálculo das Comissões de Remessa (Parâmetros Editáveis do Sistema)
    const comissaoFixaAoa = this.obterParametroNumero("comissao_remessa_aoa", "2500.00");
    const comissaoPerc = this.obterParametroNumero("comissao_remessa_percentual", "1.50");

    const parcelaPercentual = valorAoaDec.times(comissaoPerc.dividedBy(100));
    const totalComissaoDec = comissaoFixaAoa.plus(parcelaPercentual);
    const totalCobradoDec = valorAoaDec.plus(totalComissaoDec);

    const agora = new Date();
    const agoraIso = agora.toISOString();
    const remessaId = `rem_${randomUUID()}`;

    // 6. Transação Atómica: Geração do número sequencial sem gaps e persistência
    const remessaCriada = comTransacao(this.db, () => {
      const anoAtual = agora.getFullYear();
      const numeroRemessa = proximoNumeroSequencial(this.db, "remessa", "REM", anoAtual);

      const novaRemessa: Remessa = {
        id: remessaId,
        numeroRemessa,
        chaveIdempotencia: dados.chaveIdempotencia,
        clienteRemetenteId: cliente.id,
        remetenteNome: cliente.nome,
        remetenteDocumento: `${cliente.tipoDocumento.toUpperCase()}: ${cliente.numeroDocumento}`,
        remetenteNif: cliente.nif,
        beneficiarioNome: dados.beneficiarioNome,
        beneficiarioPais: dados.beneficiarioPais.toUpperCase(),
        beneficiarioBanco: dados.beneficiarioBanco,
        beneficiarioContaIban: dados.beneficiarioContaIban,
        moeda: dados.moeda,
        valorMoeda: valorMoedaDec.toFixed(2),
        taxaCambio: taxaCambioDec.toFixed(4),
        valorAoa: valorAoaDec.toFixed(2),
        comissaoAoa: totalComissaoDec.toFixed(2),
        totalCobradoAoa: totalCobradoDec.toFixed(2),
        parceiro: dados.parceiro,
        estado: "pendente",
        criadoEm: agoraIso,
        atualizadoEm: agoraIso,
        operadorId: operador.id,
        operadorNome: operador.nome,
        caixaId: caixa.id,
      };

      // 6.1 Inserir remessa
      this.remessasRepo.inserir(novaRemessa);

      // 6.2 Entrada de fundos em Kwanzas no Caixa (+AOA)
      this.caixaRepo.inserirMovimento({
        id: `mov_${randomUUID()}`,
        caixaId: caixa.id,
        tipo: "remessa_entrada",
        moeda: "AOA",
        montante: totalCobradoDec.toFixed(2),
        operacaoId: remessaId,
        descricao: `Recebimento de Remessa (${numeroRemessa}) - Beneficiário: ${dados.beneficiarioNome}`,
        criadoEm: agoraIso,
        operadorId: operador.id,
      });

      // 6.3 Auditoria
      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "REMESSA_CRIADA_NO_BALCAO",
        recurso: "remessas",
        recursoId: remessaId,
        detalhes: {
          numeroRemessa,
          clienteId: cliente.id,
          parceiro: dados.parceiro,
          moeda: dados.moeda,
          valorMoeda: novaRemessa.valorMoeda,
          totalCobradoAoa: novaRemessa.totalCobradoAoa,
          beneficiario: dados.beneficiarioNome,
          pais: dados.beneficiarioPais,
        },
        ip: operador.ip,
      });

      return novaRemessa;
    });

    // 7. Despacho assíncrono para o adaptador do parceiro
    return this.despacharParaParceiro(remessaCriada, operador);
  }

  public async despacharParaParceiro(remessa: Remessa, operador: ContextoOperador): Promise<Remessa> {
    const adaptador = this.adaptadores.get(remessa.parceiro);
    if (!adaptador) {
      throw new ErroValidacao(`Adaptador não configurado para o parceiro: ${remessa.parceiro}`);
    }

    try {
      const resposta = await adaptador.enviar(remessa);

      if (resposta.status === "retida") {
        this.remessasRepo.atualizarEstado(
          remessa.id,
          "retida",
          resposta.referenciaParceiro,
          resposta.motivo ?? "Retida para verificação de risco de conformidade."
        );
      } else if (resposta.status === "enviada") {
        this.remessasRepo.atualizarEstado(remessa.id, "enviada", resposta.referenciaParceiro);
      }

      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: `REMESSA_DESPACHADA_${resposta.status.toUpperCase()}`,
        recurso: "remessas",
        recursoId: remessa.id,
        detalhes: {
          parceiro: remessa.parceiro,
          referenciaParceiro: resposta.referenciaParceiro,
          status: resposta.status,
          motivo: resposta.motivo,
        },
        ip: operador.ip,
      });

      return this.remessasRepo.buscarPorId(remessa.id)!;
    } catch (erro: any) {
      this.remessasRepo.atualizarEstado(
        remessa.id,
        "retida",
        undefined,
        `Falha na comunicação com o parceiro: ${erro.message}`
      );
      return this.remessasRepo.buscarPorId(remessa.id)!;
    }
  }

  public cancelarEDevolverRemessa(
    id: string,
    dados: CancelarRemessaInput,
    operador: ContextoOperador
  ): Remessa {
    if (operador.funcao !== "gestao" && operador.funcao !== "tesouraria") {
      throw new ErroPermissao("Apenas os perfis de Gestão e Tesouraria podem cancelar remessas e autorizar devolução.");
    }

    const remessa = this.remessasRepo.buscarPorId(id);
    if (!remessa) {
      throw new ErroNaoEncontrado(`Remessa não encontrada com ID: ${id}`);
    }
    if (remessa.estado === "concluida" || remessa.estado === "cancelada") {
      throw new ErroValidacao(`A remessa já se encontra ${remessa.estado}. Não pode ser cancelada.`);
    }

    const agora = new Date().toISOString();

    return comTransacao(this.db, () => {
      // 1. Atualizar estado da remessa
      this.remessasRepo.cancelar(id, dados.motivo, operador.id);

      // 2. Devolução por LANÇAMENTO CONTRÁRIO no caixa (nunca por apagamento de registo)
      if (remessa.caixaId) {
        this.caixaRepo.inserirMovimento({
          id: `mov_${randomUUID()}`,
          caixaId: remessa.caixaId,
          tipo: "remessa_saida",
          moeda: "AOA",
          montante: new D(remessa.totalCobradoAoa).negated().toFixed(2),
          operacaoId: remessa.id,
          descricao: `Devolução / Cancelamento de Remessa (${remessa.numeroRemessa}) - Reembolso AOA`,
          criadoEm: agora,
          operadorId: operador.id,
        });
      }

      // 3. Registo de Auditoria
      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "REMESSA_CANCELADA_E_DEVOLVIDA",
        recurso: "remessas",
        recursoId: remessa.id,
        detalhes: {
          numeroRemessa: remessa.numeroRemessa,
          motivo: dados.motivo,
          totalReembolsadoAoa: remessa.totalCobradoAoa,
        },
        ip: operador.ip,
      });

      return this.remessasRepo.buscarPorId(id)!;
    });
  }

  public buscarPorId(id: string): Remessa {
    const rem = this.remessasRepo.buscarPorId(id);
    if (!rem) {
      throw new ErroNaoEncontrado(`Remessa não encontrada com ID: ${id}`);
    }
    return rem;
  }

  public listarRemessas(limite = 50, offset = 0, estado?: Remessa["estado"], clienteId?: string) {
    return this.remessasRepo.listar(limite, offset, estado, clienteId);
  }

  private obterParametroNumero(chave: string, padrao: string): InstanceType<typeof D> {
    const stmt = this.db.prepare("SELECT valor FROM parametros_sistema WHERE chave = ?");
    const row = stmt.get(chave) as { valor: string } | undefined;
    return decimal(row?.valor ?? padrao);
  }
}
