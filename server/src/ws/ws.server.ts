import WebSocket, { WebSocketServer } from "ws";
import { server } from "../main";

import { GameManager } from "../services/gameManager";
import { ClientInfo, ClientToServerSchema, GameStatus } from "shared-types";
import {
  addSocketToLobby,
  addToClientInfo,
  authHandler,
  broadCastToLobby,
  disconnectTimers,
  handlePlayerLeave,
  lobbyToSockets,
  parseWsMessage,
  removeSocketFromLobby,
  sendError,
  socketToClient,
  votePlayerHandler,
} from "./wsHelpers";

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }: { origin?: string }) => {
    const allowed = [
      (process.env.FRONTEND_URL ?? "http://localhost:5173").toLowerCase(),
    ];
    if (!allowed.includes(origin?.toLowerCase() ?? "")) {
      console.log(`Rejected unauthorized origin: ${origin}`);
      return false;
    }
    return true;
  },
  maxPayload: 1024 * 24,
});

wss.on("connection", async (ws, req) => {
  const clientId = crypto.randomUUID();

  let isAlive = true;

  ws.on("pong", () => {
    isAlive = true;
  });

  ws.on("error", (err) => {
    console.error("ws error", err);
  });

  ws.on("message", async function message(data, isBinary) {
    let raw = parseWsMessage(data);
    if (!raw.ok) {
      sendError(ws, raw.error);
      return;
    }

    const parsed = ClientToServerSchema.safeParse(raw.value);
    if (!parsed.success) {
      sendError(ws, "invalid_message_format");
      console.log(
        "Failed message:",
        JSON.stringify(raw.value),
        parsed.error.issues,
      );
      return;
    }

    let clientInfo: ClientInfo = socketToClient.get(ws) ?? { clientId };

    try {
      switch (parsed.data.type) {
        case "auth": {
          let token = parsed.data.msg.token;
          if (token) {
            await authHandler(token, ws, clientId);
          }
          break;
        }
        case "joinLobby": {
          clientInfo = addToClientInfo(
            ws,
            {
              lobbyId: parsed.data.msg.lobbyId,
              name: parsed.data.msg.name,
              playerId: parsed.data.msg.playerId,
              code: parsed.data.msg.code,
            },
            clientId,
          );
          if (!clientInfo.lobbyId) {
            if (ws.readyState === WebSocket.OPEN)
              sendError(ws, "missing lobby id");
            break;
          }
          addSocketToLobby(clientInfo.lobbyId, ws);
          const sockets = lobbyToSockets.get(clientInfo.lobbyId);
          sockets?.forEach((s) => {
            if (s !== ws && s.readyState === WebSocket.OPEN) {
              s.send(
                JSON.stringify({
                  type: "playerJoined",
                  msg: {
                    lobbyId: clientInfo.lobbyId,
                    id: clientInfo.playerId!,
                    name: clientInfo.name,
                  },
                }),
              );
            }
          });
          break;
        }
        case "voteState": {
          const voteState = parsed.data.msg;
          if (voteState === "start") {
            try {
              if (clientInfo.lobbyId) {
                const player = await GameManager.getPlayerInLobby(
                  clientInfo.lobbyId,
                  clientInfo.playerId!,
                );
                if (!player?.isHost) {
                  sendError(ws, "only the host can start voting");
                  break;
                }
                await GameManager.setGameStatus(
                  clientInfo.lobbyId,
                  GameStatus.voting,
                );
                broadCastToLobby(clientInfo.lobbyId, {
                  type: "voteState",
                  msg: "start",
                });
              }
            } catch (err) {
              sendError(ws, "Something went wrong with changing vote state");
            }
          }
          break;
        }

        case "leaveLobby": {
          if (!clientInfo.lobbyId || !clientInfo.playerId) {
            sendError(ws, "missing required info");
            break;
          }

          try {
            await handlePlayerLeave(clientInfo);
            removeSocketFromLobby(clientInfo.lobbyId, ws);
          } catch (err) {
            sendError(ws, "leaving lobby failed");
          }

          break;
        }

        case "votePlayer": {
          let targetId = parsed.data.msg.targetId;
          await votePlayerHandler(clientInfo, ws, targetId);
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

          const senderPlayer = await GameManager.getPlayerInLobby(
            clientInfo.lobbyId,
            clientInfo.playerId!,
          );
          if (!senderPlayer?.isHost) {
            sendError(ws, "only the host can start the game");
            break;
          }
          try {
            await GameManager.startGame(clientInfo.lobbyId, clientInfo.options); // changes game status

            const players = await GameManager.getAllPlayers(clientInfo.lobbyId);

            if (!players || players.length === 0) {
              sendError(ws, "players array is empty");
              break;
            }

            const sockets = lobbyToSockets.get(clientInfo.lobbyId);
            if (sockets) {
              for (const s of sockets) {
                const info = socketToClient.get(s);
                if (!info?.playerId) continue;
                const player = players.find((x) => x.id === info.playerId);
                if (player && s.readyState === WebSocket.OPEN) {
                  s.send(
                    JSON.stringify({
                      type: "playerInfo",
                      msg: {
                        assignedWord: player.assignedWord,
                        isImposter: player.isImposter,
                        name: player.name,
                        isHost: player.isHost ?? false,
                        options: clientInfo.options,
                      },
                    }),
                  );
                }
              }
            }
          } catch (err) {
            console.error("startGame failed:", err);
            sendError(ws, "start_game_failed");
          }
          break;
        }
        case "playerBackInLobby": {
          if (clientInfo.lobbyId) {
            broadCastToLobby(clientInfo.lobbyId, {
              type: "playerBackInLobby",
              msg: { playerId: clientInfo.playerId },
            });
          }
          break;
        }

        case "createLobby": {
          clientInfo = addToClientInfo(
            ws,
            {
              playerId: parsed.data.msg.playerId,
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
          addSocketToLobby(clientInfo.lobbyId, ws);

          break;
        }

        default: {
          sendError(ws, "default error, something went wrong");
          break;
        }
      }
    } catch (err) {
      console.error("Unhandled error in message handler:", err);
      sendError(ws, "internal_server_error");
    }
  });

  ws.on("close", async () => {
    clearInterval(heartbeat);
    const clientInfo = socketToClient.get(ws);
    socketToClient.delete(ws);

    if (clientInfo && clientInfo.playerId) {
      const existing = disconnectTimers.get(clientInfo.playerId);
      if (existing) {
        clearTimeout(existing);
      }
      const timer = setTimeout(async () => {
        try {
          await handlePlayerLeave(clientInfo);
        } catch (err) {
          console.error("disconnect timer failed:", err);
        } finally {
          disconnectTimers.delete(clientInfo.playerId!);
        }
      }, 60000);
      disconnectTimers.set(clientInfo.playerId, timer);
    }
    if (clientInfo?.lobbyId) {
      const set = lobbyToSockets.get(clientInfo.lobbyId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          lobbyToSockets.delete(clientInfo.lobbyId);
        }
      }
    }
  });

  const heartbeat = setInterval(() => {
    if (!isAlive) {
      console.log("client failed heartbeat, closing down");
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 35000);

  if (!socketToClient.get(ws)?.lobbyId) {
    socketToClient.set(ws, { clientId });
  }
});
