import WebSocket, { RawData } from "ws";
import {
  ClientInfo,
  ClientToServer,
  GameStatus,
  ServerToClient,
} from "shared-types";
import { GameManager } from "../services/gameManager";
import jwt from "jsonwebtoken";

import { castVoteAtomic, resolveVoteAtomic } from "../db/models/lobbies";
import { playerLeaveAtomic } from "../db/models/players";
export const disconnectTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();

export const socketToClient = new WeakMap<WebSocket, ClientInfo>();
export const lobbyToSockets = new Map<string, Set<WebSocket>>();
export function addSocketToLobby(lobbyId: string, ws: WebSocket) {
  if (!lobbyId || !ws) return;

  let set = lobbyToSockets.get(lobbyId);

  if (!set) {
    set = new Set<WebSocket>();
    lobbyToSockets.set(lobbyId, set);
  }

  set.add(ws);
}

export const removeSocketFromLobby = (lobbyId: string, ws: WebSocket) => {
  if (!lobbyId || !ws) return;
  let set = lobbyToSockets.get(lobbyId);
  if (!set) return;
  set.delete(ws);

  if (!set || set.size === 0) {
    lobbyToSockets.delete(lobbyId);
  }
};

export const broadCastToLobby = (
  lobbyId: string,
  msg: ServerToClient | ClientToServer,
) => {
  let allSockets = lobbyToSockets.get(lobbyId);

  let stringifiedMsg = JSON.stringify(msg);

  allSockets?.forEach((x) => {
    if (x.readyState === WebSocket.OPEN) {
      x.send(stringifiedMsg);
    }
  });
};
export const addToClientInfo = (
  ws: WebSocket,
  others: Partial<ClientInfo>,
  clientId: string,
) => {
  const prev = socketToClient.get(ws) ?? { clientId };
  const merged: ClientInfo = { ...prev, ...others, clientId: prev.clientId };
  socketToClient.set(ws, merged);
  return merged;
};

export const parseWsMessage = (
  data: RawData,
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

export const sendError = (ws: WebSocket, msg: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "error", msg }));
  }
};

export async function handlePlayerLeave(clientInfo: ClientInfo) {
  if (!clientInfo.lobbyId || !clientInfo.playerId || !clientInfo.code) return;
  const { lobbyId, playerId, code } = clientInfo;
  const { playerToLeave, gameStatus, newHost, aborted } =
    await playerLeaveAtomic(lobbyId, playerId, code);
  if (!playerToLeave) return;

  broadCastToLobby(clientInfo.lobbyId, {
    type: "playerLeft",
    msg: {
      lobbyId: playerToLeave.lobbyId,
      playerId: playerToLeave.id,
      name: playerToLeave.name,
    },
  });

  if (newHost) {
    broadCastToLobby(clientInfo.lobbyId, {
      type: "hostReassigned",
      msg: { playerId: newHost.id, name: newHost.name },
    });
  }

  if (aborted) {
    broadCastToLobby(clientInfo.lobbyId, {
      type: "gameAborted",
      msg: {
        lobbyId: clientInfo.lobbyId,
        reason: `${clientInfo.name} left the game`,
      },
    });

    const remainingSockets = lobbyToSockets.get(clientInfo.lobbyId);
    if (remainingSockets) {
      for (const s of remainingSockets) {
        const info = socketToClient.get(s);
        if (info?.playerId) {
          broadCastToLobby(clientInfo.lobbyId, {
            type: "playerBackInLobby",
            msg: { playerId: info.playerId },
          });
        }
      }
    }
  }
}

