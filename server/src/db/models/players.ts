import { GameStatus, Player, PlayerVoteResult } from "shared-types";
import { connect, query } from "../index";
import camelcaseKeys from "camelcase-keys";
import { PoolClient } from "pg";
import {
  changeGameStatus,
  countLobbyPlayers,
  deleteLobby,
  getGameStatus,
  getLobbyByCode,
  resetLobbyVotingRound,
} from "./lobbies";

export async function enterPlayer(
  name: string,
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!name) throw new Error("Name is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
        INSERT INTO players (name, lobby_id)
        VALUES($1, $2) RETURNING *
        `,
      [name, lobbyId],
    );
    return camelcaseKeys(result.rows)[0];
  }

  const result = await query(
    `
        INSERT INTO players (name, lobby_id)
        VALUES($1, $2) RETURNING *
        `,
    [name, lobbyId],
  );
  return result.rows[0];
}

export async function exitPlayer(
  playerId: string,
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!playerId) throw new Error("Player ID is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
      DELETE FROM players WHERE id = $1 and lobby_id=$2
      RETURNING *
      `,
      [playerId, lobbyId],
    );
    return camelcaseKeys(result.rows)[0];
  }

  const result = await query(
    `
      DELETE FROM players WHERE id = $1 and lobby_id=$2
      RETURNING *
      `,
    [playerId, lobbyId],
  );

  return result.rows[0];
}
export async function setIsHost(
  playerId: string,
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!playerId) throw new Error("Player ID is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
      UPDATE players
      SET is_host = true
      WHERE id = $1 AND lobby_id = $2
      RETURNING *
    `,
      [playerId, lobbyId],
    );
    if (result.rowCount === 0) {
      throw new Error("Player not found in that lobby");
    }
    return camelcaseKeys(result.rows)[0];
  }

  const result = await query(
    `
      UPDATE players
      SET is_host = true
      WHERE id = $1 AND lobby_id = $2
      RETURNING *
    `,
    [playerId, lobbyId],
  );

  if (result.rowCount === 0) {
    throw new Error("Player not found in that lobby");
  }

  return result.rows[0];
}

export async function assignImposter(
  lobbyId: string,
  num: number = 1,
  outsideClient?: PoolClient,
) {
  if (outsideClient) {
    const result = await outsideClient.query(
      `
    UPDATE players
    SET is_imposter = true
    WHERE id IN (
     SELECT id FROM players WHERE lobby_id = $1 ORDER BY random() LIMIT $2
    )
   RETURNING *

    `,
      [lobbyId, num],
    );
    return camelcaseKeys(result.rows);
  }

  const result = await query(
    `
    UPDATE players
    SET is_imposter = true
    WHERE id IN (
     SELECT id FROM players WHERE lobby_id = $1 ORDER BY random() LIMIT $2
    )
   RETURNING *

    `,
    [lobbyId, num],
  );

  return result.rows;
}
export async function playerVotedOut(
  lobbyId: string,
  playerId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId || !playerId)
    throw new Error("Something went wrong, check playerid or lobby id");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
    UPDATE players SET voted_out = true
WHERE id = $1 AND lobby_id = $2
RETURNING *
    `,
      [playerId, lobbyId],
    );
    if (!camelcaseKeys(result.rows)[0])
      throw new Error("Player not found or already voted out");
    return camelcaseKeys(result.rows)[0];
  }

  const result = await query(
    `
    UPDATE players SET voted_out = true
WHERE id = $1 AND lobby_id = $2
RETURNING *
    `,
    [playerId, lobbyId],
  );
  if (!result.rows[0]) throw new Error("Player not found or already voted out");
  return result.rows[0];
}
export async function countVotes(
  lobbyId: string,
  outsideClient?: PoolClient,
): Promise<PlayerVoteResult[]> {
  if (!lobbyId) throw new Error("Lobby ID is required");

  let votingRound = await getRoundFromLobby(lobbyId, outsideClient);

  if (outsideClient) {
    const result = await outsideClient.query(
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
    return camelcaseKeys(result.rows).map((r: any) => ({
      ...r,
      voteCount: Number(r.voteCount),
    }));
  }

  const result = await query(
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
  //
  return result.rows.map((r: any) => ({
    ...r,
    voteCount: Number(r.voteCount),
  }));
}

export async function checkIfAllPlayersVoted(
  lobbyId: string,
  currentRound: number,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (currentRound === undefined || currentRound === null)
    throw new Error("Current round is required");

  if (outsideClient) {
    const { rows } = await outsideClient.query(
      `
    SELECT
(SELECT COUNT(*) FROM players WHERE lobby_id=$1 AND voted_out IS NOT TRUE) as total_players,
    (SELECT COUNT(DISTINCT player_id) FROM votes
     WHERE lobby_id=$1 AND voting_round=$2) AS votes_cast
    `,
      [lobbyId, currentRound],
    );
    const camelRows = camelcaseKeys(rows);
    const { totalPlayers, votesCast } = camelRows[0];
    return Number(totalPlayers) === Number(votesCast) ? true : false;
  }

  const { rows } = await query(
    `
    SELECT
(SELECT COUNT(*) FROM players WHERE lobby_id=$1 AND voted_out IS NOT TRUE) as total_players,
    (SELECT COUNT(DISTINCT player_id) FROM votes
     WHERE lobby_id=$1 AND voting_round=$2) AS votes_cast
    `,
    [lobbyId, currentRound],
  );

  const { totalPlayers, votesCast } = rows[0];

  return Number(totalPlayers) === Number(votesCast) ? true : false;
}

export async function getRoundFromLobby(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
    SELECT voting_round FROM LOBBIES WHERE id=$1
  `,
      [lobbyId],
    );
    return camelcaseKeys(result.rows)[0]?.votingRound;
  }

  const result = await query(
    `
    SELECT voting_round FROM LOBBIES WHERE id=$1
  `,
    [lobbyId],
  );

  return result.rows[0]?.votingRound;
}

export async function getAllPlayersInLobby(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
    SELECT * FROM players
    WHERE lobby_id=$1
    `,
      [lobbyId],
    );
    return camelcaseKeys(result.rows);
  }

  const result = await query(
    `
    SELECT * FROM players
    WHERE lobby_id=$1
    `,
    [lobbyId],
  );
  return result.rows;
}

