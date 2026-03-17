
// ════════════════════════════════════════════════════════════════════
// backend/src/routes/admin/dashboard.ts
// ════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { queryOne } from "../../db/index.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const q = (sql: string) => queryOne<{ c: number }>(sql).then(r => r?.c ?? 0);
    res.json({
      totalEditais:     await q("SELECT COUNT(*) as c FROM editais"),
      totalUsuarios:    await q("SELECT COUNT(*) as c FROM usuarios"),
      editaisHoje:      await q("SELECT COUNT(*) as c FROM editais WHERE DATE(data_publicacao) = CURDATE()"),
      notificacoesHoje: await q("SELECT COUNT(*) as c FROM notificacoes WHERE DATE(enviado_em) = CURDATE()"),
      editaisSemana:    await q("SELECT COUNT(*) as c FROM editais WHERE data_publicacao >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"),
      editaisMes:       await q("SELECT COUNT(*) as c FROM editais WHERE data_publicacao >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"),
    });
  } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});

export default router;