import { z } from "zod";

export enum GameStatus {
  idle = "IDLE",
  started = "STARTED",
  voted = "VOTED",
  voting = "VOTING",
  gameOver = "GAME_OVER",
}

export type LobbyAction =
  | { type: "PLAYER_JOINED"; payload: PlayerForLobbyType }
  | { type: "PLAYER_LEFT"; payload: { playerId: string } }
  | { type: "PLAYER_VOTED_OUT"; payload: { playerId: string } }
  | { type: "PLAYER_BACK_IN_LOBBY"; payload: { playerId: string } }
  | { type: "PLAYER_VOTED"; payload: { targetId: string } }
  | {
      type: "VOTES_COUNTED";
      payload: { votes: { id: string; voteCount: number }[] };
    }
  | { type: "HOST_REASSIGNED"; payload: { playerId: string } }
  | {
      type: "PLAYER_INFO";
      payload: { assignedWord: string; isImposter: boolean };
    }
  | { type: "PLAYER_RECONNECTED"; payload: Player }
  | { type: "GAME_OVER"; payload: { lastPlayerToBeVotedOutId: string } }
  | { type: "EXIT_TO_LOBBY" }
  | { type: "SET_LOBBY"; payload: LobbyType }
  | { type: "RESET" };

export type AlertState = {
  type: "error" | "success" | "info";
  message: string;
  title?: string;
} | null;

export const PlayerSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(2, "name must be at least 2 characters")
    .max(20, "Name can't exceed 20 characters")
    .regex(
      /^[a-zA-Z]+( [a-zA-Z]+)*$/,
      "Name can only contain letters and single spaces",
    ),
  lobbyId: z.uuid(),
  isImposter: z.boolean(),
  isHost: z.boolean(),
  assignedWord: z.string().max(50).trim().nullable(),
  votes: z.number(),
});

export const playerVoteResultSchema = PlayerSchema.pick({
  name: true,
  id: true,
  isImposter: true,
}).extend({ voteCount: z.number() });
export type PlayerVoteResult = z.infer<typeof playerVoteResultSchema>;

export const LobbySchema = z.object({
  id: z.uuid(),
  code: z
    .string()
    .length(6)
    .regex(/^[A-Z0-9]+$/),
  hostName: z.string().trim().min(2).max(20).optional().nullable(),
  imposterKnows: z.boolean(),
  votingRound: z.number().min(0),
  createdAt: z.string().optional(),
  wordPairId: z.uuid().optional().nullable(),
  gameStarted: z.boolean().optional(),
});

