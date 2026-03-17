import nodemailer from "nodemailer";
import { query, execute } from "../db/index.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface Edital {
  id: number;
  titulo: string;
  orgao: string;
  estado: string;
  area: string;
  escolaridade: string;
  salario_max: number;
  link_inscricao: string;
}

interface Perfil {
  usuario_id: number;
  email: string;
  nome: string;
  regioes: string;
  estados: string;
  areas: string;
  escolaridades: string;
  salario_minimo: number;
}

function parseLista(json: string): string[] {
  try { return JSON.parse(json); } catch { return []; }
}

function editalBateComPerfil(e: Edital, p: Perfil): boolean {
  const estados       = parseLista(p.estados);
  const areas         = parseLista(p.areas);
  const escolaridades = parseLista(p.escolaridades);

  if (estados.length       && !estados.includes(e.estado))                              return false;
  if (areas.length         && !areas.some(a => e.area?.toLowerCase().includes(a)))      return false;
  if (escolaridades.length && !escolaridades.includes(e.escolaridade))                  return false;
  if (p.salario_minimo     && e.salario_max < p.salario_minimo)                         return false;
  return true;
}

async function enviarEmail(email: string, nome: string, edital: Edital) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#059669">Novo edital compatível com seu perfil!</h2>
      <p>Olá, <strong>${nome}</strong>!</p>
      <h3 style="color:#111">${edital.titulo}</h3>
      <p><strong>Órgão:</strong> ${edital.orgao} &nbsp;|&nbsp; <strong>Estado:</strong> ${edital.estado}</p>
      <a href="${edital.link_inscricao || "#"}"
         style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
        Ver edital e inscrever-se →
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">
        Você recebe este e-mail porque configurou alertas no ConcursosBrasil.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from: `"ConcursosBrasil" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🏛️ Novo edital: ${edital.titulo.slice(0, 60)}`,
    html,
  });
}

export async function processarAlertas() {
  console.log("[ALERTAS] Verificando notificações...");

  const editais = await query<Edital>(
    `SELECT * FROM editais
     WHERE publicado = 1
       AND data_publicacao >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  if (!editais.length) {
    console.log("[ALERTAS] Nenhum edital novo nas últimas 24h.");
    return;
  }

  const perfis = await query<Perfil>(
    `SELECT ap.*, u.email, u.nome
     FROM alertas_perfil ap
     INNER JOIN usuarios u ON u.id = ap.usuario_id
     WHERE ap.ativo = 1 AND u.ativo = 1`
  );

  let enviados = 0;
  for (const perfil of perfis) {
    for (const edital of editais) {
      const jaEnviado = await query(
        "SELECT id FROM notificacoes WHERE usuario_id = ? AND edital_id = ? AND canal = 'email'",
        [perfil.usuario_id, edital.id]
      );
      if (jaEnviado.length) continue;
      if (!editalBateComPerfil(edital, perfil)) continue;

      try {
        await enviarEmail(perfil.email, perfil.nome, edital);
        await execute(
          "INSERT INTO notificacoes (usuario_id, edital_id, canal) VALUES (?, ?, 'email')",
          [perfil.usuario_id, edital.id]
        );
        enviados++;
      } catch (e) {
        console.error(`[ALERTAS] Erro ao enviar para ${perfil.email}:`, e);
      }
    }
  }
  console.log(`[ALERTAS] ${enviados} notificações enviadas.`);
}