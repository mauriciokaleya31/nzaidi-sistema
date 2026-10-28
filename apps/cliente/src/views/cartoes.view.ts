import { api } from "../api.js";

function mostrarNotificacaoCartao(mensagem: string, tipo: "sucesso" | "erro" = "sucesso"): void {
  const toast = document.createElement("div");
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:10000;background:${tipo === "sucesso" ? "#059669" : "#dc2626"};color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 12px 24px rgba(0,0,0,0.2);`;
  toast.textContent = mensagem;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

export async function renderizarCartoes(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="cartoes-page" style="max-width: 1040px; margin: 0 auto; padding: 24px 16px;">
      <div id="cartoes-loading" style="padding: 48px; text-align: center; color: #64748b;">
        <div class="spinner" style="margin-bottom: 12px;"></div>
        <p>A carregar informações dos seus cartões Visa...</p>
      </div>

      <div id="cartoes-content" style="display: none;">
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">NZAIDI Cartões</h1>
              <span id="badge-cartoes-tipo" style="background: #0284c7; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Visa USD</span>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 0;">O seu cartão Visa internacional virtual para pagamentos, compras online e serviços digitais.</p>
          </div>
          <div id="header-acoes" style="display: flex; gap: 10px;"></div>
        </div>

        <!-- Banner de Manutenção ou Aviso -->
        <div id="banner-aviso-portal" style="display: none; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 14px;"></div>

        <!-- Secção Principal Dinâmica -->
        <div id="main-cartoes-area"></div>
      </div>
    </div>

    <!-- Estilos do Cartão 3D e Animações -->
    <style>
      .card-3d-scene {
        perspective: 1000px;
        width: 100%;
        max-width: 420px;
        height: 250px;
        margin: 0 auto 24px auto;
      }
      .card-3d-object {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 16px;
        cursor: pointer;
      }
      .card-3d-object.flipped {
        transform: rotateY(180deg);
      }
      @media (prefers-reduced-motion: reduce) {
        .card-3d-object {
          transition: none;
        }
        .card-3d-object.flipped {
          transform: none;
        }
        .card-3d-face-front.is-flipped-mode {
          display: none !important;
        }
        .card-3d-face-back.is-flipped-mode {
          display: block !important;
          transform: none !important;
        }
      }
      .card-3d-face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 16px 32px -8px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        color: #fff;
      }
      .card-3d-face-front {
        background: radial-gradient(circle at 85% 15%, #2a3447 0%, #0d131f 70%, #060910 100%);
        padding: 22px 24px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .card-3d-face-back {
        background: radial-gradient(circle at 15% 85%, #2a3447 0%, #0d131f 70%, #060910 100%);
        transform: rotateY(180deg);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding-bottom: 18px;
      }
      .card-chip {
        width: 44px;
        height: 34px;
        background: linear-gradient(135deg, #d4af37 0%, #f3e5ab 50%, #aa771c 100%);
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4) inset;
        position: relative;
        overflow: hidden;
      }
      .card-chip::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(0,0,0,0.15) 6px, rgba(0,0,0,0.15) 7px);
      }
    </style>
  `;

  await carregarEstadoCartoes(container);
}

