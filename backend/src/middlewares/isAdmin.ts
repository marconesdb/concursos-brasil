
// ════════════════════════════════════════════════════════════════════
// backend/src/middlewares/isAdmin.ts
// ════════════════════════════════════════════════════════════════════
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  next();
}

// ─── Helper: registrar ação admin no log ──────────────────────────
import { execute } from "../db/index.js";

export async function logAdmin(
  adminId: number,
  acao: string,
  entidade: string,
  entidadeId: number | null,
  ip: string,
  detalhes: object = {}
) {
  await execute(
    `INSERT INTO admin_logs (admin_id, acao, entidade, entidade_id, ip, detalhes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, acao, entidade, entidadeId, ip, JSON.stringify(detalhes)]
  );
}

export const getIP = (req: Request) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
  req.socket.remoteAddress || "";