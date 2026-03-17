
// ════════════════════════════════════════════════════════════════════════
// frontend/src/services/processador.ts
// Chama IA (Groq com fallback para Gemini) para resumo + extração
// ════════════════════════════════════════════════════════════════════════

import Groq from "groq-sdk";

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

interface DadosEdital {
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

const PROMPT_RESUMO = (texto: string) => `
Dado o texto abaixo de um edital de concurso público, gere um resumo em exatamente 3 linhas:
1. Órgão e cargo principal
2. Número de vagas e faixa salarial
3. Prazo de inscrição e banca organizadora

Texto: ${texto.slice(0, 3000)}
`;

const PROMPT_EXTRACAO = (texto: string) => `
Extraia do texto abaixo e retorne APENAS um JSON válido sem comentários nem backticks.
Campos obrigatórios:
{
  "orgao": "string",
  "banca": "string ou null",
  "nivel": "federal|estadual|municipal",
  "area": "judiciaria|saude|educacao|seguranca|tecnologia|administrativa|financeira|engenharia|juridica|outra",
  "escolaridade": "fundamental|medio|tecnico|superior|pos",
  "vagas": number ou null,
  "salario_min": number ou null,
  "salario_max": number ou null,
  "estado": "sigla de 2 letras ou BR",
  "municipio": "string",
  "regiao": "norte|nordeste|centro-oeste|sudeste|sul|nacional",
  "prazo_inscricao": "YYYY-MM-DD ou null",
  "link_inscricao": "URL ou null"
}

Texto: ${texto.slice(0, 3000)}
`;

async function chamarGroq(prompt: string): Promise<string> {
  if (!groq) throw new Error("Groq não configurado");
  const chat = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  return chat.choices[0]?.message?.content || "";
}

async function chamarGemini(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini não configurado");
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });
  return result.text ?? "";
}

async function chamarIA(prompt: string): Promise<string> {
  try {
    return await chamarGroq(prompt);
  } catch (e) {
    console.warn("[IA] Groq falhou, tentando Gemini:", (e as Error).message);
    try {
      return await chamarGemini(prompt);
    } catch (e2) {
      console.warn("[IA] Gemini também falhou:", (e2 as Error).message);
      return "";
    }
  }
}

export async function processarEditalComIA(texto: string): Promise<DadosEdital> {
  const defaultData: DadosEdital = {
    resumo: "Resumo não disponível.",
    orgao: "Não informado", banca: "", nivel: "federal",
    area: "administrativa", escolaridade: "medio",
    vagas: null, salario_min: null, salario_max: null,
    estado: "BR", municipio: "Nacional", regiao: "nacional",
    prazo_inscricao: null, link_inscricao: null,
  };

  try {
    // Roda resumo e extração em paralelo
    const [resumoRaw, extracaoRaw] = await Promise.all([
      chamarIA(PROMPT_RESUMO(texto)),
      chamarIA(PROMPT_EXTRACAO(texto)),
    ]);

    let dados: Partial<DadosEdital> = {};
    if (extracaoRaw) {
      try {
        // Limpar possíveis marcadores de código que o modelo possa incluir
        const limpo = extracaoRaw.replace(/```json|```/g, "").trim();
        dados = JSON.parse(limpo);
      } catch {
        console.warn("[PROCESSADOR] Falha no parse JSON da extração.");
      }
    }

    return { ...defaultData, ...dados, resumo: resumoRaw || defaultData.resumo };
  } catch (e) {
    console.error("[PROCESSADOR] Erro:", e);
    return defaultData;
  }
}

// Alias para compatibilidade com server.ts (reprocessar edital)
export const processarComIA = processarEditalComIA;