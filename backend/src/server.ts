import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Rotas públicas
import editaisRouter   from "./routes/editais.js";
import usuariosRouter  from "./routes/usuarios.js";
import pushRouter      from "./routes/push.js";

// Rotas admin
import adminDashboard      from "./routes/admin/dashboard.js";
import adminEditais        from "./routes/admin/editais.js";
import adminUsuarios       from "./routes/admin/usuarios.js";
import adminColetas        from "./routes/admin/coletas.js";
import adminNotificacoes   from "./routes/admin/notificacoes.js";
import adminFontes         from "./routes/admin/fontes.js";
import adminConfiguracoes  from "./routes/admin/configuracoes.js";

// Middlewares
import { authMiddleware } from "./middlewares/auth.js";
import { isAdmin }        from "./middlewares/isAdmin.js";

// Jobs
import { iniciarCron } from "./jobs/cronColeta.js";

// Popular banco na primeira execução
import { runColeta } from "./services/coletor.js";

const app  = express();
const PORT = Number(process.env.PORT) || 4000;

// ─── Middlewares globais ───────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.FRONTEND_URL || "",
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// ─── Rotas públicas ────────────────────────────────────────────────────────────
app.use("/api/editais",   editaisRouter);
app.use("/api/usuarios",  usuariosRouter);
app.use("/api/push",      pushRouter);

// ─── Rotas admin (todas protegidas por auth + isAdmin) ────────────────────────
app.use("/api/admin/dashboard",     authMiddleware, isAdmin, adminDashboard);
app.use("/api/admin/editais",       authMiddleware, isAdmin, adminEditais);
app.use("/api/admin/usuarios",      authMiddleware, isAdmin, adminUsuarios);
app.use("/api/admin/coletas",       authMiddleware, isAdmin, adminColetas);
app.use("/api/admin/notificacoes",  authMiddleware, isAdmin, adminNotificacoes);
app.use("/api/admin/fontes",        authMiddleware, isAdmin, adminFontes);
app.use("/api/admin/configuracoes", authMiddleware, isAdmin, adminConfiguracoes);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`✅ Backend rodando em http://localhost:${PORT}`);
  await runColeta();   // seed / coleta inicial
  iniciarCron();       // agenda coleta diária às 06h
});