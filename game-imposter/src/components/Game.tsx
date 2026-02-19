import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FlipCard from "./FlipCard";

import {
  PlayerForLobbyType,
  Player,
  ClientToServer,
  VoteState,
} from "@/lib/types";
import { sendWsMessage } from "@/services/ws";

type GameProps = {
  players: PlayerForLobbyType[];
  currentPlayer: Player;
  isHost: boolean;
  handleVotePlayer: (e: React.MouseEvent<HTMLButtonElement>) => void;
  votesCounted: boolean;
  voting: boolean;
  voted: boolean;
  wsRef: React.RefObject<WebSocket | null>;
  voteState: VoteState;
  gameOver: boolean;
  handleExitToLobby: () => void;
};

export default function Game({
  players,
  currentPlayer,
  isHost,
  handleVotePlayer,
  votesCounted,
  voting,
  voted,
  wsRef,
  voteState,
  gameOver,
  handleExitToLobby,
}: GameProps) {
  const onReadyToVote = () => {
    const messageToSend = {
      type: "voteState",
      msg: "start",
    } as ClientToServer;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWsMessage(messageToSend, wsRef.current);
    }
  };

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
            word={currentPlayer.assignedWord}
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
              {players.map((player) => {
                if (!player.votedOut) {
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        player.id === currentPlayer.id
                          ? "bg-indigo-100 border-2 border-indigo-400"
                          : "bg-slate-50 border-2 border-transparent" // this gets applied to 2 players even though they are unique
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
                        {votesCounted && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Votes:{" "}
                            <span className="font-semibold text-red-500">
                              {player.votes ?? 0}
                            </span>
                          </p>
                        )}
                      </div>
                      {voteState === "start" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={voted || voting}
                          className="text-xs font-semibold hover:cursor-pointer text-black border-red-300 hover:bg-red-50 hover:border-red-400 transition-all"
                          data-player-id={player.id}
                          onClick={handleVotePlayer}
                        >
                          {voting ? "Voting..." : voted ? "Voted" : "Vote"}
                        </Button>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </Card>

        {isHost && voteState === "idle" && (
          <Button
            onClick={onReadyToVote}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg hover:cursor-pointer"
          >
            Ready to Vote
          </Button>
        )}

        {gameOver && (
          <Button
            onClick={handleExitToLobby}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg hover:cursor-pointer"
          >
            Exit To Lobby
          </Button>
        )}

        {!isHost && voteState === "idle" && (
          <div className="text-center">
            <p className="text-slate-600">
              Waiting for host to start voting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
