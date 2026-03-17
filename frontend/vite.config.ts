import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Redireciona /api/* do frontend (porta 3000) para o backend (porta 4000)
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});