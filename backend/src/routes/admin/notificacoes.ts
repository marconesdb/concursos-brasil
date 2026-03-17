
// ════════════════════════════════════════════════════════════════════
// backend/src/routes/admin/notificacoes.ts
// ════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { query, execute } from "../../db/index.js";
import { AuthRequest, logAdmin, getIP } from "../../middlewares/isAdmin.js";

const router5 = Router();

router5.get("/historico", async (_req, res) => {
  res.json(await query(
    `SELECT n.*, u.nome AS usuario_nome, e.titulo AS edital_titulo
     FROM notificacoes n
     LEFT JOIN usuarios u ON u.id = n.usuario_id
     LEFT JOIN editais  e ON e.id = n.edital_id
     ORDER BY n.enviado_em DESC LIMIT 100`
  ));
});

router5.get("/fila", async (_req, res) => {
  res.json(await query(
    `SELECT u.email, u.nome, e.titulo AS edital_titulo, e.id AS edital_id
     FROM usuarios u
     CROSS JOIN editais e
     LEFT JOIN notificacoes n ON n.usuario_id = u.id AND n.edital_id = e.id
     WHERE n.id IS NULL
       AND e.data_publicacao >= DATE_SUB(NOW(), INTERVAL 1 DAY)
       AND e.publicado = 1
     LIMIT 50`
  ));
});

router5.post("/comunicado", async (req: AuthRequest, res) => {
  const { mensagem } = req.body;
  if (!mensagem?.trim()) return res.status(400).json({ error: "Mensagem obrigatória" });
  const usuarios = await query<{ id: number; email: string }>(
    "SELECT id, email FROM usuarios WHERE ativo = 1"
  );
  console.log(`[COMUNICADO] ${usuarios.length} destinatários | ${mensagem}`);
  await logAdmin(req.user!.id, "COMUNICADO", "notificacoes", null, getIP(req), { mensagem, destinatarios: usuarios.length });
  res.json({ mensagem: "Comunicado agendado", destinatarios: usuarios.length });
});

export default router5;