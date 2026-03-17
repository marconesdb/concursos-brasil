
// ════════════════════════════════════════════════════════════════════
// backend/src/middlewares/isAdmin.ts
// ════════════════════════════════════════════════════════════════════
import { Response, NextFunction, Request } from "express";
import { AuthRequest } from "./auth.js";
import { execute } from "../db/index.js";

export { AuthRequest };

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  next();
}

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

export function getIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0];
  return req.socket?.remoteAddress || "";
}