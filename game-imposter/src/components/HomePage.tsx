import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createLobby, joinLobby } from "@/services/game";
import Lobby from "./Lobby";
import { LobbyType, Player } from "@/lib/types";
import { startWsConnection } from "@/services/ws";

export default function HomePage() {
  const ws = useRef<WebSocket | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [options, setOptions] = useState({
    imposterKnows: false,
    numOfImposters: 1, // default
  });
  const [lobby, setLobby] = useState<LobbyType>({} as LobbyType);

  useEffect(() => {
    ws.current = startWsConnection();
  }, []);

  const handleCreateLobby = async () => {
    if (playerName.trim()) {
      console.log(playerName);
      try {
        const result = await createLobby({ name: playerName, options });
        setLobby({
          lobby: result.lobby,
          player: result.player,
          players: [result.player],
        });
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

        // open wsConnection
      } catch (err) {
        console.log(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Game Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Word Imposter
          </h1>
          <p className="text-gray-600 text-lg"></p>
        </div>

        {lobby.lobby ? (
          <Lobby props={(lobby.lobby, lobby.player!)} />
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

        {/* Footer Icon */}
        <div className="text-center mt-8">
          <span className="text-4xl">🕵️</span>
        </div>
      </div>
    </div>
  );
}
