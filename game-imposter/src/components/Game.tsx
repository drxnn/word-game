import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FlipCard from "./FlipCard";

type Player = {
  id: string;
  name: string;
  assigned_word?: string;
  isImposter?: boolean;
};

type GameProps = {
  players: Player[];
  currentPlayer: Player;
  isHost: boolean;
  onReadyToVote: () => void;
};

export default function Game({
  players,
  currentPlayer,
  isHost,
  onReadyToVote,
}: GameProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Game Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 via-indigo-700 to-slate-800 bg-clip-text text-transparent mb-2">
            Word Imposter
          </h1>
          <p className="text-slate-600">Give hints about your word</p>
        </div>

        {/* Reveal Word Card */}
        <Card className="p-6 shadow-xl border-none bg-white/80 backdrop-blur-sm">
          <FlipCard
            word={currentPlayer.assigned_word}
            isImposter={currentPlayer.isImposter || false}
          />
        </Card>

        {/* Players List */}
        <Card className="p-6 shadow-xl border-none bg-white/80 backdrop-blur-sm">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center justify-between border-b border-slate-200 pb-3">
              <span>Players in Game</span>
              <span className="text-sm font-normal text-slate-600">
                {players.length} players
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    player.id === currentPlayer.id
                      ? "bg-indigo-100 border-2 border-indigo-400"
                      : "bg-slate-50 border-2 border-transparent"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">
                      {player.name}
                      {player.id === currentPlayer.id && (
                        <span className="ml-1 text-xs text-indigo-600 font-semibold">
                          (You)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Ready to Vote Button (Host Only) */}
        {isHost && (
          <Button
            onClick={onReadyToVote}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            Ready to Vote
          </Button>
        )}

        {!isHost && (
          <div className="text-center">
            <p className="text-slate-600">
              Waiting for host to start voting...
            </p>
          </div>
        )}

        {/* Footer Icon */}
        <div className="text-center">
          <span className="text-4xl">🎯</span>
        </div>
      </div>
    </div>
  );
}
