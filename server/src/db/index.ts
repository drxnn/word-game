import { Pool } from "pg";

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:123456@localhost:5432/drin",
  max: Number(process.env.DB_MAX_CLIENTS ?? 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