export async function getPlayerInLobby(
  lobbyId: string,
  playerId: string,
  outsideClient?: PoolClient,
) {
  if (outsideClient) {
    const result = await outsideClient.query(
      `
    SELECT * FROM players
    WHERE lobby_id=$1 AND id=$2
    `,
      [lobbyId, playerId],
    );
    return camelcaseKeys(result.rows)[0] ?? null;
  }

  const result = await query(
    `
    SELECT * FROM players
    WHERE lobby_id=$1 AND id=$2
    `,
    [lobbyId, playerId],
  );
  return result.rows[0] ?? null;
}

export async function chooseWordPairId(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  let client: PoolClient | null = null;

  const ownsClient = !outsideClient;
  if (outsideClient) {
    client = outsideClient;
  } else {
    client = await connect();
  }

  try {
    if (ownsClient) await client.query("BEGIN");

    const result = await client.query(
      `
    UPDATE lobbies
    SET word_pair_id = (
    SELECT id FROM word_pairs
    WHERE id NOT IN (
    SELECT word_pair_id FROM used_words_per_lobby
    WHERE lobby_id = $1
    )
    ORDER BY random()
    LIMIT 1
    )
    WHERE id = $1
    RETURNING word_pair_id;
    `,
      [lobbyId],
    );

    const camelRows = camelcaseKeys(result.rows);
    if (camelRows[0]?.wordPairId) {
      await client.query(
        `
      INSERT INTO used_words_per_lobby (lobby_id, word_pair_id)
      VALUES ($1, $2);
      `,
        [lobbyId, camelRows[0].wordPairId],
      );
    }

    if (ownsClient) await client.query("COMMIT");

    return camelRows[0]?.wordPairId;
  } catch (err) {
    if (ownsClient) await client.query("ROLLBACK");

    throw err;
  } finally {
    if (ownsClient) client.release();
  }
}

export async function getImposterFromLobby(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    let result = await outsideClient.query(
      `
    SELECT id FROM players
    WHERE lobby_id = $1 AND is_imposter = true
    `,
      [lobbyId],
    );
    return camelcaseKeys(result.rows).map((row) => row.id);
  }

  let result = await query(
    `
    SELECT id FROM players
    WHERE lobby_id = $1 AND is_imposter = true
    `,
    [lobbyId],
  );

  return result.rows.map((row) => row.id);
}

export async function playersLeftInGame(
  lobbyId: string,
  outsideClient?: PoolClient,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  if (outsideClient) {
    const result = await outsideClient.query(
      `
  SELECT COUNT(*) FROM players WHERE lobby_id = $1 AND voted_out IS NOT TRUE
  `,
      [lobbyId],
    );
    if (!result.rows[0]) {
      throw new Error("Unexpected empty result from COUNT query");
    }
    return parseInt(result.rows[0].count, 10);
  }

  const result = await query(
    `
  SELECT COUNT(*) FROM players WHERE lobby_id = $1 AND voted_out IS NOT TRUE
  `,
    [lobbyId],
  );

  if (!result.rows[0]) {
    throw new Error("Unexpected empty result from COUNT query");
  }
  return parseInt(result.rows[0].count, 10);
}

