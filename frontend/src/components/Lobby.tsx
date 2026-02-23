import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameOptions, LobbyType, Player } from "shared-types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Settings2 } from "lucide-react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

type LobbyProps = {
  lobby: LobbyType;
  player: Player;
  handleStartGame: () => void;
  options: GameOptions;
  setOptions: React.Dispatch<React.SetStateAction<GameOptions>>;
};

export default function Lobby({
  lobby,
  player,
  handleStartGame,
  options,
  setOptions,
}: LobbyProps) {
  const playerCount = lobby.players.length;

  const handleNumOfImpostersChange = (num: number) => {
    setOptions((prev) => ({ ...prev, numOfImposters: num as 1 | 2 | 3 }));
  };

  return (
    <div className="min-h-fit bg-gradient-to-br from-violet-50 via-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-slate-500">Waiting for players...</p>
        </div>

        <Card className="p-8 shadow-2xl border-none bg-white/80 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Lobby Code Display */}
            <div className="text-center pb-4 border-b border-indigo-100">
              <p className="text-sm text-slate-500 mb-2">Lobby Code</p>
              <div className="inline-flex items-center gap-2 bg-indigo-50 px-6 py-3 rounded-lg">
                <span className="text-3xl font-bold text-indigo-800 tracking-wider">
                  {lobby.lobby.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Share this code with your friends
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center justify-between">
                <span>Players</span>
                <span className="text-sm font-normal text-slate-500">
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold">
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
                    {pl.inLobby ? (
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Start Game Button */}
            <div className="pt-4">
              {player.isHost && (
                <Button
                  onClick={handleStartGame}
                  disabled={
                    lobby.players.length < 3 ||
                    lobby.players.some((pl) => !pl.inLobby)
                  }
                  className="w-full py-6 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  Start Game
                </Button>
              )}
              {lobby.players.length < 3 && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  Need at least 3 players to start
                </p>
              )}
            </div>

            {/* Game Options Dialog — host only */}
            <div>
              {player.isHost && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-300 gap-2"
                    >
                      <Settings2 className="w-4 h-4" />
                      Game Options
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-sm bg-white border-indigo-100">
                    <DialogHeader className="pb-3 border-b border-indigo-100">
                      <DialogTitle className="text-indigo-900 font-semibold">
                        Game Options
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 pt-1">
                      {/* Imposter Hint Toggle */}
                      <div className="flex items-center justify-between gap-4 bg-violet-50 rounded-lg px-4 py-3 border border-violet-100">
                        <div>
                          <Label
                            htmlFor="imposter-hint"
                            className="text-sm font-medium text-indigo-800"
                          >
                            Give hint to imposter
                          </Label>
                          <p className="text-xs text-indigo-400 mt-0.5">
                            Imposter receives a related word instead of nothing
                          </p>
                        </div>
                        <Switch
                          id="imposter-hint"
                          checked={options.imposterHint}
                          onCheckedChange={(checked) =>
                            setOptions((prev) => ({
                              ...prev,
                              imposterHint: checked,
                            }))
                          }
                          className="data-[state=checked]:bg-indigo-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-indigo-800">
                          Number of imposters
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 1, minPlayers: 0 },
                            { value: 2, minPlayers: 6 },
                            { value: 3, minPlayers: 9 },
                          ].map(({ value, minPlayers }) => {
                            const unlocked = playerCount >= minPlayers;
                            return (
                              <button
                                key={value}
                                disabled={!unlocked}
                                onClick={() =>
                                  unlocked && handleNumOfImpostersChange(value)
                                }
                                className={`relative py-3 rounded-lg border-2 text-sm font-semibold transition-all
                                  ${
                                    options.numOfImposters === value && unlocked
                                      ? "border-indigo-500 bg-gradient-to-br from-violet-50 to-indigo-100 text-indigo-700 shadow-sm"
                                      : unlocked
                                        ? "border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50"
                                        : "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50"
                                  }`}
                              >
                                {value}
                                {!unlocked && (
                                  <span className="block text-[10px] font-normal text-slate-300 leading-tight">
                                    {minPlayers}+ players
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700 space-y-1">
                        <p>
                          <span className="font-semibold">
                            {options.numOfImposters} imposter
                            {options.numOfImposters > 1 ? "s" : ""}
                          </span>{" "}
                          will be assigned
                        </p>
                        <p>
                          Imposter hint:{" "}
                          <span className="font-semibold">
                            {options.imposterHint ? "On" : "Off"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
