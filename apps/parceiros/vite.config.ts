import { defineConfig } from "vite";

export default defineConfig({
  base: "/parceiro/",
  server: {
    port: 5175,
    host: true,
  },
});
