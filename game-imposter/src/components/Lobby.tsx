import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientToServer, LobbyType, Player } from "@/lib/types";

type LobbyProps = {
  lobby: LobbyType;
  player: Player;
  handleStartGame: () => void;
};

export default function Lobby({ lobby, player, handleStartGame }: LobbyProps) {
  // Dummy data for preview

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-slate-600">Waiting for players...</p>
        </div>

        <Card className="p-8 shadow-2xl border-none bg-white/80 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Lobby Code Display */}
            <div className="text-center pb-4 border-b border-gray-200">
              <p className="text-sm text-slate-600 mb-2">Lobby Code</p>
              <div className="inline-flex items-center gap-2 bg-slate-100 px-6 py-3 rounded-lg">
                <span className="text-3xl font-bold text-slate-800 tracking-wider">
                  {lobby.lobby.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Share this code with your friends
              </p>
            </div>

            {/* Players List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center justify-between">
                <span>Players</span>
                <span className="text-sm font-normal text-slate-600">
                  {lobby.players.length} joined
                </span>
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lobby.players.map((pl, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      player.id === pl.id
                        ? "bg-indigo-100 border-2 border-indigo-400"
                        : "bg-slate-50 border-2 border-transparent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {pl.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">
                        {pl.name}
                        {pl.id === player.id && (
                          <span className="ml-2 text-xs text-indigo-600 font-semibold">
                            (You)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Game Button */}
            <div className="pt-4">
              <Button
                onClick={handleStartGame}
                disabled={lobby.players.length < 3}
                className="w-full py-6 text-base font-semibold bg-gradient-to-r from-slate-700 to-indigo-700 hover:from-slate-800 hover:to-indigo-800 transform transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                Start Game
              </Button>
              {lobby.players.length < 3 && (
                <p className="text-xs text-slate-500 text-center mt-2">
                  Need at least 3 players to start
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Footer Icon */}
        <div className="text-center mt-6">
          <span className="text-4xl">👥</span>
        </div>
      </div>
    </div>
  );
}
