import { Pool } from "pg";
import camelcaseKeys from "camelcase-keys";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_MAX_CLIENTS ?? 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});
export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return {
    ...result,
    rows: camelcaseKeys(result.rows),
  };
};

export const connect = () => pool.connect();