async function carregarEstadoCartoes(container: HTMLElement): Promise<void> {
  const loading = container.querySelector("#cartoes-loading") as HTMLElement;
  const content = container.querySelector("#cartoes-content") as HTMLElement;
  const mainArea = container.querySelector("#main-cartoes-area") as HTMLElement;
  const banner = container.querySelector("#banner-aviso-portal") as HTMLElement;
  const headerAcoes = container.querySelector("#header-acoes") as HTMLElement;

  try {
    const statusPortal = await api.obterStatusCartoesPortal();
    loading.style.display = "none";
    content.style.display = "block";

    // 1. Verificação de Modo Manutenção
    if (statusPortal.modo_manutencao) {
      banner.style.display = "block";
      banner.style.background = "#fef2f2";
      banner.style.border = "1px solid #fecaca";
      banner.style.color = "#991b1b";
      banner.innerHTML = `<strong>Aviso do Serviço:</strong> ${
        statusPortal.mensagem_manutencao || "O serviço de cartões encontra-se temporariamente em manutenção para melhorias técnicas."
      }`;
    } else if (!statusPortal.servico_ativo && statusPortal.estado_ativacao === "em_preparacao") {
      banner.style.display = "block";
      banner.style.background = "#eff6ff";
      banner.style.border = "1px solid #bfdbfe";
      banner.style.color = "#1e40af";
      banner.innerHTML = `<strong>Lançamento em Preparação:</strong> O serviço NZAIDI Cartões Visa Virtuais está em fase final de preparação técnica e estará disponível para emissão muito brevemente.`;
    }

    // 2. Verificação de Elegibilidade KYC
    if (!statusPortal.cliente_elegivel) {
      mainArea.innerHTML = `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px 24px; text-align: center; max-width: 580px; margin: 30px auto;">
          <div style="width: 56px; height: 56px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: #d97706;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Validação KYC Necessária</h2>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">${
            statusPortal.motivo_inelegibilidade || "Para emitir cartões Visa internacionais é obrigatório ter o dossiê KYC verificado e aprovado pela nossa equipa de conformidade."
          }</p>
          <a href="#documentos" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; background: #0284c7; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Submeter Documentos KYC
          </a>
        </div>
      `;
      return;
    }

    // 3. Verificação de Adesão ao Serviço
    if (!statusPortal.adesao || statusPortal.adesao.estado_adesao !== "aprovado") {
      const emAnalise = statusPortal.adesao?.estado_adesao === "pendente";
      mainArea.innerHTML = `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px 28px; max-width: 650px; margin: 20px auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 52px; height: 52px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto; color: #16a34a;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Adesão ao NZAIDI Cartões Visa</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Obtenha o seu cartão virtual Visa em USD para compras globais e serviços digitais.</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.6;">
            <strong style="color: #0f172a; display: block; margin-bottom: 8px;">Condições e Vantagens Principais:</strong>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Cartão pré-pago internacional Visa emitido em Dólares Americanos (USD).</li>
              <li>Taxa de emissão única de <strong>\$${statusPortal.parametros_comerciais.taxa_emissao_usd.toFixed(2)} USD</strong>.</li>
              <li>Comissão de carregamento de <strong>${statusPortal.parametros_comerciais.comissao_carregamento_pct}% + \$${statusPortal.parametros_comerciais.comissao_carregamento_fixa_usd.toFixed(2)} USD</strong>.</li>
              <li>Pagamento do carregamento em Kwanzas (AOA) à taxa oficial NZAIDI do dia.</li>
              <li>Compatível com pagamentos online, subscrições de software, streaming e publicidade.</li>
            </ul>
          </div>

          ${
            emAnalise
              ? `
            <div style="padding: 14px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; text-align: center; color: #92400e; font-size: 13px;">
              A sua solicitação de adesão foi recebida e está sob validação automática. Atualize a página dentro de momentos.
            </div>
          `
              : `
            <button id="btn-aderir-servico" class="btn btn-primary" style="width: 100%; background: #0284c7; color: #fff; padding: 12px; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              Aceitar Termos e Aderir ao NZAIDI Cartões
            </button>
          `
          }
        </div>
      `;

      container.querySelector("#btn-aderir-servico")?.addEventListener("click", async () => {
        try {
          await api.aderirCartoesPortal();
          mostrarNotificacaoCartao("Pedido de adesão enviado com sucesso!", "sucesso");
          await carregarEstadoCartoes(container);
        } catch (err: any) {
          mostrarNotificacaoCartao(`Erro ao solicitar adesão: ${err.message}`, "erro");
        }
      });
      return;
    }

    // 4. Cliente Aprovado: Listar Cartões
    const cartoes = await api.listarMeusCartoes();

    headerAcoes.innerHTML = `
      <button id="btn-novo-cartao" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; background: #0284c7; color: #fff; padding: 8px 16px; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Emitir Novo Cartão
      </button>
    `;

    if (!cartoes || cartoes.length === 0) {
      mainArea.innerHTML = `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 48px 24px; text-align: center; max-width: 540px; margin: 20px auto;">
          <div style="width: 56px; height: 56px; background: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: #0284c7;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Ainda não possui cartões Visa</h2>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">A sua adesão está aprovada! Emita o seu primeiro cartão virtual Visa em USD com ativação imediata.</p>
          <button id="btn-primeiro-cartao" class="btn btn-primary" style="background: #0284c7; color: #fff; padding: 12px 24px; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;">
            Solicitar o Meu Primeiro Cartão Visa
          </button>
        </div>
      `;

      container.querySelector("#btn-primeiro-cartao")?.addEventListener("click", () => {
        abrirModalEmissao(container, statusPortal);
      });
      container.querySelector("#btn-novo-cartao")?.addEventListener("click", () => {
        abrirModalEmissao(container, statusPortal);
      });
      return;
    }

    // Renderizar o Cartão Ativo (Primeiro Cartão) com Componente 3D
    const cartaoAtivo = cartoes[0];
    const transacoes = await api.listarTransacoesCartao(cartaoAtivo.id);
    const taxaBase = statusPortal.taxa_cambio_base || 950.0;
    const saldoEquivalenteAoa = Math.round(cartaoAtivo.saldo_usd * taxaBase);

    mainArea.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 32px; align-items: start;">
        <!-- Lado Esquerdo: Componente Visual 3D do Cartão -->
        <div>
          <div class="card-3d-scene" id="cena-cartao">
            <div class="card-3d-object" id="objeto-cartao" title="Clique para virar o cartão">
              <!-- Frente do Cartão -->
              <div class="card-3d-face card-3d-face-front">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 13px; font-weight: 700; letter-spacing: 1.5px; color: #e2e8f0; display: flex; align-items: center; gap: 6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                    NZAIDI
                  </div>
                  <span style="font-size: 10px; font-weight: 700; background: ${
                    cartaoAtivo.estado === "ativo" ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"
                  }; color: ${
                    cartaoAtivo.estado === "ativo" ? "#34d399" : "#fbbf24"
                  }; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; border: 1px solid currentColor;">
                    ${cartaoAtivo.estado}
                  </span>
                </div>

                <div style="display: flex; align-items: center; gap: 14px; margin: 10px 0;">
                  <div class="card-chip"></div>
                  <!-- Símbolo Contactless / NFC em SVG -->
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round">
                    <path d="M7 6a7 7 0 0 1 0 12"/>
                    <path d="M11 4a11 11 0 0 1 0 16"/>
                    <path d="M15 2a15 15 0 0 1 0 20"/>
                  </svg>
                </div>

                <div>
                  <div style="font-family: monospace; font-size: 19px; letter-spacing: 2px; color: #f8fafc; text-shadow: 0 2px 4px rgba(0,0,0,0.6); margin-bottom: 12px;" id="disp-pan-frente">
                    •••• •••• •••• ${cartaoAtivo.ultimos_4_digitos}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                      <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Titular</div>
                      <div style="font-size: 13px; font-weight: 600; color: #fff; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        ${cartaoAtivo.titular_nome}
                      </div>
                    </div>
                    <div>
                      <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Validade</div>
                      <div style="font-size: 13px; font-weight: 600; color: #fff; letter-spacing: 1px; font-family: monospace;">
                        ${cartaoAtivo.mes_expiracao}/${cartaoAtivo.ano_expiracao.slice(-2)}
                      </div>
                    </div>
                    <!-- Logótipo VISA Estilizado em SVG -->
                    <div style="font-size: 22px; font-weight: 900; font-style: italic; letter-spacing: -1px; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                      VISA
                    </div>
                  </div>
                </div>
              </div>

              <!-- Verso do Cartão -->
              <div class="card-3d-face card-3d-face-back">
                <div>
                  <div style="height: 40px; background: #000; margin-top: 18px; width: 100%;"></div>
                  <div style="padding: 14px 20px 0 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="background: #e2e8f0; height: 32px; flex: 1; border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a;">
                        <span id="disp-cvv-verso">•••</span>
                      </div>
                      <button id="btn-revelar-cvv" type="button" style="padding: 6px 10px; font-size: 11px; background: #334155; color: #fff; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Revelar CVV
                      </button>
                    </div>
                    <div id="cvv-timer" style="font-size: 10px; color: #fbbf24; margin-top: 4px; display: none;">Oculta em <span id="segundos-restantes">30</span>s</div>
                  </div>
                </div>
                <div style="padding: 0 20px; font-size: 9px; color: #64748b; line-height: 1.4;">
                  Cartão emitido para uso eletrónico internacional. Sujeito às normas de segurança PCI-DSS e aos termos de conformidade NZAIDI.
                </div>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin-top: -12px;">
            <button id="btn-virar-cartao" class="btn btn-outline" style="font-size: 12px; padding: 6px 14px; border: 1px solid #cbd5e1; border-radius: 20px; background: #fff; cursor: pointer; color: #475569;">
              Clique no cartão para virar (Frente / Verso)
            </button>
          </div>
        </div>

        <!-- Lado Direito: Saldo, Controlo e Ações Rápidas -->
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Saldo Disponível no Cartão</div>
          <div style="font-size: 34px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
            \$${Number(cartaoAtivo.saldo_usd).toFixed(2)} <span style="font-size: 16px; font-weight: 600; color: #64748b;">USD</span>
          </div>
          <div style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
            ≈ ${saldoEquivalenteAoa.toLocaleString("pt-PT")} AOA <span style="font-size: 11px; color: #94a3b8;">(à taxa de ${taxaBase.toFixed(2)} AOA/USD)</span>
          </div>

          <!-- Botões de Ação -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <button id="btn-carregar-cartao" style="background: #0284c7; color: #fff; padding: 12px; border: none; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Carregar Cartão
            </button>
            <button id="btn-copiar-dados" style="background: #f1f5f9; color: #1e293b; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copiar Dados
            </button>
          </div>

          <!-- Controle de Bloqueio -->
          <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px; font-weight: 600; color: #1e293b;">Bloqueio Temporário</div>
              <div style="font-size: 12px; color: #64748b;">Congele o cartão para compras a qualquer momento.</div>
            </div>
            <button id="btn-congelar-toggle" style="padding: 8px 14px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; border: 1px solid ${
              cartaoAtivo.estado === "ativo" ? "#cbd5e1; background: #fff; color: #334155;" : "#bbf7d0; background: #f0fdf4; color: #166534;"
            }">
              ${cartaoAtivo.estado === "ativo" ? "Congelar Cartão" : "Descongelar Cartão"}
            </button>
          </div>
        </div>
      </div>

      <!-- Tabela de Movimentos Recentes -->
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Movimentos Recentes</h3>
        <div class="table-responsive">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 10px;">Data</th>
                <th style="padding: 10px;">Operação</th>
                <th style="padding: 10px;">Descrição</th>
                <th style="padding: 10px;">Montante</th>
                <th style="padding: 10px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${
                transacoes && transacoes.length > 0
                  ? transacoes
                      .map(
                        (t: any) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 10px; color: #64748b;">${new Date(t.criado_em).toLocaleDateString("pt-PT")}</td>
                  <td style="padding: 12px 10px; font-weight: 600; text-transform: capitalize;">${t.tipo.replace("_", " ")}</td>
                  <td style="padding: 12px 10px;">${t.descricao || "-"}</td>
                  <td style="padding: 12px 10px; font-weight: 700; color: ${t.tipo === "compra_online" ? "#dc2626" : "#16a34a"};">
                    ${t.tipo === "compra_online" ? "-" : "+"}\$${Number(t.montante_usd).toFixed(2)} USD
                  </td>
                  <td style="padding: 12px 10px;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #dcfce7; color: #166534;">
                      ${t.estado}
                    </span>
                  </td>
                </tr>
              `
                      )
                      .join("")
                  : `<tr><td colspan="5" style="padding: 24px; text-align: center; color: #64748b;">Sem movimentações registadas até ao momento.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Eventos do Cartão 3D
    const objCartao = container.querySelector("#objeto-cartao") as HTMLElement;
    const btnVirar = container.querySelector("#btn-virar-cartao");
    const alternarFlip = () => {
      objCartao.classList.toggle("flipped");
    };
    objCartao?.addEventListener("click", (e) => {
      // Não virar se clicou no botão de revelar CVV
      if ((e.target as HTMLElement).id === "btn-revelar-cvv") return;
      alternarFlip();
    });
    btnVirar?.addEventListener("click", alternarFlip);

    // Revelação temporária de CVV
    const btnRevelarCvv = container.querySelector("#btn-revelar-cvv") as HTMLButtonElement;
    const dispCvv = container.querySelector("#disp-cvv-verso") as HTMLElement;
    const cvvTimer = container.querySelector("#cvv-timer") as HTMLElement;
    const segRestantes = container.querySelector("#segundos-restantes") as HTMLElement;

    btnRevelarCvv?.addEventListener("click", async (e) => {
      e.stopPropagation();
      btnRevelarCvv.disabled = true;
      btnRevelarCvv.textContent = "A obter...";

      try {
        const dados = await api.revelarDadosCartao(cartaoAtivo.id);
        dispCvv.textContent = dados.cvv_revelado || "•••";
        btnRevelarCvv.style.display = "none";
        cvvTimer.style.display = "block";

        let contagem = 30;
        segRestantes.textContent = String(contagem);
        const interval = setInterval(() => {
          contagem--;
          segRestantes.textContent = String(contagem);
          if (contagem <= 0) {
            clearInterval(interval);
            dispCvv.textContent = "•••";
            btnRevelarCvv.style.display = "inline-block";
            btnRevelarCvv.disabled = false;
            btnRevelarCvv.textContent = "Revelar CVV";
            cvvTimer.style.display = "none";
          }
        }, 1000);
      } catch (err: any) {
        mostrarNotificacaoCartao(`Não foi possível revelar os dados confidenciais: ${err.message}`, "erro");
        btnRevelarCvv.disabled = false;
        btnRevelarCvv.textContent = "Revelar CVV";
      }
    });

    // Copiar dados
    container.querySelector("#btn-copiar-dados")?.addEventListener("click", () => {
      const texto = `Cartão Visa USD NZAIDI\nNúmero: •••• •••• •••• ${cartaoAtivo.ultimos_4_digitos}\nTitular: ${cartaoAtivo.titular_nome}\nValidade: ${cartaoAtivo.mes_expiracao}/${cartaoAtivo.ano_expiracao}`;
      navigator.clipboard.writeText(texto).then(() => {
        const btn = container.querySelector("#btn-copiar-dados") as HTMLElement;
        const origText = btn.innerHTML;
        btn.textContent = "Dados Copiados!";
        setTimeout(() => {
          btn.innerHTML = origText;
        }, 3000);
      });
    });

    // Congelar / Descongelar
    container.querySelector("#btn-congelar-toggle")?.addEventListener("click", async () => {
      const novoEstado = cartaoAtivo.estado === "ativo" ? "congelado" : "ativo";
      try {
        await api.alterarEstadoCartaoVisa(cartaoAtivo.id, novoEstado);
        mostrarNotificacaoCartao(`Cartão ${novoEstado === "congelado" ? "congelado" : "descongelado"} com sucesso.`, "sucesso");
        await carregarEstadoCartoes(container);
      } catch (err: any) {
        mostrarNotificacaoCartao(`Erro ao alterar estado: ${err.message}`, "erro");
      }
    });

    // Modal Carregar Cartão
    container.querySelector("#btn-carregar-cartao")?.addEventListener("click", () => {
      abrirModalCarregamento(container, cartaoAtivo, statusPortal);
    });

    // Modal Novo Cartão
    container.querySelector("#btn-novo-cartao")?.addEventListener("click", () => {
      abrirModalEmissao(container, statusPortal);
    });
  } catch (err) {
    console.error("Erro ao carregar cartões:", err);
    loading.style.display = "none";
    content.style.display = "block";
    mainArea.innerHTML = `<div class="alert-box alert-error">Falha ao ligar ao serviço de cartões. Por favor tente mais tarde.</div>`;
  }
}

