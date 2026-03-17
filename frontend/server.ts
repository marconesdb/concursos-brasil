import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";

async function startServer() {
  const app  = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  if (process.env.NODE_ENV !== "production") {
    // Dev: Vite middleware com proxy para o backend
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Prod: servir build estático
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) =>
      res.sendFile(path.join(distPath, "index.html"))
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Frontend rodando em http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);