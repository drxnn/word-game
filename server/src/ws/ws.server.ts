import WebSocket, { WebSocketServer } from "ws";
import { server, sessionStore } from "../main";
import { parse as parseCookie } from "cookie";
import { unsign } from "cookie-signature";
import { GameManager } from "../services/gameManager";
import { ClientInfo, ClientToServerSchema, GameStatus } from "shared-types";
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
import { SessionData } from "express-session";

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
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
wss.on("connection", (ws, req) => {
  const clientId = crypto.randomUUID();
  let isAlive = true;

  ws.on("pong", () => {
    console.log("ponged");
    isAlive = true;
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

  const cookie = parseCookie(req.headers.cookie ?? "");
  let session: SessionData | null | undefined;
  let unsigned: string;
  if (cookie) {
    const rawCookie = cookie["connect.sid"];
    if (rawCookie) {
      const raw = decodeURIComponent(rawCookie);
      unsigned = unsign(raw.slice(2), process.env.SESSION_SECRET!) || ""; // empty string is falsy so this works

      if (unsigned && typeof unsigned === "string") {
        sessionStore.get(unsigned, async (err, s) => {
          try {
            if (err) {
              throw err;
            }
            if (!s) {
              console.log("no session found");
              return;
            }
            session = s;
            console.log(" session:", JSON.stringify(session));
            const { player, lobby } = session as any;
            console.log(
              `playerid is ${player.id}, lobbyid is ${lobby.id}\n type of player id: ${typeof player.id}. type of lobbyid: ${typeof lobby.id}`,
            );

            const isActive = await GameManager.isLobbyActive(lobby.id);
            if (!isActive) {
              sessionStore.destroy(unsigned, () => {});
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
                sessionId: unsigned,
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
            if (!freshPlayer || !freshLobby) {
              sessionStore.destroy(unsigned, () => {});
              return;
            }
            console.log(`fresh player is: name: ${freshPlayer.name} 
              id: ${freshPlayer.id}
              lobbyId: ${freshPlayer.lobbyId}
              isHost: ${freshPlayer.isHost}
              assignedWord: ${freshPlayer.assignedWord}
              isImposter: ${freshPlayer.isImposter}
                   name: ${freshPlayer.name}
              `);

            let gameStatus = await GameManager.getGameStatus(freshLobby.id);
            console.log(
              `the game status for player thats reconnecting is: ${gameStatus}`,
            );

            if (
              gameStatus === GameStatus.voting ||
              gameStatus === GameStatus.voted
            ) {
              const votes = await GameManager.countVotes(freshLobby.id);
              console.log(`votes are : ${votes}`);
              const playerThatIsReconnectingVotes = votes.find(
                (x) => x.id === freshPlayer.id,
              );

              broadCastToLobby(lobby.id, {
                type: "playerReconnected",
                msg: {
                  player: {
                    id: freshPlayer.id,
                    lobbyId: freshPlayer.lobbyId,
                    name: freshPlayer.name,
                    isHost: freshPlayer.isHost ?? false,
                    assignedWord: freshPlayer.assignedWord,
                    isImposter: freshPlayer.isImposter,
                    votes:
                      Number(playerThatIsReconnectingVotes?.voteCount) ?? 0,
                  },
                  gameStatus: gameStatus ?? null,
                },
              });
            } else {
              broadCastToLobby(lobby.id, {
                type: "playerReconnected",
                msg: {
                  player: {
                    id: freshPlayer.id,
                    lobbyId: freshPlayer.lobbyId,
                    name: freshPlayer.name,
                    isHost: freshPlayer.isHost ?? false,
                    assignedWord: freshPlayer.assignedWord,
                    isImposter: freshPlayer.isImposter,
                    votes: 0,
                  },
                  gameStatus: gameStatus ?? null,
                },
              });
            }
            // now we add

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
                  },
                  lobby: {
                    ...freshLobby,
                    wordPairId: freshLobby.wordPairId,
                  },
                  players: players.map((x) => ({
                    ...x,
                    assignedWord: x.assignedWord,
                    isHost: x.isHost ?? false,
                    votes: 0,
                  })),
                  gameStatus: gameStatus ?? null,
                },
              }),
            );
          } catch (err) {
            console.log(
              "Reconnection skipped: lobby or player no longer valid",
            );
            sessionStore.destroy(unsigned, () => {});
          }
        });
      }
    }
  }

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
            // respond to everyone that vote has started

            if (clientInfo.lobbyId) {
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

          if (typeof clientInfo.code !== "string") {
            console.log("client code is not a string");
            return;
          }
          try {
            let gameStatus = await GameManager.getGameStatus(
              clientInfo.lobbyId,
            );

            // if player leaves the lobby mid vote, just cancel the round
            if (gameStatus === "VOTING") {
              // just vote them out so players can continue the game without them
              // // but tell the client that player left and wasnt "voted out"
              await GameManager.playerVotedOut(
                clientInfo.lobbyId,
                clientInfo.playerId,
              );
            }
            await GameManager.leaveLobby({
              code: clientInfo.code,
              playerId: clientInfo.playerId,
            });
            removeSocketFromLobby(clientInfo.lobbyId, ws);
          } catch (err) {
            sendError(ws, "leaving lobby failed");
            sessionStore.destroy(unsigned);
            break;
          }

          sessionStore.destroy(unsigned); // erase sess

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
          // use a transaction here later

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
            console.log("we voted ");
            await GameManager.castVote(lobbyId, playerId, targetId);
            console.log("vote worked");
          } catch (err) {
            sendError(ws, "vote_cast_failed");
            break;
          }

          const lobby = await GameManager.getLobby(lobbyId);
          await GameManager.setGameStatus(lobbyId, GameStatus.voting);
          const allVoted = await GameManager.haveAllPlayersVoted(
            lobbyId,
            lobby.votingRound,
          );

          console.log(
            `we are here, lobby is${lobby}, and all voted is: ${allVoted}`,
          );

          if (allVoted) {
            const results = await GameManager.countVotes(lobbyId);
            await GameManager.setGameStatus(lobbyId, GameStatus.voted);
            broadCastToLobby(lobbyId, {
              type: "votesCounted",
              msg: { lobbyId, votes: results, gameStatus: GameStatus.voted },
            });

            await GameManager.playersLeftInGame(lobbyId);

            console.table(results);
            const top = results[0];
            const second = results[1];
            const hasMajority =
              top && (!second || +top.voteCount > +second.voteCount);
            console.log(
              `top is ${top?.name}, second is ${second?.name}, hasMajority is ${hasMajority}`,
            );

            if (hasMajority) {
              let playerVotedOut = await GameManager.playerVotedOut(
                lobbyId,
                top.id,
              );

              console.log(`voted out is :${playerVotedOut.name}`);
              const numOfPlayersLeft =
                await GameManager.playersLeftInGame(lobbyId);
              if (top.isImposter) {
                await GameManager.setGameStatus(lobbyId, GameStatus.gameOver);
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
                break;
              } else {
                if (numOfPlayersLeft < 3) {
                  const winner = top.isImposter ? "allies" : "imposter";
                  await GameManager.setGameStatus(lobbyId, GameStatus.gameOver);
                  broadCastToLobby(lobbyId, {
                    type: "gameOver",
                    msg: {
                      lastPlayerToBeVotedOutId: top.id,
                      lobbyId,
                      winner,
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
                    msg: { playerId: top.id, isImposter: top.isImposter },
                  });
                  break;
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

          try {
            await GameManager.startGame(clientInfo.lobbyId, clientInfo.options); // changes game status
            console.log("we are here after startGame func");
            const players = await GameManager.getAllPlayers(clientInfo.lobbyId);
            console.log("we are here after getAllplasyer func");
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
            if (gameStatus === GameStatus.voting) {
              await GameManager.playerVotedOut(
                clientInfo.lobbyId,
                clientInfo.playerId!,
              );
            }
            broadCastToLobby(clientInfo.lobbyId, {
              type: "playerLeft",
              msg: { playerId: clientInfo.playerId, name: clientInfo.name },
            });
            await GameManager.leaveLobby({
              code: clientInfo.code!,
              playerId: clientInfo.playerId!,
            });
          }
        } catch (err) {
          console.error("disconnect timer failed:", err);
        } finally {
          disconnectTimers.delete(clientInfo.playerId!);
          sessionStore.destroy(unsigned, () => {});
        }
      }, 10000);
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
});