function abrirModalEmissao(container: HTMLElement, statusPortal: any): void {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;";

  const taxaEmissao = statusPortal.parametros_comerciais.taxa_emissao_usd;
  const minRecarga = statusPortal.parametros_comerciais.limite_min_carregamento_usd;

  overlay.innerHTML = `
    <div style="background: #fff; border-radius: 12px; width: 100%; max-width: 480px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">Emitir Novo Cartão Visa USD</h3>
        <button id="modal-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
      </div>

      <form id="form-emissao-cartao">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Rótulo do Cartão (Opcional)</label>
          <input type="text" id="emissao-rotulo" placeholder="Ex: Compras Amazon, Assinaturas..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;" />
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Carregamento Inicial (USD)</label>
          <input type="number" id="emissao-montante-usd" min="${minRecarga}" step="5" value="${minRecarga}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;" required />
          <span style="font-size: 11px; color: #64748b;">Mínimo de \$${minRecarga} USD para saldo inicial do cartão.</span>
        </div>

        <!-- Pré-visualização de Cálculo -->
        <div id="emissao-calculo-box" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Taxa de Emissão:</span>
            <strong>\$${taxaEmissao.toFixed(2)} USD</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Saldo Inicial Creditado:</span>
            <strong id="sim-saldo-inicial">\$${minRecarga.toFixed(2)} USD</strong>
          </div>
          <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; color: #0284c7; font-size: 14px; font-weight: 700;">
            <span>Total a Liquidar (AOA):</span>
            <span id="sim-total-aoa">A calcular...</span>
          </div>
        </div>

        <button type="submit" id="btn-confirmar-emissao" style="width: 100%; background: #0284c7; color: #fff; padding: 12px; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer;">
          Confirmar e Emitir Cartão
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const inputMontante = overlay.querySelector("#emissao-montante-usd") as HTMLInputElement;
  const simSaldo = overlay.querySelector("#sim-saldo-inicial") as HTMLElement;
  const simTotal = overlay.querySelector("#sim-total-aoa") as HTMLElement;

  const atualizarSimulacao = async () => {
    const val = parseFloat(inputMontante.value) || minRecarga;
    simSaldo.textContent = `\$${val.toFixed(2)} USD`;
    try {
      const calc = await api.calcularEmissaoCartao(val);
      simTotal.textContent = `${Number(calc.total_geral_aoa).toLocaleString("pt-PT")} AOA`;
    } catch {
      simTotal.textContent = "-";
    }
  };
  inputMontante.addEventListener("input", atualizarSimulacao);
  atualizarSimulacao();

  overlay.querySelector("#modal-close")?.addEventListener("click", () => overlay.remove());

  overlay.querySelector("#form-emissao-cartao")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector("#btn-confirmar-emissao") as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "A emitir cartão...";

    try {
      const montante = parseFloat(inputMontante.value);
      const rotulo = (overlay.querySelector("#emissao-rotulo") as HTMLInputElement).value;
      await api.solicitarCartaoVisa(montante, rotulo || undefined);
      overlay.remove();
      mostrarNotificacaoCartao("Cartão Visa Virtual emitido com sucesso!", "sucesso");
      await carregarEstadoCartoes(container);
    } catch (err: any) {
      mostrarNotificacaoCartao(`Falha na emissão: ${err.message}`, "erro");
      btn.disabled = false;
      btn.textContent = "Confirmar e Emitir Cartão";
    }
  });
}

function abrirModalCarregamento(container: HTMLElement, cartao: any, statusPortal: any): void {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;";

  const minRecarga = statusPortal.parametros_comerciais.limite_min_carregamento_usd;
  const maxRecarga = statusPortal.parametros_comerciais.limite_max_carregamento_usd;

  overlay.innerHTML = `
    <div style="background: #fff; border-radius: 12px; width: 100%; max-width: 480px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">Carregar Cartão Visa (•••• ${cartao.ultimos_4_digitos})</h3>
        <button id="modal-recarga-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
      </div>

      <form id="form-recarga-cartao">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Montante a Carregar (USD)</label>
          <input type="number" id="recarga-montante-usd" min="${minRecarga}" max="${maxRecarga}" step="5" value="50" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;" required />
          <span style="font-size: 11px; color: #64748b;">Limites permitidos: \$${minRecarga} a \$${maxRecarga} USD por recarga.</span>
        </div>

        <!-- Simulação Detalhada -->
        <div id="recarga-calculo-box" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Valor a Creditar no Cartão:</span>
            <strong id="sim-recarga-usd">\$50.00 USD</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Comissão de Carregamento:</span>
            <span id="sim-recarga-comissao">-</span>
          </div>
          <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; color: #0284c7; font-size: 14px; font-weight: 700;">
            <span>Total a Pagar (AOA):</span>
            <span id="sim-recarga-total-aoa">A calcular...</span>
          </div>
        </div>

        <button type="submit" id="btn-confirmar-recarga" style="width: 100%; background: #0284c7; color: #fff; padding: 12px; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer;">
          Confirmar Carregamento
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const inputMontante = overlay.querySelector("#recarga-montante-usd") as HTMLInputElement;
  const simUsd = overlay.querySelector("#sim-recarga-usd") as HTMLElement;
  const simComissao = overlay.querySelector("#sim-recarga-comissao") as HTMLElement;
  const simTotal = overlay.querySelector("#sim-recarga-total-aoa") as HTMLElement;

  const atualizarSimulacao = async () => {
    const val = parseFloat(inputMontante.value) || 50;
    simUsd.textContent = `\$${val.toFixed(2)} USD`;
    try {
      const calc = await api.calcularCarregamentoCartao(val);
      simComissao.textContent = `${Number(calc.comissao_total_aoa).toLocaleString("pt-PT")} AOA`;
      simTotal.textContent = `${Number(calc.total_a_pagar_aoa).toLocaleString("pt-PT")} AOA`;
    } catch {
      simTotal.textContent = "-";
    }
  };
  inputMontante.addEventListener("input", atualizarSimulacao);
  atualizarSimulacao();

  overlay.querySelector("#modal-recarga-close")?.addEventListener("click", () => overlay.remove());

  overlay.querySelector("#form-recarga-cartao")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector("#btn-confirmar-recarga") as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "A processar recarga...";

    try {
      const montante = parseFloat(inputMontante.value);
      await api.carregarCartaoVisa(cartao.id, montante);
      overlay.remove();
      mostrarNotificacaoCartao(`Carregamento de USD ${montante} concluído com sucesso!`, "sucesso");
      await carregarEstadoCartoes(container);
    } catch (err: any) {
      mostrarNotificacaoCartao(`Falha no carregamento: ${err.message}`, "erro");
      btn.disabled = false;
      btn.textContent = "Confirmar Carregamento";
    }
  });
}
