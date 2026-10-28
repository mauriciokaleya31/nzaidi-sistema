import { api, type ParceiroInfo, type UsuarioInfo } from "./api.js";

type Listener = () => void;

class AuthState {
  public parceiro: ParceiroInfo | null = null;
  public usuario: UsuarioInfo | null = null;
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
      const res = await api.obterMe();
      this.parceiro = res.parceiro;
      this.usuario = res.usuario;
      return true;
    } catch {
      this.parceiro = null;
      this.usuario = null;
      return false;
    } finally {
      this.carregando = false;
      this.notificar();
    }
  }

  public async login(email: string, senha: string): Promise<void> {
    const res = await api.login(email, senha);
    this.parceiro = res.parceiro;
    this.usuario = res.usuario;
    this.notificar();
  }

  public async registo(payload: {
    nomeEntidade: string;
    codigoSugerido?: string;
    tipo: string;
    canaisSuportados: string[];
    nomeResponsavel: string;
    emailCorporativo: string;
    senha: string;
  }): Promise<void> {
    const res = await api.registo(payload);
    this.parceiro = res.parceiro;
    this.usuario = res.usuario;
    this.notificar();
  }

  public async logout(): Promise<void> {
    await api.logout();
    this.parceiro = null;
    this.usuario = null;
    this.notificar();
  }
}

export const authState = new AuthState();
