import { pool } from "../index";
import { enterPlayer } from "./players";
export async function enterLobby(code: string) {
  const result = await pool.query(
    `
        INSERT INTO lobbies (code)
        VALUES ($1) RETURNING *

        `,
    [code]
  );

  return result.rows[0];
}

export async function getLobbyByCode(code: string) {
  const result = await pool.query(
    `
        SELECT * FROM lobbies WHERE code = $1
        `,
    [code]
  );

  return result.rows[0] ?? null; // take care in routes if its null
}

export async function joinLobbyWithCode(name: string, code: string) {
  const lobby = await getLobbyByCode(code);
  if (!lobby) return null; // take care of it in routes if null
  return await enterPlayer(name, lobby.id);
}
