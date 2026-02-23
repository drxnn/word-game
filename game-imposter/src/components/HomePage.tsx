import React, { useEffect, useReducer, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createLobby, joinLobby } from "@/services/game";
import Lobby from "./Lobby";
import {
  AlertState,
  ClientToServer,
  GameOptions,
  GameStatus,
  LobbyType,
  VoteState,
} from "@/lib/types";

import Game from "./Game";

import NotificationAlert from "./NotificationAlert";
import { lobbyReducer } from "@/reducers/lobbyReducer";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function HomePage() {
  const [playerName, setPlayerName] = useState("");
  const [voteState, setVoteState] = useState<VoteState>("idle");
  const [votesCounted, setVotesCounted] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [notificationAlert, setNotificationAlert] = useState<AlertState>(null);
  const [inGame, setInGame] = useState(false);

  const [winner, setWinner] = useState<"allies" | "imposter" | null>(null);
  const [lobby, lobbyDispatch] = useReducer(lobbyReducer, {} as LobbyType);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.idle);

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [options, setOptions] = useState<GameOptions>({
    imposterHint: false,
    numOfImposters: 1, // default
  });

  const { ws, sendWhenReady } = useWebSocket({
    setNotificationAlert,
    setVoted,
    setVotesCounted,
    setVoteState,
    setWinner,
    lobbyDispatch,
    setGameStatus,
    setInGame,
  });

  useEffect(() => {
    if (!votesCounted) return;

    const timer = setTimeout(() => {
      setVotesCounted(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [votesCounted]);

  useEffect(() => {
    if (notificationAlert) {
      const timer = setTimeout(() => {
        setNotificationAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notificationAlert]);

  const handleExitToLobby = () => {
    console.log("exiting to lobby");

    lobbyDispatch({ type: "EXIT_TO_LOBBY" }); // 1

    sendWhenReady({
      type: "playerBackInLobby",
      msg: { playerId: lobby.player.id },
    });

    setVoted(false);
    setVoteState("idle");
    setVoting(false);
    setWinner(null);
    setInGame(false);
    setGameStatus(GameStatus.idle);
  };

  const handleCreateLobby = async () => {
    if (playerName.trim()) {
      console.log(playerName);
      try {
        const result = await createLobby({ name: playerName, options });

        lobbyDispatch({
          type: "SET_LOBBY",
          payload: {
            lobby: result.lobby,
            player: { ...result.player, isHost: result.player?.isHost },
            players: [{ ...result.player, inLobby: true }],
          },
        });
        const messageToSend = {
          type: "joinLobby",
          msg: {
            lobbyId: result.lobby.id,
            playerId: result.player.id,
            name: result.player.name,
            code: result.lobby.code,
          },
        } as ClientToServer;

        sendWhenReady(messageToSend);

        console.log(`player is ${lobby.player}`);
        console.log("creation was successful");
        console.log(result);
      } catch (err) {
        console.log(err);
      }
    }
  };

  const handleJoinLobbyClick = () => {
    if (playerName.trim()) {
      setShowJoinInput(true);
    }
  };

  const handleLeaveLobby = () => {
    sendWhenReady({
      type: "leaveLobby",
      msg: {
        playerId: lobby.player.id,
        lobbyId: lobby.lobby.id,
      },
    });

    lobbyDispatch({ type: "RESET" });

    setVoted(false);
    setVoteState("idle");
    setInGame(false);
    setWinner(null);
  };

  const handleStartGame = () => {
    if (lobby.lobby.id) {
      const messageToSend = {
        type: "startGame",
        msg: {
          lobbyId: lobby.lobby.id,
          options: options,
        },
      } as ClientToServer;
      setGameStatus(GameStatus.started);
      setInGame(true);
      sendWhenReady(messageToSend);
    }
  };
  const handleJoinLobby = async () => {
    if (playerName.trim() && lobbyCode.trim()) {
      console.log("Joining lobby:", lobbyCode, "as:", playerName);
      try {
        const result = (await joinLobby({
          name: playerName,
          code: lobbyCode,
        })) as LobbyType;

        lobbyDispatch({
          type: "SET_LOBBY",
          payload: {
            player: result.player,
            players: result.players.map((p) => ({ ...p, inLobby: true })),
            lobby: result.lobby,
          },
        });
        const messageToSend = {
          type: "joinLobby",
          msg: {
            lobbyId: result.lobby.id,
            playerId: result.player.id,
            name: result.player.name,
            code: lobbyCode,
          },
        } as ClientToServer;
        console.log("sending join");
        sendWhenReady(messageToSend);
      } catch (err) {
        console.log(err);
      }
    }
  };

  const handleVotePlayer = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (voted || voting) return;
    setVoting(true);
    try {
      const targetId = e.currentTarget.dataset.playerId;
      console.log(`the target id is: ${targetId}`);
      const messageToSend = {
        type: "votePlayer",
        msg: {
          playerId: lobby.player.id,
          targetId: targetId,
          lobbyId: lobby.lobby.id,
        },
      } as ClientToServer;
      sendWhenReady(messageToSend);
      setGameStatus(GameStatus.voting);
      setVoted(true);
    } finally {
      setVoting(false);
    }
  };

  return (
    <>
      {notificationAlert && <NotificationAlert alert={notificationAlert} />}

      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-800 bg-clip-text text-transparent mb-2">
              Codeword
            </h1>
            <p className="text-slate-500 text-lg"></p>
          </div>

          {lobby.lobby ? (
            <>
              {inGame ? (
                <Game
                  players={lobby.players}
                  currentPlayer={lobby.player}
                  isHost={lobby.player?.isHost}
                  handleVotePlayer={handleVotePlayer}
                  votesCounted={votesCounted}
                  inGame={inGame}
                  voted={voted}
                  voting={voting}
                  wsRef={ws}
                  voteState={voteState}
                  handleExitToLobby={handleExitToLobby}
                  winner={winner}
                  gameStatusState={{ gameStatus, setGameStatus }}
                />
              ) : (
                <Lobby
                  lobby={lobby}
                  player={lobby.player}
                  handleStartGame={handleStartGame}
                />
              )}
              <Button
                onClick={handleLeaveLobby}
                variant="outline"
                className="w-full mt-14 py-6 text-lg font-semibold bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg hover:cursor-pointer"
              >
                Exit Lobby
              </Button>
            </>
          ) : (
            <Card className="p-8 shadow-2xl border-none bg-white/80 backdrop-blur-sm">
              <div className="space-y-6">
                {/* Name Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="playerName"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Your Name
                  </label>
                  <input
                    id="playerName"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && playerName.trim()) {
                        handleCreateLobby();
                      }
                    }}
                  />
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCreateLobby}
                    disabled={!playerName.trim()}
                    className="w-full py-6 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    Create Lobby
                  </Button>

                  {!showJoinInput ? (
                    <Button
                      onClick={handleJoinLobbyClick}
                      disabled={!playerName.trim()}
                      variant="outline"
                      className="w-full py-6 text-base font-semibold text-indigo-700 border-2 border-indigo-500 hover:bg-indigo-50 transform transition-all hover:scale-105 active:scale-95"
                    >
                      Join Lobby
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label
                          htmlFor="lobbyCode"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Lobby Code
                        </label>
                        <input
                          id="lobbyCode"
                          type="text"
                          value={lobbyCode}
                          onChange={(e) =>
                            setLobbyCode(e.target.value.toUpperCase())
                          }
                          placeholder="Enter lobby code"
                          className="w-full px-4 py-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all uppercase"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && lobbyCode.trim()) {
                              handleJoinLobby();
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setShowJoinInput(false);
                            setLobbyCode("");
                          }}
                          variant="outline"
                          className="flex-1 py-6 text-base font-semibold border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 transform transition-all hover:scale-105 active:scale-95"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleJoinLobby}
                          disabled={!lobbyCode.trim()}
                          className="flex-1 py-6 text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg"
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-indigo-100">
                  <p className="text-xs text-slate-500 text-center leading-relaxed">
                    Everyone gets the same word except one imposter. Give hints
                    and find who's faking it!
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
