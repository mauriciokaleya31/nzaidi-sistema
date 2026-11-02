import { obterEnv } from "./config/env.js";
import { criarConexaoBanco } from "./database/database.js";
import { criarApp } from "./app.js";

async function main() {
  const env = obterEnv();
  const db = criarConexaoBanco(env);
  const app = await criarApp({ db: db as any, env });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`[NZAIDI API] Servidor a correr em http://${env.HOST}:${env.PORT}`);
    console.log(`[NZAIDI API] Ambiente: ${env.NODE_ENV} | Base de dados oficial MySQL: ${env.MYSQL_DATABASE}@${env.MYSQL_HOST}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
