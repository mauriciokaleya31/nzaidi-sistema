import { api } from "../api/cliente.js";

type AbaAtiva = "visao-geral" | "monitorizacao" | "requisicoes" | "dispositivos" | "operacoes" | "saude" | "config";

export function renderizarApiGestao(container: HTMLElement): void {
  let abaAtiva: AbaAtiva = "visao-geral";
  let autoRefreshTimer: any = null;
  let kpis: any = null;
  let requisicoes: any[] = [];
  let totalRequisicoes = 0;
  let dispositivos: any[] = [];
  let operacoes: { cambios: any[]; remessas: any[] } = { cambios: [], remessas: [] };
  let saudeServicos: Record<string, any> = {};
  let configs: Record<string, string> = {};
  let alertas: any[] = [];
  let carregando = true;
  let mensagemSucesso = "";
  let mensagemErro = "";

  // Filtros de requisições
  let filtroEndpoint = "";
  let filtroMetodo = "";
  let filtroStatus = "";
  let filtroPlataforma = "";

  function determinarAbaPorHash(): AbaAtiva {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes("/monitorizacao")) return "monitorizacao";
    if (hash.includes("/requisicoes")) return "requisicoes";
    if (hash.includes("/dispositivos")) return "dispositivos";
    if (hash.includes("/operacoes")) return "operacoes";
    if (hash.includes("/saude")) return "saude";
    if (hash.includes("/config")) return "config";
    return "visao-geral";
  }

  async function carregarDados() {
    try {
      const [resKpis, resDisp, resOps, resSaude, resConf, resAlertas] = await Promise.all([
        api.obterMobileDashboard().catch(() => null),
        api.listarMobileDispositivos().catch(() => []),
        api.obterMobileOperacoes().catch(() => ({ cambios: [], remessas: [] })),
        api.obterMobileSaudeServicos().catch(() => ({})),
        api.obterMobileConfig().catch(() => ({})),
        api.listarMobileAlertas().catch(() => []),
      ]);

      kpis = resKpis;
      dispositivos = resDisp;
      operacoes = resOps;
      saudeServicos = resSaude;
      configs = resConf;
      alertas = resAlertas;

      // Carregar requisições com filtros atuais
      const resReqs = await api.listarMobileRequisicoes({
        endpoint: filtroEndpoint || undefined,
        metodo: filtroMetodo || undefined,
        codigoStatus: filtroStatus ? Number(filtroStatus) : undefined,
        plataforma: filtroPlataforma || undefined,
        limite: 50,
      }).catch(() => ({ total: 0, dados: [] }));

      requisicoes = resReqs.dados;
      totalRequisicoes = resReqs.total;
    } catch (e: any) {
      mensagemErro = e.message || "Erro ao carregar dados do módulo mobile.";
    } finally {
      carregando = false;
      render();
    }
  }

  function renderizarAlertaTopo(): string {
    if (mensagemSucesso) {
      return `<div class="alerta alerta-sucesso" style="margin-bottom: 1rem; padding: 12px 16px; border-radius: 8px; background: #e8f6ef; color: #12805c; font-weight: 600;">${mensagemSucesso}</div>`;
    }
    if (mensagemErro) {
      return `<div class="alerta alerta-erro" style="margin-bottom: 1rem; padding: 12px 16px; border-radius: 8px; background: #fee4e2; color: #b42318; font-weight: 600;">${mensagemErro}</div>`;
    }
    return "";
  }

  function render() {
    container.innerHTML = `
      <div class="pagina-animada" style="padding: 1.5rem 2rem;">
        <!-- Cabeçalho Institucional -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 99px; background: #eaf2fc; color: #08264f; font-size: 0.75rem; font-weight: 700; margin-bottom: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #0e8f6e;"></span>
              PORTAL CENTRAL DE CONTROLO DE APLICAÇÕES
            </div>
            <h1 style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin: 0;">Gestão de API & NZAIDI Mobile</h1>
            <p style="color: #64748b; font-size: 0.95rem; margin: 4px 0 0;">Monitorização em tempo real de requisições, dispositivos móveis, segurança e disponibilidade de serviços.</p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="btn-exportar-csv" class="btn btn-secundario" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.85rem; border-color: #0e8f6e; color: #0e8f6e;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar Relatório CSV
            </button>
            <button id="btn-atualizar-dados" class="btn btn-secundario" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.85rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              Atualizar Agora
            </button>
            <span style="font-size: 0.8rem; color: #64748b; padding: 6px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              Auto-atualização: <strong style="color: #0e8f6e;">Ativa (10s)</strong>
            </span>
          </div>
        </div>

        ${renderizarAlertaTopo()}

        <!-- Abas de Navegação -->
        <nav style="display: flex; gap: 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.5rem; overflow-x: auto;">
          <button class="tab-btn ${abaAtiva === "visao-geral" ? "ativa" : ""}" data-aba="visao-geral" style="padding: 10px 16px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${abaAtiva === "visao-geral" ? "#d9a441" : "transparent"}; color: ${abaAtiva === "visao-geral" ? "#08264f" : "#64748b"};">
            Visão Geral
          </button>
          <button class="tab-btn ${abaAtiva === "monitorizacao" ? "ativa" : ""}" data-aba="monitorizacao" style="padding: 10px 16px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${abaAtiva === "monitorizacao" ? "#d9a441" : "transparent"}; color: ${abaAtiva === "monitorizacao" ? "#08264f" : "#64748b"};">
            Centro de Monitorização (Tempo Real)
          </button>
          <button class="tab-btn ${abaAtiva === "requisicoes" ? "ativa" : ""}" data-aba="requisicoes" style="padding: 10px 16px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${abaAtiva === "requisicoes" ? "#d9a441" : "transparent"}; color: ${abaAtiva === "requisicoes" ? "#08264f" : "#64748b"};">
            Rastreio de Requisições (${totalRequisicoes})
          </button>
          <button class="tab-btn ${abaAtiva === "dispositivos" ? "ativa" : ""}" data-aba="dispositivos" style="padding: 10px 16px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${abaAtiva === "dispositivos" ? "#d9a441" : "transparent"}; color: ${abaAtiva === "dispositivos" ? "#08264f" : "#64748b"};">
            Dispositivos Registados (${dispositivos.length})
          </button>
          <button class="tab-btn ${abaAtiva === "operacoes" ? "ativa" : ""}" data-aba="operacoes" style="padding: 10px 16px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${abaAtiva === "operacoes" ? "#d9a441" : "transparent"}; color: ${abaAtiva === "operacoes" ? "#08264f" : "#64748b"};">
            Operações Móveis (${operacoes.cambios.length + operacoes.remessas.length})
          </button>
          <button class="tab-btn ${abaAtiva === "saude" ? "ativa" : ""}" data-aba="saude" style="padding: 10px 16px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${abaAtiva === "saude" ? "#d9a441" : "transparent"}; color: ${abaAtiva === "saude" ? "#08264f" : "#64748b"};">
            Saúde dos Serviços
          </button>
          <button class="tab-btn ${abaAtiva === "config" ? "ativa" : ""}" data-aba="config" style="padding: 10px 16px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${abaAtiva === "config" ? "#d9a441" : "transparent"}; color: ${abaAtiva === "config" ? "#08264f" : "#64748b"};">
            Configuração da API
          </button>
        </nav>

        <!-- Conteúdo da Aba Ativa -->
        <div id="conteudo-aba">
          ${renderizarConteudoAba()}
        </div>
      </div>
    `;

    vincularEventos();
  }

  function renderizarConteudoAba(): string {
    if (carregando) {
      return `<div style="text-align: center; padding: 4rem; color: #64748b;">A carregar telemetria e dados em tempo real...</div>`;
    }

    switch (abaAtiva) {
      case "visao-geral":
        return renderizarVisaoGeral();
      case "monitorizacao":
        return renderizarMonitorizacaoTempoReal();
      case "requisicoes":
        return renderizarRequisicoes();
      case "dispositivos":
        return renderizarDispositivos();
      case "operacoes":
        return renderizarOperacoes();
      case "saude":
        return renderizarSaudeServicos();
      case "config":
        return renderizarConfiguracoes();
    }
  }

  // --- Sub-View: Visão Geral ---
  function renderizarVisaoGeral(): string {
    const k = kpis || {};
    return `
      <!-- Cartões de KPIs de Nível Executivo -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Total de Requisições</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin: 4px 0;">${(k.totalRequisicoes || 0).toLocaleString()}</div>
          <div style="font-size: 0.75rem; color: #0e8f6e; font-weight: 600;">✓ ${k.requisicoesSucesso || 0} com sucesso (2xx)</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Taxa de Erro (4xx/5xx)</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: ${k.requisicoesErro > 0 ? "#b42318" : "#0e8f6e"}; margin: 4px 0;">
            ${k.totalRequisicoes > 0 ? Math.round(((k.requisicoesErro || 0) / k.totalRequisicoes) * 1000) / 10 : 0}%
          </div>
          <div style="font-size: 0.75rem; color: #64748b;">${k.requisicoesErro || 0} falhas registadas</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Latência Média</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin: 4px 0;">${k.latenciaMediaMs || 0} <span style="font-size: 1rem; font-weight: 600;">ms</span></div>
          <div style="font-size: 0.75rem; color: #0e8f6e; font-weight: 600;">⚡ Resposta de alta performance</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Dispositivos Ativos</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin: 4px 0;">${k.dispositivosAtivos || 0}</div>
          <div style="font-size: 0.75rem; color: #64748b;">📱 Android: ${k.dispositivosAndroid || 0} | 🍏 iOS: ${k.dispositivosIos || 0}</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Sessões Ativas</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #08264f; margin: 4px 0;">${k.sessoesAtivas || 0}</div>
          <div style="font-size: 0.75rem; color: #d9a441; font-weight: 600;">🔒 Tokens rotativos protegidos</div>
        </div>
      </div>

      <!-- Distribuição de Tráfego e Alertas -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1.5rem; margin-bottom: 2rem;">
        <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin-top: 0;">Distribuição de Plataformas (Android vs iOS)</h2>
          <div style="margin: 2rem 0; display: flex; align-items: center; gap: 1.5rem;">
            <div style="flex: 1; background: #eaf2fc; border-radius: 12px; padding: 1.5rem; text-align: center;">
              <div style="font-size: 2rem; font-weight: 800; color: #08264f;">${k.dispositivosAndroid || 0}</div>
              <div style="font-weight: 700; color: #08264f; margin-top: 4px;">Android OS</div>
              <div style="font-size: 0.8rem; color: #64748b;">Expo SDK 52 / APK & AAB</div>
            </div>
            <div style="flex: 1; background: #fdf6ea; border-radius: 12px; padding: 1.5rem; text-align: center;">
              <div style="font-size: 2rem; font-weight: 800; color: #d9a441;">${k.dispositivosIos || 0}</div>
              <div style="font-weight: 700; color: #08264f; margin-top: 4px;">Apple iOS</div>
              <div style="font-size: 0.8rem; color: #64748b;">Expo SDK 52 / IPA & TestFlight</div>
            </div>
          </div>
          <p style="font-size: 0.85rem; color: #64748b; margin: 0;">As requisições móveis contêm validação rigorosa de assinatura criptográfica HMAC-SHA256 e rotação atómica de Refresh Tokens a cada 15 minutos.</p>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin-top: 0;">Alertas Operacionais & Incidentes</h2>
          ${
            alertas.length === 0
              ? `<div style="text-align: center; padding: 2rem 1rem; color: #0e8f6e; font-weight: 600;">✓ Nenhum incidente de segurança ou degradação registado.</div>`
              : `<ul style="list-style: none; padding: 0; margin: 0;">
                  ${alertas
                    .map(
                      (a) => `
                    <li style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; gap: 8px;">
                      <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; background: ${a.severidade === "critico" ? "#fee4e2" : "#fef3c7"}; color: ${a.severidade === "critico" ? "#b42318" : "#92400e"};">${a.severidade.toUpperCase()}</span>
                      <div>
                        <strong style="font-size: 0.85rem; color: #08264f;">${a.titulo}</strong>
                        <div style="font-size: 0.75rem; color: #64748b;">${a.mensagem}</div>
                      </div>
                    </li>
                  `
                    )
                    .join("")}
                </ul>`
          }
        </div>
      </div>
    `;
  }

  // --- Sub-View: Monitorização em Tempo Real ---
  function renderizarMonitorizacaoTempoReal(): string {
    const k = kpis || {};
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Utilizadores Ativos Agora</div>
          <div style="font-size: 2rem; font-weight: 800; color: #0e8f6e; margin: 4px 0;">${k.ativosTempoReal ?? k.sessoesAtivas ?? 0}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Eventos nos últimos 15 min</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Ativos nas últimas 24h</div>
          <div style="font-size: 2rem; font-weight: 800; color: #08264f; margin: 4px 0;">${k.ativos24h ?? 0}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Clientes únicos em 24h</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Ativos (7d / 30d)</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #08264f; margin: 4px 0;">${k.ativos7d ?? 0} <span style="font-size: 1rem; color: #64748b; font-weight: 500;">/ ${k.ativos30d ?? 0}</span></div>
          <div style="font-size: 0.75rem; color: #64748b;">Semanal e Mensal</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Novos Registos Hoje</div>
          <div style="font-size: 2rem; font-weight: 800; color: #d9a441; margin: 4px 0;">${k.novosRegistosHoje ?? 0}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Novos terminais móveis</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Clientes Inativos</div>
          <div style="font-size: 2rem; font-weight: 800; color: #64748b; margin: 4px 0;">${k.clientesInativos ?? 0}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Sem atividade há 30 dias</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Dispositivos Bloqueados</div>
          <div style="font-size: 2rem; font-weight: 800; color: ${dispositivos.filter((d) => d.status === "bloqueado").length > 0 ? "#b42318" : "#64748b"}; margin: 4px 0;">
            ${dispositivos.filter((d) => d.status === "bloqueado").length}
          </div>
          <div style="font-size: 0.75rem; color: #64748b;">Suspeita de fraude / perda</div>
        </div>
      </div>
          <div style="font-size: 2rem; font-weight: 800; color: #08264f; margin: 4px 0;">${dispositivos.filter((d) => d.status === "ativo").length}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Dispositivos com atividade recente</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Clientes Móveis</div>
          <div style="font-size: 2rem; font-weight: 800; color: #08264f; margin: 4px 0;">${k.clientesRegistadosMobile || 0}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Clientes com telemóvel associado</div>
        </div>

        <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Dispositivos Bloqueados</div>
          <div style="font-size: 2rem; font-weight: 800; color: ${dispositivos.filter((d) => d.status === "bloqueado").length > 0 ? "#b42318" : "#64748b"}; margin: 4px 0;">
            ${dispositivos.filter((d) => d.status === "bloqueado").length}
          </div>
          <div style="font-size: 0.75rem; color: #64748b;">Por suspeita de fraude / perda</div>
        </div>
      </div>

      <!-- Feed de Atividade ao Vivo -->
      <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin: 0;">Feed de Atividade em Tempo Real</h2>
          <span style="font-size: 0.8rem; color: #0e8f6e; font-weight: 700;">● A receber eventos</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
              <th style="padding: 10px;">Cliente / Email</th>
              <th style="padding: 10px;">Dispositivo</th>
              <th style="padding: 10px;">Plataforma</th>
              <th style="padding: 10px;">Versão App</th>
              <th style="padding: 10px;">Último IP</th>
              <th style="padding: 10px;">Último Acesso</th>
              <th style="padding: 10px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${
              dispositivos.length === 0
                ? `<tr><td colspan="7" style="padding: 2rem; text-align: center; color: #64748b;">Nenhum dispositivo móvel conectado até ao momento.</td></tr>`
                : dispositivos
                    .slice(0, 15)
                    .map(
                      (d) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-weight: 700; color: #08264f;">${d.cliente_nome || "Cliente Móvel"}<br><span style="font-size: 0.75rem; color: #64748b; font-weight: 400;">${d.cliente_email || ""}</span></td>
                    <td style="padding: 10px;">${d.nome_dispositivo}</td>
                    <td style="padding: 10px;"><span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 0.75rem; background: ${d.plataforma === "android" ? "#eaf2fc" : "#fdf6ea"}; color: ${d.plataforma === "android" ? "#08264f" : "#d9a441"};">${d.plataforma.toUpperCase()}</span></td>
                    <td style="padding: 10px; font-family: monospace;">v${d.versao_app}</td>
                    <td style="padding: 10px; font-family: monospace; font-size: 0.8rem;">${d.ultimo_ip || "127.0.0.1"}</td>
                    <td style="padding: 10px; color: #64748b;">${new Date(d.ultimo_acesso).toLocaleTimeString("pt-AO")}</td>
                    <td style="padding: 10px;">
                      <span style="display: inline-block; padding: 3px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: ${d.status === "ativo" ? "#e8f6ef" : d.status === "bloqueado" ? "#fee4e2" : "#f1f5f9"}; color: ${d.status === "ativo" ? "#12805c" : d.status === "bloqueado" ? "#b42318" : "#64748b"};">
                        ${d.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                `
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Sub-View: Rastreio de Requisições ---
  function renderizarRequisicoes(): string {
    return `
      <!-- Barra de Filtros -->
      <div class="cartao" style="background: #fff; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 10px;">Filtros de Telemetria de Requisições</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) 120px; gap: 10px; align-items: end;">
          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">Endpoint</label>
            <input type="text" id="filtro-endpoint" value="${filtroEndpoint}" placeholder="/api/v1/mobile/..." style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">Método</label>
            <select id="filtro-metodo" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem;">
              <option value="" ${filtroMetodo === "" ? "selected" : ""}>Todos</option>
              <option value="GET" ${filtroMetodo === "GET" ? "selected" : ""}>GET</option>
              <option value="POST" ${filtroMetodo === "POST" ? "selected" : ""}>POST</option>
              <option value="PUT" ${filtroMetodo === "PUT" ? "selected" : ""}>PUT</option>
              <option value="DELETE" ${filtroMetodo === "DELETE" ? "selected" : ""}>DELETE</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">Código HTTP</label>
            <select id="filtro-status" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem;">
              <option value="" ${filtroStatus === "" ? "selected" : ""}>Todos</option>
              <option value="200" ${filtroStatus === "200" ? "selected" : ""}>200 OK</option>
              <option value="201" ${filtroStatus === "201" ? "selected" : ""}>201 Created</option>
              <option value="400" ${filtroStatus === "400" ? "selected" : ""}>400 Bad Request</option>
              <option value="401" ${filtroStatus === "401" ? "selected" : ""}>401 Unauthorized</option>
              <option value="429" ${filtroStatus === "429" ? "selected" : ""}>429 Rate Limited</option>
              <option value="500" ${filtroStatus === "500" ? "selected" : ""}>500 Error</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">Plataforma</label>
            <select id="filtro-plataforma" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem;">
              <option value="" ${filtroPlataforma === "" ? "selected" : ""}>Todas</option>
              <option value="android" ${filtroPlataforma === "android" ? "selected" : ""}>Android</option>
              <option value="ios" ${filtroPlataforma === "ios" ? "selected" : ""}>iOS</option>
            </select>
          </div>

          <button id="btn-aplicar-filtros" class="btn btn-primario" style="padding: 9px; font-size: 0.85rem; font-weight: 700; background: #08264f; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
            Filtrar
          </button>
        </div>
      </div>

      <!-- Tabela de Logs Sanitizados -->
      <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
              <th style="padding: 10px;">Método</th>
              <th style="padding: 10px;">Endpoint</th>
              <th style="padding: 10px;">Status</th>
              <th style="padding: 10px;">Duração</th>
              <th style="padding: 10px;">Cliente</th>
              <th style="padding: 10px;">Correlation ID</th>
              <th style="padding: 10px;">Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            ${
              requisicoes.length === 0
                ? `<tr><td colspan="7" style="padding: 3rem; text-align: center; color: #64748b;">Nenhuma requisição móvel encontrada com os filtros selecionados.</td></tr>`
                : requisicoes
                    .map(
                      (r) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px;">
                      <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 0.75rem; background: ${r.metodo === "GET" ? "#eaf2fc" : r.metodo === "POST" ? "#e8f6ef" : r.metodo === "PUT" ? "#fef3c7" : "#fee4e2"}; color: ${r.metodo === "GET" ? "#08264f" : r.metodo === "POST" ? "#12805c" : r.metodo === "PUT" ? "#92400e" : "#b42318"};">
                        ${r.metodo}
                      </span>
                    </td>
                    <td style="padding: 10px; font-family: monospace; font-weight: 600; color: #08264f;">${r.endpoint}</td>
                    <td style="padding: 10px;">
                      <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; background: ${r.codigo_status >= 200 && r.codigo_status < 400 ? "#e8f6ef" : "#fee4e2"}; color: ${r.codigo_status >= 200 && r.codigo_status < 400 ? "#12805c" : "#b42318"};">
                        ${r.codigo_status}
                      </span>
                    </td>
                    <td style="padding: 10px; font-family: monospace;">${r.duracao_ms} ms</td>
                    <td style="padding: 10px;">${r.cliente_nome || "<span style='color:#94a3b8'>Público/Não Auth</span>"}</td>
                    <td style="padding: 10px; font-family: monospace; font-size: 0.75rem; color: #64748b;">${r.correlation_id || "-"}</td>
                    <td style="padding: 10px; color: #64748b; font-size: 0.8rem;">${new Date(r.criado_em).toLocaleTimeString("pt-AO")}</td>
                  </tr>
                `
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Sub-View: Gestão de Dispositivos ---
  function renderizarDispositivos(): string {
    return `
      <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin: 0;">Dispositivos Móveis Registados</h2>
            <p style="font-size: 0.85rem; color: #64748b; margin: 4px 0 0;">Controlo de hardware autorizado, bloqueio de dispositivos comprometidos e revogação remota de credenciais.</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
              <th style="padding: 10px;">Cliente</th>
              <th style="padding: 10px;">Dispositivo / Modelo</th>
              <th style="padding: 10px;">Plataforma</th>
              <th style="padding: 10px;">Versões (App / SO)</th>
              <th style="padding: 10px;">Último Acesso</th>
              <th style="padding: 10px;">Estado</th>
              <th style="padding: 10px; text-align: right;">Ações de Segurança</th>
            </tr>
          </thead>
          <tbody>
            ${
              dispositivos.length === 0
                ? `<tr><td colspan="7" style="padding: 3rem; text-align: center; color: #64748b;">Nenhum dispositivo móvel registado no sistema.</td></tr>`
                : dispositivos
                    .map(
                      (d) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px;">
                      <strong style="color: #08264f;">${d.cliente_nome || "Cliente"}</strong>
                      <div style="font-size: 0.75rem; color: #64748b;">${d.cliente_email || ""}</div>
                    </td>
                    <td style="padding: 10px; font-weight: 600;">${d.nome_dispositivo}<br><span style="font-size: 0.75rem; color: #94a3b8; font-family: monospace;">UUID: ${d.device_id.slice(0, 12)}...</span></td>
                    <td style="padding: 10px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: ${d.plataforma === "android" ? "#eaf2fc" : "#fdf6ea"}; color: ${d.plataforma === "android" ? "#08264f" : "#d9a441"};">${d.plataforma.toUpperCase()}</span></td>
                    <td style="padding: 10px; font-family: monospace; font-size: 0.8rem;">App v${d.versao_app} | OS ${d.versao_so}</td>
                    <td style="padding: 10px; color: #64748b;">${new Date(d.ultimo_acesso).toLocaleString("pt-AO")}</td>
                    <td style="padding: 10px;">
                      <span style="display: inline-block; padding: 3px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: ${d.status === "ativo" ? "#e8f6ef" : d.status === "bloqueado" ? "#fee4e2" : "#f1f5f9"}; color: ${d.status === "ativo" ? "#12805c" : d.status === "bloqueado" ? "#b42318" : "#64748b"};">
                        ${d.status.toUpperCase()}
                      </span>
                    </td>
                    <td style="padding: 10px; text-align: right;">
                      <div style="display: inline-flex; gap: 6px;">
                        ${
                          d.status !== "bloqueado"
                            ? `<button class="btn-bloquear-disp" data-id="${d.id}" style="padding: 5px 10px; font-size: 0.75rem; font-weight: 700; background: #fee4e2; color: #b42318; border: none; border-radius: 6px; cursor: pointer;">Bloquear</button>`
                            : `<span style="font-size: 0.75rem; color: #b42318; font-weight: 700;">Bloqueado</span>`
                        }
                        <button class="btn-revogar-disp" data-id="${d.id}" style="padding: 5px 10px; font-size: 0.75rem; font-weight: 700; background: #f1f5f9; color: #475569; border: none; border-radius: 6px; cursor: pointer;">Revogar Sessões</button>
                      </div>
                    </td>
                  </tr>
                `
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Sub-View: Operações Móveis ---
  function renderizarOperacoes(): string {
    const cambios = operacoes.cambios || [];
    const remessas = operacoes.remessas || [];

    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- Pedidos de Câmbio da App -->
        <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin-top: 0;">Pedidos de Câmbio Online (${cambios.length})</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 8px;">Ref / Cliente</th>
                <th style="padding: 8px;">Tipo / Moeda</th>
                <th style="padding: 8px;">Valor</th>
                <th style="padding: 8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${
                cambios.length === 0
                  ? `<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #64748b;">Sem pedidos de câmbio registados.</td></tr>`
                  : cambios
                      .slice(0, 10)
                      .map(
                        (c) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 8px;"><strong>${c.numero_pedido || c.id.slice(0, 8)}</strong><div style="font-size: 0.75rem; color: #64748b;">${c.cliente_nome}</div></td>
                      <td style="padding: 8px; font-weight: 600;">${c.tipo_operacao} ${c.moeda_estrangeira}</td>
                      <td style="padding: 8px; font-family: monospace;">${c.valor_estrangeiro} ${c.moeda_estrangeira}</td>
                      <td style="padding: 8px;">
                        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: ${c.status === "CONCLUIDO" ? "#e8f6ef" : c.status === "PENDENTE" ? "#fef3c7" : "#fee4e2"}; color: ${c.status === "CONCLUIDO" ? "#12805c" : c.status === "PENDENTE" ? "#92400e" : "#b42318"};">
                          ${c.status}
                        </span>
                      </td>
                    </tr>
                  `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>

        <!-- Pedidos de Remessas da App -->
        <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin-top: 0;">Pedidos de Remessas Internacionais (${remessas.length})</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                <th style="padding: 8px;">Ref / Beneficiário</th>
                <th style="padding: 8px;">Destino</th>
                <th style="padding: 8px;">Valor</th>
                <th style="padding: 8px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${
                remessas.length === 0
                  ? `<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #64748b;">Sem pedidos de remessa registados.</td></tr>`
                  : remessas
                      .slice(0, 10)
                      .map(
                        (r) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 8px;"><strong>${r.numero_pedido || r.id.slice(0, 8)}</strong><div style="font-size: 0.75rem; color: #64748b;">${r.beneficiario_nome}</div></td>
                      <td style="padding: 8px; font-weight: 600;">${r.pais_destino}</td>
                      <td style="padding: 8px; font-family: monospace;">${r.valor_estrangeiro} ${r.moeda_estrangeira}</td>
                      <td style="padding: 8px;">
                        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: ${r.status === "CONCLUIDO" ? "#e8f6ef" : r.status === "PENDENTE" ? "#fef3c7" : "#fee4e2"}; color: ${r.status === "CONCLUIDO" ? "#12805c" : r.status === "PENDENTE" ? "#92400e" : "#b42318"};">
                          ${r.status}
                        </span>
                      </td>
                    </tr>
                  `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- Sub-View: Saúde dos Serviços ---
  function renderizarSaudeServicos(): string {
    const servicos = saudeServicos || {};
    return `
      <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin-top: 0; margin-bottom: 4px;">Diagnóstico de Saúde e Disponibilidade de Serviços</h2>
        <p style="font-size: 0.85rem; color: #64748b; margin-top: 0; margin-bottom: 1.5rem;">Verificação atómica de componentes do ecossistema NZAIDI. Não considera a API funcional apenas porque responde na porta HTTP.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
          ${Object.entries(servicos)
            .map(([nome, dados]: [string, any]) => {
              const ehOk = dados.status === "operacional";
              return `
              <div style="padding: 1.25rem; border-radius: 10px; border: 1px solid ${ehOk ? "#e2e8f0" : "#fee4e2"}; background: ${ehOk ? "#f8fafc" : "#fffbfa"};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="text-transform: capitalize; color: #08264f; font-size: 0.95rem;">${nome.replace(/_/g, " ")}</strong>
                  <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: ${ehOk ? "#e8f6ef" : "#fee4e2"}; color: ${ehOk ? "#12805c" : "#b42318"};">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
                    ${dados.status.toUpperCase()}
                  </span>
                </div>
                <p style="font-size: 0.8rem; color: #64748b; margin: 0 0 8px;">${dados.mensagem}</p>
                <div style="font-size: 0.75rem; font-family: monospace; color: #0e8f6e; font-weight: 600;">Latência: ${dados.latenciaMs} ms</div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  // --- Sub-View: Configuração da API ---
  function renderizarConfiguracoes(): string {
    const c = configs || {};
    return `
      <div class="cartao" style="background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 700px;">
        <h2 style="font-size: 1.15rem; font-weight: 700; color: #08264f; margin-top: 0;">Configurações Globais da API NZAIDI Mobile</h2>
        <p style="font-size: 0.85rem; color: #64748b; margin-top: 0; margin-bottom: 1.5rem;">Alterações nesta área entram em vigor imediatamente para todos os utilizadores móveis e são registadas na auditoria imutável.</p>

        <form id="form-config-mobile">
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Acesso Móvel Ativo</label>
            <select id="cfg-acesso-ativo" style="width: 100%; padding: 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;">
              <option value="true" ${c.acesso_movel_ativo === "true" ? "selected" : ""}>Ativo (Permitir conexões NZAIDI Mobile)</option>
              <option value="false" ${c.acesso_movel_ativo === "false" ? "selected" : ""}>Bloqueado (Modo Manutenção Programada)</option>
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Mínima Android</label>
              <input type="text" id="cfg-ver-android" value="${c.versao_minima_android || "1.0.0"}" style="width: 100%; padding: 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" required />
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Versão Mínima iOS</label>
              <input type="text" id="cfg-ver-ios" value="${c.versao_minima_ios || "1.0.0"}" style="width: 100%; padding: 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Rate Limit por Dispositivo (req/min)</label>
              <input type="number" id="cfg-rate-limit" value="${c.rate_limit_por_minuto || "60"}" min="10" max="300" style="width: 100%; padding: 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" required />
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #08264f; margin-bottom: 4px;">Expiração Access Token (minutos)</label>
              <input type="number" id="cfg-exp-access" value="${c.tempo_expiracao_access_minutos || "15"}" min="5" max="60" style="width: 100%; padding: 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" required />
            </div>
          </div>

          <button type="submit" class="btn btn-primario" style="padding: 12px 24px; font-size: 0.95rem; font-weight: 800; background: #08264f; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
            Guardar Configurações da API
          </button>
        </form>
      </div>
    `;
  }

  function vincularEventos() {
    // Alternância de abas
    container.querySelectorAll(".tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        abaAtiva = btn.dataset.aba as AbaAtiva;
        mensagemSucesso = "";
        mensagemErro = "";
        render();
      });
    });

    // Botão de atualização manual
    container.querySelector("#btn-atualizar-dados")?.addEventListener("click", () => {
      carregarDados();
    });

    // Filtros de requisições
    container.querySelector("#btn-aplicar-filtros")?.addEventListener("click", () => {
      filtroEndpoint = (container.querySelector("#filtro-endpoint") as HTMLInputElement)?.value || "";
      filtroMetodo = (container.querySelector("#filtro-metodo") as HTMLSelectElement)?.value || "";
      filtroStatus = (container.querySelector("#filtro-status") as HTMLSelectElement)?.value || "";
      filtroPlataforma = (container.querySelector("#filtro-plataforma") as HTMLSelectElement)?.value || "";
      carregarDados();
    });

    // Ações de Dispositivo: Bloquear
    container.querySelectorAll(".btn-bloquear-disp").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Tem a certeza que deseja BLOQUEAR este dispositivo? O telemóvel não poderá aceder à API.")) return;
        try {
          await api.bloquearMobileDispositivo(id);
          mensagemSucesso = "Dispositivo bloqueado com sucesso.";
          carregarDados();
        } catch (e: any) {
          mensagemErro = e.message || "Erro ao bloquear dispositivo.";
          render();
        }
      });
    });

    // Ações de Dispositivo: Revogar
    container.querySelectorAll(".btn-revogar-disp").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Tem a certeza que deseja REVOGAR todas as sessões ativas deste dispositivo?")) return;
        try {
          await api.revogarMobileDispositivo(id);
          mensagemSucesso = "Sessões revogadas com sucesso.";
          carregarDados();
        } catch (e: any) {
          mensagemErro = e.message || "Erro ao revogar sessões.";
          render();
        }
      });
    });

    // Formulário de Configuração
    const formCfg = container.querySelector("#form-config-mobile") as HTMLFormElement | null;
    formCfg?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const payload = {
          acesso_movel_ativo: (container.querySelector("#cfg-acesso-ativo") as HTMLSelectElement).value,
          versao_minima_android: (container.querySelector("#cfg-ver-android") as HTMLInputElement).value,
          versao_minima_ios: (container.querySelector("#cfg-ver-ios") as HTMLInputElement).value,
          rate_limit_por_minuto: (container.querySelector("#cfg-rate-limit") as HTMLInputElement).value,
          tempo_expiracao_access_minutos: (container.querySelector("#cfg-exp-access") as HTMLInputElement).value,
        };

        await api.atualizarMobileConfig(payload);
        mensagemSucesso = "Parâmetros da API móvel gravados com sucesso e registados na auditoria.";
        carregarDados();
      } catch (err: any) {
        mensagemErro = err.message || "Erro ao guardar configurações.";
        render();
      }
    });
  }

  // Timer de auto-atualização em tempo real (10 segundos)
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => {
    if (document.body.contains(container)) {
      carregarDados();
    } else {
      clearInterval(autoRefreshTimer);
    }
  }, 10000);

  abaAtiva = determinarAbaPorHash();
  carregarDados();
}
