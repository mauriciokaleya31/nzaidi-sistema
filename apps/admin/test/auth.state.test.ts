import { describe, it, expect, vi, beforeEach } from "vitest";
import { authState } from "../src/state/auth.state.js";
import { api, type UsuarioSessao } from "../src/api/cliente.js";

describe("AuthState (Gestão de Sessão do Admin)", () => {
  beforeEach(() => {
    authState.setUsuario(null);
    vi.restoreAllMocks();
  });

  it("deve iniciar sem utilizador autenticado", () => {
    expect(authState.estaAutenticado()).toBe(false);
    expect(authState.getUsuario()).toBeNull();
    expect(authState.getFuncao()).toBeNull();
  });

  it("deve verificar permissões correctamente consoante o perfil", () => {
    const usuarioAtendente: UsuarioSessao = {
      id: "usr_atendente",
      nome: "Operador Balcão",
      email: "atendente@nzaidi.ao",
      funcao: "atendente",
      permissoes: ["ver_taxas"],
    };

    authState.setUsuario(usuarioAtendente);

    expect(authState.estaAutenticado()).toBe(true);
    expect(authState.temPermissao("ver_taxas")).toBe(true);
    expect(authState.temPermissao("alterar_taxas")).toBe(false);
    expect(authState.temPermissao("ver_auditoria")).toBe(false);
  });

  it("deve conceder permissões avançadas ao perfil de gestão", () => {
    const usuarioGestao: UsuarioSessao = {
      id: "usr_gestao",
      nome: "Director Geral",
      email: "gestao@nzaidi.ao",
      funcao: "gestao",
      permissoes: ["ver_taxas", "alterar_taxas", "ver_auditoria", "usuarios:gerir"],
    };

    authState.setUsuario(usuarioGestao);

    expect(authState.temPermissao("ver_taxas")).toBe(true);
    expect(authState.temPermissao("alterar_taxas")).toBe(true);
    expect(authState.temPermissao("ver_auditoria")).toBe(true);
    expect(authState.temPermissao("usuarios:gerir")).toBe(true);
  });

  it("deve notificar observadores quando o utilizador for alterado", () => {
    const ouvinte = vi.fn();
    const cancelar = authState.inscrever(ouvinte);

    const usuario: UsuarioSessao = {
      id: "usr_comp",
      nome: "Auditor Compliance",
      email: "compliance@nzaidi.ao",
      funcao: "compliance",
      permissoes: ["ver_auditoria"],
    };

    authState.setUsuario(usuario);
    expect(ouvinte).toHaveBeenCalledWith(usuario);

    cancelar();
    authState.setUsuario(null);
    // Não deve ser chamado após cancelamento da subscrição
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("deve efetuar logout e limpar estado local", async () => {
    vi.spyOn(api, "logout").mockResolvedValue({ sucesso: true, mensagem: "Sessão terminada." });

    authState.setUsuario({
      id: "usr_1",
      nome: "Utilizador",
      email: "teste@nzaidi.ao",
      funcao: "atendente",
      permissoes: [],
    });

    await authState.fazerLogout();
    expect(authState.estaAutenticado()).toBe(false);
    expect(authState.getUsuario()).toBeNull();
  });
});
