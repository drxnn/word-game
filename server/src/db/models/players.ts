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

// player votes for player

export async function votePlayer(playerId: string, lobbyId: string) {
  const result = await pool.query(
    `
    UPDATE players SET votes = votes+1
    WHERE playerId=$1 AND lobbyId=$2
    RETURNING *;
    `,
    [playerId, lobbyId]
  );

  return result.rows[0]; // if null let route handle it
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
