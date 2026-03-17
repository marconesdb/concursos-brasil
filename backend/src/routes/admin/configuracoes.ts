import { Router } from "express";
import { query, execute } from "../../db/index.js";
import { AuthRequest, logAdmin, getIP } from "../../middlewares/isAdmin.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    res.json(await query("SELECT * FROM configuracoes ORDER BY chave ASC"));
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:chave", async (req: AuthRequest, res) => {
  try {
    const { valor } = req.body;
    await execute(
      `INSERT OR REPLACE INTO configuracoes (chave, valor, atualizado_em)
 VALUES (?, ?, datetime('now'))
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), atualizado_em = datetime('now')`,
      [req.params.chave, valor]
    );
    await logAdmin(
      req.user!.id,
      "UPDATE_CONFIG",
      "configuracoes",
      null,
      getIP(req),
      { chave: req.params.chave, valor }
    );
    res.json({ mensagem: "Configuração atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;