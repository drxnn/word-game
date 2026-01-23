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
      z.union([z.literal(1), z.literal(2), z.literal(3)]),
    )
    .default(1),
});
export const ClientInfoSchema = z.object({
  playerId: z.string().optional(),
  lobbyId: z.string().optional(),
  clientId: z.string(),
  targetId: z.string().optional(),
  name: z.string().optional(),
  code: z.string().length(6).optional(),
  options: gameOptionsSchema.optional(),
});
export type ClientInfo = z.infer<typeof ClientInfoSchema>;
export const createLobbySchema = z.object({
  name: z.string().min(2).max(20),
  options: gameOptionsSchema,
});

export const deleteLobbySchema = z.object({
  id: z.string(),
});

export const getGameStateSchema = z.object({
  lobbyId: z.string(),
});

export const voteSchema = z.object({
  lobbyId: z.string(),
  voterId: z.string(),
  targetId: z.string(),
});

export const endGameSchema = z.object({
  lobbyId: z.string(),
});

export type DeleteLobbySchema = z.infer<typeof deleteLobbySchema>;

export const joinLobbySchema = createLobbySchema.pick({ name: true }).extend({
  code: z.string().length(6),
});
export const getLobbySchema = joinLobbySchema.pick({ code: true });

export const leaveLobbySchema = joinLobbySchema.pick({ code: true }).extend({
  playerId: z.string(),
});

export type GetLobbySchema = z.infer<typeof getLobbySchema>;
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

export const ServerToClientMapSchema = z.object({
  lobbyCreated: z.object({ lobbyId: z.string() }),
  playerJoined: ClientInfoSchema.pick({
    name: true,
    playerId: true,
    lobbyId: true,
  }),
  playerLeft: ClientInfoSchema.pick({
    name: true,
    playerId: true,
    lobbyId: true,
  }),
  playerVoted: ClientInfoSchema.pick({
    name: true,
    playerId: true,
    targetId: true,
  }),
  playerVotedOut: ClientInfoSchema.pick({ name: true, playerId: true }),
  startGameInfo: z.array(PlayerSchema),
  votesCounted: z.array(
    z.object({
      lobbyId: z.string(),
      votes: z.record(z.string(), z.number()),
    }),
  ),
  roundEnded: z.array(PlayerSchema),
  gameStarted: z.array(PlayerSchema),
  endLobby: z.array(PlayerSchema),
  error: z.string(),
});

export const ClientToServerMapSchema = z.object({
  createLobby: z.object({
    lobbyId: z.string(),
    name: z.string(),
    code: z.string().optional(),
  }),
  joinLobby: z.object({
    lobbyId: z.string(),
    playerId: z.string(),
    name: z.string(),
    code: z.string().optional(),
  }),
  leaveLobby: z.object({
    lobbyId: z.string(),
    playerId: z.string(),
    code: z.string().optional(),
  }),
  votePlayer: z.object({
    lobbyId: z.string(),
    playerId: z.string(),
    targetId: z.string(),
  }),
  startGame: z.object({
    lobbyId: z.string(),
    options: gameOptionsSchema.optional(),
  }),
  voteCount: z.object({ lobbyId: z.string() }),
  resetGame: z.object({ lobbyId: z.string() }),
});

export const ServerToClientSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lobbyCreated"),
    msg: ServerToClientMapSchema.shape.lobbyCreated,
  }),
  z.object({
    type: z.literal("playerJoined"),
    msg: ServerToClientMapSchema.shape.playerJoined,
  }),
  z.object({
    type: z.literal("playerLeft"),
    msg: ServerToClientMapSchema.shape.playerLeft,
  }),
  z.object({
    type: z.literal("playerVoted"),
    msg: ServerToClientMapSchema.shape.playerVoted,
  }),
  z.object({
    type: z.literal("playerVotedOut"),
    msg: ServerToClientMapSchema.shape.playerVotedOut,
  }),
  z.object({
    type: z.literal("startGameInfo"),
    msg: ServerToClientMapSchema.shape.startGameInfo,
  }),
  z.object({
    type: z.literal("votesCounted"),
    msg: ServerToClientMapSchema.shape.votesCounted,
  }),
  z.object({
    type: z.literal("roundEnded"),
    msg: ServerToClientMapSchema.shape.roundEnded,
  }),
  z.object({
    type: z.literal("gameStarted"),
    msg: ServerToClientMapSchema.shape.gameStarted,
  }),
  z.object({
    type: z.literal("endLobby"),
    msg: ServerToClientMapSchema.shape.endLobby,
  }),
  z.object({
    type: z.literal("error"),
    msg: ServerToClientMapSchema.shape.error,
  }),
]);

// data that comes from the client ws
export const ClientToServerSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("createLobby"),
      msg: ClientToServerMapSchema.shape.createLobby,
    })
    .strict(),
  z
    .object({
      type: z.literal("joinLobby"),
      msg: ClientToServerMapSchema.shape.joinLobby,
    })
    .strict(),
  z
    .object({
      type: z.literal("leaveLobby"),
      msg: ClientToServerMapSchema.shape.leaveLobby,
    })
    .strict(),
  z
    .object({
      type: z.literal("votePlayer"),
      msg: ClientToServerMapSchema.shape.votePlayer,
    })
    .strict(),
  z
    .object({
      type: z.literal("startGame"),
      msg: ClientToServerMapSchema.shape.startGame,
    })
    .strict(),
  z
    .object({
      type: z.literal("voteCount"),
      msg: ClientToServerMapSchema.shape.voteCount,
    })
    .strict(),
  z
    .object({
      type: z.literal("resetGame"),
      msg: ClientToServerMapSchema.shape.resetGame,
    })
    .strict(),
]);

export type ServerToClientMap = z.infer<typeof ServerToClientMapSchema>;
export type ClientToServerMap = z.infer<typeof ClientToServerMapSchema>;

export type ClientToServer = z.infer<typeof ClientToServerSchema>;
export type ServerToClient = z.infer<typeof ServerToClientSchema>;

// export type ServerToClient = {
//   [K in keyof ServerToClientMap]: { type: K; msg: ServerToClientMap[K] };
// }[keyof ServerToClientMap];

// export type ClientToServer = {
//   [K in keyof ClientToServerMap]: { type: K; msg: ClientToServerMap[K] };
// }[keyof ClientToServerMap];
