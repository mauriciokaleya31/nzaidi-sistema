/**
 * NZAIDI — Motor de lógica do Simulador de Câmbio (docs/10; R-07, R-08, R-15).
 * 
 * Regras:
 * - Toda a matemática é executada via `@nzaidi/dominio` e `decimal.js`.
 * - Sem operações de ponto flutuante binário (IEEE 754).
 * - Cotação com validade estrita de 90 segundos.
 */
import {
  decimal,
  formatar,
  valor,
  kwanzasParaComprarDivisa,
  kwanzasAoVenderDivisa,
  criarCotacao,
  estaValida,
  type Cotacao,
  type Decimal,
  type MoedaDivisa,
  type Valor,
  ErroDinheiro,
  ErroTaxa,
  VALIDADE_COTACAO_SEGUNDOS,
} from "@nzaidi/dominio";
import { obterTabelaTaxas, type InfoTaxaMoeda } from "./dados-taxas.js";

export type TipoOperacao = "comprar" | "vender";

export interface EstadoSimulador {
  moeda: MoedaDivisa;
  operacao: TipoOperacao;
  montanteDivisaTexto: string;
  cotacao: Cotacao;
  tempoRestanteSegundos: number;
  expirada: boolean;
  fonteTaxas: "demonstracao" | "oficial";
  erro?: string;
  resultado?: {
    montanteDivisaFormatado: string;
    montanteKzFormatado: string;
    taxaAplicada: Decimal;
    tipoTaxa: "venda" | "compra";
    valorKz: Valor;
    valorDivisa: Valor;
  };
}

export class SimuladorCambio {
  private tabela: Record<MoedaDivisa, InfoTaxaMoeda>;
  private cotacao: Cotacao;
  private moeda: MoedaDivisa = "USD";
  private operacao: TipoOperacao = "comprar";
  private montanteTexto = "100";

  constructor(tabelaInicial?: Record<MoedaDivisa, InfoTaxaMoeda>) {
    this.tabela = tabelaInicial ?? obterTabelaTaxas();
    this.cotacao = this.gerarNovaCotacao();
  }

  public getMoeda(): MoedaDivisa {
    return this.moeda;
  }

  public setMoeda(novaMoeda: MoedaDivisa): void {
    if (this.moeda !== novaMoeda) {
      this.moeda = novaMoeda;
      this.recotar();
    }
  }

  public getOperacao(): TipoOperacao {
    return this.operacao;
  }

  public setOperacao(novaOp: TipoOperacao): void {
    if (this.operacao !== novaOp) {
      this.operacao = novaOp;
      this.recotar();
    }
  }

  public setMontante(texto: string): void {
    this.montanteTexto = texto;
  }

  public getMontanteTexto(): string {
    return this.montanteTexto;
  }

  public definirTabela(novaTabela: Record<MoedaDivisa, InfoTaxaMoeda>): void {
    this.tabela = novaTabela;
    this.recotar();
  }

  public getInfoMoeda(m: MoedaDivisa = this.moeda): InfoTaxaMoeda {
    const info = this.tabela[m];
    if (!info) {
      throw new Error(`Moeda não suportada: ${m}`);
    }
    return info;
  }

  public getTabelaCompleta(): Record<MoedaDivisa, InfoTaxaMoeda> {
    return this.tabela;
  }

  public getTaxaVigente(): Decimal {
    const info = this.getInfoMoeda(this.moeda);
    return this.operacao === "comprar" ? info.taxas.venda : info.taxas.compra;
  }

  public recotar(agora: Date = new Date()): Cotacao {
    this.cotacao = this.gerarNovaCotacao(agora);
    return this.cotacao;
  }

  private gerarNovaCotacao(agora: Date = new Date()): Cotacao {
    const taxa = this.getTaxaVigente();
    return criarCotacao(taxa, agora, VALIDADE_COTACAO_SEGUNDOS);
  }

  public calcularEstado(agora: Date = new Date()): EstadoSimulador {
    const expirada = !estaValida(this.cotacao, agora);
    const msRestantes = Math.max(0, this.cotacao.expiraEm.getTime() - agora.getTime());
    const tempoRestanteSegundos = Math.ceil(msRestantes / 1000);
    const info = this.getInfoMoeda(this.moeda);

    const estadoBase: EstadoSimulador = {
      moeda: this.moeda,
      operacao: this.operacao,
      montanteDivisaTexto: this.montanteTexto,
      cotacao: this.cotacao,
      tempoRestanteSegundos,
      expirada,
      fonteTaxas: info.fonte,
    };

    if (expirada) {
      return {
        ...estadoBase,
        erro: "A cotação de 90 segundos expirou. Clique em 'Recotar Taxa' para obter uma cotação actualizada.",
      };
    }

    const textoLimpo = this.montanteTexto.trim().replace(",", ".");
    if (!textoLimpo) {
      return {
        ...estadoBase,
        erro: "Introduza o montante pretendido.",
      };
    }

    try {
      const dec = decimal(textoLimpo);
      if (dec.lessThanOrEqualTo(0)) {
        return {
          ...estadoBase,
          erro: "O montante deve ser estritamente superior a zero.",
        };
      }

      if (dec.decimalPlaces() > 2) {
        return {
          ...estadoBase,
          erro: "O montante não pode ter mais de 2 casas decimais.",
        };
      }

      let kzTotal: Decimal;
      if (this.operacao === "comprar") {
        kzTotal = kwanzasParaComprarDivisa(info.taxas, textoLimpo);
      } else {
        kzTotal = kwanzasAoVenderDivisa(info.taxas, textoLimpo);
      }

      const valDivisa = valor(this.moeda, dec.toFixed(2));
      const valKz = valor("AOA", kzTotal.toFixed(2));

      return {
        ...estadoBase,
        resultado: {
          montanteDivisaFormatado: formatar(valDivisa),
          montanteKzFormatado: formatar(valKz),
          taxaAplicada: this.cotacao.taxa,
          tipoTaxa: this.operacao === "comprar" ? "venda" : "compra",
          valorKz: valKz,
          valorDivisa: valDivisa,
        },
      };
    } catch (e: unknown) {
      const msg = e instanceof ErroDinheiro || e instanceof ErroTaxa 
        ? e.message 
        : e instanceof Error 
        ? e.message 
        : "Montante inválido.";
      return {
        ...estadoBase,
        erro: msg,
      };
    }
  }
}
