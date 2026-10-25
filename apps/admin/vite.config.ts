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
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
