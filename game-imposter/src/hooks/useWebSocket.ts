import {
  AlertState,
  ClientToServer,
  PlayerForLobbyType,
  ServerToClientSchema,
} from "@/lib/types";
import { sendWsMessage, startWsConnection } from "@/services/ws";
import { useRef, useEffect } from "react";
import { Dispatch, SetStateAction } from "react";
import { VoteState, LobbyAction } from "@/lib/types";

type UseWebSocketParams = {
  setNotificationAlert: Dispatch<SetStateAction<AlertState>>;
  lobbyDispatch: Dispatch<LobbyAction>;
  setVotesCounted: Dispatch<SetStateAction<boolean>>;
  setVoted: Dispatch<SetStateAction<boolean>>;
  setVoteState: Dispatch<SetStateAction<VoteState>>;
  setWinner: Dispatch<SetStateAction<"allies" | "imposter" | null>>;
  setGameOver: Dispatch<SetStateAction<boolean>>;
};

export function useWebSocket({
  setNotificationAlert,
  lobbyDispatch,
  setVotesCounted,
  setVoted,
  setVoteState,
  setWinner,
  setGameOver,
}: UseWebSocketParams) {
  const ws = useRef<WebSocket | null>(null);
  const sendWhenReady = (message: ClientToServer) => {
    if (!ws.current) {
      console.log("ws is null");
      return;
    }
    console.log("ws readyState:", ws.current.readyState);
    if (ws.current.readyState === WebSocket.OPEN) {
      sendWsMessage(message, ws.current);
    } else {
      ws.current.addEventListener(
        "open",
        () => {
          sendWsMessage(message, ws.current!);
        },
        { once: true },
      );
    }
  };

  useEffect(() => {
    // console.log(`lobby is : ${lobby}`);
    ws.current = startWsConnection();
    const handleMessage = (e: MessageEvent) => {
      console.log(`message received: ${e.data}`);
      let message;
      try {
        message = JSON.parse(e.data);
      } catch (err) {
        console.warn("bad json", err);
        return;
      }

      const parsed = ServerToClientSchema.safeParse(message);
      if (!parsed.success) {
        console.log("schema validation failed:", parsed.error.issues);
        return;
      }

      switch (parsed.data.type) {
        case "playerJoined": {
          // another player joined<<
          console.log(`player that joined is ${parsed.data.msg.name}`);

          const newPlayer = parsed.data.msg as PlayerForLobbyType;

          lobbyDispatch({ type: "PLAYER_JOINED", payload: newPlayer }); // 2
          break;
        }
        case "playerInfo": {
          const playerInfo = parsed.data.msg;

          lobbyDispatch({
            type: "PLAYER_INFO",
            payload: {
              assignedWord: playerInfo.assignedWord,
              isImposter: playerInfo.isImposter,
            },
          });
          break;
        }
        case "playerLeft": {
          const playerThatLeft = parsed.data.msg;

          if (playerThatLeft.playerId)
            lobbyDispatch({
              type: "PLAYER_LEFT",
              payload: { playerId: playerThatLeft.playerId },
            }); // 3
          break;
        }
        case "playerVoted": {
          const { targetId } = parsed.data.msg;

          if (targetId)
            lobbyDispatch({ type: "PLAYER_VOTED", payload: { targetId } }); // 4
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

          setVotesCounted(true);

          break;
        }
        case "playerVotedOut": {
          // someone got voted out
          const { playerId } = parsed.data.msg;
          if (playerId) {
            lobbyDispatch({ type: "PLAYER_VOTED_OUT", payload: { playerId } }); // 6
          }
          setVoted(false);
          setVoteState("idle");
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
        case "voteState": {
          const voteState = parsed.data.msg;
          setVoteState(voteState);

          break;
        }
        case "nobodyVotedOut": {
          setNotificationAlert({
            type: "info",
            message: "Nobody received enough votes to be voted out!",
          });
          break;
        }
        case "gameOver": {
          const { lastPlayerToBeVotedOutId, winner, name } = parsed.data.msg;
          console.log("we are inside game over");

          setGameOver(true);
          setWinner(winner === "allies" ? "allies" : "imposter");

          lobbyDispatch({
            type: "GAME_OVER",
            payload: { lastPlayerToBeVotedOutId },
          }); // 8
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

          // reset state of lobby after 2 seconds. (show players exit to lobby button)
          break;
        }
        case "error": {
          setNotificationAlert({ type: "error", message: parsed.data.msg });
        }
      }
    };

    console.log(`ws is ${ws.current}`);
    const handleClose = () => console.log("ws closed");
    const handleError = (err: Event) => console.error("ws error", err);
    ws.current.addEventListener("message", handleMessage);
    ws.current.addEventListener("close", handleClose);
    ws.current.addEventListener("error", handleError);

    return () => {
      if (!ws.current) return;
      ws.current.removeEventListener("message", handleMessage);
      ws.current.removeEventListener("close", handleClose);
      ws.current.removeEventListener("error", handleError);

      try {
        ws.current.close();
      } catch (err) {
        console.log(err);
      }
      ws.current = null;
    };
  }, []);

  return { ws, sendWhenReady };
}
