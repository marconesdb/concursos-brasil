// ════════════════════════════════════════════════════════════════════════
// frontend/src/services/coletor.ts
// Cron job: coleta DOU (XML) + feeds RSS configurados no banco
// ════════════════════════════════════════════════════════════════════════

import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import db from "../db";
import { processarEditalComIA } from "./processador";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// ─── Tipo interno ──────────────────────────────────────────────────────────────
interface EditalBruto {
  titulo: string;
  conteudo: string;
  link: string;
  fonte: string;
}

// ─── Busca feeds RSS cadastrados no banco ────────────────────────────────────
function getFontesAtivas(): Array<{ id: number; nome: string; url: string }> {
  return db.prepare("SELECT id, nome, url FROM fontes_rss WHERE ativa = 1").all() as any[];
}

// ─── Coleta um feed RSS genérico ─────────────────────────────────────────────
async function coletarRSS(url: string, nomeFonte: string): Promise<EditalBruto[]> {
  const res = await axios.get(url, { timeout: 15_000, responseType: "text" });
  const parsed = parser.parse(res.data);
  const items: any[] = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
  const arr = Array.isArray(items) ? items : [items];

  const keywords = /concurso|edital|sele[çc][aã]o p[úu]blica|processo seletivo/i;

  return arr
    .filter((item: any) => {
      const text = `${item.title || ""} ${item.description || item.summary || ""}`;
      return keywords.test(text);
    })
    .map((item: any) => ({
      titulo: item.title?.toString() || "Sem título",
      conteudo: item.description?.toString() || item.summary?.toString() || item.content?.toString() || "",
      link: item.link?.toString() || item["@_href"] || "",
      fonte: nomeFonte,
    }));
}

// ─── Coleta o XML oficial do DOU via INLABS ──────────────────────────────────
async function coletarDOU(): Promise<EditalBruto[]> {
  // O DOU disponibiliza XML da Seção 3 (editais) em:
  // https://inlabs.in.gov.br/index.php?p=home&portaria=xml&pagina=3
  // Para este projeto usamos o feed RSS público do DOU como fallback
  const DOU_RSS = "https://www.in.gov.br/servico/pesquisa?p_p_id=buscaOficial_WAR_D3buscaoficiaPortlet_INSTANCE_dMwhSuhPFgzJ&p_p_lifecycle=0&_buscaOficial_WAR_D3buscaoficiaPortlet_INSTANCE_dMwhSuhPFgzJ_secao=do3&_buscaOficial_WAR_D3buscaoficiaPortlet_INSTANCE_dMwhSuhPFgzJ_tipoPesquisa=tipoPesquisaTexto&_buscaOficial_WAR_D3buscaoficiaPortlet_INSTANCE_dMwhSuhPFgzJ_outrosOrgaos=false&_buscaOficial_WAR_D3buscaoficiaPortlet_INSTANCE_dMwhSuhPFgzJ_query=concurso+edital";

  try {
    return await coletarRSS(DOU_RSS, "DOU-Secao3");
  } catch (e) {
    console.warn("[DOU] Falha ao coletar feed. Usando mock de fallback.");
    return []; // Em produção, configurar credenciais INLABS aqui
  }
}

