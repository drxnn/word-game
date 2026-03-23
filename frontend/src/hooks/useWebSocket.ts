import {
  AlertState,
  ClientToServer,
  GameOptions,
  GameStatus,
  PlayerForLobbyType,
  ServerToClientSchema,
} from "shared-types";
import { sendWsMessage, startWsConnection } from "@/services/ws";
import { useRef, useEffect } from "react";
import { Dispatch, SetStateAction } from "react";
import { VoteState, LobbyAction } from "shared-types";

type UseWebSocketParams = {
  setNotificationAlert: Dispatch<SetStateAction<AlertState>>;
  lobbyDispatch: Dispatch<LobbyAction>;
  setVotesCounted: Dispatch<SetStateAction<boolean>>;
  setVoted: Dispatch<SetStateAction<boolean>>;
  setVoteState: Dispatch<SetStateAction<VoteState>>;
  setWinner: Dispatch<SetStateAction<"allies" | "imposter" | null>>;
  setOptions: Dispatch<SetStateAction<GameOptions>>;
  setGameStatus: Dispatch<SetStateAction<GameStatus>>;
  setInGame: Dispatch<SetStateAction<boolean>>;
};

export function useWebSocket({
  setNotificationAlert,
  lobbyDispatch,
  setVotesCounted,
  setVoted,
  setVoteState,
  setWinner,
  setInGame,
  setGameStatus,
  setOptions,
}: UseWebSocketParams) {
  const ws = useRef<WebSocket | null>(null);

  const sendWhenReady = (message: ClientToServer) => {
    if (!ws.current) {
      return;
    }
    if (ws.current.readyState === WebSocket.OPEN) {
      sendWsMessage(message, ws.current);
    } else if (ws.current.readyState === WebSocket.CONNECTING) {
      ws.current.addEventListener(
        "open",
        () => {
          sendWsMessage(message, ws.current!);
        },
        { once: true },
      );
    } else {
      console.warn(
        "sendWhenReady: socket is closing/closed, dropping message",
        message,
      );
    }
  };

  useEffect(() => {
    let timeout = 250;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const intentionalClose = { current: false };

    const handleMessage = (e: MessageEvent) => {
      let message;
      try {
        message = JSON.parse(e.data);
      } catch (err) {
        console.warn("bad json", err);
        return;
      }

      const parsed = ServerToClientSchema.safeParse(message);
      if (!parsed.success) {
        console.error(" message validation failed:", parsed.error.issues);
        console.error("Raw message:", JSON.stringify(message, null, 2));
        return;
      }

      switch (parsed.data.type) {
        case "playerJoined": {
          const newPlayer = parsed.data.msg as PlayerForLobbyType;

          lobbyDispatch({ type: "PLAYER_JOINED", payload: newPlayer }); // 2
          break;
        }
        case "gameAborted": {
          const { reason } = parsed.data.msg;
          setNotificationAlert({ type: "info", message: reason });
          setInGame(false);
          setVoted(false);
          setVoteState("idle");
          setVotesCounted(false);
          setGameStatus(GameStatus.idle);
          setWinner(null);
          lobbyDispatch({ type: "EXIT_TO_LOBBY" });
          break;
        }
        case "playerInfo": {
          const playerInfo = parsed.data.msg;

          lobbyDispatch({
            type: "PLAYER_INFO",
            payload: {
              assignedWord: playerInfo.assignedWord ?? "",
              isImposter: playerInfo.isImposter,
            },
          });
          setInGame(true);
          setVoted(false);
          setVoteState("idle");
          setVotesCounted(false);
          setGameStatus(GameStatus.started);
          setOptions((p) => ({
            ...p,
            imposterHint: playerInfo.options.imposterHint ?? false,
          }));

          break;
        }
        case "playerLeft": {
          const { playerId, name } = parsed.data.msg;

          if (playerId)
            lobbyDispatch({
              type: "PLAYER_LEFT",
              payload: { playerId: playerId },
            }); // 3
          setNotificationAlert({
            type: "info",
            message: `${name} has left the lobby`,
          });
          break;
        }
        case "playerVoted": {
          const { targetId } = parsed.data.msg;

          if (targetId)
            lobbyDispatch({ type: "PLAYER_VOTED", payload: { targetId } }); // 4
          setGameStatus(GameStatus.voting);
          break;
        }
        case "votesCounted": {
          const { votes } = parsed.data.msg;

          const votesForDispatch = votes.map(({ id, voteCount }) => ({
            id,
            voteCount: +voteCount,
          }));
          lobbyDispatch({
            type: "VOTES_COUNTED",
            payload: { votes: votesForDispatch },
          }); // 5

          setGameStatus(GameStatus.voted);
          setVotesCounted(true);

          break;
        }
        case "playerVotedOut": {
          const { playerId } = parsed.data.msg;
          if (playerId) {
            lobbyDispatch({ type: "PLAYER_VOTED_OUT", payload: { playerId } }); // 6
          }
          setVoted(false);
          setVoteState("idle");
          setGameStatus(GameStatus.idle);
          break;
        }
        case "playerBackInLobby": {
          const { playerId } = parsed.data.msg;

          if (playerId)
            lobbyDispatch({
              type: "PLAYER_BACK_IN_LOBBY",
              payload: { playerId },
            }); // 7
          break;
        }
        case "hostReassigned": {
          const { playerId, name } = parsed.data.msg;
          if (playerId && name) {
            lobbyDispatch({ type: "HOST_REASSIGNED", payload: { playerId } });
            setNotificationAlert({
              type: "info",
              message: `${name} is now the host`,
            });
          }

          break;
        }
        case "voteState": {
          const voteState = parsed.data.msg;
          setVoteState(voteState);
          setGameStatus(GameStatus.voting);
          break;
        }
        case "nobodyVotedOut": {
          setNotificationAlert({
            type: "info",
            message: "Nobody received enough votes to be voted out!",
          });
          setVoted(false);
          setVoteState("idle");
          setGameStatus(GameStatus.idle);
          break;
        }
        case "gameOver": {
          const { lastPlayerToBeVotedOutId, winner, name } = parsed.data.msg;

          setWinner(winner === "allies" ? "allies" : "imposter");

          lobbyDispatch({
            type: "GAME_OVER",
            payload: { lastPlayerToBeVotedOutId },
          }); // 8
          setGameStatus(GameStatus.gameOver);
          setVoted(false);
          setVoteState("idle");

          if (winner === "allies") {
            setNotificationAlert({
              type: "info",
              message: `${name} got voted out! The winners are the allies! `,
            });
          } else {
            setNotificationAlert({
              type: "info",
              message: `${name} got voted out! The imposter won! `,
            });
          }

          break;
        }
        case "reconnected": {
          const { player, lobby, players, gameStatus } = parsed.data.msg;

          lobbyDispatch({
            type: "SET_LOBBY",
            payload: {
              player: { ...player, lobbyId: lobby.id },
              players: players.map((x) => ({
                ...x,
                playerLeft: false,
                inLobby: true,
                votedOut: x.votedOut ?? false,
              })),
              lobby,
            },
          });
          if (gameStatus === GameStatus.voting) {
            setVoteState("start");
          }
          setGameStatus(gameStatus ?? GameStatus.idle);
          if (
            gameStatus !== GameStatus.idle &&
            gameStatus !== GameStatus.gameOver
          ) {
            setInGame(true);
          }
          break;
        }
        case "playerReconnected": {
          const { player, gameStatus } = parsed.data.msg;

          lobbyDispatch({
            type: "PLAYER_RECONNECTED",
            payload: player,
          });

          setGameStatus(gameStatus ?? GameStatus.idle);
          break;
        }
        case "error": {
          setNotificationAlert({ type: "error", message: parsed.data.msg });
          break;
        }
      }
    };

    function connect() {
      const socket = startWsConnection();
      ws.current = socket;

      socket.addEventListener("message", handleMessage);
      socket.addEventListener("error", (err) => console.error("ws error", err));

      socket.addEventListener("open", () => {
        timeout = 250;
      });

      socket.addEventListener("close", () => {
        if (intentionalClose.current) return;
        if (timeout >= 30000) {
          setNotificationAlert({
            type: "error",
            message: "Lost connection to server. Please refresh the page.",
          });
          return;
        }

        timeout = Math.min(30000, timeout * 2);
        console.log(`ws closed, reconnecting in ${timeout} ms`);
        reconnectTimer = setTimeout(connect, timeout + Math.random() * 500); // for jitter
      });
    }

    connect();

    return () => {
      intentionalClose.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, []);

  return { ws, sendWhenReady };
}
