import { randomUUID } from "node:crypto";
import { decimal, D } from "@nzaidi/dominio";
import type { DatabaseSync } from "node:sqlite";
import type { CaixaRepository } from "./caixa.repository.js";
import type { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import type { ContabilidadeService } from "../contabilidade/contabilidade.service.js";

import type {
  Caixa,
  AbrirCaixaInput,
  FecharCaixaInput,
  MovimentoManualInput,
  SaldoCalculado,
  MoedaCaixa,
} from "./caixa.types.js";
import { ErroConflito, ErroNaoEncontrado, ErroValidacao, ErroPermissao } from "../../plugins/erros.js";
import { comTransacao } from "../../database/database.js";

export interface ContextoOperador {
  id: string;
  nome: string;
  funcao: string;
  ip?: string | null;
}

export class CaixaService {
  constructor(
    private db: DatabaseSync,
    private caixaRepo: CaixaRepository,
    private auditoriaRepo: AuditoriaRepository,
    private contabilidadeService?: ContabilidadeService
  ) {}

  public abrirCaixa(dados: AbrirCaixaInput, operador: ContextoOperador): Caixa {
    // 1. Verificar se operador já tem caixa aberto
    const caixaExistente = this.caixaRepo.buscarCaixaAbertoPorOperador(operador.id);
    if (caixaExistente) {
      throw new ErroConflito(
        `O operador já possui o caixa ${caixaExistente.numeroCaixa} aberto. Conclua o fecho antes de abrir um novo caixa.`,
        "CAIXA_JA_ABERTO"
      );
    }

    const agora = new Date().toISOString();
    const dataStr = agora.slice(0, 10).replace(/-/g, "");
    const timeStr = agora.slice(11, 19).replace(/:/g, "");
    const numeroCaixa = `CX-${dataStr}-${timeStr}`;

    const caixa: Caixa = {
      id: `cx_${randomUUID()}`,
      numeroCaixa,
      operadorId: operador.id,
      operadorNome: operador.nome,
      agencia: dados.agencia,
      abertoEm: agora,
      estado: "aberto",
      saldoInicialAoa: decimal(dados.saldoInicialAoa).toFixed(2),
      saldoInicialUsd: decimal(dados.saldoInicialUsd).toFixed(2),
      saldoInicialEur: decimal(dados.saldoInicialEur).toFixed(2),
    };

    return comTransacao(this.db, () => {
      this.caixaRepo.inserirCaixa(caixa);

      // Movimentos iniciais de abertura
      const fundosIniciais: { moeda: MoedaCaixa; montante: string }[] = [
        { moeda: "AOA", montante: caixa.saldoInicialAoa },
        { moeda: "USD", montante: caixa.saldoInicialUsd },
        { moeda: "EUR", montante: caixa.saldoInicialEur },
      ];

      for (const fundo of fundosIniciais) {
        if (decimal(fundo.montante).greaterThan(0)) {
          this.caixaRepo.inserirMovimento({
            id: `mov_${randomUUID()}`,
            caixaId: caixa.id,
            tipo: "abertura",
            moeda: fundo.moeda,
            montante: fundo.montante,
            descricao: `Fundo inicial de abertura em ${fundo.moeda}`,
            criadoEm: agora,
            operadorId: operador.id,
          });
        }
      }

      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "CAIXA_ABRIR",
        recurso: "caixas",
        recursoId: caixa.id,
        detalhes: {
          numeroCaixa: caixa.numeroCaixa,
          aoa: caixa.saldoInicialAoa,
          usd: caixa.saldoInicialUsd,
          eur: caixa.saldoInicialEur,
        },
        ip: operador.ip,
      });

      return caixa;
    });
  }

  public obterCaixaComSaldos(caixaId: string): { caixa: Caixa; saldos: Record<MoedaCaixa, SaldoCalculado> } {
    const caixa = this.caixaRepo.buscarCaixaPorId(caixaId);
    if (!caixa) {
      throw new ErroNaoEncontrado(`Caixa não encontrado: ${caixaId}`);
    }

    const saldos = this.caixaRepo.calcularSaldos(caixa);
    return { caixa, saldos };
  }

  public obterCaixaAtivoDoOperador(operadorId: string): { caixa: Caixa; saldos: Record<MoedaCaixa, SaldoCalculado> } | null {
    const caixa = this.caixaRepo.buscarCaixaAbertoPorOperador(operadorId);
    if (!caixa) return null;

    const saldos = this.caixaRepo.calcularSaldos(caixa);
    return { caixa, saldos };
  }

  public adicionarMovimentoManual(
    caixaId: string,
    dados: MovimentoManualInput,
    operador: ContextoOperador
  ): void {
    const { caixa, saldos } = this.obterCaixaComSaldos(caixaId);
    if (caixa.estado !== "aberto") {
      throw new ErroValidacao("Apenas é permitido registar movimentos em caixas abertos.");
    }

    const agora = new Date().toISOString();
    const montante = decimal(dados.montante);

    if (dados.tipo === "sangria") {
      const saldoAtual = decimal(saldos[dados.moeda].saldoEsperado);
      if (montante.greaterThan(saldoAtual)) {
        throw new ErroValidacao(
          `Saldo insuficiente em ${dados.moeda} para efetuar sangria. Disponível: ${saldoAtual.toFixed(2)}`
        );
      }
    }

    // Sangria é saída (negativo), suprimento é entrada (positivo)
    const valorMovimento = dados.tipo === "sangria" ? montante.negated().toFixed(2) : montante.toFixed(2);

    comTransacao(this.db, () => {
      this.caixaRepo.inserirMovimento({
        id: `mov_${randomUUID()}`,
        caixaId,
        tipo: dados.tipo,
        moeda: dados.moeda,
        montante: valorMovimento,
        descricao: dados.descricao,
        criadoEm: agora,
        operadorId: operador.id,
      });

      if (this.contabilidadeService) {
        this.contabilidadeService.lancarMovimentoTesourariaCaixa({
          caixaId,
          numeroCaixa: caixa.numeroCaixa,
          tipo: dados.tipo,
          moeda: dados.moeda,
          montante: dados.montante,
          descricao: dados.descricao,
          operadorId: operador.id,
          operadorNome: operador.nome,
        });
      }

      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: `CAIXA_${dados.tipo.toUpperCase()}`,
        recurso: "caixas",
        recursoId: caixaId,
        detalhes: {
          moeda: dados.moeda,
          montante: valorMovimento,
          descricao: dados.descricao,
        },
        ip: operador.ip,
      });
    });
  }

  public fecharCaixa(caixaId: string, dados: FecharCaixaInput, operador: ContextoOperador): Caixa {
    const { caixa, saldos } = this.obterCaixaComSaldos(caixaId);
    if (caixa.estado !== "aberto") {
      throw new ErroValidacao("Este caixa já se encontra fechado.");
    }

    if (caixa.operadorId !== operador.id && operador.funcao !== "gestao" && operador.funcao !== "tesouraria") {
      throw new ErroPermissao("Apenas o próprio operador de caixa ou a Tesouraria/Gestão podem efetuar o fecho.");
    }

    const agora = new Date().toISOString();

    const contadoAoa = decimal(dados.saldoContadoAoa);
    const contadoUsd = decimal(dados.saldoContadoUsd);
    const contadoEur = decimal(dados.saldoContadoEur);

    const esperadoAoa = decimal(saldos.AOA.saldoEsperado);
    const esperadoUsd = decimal(saldos.USD.saldoEsperado);
    const esperadoEur = decimal(saldos.EUR.saldoEsperado);

    const difAoa = contadoAoa.minus(esperadoAoa);
    const difUsd = contadoUsd.minus(esperadoUsd);
    const difEur = contadoEur.minus(esperadoEur);

    const temDiferenca = !difAoa.isZero() || !difUsd.isZero() || !difEur.isZero();

    if (temDiferenca && (!dados.justificativaDiferenca || dados.justificativaDiferenca.trim().length < 5)) {
      throw new ErroValidacao(
        "Foram detetadas quebras ou sobras de caixa. A justificação formal da diferença é obrigatória para o fecho."
      );
    }

    const estadoFecho = temDiferenca ? "pendente_aprovacao" : "fechado";

    return comTransacao(this.db, () => {
      this.caixaRepo.fecharCaixa(caixaId, {
        fechadoEm: agora,
        saldoFechoAoaContado: contadoAoa.toFixed(2),
        saldoFechoUsdContado: contadoUsd.toFixed(2),
        saldoFechoEurContado: contadoEur.toFixed(2),
        diferencaAoa: difAoa.toFixed(2),
        diferencaUsd: difUsd.toFixed(2),
        diferencaEur: difEur.toFixed(2),
        justificativaDiferenca: dados.justificativaDiferenca ?? null,
        fechadoPorId: operador.id,
        estado: estadoFecho,
      });

      this.auditoriaRepo.registar({
        autorId: operador.id,
        autorNome: operador.nome,
        autorFuncao: operador.funcao,
        acao: "CAIXA_FECHAR",
        recurso: "caixas",
        recursoId: caixaId,
        detalhes: {
          diferencaAoa: difAoa.toFixed(2),
          diferencaUsd: difUsd.toFixed(2),
          diferencaEur: difEur.toFixed(2),
          justificativa: dados.justificativaDiferenca ?? null,
          estado: estadoFecho,
        },
        ip: operador.ip,
      });

      if (this.contabilidadeService) {
        if (!difAoa.isZero()) {
          this.contabilidadeService.lancarDiferencaFechoCaixa({
            caixaId,
            numeroCaixa: caixa.numeroCaixa,
            moeda: 'AOA',
            diferenca: difAoa.toFixed(2),
            justificativa: dados.justificativaDiferenca ?? null,
            operadorId: operador.id,
            operadorNome: operador.nome,
          });
        }
        if (!difUsd.isZero()) {
          this.contabilidadeService.lancarDiferencaFechoCaixa({
            caixaId,
            numeroCaixa: caixa.numeroCaixa,
            moeda: 'USD',
            diferenca: difUsd.toFixed(2),
            justificativa: dados.justificativaDiferenca ?? null,
            operadorId: operador.id,
            operadorNome: operador.nome,
          });
        }
        if (!difEur.isZero()) {
          this.contabilidadeService.lancarDiferencaFechoCaixa({
            caixaId,
            numeroCaixa: caixa.numeroCaixa,
            moeda: 'EUR',
            diferenca: difEur.toFixed(2),
            justificativa: dados.justificativaDiferenca ?? null,
            operadorId: operador.id,
            operadorNome: operador.nome,
          });
        }
      }
      return this.caixaRepo.buscarCaixaPorId(caixaId)!;
    });
  }

  public listarCaixas(limite = 50, offset = 0): Caixa[] {
    return this.caixaRepo.listarCaixas(limite, offset);
  }

  public listarMovimentos(caixaId: string): any[] {
    return this.caixaRepo.listarMovimentosDoCaixa(caixaId);
  }
}
