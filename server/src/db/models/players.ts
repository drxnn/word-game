import { Player, PlayerVoteResult } from "shared-types";
import { query } from "../index";

export async function enterPlayer(name: string, lobbyId: string) {
  if (!name) throw new Error("Name is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
    `
        INSERT INTO players (name, lobby_id)
        VALUES($1, $2) RETURNING *
        `,
    [name, lobbyId],
  );
  return result.rows[0];
}

export async function exitPlayer(playerId: string, lobbyId: string) {
  if (!playerId) throw new Error("Player ID is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
    `
      DELETE FROM players WHERE id = $1 and lobby_id=$2
      RETURNING *
      `,
    [playerId, lobbyId],
  );

  return result.rows[0];
}
export async function setIsHost(playerId: string, lobbyId: string) {
  if (!playerId) throw new Error("Player ID is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

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

export async function votePlayer(
  playerId: string,
  playerToVoteId: string,
  lobbyId: string,
) {
  if (!playerId) throw new Error("Player ID is required");
  if (!playerToVoteId) throw new Error("Player to vote ID is required");
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (playerId === playerToVoteId) throw new Error("Cannot vote for yourself");

  let votingRound = await getRoundFromLobby(lobbyId);

  const result = await query(
    `INSERT INTO votes (player_id, voted_for_player_id, lobby_id, voting_round)
   VALUES ($1, $2, $3, $4)
   RETURNING *
   `,
    [playerId, playerToVoteId, lobbyId, votingRound],
  );

  return result.rows[0];
}
export async function assignImposter(lobbyId: string, num: number = 1) {
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
export async function playerVotedOut(lobbyId: string, playerId: string) {
  if (!lobbyId || !playerId)
    throw new Error("Something went wrong, check playerid or lobby id");

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
export async function countVotes(lobbyId: string): Promise<PlayerVoteResult[]> {
  if (!lobbyId) throw new Error("Lobby ID is required");

  let votingRound = await getRoundFromLobby(lobbyId);

  const { rows } = await query(
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

  return rows; // first one has the most vote but check if imposter
}

export async function checkIfAllPlayersVoted(
  lobbyId: string,
  currentRound: number,
) {
  if (!lobbyId) throw new Error("Lobby ID is required");
  if (currentRound === undefined || currentRound === null)
    throw new Error("Current round is required");

  const { rows } = await query(
    `
    SELECT
    (SELECT COUNT(*) FROM players WHERE lobby_id=$1) as total_players,
    (SELECT COUNT(DISTINCT player_id) FROM votes
     WHERE lobby_id=$1 AND voting_round=$2) AS votes_cast
    `,
    [lobbyId, currentRound],
  );

  const { totalPlayers, votesCast } = rows[0];

  return Number(totalPlayers) === Number(votesCast) ? true : false;
}

export async function getRoundFromLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
    `
    SELECT voting_round FROM LOBBIES WHERE id=$1
  `,
    [lobbyId],
  );

  return result.rows[0]?.votingRound;
}

export async function getAllPlayersInLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
    `
    SELECT * FROM players
    WHERE lobby_id=$1
    `,
    [lobbyId],
  );
  return result.rows;
}

export async function getPlayerInLobby(lobbyId: string, playerId: string) {
  const result = await query(
    `
    SELECT * FROM players
    WHERE lobby_id=$1 AND id=$2
    `,
    [lobbyId, playerId],
  );
  return result.rows[0] ?? null;
}

export async function chooseWordPairId(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
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

  if (result.rows[0]?.wordPairId) {
    await query(
      `
      INSERT INTO used_words_per_lobby (lobby_id, word_pair_id)
      VALUES ($1, $2);
      `,
      [lobbyId, result.rows[0].wordPairId],
    );
  }

  return result.rows[0].wordPairId;
}

export async function getImposterFromLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  let result = await query(
    `
    SELECT id FROM players 
    WHERE lobby_id = $1 AND is_imposter = true 
    `,
    [lobbyId],
  );

  return result.rows.map((row) => row.id);
}

export async function playersLeftInGame(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await query(
    `
  SELECT COUNT(*) FROM players WHERE lobby_id = $1 AND voted_out IS NOT TRUE
  `,
    [lobbyId],
  );

  return parseInt(result.rows[0].count, 10);
}

export async function assignWordsToPlayers(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  let wordPairId = await chooseWordPairId(lobbyId);
  if (!wordPairId) {
    throw Error("Something went wrong with fetching a word pair!");
  }

  let imposters = await getImposterFromLobby(lobbyId);
  if (!imposters.length) {
    throw Error("Something went wrong. There is no imposter in the lobby!");
  }
  //

  let { rows } = await query(
    `
    SELECT real_word, imposter_word FROM word_pairs WHERE id = $1
    `,
    [wordPairId],
  );
  if (!rows[0]) throw new Error("Something went wrong, word_pair not found.");

  const { realWord, imposterWord } = rows[0];
  if (!rows[0] || !realWord || !imposterWord) {
    throw new Error("Something went wrong, word_pair not found.");
  }

  let result = await query(
    `
   UPDATE players
   SET assigned_word = CASE WHEN NOT is_imposter THEN $1 ELSE $2 END
   WHERE lobby_id = $3
   RETURNING *
    `,
    [realWord, imposterWord, lobbyId],
  );

  return result.rows;
}
