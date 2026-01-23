import { Player } from "../../schemas/gameSchema";
import { pool } from "../index";

export async function enterPlayer(name: string, lobbyId: string) {
  if (!name) throw new Error("Name is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await pool.query(
    `
        INSERT INTO players (name, lobby_id)
        VALUES($1, $2) RETURNING *
        `,
    [name, lobbyId],
  );
  return result.rows[0];
}

export async function exitPlayer(player_id: string, lobbyId: string) {
  if (!player_id) throw new Error("Player ID is required");
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await pool.query(
    `
      DELETE FROM players WHERE id = $1 and lobby_id=$2
      RETURNING *
      `,
    [player_id, lobbyId],
  );

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

  let voting_round = await getRoundFromLobby(lobbyId);

  const result = await pool.query(
    `INSERT INTO votes (player_id, voted_for_player_id, lobby_id, voting_round)
   VALUES ($1, $2, $3, $4)
   RETURNING *
   `,
    [playerId, playerToVoteId, lobbyId, voting_round],
  );

  return result.rows[0];
}
export async function assignImposter(lobbyId: string, num: number = 1) {
  const result = await pool.query(
    `
    UPDATE players 
    SET is_imposter = true
    WHERE id = (
     SELECT id FROM players ORDER BY random() LIMIT 1
    )
   RETURNING *
    
    `,
    [lobbyId],
  );

  result.rows[0];
}

export async function countVotes(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  // count votes for current round in lobby
  let voting_round = await getRoundFromLobby(lobbyId);

  const { rows } = await pool.query(
    `
    SELECT 
    p.id,
    p.name,
    p.is_imposter,
    COUNT(v.voted_for_player_id) as vote_count
    FROM players p
    LEFT JOIN votes v ON p.id = v.voted_for_player_id
    AND v.voting_round = $2
    WHERE p.lobby_id=$1
    GROUP BY p.id, p.name, p.is_imposter
    ORDER BY vote_count DESC

    `,
    [lobbyId, voting_round],
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

  const { rows } = await pool.query(
    `
    SELECT
    (SELECT COUNT(*) FROM players WHERE lobby_id=$1) as total_players,
    (SELECT COUNT(DISTINCT player_id) FROM votes
     WHERE lobby_id=$1 AND voting_round=$2) AS votes_cast
    `,
    [lobbyId, currentRound],
  );

  const { total_players, votes_cast } = rows[0];

  return Number(total_players) === Number(votes_cast) ? true : false;
}

// player votes for player
export async function getRoundFromLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await pool.query(
    `
    SELECT voting_round FROM LOBBIES WHERE id=$1
  `,
    [lobbyId],
  );

  return result.rows[0]?.voting_round;
}

export async function getAllPlayersInLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await pool.query(
    `
    SELECT * FROM players
    WHERE lobby_id=$1
    `,
    [lobbyId],
  );
  return result.rows;
}

export async function chooseWordPairId(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  const result = await pool.query(
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

  if (result.rows[0]?.word_pair_id) {
    await pool.query(
      `
      INSERT INTO used_words_per_lobby (lobby_id, word_pair_id)
      VALUES ($1, $2);
      `,
      [lobbyId, result.rows[0].word_pair_id],
    );
  }
  return result.rows[0].word_pair_id;
}

export async function getImposterFromLobby(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  let result = await pool.query(
    `
    SELECT id FROM players 
    WHERE lobby_id = $1 AND is_imposter = true 
    `,
    [lobbyId],
  );

  return result.rows[0]?.id ?? null;
}

export async function assignWordsToPlayers(lobbyId: string) {
  if (!lobbyId) throw new Error("Lobby ID is required");

  // check whos the imposter
  // assign imposter second word in pair, everyone else gets first

  let wordPairId = await chooseWordPairId(lobbyId);
  if (!wordPairId) {
    throw Error("Something went wrong with fetching a word pair!");
  }

  let imposter = await getImposterFromLobby(lobbyId);
  if (!imposter) {
    throw Error("Something went wrong. There is no imposter in the lobby!");
  }
  //
  let { rows } = await pool.query(
    `
    SELECT category, real_word, imposter_word FROM word_pairs WHERE id = $1
    `,
    [wordPairId],
  );

  const { category, real_word, imposter_word } = rows[0];
  if (!rows[0] || !real_word || !imposter_word) {
    throw new Error("Something went wrong, word_pair not found.");
  }

  // assign word
  let result = await pool.query(
    `
   UPDATE players
   SET assigned_word = CASE WHEN NOT is_imposter THEN $1 ELSE $2 END
   WHERE lobby_id = $3
   RETURNING *
    `,
    [real_word, imposter_word, lobbyId],
  );

  return result.rows;
}
