import {
  GameOptions,
  GameStatus,
  PlayerSchema,
  PlayerVoteResult,
} from "shared-types";
import { query, connect } from "../index";
import {
  assignImposter,
  assignWordsToPlayers,
  enterPlayer,
  getRemainingImposters,
  playersLeftInGame,
  playerVotedOut,
} from "./players";
import camelcaseKeys from "camelcase-keys";
import { PoolClient } from "pg";

export async function createLobby(
  code: string,
  playerName: string,
  options: GameOptions,
  outsideClient?: PoolClient,
) {
  if (!code) throw new Error("Code is required");
  const ownsClient = !outsideClient;
  const client = outsideClient ?? (await connect());

  const imposterKnows = options?.imposterHint ?? false;

  try {
    if (ownsClient) await client.query("BEGIN");

    const lobbyResult = await client.query(
      `INSERT INTO lobbies (code, imposter_knows) VALUES ($1, $2) RETURNING *`,
      [code, imposterKnows],
    );
    const lobby = camelcaseKeys([lobbyResult.rows[0]])[0];

    await client.query(`INSERT INTO games (lobby_id) VALUES ($1)`, [lobby.id]);

    const playerResult = await client.query(
      `INSERT INTO players (name, lobby_id, is_host) VALUES ($1, $2, true) RETURNING *`,
      [playerName, lobby.id],
    );
    const player = camelcaseKeys([playerResult.rows[0]])[0];

    if (ownsClient) await client.query("COMMIT");
    return { lobby, player };
  } catch (err: any) {
    if (ownsClient) await client.query("ROLLBACK");
    if (err.code === "23505") {
      const wrappedErr = new Error("Lobby code already exists");
      (wrappedErr as any).code = "23505";
      throw wrappedErr;
    } else {
      throw new Error("Something went wrong when creating Lobby");
    }
  } finally {
    if (ownsClient) client.release();
  }
}

export async function isLobbyActive(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (outsideClient) {
    const result = await outsideClient.query(
      `SELECT id FROM lobbies WHERE id = $1`,
      [lobbyId],
    );
    return result.rows.length > 0;
  }

  const result = await query(`SELECT id FROM lobbies WHERE id = $1`, [lobbyId]);

  return result.rows.length > 0;
}

export async function castVoteAtomic(
  lobbyId: string,
  playerId: string,
  targetId: string,
  outsideClient?: PoolClient,
): Promise<{ allVoted: boolean; results: PlayerVoteResult[] }> {
  const ownsClient = !outsideClient;
  const client = outsideClient ?? (await connect());

  try {
    if (ownsClient) await client.query("BEGIN");
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
    if (playerId === targetId) {
      throw new Error("Cannot vote for yourself");
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

    if (ownsClient) await client.query("COMMIT");
    return { allVoted, results };
  } catch (err) {
    if (ownsClient) await client.query("ROLLBACK");
    throw err;
  } finally {
    if (ownsClient) client.release();
  }
}
export async function setImposterKnows(
  lobbyId: string,
  flag: boolean,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (typeof flag !== "boolean") throw new Error("Flag must be a boolean");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
    UPDATE lobbies
    SET imposter_knows = $2
    WHERE id=$1 RETURNING *
    `,
      [lobbyId, flag],
    );
    return camelcaseKeys(result.rows)[0];
  }

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

export async function incrementVotingRound(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
    UPDATE lobbies
    SET voting_round = voting_round + 1
    WHERE id = $1
    RETURNING voting_round
    `,
      [lobbyId],
    );
    return camelcaseKeys(result.rows)[0].votingRound;
  }

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

export async function resetLobbyVotingRound(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  let client: PoolClient | null = null;

  const ownsClient = !outsideClient; // for future reference: if no outside client is passed, then we can call "BEGIN" etc, otherwise let outer function do it
  if (outsideClient) {
    client = outsideClient;
  } else {
    client = await connect();
  }

  try {
    if (ownsClient) await client.query("BEGIN");

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

    if (ownsClient) await client.query("COMMIT");
  } catch (err) {
    if (ownsClient) await client.query("ROLLBACK");
    throw err;
  } finally {
    if (ownsClient) client.release();
  }
}

