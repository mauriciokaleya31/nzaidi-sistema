import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  ClienteCredencial,
  SessaoCliente,
  PedidoCambio,
  PedidoRemessa,
} from "./portal.types.js";

interface CredencialRow {
  cliente_id: string;
  email: string;
  telefone: string | null;
  senha_hash: string;
  criado_em: string;
  atualizado_em: string;
}

interface SessaoRow {
  id: string;
  cliente_id: string;
  token_hash: string;
  criado_em: string;
  expira_em: string;
  ip: string | null;
  user_agent: string | null;
}

interface PedidoCambioRow {
  id: string;
  cliente_id: string;
  tipo_operacao: "compra" | "venda";
  moeda: "USD" | "EUR";
  montante_divisa: string;
  taxa_proposta: string;
  total_aoa_estimado: string;
  finalidade: string;
  estado: "pendente" | "em_analise" | "aprovado" | "rejeitado" | "concluido" | "cancelado";
  motivo_rejeicao: string | null;
  operacao_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface PedidoRemessaRow {
  id: string;
  cliente_id: string;
  beneficiario_nome: string;
  beneficiario_pais: string;
  beneficiario_iban: string;
  beneficiario_banco: string;
  beneficiario_swift: string | null;
  moeda_destino: "USD" | "EUR";
  montante_divisa: string;
  taxa_cambio: string;
  comissao_aoa: string;
  total_aoa: string;
  finalidade: string;
  estado: "pendente_revisao" | "em_processamento" | "executada" | "rejeitada";
  motivo_rejeicao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export class PortalClienteRepository {
  constructor(private db: DatabaseSync) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  // --- Credenciais ---

  public buscarCredencialPorEmail(email: string): ClienteCredencial | null {
    const stmt = this.db.prepare(`
      SELECT * FROM clientes_credenciais WHERE LOWER(email) = LOWER(?)
    `);
    const row = stmt.get(email.trim()) as CredencialRow | undefined;
    if (!row) return null;
    return {
      clienteId: row.cliente_id,
      email: row.email,
      telefone: row.telefone,
      senhaHash: row.senha_hash,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }

  public buscarCredencialPorClienteId(clienteId: string): ClienteCredencial | null {
    const stmt = this.db.prepare(`
      SELECT * FROM clientes_credenciais WHERE cliente_id = ?
    `);
    const row = stmt.get(clienteId) as CredencialRow | undefined;
    if (!row) return null;
    return {
      clienteId: row.cliente_id,
      email: row.email,
      telefone: row.telefone,
      senhaHash: row.senha_hash,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }

  public criarCredencial(
    clienteId: string,
    email: string,
    telefone: string | null,
    senhaHash: string
  ): ClienteCredencial {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO clientes_credenciais (cliente_id, email, telefone, senha_hash, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(clienteId, email.trim().toLowerCase(), telefone ?? null, senhaHash, agora, agora);
    return {
      clienteId,
      email: email.trim().toLowerCase(),
      telefone,
      senhaHash,
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  // --- Sessões do Cliente ---

  public criarSessao(
    clienteId: string,
    rawToken: string,
    ttlHoras: number,
    ip?: string | null,
    userAgent?: string | null
  ): SessaoCliente {
    const id = `sess_cli_${randomUUID()}`;
    const tokenHash = this.hashToken(rawToken);
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + ttlHoras * 3600 * 1000).toISOString();
    const criadoEm = agora.toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sessoes_clientes (id, cliente_id, token_hash, criado_em, expira_em, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, clienteId, tokenHash, criadoEm, expiraEm, ip ?? null, userAgent ?? null);

    return {
      id,
      clienteId,
      tokenHash,
      criadoEm,
      expiraEm,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    };
  }

  public buscarSessaoAtiva(rawToken: string, agora = new Date()): SessaoCliente | null {
    const tokenHash = this.hashToken(rawToken);
    const stmt = this.db.prepare(`
      SELECT s.* 
      FROM sessoes_clientes s
      JOIN clientes c ON c.id = s.cliente_id
      WHERE s.token_hash = ? AND s.expira_em > ? AND c.estado != 'bloqueado'
    `);
    const row = stmt.get(tokenHash, agora.toISOString()) as SessaoRow | undefined;
    if (!row) return null;

    return {
      id: row.id,
      clienteId: row.cliente_id,
      tokenHash: row.token_hash,
      criadoEm: row.criado_em,
      expiraEm: row.expira_em,
      ip: row.ip,
      userAgent: row.user_agent,
    };
  }

  public removerSessao(rawToken: string): void {
    const tokenHash = this.hashToken(rawToken);
    const stmt = this.db.prepare(`DELETE FROM sessoes_clientes WHERE token_hash = ?`);
    stmt.run(tokenHash);
  }

  // --- Pedidos de Câmbio ---

  public criarPedidoCambio(dados: Omit<PedidoCambio, "criadoEm" | "atualizadoEm">): PedidoCambio {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO pedidos_cambio (
        id, cliente_id, tipo_operacao, moeda, montante_divisa, taxa_proposta,
        total_aoa_estimado, finalidade, estado, motivo_rejeicao, operacao_id, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dados.id,
      dados.clienteId,
      dados.tipoOperacao,
      dados.moeda,
      dados.montanteDivisa,
      dados.taxaProposta,
      dados.totalAoaEstimado,
      dados.finalidade,
      dados.estado,
      dados.motivoRejeicao ?? null,
      dados.operacaoId ?? null,
      agora,
      agora
    );

    return {
      ...dados,
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  public listarPedidosCambioPorCliente(clienteId: string): PedidoCambio[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pedidos_cambio 
      WHERE cliente_id = ? 
      ORDER BY criado_em DESC
    `);
    const rows = stmt.all(clienteId) as unknown as PedidoCambioRow[];
    return rows.map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      tipoOperacao: r.tipo_operacao,
      moeda: r.moeda,
      montanteDivisa: r.montante_divisa,
      taxaProposta: r.taxa_proposta,
      totalAoaEstimado: r.total_aoa_estimado,
      finalidade: r.finalidade,
      estado: r.estado,
      motivoRejeicao: r.motivo_rejeicao,
      operacaoId: r.operacao_id,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    }));
  }

  public buscarPedidoCambioPorId(id: string): PedidoCambio | null {
    const stmt = this.db.prepare(`SELECT * FROM pedidos_cambio WHERE id = ?`);
    const r = stmt.get(id) as PedidoCambioRow | undefined;
    if (!r) return null;
    return {
      id: r.id,
      clienteId: r.cliente_id,
      tipoOperacao: r.tipo_operacao,
      moeda: r.moeda,
      montanteDivisa: r.montante_divisa,
      taxaProposta: r.taxa_proposta,
      totalAoaEstimado: r.total_aoa_estimado,
      finalidade: r.finalidade,
      estado: r.estado,
      motivoRejeicao: r.motivo_rejeicao,
      operacaoId: r.operacao_id,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    };
  }

  // --- Pedidos de Remessas ---

  public criarPedidoRemessa(dados: Omit<PedidoRemessa, "criadoEm" | "atualizadoEm">): PedidoRemessa {
    const agora = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO pedidos_remessas (
        id, cliente_id, beneficiario_nome, beneficiario_pais, beneficiario_iban,
        beneficiario_banco, beneficiario_swift, moeda_destino, montante_divisa,
        taxa_cambio, comissao_aoa, total_aoa, finalidade, estado, motivo_rejeicao, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dados.id,
      dados.clienteId,
      dados.beneficiarioNome,
      dados.beneficiarioPais,
      dados.beneficiarioIban,
      dados.beneficiarioBanco,
      dados.beneficiarioSwift ?? null,
      dados.moedaDestino,
      dados.montanteDivisa,
      dados.taxaCambio,
      dados.comissaoAoa,
      dados.totalAoa,
      dados.finalidade,
      dados.estado,
      dados.motivoRejeicao ?? null,
      agora,
      agora
    );

    return {
      ...dados,
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  public listarPedidosRemessaPorCliente(clienteId: string): PedidoRemessa[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pedidos_remessas 
      WHERE cliente_id = ? 
      ORDER BY criado_em DESC
    `);
    const rows = stmt.all(clienteId) as unknown as PedidoRemessaRow[];
    return rows.map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      beneficiarioNome: r.beneficiario_nome,
      beneficiarioPais: r.beneficiario_pais,
      beneficiarioIban: r.beneficiario_iban,
      beneficiarioBanco: r.beneficiario_banco,
      beneficiarioSwift: r.beneficiario_swift,
      moedaDestino: r.moeda_destino,
      montanteDivisa: r.montante_divisa,
      taxaCambio: r.taxa_cambio,
      comissaoAoa: r.comissao_aoa,
      totalAoa: r.total_aoa,
      finalidade: r.finalidade,
      estado: r.estado,
      motivoRejeicao: r.motivo_rejeicao,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    }));
  }

  public buscarPedidoRemessaPorId(id: string): PedidoRemessa | null {
    const stmt = this.db.prepare(`SELECT * FROM pedidos_remessas WHERE id = ?`);
    const r = stmt.get(id) as PedidoRemessaRow | undefined;
    if (!r) return null;
    return {
      id: r.id,
      clienteId: r.cliente_id,
      beneficiarioNome: r.beneficiario_nome,
      beneficiarioPais: r.beneficiario_pais,
      beneficiarioIban: r.beneficiario_iban,
      beneficiarioBanco: r.beneficiario_banco,
      beneficiarioSwift: r.beneficiario_swift,
      moedaDestino: r.moeda_destino,
      montanteDivisa: r.montante_divisa,
      taxaCambio: r.taxa_cambio,
      comissaoAoa: r.comissao_aoa,
      totalAoa: r.total_aoa,
      finalidade: r.finalidade,
      estado: r.estado,
      motivoRejeicao: r.motivo_rejeicao,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    };
  }
}
