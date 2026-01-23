import WebSocket, { WebSocketServer } from "ws";
import { server } from "../main";

import { GameManager } from "../services/gameManager";
import { ClientInfo, ClientToServerSchema } from "../schemas/gameSchema";

import {
  addSocketToLobby,
  addToClientInfo,
  broadCastToLobby,
  lobbyToSockets,
  parseWsMessage,
  removeSocketFromLobby,
  sendError,
  socketToClient,
} from "./wsHelpers";

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

    let raw = parseWsMessage(data);
    if (!raw.ok) {
      sendError(ws, raw.error);
      return;
    }
    const parsed = ClientToServerSchema.safeParse(raw.value);

    if (!parsed.success) {
      sendError(ws, "data failed parsing");
      return;
    }

    let clientInfo: ClientInfo = socketToClient.get(ws) ?? { clientId };

    try {
      switch (parsed.data.type) {
        case "joinLobby": {
          clientInfo = addToClientInfo(
            ws,
            {
              lobbyId: parsed.data.msg.lobbyId,
              name: parsed.data.msg.name,
              playerId: parsed.data.msg.playerId,
            },
            clientId,
          );

          if (!clientInfo.lobbyId) {
            if (ws.readyState === WebSocket.OPEN)
              sendError(ws, "missing lobby id");
            break;
          }

          addSocketToLobby(clientInfo.lobbyId, ws);

          // the database state has already been changed in this case by the route handler
          broadCastToLobby(clientInfo.lobbyId, {
            type: "playerJoined",
            msg: {
              lobbyId: clientInfo.lobbyId,
              playerId: clientInfo.playerId,
              name: clientInfo.name,
            }, // so everyone connected receives the new player
          });

          break;
        }
        case "leaveLobby": {
          clientInfo = addToClientInfo(
            ws,
            { code: parsed.data.msg.code },
            clientId,
          );
          if (!clientInfo.lobbyId) {
            sendError(ws, "missing lobby Id");
            break;
          }
          removeSocketFromLobby(clientInfo.lobbyId, ws);

          socketToClient.delete(ws);

          // here the db state should be handled here
          if (typeof clientInfo.code !== "string") break;

          try {
            await GameManager.leaveLobby({
              code: clientInfo.code,
              playerId: clientInfo.playerId!,
            });
          } catch (err) {
            sendError(ws, "vote count failed");
            break;
          }

          broadCastToLobby(clientInfo.lobbyId, {
            type: "playerLeft",
            msg: {
              lobbyId: clientInfo.lobbyId,
              playerId: clientInfo.playerId,
              name: clientInfo.name,
            }, // so everyone connected receives the player to be removed
          });
          break;
        }
        case "votePlayer": {
          clientInfo = addToClientInfo(
            ws,
            { targetId: parsed.data.msg.targetId },
            clientId,
          );
          if (!clientInfo.lobbyId) {
            sendError(ws, "missing lobby id");
            break;
          }

          const { lobbyId, playerId, targetId } = clientInfo;
          if (!lobbyId || !playerId || !targetId) {
            sendError(ws, "info required to cast action is missing");
            break;
          }
          try {
            await GameManager.castVote(lobbyId, playerId, targetId);
          } catch (err) {
            sendError(ws, "vote_cast_failed");
            break;
          }

          broadCastToLobby(lobbyId, {
            type: "playerVoted",
            msg: { targetId },
          });
          break;
        }
        case "startGame": {
          clientInfo = addToClientInfo(
            ws,
            { options: parsed.data.msg.options },
            clientId,
          );
          if (!clientInfo.lobbyId) {
            sendError(ws, "lobby id is missing");
            break;
          }

          try {
            await GameManager.startGame(
              clientInfo.lobbyId,
              clientInfo.options ?? {},
            );
            // everyone has words assigned to them
            let players = await GameManager.getAllPlayers(clientInfo.lobbyId);
            if (!players) {
              sendError(ws, "players array is empty");
              break;
            }
            broadCastToLobby(clientInfo.lobbyId, {
              type: "startGameInfo",
              msg: players,
            });
          } catch (err) {
            sendError(ws, "start_game_failed");
          }

          break;
        }
        case "createLobby": {
          clientInfo = addToClientInfo(
            ws,
            {
              lobbyId: parsed.data.msg.lobbyId,
              name: parsed.data.msg.name,
              code: parsed.data.msg.code,
            },
            clientId,
          );
          if (!clientInfo.lobbyId) {
            sendError(ws, "missing_lobbyId_for_create");
            break;
          }

          let set: Set<WebSocket> = new Set();
          set.add(ws);
          lobbyToSockets.set(clientInfo.lobbyId, set);
          // here Is shouldn't broadcast because only one player is in the lobby?
          break;
        }
        case "voteCount": {
          if (!clientInfo.lobbyId) {
            sendError(ws, "missing_lobbyId");
            break;
          }
          let votes = await GameManager.countVotes(clientInfo.lobbyId);
          if (!votes) {
            sendError(ws, "votes array is empty");
            break;
          }

          broadCastToLobby(clientInfo.lobbyId, {
            type: "votesCounted",
            msg: votes,
          });
          break;
        }
        // case "endLobby": {
        //   // host can end lobby or if everyone leaves
        // }
        default:
          {
            sendError(ws, "default error, something went wrong");
          }
          break;
      }
    } catch (err) {
      console.error("Unhandled error in message handler:", err);
      sendError(ws, "internal_server_error");
    }
  });

  ws.on("close", async () => {
    const clientInfo = socketToClient.get(ws);

    if (!clientInfo || !clientInfo.lobbyId) {
      return;
    }

    socketToClient.delete(ws);
    lobbyToSockets.get(clientInfo.lobbyId)?.delete(ws);

    if (clientInfo.code && clientInfo.playerId) {
      try {
        const player = await GameManager.getPlayerInLobby(
          clientInfo.lobbyId,
          clientInfo.playerId,
        );
        if (!player) return; // player has already left the lobby
        await GameManager.leaveLobby({
          code: clientInfo.code,
          playerId: clientInfo.playerId,
        });
      } catch (err) {
        console.log(err);
      }
    }

    broadCastToLobby(clientInfo.lobbyId, {
      type: "playerLeft",
      msg: { playerId: clientInfo.playerId },
    });
    console.log("Client disconnected");
  });
});

/* helpers, out into wsHelpers.ts later
addSocketToLobby(), removeSocketFromLobby(), broadcastToLobby()
*/
