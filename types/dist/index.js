"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var index_exports = {};
__export(index_exports, {
  ClientInfoSchema: () => ClientInfoSchema,
  ClientToServerMapSchema: () => ClientToServerMapSchema,
  ClientToServerSchema: () => ClientToServerSchema,
  GameStatus: () => GameStatus,
  LobbySchema: () => LobbySchema,
  PlayerSchema: () => PlayerSchema,
  ServerToClientMapSchema: () => ServerToClientMapSchema,
  ServerToClientSchema: () => ServerToClientSchema,
  WordPairSchema: () => WordPairSchema,
  createLobbySchema: () => createLobbySchema,
  deleteLobbySchema: () => deleteLobbySchema,
  endGameSchema: () => endGameSchema,
  gameOptionsSchema: () => gameOptionsSchema,
  getGameStateSchema: () => getGameStateSchema,
  getLobbySchema: () => getLobbySchema,
  joinLobbySchema: () => joinLobbySchema,
  leaveLobbySchema: () => leaveLobbySchema,
  playerForLobbySchema: () => playerForLobbySchema,
  playerVoteResultSchema: () => playerVoteResultSchema,
  startGameSchema: () => startGameSchema,
  voteSchema: () => voteSchema
});
module.exports = __toCommonJS(index_exports);
var import_zod = require("zod");
var GameStatus = /* @__PURE__ */ ((GameStatus2) => {
  GameStatus2["idle"] = "IDLE";
  GameStatus2["started"] = "STARTED";
  GameStatus2["voted"] = "VOTED";
  GameStatus2["voting"] = "VOTING";
  GameStatus2["gameOver"] = "GAME_OVER";
  return GameStatus2;
})(GameStatus || {});
var PlayerSchema = import_zod.z.object({
  id: import_zod.z.uuid(),
  name: import_zod.z.string().trim().min(2, "name must be at least 2 characters").max(20, "Name can't exceed 20 characters").regex(
    /^[a-zA-Z]+( [a-zA-Z]+)*$/,
    "Name can only contain letters and single spaces"
  ),
  lobbyId: import_zod.z.uuid(),
  isImposter: import_zod.z.boolean(),
  isHost: import_zod.z.boolean(),
  assignedWord: import_zod.z.string().max(50).trim().nullable(),
  votes: import_zod.z.number()
});
var playerVoteResultSchema = PlayerSchema.pick({
  name: true,
  id: true,
  isImposter: true
}).extend({ voteCount: import_zod.z.number() });
var LobbySchema = import_zod.z.object({
  id: import_zod.z.uuid(),
  code: import_zod.z.string().length(6).regex(/^[A-Z0-9]+$/),
  hostName: import_zod.z.string().trim().min(2).max(20).optional().nullable(),
  imposterKnows: import_zod.z.boolean(),
  votingRound: import_zod.z.number().min(0),
  createdAt: import_zod.z.string().optional(),
  wordPairId: import_zod.z.uuid().optional().nullable(),
  gameStarted: import_zod.z.boolean().optional()
});
var gameOptionsSchema = import_zod.z.object({
  imposterHint: import_zod.z.boolean().optional(),
  numOfImposters: import_zod.z.preprocess(
    (val) => val === null ? void 0 : val,
    import_zod.z.union([import_zod.z.literal(1), import_zod.z.literal(2), import_zod.z.literal(3)])
  ).default(1)
});
var ClientInfoSchema = import_zod.z.object({
  playerId: import_zod.z.uuid().optional(),
  lobbyId: import_zod.z.uuid().optional(),
  clientId: import_zod.z.uuid().optional(),
  targetId: import_zod.z.uuid().optional(),
  name: import_zod.z.string().trim().max(50).optional(),
  sessionId: import_zod.z.string().optional(),
  code: import_zod.z.string().trim().length(6).regex(/^[A-Z0-9]+$/).optional(),
  options: gameOptionsSchema.optional()
});
var createLobbySchema = import_zod.z.object({
  name: PlayerSchema.shape.name,
  options: gameOptionsSchema
});
var startGameSchema = import_zod.z.object({
  lobbyId: import_zod.z.uuid(),
  options: gameOptionsSchema.optional()
});
var deleteLobbySchema = import_zod.z.object({
  id: import_zod.z.uuid()
});
var getGameStateSchema = import_zod.z.object({
  lobbyId: import_zod.z.uuid()
});
var voteSchema = import_zod.z.object({
  lobbyId: import_zod.z.uuid(),
  voterId: import_zod.z.uuid(),
  targetId: import_zod.z.uuid()
});
var playerForLobbySchema = PlayerSchema.pick({
  name: true,
  lobbyId: true,
  id: true
}).extend({
  votes: import_zod.z.number(),
  votedOut: import_zod.z.boolean(),
  inLobby: import_zod.z.boolean(),
  playerLeft: import_zod.z.boolean().optional()
});
var endGameSchema = import_zod.z.object({
  lobbyId: import_zod.z.uuid()
});
var joinLobbySchema = createLobbySchema.pick({ name: true }).extend({
  code: import_zod.z.string().regex(/^[A-Z0-9]+$/).length(6)
});
var getLobbySchema = joinLobbySchema.pick({ code: true });
var leaveLobbySchema = joinLobbySchema.pick({ code: true }).extend({
  playerId: import_zod.z.uuid()
});
var WordPairSchema = import_zod.z.object({
  category: import_zod.z.string().trim().min(2).max(50),
  real: import_zod.z.string().trim().min(2).max(50),
  imposter: import_zod.z.string().trim().min(2).max(50)
});
var ServerToClientMapSchema = import_zod.z.object({
  playerBackInLobby: ClientInfoSchema.pick({ playerId: true }),
  playerReconnected: import_zod.z.object({
    player: PlayerSchema.pick({
      name: true,
      id: true,
      assignedWord: true,
      isImposter: true,
      isHost: true,
      lobbyId: true,
      votes: true
    }).extend({ votedOut: import_zod.z.boolean() }),
    gameStatus: import_zod.z.enum(GameStatus)
  }),
  gameAborted: import_zod.z.object({
    lobbyId: import_zod.z.uuid(),
    reason: import_zod.z.string()
  }),
  playerInfo: PlayerSchema.pick({
    name: true,
    isHost: true,
    isImposter: true,
    assignedWord: true
  }).extend({ options: gameOptionsSchema }),
  hostReassigned: ClientInfoSchema.pick({ name: true, playerId: true }),
  reconnected: import_zod.z.object({
    player: PlayerSchema.pick({
      name: true,
      id: true,
      assignedWord: true,
      isImposter: true,
      isHost: true,
      votes: true
    }).extend({ votedOut: import_zod.z.boolean() }),
    lobby: LobbySchema,
    players: PlayerSchema.extend({ votedOut: import_zod.z.boolean() }).array(),
    gameStatus: import_zod.z.enum(GameStatus).nullable()
  }),
  lobbyCreated: import_zod.z.object({ lobbyId: import_zod.z.uuid() }),
  playerJoined: import_zod.z.object({
    id: import_zod.z.uuid(),
    name: import_zod.z.string().trim().min(2).max(20),
    lobbyId: import_zod.z.uuid()
  }),
  nobodyVotedOut: ClientInfoSchema.pick({ lobbyId: true }),
  playerLeft: ClientInfoSchema.pick({
    name: true,
    playerId: true,
    lobbyId: true
  }),
  gameOver: ClientInfoSchema.pick({
    lobbyId: true,
    name: true
  }).extend({
    lastPlayerToBeVotedOutId: import_zod.z.uuid(),
    winner: import_zod.z.union([import_zod.z.literal("imposter"), import_zod.z.literal("allies")]),
    gameStatus: import_zod.z.enum(GameStatus)
  }),
  playerVoted: ClientInfoSchema.pick({
    name: true,
    playerId: true,
    targetId: true
  }),
  playerVotedOut: ClientInfoSchema.pick({ name: true, playerId: true }).extend({
    isImposter: import_zod.z.boolean()
  }),
  startGameInfo: import_zod.z.array(PlayerSchema),
  votesCounted: import_zod.z.object({
    lobbyId: import_zod.z.uuid(),
    votes: import_zod.z.array(playerVoteResultSchema),
    gameStatus: import_zod.z.enum(GameStatus)
  }),
  roundEnded: import_zod.z.array(PlayerSchema),
  gameStarted: import_zod.z.array(PlayerSchema),
  endLobby: import_zod.z.array(PlayerSchema),
  error: import_zod.z.string()
});
var ClientToServerMapSchema = import_zod.z.object({
  voteState: import_zod.z.union([import_zod.z.literal("start"), import_zod.z.literal("end"), import_zod.z.literal("idle")]),
  createLobby: import_zod.z.object({
    playerId: import_zod.z.uuid(),
    lobbyId: import_zod.z.uuid(),
    name: import_zod.z.string().trim().max(50),
    code: import_zod.z.string().regex(/^[A-Z0-9]+$/).trim().max(6).optional()
  }),
  joinLobby: import_zod.z.object({
    lobbyId: import_zod.z.uuid(),
    playerId: import_zod.z.uuid(),
    name: import_zod.z.string().trim().max(50),
    code: import_zod.z.string().regex(/^[A-Z0-9]+$/).trim().optional()
  }),
  auth: import_zod.z.object({
    token: import_zod.z.string().max(2e3)
  }),
  leaveLobby: import_zod.z.object({
    lobbyId: import_zod.z.uuid(),
    playerId: import_zod.z.uuid(),
    code: import_zod.z.string().regex(/^[A-Z0-9]+$/).trim().optional()
  }),
  votePlayer: import_zod.z.object({
    lobbyId: import_zod.z.uuid(),
    playerId: import_zod.z.uuid(),
    targetId: import_zod.z.uuid()
  }),
  startGame: import_zod.z.object({
    lobbyId: import_zod.z.uuid(),
    options: gameOptionsSchema.optional()
  }),
  voteCount: import_zod.z.object({ lobbyId: import_zod.z.uuid() }),
  resetGame: import_zod.z.object({ lobbyId: import_zod.z.uuid() })
});
var ServerToClientSchema = import_zod.z.discriminatedUnion("type", [
  import_zod.z.object({
    type: import_zod.z.literal("voteState"),
    msg: ClientToServerMapSchema.shape.voteState
  }),
  import_zod.z.object({
    type: import_zod.z.literal("gameAborted"),
    msg: ServerToClientMapSchema.shape.gameAborted
  }),
  import_zod.z.object({
    type: import_zod.z.literal("hostReassigned"),
    msg: ServerToClientMapSchema.shape.hostReassigned
  }),
  import_zod.z.object({
    type: import_zod.z.literal("reconnected"),
    msg: ServerToClientMapSchema.shape.reconnected
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerReconnected"),
    msg: ServerToClientMapSchema.shape.playerReconnected
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerBackInLobby"),
    msg: ServerToClientMapSchema.shape.playerBackInLobby
  }),
  import_zod.z.object({
    type: import_zod.z.literal("lobbyCreated"),
    msg: ServerToClientMapSchema.shape.lobbyCreated
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerInfo"),
    msg: ServerToClientMapSchema.shape.playerInfo
  }),
  import_zod.z.object({
    type: import_zod.z.literal("gameOver"),
    msg: ServerToClientMapSchema.shape.gameOver
  }),
  import_zod.z.object({
    type: import_zod.z.literal("imposterVotedOut"),
    msg: ServerToClientMapSchema.shape.playerVotedOut
  }),
  import_zod.z.object({
    type: import_zod.z.literal("nobodyVotedOut"),
    msg: ServerToClientMapSchema.shape.nobodyVotedOut
  }),
  import_zod.z.object({
    type: import_zod.z.literal("countVotes"),
    msg: ServerToClientMapSchema.shape.votesCounted
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerJoined"),
    msg: ServerToClientMapSchema.shape.playerJoined
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerLeft"),
    msg: ServerToClientMapSchema.shape.playerLeft
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerVoted"),
    msg: ServerToClientMapSchema.shape.playerVoted
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerVotedOut"),
    msg: ServerToClientMapSchema.shape.playerVotedOut
  }),
  import_zod.z.object({
    type: import_zod.z.literal("startGameInfo"),
    msg: ServerToClientMapSchema.shape.startGameInfo
  }),
  import_zod.z.object({
    type: import_zod.z.literal("votesCounted"),
    msg: ServerToClientMapSchema.shape.votesCounted
  }),
  import_zod.z.object({
    type: import_zod.z.literal("roundEnded"),
    msg: ServerToClientMapSchema.shape.roundEnded
  }),
  import_zod.z.object({
    type: import_zod.z.literal("gameStarted"),
    msg: ServerToClientMapSchema.shape.gameStarted
  }),
  import_zod.z.object({
    type: import_zod.z.literal("endLobby"),
    msg: ServerToClientMapSchema.shape.endLobby
  }),
  import_zod.z.object({
    type: import_zod.z.literal("error"),
    msg: ServerToClientMapSchema.shape.error
  })
]);
var ClientToServerSchema = import_zod.z.discriminatedUnion("type", [
  import_zod.z.object({
    type: import_zod.z.literal("voteState"),
    msg: ClientToServerMapSchema.shape.voteState
  }),
  import_zod.z.object({
    type: import_zod.z.literal("playerBackInLobby"),
    msg: ServerToClientMapSchema.shape.playerBackInLobby
  }),
  import_zod.z.object({
    type: import_zod.z.literal("auth"),
    msg: ClientToServerMapSchema.shape.auth
  }),
  import_zod.z.object({
    type: import_zod.z.literal("createLobby"),
    msg: ClientToServerMapSchema.shape.createLobby
  }).strict(),
  import_zod.z.object({
    type: import_zod.z.literal("joinLobby"),
    msg: ClientToServerMapSchema.shape.joinLobby
  }).strict(),
  import_zod.z.object({
    type: import_zod.z.literal("leaveLobby"),
    msg: ClientToServerMapSchema.shape.leaveLobby
  }).strict(),
  import_zod.z.object({
    type: import_zod.z.literal("votePlayer"),
    msg: ClientToServerMapSchema.shape.votePlayer
  }).strict(),
  import_zod.z.object({
    type: import_zod.z.literal("startGame"),
    msg: ClientToServerMapSchema.shape.startGame
  }).strict(),
  import_zod.z.object({
    type: import_zod.z.literal("voteCount"),
    msg: ClientToServerMapSchema.shape.voteCount
  }).strict(),
  import_zod.z.object({
    type: import_zod.z.literal("resetGame"),
    msg: ClientToServerMapSchema.shape.resetGame
  }).strict()
]);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ClientInfoSchema,
  ClientToServerMapSchema,
  ClientToServerSchema,
  GameStatus,
  LobbySchema,
  PlayerSchema,
  ServerToClientMapSchema,
  ServerToClientSchema,
  WordPairSchema,
  createLobbySchema,
  deleteLobbySchema,
  endGameSchema,
  gameOptionsSchema,
  getGameStateSchema,
  getLobbySchema,
  joinLobbySchema,
  leaveLobbySchema,
  playerForLobbySchema,
  playerVoteResultSchema,
  startGameSchema,
  voteSchema
});