export async function assignWordsToPlayers(
  lobbyId: string,
  outsideClient?: PoolClient,
): Promise<Player[]> {
  if (!lobbyId) throw new Error("Lobby ID is required");
  const ownsClient = !outsideClient;
  const client = outsideClient ?? (await connect());

  try {
    if (ownsClient) await client.query("BEGIN");
    let wordPairId = await chooseWordPairId(lobbyId, client);
    if (!wordPairId) {
      throw Error("Something went wrong with fetching a word pair!");
    }

    let imposters = await getImposterFromLobby(lobbyId, client);
    if (!imposters.length) {
      throw Error("Something went wrong. There is no imposter in the lobby!");
    }

    let { rows } = await client.query(
      `
    SELECT real_word, imposter_word FROM word_pairs WHERE id = $1
    `,
      [wordPairId],
    );

    if (!rows[0]) throw new Error("Something went wrong, word_pair not found.");
    const { realWord, imposterWord } = camelcaseKeys(rows[0]);
    if (!realWord || !imposterWord) {
      throw new Error("Something went wrong, word_pair not found.");
    }

    let result = await client.query(
      `
   UPDATE players
   SET assigned_word = CASE WHEN NOT is_imposter THEN $1 ELSE $2 END
   WHERE lobby_id = $3
   RETURNING *
    `,
      [realWord, imposterWord, lobbyId],
    );
    if (ownsClient) await client.query("COMMIT");
    return result.rows;
  } catch (err) {
    if (ownsClient) await client.query("ROLLBACK");
    throw err;
  } finally {
    if (ownsClient) client.release();
  }
}

export async function reassignHost(
  lobbyId: string,
  outsideClient?: PoolClient,
): Promise<Player | null> {
  const ownsClient = !outsideClient;
  const client = outsideClient ?? (await connect());

  try {
    if (ownsClient) await client.query("BEGIN");
    await client.query(
      `SELECT id FROM players WHERE lobby_id = $1 FOR UPDATE`,
      [lobbyId],
    );
    const result = await client.query(
      `UPDATE players
     SET is_host = true
     WHERE id = (
       SELECT id FROM players
       WHERE lobby_id = $1
       ORDER BY created_at ASC
       LIMIT 1
     )
     AND lobby_id = $1
     RETURNING *`,
      [lobbyId],
    );
    if (ownsClient) await client.query("COMMIT");
    return result.rows[0] ? camelcaseKeys([result.rows[0]])[0] : null;
  } catch (err) {
    if (ownsClient) await client.query("ROLLBACK");
    throw err;
  } finally {
    if (ownsClient) client.release();
  }
}

export async function getRemainingImposters(
  lobbyId: string,
  outsideClient?: PoolClient,
): Promise<number> {
  if (outsideClient) {
    const result = await outsideClient.query(
      `SELECT COUNT(*) as count FROM players
     WHERE lobby_id = $1 AND is_imposter = true AND voted_out IS NOT TRUE`,
      [lobbyId],
    );
    return parseInt(result.rows[0].count, 10);
  }

  const result = await query(
    `SELECT COUNT(*) as count FROM players
     WHERE lobby_id = $1 AND is_imposter = true AND voted_out IS NOT TRUE`,
    [lobbyId],
  );
  return parseInt(result.rows[0].count, 10);
}

export async function playerLeaveAtomic(
  lobbyId: string,
  playerId: string,
  code: string,
) {
  if (!lobbyId || !playerId || !code) {
    throw new Error(
      "missing required data to handle playerLeave; lobbyId | playerId | code",
    );
  }
  const client = await connect();
  try {
    await client.query("BEGIN");
    const gameStatus = await getGameStatus(lobbyId, client);
    const lobby = await getLobbyByCode(code, client);
    if (!lobby) throw new Error("Lobby not found");
    const playerToLeave = await exitPlayer(playerId, lobby.id, client);
    const playerCount = await countLobbyPlayers(lobby.id, client);
    if (playerCount === 0) {
      await deleteLobby(lobby.id, client);
      await client.query("COMMIT");
      return { playerToLeave, gameStatus, newHost: null, aborted: false };
    }
    let newHost = null;
    if (playerToLeave?.isHost) {
      newHost = await reassignHost(lobbyId, client);
    }
    let aborted = false;
    if (
      gameStatus === GameStatus.started ||
      gameStatus === GameStatus.voting ||
      gameStatus === GameStatus.voted
    ) {
      await resetLobbyVotingRound(lobbyId, client);
      await changeGameStatus(lobbyId, GameStatus.idle, client);
      aborted = true;
    }

    await client.query("COMMIT");
    return { playerToLeave, gameStatus, newHost, aborted };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
