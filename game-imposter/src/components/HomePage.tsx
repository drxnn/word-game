import React, { useEffect, useReducer, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createLobby, joinLobby } from "@/services/game";
import Lobby from "./Lobby";
import {
  AlertState,
  ClientToServer,
  GameOptions,
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
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"allies" | "imposter" | null>(null);
  const [lobby, lobbyDispatch] = useReducer(lobbyReducer, {} as LobbyType);

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [options, setOptions] = useState<GameOptions>({
    imposterKnows: false,
    numOfImposters: 1, // default
  });

  const { ws, sendWhenReady } = useWebSocket({
    setGameOver,
    setNotificationAlert,
    setVoted,
    setVotesCounted,
    setVoteState,
    setWinner,
    lobbyDispatch,
  });

  useEffect(() => {
    if (!votesCounted) return;

    // 3 seconds to show player that was kicked out, then reset
    const timer = setTimeout(() => {
      setVotesCounted(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [votesCounted]);

  //extract into custon hook later, extract logic into handlers

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
    // need to tell others that player is back in lobby,

    lobbyDispatch({ type: "EXIT_TO_LOBBY" }); // 1

    sendWhenReady({
      type: "playerBackInLobby",
      msg: { playerId: lobby.player.id },
    });

    console.log(`game started is : ${lobby.lobby.gameStarted}`);
    setGameOver(false);
    setVoted(false);
    setVoteState("idle");
    setWinner(null);
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
        // need to now establish a ws connection to the backend for subsequent messages
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
    setGameOver(false);
    setVoted(false);
    setVoteState("idle");
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
        // result is {player, players[], lobby}

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
        sendWhenReady(messageToSend);
      } catch (err) {
        console.log(err);
      }
    }
  };

  const handleVotePlayer = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // get targetId from data-attribute of button?
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
      setVoted(true);
    } finally {
      setVoting(false);
    }
  };

  return (
    <>
      {notificationAlert && <NotificationAlert alert={notificationAlert} />}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Word Imposter
            </h1>
            <p className="text-gray-600 text-lg"></p>
          </div>

          {lobby.lobby ? (
            <>
              {lobby.lobby && lobby.lobby.gameStarted ? (
                <Game
                  players={lobby.players}
                  currentPlayer={lobby.player}
                  isHost={lobby.player?.isHost}
                  handleVotePlayer={handleVotePlayer}
                  votesCounted={votesCounted}
                  gameOver={gameOver}
                  voting={voting}
                  voted={voted}
                  wsRef={ws}
                  voteState={voteState}
                  handleExitToLobby={handleExitToLobby}
                  winner={winner}
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
                className="w-full mt-4 py-6 text-base font-semibold border-2 border-slate-400 text-slate-600 hover:bg-slate-100 transform transition-all hover:scale-105 active:scale-95"
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
                    className="block text-sm font-medium text-gray-700"
                  >
                    Your Name
                  </label>
                  <input
                    id="playerName"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
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
                    className="w-full py-6 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    Create Lobby
                  </Button>

                  {!showJoinInput ? (
                    <Button
                      onClick={handleJoinLobbyClick}
                      disabled={!playerName.trim()}
                      variant="outline"
                      className="w-full py-6 text-base font-semibold text-purple-700 border-2 border-purple-600 hover:bg-purple-50 transform transition-all hover:scale-105 active:scale-95"
                    >
                      Join Lobby
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label
                          htmlFor="lobbyCode"
                          className="block text-sm font-medium text-gray-700"
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
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all uppercase"
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
                          className="flex-1 py-6 text-base font-semibold transform transition-all hover:scale-105 active:scale-95"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleJoinLobby}
                          disabled={!lobbyCode.trim()}
                          className="flex-1 py-6 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg"
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Game Info */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center leading-relaxed">
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
