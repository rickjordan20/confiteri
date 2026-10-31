import pg from "pg";
const { Pool } = pg;
let pool;
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000
    });
    pool.on("error", err => console.error("Erro no pool PostgreSQL:", err));
  }
  return pool;
}
