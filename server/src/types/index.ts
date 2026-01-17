import { Player } from "../schemas/gameSchema";

export enum GameState {
  LOBBY = "LOBBY",
  IN_PROGRESS = "IN_PROGRESS",
  ENDED = "ENDED",
}

export type GameOptions = {
  imposterCount: number;
  imposterKnows: boolean;
};

export type WordPair = { category: string; real: string; imposter: string };

export type Game = {
  code: string;
  // startedAt: number;
  state: GameState;
  players: Player[];
  votes: Map<string, string>;
  imposters: string[];
  wordPairUsed: WordPair;
  starterId?: string;
};

export type VoteResult = {
  finished: boolean;
  votedOut: string | null;
  success: boolean;
  tally: Record<string, number>;
};
