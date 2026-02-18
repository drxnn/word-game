import { query, connect } from "../index";
import { enterPlayer } from "./players";

export async function createLobby(code: string) {
  if (!code) throw new Error("Code is required");

  try {
    const result = await query(
      `
        INSERT INTO lobbies (code)
        VALUES ($1) RETURNING *
        `,
      [code],
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error("Lobby code already exists");
    }
    throw err;
  }
}

export async function setImposterKnows(lobbyId: string, flag: boolean) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (typeof flag !== "boolean") throw new Error("Flag must be a boolean");

  const result = await query(
    `
    UPDATE lobbies
    SET imposter_knows = $2
    WHERE id=$1 RETURNING *
    `,
    [lobbyId, flag],
  );

  return result.rows[0];
}

export async function incrementVotingRound(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  return await query(
    `
    UPDATE lobbies 
    SET voting_round = voting_round + 1 
    WHERE id = $1
    `,
    [lobbyId],
  );
}

export async function resetLobbyVotingRound(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const client = await connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
UPDATE lobbies SET voting_round = 0, word_pair_id = NULL WHERE id=$1
`,
      [lobbyId],
    );
    await client.query(
      `
      UPDATE players
      SET
        voted_out = false,
        assigned_word = NULL,
        is_imposter = false
      WHERE lobby_id = $1
      `,
      [lobbyId],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function countLobbyPlayers(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
    `
    SELECT COUNT(*) as count FROM players WHERE lobby_id = $1
    `,
    [lobbyId],
  );
  return Number(result.rows[0].count);
}

export async function deleteLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  let result = await query(
    `
    DELETE FROM lobbies
    WHERE id=$1
    RETURNING *
    `,
    [lobbyId],
  );
  return result.rows[0];
}

export async function getLobbyById(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
    `  SELECT * FROM lobbies WHERE id = $1
        `,
    [lobbyId],
  );
  return result.rows[0] ?? null;
}

export async function getLobbyByCode(code: string) {
  if (!code) throw new Error("Code is required");

  const result = await query(
    `  SELECT * FROM lobbies WHERE code = $1
        `,
    [code],
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

export async function haveAllPlayersVoted(
  lobbyId: string,
  votingRound: number,
): Promise<boolean> {
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (votingRound == null) throw new Error("Voting round is required");
  const result = await query(
    `
    SELECT 
    (SELECT COUNT(*) FROM players WHERE lobby_id = $1 AND voted_out IS NOT TRUE) as total_players,
    (SELECT COUNT (*) FROM votes WHERE lobby_id = $1 and voting_round = $2) as total_votes
    `,
    [lobbyId, votingRound],
  );
  const { total_players, total_votes } = result.rows[0];
  return Number(total_votes) == Number(total_players);
}
