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
      permissoes: ["taxas:consultar"],
    };

    authState.setUsuario(usuarioAtendente);

    expect(authState.estaAutenticado()).toBe(true);
    expect(authState.temPermissao("taxas:consultar")).toBe(true);
    expect(authState.temPermissao("taxas:editar")).toBe(false);
    expect(authState.temPermissao("auditoria:consultar")).toBe(false);
  });

  it("deve conceder permissões avançadas ao perfil de gestão", () => {
    const usuarioGestao: UsuarioSessao = {
      id: "usr_gestao",
      nome: "Director Geral",
      email: "gestao@nzaidi.ao",
      funcao: "gestao",
      permissoes: ["taxas:consultar", "taxas:editar", "auditoria:consultar", "usuarios:gerir"],
    };

    authState.setUsuario(usuarioGestao);

    expect(authState.temPermissao("taxas:consultar")).toBe(true);
    expect(authState.temPermissao("taxas:editar")).toBe(true);
    expect(authState.temPermissao("auditoria:consultar")).toBe(true);
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
      permissoes: ["auditoria:consultar"],
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
