import WebSocket, { WebSocketServer } from "ws";
import { server } from "../main";

import { GameManager } from "../services/gameManager";
import {
  ClientInfo,
  ClientToServerSchema,
  GameStatus,
  Lobby,
  Player,
} from "shared-types";
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

import jwt from "jsonwebtoken";
import { castVoteAtomic } from "../db/models/lobbies";

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
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
      return;
    }

    let clientInfo: ClientInfo = socketToClient.get(ws) ?? { clientId };

    try {
      switch (parsed.data.type) {
        case "auth": {
          let token = parsed.data.msg.token;
          if (token) {
            try {
              const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
                player: Player;
                lobby: Lobby;
              };
              const { player, lobby } = payload;

              const isActive = await GameManager.isLobbyActive(lobby.id);
              if (!isActive) {
                return;
              }

              const existing = disconnectTimers.get(player.id);
              if (existing) {
                clearTimeout(existing);
                disconnectTimers.delete(player.id);
              }

              addToClientInfo(
                ws,
                {
                  playerId: player.id,
                  lobbyId: lobby.id,
                  name: player.name,
                  code: lobby.code,
                  clientId,
                },
                clientId,
              );

              const freshPlayer = await GameManager.getPlayerInLobby(
                lobby.id,
                player.id,
              );

              const freshLobby = await GameManager.getLobby(lobby.id);
              const players = await GameManager.getAllPlayers(lobby.id);

              let gameStatus = await GameManager.getGameStatus(freshLobby.id);
              const votes = await GameManager.countVotes(freshLobby.id);
              const playerThatIsReconnectingVotes = votes.find(
                (x) => x.id === freshPlayer.id,
              );

              if (
                gameStatus === GameStatus.voting ||
                gameStatus === GameStatus.voted
              ) {
                broadCastToLobby(lobby.id, {
                  type: "playerReconnected",
                  msg: {
                    player: {
                      id: freshPlayer.id,
                      lobbyId: freshPlayer.lobbyId,
                      name: freshPlayer.name,
                      isHost: freshPlayer.isHost ?? false,
                      assignedWord: null,
                      isImposter: false,
                      votes: Number(
                        playerThatIsReconnectingVotes?.voteCount || 0,
                      ),
                      votedOut: freshPlayer.votedOut ?? false,
                    },
                    gameStatus: gameStatus ?? null,
                  },
                });
              }

              addSocketToLobby(lobby.id, ws);

              //

              ws.send(
                JSON.stringify({
                  type: "reconnected",
                  msg: {
                    player: {
                      id: freshPlayer.id,
                      name: freshPlayer.name,
                      isHost: freshPlayer.isHost ?? false,
                      assignedWord: freshPlayer.assignedWord,
                      isImposter: freshPlayer.isImposter,
                      votes: freshPlayer.votes ?? 0,
                      votedOut: freshPlayer.votedOut,
                    },
                    lobby: {
                      ...freshLobby,
                      wordPairId: freshLobby.wordPairId,
                    },
                    players: players.map((x) => ({
                      ...x,
                      assignedWord: x.id === player.id ? x.assignedWord : null,
                      isImposter: x.id === player.id ? x.isImposter : false,
                      isHost: x.isHost ?? false,
                      votes: x.votes ?? 0,
                      votedOut: x.votedOut ?? false,
                    })),
                    gameStatus: gameStatus ?? null,
                  },
                }),
              );
            } catch (err) {
              console.log(err);
              return; // there is no user data, so no need to reconnect, just move forward
            }
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
          }
          break;
        }

        case "leaveLobby": {
          if (!clientInfo.lobbyId || !clientInfo.playerId) {
            sendError(ws, "missing required info");
            break;
          }

          const lobby = await GameManager.getLobby(clientInfo.lobbyId);
          try {
            let gameStatus = await GameManager.getGameStatus(
              clientInfo.lobbyId,
            );

            const playerToLeave = await GameManager.leaveLobby({
              code: lobby.code,
              playerId: clientInfo.playerId,
            });
            if (!playerToLeave) break;
            removeSocketFromLobby(clientInfo.lobbyId, ws);
            if (playerToLeave.isHost) {
              const remainingCount = await GameManager.countLobbyPlayers(
                clientInfo.lobbyId,
              );
              if (remainingCount > 0) {
                const newHost = await GameManager.reassignHost(
                  clientInfo.lobbyId,
                );
                if (newHost) {
                  broadCastToLobby(clientInfo.lobbyId, {
                    type: "hostReassigned",
                    msg: { playerId: newHost.id, name: newHost.name },
                  });
                }
              }
            }
            if (
              gameStatus === GameStatus.started ||
              gameStatus === GameStatus.idle ||
              gameStatus === GameStatus.voting ||
              gameStatus === GameStatus.voted
            ) {
              await GameManager.resetLobbyVotingRound(clientInfo.lobbyId);
              await GameManager.setGameStatus(
                clientInfo.lobbyId,
                GameStatus.idle,
              );

              broadCastToLobby(clientInfo.lobbyId, {
                type: "gameAborted",
                msg: {
                  lobbyId: clientInfo.lobbyId,
                  reason: `${clientInfo.name} left the game`,
                },
              });
            }
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
          let targetId = parsed.data.msg.targetId;
          if (!clientInfo.lobbyId) {
            sendError(ws, "missing lobby id");
            break;
          }
          const { lobbyId, playerId } = clientInfo;
          if (!lobbyId || !playerId || !targetId) {
            sendError(ws, "info required to cast action is missing");
            break;
          }
          const currentStatus = await GameManager.getGameStatus(lobbyId);
          if (currentStatus !== GameStatus.voting) {
            sendError(ws, "voting is not active");
            break;
          }
          const voter = await GameManager.getPlayerInLobby(lobbyId, playerId);
          if (voter.votedOut) {
            sendError(ws, "you_have_been_voted_out");
            break;
          }
          try {
            const { allVoted, results } = await castVoteAtomic(
              lobbyId,
              playerId,
              targetId,
            );

            if (allVoted) {
              broadCastToLobby(lobbyId, {
                type: "votesCounted",
                msg: { lobbyId, votes: results, gameStatus: GameStatus.voted },
              });

              const top = results[0];
              const second = results[1];
              const hasMajority =
                top && (!second || +top.voteCount > +second.voteCount);

              if (hasMajority) {
                let playerVotedOut = await GameManager.playerVotedOut(
                  lobbyId,
                  top.id,
                );
                const numOfPlayersLeft =
                  await GameManager.playersLeftInGame(lobbyId);

                if (top.isImposter) {
                  const remainingImposters =
                    await GameManager.getRemainingImposters(lobbyId);

                  if (remainingImposters === 0) {
                    await GameManager.setGameStatus(
                      lobbyId,
                      GameStatus.gameOver,
                    );
                    broadCastToLobby(lobbyId, {
                      type: "gameOver",
                      msg: {
                        lastPlayerToBeVotedOutId: top.id,
                        lobbyId,
                        winner: "allies",
                        name: playerVotedOut.name,
                        gameStatus: GameStatus.gameOver,
                      },
                    });
                    await GameManager.resetLobbyVotingRound(lobbyId);
                  } else {
                    if (numOfPlayersLeft < 3) {
                      await GameManager.setGameStatus(
                        lobbyId,
                        GameStatus.gameOver,
                      );
                      broadCastToLobby(lobbyId, {
                        type: "gameOver",
                        msg: {
                          lastPlayerToBeVotedOutId: top.id,
                          lobbyId,
                          winner: "imposter",
                          name: playerVotedOut.name,
                          gameStatus: GameStatus.gameOver,
                        },
                      });
                      await GameManager.resetLobbyVotingRound(lobbyId);
                      break;
                    } else {
                      await GameManager.setGameStatus(lobbyId, GameStatus.idle);
                      await GameManager.incrementVotingRound(lobbyId);
                      broadCastToLobby(lobbyId, {
                        type: "playerVotedOut",
                        msg: {
                          playerId: top.id,
                          isImposter: top.isImposter,
                        },
                      });
                      break;
                    }
                  }
                } else {
                  if (numOfPlayersLeft < 3) {
                    await GameManager.setGameStatus(
                      lobbyId,
                      GameStatus.gameOver,
                    );
                    broadCastToLobby(lobbyId, {
                      type: "gameOver",
                      msg: {
                        lastPlayerToBeVotedOutId: top.id,
                        lobbyId,
                        winner: "imposter",
                        name: playerVotedOut.name,
                        gameStatus: GameStatus.gameOver,
                      },
                    });
                    await GameManager.resetLobbyVotingRound(lobbyId);
                  } else {
                    await GameManager.setGameStatus(lobbyId, GameStatus.idle);
                    await GameManager.incrementVotingRound(lobbyId);
                    broadCastToLobby(lobbyId, {
                      type: "playerVotedOut",
                      msg: { playerId: top.id, isImposter: false },
                    });
                  }
                }
              } else {
                await GameManager.incrementVotingRound(lobbyId);
                await GameManager.setGameStatus(lobbyId, GameStatus.idle);
                broadCastToLobby(lobbyId, {
                  type: "nobodyVotedOut",
                  msg: { lobbyId },
                });
                break;
              }
            } else {
              broadCastToLobby(lobbyId, {
                type: "playerVoted",
                msg: { playerId, targetId, name: clientInfo.name },
              });
            }
          } catch (err) {
            sendError(ws, "vote_cast_failed");
            break;
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
      const timer = setTimeout(async () => {
        try {
          if (clientInfo.lobbyId) {
            const gameStatus = await GameManager.getGameStatus(
              clientInfo.lobbyId,
            );

            broadCastToLobby(clientInfo.lobbyId, {
              type: "playerLeft",
              msg: { playerId: clientInfo.playerId, name: clientInfo.name },
            });
            const playerToLeave = await GameManager.leaveLobby({
              code: clientInfo.code!,
              playerId: clientInfo.playerId!,
            });

            if (playerToLeave?.isHost) {
              const remainingCount = await GameManager.countLobbyPlayers(
                clientInfo.lobbyId,
              );
              if (remainingCount > 0) {
                const newHost = await GameManager.reassignHost(
                  clientInfo.lobbyId,
                );
                if (newHost) {
                  broadCastToLobby(clientInfo.lobbyId, {
                    type: "hostReassigned",
                    msg: { playerId: newHost.id, name: newHost.name },
                  });
                }
              }
            }
            if (
              gameStatus === GameStatus.started ||
              gameStatus === GameStatus.idle ||
              gameStatus === GameStatus.voting ||
              gameStatus === GameStatus.voted
            ) {
              await GameManager.resetLobbyVotingRound(clientInfo.lobbyId);
              await GameManager.setGameStatus(
                clientInfo.lobbyId,
                GameStatus.idle,
              );

              broadCastToLobby(clientInfo.lobbyId, {
                type: "gameAborted",
                msg: {
                  lobbyId: clientInfo.lobbyId,
                  reason: `${clientInfo.name} left the game`,
                },
              });
            }
          }
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