// ─── Verifica e salva um edital no banco ──────────────────────────────────────
async function salvarEdital(bruto: EditalBruto): Promise<"novo" | "duplicado" | "erro"> {
  const hash = crypto.createHash("sha256").update(bruto.titulo + bruto.link).digest("hex");

  // Checar duplicata
  const existe = db.prepare("SELECT id FROM editais WHERE hash = ?").get(hash);
  if (existe) return "duplicado";

  try {
    // Processar com IA (resumo + extração de dados estruturados)
    const dados = await processarEditalComIA(bruto.conteudo || bruto.titulo);

    // Buscar imagem de capa na Unsplash (com fallback para picsum)
    let imagemCapa = `https://picsum.photos/seed/${hash.slice(0, 8)}/800/600`;
    if (process.env.UNSPLASH_ACCESS_KEY) {
      try {
        const query = dados.area || "concurso publico brazil";
        const resp = await axios.get(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`, {
          headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
          timeout: 5_000,
        });
        imagemCapa = resp.data.urls?.regular || imagemCapa;
      } catch { /* usa fallback */ }
    }

    const hoje = new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO editais (
        hash, titulo, orgao, banca, nivel, area, escolaridade, vagas,
        salario_min, salario_max, estado, municipio, regiao,
        resumo_ia, conteudo_raw, link_edital, link_inscricao, imagem_capa,
        prazo_inscricao, data_publicacao, fonte
      ) VALUES (
        @hash, @titulo, @orgao, @banca, @nivel, @area, @escolaridade, @vagas,
        @salario_min, @salario_max, @estado, @municipio, @regiao,
        @resumo_ia, @conteudo_raw, @link_edital, @link_inscricao, @imagem_capa,
        @prazo_inscricao, @data_publicacao, @fonte
      )
    `).run({
      hash,
      titulo: bruto.titulo.slice(0, 500),
      orgao: dados.orgao || "Não informado",
      banca: dados.banca || "",
      nivel: dados.nivel || "federal",
      area: dados.area || "administrativa",
      escolaridade: dados.escolaridade || "medio",
      vagas: dados.vagas || null,
      salario_min: dados.salario_min || null,
      salario_max: dados.salario_max || null,
      estado: dados.estado || "BR",
      municipio: dados.municipio || "Nacional",
      regiao: dados.regiao || "nacional",
      resumo_ia: dados.resumo || "Resumo indisponível.",
      conteudo_raw: bruto.conteudo.slice(0, 50000),
      link_edital: bruto.link || "",
      link_inscricao: dados.link_inscricao || bruto.link || "",
      imagem_capa: imagemCapa,
      prazo_inscricao: dados.prazo_inscricao || null,
      data_publicacao: hoje,
      fonte: bruto.fonte,
    });

    return "novo";
  } catch (e) {
    console.error("[SALVAR_EDITAL]", e);
    return "erro";
  }
}

// ─── Seed de dados mock (banco vazio) ─────────────────────────────────────────
function seedMockData() {
  const hoje = new Date().toISOString().slice(0, 10);
  const amanha = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  const mocks = [
    {
      titulo: "Concurso Público — Tribunal de Justiça de São Paulo 2026",
      orgao: "TJ-SP", banca: "VUNESP", nivel: "estadual", area: "judiciaria",
      escolaridade: "superior", vagas: 150, salario_min: 8500, salario_max: 12000,
      estado: "SP", municipio: "São Paulo", regiao: "sudeste",
      resumo_ia: "TJ-SP abre 150 vagas para Analista Judiciário com salários de até R$ 12.000. Inscrições pela VUNESP até 15 de abril de 2026.",
      link_edital: "https://vunesp.com.br", link_inscricao: "https://vunesp.com.br",
      imagem_capa: "https://picsum.photos/seed/justice/800/600",
      prazo_inscricao: amanha, data_publicacao: hoje, fonte: "MOCK",
    },
    {
      titulo: "Processo Seletivo — Prefeitura Municipal de Curitiba 2026",
      orgao: "Prefeitura de Curitiba", banca: "NC-UFPR", nivel: "municipal", area: "educacao",
      escolaridade: "medio", vagas: 45, salario_min: 3200, salario_max: 4500,
      estado: "PR", municipio: "Curitiba", regiao: "sul",
      resumo_ia: "Prefeitura de Curitiba oferece 45 vagas para Auxiliar de Ensino. Nível médio, salário até R$ 4.500. Banca NC-UFPR.",
      link_edital: "https://nc.ufpr.br", link_inscricao: "https://nc.ufpr.br",
      imagem_capa: "https://picsum.photos/seed/education/800/600",
      prazo_inscricao: amanha, data_publicacao: hoje, fonte: "MOCK",
    },
    {
      titulo: "Edital — Polícia Federal 2026 | Agente e Delegado",
      orgao: "Polícia Federal", banca: "CEBRASPE", nivel: "federal", area: "seguranca",
      escolaridade: "superior", vagas: 500, salario_min: 12500, salario_max: 25300,
      estado: "BR", municipio: "Nacional", regiao: "nacional",
      resumo_ia: "PF abre 500 vagas para Agente e Delegado com salários de até R$ 25.300. Inscrições pelo CEBRASPE. Todo o Brasil.",
      link_edital: "https://cebraspe.org.br", link_inscricao: "https://cebraspe.org.br",
      imagem_capa: "https://picsum.photos/seed/police/800/600",
      prazo_inscricao: amanha, data_publicacao: hoje, fonte: "MOCK",
    },
    {
      titulo: "Concurso — Secretaria de Saúde do Estado do Rio de Janeiro",
      orgao: "SES-RJ", banca: "FGV", nivel: "estadual", area: "saude",
      escolaridade: "superior", vagas: 300, salario_min: 5000, salario_max: 9800,
      estado: "RJ", municipio: "Rio de Janeiro", regiao: "sudeste",
      resumo_ia: "SES-RJ publica edital para 300 vagas na área de saúde, incluindo médicos e enfermeiros. Salários de até R$ 9.800.",
      link_edital: "https://fgv.br", link_inscricao: "https://fgv.br",
      imagem_capa: "https://picsum.photos/seed/health/800/600",
      prazo_inscricao: amanha, data_publicacao: hoje, fonte: "MOCK",
    },
    {
      titulo: "Concurso Público — SERPRO 2026 | Analista em TI",
      orgao: "SERPRO", banca: "CEBRASPE", nivel: "federal", area: "tecnologia",
      escolaridade: "superior", vagas: 200, salario_min: 10400, salario_max: 15600,
      estado: "BR", municipio: "Nacional", regiao: "nacional",
      resumo_ia: "SERPRO lança concurso para 200 vagas em Tecnologia da Informação. Trabalho remoto, salário até R$ 15.600.",
      link_edital: "https://cebraspe.org.br", link_inscricao: "https://cebraspe.org.br",
      imagem_capa: "https://picsum.photos/seed/tech/800/600",
      prazo_inscricao: amanha, data_publicacao: hoje, fonte: "MOCK",
    },
    {
      titulo: "Seleção Pública — Prefeitura de Manaus | Área Administrativa",
      orgao: "Prefeitura de Manaus", banca: "FCC", nivel: "municipal", area: "administrativa",
      escolaridade: "medio", vagas: 80, salario_min: 2800, salario_max: 3900,
      estado: "AM", municipio: "Manaus", regiao: "norte",
      resumo_ia: "Prefeitura de Manaus seleciona 80 assistentes administrativos de nível médio com salário de até R$ 3.900. Banca FCC.",
      link_edital: "https://fcc.org.br", link_inscricao: "https://fcc.org.br",
      imagem_capa: "https://picsum.photos/seed/admin/800/600",
      prazo_inscricao: amanha, data_publicacao: hoje, fonte: "MOCK",
    },
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO editais (
      hash, titulo, orgao, banca, nivel, area, escolaridade, vagas,
      salario_min, salario_max, estado, municipio, regiao,
      resumo_ia, link_edital, link_inscricao, imagem_capa,
      prazo_inscricao, data_publicacao, fonte
    ) VALUES (
      @hash, @titulo, @orgao, @banca, @nivel, @area, @escolaridade, @vagas,
      @salario_min, @salario_max, @estado, @municipio, @regiao,
      @resumo_ia, @link_edital, @link_inscricao, @imagem_capa,
      @prazo_inscricao, @data_publicacao, @fonte
    )
  `);

  let inseridos = 0;
  for (const m of mocks) {
    const hash = crypto.createHash("sha256").update(m.titulo + m.data_publicacao).digest("hex");
    const res = insert.run({ ...m, hash });
    if (res.changes > 0) inseridos++;
  }
  return inseridos;
}

// ─── Função principal exportada ───────────────────────────────────────────────
export async function runColeta() {
  console.log("[COLETA] Iniciando...");
  const start = Date.now();

  // Se banco vazio, popular com dados mock
  const count = (db.prepare("SELECT COUNT(*) as c FROM editais").get() as any).c;
  if (count === 0) {
    const qtd = seedMockData();
    console.log(`[COLETA] Banco vazio — inseridos ${qtd} editais de exemplo.`);
    db.prepare("INSERT INTO logs_coleta (fonte, editais_novos, editais_duplicados, erros) VALUES (?, ?, ?, ?)")
      .run("MOCK_SEED", qtd, 0, 0);
    return;
  }

  // Coletar DOU
  const fontesDOU: EditalBruto[] = await coletarDOU();

  // Coletar RSS cadastrados no banco
  const fontesRSS = getFontesAtivas();
  let todosRSS: EditalBruto[] = [];
  for (const f of fontesRSS) {
    try {
      const items = await coletarRSS(f.url, f.nome);
      todosRSS = [...todosRSS, ...items];
      db.prepare("UPDATE fontes_rss SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id = ?").run(f.id);
    } catch (e) {
      console.warn(`[RSS] Falha ao coletar ${f.nome}:`, (e as Error).message);
    }
  }

  const todos = [...fontesDOU, ...todosRSS];
  console.log(`[COLETA] ${todos.length} itens para processar`);

  let novos = 0, duplicados = 0, erros = 0;
  for (const bruto of todos) {
    const resultado = await salvarEdital(bruto);
    if (resultado === "novo") novos++;
    else if (resultado === "duplicado") duplicados++;
    else erros++;
    // Throttle para não sobrecarregar a API de IA
    await new Promise(r => setTimeout(r, 300));
  }

  const tempo = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[COLETA] Concluída em ${tempo}s — ${novos} novos, ${duplicados} duplicados, ${erros} erros`);

  db.prepare("INSERT INTO logs_coleta (fonte, editais_novos, editais_duplicados, erros) VALUES (?, ?, ?, ?)")
    .run(`DOU+RSS(${fontesRSS.length})`, novos, duplicados, erros);
}