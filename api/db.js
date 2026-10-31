import pg from "pg";

const { Pool } = pg;
let pool;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada");
  }

  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca || !ca.includes("-----BEGIN CERTIFICATE-----") || !ca.includes("-----END CERTIFICATE-----")) {
    throw new Error("DATABASE_CA_CERT ausente ou inválido");
  }

  if (!pool) {
    // Removemos sslmode da URI para evitar que pg sobrescreva o objeto ssl,
    // preservando a validação da CA fornecida pelo Aiven.
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");

    pool = new Pool({
      connectionString: url.toString(),
      ssl: {
        ca,
        rejectUnauthorized: true,
        servername: url.hostname
      },
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000
    });

    pool.on("error", (error) => {
      console.error("Erro no pool PostgreSQL:", error);
    });
  }

  return pool;
}
