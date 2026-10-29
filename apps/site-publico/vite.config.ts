import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@nzaidi/dominio": path.resolve(__dirname, "../../packages/dominio/src/index.ts"),
      "@nzaidi/design-system/tokens.css": path.resolve(__dirname, "../../packages/design-system/src/tokens.css"),
      "@nzaidi/design-system/componentes.css": path.resolve(__dirname, "../../packages/design-system/src/componentes.css"),
      "@nzaidi/design-system": path.resolve(__dirname, "../../packages/design-system/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Website multipágina: cada página HTML é uma entrada da compilação
    rollupOptions: {
      input: Object.fromEntries(
        ["index", "sobre", "servicos", "cambios", "seguranca", "parceiros", "contactos", "faq", "termos", "privacidade", "entrar", "404"].map(
          (p) => [p, path.resolve(__dirname, `${p}.html`)],
        ),
      ),
    },
  },
});
