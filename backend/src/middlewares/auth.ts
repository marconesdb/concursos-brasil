
// ════════════════════════════════════════════════════════════════════
// backend/src/middlewares/auth.ts
// ════════════════════════════════════════════════════════════════════
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token necessário" });

  try {
    req.user = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET || "secret"
    ) as { id: number; role: string };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
