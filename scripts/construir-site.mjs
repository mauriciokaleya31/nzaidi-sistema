// Constrói o site público em dist/site, pronto a copiar para public_html no cPanel.
// Junta as páginas (apps/site-publico/src) com a marca (packages/design-system).
// Uso: npm run site:construir
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "dist", "site");
const marca = join(raiz, "packages", "design-system");

rmSync(destino, { recursive: true, force: true });
mkdirSync(join(destino, "marca", "assets"), { recursive: true });

cpSync(join(raiz, "apps", "site-publico", "src"), destino, { recursive: true });
cpSync(join(marca, "src", "tokens.css"), join(destino, "marca", "tokens.css"));
cpSync(join(marca, "src", "componentes.css"), join(destino, "marca", "componentes.css"));
for (const f of ["simbolo.png", "favicon-64.png", "logotipo-completo.webp"]) {
  cpSync(join(marca, "assets", f), join(destino, "marca", "assets", f));
}

console.log(`Site construído em ${destino}`);
