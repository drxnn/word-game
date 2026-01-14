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

export type WordPair = { real: string; imposter: string };

export type Assignment = {
  word: string;
  isImposter: boolean;
  revealed?: boolean;
};

export type Game = {
  code: string;
  startedAt: number;
  state: GameState;
  players: Player[];
  assignments: Map<string, Assignment>;
  votes: Map<string, string>; // voterId -> targetId
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
