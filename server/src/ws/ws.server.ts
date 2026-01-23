import WebSocket, { WebSocketServer } from "ws";
import { server } from "../main";

import { GameManager } from "../services/gameManager";
import { ClientInfo, GameOptions, Player } from "../schemas/gameSchema";

const socketToClient = new WeakMap<WebSocket, ClientInfo>();
const lobbyToSockets = new Map<string, Set<WebSocket>>();

type VotesCountedMsg = { lobbyId: string; votes: Record<string, number> }[];

export type ServerToClientMap = {
  lobbyCreated: { lobbyId: string };
  playerJoined: Pick<ClientInfo, "name" | "playerId">;
  playerLeft: Pick<ClientInfo, "name" | "playerId">;
  playerVoted: Pick<ClientInfo, "name" | "playerId">;
  playerVotedOut: Pick<ClientInfo, "name" | "playerId">;
  startGameInfo: Player[];
  votesCounted: VotesCountedMsg;
  roundEnded: Player[];

  gameStarted: Player[];

  error: string;
};

type ServerToClient = {
  [K in keyof ServerToClientMap]: { type: K; msg: ServerToClientMap[K] };
}[keyof ServerToClientMap];

export type ClientToServerMap = {
  createLobby: { lobbyId: string; name: string; code?: string };
  joinLobby: {
    lobbyId: string;
    playerId: string;
    name?: string;
    code?: string;
  };
  leaveLobby: { lobbyId: string; playerId: string; code?: string };
  votePlayer: { lobbyId: string; playerId: string; targetId: string };
  startGame: { lobbyId: string; options?: GameOptions };
  voteCount: { lobbyId: string };
  resetGame: { lobbyId: string };
};

export type ClientToServer = {
  [K in keyof ClientToServerMap]: { type: K; msg: ClientToServerMap[K] };
}[keyof ClientToServerMap];

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  // add authentication later, have the db create a wsToken when a player creates a lobby or joins a lobby

  const clientId = crypto.randomUUID();
  socketToClient.set(ws, { clientId });

  ws.on("error", (err) => {
    console.error("ws error", err);
  });

  ws.on("message", async function message(data) {
    console.log("received: %s", data);

    if (data === null) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", msg: "data was null" }));
      }
    }
    const res = parseWsMessage(data);
    if (!res.ok) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", msg: res.error }));
      }
      return;
    }
    const parsed = res.value;

    let clientInfo: ClientInfo = {
      clientId,
      name: parsed.name,
      targetId: parsed.targetId,
      lobbyId: parsed.lobbyId,
      playerId: parsed.playerId,
      code: parsed.code,
    };

    clientInfo = addToClientInfo(ws, clientInfo, clientId);
    try {
      switch (parsed.type) {
        case "joinLobby": {
          if (!clientInfo.lobbyId) {
            if (ws.readyState === WebSocket.OPEN)
              ws.send(
                JSON.stringify({ type: "error", msg: "missing_lobbyId" }),
              );
            break;
          }

          addSocketToLobby(clientInfo.lobbyId, ws);

          // the database state has already been changed in this case by the route handler
          broadCastToLobby(clientInfo.lobbyId!, {
            type: "playerJoined",
            msg: clientInfo, // so everyone connected receives the new player
          });

          break;
        }
        case "leaveLobby": {
          if (!clientInfo.lobbyId) break;
          removeSocketFromLobby(clientInfo.lobbyId, ws);

          socketToClient.delete(ws);

          // here the db state should be handled here
          if (typeof clientInfo.code !== "string") return;

          await GameManager.leaveLobby({
            code: clientInfo.code,
            playerId: clientInfo.playerId!,
          });
          broadCastToLobby(clientInfo.lobbyId!, {
            type: "playerLeft",
            msg: clientInfo, // so everyone connected receives the player to be removed
          });
          break;
        }
        case "votePlayer": {
          if (!clientInfo.lobbyId) break;
          let set = lobbyToSockets.get(clientInfo.lobbyId);
          if (set?.size === 0) {
            return;
          }

          const { lobbyId, playerId, targetId } = clientInfo;
          if (!lobbyId || !playerId || !targetId) return;
          await GameManager.castVote(lobbyId, playerId, targetId);

          broadCastToLobby(lobbyId, {
            type: "playerVoted",
            msg: clientInfo,
          });
          break;
        }
        case "startGame": {
          if (!clientInfo.lobbyId) break;
          await GameManager.startGame(
            clientInfo.lobbyId,
            clientInfo.options ?? {},
          );
          // everyone has words assigned to them
          let players = await GameManager.getAllPlayers(clientInfo.lobbyId);
          if (!players) return;

          broadCastToLobby(clientInfo.lobbyId!, {
            type: "startGameInfo",
            msg: players,
          });
          break;
        }
        case "createLobby": {
          if (!clientInfo.lobbyId) {
            if (ws.readyState === WebSocket.OPEN)
              ws.send(
                JSON.stringify({
                  type: "error",
                  msg: "missing_lobbyId_for_create",
                }),
              );
            break;
          }
          // unfinished here
          let set: Set<WebSocket> = new Set();
          set.add(ws);
          lobbyToSockets.set(clientInfo.lobbyId!, set);
          // here Is shouldn't broadcast because only one player is in the lobby?
          break;
        }
        case "voteCount": {
          if (!clientInfo.lobbyId) break;
          let votes = await GameManager.countVotes(clientInfo.lobbyId!);
          if (!votes) break;

          broadCastToLobby(clientInfo.lobbyId!, {
            type: "votesCounted",
            msg: votes,
          });
          break;
        }
        default: {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "error", msg: "unknown_type" }));
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  });

  ws.on("close", () => {
    const clientInfo = socketToClient.get(ws);

    if (!clientInfo) return;
    if (!clientInfo.lobbyId) return;
    socketToClient.delete(ws);
    lobbyToSockets.get(clientInfo.lobbyId!)?.delete(ws);

    broadCastToLobby(clientInfo.lobbyId!, {
      type: "playerLeft",
      msg: clientInfo,
    });
    console.log("Client disconnected");
  });
});