export async function authHandler(
  token: string,
  ws: WebSocket,
  clientId: string,
) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      playerId: string;
      lobbyId: string;
      code: string;
    };
    const { playerId, lobbyId, code } = payload;

    const isActive = await GameManager.isLobbyActive(lobbyId);
    if (!isActive) {
      return;
    }

    const existing = disconnectTimers.get(playerId);
    if (existing) {
      clearTimeout(existing);
      disconnectTimers.delete(playerId);
    }

    const freshPlayer = await GameManager.getPlayerInLobby(lobbyId, playerId);

    addToClientInfo(
      ws,
      {
        playerId: playerId,
        lobbyId: lobbyId,
        name: freshPlayer.name,
        code: code,
        clientId,
      },
      clientId,
    );

    const freshLobby = await GameManager.getLobby(lobbyId);
    const players = await GameManager.getAllPlayers(lobbyId);

    let gameStatus = await GameManager.getGameStatus(freshLobby.id);
    const votes = await GameManager.countVotes(freshLobby.id);
    const playerThatIsReconnectingVotes = votes.find(
      (x) => x.id === freshPlayer.id,
    );

    if (gameStatus === GameStatus.voting || gameStatus === GameStatus.voted) {
      broadCastToLobby(lobbyId, {
        type: "playerReconnected",
        msg: {
          player: {
            id: freshPlayer.id,
            lobbyId: freshPlayer.lobbyId,
            name: freshPlayer.name,
            isHost: freshPlayer.isHost ?? false,
            assignedWord: null,
            isImposter: false,
            votes: Number(playerThatIsReconnectingVotes?.voteCount || 0),
            votedOut: freshPlayer.votedOut ?? false,
          },
          gameStatus: gameStatus ?? null,
        },
      });
    }

    addSocketToLobby(lobbyId, ws);

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
            assignedWord: x.id === playerId ? x.assignedWord : null,
            isImposter: x.id === playerId ? x.isImposter : false,
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
export async function votePlayerHandler(
  clientInfo: ClientInfo,
  ws: WebSocket,
  targetId: string,
) {
  let { lobbyId, playerId } = clientInfo;
  if (!lobbyId || !playerId || !targetId) {
    return sendError(ws, "info required to cast action is missing");
  }
  const currentStatus = await GameManager.getGameStatus(lobbyId);
  if (currentStatus !== GameStatus.voting) {
    return sendError(ws, "voting is not active");
  }
  const voter = await GameManager.getPlayerInLobby(lobbyId, playerId);
  if (voter?.votedOut) {
    return sendError(ws, "you_have_been_voted_out");
  }
  try {
    const { allVoted, results } = await castVoteAtomic(
      lobbyId,
      playerId,
      targetId,
    );

    if (!allVoted) {
      return broadCastToLobby(lobbyId, {
        type: "playerVoted",
        msg: { playerId, targetId, name: clientInfo.name },
      });
    }

    broadCastToLobby(lobbyId, {
      type: "votesCounted",
      msg: { lobbyId, votes: results, gameStatus: GameStatus.voted },
    });

    const top = results[0];
    const second = results[1];
    const hasMajority = top && (!second || +top.voteCount > +second.voteCount);
    if (!hasMajority) {
      await GameManager.incrementVotingRound(lobbyId);
      await GameManager.setGameStatus(lobbyId, GameStatus.idle);
      return broadCastToLobby(lobbyId, {
        type: "nobodyVotedOut",
        msg: { lobbyId },
      });
    }

    const { playerVotedOut, numOfPlayersLeft, remainingImposters } =
      await resolveVoteAtomic(lobbyId, top.id);

    if (remainingImposters === 0) {
      await GameManager.setGameStatus(lobbyId, GameStatus.gameOver);
      broadCastToLobby(lobbyId, {
        type: "gameOver",
        msg: {
          lastPlayerToBeVotedOutId: playerVotedOut.id,
          lobbyId,
          winner: "allies",
          name: playerVotedOut.name,
          gameStatus: GameStatus.gameOver,
        },
      });
      await GameManager.resetLobbyVotingRound(lobbyId);
      return;
    }
    if (remainingImposters >= numOfPlayersLeft - remainingImposters) {
      await GameManager.setGameStatus(lobbyId, GameStatus.gameOver);
      broadCastToLobby(lobbyId, {
        type: "gameOver",
        msg: {
          lastPlayerToBeVotedOutId: playerVotedOut.id,
          lobbyId,
          winner: "imposter",
          name: playerVotedOut.name,
          gameStatus: GameStatus.gameOver,
        },
      });
      await GameManager.resetLobbyVotingRound(lobbyId);
      return;
    } else {
      await GameManager.setGameStatus(lobbyId, GameStatus.idle);
      await GameManager.incrementVotingRound(lobbyId);
      broadCastToLobby(lobbyId, {
        type: "playerVotedOut",
        msg: {
          playerId: playerVotedOut.id,
          isImposter: playerVotedOut.isImposter,
        },
      });
      return;
    }
  } catch (err) {
    sendError(ws, "vote_cast_failed");
  }
}
