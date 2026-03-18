import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import { query, queryOne, execute } from "../db/index.js";
import { processarEditalComIA } from "./processador.js";
import { buscarImagem } from "./imagens.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const KEYWORDS = /concurso p[úu]blico|edital de concurso|sele[çc][aã]o p[úu]blica|processo seletivo p[úu]blico|abertura de inscri[çc][õo]es|vagas p[úu]blicas/i;

interface EditalBruto {
  titulo: string;
  conteudo: string;
  link: string;
  fonte: string;
}

async function coletarRSS(url: string, nome: string): Promise<EditalBruto[]> {
  const res = await axios.get(url, { timeout: 15_000, responseType: "text" });
  const parsed = parser.parse(res.data);
  const items: any[] = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
  return (Array.isArray(items) ? items : [items])
    .filter(i => KEYWORDS.test(`${i.title || ""} ${i.description || i.summary || ""}`))
    .map(i => ({
      titulo:   i.title?.toString() || "Sem título",
      conteudo: i.description?.toString() || i.summary?.toString() || "",
      link:     i.link?.toString() || i["@_href"] || "",
      fonte:    nome,
    }));
}

async function salvarEdital(bruto: EditalBruto): Promise<"novo" | "duplicado" | "erro"> {
  const hash = crypto.createHash("sha256").update(bruto.titulo + bruto.link).digest("hex");
  const existe = await queryOne("SELECT id FROM editais WHERE hash = ?", [hash]);
  if (existe) return "duplicado";

  try {
    const dados = await processarEditalComIA(bruto.conteudo || bruto.titulo);

    // Sanitizar ENUMs para evitar CHECK constraint
    const NIVEIS      = ["federal","estadual","municipal"];
    const REGIOES     = ["norte","nordeste","centro-oeste","sudeste","sul","nacional"];
    const ESCOLARIDADES = ["fundamental","medio","tecnico","superior","pos"];

    dados.nivel       = NIVEIS.includes(dados.nivel)           ? dados.nivel       : "federal";
    dados.regiao      = REGIOES.includes(dados.regiao)         ? dados.regiao      : "nacional";
    dados.escolaridade = ESCOLARIDADES.includes(dados.escolaridade) ? dados.escolaridade : "medio";

    const imagem = await buscarImagem(dados.area || "concurso", hash.slice(0, 8));
    const hoje = new Date().toISOString().slice(0, 10);

    await execute(
      `INSERT INTO editais
         (hash, titulo, orgao, banca, nivel, area, escolaridade, vagas,
          salario_min, salario_max, estado, municipio, regiao, resumo_ia,
          conteudo_raw, link_edital, link_inscricao, imagem_capa,
          prazo_inscricao, data_publicacao, fonte)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        hash, bruto.titulo.slice(0, 500), dados.orgao, dados.banca,
        dados.nivel, dados.area, dados.escolaridade, dados.vagas,
        dados.salario_min, dados.salario_max, dados.estado, dados.municipio,
        dados.regiao, dados.resumo, bruto.conteudo.slice(0, 50000),
        bruto.link, dados.link_inscricao || bruto.link,
        imagem, dados.prazo_inscricao, hoje, bruto.fonte,
      ]
    );
    return "novo";
  } catch (e) {
    console.error("[SALVAR]", e);
    return "erro";
  }
}

function getMocks(hoje: string, prazo: string): EditalBruto[] {
  return [
    { titulo: "Concurso Público TJ-SP 2026 — Analista Judiciário",         conteudo: `Tribunal de Justiça de São Paulo. 150 vagas. Nível superior. Salário R$ 8.500 a R$ 12.000. Banca VUNESP. Inscrições até ${prazo}.`, link: "https://vunesp.com.br",        fonte: "MOCK" },
    { titulo: "Processo Seletivo Prefeitura de Curitiba 2026",              conteudo: `Prefeitura Municipal de Curitiba. 45 vagas. Auxiliar de Ensino. Nível médio. Salário R$ 3.200 a R$ 4.500. Banca NC-UFPR. Inscrições até ${prazo}.`, link: "https://nc.ufpr.br",          fonte: "MOCK" },
    { titulo: "Concurso Polícia Federal 2026 — Agente e Delegado",          conteudo: `Polícia Federal. 500 vagas. Nacional. Nível superior. Salário R$ 12.500 a R$ 25.300. Banca CEBRASPE. Inscrições até ${prazo}.`, link: "https://cebraspe.org.br",      fonte: "MOCK" },
    { titulo: "Concurso SES-RJ 2026 — Área de Saúde",                       conteudo: `Secretaria de Saúde RJ. 300 vagas. Médicos e Enfermeiros. Nível superior. Salário R$ 5.000 a R$ 9.800. Banca FGV. Inscrições até ${prazo}.`, link: "https://fgv.br",               fonte: "MOCK" },
    { titulo: "Concurso SERPRO 2026 — Analista em TI",                      conteudo: `SERPRO. 200 vagas. Tecnologia da Informação. Nacional. Remoto. Salário R$ 10.400 a R$ 15.600. Banca CEBRASPE. Inscrições até ${prazo}.`, link: "https://cebraspe.org.br",      fonte: "MOCK" },
    { titulo: "Seleção Pública Prefeitura de Manaus — Área Administrativa", conteudo: `Prefeitura de Manaus. 80 vagas. Assistente Administrativo. Nível médio. Salário R$ 2.800 a R$ 3.900. Banca FCC. Inscrições até ${prazo}.`, link: "https://fcc.org.br",           fonte: "MOCK" },
  ];
}

export async function runColeta() {
  console.log("[COLETA] Iniciando...");
  const start = Date.now();

  const [{ c }] = await query<{ c: number }>("SELECT COUNT(*) as c FROM editais");

  if (c === 0) {
    console.log("[COLETA] Banco vazio — populando com mocks...");
    const hoje  = new Date().toISOString().slice(0, 10);
    const prazo = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
    let novos = 0;
    for (const m of getMocks(hoje, prazo)) {
      const r = await salvarEdital(m);
      if (r === "novo") novos++;
      await new Promise(r => setTimeout(r, 200));
    }
    await execute(
      "INSERT INTO logs_coleta (fonte, editais_novos, editais_duplicados, erros) VALUES (?,?,?,?)",
      ["MOCK_SEED", novos, 0, 0]
    );
    console.log(`[COLETA] ${novos} mocks inseridos.`);
    return;
  }

  // Coletar fontes RSS ativas do banco
  const fontes = await query<{ id: number; nome: string; url: string }>(
    "SELECT id, nome, url FROM fontes_rss WHERE ativa = 1"
  );

  let todos: EditalBruto[] = [];
  for (const f of fontes) {
    try {
      todos = [...todos, ...(await coletarRSS(f.url, f.nome))];
      await execute("UPDATE fontes_rss SET ultimo_acesso = datetime('now') WHERE id = ?", [f.id]);
    } catch (e) {
      console.warn(`[RSS] Falha ${f.nome}:`, (e as Error).message);
    }
  }

  console.log(`[COLETA] ${todos.length} itens para processar`);
  let novos = 0, duplicados = 0, erros = 0;
  for (const bruto of todos) {
    const r = await salvarEdital(bruto);
    if (r === "novo") novos++;
    else if (r === "duplicado") duplicados++;
    else erros++;
    await new Promise(r => setTimeout(r, 300));
  }

  const tempo = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[COLETA] ${tempo}s — ${novos} novos, ${duplicados} dup, ${erros} erros`);
  await execute(
    "INSERT INTO logs_coleta (fonte, editais_novos, editais_duplicados, erros) VALUES (?,?,?,?)",
    [`RSS(${fontes.length})`, novos, duplicados, erros]
  );
}