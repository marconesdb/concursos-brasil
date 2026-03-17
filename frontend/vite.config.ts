import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Em dev: redireciona /api/* para o backend local
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});