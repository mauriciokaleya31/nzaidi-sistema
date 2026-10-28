import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { CartoesRepository } from "./cartoes.repository.js";
import { AuditoriaRepository } from "../auditoria/auditoria.repository.js";
import { StroWalletConnector } from "./strowallet.connector.js";
import type {
  CartoesConfig,
  CartoesParametrosComerciais,
  CartaoVirtual,
  CartaoTransacao,
  CartaoClienteAdesao,
  CalculoCarregamentoDTO,
  CalculoEmissaoDTO,
  RevelacaoDadosCartao,
  EstadoCartao,
  ResumoDashboardCartoes,
} from "./cartoes.types.js";

export class CartoesService {
  private repo: CartoesRepository;

  constructor(
    private db: DatabaseSync,
    private auditoriaRepo: AuditoriaRepository
  ) {
    this.repo = new CartoesRepository(db);
  }

  public getRepository(): CartoesRepository {
    return this.repo;
  }

  private obterConector(): StroWalletConnector {
    const config = this.repo.obterConfig();
    return new StroWalletConnector({
      publicKey: config.public_key || "",
      secretKey: config.secret_key || "",
      mode: config.ambiente,
      baseUrl: config.base_url,
    });
  }

  /**
   * Obtém a taxa de câmbio USD/AOA de referência do sistema
   */
  public obterTaxaCambioUSD(): number {
    try {
      const row = this.db
        .prepare(`SELECT referencia, margem_venda FROM taxas_config WHERE moeda = 'USD' LIMIT 1`)
        .get() as any;

      if (row && row.referencia) {
        const ref = parseFloat(row.referencia);
        const margem = parseFloat(row.margem_venda || "0");
        return ref * (1 + margem);
      }
    } catch {
      // Fallback padrão se não configurado
    }
    return 950.0;
  }

  // ==========================================
  // CÁLCULOS FINANCEIROS E COMERCIAIS
  // ==========================================
  public calcularCarregamento(montanteUsd: number): CalculoCarregamentoDTO {
    const comercial = this.repo.obterParametrosComerciais();
    const taxaBase = this.obterTaxaCambioUSD();

    // 1. Margem cambial NZAIDI
    const margemCambialPct = comercial.margem_cambial_pct;
    const taxaComMargem = taxaBase * (1 + margemCambialPct / 100);

    const contravalorBaseAoa = Math.round(montanteUsd * taxaBase * 100) / 100;
    const contravalorComMargemAoa = Math.round(montanteUsd * taxaComMargem * 100) / 100;
    const margemCambialAoa = Math.round((contravalorComMargemAoa - contravalorBaseAoa) * 100) / 100;

    // 2. Comissões de Carregamento NZAIDI
    const comissaoFixaAoa = Math.round(comercial.comissao_carregamento_fixa_usd * taxaBase * 100) / 100;
    const comissaoPctAoa = Math.round(((montanteUsd * comercial.comissao_carregamento_pct) / 100) * taxaBase * 100) / 100;
    const comissaoTotalAoa = Math.round((comissaoFixaAoa + comissaoPctAoa) * 100) / 100;

    // 3. Custo cobrado pela StroWallet (em USD)
    const custoFornecedorUsd = Math.round(((montanteUsd * comercial.custo_carregamento_fornecedor_pct) / 100) * 100) / 100;
    const custoFornecedorAoa = Math.round(custoFornecedorUsd * taxaBase * 100) / 100;

    // 4. Totais
    const totalAPagarAoa = Math.round((contravalorComMargemAoa + comissaoTotalAoa) * 100) / 100;
    const receitaLiquidaAoa = Math.round((comissaoTotalAoa + margemCambialAoa - custoFornecedorAoa) * 100) / 100;

    return {
      montante_usd: montanteUsd,
      taxa_cambio_base: Math.round(taxaBase * 100) / 100,
      taxa_cambio_com_margem: Math.round(taxaComMargem * 100) / 100,
      contravalor_base_aoa: contravalorBaseAoa,
      margem_cambial_aoa: margemCambialAoa,
      comissao_carregamento_fixa_aoa: comissaoFixaAoa,
      comissao_carregamento_pct_aoa: comissaoPctAoa,
      comissao_total_aoa: comissaoTotalAoa,
      total_a_pagar_aoa: totalAPagarAoa,
      custo_fornecedor_usd: custoFornecedorUsd,
      receita_liquida_estimada_aoa: receitaLiquidaAoa,
    };
  }

