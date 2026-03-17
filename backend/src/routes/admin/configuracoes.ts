// ════════════════════════════════════════════════════════════════════
// backend/src/routes/admin/configuracoes.ts
// ════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { query, execute } from "../../db/index.js";
import { AuthRequest, logAdmin, getIP } from "../../middlewares/isAdmin.js";

const router7 = Router();

router7.get("/", async (_req, res) => {
  res.json(await query("SELECT * FROM configuracoes ORDER BY chave ASC"));
});

router7.put("/:chave", async (req: AuthRequest, res) => {
  const { valor } = req.body;
  await execute(
    `INSERT INTO configuracoes (chave, valor, atualizado_em)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), atualizado_em = NOW()`,
    [req.params.chave, valor]
  );
  await logAdmin(req.user!.id, "UPDATE_CONFIG", "configuracoes", null, getIP(req), { chave: req.params.chave, valor });
  res.json({ mensagem: "Configuração atualizada" });
});

export default router7;