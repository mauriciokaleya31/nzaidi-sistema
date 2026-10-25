import { api, type UsuarioSessao, type FuncaoUsuario } from "../api/cliente.js";

type Listener = (usuario: UsuarioSessao | null) => void;

class AuthState {
  private usuarioAtual: UsuarioSessao | null = null;
  private carregando = true;
  private listeners: Listener[] = [];

  public getUsuario(): UsuarioSessao | null {
    return this.usuarioAtual;
  }

  public getFuncao(): FuncaoUsuario | null {
    return this.usuarioAtual?.funcao ?? null;
  }

  public estaCarregando(): boolean {
    return this.carregando;
  }

  public estaAutenticado(): boolean {
    return this.usuarioAtual !== null;
  }

  public temPermissao(permissao: string): boolean {
    if (!this.usuarioAtual) return false;
    return this.usuarioAtual.permissoes.includes(permissao);
  }

  public inscrever(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notificar(): void {
    for (const fn of this.listeners) {
      fn(this.usuarioAtual);
    }
  }

  public setUsuario(usuario: UsuarioSessao | null): void {
    this.usuarioAtual = usuario;
    this.carregando = false;
    this.notificar();
  }

  public async carregarSessaoInicial(): Promise<UsuarioSessao | null> {
    this.carregando = true;
    try {
      const usuario = await api.obterSessaoAtual();
      this.setUsuario(usuario);
      return usuario;
    } catch {
      this.setUsuario(null);
      return null;
    }
  }

  public async fazerLogout(): Promise<void> {
    try {
      await api.logout();
    } finally {
      this.setUsuario(null);
    }
  }
}

export const authState = new AuthState();