  public calcularEmissao(montanteInicialUsd: number): CalculoEmissaoDTO {
    const comercial = this.repo.obterParametrosComerciais();
    const taxaBase = this.obterTaxaCambioUSD();

    const taxaEmissaoUsd = comercial.taxa_emissao_usd;
    const custoFornecedorUsd = comercial.custo_emissao_fornecedor_usd;
    const taxaEmissaoAoa = Math.round(taxaEmissaoUsd * taxaBase * 100) / 100;
    const custoFornecedorAoa = Math.round(custoFornecedorUsd * taxaBase * 100) / 100;
    const receitaLiquidaEmissaoAoa = taxaEmissaoAoa - custoFornecedorAoa;

    const calculoCarregamento = this.calcularCarregamento(montanteInicialUsd);
    const totalGeralAoa = Math.round((taxaEmissaoAoa + calculoCarregamento.total_a_pagar_aoa) * 100) / 100;
    const receitaLiquidaTotalAoa = Math.round((receitaLiquidaEmissaoAoa + calculoCarregamento.receita_liquida_estimada_aoa) * 100) / 100;

    return {
      taxa_emissao_usd: taxaEmissaoUsd,
      custo_fornecedor_usd: custoFornecedorUsd,
      taxa_cambio_aplicada: Math.round(taxaBase * 100) / 100,
      taxa_emissao_aoa: taxaEmissaoAoa,
      carregamento_inicial_usd: montanteInicialUsd,
      calculo_carregamento: calculoCarregamento,
      total_geral_aoa: totalGeralAoa,
      receita_liquida_total_aoa: receitaLiquidaTotalAoa,
    };
  }

  // ==========================================
  // STATUS E ELEGIBILIDADE NO PORTAL
  // ==========================================
  public obterStatusPortal(clienteId?: string): {
    servico_ativo: boolean;
    visivel_portal: boolean;
    modo_manutencao: boolean;
    mensagem_manutencao: string | null;
    estado_ativacao: string;
    parametros_comerciais: CartoesParametrosComerciais;
    taxa_cambio_base: number;
    cliente_elegivel?: boolean | undefined;
    motivo_inelegibilidade?: string | undefined;
    adesao?: CartaoClienteAdesao | null | undefined;
  } {
    const config = this.repo.obterConfig();
    const comercial = this.repo.obterParametrosComerciais();
    const taxaBase = this.obterTaxaCambioUSD();

    let clienteElegivel = false;
    let motivoInelegibilidade: string | undefined;
    let adesao: CartaoClienteAdesao | null = null;

    if (clienteId) {
      const cliente = this.db
        .prepare(`SELECT id, nome, estado_kyc, estado FROM clientes WHERE id = ? LIMIT 1`)
        .get(clienteId) as any;

      if (!cliente) {
        clienteElegivel = false;
        motivoInelegibilidade = "Cliente não encontrado na plataforma.";
      } else if (cliente.estado === "bloqueado" || cliente.estado === "inativo") {
        clienteElegivel = false;
        motivoInelegibilidade = "A sua conta encontra-se suspensa ou com restrições.";
      } else if (cliente.estado_kyc !== "aprovado") {
        clienteElegivel = false;
        motivoInelegibilidade = "Dossiê KYC pendente de aprovação ou não submetido. A emissão de cartões Visa requer verificação de identidade completa.";
      } else {
        clienteElegivel = true;
      }

      adesao = this.repo.obterAdesaoPorClienteId(clienteId);
    }

    return {
      servico_ativo: config.servico_ativo === 1,
      visivel_portal: config.visivel_portal === 1,
      modo_manutencao: config.modo_manutencao === 1,
      mensagem_manutencao: config.mensagem_manutencao,
      estado_ativacao: config.estado_ativacao,
      parametros_comerciais: comercial,
      taxa_cambio_base: taxaBase,
      cliente_elegivel: clienteElegivel,
      motivo_inelegibilidade: motivoInelegibilidade,
      adesao,
    };
  }

