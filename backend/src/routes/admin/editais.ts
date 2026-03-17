// ════════════════════════════════════════════════════════════════════
// backend/src/routes/admin/editais.ts
// ════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { query, queryOne, execute } from "../../db/index.js";
import { AuthRequest, logAdmin, getIP } from "../../middlewares/isAdmin.js";
import { processarEditalComIA } from "../../services/processador.js";

const router2 = Router();

// GET /api/admin/editais
router2.get("/", async (req, res) => {
  const { q, page = "1", limit = "20" } = req.query as Record<string, string>;
  let sql = "SELECT * FROM editais WHERE 1=1";
  const params: any[] = [];
  if (q) { sql += " AND (titulo LIKE ? OR orgao LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
  const p = Math.max(1, Number(page)), l = Number(limit);
  sql += " ORDER BY criado_em DESC LIMIT ? OFFSET ?";
  params.push(l, (p - 1) * l);
  res.json(await query(sql, params));
});

// POST /api/admin/editais
router2.post("/", async (req: AuthRequest, res) => {
  const d = req.body;
  const hash = d.hash || Date.now().toString();
  const result = await execute(
    `INSERT INTO editais
       (hash,titulo,orgao,banca,nivel,area,escolaridade,vagas,salario_min,salario_max,
        estado,municipio,regiao,resumo_ia,conteudo_raw,link_edital,link_inscricao,
        imagem_capa,prazo_inscricao,data_publicacao,fonte)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [hash, d.titulo, d.orgao, d.banca, d.nivel, d.area, d.escolaridade, d.vagas,
     d.salario_min, d.salario_max, d.estado, d.municipio, d.regiao,
     d.resumo_ia, d.conteudo_raw, d.link_edital, d.link_inscricao,
     d.imagem_capa, d.prazo_inscricao, d.data_publicacao, d.fonte]
  );
  await logAdmin(req.user!.id, "CREATE_EDITAL", "editais", result.insertId, getIP(req), { titulo: d.titulo });
  res.status(201).json({ id: result.insertId });
});

// PUT /api/admin/editais/:id
router2.put("/:id", async (req: AuthRequest, res) => {
  const fields = req.body;
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
  await execute(`UPDATE editais SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
  await logAdmin(req.user!.id, "UPDATE_EDITAL", "editais", Number(req.params.id), getIP(req), fields);
  res.json({ mensagem: "Edital atualizado" });
});

// DELETE /api/admin/editais/:id
router2.delete("/:id", async (req: AuthRequest, res) => {
  await execute("DELETE FROM editais WHERE id = ?", [req.params.id]);
  await logAdmin(req.user!.id, "DELETE_EDITAL", "editais", Number(req.params.id), getIP(req), {});
  res.json({ mensagem: "Edital excluído" });
});

// POST /api/admin/editais/:id/reprocessar
router2.post("/:id/reprocessar", async (req: AuthRequest, res) => {
  const edital = await queryOne<any>("SELECT * FROM editais WHERE id = ?", [req.params.id]);
  if (!edital) return res.status(404).json({ error: "Edital não encontrado" });
  res.json({ mensagem: "Reprocessamento iniciado" });
  // Roda em background após responder
  processarEditalComIA(edital.conteudo_raw || edital.titulo)
    .then(dados => execute("UPDATE editais SET resumo_ia = ? WHERE id = ?", [dados.resumo, req.params.id]))
    .catch(e => console.error("[REPROCESSAR]", e));
});

export default router2;