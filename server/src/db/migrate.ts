import { Pool } from "pg";
import fs from "fs";
import path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const initSQL = fs.readFileSync(
    path.join(__dirname, "migrations/001_init.sql"),
    "utf8",
  );
  const seedSQL = fs.readFileSync(
    path.join(__dirname, "migrations/002_seedData.sql"),
    "utf8",
  );

  await pool.query(initSQL);
  console.log("Init done");
  await pool.query(seedSQL);
  console.log("Seed done");

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