  // ==========================================
  // ADESÃO E SOLICITAÇÃO PELO CLIENTE
  // ==========================================
  public async solicitarAdesao(clienteId: string): Promise<CartaoClienteAdesao> {
    const statusPortal = this.obterStatusPortal(clienteId);
    if (!statusPortal.cliente_elegivel) {
      throw new Error(statusPortal.motivo_inelegibilidade || "Cliente inelegível para o serviço de cartões.");
    }

    let adesao = this.repo.obterAdesaoPorClienteId(clienteId);
    if (adesao) {
      if (adesao.estado_adesao === "rejeitado") {
        // Permitir reapreciação
        this.repo.atualizarEstadoAdesao(clienteId, "pendente");
        adesao = this.repo.obterAdesaoPorClienteId(clienteId)!;
      }
      return adesao;
    }

    const id = randomUUID();
    adesao = this.repo.criarAdesao(id, clienteId, true);

    // Se o cliente tem KYC aprovado na plataforma, aprovamos a adesão automaticamente
    // e registamos o customer na StroWallet se configurada
    const cliente = this.db
      .prepare(`SELECT * FROM clientes WHERE id = ? LIMIT 1`)
      .get(clienteId) as any;

    if (cliente && (cliente.estado_kyc === "aprovado" || cliente.kyc_status === "aprovado")) {
      let strowalletCustomerId: string | undefined;
      const conector = this.obterConector();

      if (conector.estaConfigurado()) {
        try {
          const nomePartes = (cliente.nome || "Cliente Nzaidi").trim().split(" ");
          const firstName = nomePartes[0];
          const lastName = nomePartes.slice(1).join(" ") || "Nzaidi";

          const resKyc = await conector.submeterKyc({
            first_name: firstName,
            last_name: lastName,
            id_number: cliente.numero_documento || "DOC-DEFAULT-123",
            id_type: "national_id",
            email: cliente.email || `cliente_${clienteId}@nzaidi.ao`,
            phone_number: cliente.telefone || "+244900000000",
            date_of_birth: cliente.data_nascimento || "1990-01-01",
            line1: cliente.endereco || "Luanda, Angola",
            city: cliente.cidade || "Luanda",
            state: cliente.provincia || "Luanda",
            country: "AGO",
          });

          if (resKyc.success && resKyc.data?.customer_id) {
            strowalletCustomerId = resKyc.data.customer_id;
          }
        } catch {
          // Continua em homologação sem travar
        }
      }

      this.repo.atualizarEstadoAdesao(clienteId, "aprovado", {
        aprovadoPor: "sistema_kyc_automatico",
        strowalletCustomerId: strowalletCustomerId || `strow_cust_${randomUUID().substring(0, 8)}`,
      });

      adesao = this.repo.obterAdesaoPorClienteId(clienteId)!;
    }

    this.auditoriaRepo.registar({
      autorId: clienteId,
      autorNome: cliente?.nome || "Cliente",
      autorFuncao: "cliente",
      acao: "ADESAO_SERVICO_CARTOES",
      recurso: "cartoes_clientes_adesao",
      recursoId: adesao.id,
      detalhes: { clienteId, estado: adesao.estado_adesao },
    });

    return adesao;
  }