export async function countLobbyPlayers(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
    SELECT COUNT(*) as count FROM players WHERE lobby_id = $1
    `,
      [lobbyId],
    );
    return Number(result.rows[0].count);
  }

  const result = await query(
    `
    SELECT COUNT(*) as count FROM players WHERE lobby_id = $1
    `,
    [lobbyId],
  );
  return Number(result.rows[0].count);
}

export async function deleteLobby(lobbyId: string, outsideClient?: PoolClient) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    let result = await outsideClient.query(
      `
    DELETE FROM lobbies
    WHERE id=$1
    RETURNING *
    `,
      [lobbyId],
    );
    return camelcaseKeys(result.rows)[0];
  }

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

export async function getLobbyById(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `  SELECT * FROM lobbies WHERE id = $1
        `,
      [lobbyId],
    );
    return camelcaseKeys(result.rows)[0] ?? null;
  }

  const result = await query(
    `  SELECT * FROM lobbies WHERE id = $1
        `,
    [lobbyId],
  );
  return result.rows[0] ?? null;
}

export async function getLobbyByCode(code: string, outsideClient?: PoolClient) {
  if (!code) throw new Error("Code is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `  SELECT * FROM lobbies WHERE code = $1
        `,
      [code],
    );
    return camelcaseKeys(result.rows)[0] ?? null;
  }

  const result = await query(
    `  SELECT * FROM lobbies WHERE code = $1
        `,
    [code],
  );
  return result.rows[0] ?? null; // take care in routes if its null
}

export async function haveAllPlayersVoted(
  lobbyId: string,
  votingRound: number,
  outsideClient?: PoolClient,
): Promise<boolean> {
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (votingRound == null) throw new Error("Voting round is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
    SELECT
    (SELECT COUNT(*) FROM players WHERE lobby_id = $1 AND voted_out IS NOT TRUE) as total_players,
    (SELECT COUNT (*) FROM votes WHERE lobby_id = $1 and voting_round = $2) as total_votes
    `,
      [lobbyId, votingRound],
    );
    const camelRows = camelcaseKeys(result.rows);
    const { totalPlayers, totalVotes } = camelRows[0];
    return Number(totalVotes) == Number(totalPlayers);
  }

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

//
export async function changeGameStatus(
  lobbyId: string,
  status: GameStatus,
  outsideClient?: PoolClient,
) {
  if (outsideClient) {
    await outsideClient.query(
      `
    UPDATE games SET game_status = $2 WHERE lobby_id = $1
    `,
      [lobbyId, status],
    );
    return;
  }

  await query(
    `
    UPDATE games SET game_status = $2 WHERE lobby_id = $1
    `,
    [lobbyId, status],
  );
}

export async function getGameStatus(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (outsideClient) {
    const result = await outsideClient.query(
      `
    SELECT game_status FROM games WHERE lobby_id = $1
    `,
      [lobbyId],
    );
    return camelcaseKeys(result.rows)[0]?.gameStatus;
  }

  const result = await query(
    `
    SELECT game_status FROM games WHERE lobby_id = $1
    `,
    [lobbyId],
  );

  return result.rows[0]?.gameStatus;
}

export async function startGameAtomic(lobbyId: string, options?: GameOptions) {
  const client = await connect();

  let numOfImposters = options?.numOfImposters ?? 1;
  try {
    await client.query("BEGIN");
    await resetLobbyVotingRound(lobbyId, client);
    const playerCount = await playersLeftInGame(lobbyId, client);
    if (playerCount < 3) throw new Error("Need at least 3 players to start");
    if (numOfImposters >= playerCount) throw new Error("Too many imposters");

    const round = await incrementVotingRound(lobbyId, client);
    if (options?.imposterHint) {
      await setImposterKnows(lobbyId, options.imposterHint, client);
    }

    const imposter = await assignImposter(lobbyId, numOfImposters, client);

    await changeGameStatus(lobbyId, GameStatus.started, client);

    await assignWordsToPlayers(lobbyId, client);

    await client.query("COMMIT");
    return {
      round,
      imposter,
    };
  } catch (err) {
    await client.query("ROLLBACK");

    throw err;
  } finally {
    client.release();
  }
}

export async function resolveVoteAtomic(
  lobbyId: string,
  votedOutPlayer: string,
) {
  const client = await connect();
  try {
    await client.query("BEGIN");
    const playerOut = await playerVotedOut(lobbyId, votedOutPlayer, client);
    const numOfPlayersLeft = await playersLeftInGame(lobbyId, client);
    const remainingImposters = await getRemainingImposters(lobbyId, client);
    await client.query("COMMIT");
    return {
      playerVotedOut: playerOut,
      numOfPlayersLeft,
      remainingImposters,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