export const gameOptionsSchema = z.object({
  imposterKnows: z.boolean().optional(),
  imposterHint: z.boolean().optional(),
  numOfImposters: z
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
  sessionId: z.string().optional(),
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
  name: PlayerSchema.shape.name,
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

export const playerForLobbySchema = PlayerSchema.pick({
  name: true,
  lobbyId: true,
  id: true,
}).extend({
  votes: z.number(),
  votedOut: z.boolean(),
  inLobby: z.boolean(),
  playerLeft: z.boolean().optional(),
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

export const ServerToClientMapSchema = z.object({
  playerBackInLobby: ClientInfoSchema.pick({ playerId: true }),
  playerReconnected: z.object({
    player: PlayerSchema.pick({
      name: true,
      id: true,
      assignedWord: true,
      isImposter: true,
      isHost: true,
      lobbyId: true,
      votes: true,
    }).extend({ votedOut: z.boolean() }),
    gameStatus: z.enum(GameStatus),
  }),

  playerInfo: PlayerSchema.pick({
    name: true,
    isHost: true,
    isImposter: true,
    assignedWord: true,
  }).extend({ options: gameOptionsSchema }),
  hostReassigned: ClientInfoSchema.pick({ name: true, playerId: true }),
  reconnected: z.object({
    player: PlayerSchema.pick({
      name: true,
      id: true,
      assignedWord: true,
      isImposter: true,
      isHost: true,
      votes: true,
    }).extend({ votedOut: z.boolean() }),

    lobby: LobbySchema,
    players: PlayerSchema.extend({ votedOut: z.boolean() }).array(),
    gameStatus: z.enum(GameStatus).nullable(),
  }),
  lobbyCreated: z.object({ lobbyId: z.uuid() }),
  playerJoined: z.object({
    id: z.uuid(),
    name: z.string().trim().min(2).max(20),
    lobbyId: z.uuid(),
  }),
  nobodyVotedOut: ClientInfoSchema.pick({ lobbyId: true }),
  playerLeft: ClientInfoSchema.pick({
    name: true,
    playerId: true,
    lobbyId: true,
  }),
  gameOver: ClientInfoSchema.pick({
    lobbyId: true,
    name: true,
  }).extend({
    lastPlayerToBeVotedOutId: z.uuid(),
    winner: z.union([z.literal("imposter"), z.literal("allies")]),
    gameStatus: z.enum(GameStatus),
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
    votes: z.array(playerVoteResultSchema),
    gameStatus: z.enum(GameStatus),
  }),
  roundEnded: z.array(PlayerSchema),
  gameStarted: z.array(PlayerSchema),
  endLobby: z.array(PlayerSchema),
  error: z.string(),
});

export const ClientToServerMapSchema = z.object({
  voteState: z.union([z.literal("start"), z.literal("end"), z.literal("idle")]),
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

  auth: z.object({
    token: z.string(),
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
    type: z.literal("voteState"),
    msg: ClientToServerMapSchema.shape.voteState,
  }),
  z.object({
    type: z.literal("hostReassigned"),
    msg: ServerToClientMapSchema.shape.hostReassigned,
  }),
  z.object({
    type: z.literal("reconnected"),
    msg: ServerToClientMapSchema.shape.reconnected,
  }),
  z.object({
    type: z.literal("playerReconnected"),
    msg: ServerToClientMapSchema.shape.playerReconnected,
  }),
  z.object({
    type: z.literal("playerBackInLobby"),
    msg: ServerToClientMapSchema.shape.playerBackInLobby,
  }),
  z.object({
    type: z.literal("lobbyCreated"),
    msg: ServerToClientMapSchema.shape.lobbyCreated,
  }),
  z.object({
    type: z.literal("playerInfo"),
    msg: ServerToClientMapSchema.shape.playerInfo,
  }),
  z.object({
    type: z.literal("gameOver"),
    msg: ServerToClientMapSchema.shape.gameOver,
  }),
  z.object({
    type: z.literal("imposterVotedOut"),
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

export const ClientToServerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("voteState"),
    msg: ClientToServerMapSchema.shape.voteState,
  }),
  z.object({
    type: z.literal("playerBackInLobby"),
    msg: ServerToClientMapSchema.shape.playerBackInLobby,
  }),
  z.object({
    type: z.literal("auth"),
    msg: ClientToServerMapSchema.shape.auth,
  }),
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
export type PlayerForLobbyType = z.infer<typeof playerForLobbySchema>;

export type Lobby = z.infer<typeof LobbySchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type LobbyType = {
  lobby: Lobby;
  player: Player;
  players: PlayerForLobbyType[];
};

export type GetLobbySchema = z.infer<typeof getLobbySchema>;
export type LeaveLobbySchema = z.infer<typeof leaveLobbySchema>;

export type JoinLobbyInput = z.infer<typeof joinLobbySchema>;

export type CreateLobbyInput = z.infer<typeof createLobbySchema>;
export type GameOptions = z.infer<typeof gameOptionsSchema>;

export type DeleteLobbySchema = z.infer<typeof deleteLobbySchema>;
export type WordPair = z.infer<typeof WordPairSchema>;
export type VoteState = z.infer<typeof ClientToServerMapSchema.shape.voteState>;