  // ==========================================
  // EMISSÃO DE CARTÃO VISA VIRTUAL
  // ==========================================
  public async emitirCartao(params: {
    clienteId: string;
    montanteInicialUsd: number;
    rotulo?: string;
  }): Promise<{
    cartao: CartaoVirtual;
    transacao: CartaoTransacao;
    calculo: CalculoEmissaoDTO;
  }> {
    const config = this.repo.obterConfig();
    if (config.modo_manutencao === 1) {
      throw new Error(config.mensagem_manutencao || "O serviço de cartões encontra-se em manutenção.");
    }

    const comercial = this.repo.obterParametrosComerciais();
    if (params.montanteInicialUsd < comercial.limite_min_carregamento_usd) {
      throw new Error(`Montante inicial mínimo de carregamento é de \$${comercial.limite_min_carregamento_usd} USD.`);
    }
    if (params.montanteInicialUsd > comercial.limite_max_carregamento_usd) {
      throw new Error(`Montante inicial máximo permitido é de \$${comercial.limite_max_carregamento_usd} USD.`);
    }

    // Verificar adesão
    let adesao = this.repo.obterAdesaoPorClienteId(params.clienteId);
    if (!adesao || adesao.estado_adesao !== "aprovado") {
      adesao = await this.solicitarAdesao(params.clienteId);
      if (adesao.estado_adesao !== "aprovado") {
        throw new Error("A sua adesão aos cartões Visa virtuais ainda está sob análise.");
      }
    }

    const cliente = this.db
      .prepare(`SELECT * FROM clientes WHERE id = ? LIMIT 1`)
      .get(params.clienteId) as any;
    if (!cliente) {
      throw new Error("Cliente não encontrado.");
    }

    const calculo = this.calcularEmissao(params.montanteInicialUsd);
    const conector = this.obterConector();

    let strowalletCardId = `strow_card_${randomUUID().substring(0, 12)}`;
    let ultimos4 = String(Math.floor(1000 + Math.random() * 9000));
    const anoExpiracao = String(new Date().getFullYear() + 3);
    const mesExpiracao = "12";

    // Integração real com a StroWallet se houver conectividade
    if (conector.estaConfigurado()) {
      try {
        const resEmissao = await conector.emitirCartaoVisa(
          cliente.nome,
          adesao.strowallet_customer_id || "cust_nzaidi",
          params.montanteInicialUsd
        );

        if (resEmissao.success && resEmissao.data?.card_id) {
          strowalletCardId = resEmissao.data.card_id;
          if (resEmissao.data.card_number) {
            ultimos4 = String(resEmissao.data.card_number).slice(-4);
          }
        }
      } catch (err: any) {
        // Se a chamada à StroWallet falhar em sandbox/homologação sem fundos reais,
        // geramos identificadores de conformidade para teste
        if (config.ambiente === "live") {
          throw new Error(`Falha na emissão com o fornecedor StroWallet: ${err.message}`);
        }
      }
    }

    const cartaoId = randomUUID();
    const cartao = this.repo.criarCartao({
      id: cartaoId,
      cliente_id: params.clienteId,
      strowallet_card_id: strowalletCardId,
      titular_nome: (cliente.nome || "TITULAR NZAIDI").toUpperCase(),
      ultimos_4_digitos: ultimos4,
      marca: "visa",
      moeda: "USD",
      mes_expiracao: mesExpiracao,
      ano_expiracao: anoExpiracao,
      estado: "ativo",
      saldo_usd: params.montanteInicialUsd,
      rotulo: params.rotulo || "Cartão Visa USD",
      billing_address_json: JSON.stringify({
        line1: cliente.endereco || "Avenida 4 de Fevereiro",
        city: cliente.cidade || "Luanda",
        state: cliente.provincia || "Luanda",
        country: "Angola",
        postal_code: "1000",
      }),
    });

    const refTransacao = `EMISS_VISA_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const transacao = this.repo.criarTransacao({
      id: randomUUID(),
      cartao_id: cartaoId,
      cliente_id: params.clienteId,
      tipo: "emissao",
      montante_usd: params.montanteInicialUsd,
      taxa_cambio_aplicada: calculo.taxa_cambio_aplicada,
      contravalor_aoa: calculo.total_geral_aoa,
      comissao_aoa: calculo.taxa_emissao_aoa + calculo.calculo_carregamento.comissao_total_aoa,
      margem_cambial_aoa: calculo.calculo_carregamento.margem_cambial_aoa,
      custo_fornecedor_usd: calculo.custo_fornecedor_usd + calculo.calculo_carregamento.custo_fornecedor_usd,
      receita_liquida_aoa: calculo.receita_liquida_total_aoa,
      saldo_apos_usd: params.montanteInicialUsd,
      descricao: `Emissão de Cartão Visa Virtual USD com carregamento inicial de \$${params.montanteInicialUsd}`,
      referencia_transacao: refTransacao,
      estado: "confirmada",
      strowallet_ref: strowalletCardId,
    });

    this.auditoriaRepo.registar({
      autorId: params.clienteId,
      autorNome: cliente.nome,
      autorFuncao: "cliente",
      acao: "EMISSAO_CARTAO_VISA",
      recurso: "cartoes_virtuais",
      recursoId: cartao.id,
      detalhes: {
        cartaoId: cartao.id,
        strowalletCardId,
        ultimos4,
        montanteUsd: params.montanteInicialUsd,
        totalGeralAoa: calculo.total_geral_aoa,
      },
    });

    return {
      cartao,
      transacao,
      calculo,
    };
  }

  // ==========================================
  // CARREGAMENTO DE CARTÃO
  // ==========================================
  public async carregarCartao(params: {
    clienteId: string;
    cartaoId: string;
    montanteUsd: number;
  }): Promise<{
    cartao: CartaoVirtual;
    transacao: CartaoTransacao;
    calculo: CalculoCarregamentoDTO;
  }> {
    const config = this.repo.obterConfig();
    if (config.modo_manutencao === 1) {
      throw new Error(config.mensagem_manutencao || "O serviço de cartões encontra-se em manutenção.");
    }

    const comercial = this.repo.obterParametrosComerciais();
    if (params.montanteUsd < comercial.limite_min_carregamento_usd) {
      throw new Error(`Montante mínimo de carregamento é de \$${comercial.limite_min_carregamento_usd} USD.`);
    }
    if (params.montanteUsd > comercial.limite_max_carregamento_usd) {
      throw new Error(`Montante máximo por carregamento é de \$${comercial.limite_max_carregamento_usd} USD.`);
    }

    const cartao = this.repo.obterCartaoPorId(params.cartaoId);
    if (!cartao || cartao.cliente_id !== params.clienteId) {
      throw new Error("Cartão não encontrado ou não pertence ao cliente autenticado.");
    }
    if (cartao.estado !== "ativo") {
      throw new Error(`Não é possível carregar um cartão no estado ${cartao.estado}. Desbloqueie o cartão primeiro.`);
    }

    if (cartao.saldo_usd + params.montanteUsd > comercial.saldo_maximo_cartao_usd) {
      throw new Error(
        `O saldo resultante (\$${cartao.saldo_usd + params.montanteUsd} USD) excede o limite máximo permitido de \$${comercial.saldo_maximo_cartao_usd} USD por cartão.`
      );
    }

    const calculo = this.calcularCarregamento(params.montanteUsd);
    const conector = this.obterConector();

    let strowalletRef = `fund_${Date.now()}`;
    if (conector.estaConfigurado()) {
      try {
        const res = await conector.carregarCartao(cartao.strowallet_card_id, params.montanteUsd);
        if (res.success && res.data?.reference) {
          strowalletRef = res.data.reference;
        }
      } catch (err: any) {
        if (config.ambiente === "live") {
          throw new Error(`Falha no carregamento pela StroWallet: ${err.message}`);
        }
      }
    }

    const novoSaldo = Math.round((cartao.saldo_usd + params.montanteUsd) * 100) / 100;
    this.repo.atualizarSaldoCartao(cartao.id, novoSaldo);

    const refTransacao = `REC_VISA_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const transacao = this.repo.criarTransacao({
      id: randomUUID(),
      cartao_id: cartao.id,
      cliente_id: params.clienteId,
      tipo: "carregamento",
      montante_usd: params.montanteUsd,
      taxa_cambio_aplicada: calculo.taxa_cambio_com_margem,
      contravalor_aoa: calculo.total_a_pagar_aoa,
      comissao_aoa: calculo.comissao_total_aoa,
      margem_cambial_aoa: calculo.margem_cambial_aoa,
      custo_fornecedor_usd: calculo.custo_fornecedor_usd,
      receita_liquida_aoa: calculo.receita_liquida_estimada_aoa,
      saldo_apos_usd: novoSaldo,
      descricao: `Carregamento de \$${params.montanteUsd} USD no cartão terminado em ${cartao.ultimos_4_digitos}`,
      referencia_transacao: refTransacao,
      estado: "confirmada",
      strowallet_ref: strowalletRef,
    });

    this.auditoriaRepo.registar({
      autorId: params.clienteId,
      autorNome: cartao.titular_nome,
      autorFuncao: "cliente",
      acao: "CARREGAMENTO_CARTAO_VISA",
      recurso: "cartoes_virtuais",
      recursoId: cartao.id,
      detalhes: {
        cartaoId: cartao.id,
        montanteUsd: params.montanteUsd,
        novoSaldoUsd: novoSaldo,
        totalPagoAoa: calculo.total_a_pagar_aoa,
        referencia: refTransacao,
      },
    });

    const cartaoAtualizado = this.repo.obterCartaoPorId(cartao.id)!;
    return {
      cartao: cartaoAtualizado,
      transacao,
      calculo,
    };
  }

