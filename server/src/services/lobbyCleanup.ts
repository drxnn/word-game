import * as lobbiesModel from "../db/models/lobbies";
import { lobbyToSockets } from "../ws/wsHelpers";

const activeLobbies = new Map<string, number>();

const LOBBY_MAX_AGE = 7200000; // 2h in ms

export function lobbyTracker(lobbyId: string) {
  activeLobbies.set(lobbyId, Date.now());
}

async function cleanStaleLobbies() {
  const now = Date.now();

  for (const [lobbyId, createdAt] of activeLobbies) {
    if (now - createdAt >= LOBBY_MAX_AGE) {
      try {
        await lobbiesModel.deleteLobby(lobbyId);
        activeLobbies.delete(lobbyId);
        const sockets = lobbyToSockets.get(lobbyId);
        if (sockets) {
          const msg = JSON.stringify({
            type: "error",
            msg: "lobby_expired",
          });

          for (const ws of sockets) {
            if (ws.readyState === 1) {
              ws.send(msg);
              ws.close();
            }
          }
          lobbyToSockets.delete(lobbyId);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
}

setInterval(cleanStaleLobbies, LOBBY_MAX_AGE);
