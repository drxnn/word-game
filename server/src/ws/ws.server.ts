import WebSocket, { WebSocketServer } from "ws";
import { server } from "../main";

import { GameManager } from "../services/gameManager";
import { ClientInfo } from "../schemas/gameSchema";

const socketToClient = new Map<WebSocket, ClientInfo>();
const lobbyToSockets = new Map<string, Set<WebSocket>>();

export type ServerEvent =
  | "lobbyCreated"
  | "playerJoined"
  | "playerLeft"
  | "playerVoted"
  | "playerVotedOut"
  | "roundEnded"
  | "gameStarted"
  | "stateSync"
  | "error";

export type ClientEvent =
  | "createLobby"
  | "joinLobby"
  | "leaveLobby"
  | "votePlayer"
  | "startGame";

type ServerToClient = {
  type: ServerEvent;
  msg: ClientInfo;
};
type ClientToServer = {
  type: ClientEvent;
  msg: ClientInfo;
};

const wss = new WebSocketServer({ server });
// client will send a post request first to join lobby, lobby will respond with lobbyId, playerId and a generated code for the ws,
// assume that client is sending you this info: {lobbyId, playerId,}
// data sent to ws, should have a type: joinLobby | createLoby

wss.on("connection", (ws, req) => {
  // add authentication later, have the db create a wsToken when a player creates a lobby or joins a lobby
  ws.on("error", console.error);

  const clientId = crypto.randomUUID();

  ws.on("error", (err) => {
    console.error("ws error", err);
  });

  ws.on("message", async function message(data) {
    console.log("received: %s", data);

    let stringified = typeof data === "string" ? data : data.toString();
    let parsedData = JSON.parse(stringified);
    // check what data is first and handle cases

    let clientInfo: ClientInfo = {
      clientId,
      name: parsedData.name,
      targetId: parsedData.targetId,
      lobbyId: parsedData.lobbyId,
      playerId: parsedData.playerId,
      code: parsedData.code,
    };

    // so this data has come from the client after joining a lobby, now I need to broadcast it to everyone that this happend

    switch (parsedData.type) {
      case "joinLobby": {
        let set = lobbyToSockets.get(clientInfo.lobbyId);
        if (!set) return; // shouldnt happen
        set.add(ws);

        // the database state has already been changed in this case by the route handler
        broadCastToLobby(clientInfo.lobbyId, {
          type: "playerJoined",
          msg: clientInfo, // so everyone connected receives the new player
        });

        break;
      }
      case "leaveLobby": {
        let set = lobbyToSockets.get(clientInfo.lobbyId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) lobbyToSockets.delete(clientInfo.lobbyId);
        }

        socketToClient.delete(ws);

        // here the db state should be handled here
        if (typeof clientInfo.code !== "string") return;

        await GameManager.leaveLobby({
          code: clientInfo.code,
          playerId: clientInfo.playerId,
        });
        broadCastToLobby(clientInfo.lobbyId, {
          type: "playerLeft",
          msg: clientInfo, // so everyone connected receives the player to be removed
        });
        break;
      }
      case "votePlayer": {
        let set = lobbyToSockets.get(clientInfo.lobbyId);
        if (set?.size === 0) {
          return;
        }
        parsedData;

        const { lobbyId, playerId, targetId } = clientInfo;
        if (!lobbyId || !playerId || !targetId) return;
        await GameManager.castVote(lobbyId, playerId, targetId);
      }
      case "startGame": {
      }
      case "createLobby": {
        // unfinished here
        let set: Set<WebSocket> = new Set();
        set.add(ws);
      }
    }
  });

  ws.on("close", () => {
    const clientInfo = socketToClient.get(ws);
    if (!clientInfo) return;
    lobbyToSockets.get(clientInfo.lobbyId)?.delete(ws);

    broadCastToLobby(clientInfo.lobbyId, {
      type: "playerLeft",
      msg: clientInfo,
    });
  });
  console.log("Client disconnected");
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

  if (set.size === 0) {
    lobbyToSockets.delete(lobbyId);
  }
}

export function broadCastToLobby(lobbyId: string, msg: any) {
  let allSockets = lobbyToSockets.get(lobbyId);
  // make sure msg is stringified json

  allSockets?.forEach((x) => {
    if (x.readyState === WebSocket.OPEN) {
      x.send(msg);
    }
  });
}

/* 
initiate wss server
*/
