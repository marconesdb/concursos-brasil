import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

export interface DadosEdital {
  resumo: string;
  orgao: string;
  banca: string;
  nivel: "federal" | "estadual" | "municipal";
  area: string;
  escolaridade: "fundamental" | "medio" | "tecnico" | "superior" | "pos";
  vagas: number | null;
  salario_min: number | null;
  salario_max: number | null;
  estado: string;
  municipio: string;
  regiao: "norte" | "nordeste" | "centro-oeste" | "sudeste" | "sul" | "nacional";
  prazo_inscricao: string | null;
  link_inscricao: string | null;
}

const PROMPT_RESUMO = (t: string) =>
  `Dado este edital de concurso público, gere um resumo em exatamente 3 linhas:
1. Órgão e cargo principal
2. Número de vagas e faixa salarial
3. Prazo de inscrição e banca organizadora
Texto: ${t.slice(0, 3000)}`;

const PROMPT_EXTRACAO = (t: string) =>
  `Extraia do texto abaixo e retorne APENAS um JSON válido sem backticks:
{"orgao":"","banca":"","nivel":"federal|estadual|municipal","area":"judiciaria|saude|educacao|seguranca|tecnologia|administrativa|financeira|engenharia|juridica|outra","escolaridade":"fundamental|medio|tecnico|superior|pos","vagas":null,"salario_min":null,"salario_max":null,"estado":"XX","municipio":"","regiao":"norte|nordeste|centro-oeste|sudeste|sul|nacional","prazo_inscricao":"YYYY-MM-DD ou null","link_inscricao":"URL ou null"}
Texto: ${t.slice(0, 3000)}`;

async function chamarIA(prompt: string): Promise<string> {
  if (groq) {
    try {
      const r = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });
      return r.choices[0]?.message?.content || "";
    } catch (e) {
      console.warn("[IA] Groq falhou:", (e as Error).message);
    }
  }
  if (gemini) {
    try {
      const r = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return r.text ?? "";
    } catch (e) {
      console.warn("[IA] Gemini falhou:", (e as Error).message);
    }
  }
  return "";
}

const DEFAULT: DadosEdital = {
  resumo: "Resumo não disponível.",
  orgao: "Não informado",
  banca: "",
  nivel: "federal",
  area: "administrativa",
  escolaridade: "medio",
  vagas: null,
  salario_min: null,
  salario_max: null,
  estado: "BR",
  municipio: "Nacional",
  regiao: "nacional",
  prazo_inscricao: null,
  link_inscricao: null,
};

export async function processarEditalComIA(texto: string): Promise<DadosEdital> {
  try {
    const [resumoRaw, extracaoRaw] = await Promise.all([
      chamarIA(PROMPT_RESUMO(texto)),
      chamarIA(PROMPT_EXTRACAO(texto)),
    ]);

    let dados: Partial<DadosEdital> = {};
    if (extracaoRaw) {
      try {
        dados = JSON.parse(extracaoRaw.replace(/```json|```/g, "").trim());
      } catch {
        console.warn("[PROCESSADOR] Falha no parse JSON da extração.");
      }
    }

    return { ...DEFAULT, ...dados, resumo: resumoRaw || DEFAULT.resumo };
  } catch (e) {
    console.error("[PROCESSADOR]", e);
    return DEFAULT;
  }
}