with open('apps/api/src/modules/mobile/mobile.routes.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Normalizar quebras de linha para LF
text = text.replace('\r\n', '\n')

target1 = """  app.post(
    "/api/v1/mobile/cambio/simular",
    async (request, reply) => {
      const dados = MobileSimulacaoCambioSchema.parse(request.body);"""

repl1 = """  app.post(
    "/api/v1/mobile/cambio/simular",
    async (request, reply) => {
      const disp = mobileRepo.verificarDisponibilidadeModulo("cambio", {
        ip: request.ip,
        bypassAdmin: request.headers["x-admin-bypass"] === "true",
      });
      if (!disp.disponivel) {
        return reply.status(503).send({
          sucesso: false,
          erro: disp.motivo,
          codigo: "FUNCIONALIDADE_DESATIVADA",
        });
      }
      const dados = MobileSimulacaoCambioSchema.parse(request.body);"""

target2 = """  app.post(
    "/api/v1/mobile/cambio/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;"""

repl2 = """  app.post(
    "/api/v1/mobile/cambio/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const disp = mobileRepo.verificarDisponibilidadeModulo("cambio", {
        ip: request.ip,
        bypassAdmin: request.headers["x-admin-bypass"] === "true",
      });
      if (!disp.disponivel) {
        return reply.status(503).send({
          sucesso: false,
          erro: disp.motivo,
          codigo: "FUNCIONALIDADE_DESATIVADA",
        });
      }
      const { clienteId } = request.mobileSessao!;"""

target3 = """  app.post(
    "/api/v1/mobile/remessas/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const { clienteId } = request.mobileSessao!;"""

repl3 = """  app.post(
    "/api/v1/mobile/remessas/pedidos",
    { preHandler: [exigirMobileAuth] },
    async (request, reply) => {
      const disp = mobileRepo.verificarDisponibilidadeModulo("remessas", {
        ip: request.ip,
        bypassAdmin: request.headers["x-admin-bypass"] === "true",
      });
      if (!disp.disponivel) {
        return reply.status(503).send({
          sucesso: false,
          erro: disp.motivo,
          codigo: "FUNCIONALIDADE_DESATIVADA",
        });
      }
      const { clienteId } = request.mobileSessao!;"""

assert target1 in text, "target1 nao encontrado"
assert target2 in text, "target2 nao encontrado"
assert target3 in text, "target3 nao encontrado"

text = text.replace(target1, repl1)
text = text.replace(target2, repl2)
text = text.replace(target3, repl3)

with open('apps/api/src/modules/mobile/mobile.routes.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("mobile.routes.ts atualizado com sucesso!")