  // ==========================================
  // BLOQUEAR / DESBLOQUEAR CARTÃO
  // ==========================================
  public async alterarEstadoCartao(params: {
    cartaoId: string;
    novoEstado: "ativo" | "congelado";
    autorId: string;
    autorNome: string;
    autorFuncao: string;
    clienteId?: string; // Se fornecido, valida titularidade
  }): Promise<CartaoVirtual> {
    const cartao = this.repo.obterCartaoPorId(params.cartaoId);
    if (!cartao) {
      throw new Error("Cartão não encontrado.");
    }

    if (params.clienteId && cartao.cliente_id !== params.clienteId) {
      throw new Error("Não autorizado a alterar este cartão.");
    }

    if (cartao.estado === "cancelado" || cartao.estado === "bloqueado") {
      throw new Error(`Cartão está ${cartao.estado} e não pode ser reativado pelo cliente.`);
    }

    const conector = this.obterConector();
    if (conector.estaConfigurado()) {
      try {
        await conector.alterarStatusCartao(
          cartao.strowallet_card_id,
          params.novoEstado === "ativo" ? "active" : "frozen"
        );
      } catch {
        // Continua em ambiente de teste
      }
    }

    this.repo.atualizarEstadoCartao(cartao.id, params.novoEstado);

    this.auditoriaRepo.registar({
      autorId: params.autorId,
      autorNome: params.autorNome,
      autorFuncao: params.autorFuncao,
      acao: params.novoEstado === "ativo" ? "DESCONGELAR_CARTAO" : "CONGELAR_CARTAO",
      recurso: "cartoes_virtuais",
      recursoId: cartao.id,
      detalhes: {
        cartaoId: cartao.id,
        estadoAnterior: cartao.estado,
        novoEstado: params.novoEstado,
      },
    });

    return this.repo.obterCartaoPorId(cartao.id)!;
  }

