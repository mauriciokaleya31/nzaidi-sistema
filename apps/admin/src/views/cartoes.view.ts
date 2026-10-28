import { api } from '../api/cliente.js';
import { solicitarMotivoAcao, confirmarModal, mostrarToast } from '../components/modal-dialogo.js';

export async function renderCartoesView(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="cartoes-container">
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">NZAIDI Cartões</h1>
            <span id="badge-estado-servico" class="badge" style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase;">A carregar...</span>
          </div>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Gestão da unidade de negócio de cartões Visa virtuais em USD com integração StroWallet.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-atualizar-tudo" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Atualizar Dados
          </button>
        </div>
      </div>

      <!-- Banner de Alerta de Estado / Manutenção -->
      <div id="banner-alerta-servico" style="display: none; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; align-items: center; justify-content: space-between; gap: 12px;"></div>

      <!-- KPI Cards do Dashboard Executivo -->
      <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 28px;">
        <div class="card" style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Cartões Emitidos</div>
          <div id="kpi-total-cartoes" style="font-size: 26px; font-weight: 700; color: #0f172a;">-</div>
          <div id="kpi-cartoes-ativos" style="font-size: 12px; color: #10b981; margin-top: 4px;">- ativos</div>
        </div>

        <div class="card" style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Volume Total (USD)</div>
          <div id="kpi-volume-usd" style="font-size: 26px; font-weight: 700; color: #0f172a;">-</div>
          <div id="kpi-volume-aoa" style="font-size: 12px; color: #64748b; margin-top: 4px;">- AOA estimado</div>
        </div>

        <div class="card" style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Receita Líquida AOA</div>
          <div id="kpi-receita-aoa" style="font-size: 26px; font-weight: 700; color: #16a34a;">-</div>
          <div id="kpi-receita-detalhe" style="font-size: 12px; color: #64748b; margin-top: 4px;">Taxas + Margem Cambial</div>
        </div>

        <div class="card" style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Custos Fornecedor</div>
          <div id="kpi-custos-usd" style="font-size: 26px; font-weight: 700; color: #475569;">-</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">StroWallet debitações</div>
        </div>

        <div class="card" style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Saldo Conta Mestre</div>
          <div id="kpi-saldo-mestre" style="font-size: 26px; font-weight: 700; color: #0f172a;">-</div>
          <div id="kpi-saldo-mestre-sub" style="font-size: 12px; color: #64748b; margin-top: 4px;">StroWallet USD</div>
        </div>
      </div>

      <!-- Abas de Navegação -->
      <div style="border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; gap: 8px; overflow-x: auto;">
        <button class="tab-btn active" data-tab="cartoes" style="padding: 10px 16px; border: none; background: none; border-bottom: 2px solid #0284c7; color: #0284c7; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Cartões Emitidos
        </button>
        <button class="tab-btn" data-tab="transacoes" style="padding: 10px 16px; border: none; background: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Transações & Recargas
        </button>
        <button class="tab-btn" data-tab="adesoes" style="padding: 10px 16px; border: none; background: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Adesões & Elegibilidade
        </button>
        <button class="tab-btn" data-tab="comercial" style="padding: 10px 16px; border: none; background: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Parâmetros Comerciais
        </button>
        <button class="tab-btn" data-tab="configuracao" style="padding: 10px 16px; border: none; background: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
          API StroWallet & Ativação
        </button>
      </div>

      <!-- Conteúdo das Abas -->
      <div id="tab-content">
        <!-- Tab 1: Cartões -->
        <div id="tab-cartoes" class="tab-pane">
          <div class="card" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">Cartões Visa Virtuais Emitidos</h3>
              <div style="display: flex; gap: 10px;">
                <input type="text" id="filtro-busca-cartoes" placeholder="Pesquisar por titular, número ou cliente..." style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; width: 280px;" />
                <select id="filtro-estado-cartoes" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                  <option value="">Todos os Estados</option>
                  <option value="ativo">Ativo</option>
                  <option value="congelado">Congelado</option>
                  <option value="bloqueado">Bloqueado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div class="table-responsive">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                    <th style="padding: 10px;">Cartão</th>
                    <th style="padding: 10px;">Titular</th>
                    <th style="padding: 10px;">Cliente</th>
                    <th style="padding: 10px;">Saldo (USD)</th>
                    <th style="padding: 10px;">Validade</th>
                    <th style="padding: 10px;">Estado</th>
                    <th style="padding: 10px;">Emitido Em</th>
                    <th style="padding: 10px; text-align: right;">Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-cartoes-body">
                  <tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">A carregar lista de cartões...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 2: Transações -->
        <div id="tab-transacoes" class="tab-pane" style="display: none;">
          <div class="card" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">Histórico de Transações de Cartões</h3>
              <div style="display: flex; gap: 10px;">
                <select id="filtro-tipo-transacao" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                  <option value="">Todos os Tipos</option>
                  <option value="emissao">Emissão</option>
                  <option value="carregamento">Carregamento</option>
                  <option value="compra_online">Compra Online</option>
                </select>
              </div>
            </div>
            <div class="table-responsive">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                    <th style="padding: 10px;">Referência</th>
                    <th style="padding: 10px;">Tipo</th>
                    <th style="padding: 10px;">Montante (USD)</th>
                    <th style="padding: 10px;">Contravalor (AOA)</th>
                    <th style="padding: 10px;">Taxa Câmbio</th>
                    <th style="padding: 10px;">Receita Líquida (AOA)</th>
                    <th style="padding: 10px;">Estado</th>
                    <th style="padding: 10px;">Data</th>
                  </tr>
                </thead>
                <tbody id="tabela-transacoes-body">
                  <tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">A carregar transações...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 3: Adesões -->
        <div id="tab-adesoes" class="tab-pane" style="display: none;">
          <div class="card" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
            <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Solicitações de Adesão e Elegibilidade KYC</h3>
            <div class="table-responsive">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                    <th style="padding: 10px;">Cliente</th>
                    <th style="padding: 10px;">Contacto</th>
                    <th style="padding: 10px;">Estado KYC</th>
                    <th style="padding: 10px;">Estado Adesão</th>
                    <th style="padding: 10px;">ID Fornecedor</th>
                    <th style="padding: 10px;">Data Solicitação</th>
                    <th style="padding: 10px; text-align: right;">Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-adesoes-body">
                  <tr><td colspan="7" style="padding: 24px; text-align: center; color: #64748b;">A carregar solicitações de adesão...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 4: Parâmetros Comerciais -->
        <div id="tab-comercial" class="tab-pane" style="display: none;">
          <div class="card" style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; max-width: 850px;">
            <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Configuração Comercial e Financeira</h3>
            <p style="color: #64748b; font-size: 13px; margin-bottom: 20px;">Defina as taxas de emissão, comissões de carregamento, margem cambial USD/AOA e limites operacionais.</p>

            <form id="form-comercial" style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Taxa de Emissão do Cartão (USD)</label>
                <input type="number" step="0.5" id="cfg-taxa-emissao-usd" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
                <span style="font-size: 11px; color: #64748b;">Cobrada ao cliente no momento da emissão.</span>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Custo Emissão Fornecedor (USD)</label>
                <input type="number" step="0.5" id="cfg-custo-emissao-fornecedor" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
                <span style="font-size: 11px; color: #64748b;">Custo de criação debitado pela StroWallet.</span>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Comissão Carregamento (%)</label>
                <input type="number" step="0.1" id="cfg-comissao-recarga-pct" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
                <span style="font-size: 11px; color: #64748b;">Percentual aplicado sobre o valor de cada recarga.</span>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Comissão Carregamento Fixa (USD)</label>
                <input type="number" step="0.25" id="cfg-comissao-recarga-fixa" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
                <span style="font-size: 11px; color: #64748b;">Taxa administrativa fixa por carregamento.</span>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Margem Cambial USD/AOA (%)</label>
                <input type="number" step="0.1" id="cfg-margem-cambial-pct" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
                <span style="font-size: 11px; color: #64748b;">Margem comercial adicionada à taxa oficial de venda.</span>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Custo Carregamento StroWallet (%)</label>
                <input type="number" step="0.1" id="cfg-custo-fornecedor-pct" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
                <span style="font-size: 11px; color: #64748b;">Custo percentual retido pelo fornecedor.</span>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Carregamento Mínimo (USD)</label>
                <input type="number" step="1" id="cfg-limite-min-recarga" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Carregamento Máximo por Operação (USD)</label>
                <input type="number" step="50" id="cfg-limite-max-recarga" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Limite Diário por Cliente (USD)</label>
                <input type="number" step="100" id="cfg-limite-diario" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Saldo Máximo Permitido por Cartão (USD)</label>
                <input type="number" step="100" id="cfg-saldo-max-cartao" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" required />
              </div>

              <div style="grid-column: 1 / -1; margin-top: 12px; display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary" style="background: #0284c7; color: #fff; padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                  Guardar Parâmetros Comerciais
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Tab 5: Configuração StroWallet -->
        <div id="tab-configuracao" class="tab-pane" style="display: none;">
          <div class="card" style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; max-width: 850px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Configuração da API StroWallet e Lançamento</h3>
                <p style="color: #64748b; font-size: 13px; margin: 0;">Gestão de credenciais, ambiente e controlo de lançamento progressivo.</p>
              </div>
              <button id="btn-testar-conexao" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid #0284c7; color: #0284c7; border-radius: 6px; font-weight: 600; background: #f0f9ff; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Testar Conexão com StroWallet
              </button>
            </div>

            <div id="box-resultado-conexao" style="display: none; padding: 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px;"></div>

            <form id="form-configuracao-strowallet">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px;">
                <div>
                  <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Estado de Ativação Progressiva</label>
                  <select id="cfg-estado-ativacao" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                    <option value="em_preparacao">Em preparação (Configuração inicial)</option>
                    <option value="em_testes">Em testes (Restrito a equipa interna)</option>
                    <option value="pronto_ativacao">Pronto para activação (Validado)</option>
                    <option value="ativo">Activo (Disponível a clientes)</option>
                    <option value="suspenso">Suspenso (Interrupção temporária)</option>
                  </select>
                </div>

                <div>
                  <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Ambiente da API</label>
                  <select id="cfg-ambiente" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                    <option value="sandbox">Sandbox (Ambiente de Testes)</option>
                    <option value="live">Live (Ambiente Real de Produção)</option>
                  </select>
                </div>

                <div>
                  <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Chave Pública (Public Key)</label>
                  <input type="text" id="cfg-public-key" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" placeholder="pub_..." />
                </div>

                <div>
                  <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Chave Secreta (Secret Key)</label>
                  <input type="password" id="cfg-secret-key" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" placeholder="sec_... (deixar em branco para não alterar)" />
                </div>

                <div style="grid-column: 1 / -1;">
                  <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">URL Base da API</label>
                  <input type="url" id="cfg-base-url" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" value="https://strowallet.com/api/bitvcard" />
                </div>

                <div>
                  <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Alerta de Saldo Mínimo na Conta Mestre (USD)</label>
                  <input type="number" step="10" id="cfg-saldo-alerta-minimo" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;" />
                </div>
              </div>

              <!-- Switches de Controlo Global -->
              <div style="background: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; flex-direction: column; gap: 14px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                  <input type="checkbox" id="cfg-servico-ativo" style="width: 18px; height: 18px;" />
                  <span style="font-weight: 600; font-size: 14px; color: #1e293b;">Ativação Global do Serviço</span>
                  <span style="font-size: 12px; color: #64748b;">(Habilita os endpoints internos e a lógica de cartões)</span>
                </label>

                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                  <input type="checkbox" id="cfg-visivel-portal" style="width: 18px; height: 18px;" />
                  <span style="font-weight: 600; font-size: 14px; color: #1e293b;">Visibilidade no Portal do Cliente</span>
                  <span style="font-size: 12px; color: #64748b;">(Exibe a opção de adesão aos clientes elegíveis)</span>
                </label>

                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                  <input type="checkbox" id="cfg-modo-manutencao" style="width: 18px; height: 18px;" />
                  <span style="font-weight: 600; font-size: 14px; color: #b91c1c;">Modo de Manutenção Ativo</span>
                  <span style="font-size: 12px; color: #64748b;">(Bloqueia novos pedidos de cartões e recargas)</span>
                </label>

                <div>
                  <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Mensagem de Manutenção (Visível ao Utilizador)</label>
                  <input type="text" id="cfg-mensagem-manutencao" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end;">
                <button type="submit" class="btn btn-primary" style="background: #0284c7; color: #fff; padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                  Guardar Configuração da API
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inicializar dados
  await carregarTudo();

  // Event Listeners para Abas
  container.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const tabName = target.getAttribute('data-tab');

      container.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.remove('active');
        (b as HTMLElement).style.borderColor = 'transparent';
        (b as HTMLElement).style.color = '#64748b';
      });
      target.classList.add('active');
      target.style.borderColor = '#0284c7';
      target.style.color = '#0284c7';

      container.querySelectorAll('.tab-pane').forEach((p) => {
        (p as HTMLElement).style.display = 'none';
      });
      const pane = container.querySelector(`#tab-${tabName}`) as HTMLElement;
      if (pane) pane.style.display = 'block';
    });
  });

  // Atualizar tudo
  container.querySelector('#btn-atualizar-tudo')?.addEventListener('click', () => carregarTudo());

  // Testar conexão com StroWallet
  container.querySelector('#btn-testar-conexao')?.addEventListener('click', async () => {
    const box = container.querySelector('#box-resultado-conexao') as HTMLElement;
    box.style.display = 'block';
    box.style.background = '#f8fafc';
    box.style.border = '1px solid #cbd5e1';
    box.style.color = '#334155';
    box.textContent = 'A testar conectividade com o servidor da StroWallet...';

    try {
      const res = await api.testarConexaoStroWallet();
      if (res.conectado) {
        box.style.background = '#ecfdf5';
        box.style.border = '1px solid #a7f3d0';
        box.style.color = '#065f46';
        box.textContent = `Conexão efetuada com sucesso! Ambiente: ${res.ambiente.toUpperCase()}. ${
          res.saldo_mestre_usd !== undefined ? `Saldo mestre disponível: \$${res.saldo_mestre_usd.toFixed(2)} USD.` : ''
        }`;
      } else {
        box.style.background = '#fef2f2';
        box.style.border = '1px solid #fecaca';
        box.style.color = '#991b1b';
        box.textContent = `Falha na verificação de conexão: ${res.mensagem || 'Não foi possível comunicar com o endpoint.'}`;
      }
    } catch (err: any) {
      box.style.background = '#fef2f2';
      box.style.border = '1px solid #fecaca';
      box.style.color = '#991b1b';
      box.textContent = `Erro técnico ao testar conexão: ${err.message}`;
    }
  });

  // Salvar Parâmetros Comerciais
  container.querySelector('#form-comercial')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      taxa_emissao_usd: parseFloat((container.querySelector('#cfg-taxa-emissao-usd') as HTMLInputElement).value),
      custo_emissao_fornecedor_usd: parseFloat((container.querySelector('#cfg-custo-emissao-fornecedor') as HTMLInputElement).value),
      comissao_carregamento_pct: parseFloat((container.querySelector('#cfg-comissao-recarga-pct') as HTMLInputElement).value),
      comissao_carregamento_fixa_usd: parseFloat((container.querySelector('#cfg-comissao-recarga-fixa') as HTMLInputElement).value),
      margem_cambial_pct: parseFloat((container.querySelector('#cfg-margem-cambial-pct') as HTMLInputElement).value),
      custo_carregamento_fornecedor_pct: parseFloat((container.querySelector('#cfg-custo-fornecedor-pct') as HTMLInputElement).value),
      limite_min_carregamento_usd: parseFloat((container.querySelector('#cfg-limite-min-recarga') as HTMLInputElement).value),
      limite_max_carregamento_usd: parseFloat((container.querySelector('#cfg-limite-max-recarga') as HTMLInputElement).value),
      limite_diario_usd: parseFloat((container.querySelector('#cfg-limite-diario') as HTMLInputElement).value),
      saldo_maximo_cartao_usd: parseFloat((container.querySelector('#cfg-saldo-max-cartao') as HTMLInputElement).value),
    };

    try {
      await api.atualizarComercialCartoes(payload);
      alert('Parâmetros comerciais atualizados com sucesso!');
      await carregarTudo();
    } catch (err: any) {
      alert(`Erro ao guardar parâmetros comerciais: ${err.message}`);
    }
  });

  // Salvar Configuração da API StroWallet
  container.querySelector('#form-configuracao-strowallet')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const secKey = (container.querySelector('#cfg-secret-key') as HTMLInputElement).value.trim();
    const payload: any = {
      estado_ativacao: (container.querySelector('#cfg-estado-ativacao') as HTMLSelectElement).value,
      ambiente: (container.querySelector('#cfg-ambiente') as HTMLSelectElement).value,
      public_key: (container.querySelector('#cfg-public-key') as HTMLInputElement).value.trim(),
      base_url: (container.querySelector('#cfg-base-url') as HTMLInputElement).value.trim(),
      saldo_alerta_minimo_usd: parseFloat((container.querySelector('#cfg-saldo-alerta-minimo') as HTMLInputElement).value),
      servico_ativo: (container.querySelector('#cfg-servico-ativo') as HTMLInputElement).checked ? 1 : 0,
      visivel_portal: (container.querySelector('#cfg-visivel-portal') as HTMLInputElement).checked ? 1 : 0,
      modo_manutencao: (container.querySelector('#cfg-modo-manutencao') as HTMLInputElement).checked ? 1 : 0,
      mensagem_manutencao: (container.querySelector('#cfg-mensagem-manutencao') as HTMLInputElement).value.trim(),
    };

    if (secKey) {
      payload.secret_key = secKey;
    }

    try {
      await api.atualizarConfigCartoes(payload);
      alert('Configurações de integração atualizadas com sucesso!');
      await carregarTudo();
    } catch (err: any) {
      alert(`Erro ao guardar configurações: ${err.message}`);
    }
  });

  // Filtros de Cartões
  container.querySelector('#filtro-busca-cartoes')?.addEventListener('input', () => carregarCartoes());
  container.querySelector('#filtro-estado-cartoes')?.addEventListener('change', () => carregarCartoes());
  container.querySelector('#filtro-tipo-transacao')?.addEventListener('change', () => carregarTransacoes());

  async function carregarTudo() {
    await Promise.all([
      carregarDashboard(),
      carregarCartoes(),
      carregarTransacoes(),
      carregarAdesoes(),
      carregarParametrosComerciais(),
      carregarConfiguracaoAPI(),
    ]);
  }

  async function carregarDashboard() {
    try {
      const dash = await api.obterDashboardCartoes();

      const elTotal = container.querySelector('#kpi-total-cartoes');
      if (elTotal) elTotal.textContent = String(dash.total_cartoes);

      const elAtivos = container.querySelector('#kpi-cartoes-ativos');
      if (elAtivos) elAtivos.textContent = `${dash.cartoes_ativos} ativos, ${dash.cartoes_congelados} congelados`;

      const elVolUsd = container.querySelector('#kpi-volume-usd');
      if (elVolUsd) elVolUsd.textContent = `\$${dash.volume_total_usd.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

      const elVolAoa = container.querySelector('#kpi-volume-aoa');
      if (elVolAoa) elVolAoa.textContent = `${dash.volume_total_aoa.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} AOA`;

      const elRecAoa = container.querySelector('#kpi-receita-aoa');
      if (elRecAoa) elRecAoa.textContent = `${dash.receita_total_liquida_aoa.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} AOA`;

      const elRecDet = container.querySelector('#kpi-receita-detalhe');
      if (elRecDet) elRecDet.textContent = `Comissões: ${dash.receita_comissoes_carregamento_aoa.toFixed(0)} | Margem: ${dash.receita_margem_cambial_aoa.toFixed(0)}`;

      const elCustosUsd = container.querySelector('#kpi-custos-usd');
      if (elCustosUsd) elCustosUsd.textContent = `\$${dash.custo_total_fornecedor_usd.toFixed(2)}`;

      const elSaldoMestre = container.querySelector('#kpi-saldo-mestre');
      if (elSaldoMestre) {
        elSaldoMestre.textContent = dash.saldo_mestre_strowallet_usd !== null ? `\$${dash.saldo_mestre_strowallet_usd.toFixed(2)}` : 'N/D';
      }

      // Badge de estado do serviço
      const badgeEstado = container.querySelector('#badge-estado-servico') as HTMLElement;
      if (badgeEstado) {
        badgeEstado.textContent = dash.estado_ativacao.replace('_', ' ').toUpperCase();
        if (dash.estado_ativacao === 'ativo') {
          badgeEstado.style.background = '#dcfce7';
          badgeEstado.style.color = '#15803d';
        } else if (dash.estado_ativacao === 'em_testes') {
          badgeEstado.style.background = '#e0f2fe';
          badgeEstado.style.color = '#0369a1';
        } else if (dash.estado_ativacao === 'suspenso') {
          badgeEstado.style.background = '#fee2e2';
          badgeEstado.style.color = '#b91c1c';
        } else {
          badgeEstado.style.background = '#fef3c7';
          badgeEstado.style.color = '#b45309';
        }
      }

      // Banner de manutenção ou visibilidade
      const banner = container.querySelector('#banner-alerta-servico') as HTMLElement;
      if (banner) {
        if (dash.modo_manutencao) {
          banner.style.display = 'flex';
          banner.style.background = '#fef2f2';
          banner.style.border = '1px solid #fca5a5';
          banner.style.color = '#991b1b';
          banner.innerHTML = `<strong>Aviso de Manutenção Ativo:</strong> O serviço está temporariamente bloqueado para pedidos e carregamentos no portal.`;
        } else if (!dash.visivel_portal) {
          banner.style.display = 'flex';
          banner.style.background = '#eff6ff';
          banner.style.border = '1px solid #bfdbfe';
          banner.style.color = '#1e40af';
          banner.innerHTML = `<strong>Modo Interno:</strong> O serviço está oculto no portal do cliente (visível apenas para testes de conformidade).`;
        } else {
          banner.style.display = 'none';
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard de cartões:', err);
    }
  }

  async function carregarCartoes() {
    const tbody = container.querySelector('#tabela-cartoes-body');
    if (!tbody) return;

    const busca = (container.querySelector('#filtro-busca-cartoes') as HTMLInputElement)?.value || '';
    const estado = (container.querySelector('#filtro-estado-cartoes') as HTMLSelectElement)?.value || '';

    try {
      const cartoes = await api.listarCartoesAdmin({ busca, estado });
      if (!cartoes || cartoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">Nenhum cartão emitido encontrado.</td></tr>`;
        return;
      }

      tbody.innerHTML = cartoes
        .map(
          (c: any) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 10px; font-weight: 600;">
            <span style="font-family: monospace; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">•••• ${c.ultimos_4_digitos}</span>
          </td>
          <td style="padding: 12px 10px;">${c.titular_nome}</td>
          <td style="padding: 12px 10px;">
            <div style="font-weight: 500;">${c.cliente_nome || '-'}</div>
            <div style="font-size: 11px; color: #64748b;">${c.cliente_email || ''}</div>
          </td>
          <td style="padding: 12px 10px; font-weight: 700; color: #0f172a;">\$${Number(c.saldo_usd).toFixed(2)}</td>
          <td style="padding: 12px 10px;">${c.mes_expiracao}/${c.ano_expiracao}</td>
          <td style="padding: 12px 10px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${
              c.estado === 'ativo' ? '#dcfce7; color: #166534;' : c.estado === 'congelado' ? '#fef3c7; color: #92400e;' : '#fee2e2; color: #991b1b;'
            }">${c.estado}</span>
          </td>
          <td style="padding: 12px 10px; font-size: 12px; color: #64748b;">${new Date(c.criado_em).toLocaleDateString('pt-PT')}</td>
          <td style="padding: 12px 10px; text-align: right;">
            <button class="btn-acao-status" data-id="${c.id}" data-estado="${c.estado}" style="padding: 4px 8px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; margin-right: 4px;">
              ${c.estado === 'ativo' ? 'Congelar' : 'Descongelar'}
            </button>
            <button class="btn-acao-sinc" data-id="${c.id}" style="padding: 4px 8px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer;">
              Sincronizar
            </button>
          </td>
        </tr>
      `
        )
        .join('');

      // Event Listeners de Ações
      tbody.querySelectorAll('.btn-acao-status').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const target = e.currentTarget as HTMLElement;
          const id = target.getAttribute('data-id')!;
          const estadoAtual = target.getAttribute('data-estado');
          const novoEstado = estadoAtual === 'ativo' ? 'congelado' : 'ativo';

          const confirmou = await confirmarModal({
            titulo: "Alterar Estado do Cartão",
            mensagem: `Deseja realmente alterar o estado do cartão para ${novoEstado}?`,
            textoConfirmar: "Sim, Alterar",
            perigo: novoEstado === 'congelado',
          });

          if (confirmou) {
            try {
              await api.alterarStatusCartaoAdmin(id, novoEstado as any);
              mostrarToast(`Estado do cartão alterado para ${novoEstado}.`, "sucesso");
              await carregarCartoes();
              await carregarDashboard();
            } catch (err: any) {
              mostrarToast(`Falha ao alterar estado: ${err.message}`, "erro");
            }
          }
        });
      });

      tbody.querySelectorAll('.btn-acao-sinc').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const target = e.currentTarget as HTMLElement;
          const id = target.getAttribute('data-id')!;
          try {
            await api.sincronizarCartaoAdmin(id);
            alert('Cartão sincronizado com a StroWallet!');
            await carregarCartoes();
            await carregarDashboard();
          } catch (err: any) {
            alert(`Falha na sincronização: ${err.message}`);
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #ef4444;">Falha ao carregar cartões.</td></tr>`;
    }
  }

  async function carregarTransacoes() {
    const tbody = container.querySelector('#tabela-transacoes-body');
    if (!tbody) return;

    const tipo = (container.querySelector('#filtro-tipo-transacao') as HTMLSelectElement)?.value || '';

    try {
      const transacoes = await api.listarTransacoesCartoesAdmin({ tipo });
      if (!transacoes || transacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">Nenhuma transação registada.</td></tr>`;
        return;
      }

      tbody.innerHTML = transacoes
        .map(
          (t: any) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 10px; font-family: monospace; font-weight: 500;">${t.referencia_transacao}</td>
          <td style="padding: 12px 10px; text-transform: capitalize;">${t.tipo.replace('_', ' ')}</td>
          <td style="padding: 12px 10px; font-weight: 700; color: #0f172a;">\$${Number(t.montante_usd).toFixed(2)}</td>
          <td style="padding: 12px 10px;">${t.contravalor_aoa ? Number(t.contravalor_aoa).toLocaleString('pt-PT') + ' AOA' : '-'}</td>
          <td style="padding: 12px 10px;">${t.taxa_cambio_aplicada ? Number(t.taxa_cambio_aplicada).toFixed(2) : '-'}</td>
          <td style="padding: 12px 10px; color: #16a34a; font-weight: 600;">${t.receita_liquida_aoa ? Number(t.receita_liquida_aoa).toLocaleString('pt-PT') + ' AOA' : '-'}</td>
          <td style="padding: 12px 10px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${
              t.estado === 'confirmada' ? '#dcfce7; color: #166534;' : '#fef3c7; color: #92400e;'
            }">${t.estado}</span>
          </td>
          <td style="padding: 12px 10px; font-size: 12px; color: #64748b;">${new Date(t.criado_em).toLocaleDateString('pt-PT')} ${new Date(t.criado_em).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
      `
        )
        .join('');
    } catch {
      tbody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #ef4444;">Falha ao carregar transações.</td></tr>`;
    }
  }

  async function carregarAdesoes() {
    const tbody = container.querySelector('#tabela-adesoes-body');
    if (!tbody) return;

    try {
      const adesoes = await api.listarAdesoesCartoesAdmin();
      if (!adesoes || adesoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #64748b;">Nenhuma solicitação de adesão registada.</td></tr>`;
        return;
      }

      tbody.innerHTML = adesoes
        .map(
          (a: any) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 10px;">
            <div style="font-weight: 600; color: #0f172a;">${a.cliente_nome || 'Cliente'}</div>
            <div style="font-size: 11px; color: #64748b;">${a.cliente_email || ''}</div>
          </td>
          <td style="padding: 12px 10px;">${a.cliente_telefone || '-'}</td>
          <td style="padding: 12px 10px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${
              a.kyc_estado === 'aprovado' ? '#dcfce7; color: #166534;' : '#fef3c7; color: #92400e;'
            }">${a.kyc_estado || 'Não verificado'}</span>
          </td>
          <td style="padding: 12px 10px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${
              a.estado_adesao === 'aprovado' ? '#dcfce7; color: #166534;' : a.estado_adesao === 'rejeitado' ? '#fee2e2; color: #991b1b;' : '#f1f5f9; color: #475569;'
            }">${a.estado_adesao}</span>
          </td>
          <td style="padding: 12px 10px; font-family: monospace; font-size: 12px; color: #475569;">${a.strowallet_customer_id || '-'}</td>
          <td style="padding: 12px 10px; font-size: 12px; color: #64748b;">${new Date(a.criado_em).toLocaleDateString('pt-PT')}</td>
          <td style="padding: 12px 10px; text-align: right;">
            ${
              a.estado_adesao === 'pendente'
                ? `
              <button class="btn-aprovar-adesao" data-id="${a.cliente_id}" style="padding: 4px 8px; font-size: 11px; border: none; border-radius: 4px; background: #10b981; color: #fff; cursor: pointer; margin-right: 4px;">Aprovar</button>
              <button class="btn-rejeitar-adesao" data-id="${a.cliente_id}" style="padding: 4px 8px; font-size: 11px; border: none; border-radius: 4px; background: #ef4444; color: #fff; cursor: pointer;">Rejeitar</button>
            `
                : `<span style="font-size: 11px; color: #94a3b8;">Concluído</span>`
            }
          </td>
        </tr>
      `
        )
        .join('');

      tbody.querySelectorAll('.btn-aprovar-adesao').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
          try {
            await api.avaliarAdesaoCartaoAdmin(id, true);
            mostrarToast('Adesão ao cartão aprovada com sucesso!', 'sucesso');
            await carregarAdesoes();
          } catch (err: any) {
            mostrarToast(`Erro ao aprovar adesão: ${err.message}`, 'erro');
          }
        });
      });

      tbody.querySelectorAll('.btn-rejeitar-adesao').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
          const motivo = await solicitarMotivoAcao({
            titulo: "Rejeitar Adesão ao Cartão",
            labelMotivo: "Indique o motivo de rejeição da adesão:",
            placeholder: "Ex.: Documentação ilegível / Incompatibilidade cadastral",
            textoConfirmar: "Rejeitar Adesão",
            perigo: true,
            minimoCaracteres: 5,
          });

          if (motivo) {
            try {
              await api.avaliarAdesaoCartaoAdmin(id, false, motivo);
              mostrarToast('Adesão rejeitada.', 'info');
              await carregarAdesoes();
            } catch (err: any) {
              mostrarToast(`Erro ao rejeitar: ${err.message}`, 'erro');
            }
          }
        });
      });
    } catch {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #ef4444;">Falha ao carregar adesões.</td></tr>`;
    }
  }

  async function carregarParametrosComerciais() {
    try {
      const c = await api.obterComercialCartoes();
      (container.querySelector('#cfg-taxa-emissao-usd') as HTMLInputElement).value = c.taxa_emissao_usd;
      (container.querySelector('#cfg-custo-emissao-fornecedor') as HTMLInputElement).value = c.custo_emissao_fornecedor_usd;
      (container.querySelector('#cfg-comissao-recarga-pct') as HTMLInputElement).value = c.comissao_carregamento_pct;
      (container.querySelector('#cfg-comissao-recarga-fixa') as HTMLInputElement).value = c.comissao_carregamento_fixa_usd;
      (container.querySelector('#cfg-margem-cambial-pct') as HTMLInputElement).value = c.margem_cambial_pct;
      (container.querySelector('#cfg-custo-fornecedor-pct') as HTMLInputElement).value = c.custo_carregamento_fornecedor_pct;
      (container.querySelector('#cfg-limite-min-recarga') as HTMLInputElement).value = c.limite_min_carregamento_usd;
      (container.querySelector('#cfg-limite-max-recarga') as HTMLInputElement).value = c.limite_max_carregamento_usd;
      (container.querySelector('#cfg-limite-diario') as HTMLInputElement).value = c.limite_diario_usd;
      (container.querySelector('#cfg-saldo-max-cartao') as HTMLInputElement).value = c.saldo_maximo_cartao_usd;
    } catch (err) {
      console.error('Erro ao carregar parâmetros comerciais:', err);
    }
  }

  async function carregarConfiguracaoAPI() {
    try {
      const cfg = await api.obterConfigCartoes();
      (container.querySelector('#cfg-estado-ativacao') as HTMLSelectElement).value = cfg.estado_ativacao;
      (container.querySelector('#cfg-ambiente') as HTMLSelectElement).value = cfg.ambiente;
      (container.querySelector('#cfg-public-key') as HTMLInputElement).value = cfg.public_key || '';
      (container.querySelector('#cfg-base-url') as HTMLInputElement).value = cfg.base_url || 'https://strowallet.com/api/bitvcard';
      (container.querySelector('#cfg-saldo-alerta-minimo') as HTMLInputElement).value = cfg.saldo_alerta_minimo_usd || 100;
      (container.querySelector('#cfg-servico-ativo') as HTMLInputElement).checked = cfg.servico_ativo === 1;
      (container.querySelector('#cfg-visivel-portal') as HTMLInputElement).checked = cfg.visivel_portal === 1;
      (container.querySelector('#cfg-modo-manutencao') as HTMLInputElement).checked = cfg.modo_manutencao === 1;
      (container.querySelector('#cfg-mensagem-manutencao') as HTMLInputElement).value = cfg.mensagem_manutencao || '';
    } catch (err) {
      console.error('Erro ao carregar configuração de API:', err);
    }
  }
}
