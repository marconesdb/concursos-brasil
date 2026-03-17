import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('database.sqlite');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS editais (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    hash            TEXT UNIQUE,
    titulo          TEXT,
    orgao           TEXT,
    banca           TEXT,
    nivel           TEXT CHECK(nivel IN ('federal','estadual','municipal')),
    area            TEXT,
    escolaridade    TEXT CHECK(escolaridade IN ('fundamental','medio','tecnico','superior','pos')),
    vagas           INTEGER,
    salario_min     DECIMAL(10,2),
    salario_max     DECIMAL(10,2),
    estado          TEXT,
    municipio       TEXT,
    regiao          TEXT CHECK(regiao IN ('norte','nordeste','centro-oeste','sudeste','sul','nacional')),
    resumo_ia       TEXT,
    conteudo_raw    TEXT,
    link_edital     TEXT,
    link_inscricao  TEXT,
    imagem_capa     TEXT,
    prazo_inscricao TEXT,
    data_publicacao TEXT,
    publicado       INTEGER DEFAULT 1,
    fonte           TEXT,
    criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nome         TEXT,
    email        TEXT UNIQUE,
    senha_hash   TEXT,
    push_token   TEXT,
    role         TEXT CHECK(role IN ('user','admin')) DEFAULT 'user',
    ativo        INTEGER DEFAULT 1,
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alertas_perfil (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id      INTEGER REFERENCES usuarios(id),
    regioes         TEXT, -- JSON string
    estados         TEXT, -- JSON string
    areas           TEXT, -- JSON string
    escolaridades   TEXT, -- JSON string
    salario_minimo  DECIMAL(10,2),
    frequencia      TEXT CHECK(frequencia IN ('imediato','diario','semanal')),
    ativo           INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS editais_salvos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id),
    edital_id  INTEGER REFERENCES editais(id),
    salvo_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, edital_id)
  );

  CREATE TABLE IF NOT EXISTS notificacoes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id  INTEGER REFERENCES usuarios(id),
    edital_id   INTEGER REFERENCES editais(id),
    canal       TEXT CHECK(canal IN ('email','push')),
    enviado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs_coleta (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    fonte              TEXT,
    editais_novos      INTEGER,
    editais_duplicados INTEGER,
    erros              INTEGER,
    executado_em       DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id     INTEGER REFERENCES usuarios(id),
    acao         TEXT,
    entidade     TEXT,
    entidade_id  INTEGER,
    ip           TEXT,
    detalhes     TEXT, -- JSON string
    executado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS configuracoes (
    chave         TEXT PRIMARY KEY,
    valor         TEXT,
    descricao     TEXT,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fontes_rss (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT,
    url           TEXT,
    ativa         INTEGER DEFAULT 1,
    ultimo_acesso DATETIME,
    criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
