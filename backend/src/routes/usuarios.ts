import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { query, queryOne, execute } from "../db/index.js";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();
const limiterAuth = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  message: { error: "Muitas tentativas. Aguarde 15 min." },
});
const SALT   = 12;
const SECRET = process.env.JWT_SECRET || "secret";

// POST /api/usuarios/cadastro
router.post("/cadastro", limiterAuth, async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha)
    return res.status(400).json({ error: "Dados incompletos" });
  if (senha.length < 6)
    return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });

  try {
    const hash   = await bcrypt.hash(senha, SALT);
    const result = await execute(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
      [nome, email, hash]
    );
    await execute(
      `INSERT INTO alertas_perfil
         (usuario_id, regioes, estados, areas, escolaridades, salario_minimo, frequencia)
       VALUES (?, '[]', '[]', '[]', '[]', 0, 'imediato')`,
      [result.insertId]
    );
    res.status(201).json({ id: result.insertId, mensagem: "Conta criada com sucesso" });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "E-mail já cadastrado" });
    res.status(400).json({ error: err.message });
  }
});

// POST /api/usuarios/login
router.post("/login", limiterAuth, async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ error: "E-mail e senha obrigatórios" });

  const user = await queryOne<any>(
    "SELECT * FROM usuarios WHERE email = ? AND ativo = 1",
    [email]
  );
  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const expiresIn = user.role === "admin" ? "8h" : "24h";
  const token     = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn });

  res.json({
    token,
    user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
  });
});

// GET /api/usuarios/perfil
router.get("/perfil", authMiddleware, async (req: AuthRequest, res) => {
  const user = await queryOne(
    "SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = ?",
    [req.user!.id]
  );
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  const alerta: any = await queryOne(
    "SELECT * FROM alertas_perfil WHERE usuario_id = ?",
    [req.user!.id]
  );
  if (alerta) {
    for (const k of ["regioes", "estados", "areas", "escolaridades"]) {
      try { alerta[k] = JSON.parse(alerta[k] || "[]"); } catch { alerta[k] = []; }
    }
  }
  res.json({ ...user, alerta });
});

// PUT /api/usuarios/perfil
router.put("/perfil", authMiddleware, async (req: AuthRequest, res) => {
  const { alerta } = req.body;
  if (!alerta) return res.status(400).json({ error: "Dados de alerta obrigatórios" });

  const existe = await queryOne(
    "SELECT id FROM alertas_perfil WHERE usuario_id = ?",
    [req.user!.id]
  );
  const vals = [
    JSON.stringify(alerta.regioes       || []),
    JSON.stringify(alerta.estados       || []),
    JSON.stringify(alerta.areas         || []),
    JSON.stringify(alerta.escolaridades || []),
    alerta.salario_minimo || 0,
    alerta.frequencia     || "imediato",
    req.user!.id,
  ];

  if (existe) {
    await execute(
      `UPDATE alertas_perfil
       SET regioes=?, estados=?, areas=?, escolaridades=?, salario_minimo=?, frequencia=?
       WHERE usuario_id=?`,
      vals
    );
  } else {
    await execute(
      `INSERT INTO alertas_perfil
         (regioes, estados, areas, escolaridades, salario_minimo, frequencia, usuario_id)
       VALUES (?,?,?,?,?,?,?)`,
      vals
    );
  }
  res.json({ mensagem: "Alertas atualizados" });
});

// POST /api/usuarios/salvar/:id
router.post("/salvar/:id", authMiddleware, async (req: AuthRequest, res) => {
  await execute(
    "INSERT OR IGNORE INTO editais_salvos (usuario_id, edital_id) VALUES (?, ?)",
    [req.user!.id, req.params.id]
  );
  res.json({ mensagem: "Edital salvo" });
});

// DELETE /api/usuarios/salvar/:id
router.delete("/salvar/:id", authMiddleware, async (req: AuthRequest, res) => {
  await execute(
    "DELETE FROM editais_salvos WHERE usuario_id = ? AND edital_id = ?",
    [req.user!.id, req.params.id]
  );
  res.json({ mensagem: "Edital removido dos salvos" });
});

// GET /api/usuarios/salvos
router.get("/salvos", authMiddleware, async (req: AuthRequest, res) => {
  const editais = await query(
    `SELECT e.* FROM editais e
     INNER JOIN editais_salvos es ON es.edital_id = e.id
     WHERE es.usuario_id = ?
     ORDER BY es.salvo_em DESC`,
    [req.user!.id]
  );
  res.json(editais);
});

export default router;