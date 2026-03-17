
// ════════════════════════════════════════════════════════════════════
// backend/src/routes/admin/fontes.ts
// ════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { query, execute } from "../../db/index.js";

const router6 = Router();

router6.get("/", async (_req, res) => {
  res.json(await query("SELECT * FROM fontes_rss ORDER BY criado_em DESC"));
});

router6.post("/", async (req, res) => {
  const { nome, url } = req.body;
  if (!nome || !url) return res.status(400).json({ error: "Nome e URL obrigatórios" });
  const result = await execute("INSERT INTO fontes_rss (nome, url) VALUES (?, ?)", [nome, url]);
  res.status(201).json({ id: result.insertId, nome, url, ativa: 1 });
});

router6.put("/:id", async (req, res) => {
  const { nome, url, ativa } = req.body;
  const sets: string[] = [], vals: any[] = [];
  if (nome  !== undefined) { sets.push("nome = ?");  vals.push(nome); }
  if (url   !== undefined) { sets.push("url = ?");   vals.push(url); }
  if (ativa !== undefined) { sets.push("ativa = ?"); vals.push(ativa); }
  if (!sets.length) return res.status(400).json({ error: "Nenhum campo para atualizar" });
  vals.push(req.params.id);
  await execute(`UPDATE fontes_rss SET ${sets.join(", ")} WHERE id = ?`, vals);
  res.json({ mensagem: "Fonte atualizada" });
});

export default router6;
