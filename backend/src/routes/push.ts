import { Router } from "express";
import { execute } from "../db/index.js";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();

// POST /api/push/subscribe
router.post("/subscribe", authMiddleware, async (req: AuthRequest, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token obrigatório" });
  await execute("UPDATE usuarios SET push_token = ? WHERE id = ?", [token, req.user!.id]);
  res.json({ mensagem: "Push token registrado" });
});

export default router;