import { pool } from "../index";
import { enterPlayer } from "./players";

export async function createLobby(code: string) {
  if (!code) throw new Error("Code is required");

  try {
    const result = await pool.query(
      `
        INSERT INTO lobbies (code)
        VALUES ($1) RETURNING *
        `,
      [code]
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error("Lobby code already exists");
    }
  }
}

export async function setImposterKnows(lobbyId: string, flag: boolean) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (typeof flag !== "boolean") throw new Error("Flag must be a boolean");

  await pool.query(
    `
    UPDATE lobbies
    SET imposter_knows = $2
    WHERE id=$1
    `,
    [lobbyId, flag]
  );
}

export async function resetLobbyVotingRound(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  await pool.query(
    `
UPDATE lobbies SET voting_round = 0 WHERE id=$1
`,
    [lobbyId]
  );
}

export async function countLobbyPlayers(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await pool.query(
    `
    SELECT COUNT(*) as count FROM players WHERE lobby_id = $1
    `,
    [lobbyId]
  );
  return Number(result.rows[0].count);
}

export async function deleteLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  let result = await pool.query(
    `
    DELETE FROM lobbies
    WHERE id=$1
    RETURNING *
    `,
    [lobbyId]
  );
  return result.rows[0];
}

export async function getLobbyById(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await pool.query(
    `  SELECT * FROM lobbies WHERE id = $1
        `,
    [lobbyId]
  );
  return result.rows[0] ?? null;
}

export async function getLobbyByCode(code: string) {
  if (!code) throw new Error("Code is required");

  const result = await pool.query(
    `  SELECT * FROM lobbies WHERE code = $1
        `,
    [code]
  );
  return result.rows[0] ?? null; // take care in routes if its null
}

export async function joinLobbyWithCode(name: string, code: string) {
  if (!name) throw new Error("Name is required");
  if (!code) throw new Error("Code is required");

  const lobby = await getLobbyByCode(code);
  if (!lobby) return null; // take care of it in routes if null
  return await enterPlayer(name, lobby.id);
}
