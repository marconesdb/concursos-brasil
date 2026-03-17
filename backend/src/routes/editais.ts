import { Router } from "express";
import { query, queryOne } from "../db/index.js";
import rateLimit from "express-rate-limit";

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 60 });

// GET /api/editais
router.get("/", limiter, async (req, res) => {
  try {
    const {
      q, regiao, estado, area, escolaridade, nivel,
      salario_min, page = "1", limit = "12",
    } = req.query as Record<string, string>;

    let sql = "SELECT * FROM editais WHERE publicado = 1";
    const params: any[] = [];

    if (q)            { sql += " AND (titulo LIKE ? OR orgao LIKE ? OR banca LIKE ?)"; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (regiao)       { sql += " AND regiao = ?";         params.push(regiao); }
    if (estado)       { sql += " AND estado = ?";         params.push(estado); }
    if (area)         { sql += " AND LOWER(area) LIKE ?"; params.push(`%${area.toLowerCase()}%`); }
    if (escolaridade) { sql += " AND escolaridade = ?";   params.push(escolaridade); }
    if (nivel)        { sql += " AND nivel = ?";          params.push(nivel); }
    if (salario_min)  { sql += " AND salario_max >= ?";   params.push(Number(salario_min)); }

    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
    const [{ total }] = await query<{ total: number }>(countSql, params);

    const p = Math.max(1, Number(page));
    const l = Math.min(50, Math.max(1, Number(limit)));
    sql += " ORDER BY data_publicacao DESC LIMIT ? OFFSET ?";
    params.push(l, (p - 1) * l);

    const editais = await query(sql, params);
    res.json({ editais, total, page: p, limit: l });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/editais/destaques — deve vir ANTES de /:id
router.get("/destaques", limiter, async (_req, res) => {
  try {
    const editais = await query(
      "SELECT * FROM editais WHERE publicado = 1 ORDER BY vagas DESC LIMIT 10"
    );
    res.json(editais);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/editais/:id
router.get("/:id", limiter, async (req, res) => {
  try {
    const edital = await queryOne(
      "SELECT * FROM editais WHERE id = ? AND publicado = 1",
      [req.params.id]
    );
    if (!edital) return res.status(404).json({ error: "Edital não encontrado" });
    res.json(edital);
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;