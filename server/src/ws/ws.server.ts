import WebSocket, { WebSocketServer } from "ws";
import { server } from "../main";
import { GameManager } from "../services/gameManager";
import {
  ClientInfo,
  ClientToServerSchema,
  ServerToClient,
} from "../schemas/gameSchema";
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

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }: { origin?: string }) => {
    const allowed = ["http://localhost:5173"];
    if (!allowed.includes(origin?.toLowerCase() ?? "")) {
      console.log(`Rejected unauthorized origin: ${origin}`);
      return false;
    }
    return true;
  },
  maxPayload: 1024 * 24,
});

wss.on("connection", (ws, req) => {
  console.log("connected to ws successfully");
  const clientId = crypto.randomUUID();
  socketToClient.set(ws, { clientId });

  ws.on("error", (err) => {
    console.error("ws error", err);
  });

  ws.on("message", async function message(data, isBinary) {
    console.log("received: %s", data);
    let raw = parseWsMessage(data);
    if (!raw.ok) {
      sendError(ws, raw.error);
      return;
    }

    const parsed = ClientToServerSchema.safeParse(raw.value);
    if (!parsed.success) {
      console.log("schema parse failed:", parsed.error.issues);
      return;
    }

    let clientInfo: ClientInfo = socketToClient.get(ws) ?? { clientId };

    try {
      switch (parsed.data.type) {
        case "joinLobby": {
          console.log(
            "lobbyId value:",
            parsed.data.msg.lobbyId,
            "type:",
            typeof parsed.data.msg.lobbyId,
          );
          console.log(
            "current lobbyToSockets keys:",
            [...lobbyToSockets.keys()].map((k) => `${k} (${typeof k})`),
          );
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
            // respond to everyone that vote has started
            if (clientInfo.lobbyId)
              broadCastToLobby(clientInfo.lobbyId, {
                type: "voteState",
                msg: "start",
              });
          }
          break;
        }

        case "leaveLobby": {
          clientInfo = addToClientInfo(
            ws,
            { code: parsed.data.msg.code },
            clientId,
          );
          if (!clientInfo.lobbyId || !clientInfo.playerId) {
            sendError(ws, "missing required info");
            break;
          }
          if (typeof clientInfo.code !== "string") break;
          try {
            await GameManager.leaveLobby({
              code: clientInfo.code,
              playerId: clientInfo.playerId,
            });
            removeSocketFromLobby(clientInfo.lobbyId, ws);
            socketToClient.delete(ws);
          } catch (err) {
            sendError(ws, "leaving lobby failed");
            break;
          }
          broadCastToLobby(clientInfo.lobbyId, {
            type: "playerLeft",
            msg: {
              lobbyId: clientInfo.lobbyId,
              playerId: clientInfo.playerId,
              name: clientInfo.name,
            },
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

          const lobby = await GameManager.getLobby(lobbyId);
          const allVoted = await GameManager.haveAllPlayersVoted(
            lobbyId,
            lobby.votingRound,
          );

          console.log(
            `we are here, lobby is${lobby}, and all voted is: ${allVoted}`,
          );

          if (allVoted) {
            const results = await GameManager.countVotes(lobbyId);
            broadCastToLobby(lobbyId, {
              type: "votesCounted",
              msg: { lobbyId, votes: results },
            });

            await GameManager.incrementVotingRound(lobbyId);
            const numOfPlayersLeft =
              await GameManager.playersLeftInGame(lobbyId);

            console.log(`num of players left is ${numOfPlayersLeft}`);
            console.table(results);
            const top = results[0];
            const second = results[1];
            const hasMajority =
              top && (!second || +top.voteCount > +second.voteCount);
            console.log();

            console.log(
              `top is ${top.name}, second is ${second.name}, hasMajority is ${hasMajority}`,
            );

            if (hasMajority) {
              await GameManager.playerVotedOut(top.id, lobbyId);

              const numOfPlayersLeft =
                await GameManager.playersLeftInGame(lobbyId);
              if (top.isImposter) {
                broadCastToLobby(lobbyId, {
                  type: "gameOver",
                  msg: {
                    lastPlayerToBeVotedOutId: top.id,
                    lobbyId,
                    winner: "allies",
                  },
                });
                await GameManager.resetLobbyVotingRound(lobbyId);
                break;
              } else {
                if (numOfPlayersLeft < 3) {
                  const winner = top.isImposter ? "allies" : "imposter";
                  broadCastToLobby(lobbyId, {
                    type: "gameOver",
                    msg: { lastPlayerToBeVotedOutId: top.id, lobbyId, winner },
                  });
                  await GameManager.resetLobbyVotingRound(lobbyId);
                  break;
                } else {
                  broadCastToLobby(lobbyId, {
                    type: "playerVotedOut",
                    msg: { playerId: top.id, isImposter: top.isImposter },
                  });
                  break;
                }
              }
            } else {
              broadCastToLobby(lobbyId, {
                type: "nobodyVotedOut",
                msg: { lobbyId },
              });
              break;
            }
          } else {
            broadCastToLobby(lobbyId, {
              type: "playerVoted",
              msg: { playerId, targetId },
            });
          }
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
          const players = await GameManager.getAllPlayers(clientInfo.lobbyId);
          if (!players || players.length === 0) {
            sendError(ws, "players array is empty");
            break;
          }
          try {
            await GameManager.startGame(clientInfo.lobbyId, clientInfo.options);
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
                      },
                    }),
                  );
                }
              }
            }
          } catch (err) {
            sendError(ws, "start_game_failed");
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
          let set: Set<WebSocket> = new Set();
          set.add(ws);
          lobbyToSockets.set(clientInfo.lobbyId, set);
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
    const clientInfo = socketToClient.get(ws);
    socketToClient.delete(ws);

    if (clientInfo?.lobbyId) {
      const set = lobbyToSockets.get(clientInfo.lobbyId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          lobbyToSockets.delete(clientInfo.lobbyId);
        }
      }
    }

    if (clientInfo?.code && clientInfo?.playerId && clientInfo?.lobbyId) {
      const player = await GameManager.getPlayerInLobby(
        clientInfo.lobbyId,
        clientInfo.playerId,
      );
      if (!player) return;

      try {
        await GameManager.leaveLobby({
          code: clientInfo.code,
          playerId: clientInfo.playerId,
        });
      } catch (err) {
        console.error("Failed to remove player from lobby on disconnect:", err);
      } finally {
        broadCastToLobby(clientInfo.lobbyId, {
          type: "playerLeft",
          msg: { playerId: clientInfo.playerId },
        });
      }
    }

    console.log("Client disconnected");
  });
});
