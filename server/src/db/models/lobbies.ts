import { pool } from "../index";
import { enterPlayer } from "./players";
export async function createLobby(code: string) {
  const result = await pool.query(
    `
        INSERT INTO lobbies (code)
        VALUES ($1) RETURNING *

        `,
    [code]
  );

  return result.rows[0];
}

export async function checkIfCodeLobbyExists(code: string) {}

export async function setImposterKnows(lobbyId: string, flag: boolean) {
  await pool.query(
    `
    UPDATE lobbies
    SET imposter_knows = $2
    WHERE id=$1
    `,
    [lobbyId, flag]
  );
}

export async function pickWordPairRandomly(lobbyId: string) {
  // pick a word pair randomly, make sure its not used again per lobby game
}

export async function resetLobbyVotingRound(lobbyId: string) {
  await pool.query(
    `
UPDATE lobbies SET voting_round = 0 WHERE id=$1
`,
    [lobbyId]
  );
}

export async function countLobbyPlayers(lobbyId: string) {
  // count players and return number
  return 1;
}

export async function deleteLobby(lobbyId: string) {
  // delete lobby
}
export async function getLobbyById(lobbyId: string) {
  const result = await pool.query(
    `  SELECT * FROM lobbies WHERE id = $1
        `,
    [lobbyId]
  );

  return result.rows[0] ?? null;
}

export async function getLobbyByCode(code: string) {
  const result = await pool.query(
    `  SELECT * FROM lobbies WHERE code = $1
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
