import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_MAX_CLIENTS ?? 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
