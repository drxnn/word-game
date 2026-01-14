import { z } from "zod";

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  joinedAt: z.number(),
});
export const GameOptionsSchema = z.object({
  imposterCount: z.number().int().nonnegative(),
  imposterKnows: z.boolean(),
});

export const LobbySchema = z.object({
  code: z.string(),
  name: z.string().min(2).max(20).optional(),
  hostId: z.string(),

  players: z.array(PlayerSchema).default([]),
  options: GameOptionsSchema,
  // status: z.enum(["waiting", "playing", "finished"]).default("waiting"), // maybe readd later
  createdAt: z.string().optional(),
});

export type Lobby = z.infer<typeof LobbySchema>;
export type Player = z.infer<typeof PlayerSchema>;

export const GameStateSchema = z.enum(["LOBBY", "IN_PROGRESS", "ENDED"]);
export type GameState = z.infer<typeof GameStateSchema>;

export type GameOptions = z.infer<typeof GameOptionsSchema>;

export const WordPairSchema = z.object({
  real: z.string(),
  imposter: z.string(),
});
export type WordPair = z.infer<typeof WordPairSchema>;

export const GameSchema = z.object({
  code: z.string(),
  startedAt: z.number(),
  state: GameStateSchema,
  players: z.array(PlayerSchema),

  votes: z.map(z.string(), z.string()),
  imposters: z.array(z.string()),
  wordPairUsed: WordPairSchema,
  starterId: z.string().optional(),
});
export type Game = z.infer<typeof GameSchema>;

export const VoteResultSchema = z.object({
  finished: z.boolean(),
  success: z.boolean(),
  tally: z.record(z.string(), z.number()),
});

export type VoteResult = z.infer<typeof VoteResultSchema>;