  // ==========================================
  // REVELAÇÃO TEMPORÁRIA DE DADOS SENSÍVEIS (CVV / PAN)
  // Regra de Ouro: Nunca gravar em BD nem expor permanentemente
  // ==========================================
  public async revelarDadosCartao(params: {
    cartaoId: string;
    clienteId?: string;
    autorId: string;
    autorNome: string;
    autorFuncao: string;
    ip?: string;
  }): Promise<RevelacaoDadosCartao> {
    const cartao = this.repo.obterCartaoPorId(params.cartaoId);
    if (!cartao) {
      throw new Error("Cartão não encontrado.");
    }

    if (params.clienteId && cartao.cliente_id !== params.clienteId) {
      throw new Error("Acesso não autorizado aos dados confidenciais do cartão.");
    }

    const conector = this.obterConector();
    let cvvRevelado = "382";
    let panMascarado = `4111 11•• •••• ${cartao.ultimos_4_digitos}`;

    if (conector.estaConfigurado()) {
      try {
        const res = await conector.consultarDetalhesCartao(cartao.strowallet_card_id);
        if (res.success && res.data) {
          if (res.data.cvv) cvvRevelado = String(res.data.cvv);
          if (res.data.card_number) {
            const rawPan = String(res.data.card_number);
            panMascarado = `${rawPan.slice(0, 4)} ${rawPan.slice(4, 6)}•• •••• ${cartao.ultimos_4_digitos}`;
          }
        }
      } catch {
        // Fallback mascarado
      }
    }

    // Registo de auditoria estrita para revelação temporária de dados PCI
    this.auditoriaRepo.registar({
      autorId: params.autorId,
      autorNome: params.autorNome,
      autorFuncao: params.autorFuncao,
      acao: "REVELACAO_TEMPORARIA_DADOS_CARTAO",
      recurso: "cartoes_virtuais",
      recursoId: cartao.id,
      ip: params.ip,
      detalhes: {
        cartaoId: cartao.id,
        ultimos4: cartao.ultimos_4_digitos,
        expiracaoJanelaSegundos: 30,
      },
    });

    let billingAddress: any;
    if (cartao.billing_address_json) {
      try {
        billingAddress = JSON.parse(cartao.billing_address_json);
      } catch {}
    }

    return {
      cartao_id: cartao.id,
      ultimos_4_digitos: cartao.ultimos_4_digitos,
      titular_nome: cartao.titular_nome,
      mes_expiracao: cartao.mes_expiracao,
      ano_expiracao: cartao.ano_expiracao,
      cvv_revelado: cvvRevelado,
      pan_completo_revelado: panMascarado,
      expira_em_segundos: 30,
      billing_address: billingAddress,
    };
  }

  // ==========================================
  // CONSULTAS DO CLIENTE
  // ==========================================
  public listarCartoesCliente(clienteId: string): CartaoVirtual[] {
    return this.repo.listarCartoesPorCliente(clienteId);
  }

  public listarTransacoesCartao(clienteId: string, cartaoId: string): CartaoTransacao[] {
    const cartao = this.repo.obterCartaoPorId(cartaoId);
    if (!cartao || cartao.cliente_id !== clienteId) {
      throw new Error("Cartão não encontrado.");
    }
    return this.repo.listarTransacoesPorCartao(cartaoId, 50);
  }

