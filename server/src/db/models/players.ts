import { pool } from "../index";

// enter a new player into a lobby returns entire row
export async function enterPlayer(name: string, lobbyId: string) {
  const result = await pool.query(
    `
        INSERT INTO players (name, lobby_id)
        VALUES($1, $2) RETURNING *
        `,
    [name, lobbyId]
  );
  return result.rows[0];
}

export async function votePlayer(
  playerId: string,
  playerToVoteId: string,
  lobbyId: string
) {
  // get voting round from lobby
  let voting_round = getRoundFromLobby(lobbyId);

  const result = await pool.query(
    `INSERT INTO votes (player_id, voted_for_player_id, lobby_id, voting_round)
   VALUES ($1, $2, $3, $4)`,
    [playerId, playerToVoteId, lobbyId, voting_round]
  );

  return result.rows[0];
}

export async function countVotes(lobbyId: string) {
  // count votes for current round in lobby
  let voting_round = getRoundFromLobby(lobbyId);

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
    [lobbyId, voting_round]
  );

  return rows; // first one has the most vote but check if imposter
}

export async function checkIfAllPlayersVoted(
  lobbyId: string,
  currentRound: number
) {
  const { rows } = await pool.query(
    `
    SELECT
    (SELECT COUNT(*) FROM players WHERE lobby_id=$1) as total_players,
    (SELECT COUNT(DISTINCT player_id) FROM votes
     WHERE lobby_id=$1 AND voting_round=$2) AS votes_cast
    `,
    [lobbyId, currentRound]
  );

  const { total_players, votes_cast } = rows[0];

  return total_players === votes_cast ? true : false;
}
// player votes for player
export async function getRoundFromLobby(lobbyId: string) {
  const result = await pool.query(
    `
    SELECT voting_round FROM LOBBIES WHERE lobby_id=$1
  `,
    [lobbyId]
  );

  return result.rows[0];
}

export async function getAllPlayersInLobby(lobbyId: string) {
  const result = await pool.query(
    `
    SELECT * from players,
    WHERE lobby_id=$1
    `,
    [lobbyId]
  );
  return result.rows[0];
}
