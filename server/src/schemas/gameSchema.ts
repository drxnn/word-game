import { z } from "zod";

export const PlayerSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2).max(20).trim(),
  lobby_id: z.uuid(),
  is_imposter: z.boolean(),
  is_host: z.boolean(),
  assigned_word: z.string().max(50).trim(),
  votes: z.number(),
});

export const LobbySchema = z.object({
  id: z.uuid(),
  code: z
    .string()
    .length(6)
    .regex(/^[A-Z0-9]+$/),
  hostName: z.string().trim().min(2).max(20),
  imposter_knows: z.boolean(),
  voting_round: z.number().min(0),
  createdAt: z.string().optional(),
  word_pair_id: z.uuid(),
});

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
  playerId: z.uuid().optional(),
  lobbyId: z.uuid().optional(),
  clientId: z.uuid().optional(),
  targetId: z.uuid().optional(),
  name: z.string().trim().max(50).optional(),
  code: z
    .string()
    .trim()
    .length(6)
    .regex(/^[A-Z0-9]+$/)
    .optional(),
  options: gameOptionsSchema.optional(),
});
export type ClientInfo = z.infer<typeof ClientInfoSchema>;
export const createLobbySchema = z.object({
  name: z.string().trim().min(2).max(20),
  options: gameOptionsSchema,
});

export const startGameSchema = z.object({
  lobbyId: z.uuid(),
  options: gameOptionsSchema.optional(),
});

export const deleteLobbySchema = z.object({
  id: z.uuid(),
});

export const getGameStateSchema = z.object({
  lobbyId: z.uuid(),
});

export const voteSchema = z.object({
  lobbyId: z.uuid(),
  voterId: z.uuid(),
  targetId: z.uuid(),
});

export const endGameSchema = z.object({
  lobbyId: z.uuid(),
});

export const joinLobbySchema = createLobbySchema.pick({ name: true }).extend({
  code: z
    .string()
    .regex(/^[A-Z0-9]+$/)
    .length(6),
});
export const getLobbySchema = joinLobbySchema.pick({ code: true });

export const leaveLobbySchema = joinLobbySchema.pick({ code: true }).extend({
  playerId: z.uuid(),
});

export const WordPairSchema = z.object({
  category: z.string().trim().min(2).max(50),
  real: z.string().trim().min(2).max(50),
  imposter: z.string().trim().min(2).max(50),
});

// export const VoteResultSchema = z.object({
//   finished: z.boolean(),
//   success: z.boolean(),
//   tally: z.record(z.string(), z.number()),
// });

// export type VoteResult = z.infer<typeof VoteResultSchema>;

export const ServerToClientMapSchema = z.object({
  lobbyCreated: z.object({ lobbyId: z.uuid() }),
  playerJoined: ClientInfoSchema.pick({
    name: true,
    playerId: true,
    lobbyId: true,
  }),
  nobodyVotedOut: ClientInfoSchema.pick({ lobbyId: true }),
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
  playerVotedOut: ClientInfoSchema.pick({ name: true, playerId: true }).extend({
    isImposter: z.boolean(),
  }),
  startGameInfo: z.array(PlayerSchema),
  votesCounted: z.object({
    lobbyId: z.uuid(),
    votes: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        is_imposter: z.boolean(),
        vote_count: z.string(),
      }),
    ),
  }),

  roundEnded: z.array(PlayerSchema),
  gameStarted: z.array(PlayerSchema),
  endLobby: z.array(PlayerSchema),
  error: z.string(),
});

export const ClientToServerMapSchema = z.object({
  createLobby: z.object({
    playerId: z.uuid(),
    lobbyId: z.uuid(),
    name: z.string().trim().max(50),
    code: z
      .string()
      .regex(/^[A-Z0-9]+$/)
      .trim()
      .max(6)
      .optional(),
  }),
  joinLobby: z.object({
    lobbyId: z.uuid(),
    playerId: z.uuid(),
    name: z.string().trim().max(50),
    code: z
      .string()
      .regex(/^[A-Z0-9]+$/)
      .trim()
      .optional(),
  }),
  leaveLobby: z.object({
    lobbyId: z.uuid(),
    playerId: z.uuid(),
    code: z
      .string()
      .regex(/^[A-Z0-9]+$/)
      .trim()
      .optional(),
  }),
  votePlayer: z.object({
    lobbyId: z.uuid(),
    playerId: z.uuid(),
    targetId: z.uuid(),
  }),
  startGame: z.object({
    lobbyId: z.uuid(),
    options: gameOptionsSchema.optional(),
  }),
  voteCount: z.object({ lobbyId: z.uuid() }),
  resetGame: z.object({ lobbyId: z.uuid() }),
});

export const ServerToClientSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lobbyCreated"),
    msg: ServerToClientMapSchema.shape.lobbyCreated,
  }),
  z.object({
    type: z.literal("playerVotedOut"),
    msg: ServerToClientMapSchema.shape.playerVotedOut,
  }),
  z.object({
    type: z.literal("nobodyVotedOut"),
    msg: ServerToClientMapSchema.shape.nobodyVotedOut,
  }),
  z.object({
    type: z.literal("countVotes"),
    msg: ServerToClientMapSchema.shape.votesCounted,
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

export type Lobby = z.infer<typeof LobbySchema>;
export type Player = z.infer<typeof PlayerSchema>;

export type GetLobbySchema = z.infer<typeof getLobbySchema>;
export type LeaveLobbySchema = z.infer<typeof leaveLobbySchema>;

export type JoinLobbyInput = z.infer<typeof joinLobbySchema>;

export type CreateLobbyInput = z.infer<typeof createLobbySchema>;
export type GameOptions = z.infer<typeof gameOptionsSchema>;

export type DeleteLobbySchema = z.infer<typeof deleteLobbySchema>;
export type WordPair = z.infer<typeof WordPairSchema>;
