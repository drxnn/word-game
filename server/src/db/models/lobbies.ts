import { GameStatus, PlayerVoteResult } from "shared-types";
import { query, connect } from "../index";
import { enterPlayer, votePlayer } from "./players";
import camelcaseKeys from "camelcase-keys";

export async function createLobby(code: string) {
  if (!code) throw new Error("Code is required");
  const client = await connect();
  await client.query(`BEGIN`);

  try {
    const result = await client.query(
      `
        INSERT INTO lobbies (code)
        VALUES ($1) RETURNING *
        `,
      [code],
    );
    const lobby = camelcaseKeys([result.rows[0]])[0];

    await client.query(`INSERT INTO games (lobby_id) VALUES ($1)`, [lobby.id]);
    await client.query(`COMMIT`);
    return lobby;
  } catch (err: any) {
    await client.query(`ROLLBACK`);
    if (err.code === "23505") {
      const wrappedErr = new Error("Lobby code already exists");
      (wrappedErr as any).code = "23505";
      throw wrappedErr;
    } else {
      throw new Error("Something went wrong when creating Lobby");
    }
  } finally {
    client.release();
  }
}

export async function isLobbyActive(lobbyId: string) {
  const result = await query(`SELECT id FROM lobbies WHERE id = $1`, [lobbyId]);

  return result.rows.length > 0;
}

export async function castVoteAtomic(
  lobbyId: string,
  playerId: string,
  targetId: string,
): Promise<{ allVoted: boolean; results: PlayerVoteResult[] }> {
  const client = await connect();
  try {
    await client.query("BEGIN");
    const currentStatus = await client.query(
      `SELECT game_status FROM games WHERE lobby_id = $1 FOR UPDATE`,
      [lobbyId],
    );
    const status = camelcaseKeys(currentStatus.rows)[0]?.gameStatus;
    if (status !== "VOTING") {
      throw new Error("Voting is not active");
    }
    const roundResult = await client.query(
      `SELECT voting_round FROM lobbies WHERE id = $1`,
      [lobbyId],
    );
    const votingRound = camelcaseKeys(roundResult.rows)[0]?.votingRound;
    const targetCheck = await client.query(
      `SELECT voted_out FROM players WHERE id = $1 AND lobby_id = $2`,
      [targetId, lobbyId],
    );
    if (!targetCheck.rows[0]) {
      throw new Error("Target player not found");
    }
    if (targetCheck.rows[0].voted_out) {
      throw new Error("Cannot vote for a player who has been voted out");
    }

    await client.query(
      `INSERT INTO votes (player_id, voted_for_player_id, lobby_id, voting_round)
       VALUES ($1, $2, $3, $4)`,
      [playerId, targetId, lobbyId, votingRound],
    );

    const checkResult = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM players WHERE lobby_id = $1 AND voted_out IS NOT TRUE) as total_players,
        (SELECT COUNT(*) FROM votes WHERE lobby_id = $1 AND voting_round = $2) as total_votes`,
      [lobbyId, votingRound],
    );
    const { total_players, total_votes } = checkResult.rows[0];
    const allVoted = Number(total_votes) === Number(total_players);

    let results = [];
    if (allVoted) {
      const voteCounts = await client.query(
        `
    SELECT 
    p.id,
    p.name,
    p.is_imposter,
    COUNT(v.voted_for_player_id) as vote_count
    FROM players p
    LEFT JOIN votes v ON p.id = v.voted_for_player_id
    AND v.voting_round = $2
    WHERE p.lobby_id=$1 AND p.voted_out IS NOT TRUE
    GROUP BY p.id, p.name, p.is_imposter
    ORDER BY vote_count DESC

    `,
        [lobbyId, votingRound],
      );
      await client.query(
        `UPDATE games SET game_status = 'VOTED' WHERE lobby_id = $1`,
        [lobbyId],
      );

      results = camelcaseKeys(voteCounts.rows).map((r: any) => ({
        ...r,
        voteCount: Number(r.voteCount),
      }));
    }

    await client.query("COMMIT");
    return { allVoted, results };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
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
  const result = await query(
    `
    UPDATE lobbies 
    SET voting_round = voting_round + 1 
    WHERE id = $1
    RETURNING voting_round
    `,
    [lobbyId],
  );
  return result.rows[0].votingRound;
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

    await client.query(`DELETE FROM votes WHERE lobby_id = $1`, [lobbyId]); // delete votes- might change later if history is needed

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
  const { totalPlayers, totalVotes } = result.rows[0];

  return Number(totalVotes) == Number(totalPlayers);
}

export async function clearVotes(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  await query(`DELETE FROM votes WHERE lobby_id = $1`, [lobbyId]);
}

//
export async function changeGameStatus(lobbyId: string, status: GameStatus) {
  await query(
    `
    UPDATE games SET game_status = $2 WHERE lobby_id = $1
    `,
    [lobbyId, status],
  );
}

export async function getGameStatus(lobbyId: string) {
  const result = await query(
    `
    SELECT game_status FROM games WHERE lobby_id = $1
    `,
    [lobbyId],
  );

  return result.rows[0]?.gameStatus;
}
