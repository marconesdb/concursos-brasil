import { Router } from "express";
import { query, execute } from "../../db/index.js";
import { AuthRequest, logAdmin, getIP } from "../../middlewares/isAdmin.js";
import { runColeta } from "../../services/coletor.js";

const router = Router();

router.get("/logs", async (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  res.json(await query("SELECT * FROM logs_coleta ORDER BY executado_em DESC LIMIT ?", [limit]));
});

router.post("/forcar", async (req: AuthRequest, res) => {
  res.json({ mensagem: "Coleta iniciada em background" });
  await logAdmin(req.user!.id, "FORCAR_COLETA", "coletas", null, getIP(req), {});
  runColeta().catch(e => console.error("[COLETA FORÇADA]", e));
});

router.put("/status", async (req, res) => {
  const { ativo } = req.body;
  await execute(
    `INSERT OR REPLACE INTO configuracoes (chave, valor, descricao)
 VALUES ('cron_ativo', ?, 'Status do cron job')
     ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
    [ativo ? "1" : "0"]
  );
  res.json({ mensagem: `Cron ${ativo ? "ativado" : "pausado"}` });
});

export default router;