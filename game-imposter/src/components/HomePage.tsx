import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createLobby, joinLobby } from "@/services/game";
import Lobby from "./Lobby";
import {
  ClientToServer,
  GameOptions,
  LobbyType,
  Player,
  PlayerForLobbyType,
  ServerToClientSchema,
} from "@/lib/types";
import { sendWsMessage, startWsConnection } from "@/services/ws";
import Game from "./Game";
import ErrorAlert from "./ErrorAlert";

export default function HomePage() {
  const ws = useRef<WebSocket | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [votesCounted, setVotesCounted] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [options, setOptions] = useState<GameOptions>({
    imposterKnows: false,
    numOfImposters: 1, // default
  });
  const [lobby, setLobby] = useState<LobbyType>({} as LobbyType);

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
      if (!parsed.success) return;
      switch (parsed.data.type) {
        case "playerJoined": {
          // another player joined<<

          const newPlayer = parsed.data.msg as PlayerForLobbyType;
          setLobby((p) => ({
            ...p,
            players: [...p.players, newPlayer],
          }));
          break;
        }
        case "playerInfo": {
          const playerInfo = parsed.data.msg;

          setLobby((p) => ({
            ...p,
            player: {
              ...p.player,
              assigned_word: playerInfo.assignedWord,
              isImposter: playerInfo.isImposter,
            },
          }));
          break;
        }
        case "playerLeft": {
          const playerThatLeft = parsed.data.msg;
          setLobby((p) => ({
            ...p,
            players: p.players.filter(
              (player) => player.id !== playerThatLeft.playerId,
            ),
          }));
          break;
        }
        case "playerVoted": {
          const { targetId } = parsed.data.msg; // who voted for who

          setLobby((p) => ({
            ...p,
            players: p.players.map((pl) => {
              return pl.id === targetId
                ? { ...pl, votes: (pl.votes += 1) }
                : pl;
            }),
          }));
          break;
        }
        case "votesCounted": {
          const { votes } = parsed.data.msg;

          setLobby((p) => ({
            ...p,
            players: p.players.map((x) => {
              const match = votes.find((v) => v.id === x.id);

              return match ? { ...x, votes: +match.vote_count } : x;
            }),
          }));
          // when votesCounted is received, display votes to users, after 2 seconds, player that got voted out will be sent as a message
          // of type playerVotedOut: info

          setVotesCounted(true);

          break;
        }
        case "playerVotedOut": {
          break;
        }
        case "error": {
          setAlert(parsed.data.msg);
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

  const handleCreateLobby = async () => {
    if (playerName.trim()) {
      console.log(playerName);
      try {
        const result = await createLobby({ name: playerName, options });
        setLobby((p) => {
          return {
            ...p,
            lobby: result.lobby,
            player: { ...p.player, isHost: result.player?.is_host }, // fix later
            players: [result.player],
          };
        });
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
    // leave lobby, only when player exits by themselves, closing browser won't do it,
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

      if (ws.current?.readyState === WebSocket.OPEN) {
        sendWsMessage(messageToSend, ws.current);
      }
    }
  };
  const handleJoinLobby = async () => {
    // validate input klater
    if (playerName.trim() && lobbyCode.trim()) {
      console.log("Joining lobby:", lobbyCode, "as:", playerName);
      try {
        const result = await joinLobby({ name: playerName, code: lobbyCode });
        // result is {player, players[], lobby}

        setLobby({
          player: result.player,
          players: result.players,
          lobby: result.lobby,
        });

        const messageToSend = {
          type: "joinLobby",
          msg: {
            lobbyId: lobby.lobby.id,
            playerId: lobby.player.id,
            name: lobby.player.name,
            lobbyCode,
          },
        } as ClientToServer;
        if (ws.current?.readyState === WebSocket.OPEN) {
          sendWsMessage(messageToSend, ws.current);
        }
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

      const messageToSend = {
        type: "votePlayer",
        msg: {
          playerId: lobby.player.id,
          targetId,
          lobbyId: lobby.lobby.id,
        },
      } as ClientToServer;
      if (ws.current?.readyState === WebSocket.OPEN) {
        sendWsMessage(messageToSend, ws.current);
      }
      setVoted(true);
    } finally {
      setVoting(false);
    }
  };

  if (lobby?.lobby /* && lobby.player?.assignedWord */) {
    return (
      <Game
        players={lobby.players}
        currentPlayer={lobby.player}
        isHost={lobby.player?.isHost}
        handleVotePlayer={handleVotePlayer}
        votesCounted={votesCounted}
        voting={voting}
        voted={voted}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Word Imposter
          </h1>
          <p className="text-gray-600 text-lg"></p>
        </div>
        {alert ? <ErrorAlert message={alert} /> : null}

        {lobby.lobby ? (
          <Lobby
            lobby={lobby}
            player={lobby.player}
            handleStartGame={handleStartGame}
          />
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
  );
}
