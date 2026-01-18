import { z } from "zod";

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(20),
  lobby_id: z.string(),
  is_imposter: z.boolean(),
  is_host: z.boolean(),
  assigned_word: z.string(),
});

export const LobbySchema = z.object({
  id: z.string(),
  code: z.string().length(6),
  hostName: z.string().min(2).max(20),
  imposter_knows: z.boolean(),
  voting_round: z.number(),
  createdAt: z.string().optional(),
  word_pair_id: z.string(),
});

export type Lobby = z.infer<typeof LobbySchema>;
export type Player = z.infer<typeof PlayerSchema>;

export const gameOptionsSchema = z.object({
  imposterKnows: z.boolean().optional(),
  num_of_imposters: z
    .preprocess(
      (val) => (val === null ? undefined : val),
      z.union([z.literal(1), z.literal(2), z.literal(3)])
    )
    .default(1),
});
export const createLobbySchema = z.object({
  name: z.string().min(2).max(20),
  options: gameOptionsSchema,
});

export const joinLobbySchema = createLobbySchema.pick({ name: true }).extend({
  code: z.string().length(6),
});

export const leaveLobbySchema = joinLobbySchema.pick({ code: true }).extend({
  playerId: z.string(),
});

export type LeaveLobbySchema = z.infer<typeof leaveLobbySchema>;

export type JoinLobbyInput = z.infer<typeof joinLobbySchema>;

export type CreateLobbyInput = z.infer<typeof createLobbySchema>;
export type GameOptions = z.infer<typeof gameOptionsSchema>;

export const WordPairSchema = z.object({
  category: z.string(),
  real: z.string(),
  imposter: z.string(),
});
export type WordPair = z.infer<typeof WordPairSchema>;

// export const VoteResultSchema = z.object({
//   finished: z.boolean(),
//   success: z.boolean(),
//   tally: z.record(z.string(), z.number()),
// });

// export type VoteResult = z.infer<typeof VoteResultSchema>;
