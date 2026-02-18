import { Pool } from "pg";
import camelcaseKeys from "camelcase-keys";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:123456@localhost:5432/drin",
  max: Number(process.env.DB_MAX_CLIENTS ?? 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return {
    ...result,
    rows: camelcaseKeys(result.rows),
  };
};

export const connect = () => pool.connect();
