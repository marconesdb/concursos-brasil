
// ════════════════════════════════════════════════════════════════════
// backend/src/routes/admin/usuarios.ts
// ════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { query, execute } from "../../db/index.js";
import { AuthRequest, logAdmin, getIP } from "../../middlewares/isAdmin.js";

const router3 = Router();

router3.get("/", async (_req, res) => {
  res.json(await query("SELECT id, nome, email, role, ativo, criado_em FROM usuarios ORDER BY criado_em DESC"));
});

router3.put("/:id/status", async (req: AuthRequest, res) => {
  const { ativo } = req.body;
  await execute("UPDATE usuarios SET ativo = ? WHERE id = ?", [ativo, req.params.id]);
  await logAdmin(req.user!.id, "UPDATE_STATUS", "usuarios", Number(req.params.id), getIP(req), { ativo });
  res.json({ mensagem: "Status atualizado" });
});

router3.put("/:id/role", async (req: AuthRequest, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role))
    return res.status(400).json({ error: "Role inválido" });
  await execute("UPDATE usuarios SET role = ? WHERE id = ?", [role, req.params.id]);
  await logAdmin(req.user!.id, "UPDATE_ROLE", "usuarios", Number(req.params.id), getIP(req), { role });
  res.json({ mensagem: "Role atualizado" });
});

export default router3;