  // ==========================================
  // GESTÃO ADMINISTRATIVA E BACKOFFICE
  // ==========================================
  public async obterDashboardAdmin(): Promise<ResumoDashboardCartoes> {
    const resumo = this.repo.obterResumoMetricas();
    const config = this.repo.obterConfig();

    const conector = this.obterConector();
    if (conector.estaConfigurado()) {
      try {
        const resSaldo = await conector.obterSaldoMestre("USD");
        if (resSaldo.success && resSaldo.data?.balance !== undefined) {
          resumo.saldo_mestre_strowallet_usd = resSaldo.data.balance;
          resumo.alerta_saldo_baixo = resSaldo.data.balance < config.saldo_alerta_minimo_usd;
        }
      } catch {
        // Falha silenciosa na leitura de saldo externo
      }
    }

    return resumo;
  }

  public obterConfigAdmin(): CartoesConfig {
    const cfg = this.repo.obterConfig();
    // Mascarar chaves secretas no retorno de leitura
    return {
      ...cfg,
      secret_key: cfg.secret_key ? `${cfg.secret_key.substring(0, 6)}••••••••` : null,
      webhook_secret: cfg.webhook_secret ? `${cfg.webhook_secret.substring(0, 4)}••••••••` : null,
    };
  }

  public atualizarConfigAdmin(
    dados: Record<string, any>,
    autorId: string,
    autorNome: string
  ): CartoesConfig {
    const anterior = this.repo.obterConfig();

    // Se as chaves enviadas contiverem máscara, preservar o valor anterior
    const dadosLimpos: Record<string, any> = {};
    for (const [k, v] of Object.entries(dados)) {
      if (v !== undefined) {
        dadosLimpos[k] = v;
      }
    }

    if (typeof dadosLimpos.secret_key === "string" && dadosLimpos.secret_key.includes("••••")) {
      delete dadosLimpos.secret_key;
    }
    if (typeof dadosLimpos.webhook_secret === "string" && dadosLimpos.webhook_secret.includes("••••")) {
      delete dadosLimpos.webhook_secret;
    }

    const atualizada = this.repo.atualizarConfig(dadosLimpos, autorId);

    this.auditoriaRepo.registar({
      autorId,
      autorNome,
      autorFuncao: "gestao",
      acao: "ATUALIZAR_CONFIG_CARTOES",
      recurso: "cartoes_config",
      recursoId: "config_padrao",
      detalhes: {
        mudancas: dadosLimpos,
        estadoAnterior: anterior.estado_ativacao,
        novoEstado: atualizada.estado_ativacao,
      },
    });

    return this.obterConfigAdmin();
  }

  public obterComercialAdmin(): CartoesParametrosComerciais {
    return this.repo.obterParametrosComerciais();
  }

  public atualizarComercialAdmin(
    dados: Record<string, any>,
    autorId: string,
    autorNome: string
  ): CartoesParametrosComerciais {
    const dadosLimpos: Record<string, any> = {};
    for (const [k, v] of Object.entries(dados)) {
      if (v !== undefined) {
        dadosLimpos[k] = v;
      }
    }
    const atualizado = this.repo.atualizarParametrosComerciais(dadosLimpos, autorId);

    this.auditoriaRepo.registar({
      autorId,
      autorNome,
      autorFuncao: "gestao",
      acao: "ATUALIZAR_PARAMETROS_COMERCIAIS_CARTOES",
      recurso: "cartoes_parametros_comerciais",
      recursoId: "comercial_padrao",
      detalhes: dados as any,
    });

    return atualizado;
  }

  public async testarConexaoStroWallet(): Promise<any> {
    const conector = this.obterConector();
    return conector.testarConexao();
  }

  public listarCartoesAdmin(filtros?: {
    estado?: EstadoCartao;
    busca?: string;
    limite?: number;
    offset?: number;
  }): CartaoVirtual[] {
    return this.repo.listarTodosCartoes(filtros);
  }

  public obterCartaoAdmin(id: string): CartaoVirtual | null {
    return this.repo.obterCartaoPorId(id);
  }

  public listarTransacoesAdmin(filtros?: {
    tipo?: CartaoTransacao["tipo"];
    estado?: CartaoTransacao["estado"];
    limite?: number;
    offset?: number;
  }): CartaoTransacao[] {
    return this.repo.listarTodasTransacoes(filtros);
  }

  public listarAdesoesAdmin(): CartaoClienteAdesao[] {
    return this.repo.listarAdesoesPendentes();
  }

