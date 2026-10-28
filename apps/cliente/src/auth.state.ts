import { api, type Cliente, type PerfilResponse } from "./api.js";

type Listener = () => void;

class AuthState {
  public cliente: Cliente | null = null;
  public perfil: PerfilResponse | null = null;
  public carregando: boolean = true;
  private listeners: Listener[] = [];

  public escutar(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notificar(): void {
    this.listeners.forEach((fn) => fn());
  }

  public async inicializar(): Promise<boolean> {
    this.carregando = true;
    this.notificar();

    try {
      this.perfil = await api.obterPerfil();
      this.cliente = this.perfil.cliente;
      return true;
    } catch {
      this.cliente = null;
      this.perfil = null;
      return false;
    } finally {
      this.carregando = false;
      this.notificar();
    }
  }

  public async login(email: string, senha: string): Promise<void> {
    const res = await api.login(email, senha);
    this.cliente = res.cliente;
    await this.recarregarPerfil();
  }

  public async registo(dados: any): Promise<void> {
    const res = await api.registo(dados);
    this.cliente = res.cliente;
    await this.recarregarPerfil();
  }

  public async logout(): Promise<void> {
    await api.logout();
    this.cliente = null;
    this.perfil = null;
    this.notificar();
  }

  public async recarregarPerfil(deveNotificar: boolean = false): Promise<void> {
    try {
      this.perfil = await api.obterPerfil();
      this.cliente = this.perfil.cliente;
    } catch (e) {
      console.error("Falha ao recarregar perfil:", e);
    }
    if (deveNotificar) {
      this.notificar();
    }
  }
}

export const authState = new AuthState();
