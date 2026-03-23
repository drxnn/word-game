import { z } from 'zod';

declare enum GameStatus {
    idle = "IDLE",
    started = "STARTED",
    voted = "VOTED",
    voting = "VOTING",
    gameOver = "GAME_OVER"
}
type LobbyAction = {
    type: "PLAYER_JOINED";
    payload: PlayerForLobbyType;
} | {
    type: "PLAYER_LEFT";
    payload: {
        playerId: string;
    };
} | {
    type: "PLAYER_VOTED_OUT";
    payload: {
        playerId: string;
    };
} | {
    type: "PLAYER_BACK_IN_LOBBY";
    payload: {
        playerId: string;
    };
} | {
    type: "PLAYER_VOTED";
    payload: {
        targetId: string;
    };
} | {
    type: "VOTES_COUNTED";
    payload: {
        votes: {
            id: string;
            voteCount: number;
        }[];
    };
} | {
    type: "HOST_REASSIGNED";
    payload: {
        playerId: string;
    };
} | {
    type: "PLAYER_INFO";
    payload: {
        assignedWord: string;
        isImposter: boolean;
    };
} | {
    type: "PLAYER_RECONNECTED";
    payload: Player;
} | {
    type: "GAME_OVER";
    payload: {
        lastPlayerToBeVotedOutId: string;
    };
} | {
    type: "EXIT_TO_LOBBY";
} | {
    type: "SET_LOBBY";
    payload: LobbyType;
} | {
    type: "RESET";
};
type AlertState = {
    type: "error" | "success" | "info";
    message: string;
    title?: string;
} | null;
declare const PlayerSchema: z.ZodObject<{
    id: z.ZodUUID;
    name: z.ZodString;
    lobbyId: z.ZodUUID;
    isImposter: z.ZodBoolean;
    isHost: z.ZodBoolean;
    assignedWord: z.ZodNullable<z.ZodString>;
    votes: z.ZodNumber;
}, z.core.$strip>;
declare const playerVoteResultSchema: z.ZodObject<{
    id: z.ZodUUID;
    name: z.ZodString;
    isImposter: z.ZodBoolean;
    voteCount: z.ZodNumber;
}, z.core.$strip>;
type PlayerVoteResult = z.infer<typeof playerVoteResultSchema>;
declare const LobbySchema: z.ZodObject<{
    id: z.ZodUUID;
    code: z.ZodString;
    hostName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    imposterKnows: z.ZodBoolean;
    votingRound: z.ZodNumber;
    createdAt: z.ZodOptional<z.ZodString>;
    wordPairId: z.ZodNullable<z.ZodOptional<z.ZodUUID>>;
    gameStarted: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const gameOptionsSchema: z.ZodObject<{
    imposterKnows: z.ZodOptional<z.ZodBoolean>;
    imposterHint: z.ZodOptional<z.ZodBoolean>;
    numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
}, z.core.$strip>;
declare const ClientInfoSchema: z.ZodObject<{
    playerId: z.ZodOptional<z.ZodUUID>;
    lobbyId: z.ZodOptional<z.ZodUUID>;
    clientId: z.ZodOptional<z.ZodUUID>;
    targetId: z.ZodOptional<z.ZodUUID>;
    name: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodObject<{
        imposterKnows: z.ZodOptional<z.ZodBoolean>;
        imposterHint: z.ZodOptional<z.ZodBoolean>;
        numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type ClientInfo = z.infer<typeof ClientInfoSchema>;
declare const createLobbySchema: z.ZodObject<{
    name: z.ZodString;
    options: z.ZodObject<{
        imposterKnows: z.ZodOptional<z.ZodBoolean>;
        imposterHint: z.ZodOptional<z.ZodBoolean>;
        numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const startGameSchema: z.ZodObject<{
    lobbyId: z.ZodUUID;
    options: z.ZodOptional<z.ZodObject<{
        imposterKnows: z.ZodOptional<z.ZodBoolean>;
        imposterHint: z.ZodOptional<z.ZodBoolean>;
        numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const deleteLobbySchema: z.ZodObject<{
    id: z.ZodUUID;
}, z.core.$strip>;
declare const getGameStateSchema: z.ZodObject<{
    lobbyId: z.ZodUUID;
}, z.core.$strip>;
declare const voteSchema: z.ZodObject<{
    lobbyId: z.ZodUUID;
    voterId: z.ZodUUID;
    targetId: z.ZodUUID;
}, z.core.$strip>;
declare const playerForLobbySchema: z.ZodObject<{
    id: z.ZodUUID;
    name: z.ZodString;
    lobbyId: z.ZodUUID;
    votes: z.ZodNumber;
    votedOut: z.ZodBoolean;
    inLobby: z.ZodBoolean;
    playerLeft: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const endGameSchema: z.ZodObject<{
    lobbyId: z.ZodUUID;
}, z.core.$strip>;
declare const joinLobbySchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
}, z.core.$strip>;
declare const getLobbySchema: z.ZodObject<{
    code: z.ZodString;
}, z.core.$strip>;
declare const leaveLobbySchema: z.ZodObject<{
    code: z.ZodString;
    playerId: z.ZodUUID;
}, z.core.$strip>;
declare const WordPairSchema: z.ZodObject<{
    category: z.ZodString;
    real: z.ZodString;
    imposter: z.ZodString;
}, z.core.$strip>;
declare const ServerToClientMapSchema: z.ZodObject<{
    playerBackInLobby: z.ZodObject<{
        playerId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
    playerReconnected: z.ZodObject<{
        player: z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            lobbyId: z.ZodUUID;
            isImposter: z.ZodBoolean;
            isHost: z.ZodBoolean;
            assignedWord: z.ZodNullable<z.ZodString>;
            votes: z.ZodNumber;
            votedOut: z.ZodBoolean;
        }, z.core.$strip>;
        gameStatus: z.ZodEnum<typeof GameStatus>;
    }, z.core.$strip>;
    gameAborted: z.ZodObject<{
        lobbyId: z.ZodUUID;
        reason: z.ZodString;
    }, z.core.$strip>;
    playerInfo: z.ZodObject<{
        name: z.ZodString;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        options: z.ZodObject<{
            imposterKnows: z.ZodOptional<z.ZodBoolean>;
            imposterHint: z.ZodOptional<z.ZodBoolean>;
            numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    hostReassigned: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        playerId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
    reconnected: z.ZodObject<{
        player: z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            isImposter: z.ZodBoolean;
            isHost: z.ZodBoolean;
            assignedWord: z.ZodNullable<z.ZodString>;
            votes: z.ZodNumber;
            votedOut: z.ZodBoolean;
        }, z.core.$strip>;
        lobby: z.ZodObject<{
            id: z.ZodUUID;
            code: z.ZodString;
            hostName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            imposterKnows: z.ZodBoolean;
            votingRound: z.ZodNumber;
            createdAt: z.ZodOptional<z.ZodString>;
            wordPairId: z.ZodNullable<z.ZodOptional<z.ZodUUID>>;
            gameStarted: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>;
        players: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            lobbyId: z.ZodUUID;
            isImposter: z.ZodBoolean;
            isHost: z.ZodBoolean;
            assignedWord: z.ZodNullable<z.ZodString>;
            votes: z.ZodNumber;
            votedOut: z.ZodBoolean;
        }, z.core.$strip>>;
        gameStatus: z.ZodNullable<z.ZodEnum<typeof GameStatus>>;
    }, z.core.$strip>;
    lobbyCreated: z.ZodObject<{
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
    playerJoined: z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
    nobodyVotedOut: z.ZodObject<{
        lobbyId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
    playerLeft: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        lobbyId: z.ZodOptional<z.ZodUUID>;
        playerId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
    gameOver: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        lobbyId: z.ZodOptional<z.ZodUUID>;
        lastPlayerToBeVotedOutId: z.ZodUUID;
        winner: z.ZodUnion<readonly [z.ZodLiteral<"imposter">, z.ZodLiteral<"allies">]>;
        gameStatus: z.ZodEnum<typeof GameStatus>;
    }, z.core.$strip>;
    playerVoted: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        playerId: z.ZodOptional<z.ZodUUID>;
        targetId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
    playerVotedOut: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        playerId: z.ZodOptional<z.ZodUUID>;
        isImposter: z.ZodBoolean;
    }, z.core.$strip>;
    startGameInfo: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
    votesCounted: z.ZodObject<{
        lobbyId: z.ZodUUID;
        votes: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            isImposter: z.ZodBoolean;
            voteCount: z.ZodNumber;
        }, z.core.$strip>>;
        gameStatus: z.ZodEnum<typeof GameStatus>;
    }, z.core.$strip>;
    roundEnded: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
    gameStarted: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
    endLobby: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
    error: z.ZodString;
}, z.core.$strip>;
declare const ClientToServerMapSchema: z.ZodObject<{
    voteState: z.ZodUnion<readonly [z.ZodLiteral<"start">, z.ZodLiteral<"end">, z.ZodLiteral<"idle">]>;
    createLobby: z.ZodObject<{
        playerId: z.ZodUUID;
        lobbyId: z.ZodUUID;
        name: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    joinLobby: z.ZodObject<{
        lobbyId: z.ZodUUID;
        playerId: z.ZodUUID;
        name: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    auth: z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>;
    leaveLobby: z.ZodObject<{
        lobbyId: z.ZodUUID;
        playerId: z.ZodUUID;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    votePlayer: z.ZodObject<{
        lobbyId: z.ZodUUID;
        playerId: z.ZodUUID;
        targetId: z.ZodUUID;
    }, z.core.$strip>;
    startGame: z.ZodObject<{
        lobbyId: z.ZodUUID;
        options: z.ZodOptional<z.ZodObject<{
            imposterKnows: z.ZodOptional<z.ZodBoolean>;
            imposterHint: z.ZodOptional<z.ZodBoolean>;
            numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    voteCount: z.ZodObject<{
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
    resetGame: z.ZodObject<{
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const ServerToClientSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"voteState">;
    msg: z.ZodUnion<readonly [z.ZodLiteral<"start">, z.ZodLiteral<"end">, z.ZodLiteral<"idle">]>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"gameAborted">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"hostReassigned">;
    msg: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        playerId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"reconnected">;
    msg: z.ZodObject<{
        player: z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            isImposter: z.ZodBoolean;
            isHost: z.ZodBoolean;
            assignedWord: z.ZodNullable<z.ZodString>;
            votes: z.ZodNumber;
            votedOut: z.ZodBoolean;
        }, z.core.$strip>;
        lobby: z.ZodObject<{
            id: z.ZodUUID;
            code: z.ZodString;
            hostName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            imposterKnows: z.ZodBoolean;
            votingRound: z.ZodNumber;
            createdAt: z.ZodOptional<z.ZodString>;
            wordPairId: z.ZodNullable<z.ZodOptional<z.ZodUUID>>;
            gameStarted: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>;
        players: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            lobbyId: z.ZodUUID;
            isImposter: z.ZodBoolean;
            isHost: z.ZodBoolean;
            assignedWord: z.ZodNullable<z.ZodString>;
            votes: z.ZodNumber;
            votedOut: z.ZodBoolean;
        }, z.core.$strip>>;
        gameStatus: z.ZodNullable<z.ZodEnum<typeof GameStatus>>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerReconnected">;
    msg: z.ZodObject<{
        player: z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            lobbyId: z.ZodUUID;
            isImposter: z.ZodBoolean;
            isHost: z.ZodBoolean;
            assignedWord: z.ZodNullable<z.ZodString>;
            votes: z.ZodNumber;
            votedOut: z.ZodBoolean;
        }, z.core.$strip>;
        gameStatus: z.ZodEnum<typeof GameStatus>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerBackInLobby">;
    msg: z.ZodObject<{
        playerId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"lobbyCreated">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerInfo">;
    msg: z.ZodObject<{
        name: z.ZodString;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        options: z.ZodObject<{
            imposterKnows: z.ZodOptional<z.ZodBoolean>;
            imposterHint: z.ZodOptional<z.ZodBoolean>;
            numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"gameOver">;
    msg: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        lobbyId: z.ZodOptional<z.ZodUUID>;
        lastPlayerToBeVotedOutId: z.ZodUUID;
        winner: z.ZodUnion<readonly [z.ZodLiteral<"imposter">, z.ZodLiteral<"allies">]>;
        gameStatus: z.ZodEnum<typeof GameStatus>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"imposterVotedOut">;
    msg: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        playerId: z.ZodOptional<z.ZodUUID>;
        isImposter: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"nobodyVotedOut">;
    msg: z.ZodObject<{
        lobbyId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"countVotes">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
        votes: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            isImposter: z.ZodBoolean;
            voteCount: z.ZodNumber;
        }, z.core.$strip>>;
        gameStatus: z.ZodEnum<typeof GameStatus>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerJoined">;
    msg: z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerLeft">;
    msg: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        lobbyId: z.ZodOptional<z.ZodUUID>;
        playerId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerVoted">;
    msg: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        playerId: z.ZodOptional<z.ZodUUID>;
        targetId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerVotedOut">;
    msg: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        playerId: z.ZodOptional<z.ZodUUID>;
        isImposter: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"startGameInfo">;
    msg: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"votesCounted">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
        votes: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            isImposter: z.ZodBoolean;
            voteCount: z.ZodNumber;
        }, z.core.$strip>>;
        gameStatus: z.ZodEnum<typeof GameStatus>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"roundEnded">;
    msg: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"gameStarted">;
    msg: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"endLobby">;
    msg: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        lobbyId: z.ZodUUID;
        isImposter: z.ZodBoolean;
        isHost: z.ZodBoolean;
        assignedWord: z.ZodNullable<z.ZodString>;
        votes: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    msg: z.ZodString;
}, z.core.$strip>], "type">;
declare const ClientToServerSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"voteState">;
    msg: z.ZodUnion<readonly [z.ZodLiteral<"start">, z.ZodLiteral<"end">, z.ZodLiteral<"idle">]>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"playerBackInLobby">;
    msg: z.ZodObject<{
        playerId: z.ZodOptional<z.ZodUUID>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"auth">;
    msg: z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"createLobby">;
    msg: z.ZodObject<{
        playerId: z.ZodUUID;
        lobbyId: z.ZodUUID;
        name: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"joinLobby">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
        playerId: z.ZodUUID;
        name: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"leaveLobby">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
        playerId: z.ZodUUID;
        code: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"votePlayer">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
        playerId: z.ZodUUID;
        targetId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"startGame">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
        options: z.ZodOptional<z.ZodObject<{
            imposterKnows: z.ZodOptional<z.ZodBoolean>;
            imposterHint: z.ZodOptional<z.ZodBoolean>;
            numOfImposters: z.ZodDefault<z.ZodPipe<z.ZodTransform<{} | undefined, unknown>, z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"voteCount">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"resetGame">;
    msg: z.ZodObject<{
        lobbyId: z.ZodUUID;
    }, z.core.$strip>;
}, z.core.$strict>], "type">;
type ServerToClientMap = z.infer<typeof ServerToClientMapSchema>;
type ClientToServerMap = z.infer<typeof ClientToServerMapSchema>;
type ClientToServer = z.infer<typeof ClientToServerSchema>;
type ServerToClient = z.infer<typeof ServerToClientSchema>;
type PlayerForLobbyType = z.infer<typeof playerForLobbySchema>;
type Lobby = z.infer<typeof LobbySchema>;
type Player = z.infer<typeof PlayerSchema>;
type LobbyType = {
    lobby: Lobby;
    player: Player;
    players: PlayerForLobbyType[];
};
type GetLobbySchema = z.infer<typeof getLobbySchema>;
type LeaveLobbySchema = z.infer<typeof leaveLobbySchema>;
type JoinLobbyInput = z.infer<typeof joinLobbySchema>;
type CreateLobbyInput = z.infer<typeof createLobbySchema>;
type GameOptions = z.infer<typeof gameOptionsSchema>;
type DeleteLobbySchema = z.infer<typeof deleteLobbySchema>;
type WordPair = z.infer<typeof WordPairSchema>;
type VoteState = z.infer<typeof ClientToServerMapSchema.shape.voteState>;

export { type AlertState, type ClientInfo, ClientInfoSchema, type ClientToServer, type ClientToServerMap, ClientToServerMapSchema, ClientToServerSchema, type CreateLobbyInput, type DeleteLobbySchema, type GameOptions, GameStatus, type GetLobbySchema, type JoinLobbyInput, type LeaveLobbySchema, type Lobby, type LobbyAction, LobbySchema, type LobbyType, type Player, type PlayerForLobbyType, PlayerSchema, type PlayerVoteResult, type ServerToClient, type ServerToClientMap, ServerToClientMapSchema, ServerToClientSchema, type VoteState, type WordPair, WordPairSchema, createLobbySchema, deleteLobbySchema, endGameSchema, gameOptionsSchema, getGameStateSchema, getLobbySchema, joinLobbySchema, leaveLobbySchema, playerForLobbySchema, playerVoteResultSchema, startGameSchema, voteSchema };
