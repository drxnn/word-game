import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FlipCard from "./FlipCard";

import {
  PlayerForLobbyType,
  Player,
  ClientToServer,
  VoteState,
  GameStatus,
  GameOptions,
} from "shared-types";
import { sendWsMessage } from "@/services/ws";
import { Dispatch, SetStateAction } from "react";

type GameProps = {
  players: PlayerForLobbyType[];
  currentPlayer: Player;
  isHost: boolean;
  handleVotePlayer: (e: React.MouseEvent<HTMLButtonElement>) => void;
  votesCounted: boolean;
  voting: boolean;
  voted: boolean;
  handleStartGame: () => void;
  wsRef: React.RefObject<WebSocket | null>;
  voteState: VoteState;
  winner: "allies" | "imposter" | null;
  handleExitToLobby: () => void;
  gameStatusState: {
    gameStatus: GameStatus;
    setGameStatus: Dispatch<SetStateAction<GameStatus>>;
  };
  inGame: boolean;
  gameOptions: GameOptions;
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
  inGame,
  handleExitToLobby,
  winner,
  handleStartGame,
  gameStatusState,
  gameOptions,
}: GameProps) {
  const onReadyToVote = () => {
    const messageToSend = {
      type: "voteState",
      msg: "start",
    } as ClientToServer;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWsMessage(messageToSend, wsRef.current);
    }

    gameStatusState.setGameStatus(GameStatus.voting);
  };

  return (
    <div className="min-h-fit bg-gradient-to-br from-violet-50 via-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Game Title */}

        {gameStatusState.gameStatus === GameStatus.gameOver ? (
          <Card className="p-6 text-center bg-indigo-50 border-indigo-200">
            <h2 className="text-2xl font-bold text-indigo-800">Game Over!</h2>
            <p className="text-indigo-600 mt-2">
              {winner === "allies"
                ? "🎉 The allies won! The imposter was found!"
                : "🕵️ The imposter won! They stayed hidden!"}
            </p>
          </Card>
        ) : (
          <>
            <FlipCard
              word={currentPlayer.assignedWord ?? ""}
              isImposter={currentPlayer.isImposter || false}
              options={gameOptions}
            />
            {isHost && (
              <Button
                onClick={handleStartGame}
                className="w-full py-6 text-base hover:cursor-pointer font-semibold border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-200 transform transition-all hover:scale-105 active:scale-95"
              >
                Skip this word
              </Button>
            )}
          </>
        )}

        {/* Players List */}
        <Card className="p-6 shadow-xl border-none bg-white/80 backdrop-blur-sm">
          <div className="space-y-4">
            <div className="text-lg font-semibold text-slate-800 flex items-center justify-between border-b border-indigo-100 pb-3">
              <span>Players in Game</span>
              <span className="text-sm font-normal text-slate-500">
                {players.length} players
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {players.map((player) => {
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      player.votedOut
                        ? "bg-slate-100 border-2 border-slate-200 opacity-50"
                        : player.id === currentPlayer.id
                          ? "bg-indigo-100 border-2 border-indigo-400"
                          : "bg-slate-50 border-2 border-transparent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
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
                      {player.votedOut ? (
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          Voted Out
                        </p>
                      ) : votesCounted ? (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Votes:{" "}
                          <span className="font-semibold text-rose-500">
                            {player.votes ?? 0}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    {inGame &&
                      gameStatusState.gameStatus === GameStatus.voting &&
                      !player.votedOut &&
                      player.id !== currentPlayer.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={voted || voting}
                          className="text-xs font-semibold hover:cursor-pointer text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400 transition-all"
                          data-player-id={player.id}
                          onClick={handleVotePlayer}
                        >
                          {voting ? "Voting..." : voted ? "Voted" : "Vote"}
                        </Button>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
          {isHost &&
            (gameStatusState.gameStatus === GameStatus.started ||
              gameStatusState.gameStatus === GameStatus.idle) && (
              <Button
                onClick={onReadyToVote}
                className="w-full mt-4 py-6 text-base hover:cursor-pointer font-semibold border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-200 transform transition-all hover:scale-105 active:scale-95"
              >
                Ready to Vote
              </Button>
            )}
        </Card>

        {gameStatusState.gameStatus === GameStatus.gameOver && (
          <Button
            onClick={handleExitToLobby}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transform transition-all hover:scale-105 active:scale-95 shadow-lg hover:cursor-pointer"
          >
            Go Back To Lobby
          </Button>
        )}

        {!isHost && gameStatusState.gameStatus === GameStatus.idle && (
          <div className="text-center">
            <p className="text-slate-500">
              Waiting for host to start voting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
