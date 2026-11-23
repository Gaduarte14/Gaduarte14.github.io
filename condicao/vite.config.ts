import { defineConfig } from "vite";
import { resolve } from "path";

// Três páginas: background (index), popover de condições e painel do mestre.
export default defineConfig({
  // Caminhos relativos: funciona em qualquer subpasta (GitHub Pages, Vercel...)
  base: "./",
  server: {
    port: 5173,
    // O Owlbear carrega a extensão de outra origem, então precisa de CORS
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        popover: resolve(__dirname, "popover.html"),
        gm: resolve(__dirname, "gm.html"),
      },
    },
  },
});