/* helpers, out into wsHelpers.ts later
addSocketToLobby(), removeSocketFromLobby(), broadcastToLobby()
*/

export function addSocketToLobby(lobbyId: string, ws: WebSocket) {
  if (!lobbyId || !ws) return;

  let set = lobbyToSockets.get(lobbyId);

  if (!set) {
    set = new Set<WebSocket>();
    lobbyToSockets.set(lobbyId, set);
  }

  set.add(ws);
}

export function removeSocketFromLobby(lobbyId: string, ws: WebSocket) {
  if (!lobbyId || !ws) return;
  let set = lobbyToSockets.get(lobbyId);
  if (!set) return;
  set.delete(ws);

  if (!set || set.size === 0) {
    lobbyToSockets.delete(lobbyId);
  }
}

export function broadCastToLobby(
  lobbyId: string,
  msg: ServerToClient | ClientToServer,
) {
  let allSockets = lobbyToSockets.get(lobbyId);
  // make sure msg is stringified json
  let stringifiedMsg = JSON.stringify(msg);

  allSockets?.forEach((x) => {
    if (x.readyState === WebSocket.OPEN) {
      x.send(stringifiedMsg);
    }
  });
}
export const addToClientInfo = (
  ws: WebSocket,
  others: Partial<ClientInfo>,
  clientId: string,
) => {
  const prev = socketToClient.get(ws) ?? { clientId };
  const merged: ClientInfo = { ...prev, ...others };
  socketToClient.set(ws, merged);
  return merged;
};

export const parseWsMessage = (
  data: unknown,
): { ok: true; value: any } | { ok: false; error: string } => {
  if (typeof data === "string") {
    try {
      return { ok: true, value: JSON.parse(data) };
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  if (Buffer.isBuffer(data)) {
    try {
      return { ok: true, value: JSON.parse(data.toString("utf8")) };
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  return { ok: false, error: "bad_payload_type" };
};
