import { createClient, ResultSet } from "@libsql/client";

const db = createClient({
  url:       process.env.TURSO_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

db.execute("SELECT 1")
  .then(() => console.log("✅ Turso conectado"))
  .catch((err: Error) => { console.error("❌ Erro ao conectar Turso:", err.message); process.exit(1); });

export default db;

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result: ResultSet = await db.execute({ sql, args: params });
  return result.rows as unknown as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []) {
  const result: ResultSet = await db.execute({ sql, args: params });
  return {
    insertId:     Number(result.lastInsertRowid ?? 0),
    affectedRows: result.rowsAffected,
  };
}