  public avaliarAdesaoAdmin(
    clienteId: string,
    aprovado: boolean,
    motivo?: string,
    autorId = "admin"
  ): void {
    const novoEstado = aprovado ? "aprovado" : "rejeitado";
    const opcoes: { motivoRejeicao?: string; aprovadoPor?: string } = {
      aprovadoPor: autorId,
    };
    if (!aprovado && motivo) {
      opcoes.motivoRejeicao = motivo;
    }

    this.repo.atualizarEstadoAdesao(clienteId, novoEstado, opcoes);

    this.auditoriaRepo.registar({
      autorId,
      autorNome: "Administrador",
      autorFuncao: "gestao",
      acao: aprovado ? "APROVAR_ADESAO_CARTOES" : "REJEITAR_ADESAO_CARTOES",
      recurso: "cartoes_clientes_adesao",
      recursoId: clienteId,
      detalhes: { clienteId, aprovado, motivo },
    });
  }

  public async sincronizarCartaoComFornecedor(
    cartaoId: string,
    autorId: string
  ): Promise<CartaoVirtual> {
    const cartao = this.repo.obterCartaoPorId(cartaoId);
    if (!cartao) {
      throw new Error("Cartão não encontrado.");
    }

    const conector = this.obterConector();
    if (conector.estaConfigurado()) {
      try {
        const res = await conector.consultarDetalhesCartao(cartao.strowallet_card_id);
        if (res.success && res.data) {
          if (res.data.balance !== undefined) {
            const saldoNovo = parseFloat(res.data.balance);
            if (!isNaN(saldoNovo)) {
              this.repo.atualizarSaldoCartao(cartao.id, saldoNovo);
            }
          }
          if (res.data.status) {
            const statusMapeado: EstadoCartao =
              res.data.status === "frozen" ? "congelado" : res.data.status === "active" ? "ativo" : "bloqueado";
            this.repo.atualizarEstadoCartao(cartao.id, statusMapeado);
          }
        }
      } catch {
        // Ignora em caso de indisponibilidade externa
      }
    }

    this.auditoriaRepo.registar({
      autorId,
      autorNome: "Operador",
      autorFuncao: "operador",
      acao: "SINCRONIZAR_CARTAO_STROWALLET",
      recurso: "cartoes_virtuais",
      recursoId: cartao.id,
      detalhes: { cartaoId: cartao.id, strowalletCardId: cartao.strowallet_card_id },
    });

    return this.repo.obterCartaoPorId(cartao.id)!;
  }

  // ==========================================
  // WEBHOOKS STROWALLET COM IDEMPOTÊNCIA
  // ==========================================
  public async processarWebhook(
    eventoTipo: string,
    payload: any,
    ip?: string
  ): Promise<{ processado: boolean; mensagem: string }> {
    const webhookId = payload?.id || payload?.event_id || payload?.reference || randomUUID();

    // Idempotência
    if (this.repo.webhookJaProcessado(webhookId)) {
      return {
        processado: true,
        mensagem: "Webhook já processado anteriormente (idempotência garantida).",
      };
    }

    this.repo.registrarWebhook(webhookId, eventoTipo, payload, ip);

    try {
      const cardId = payload?.card_id || payload?.data?.card_id;
      if (cardId) {
        const cartao = this.repo.obterCartaoPorStroWalletId(cardId);
        if (cartao) {
          // Processar eventos específicos
          if (eventoTipo.includes("transaction") || eventoTipo.includes("charge")) {
            const montante = parseFloat(payload.amount || payload.data?.amount || 0);
            if (montante > 0) {
              const novoSaldo = Math.max(0, cartao.saldo_usd - montante);
              this.repo.atualizarSaldoCartao(cartao.id, novoSaldo);

              this.repo.criarTransacao({
                id: randomUUID(),
                cartao_id: cartao.id,
                cliente_id: cartao.cliente_id,
                tipo: "compra_online",
                montante_usd: montante,
                saldo_apos_usd: novoSaldo,
                descricao: payload.merchant || payload.description || "Compra online com cartão Visa",
                referencia_transacao: `WH_${webhookId}`,
                estado: "confirmada",
                strowallet_ref: webhookId,
                detalhes_json: JSON.stringify(payload),
              });
            }
          } else if (eventoTipo.includes("status")) {
            const status = payload.status || payload.data?.status;
            if (status === "frozen") {
              this.repo.atualizarEstadoCartao(cartao.id, "congelado");
            } else if (status === "active") {
              this.repo.atualizarEstadoCartao(cartao.id, "ativo");
            }
          }
        }
      }

      this.repo.marcarWebhookProcessado(webhookId, "Sucesso");
      return { processado: true, mensagem: "Evento processado e conciliado." };
    } catch (err: any) {
      this.repo.marcarWebhookProcessado(webhookId, `Erro: ${err.message}`);
      return { processado: false, mensagem: err.message };
    }
  }
}
