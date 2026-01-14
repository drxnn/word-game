// memory manager
import { v4 as uuidv4 } from "uuid";
import { WordPair, GameOptions } from "../types/index";
import { WORD_PAIRS } from "./words";
import {
  Lobby,
  Player,
  Game,
  VoteResult,
  GameState,
} from "../schemas/gameSchema";

function generateCode(len = 6) {
  // make sure you check later that the same code cannot be generated twice
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

class _GameManager {
  private lobbies = new Map<string, Lobby>();
  private games = new Map<string, Game>();

  createLobby({
    hostName,
    options,
  }: {
    hostName: string;
    options?: Partial<GameOptions>;
  }): Lobby {
    const code = generateCode();
    const hostId = uuidv4();
    const players = new Array();
    const lobby: Lobby = {
      code,
      hostId,
      players,
      options: {
        imposterCount: options?.imposterCount ?? 1,
        imposterKnows: options?.imposterKnows ?? false,
      },
      createdAt: Date.now().toString(),
    };
    const host: Player = {
      id: hostId,
      name: hostName,
      joinedAt: Date.now(),
    };
    if (lobby.players instanceof Map) {
      lobby.players.set(hostId, host);
    }
    this.lobbies.set(code, lobby);
    console.log(`lobbies: ${this.lobbies}`);
    return this._serializeLobby(lobby);
  }

  joinLobby(code: string, name: string): Player {
    const lobby = this.lobbies.get(code);
    if (!lobby) throw new Error("Lobby not found");
    const id = uuidv4();
    const player: Player = { id, name, joinedAt: Date.now() };
    if (lobby.players instanceof Map) {
      lobby.players.set(id, player);
    }

    return player;
  }

  leaveLobby(code: string, playerId: string) {
    const lobby = this.lobbies.get(code);
    if (!lobby) throw new Error("Lobby not found");
    if (lobby.players instanceof Map) {
      lobby.players.delete(playerId);
    }
    // if empty, delete lobby
    if (lobby.players instanceof Map && lobby.players.size === 0) {
      this.lobbies.delete(code);
    } else if (lobby.hostId === playerId) {
      // assign new host
      const next = lobby.players.keys().next().value?.toString();
      lobby.hostId = next || "";
    }
  }

  getLobby(code: string): Lobby {
    const lobby = this.lobbies.get(code);
    if (!lobby) throw new Error("Lobby not found");
    return this._serializeLobby(lobby);
  }

  listLobbies() {
    return Array.from(this.lobbies.values()).map((l) =>
      this._serializeLobby(l)
    );
  }

  startGame(code: string, starterId?: string) {
    const lobby = this.lobbies.get(code);
    if (!lobby) throw new Error("Lobby not found");
    const players = Array.from(lobby.players.values());
    if (players.length < 3) throw new Error("Need at least 3 players");

    // how many imposters are chosen

    // choose random word pair
    const pair = this._chooseWordPair();

    // const game: Game = {
    //   // stuff
    // };
  }

  getGameState(code: string) {
    const game = this.games.get(code);
    if (!game) throw new Error("Game not found");
    return this._serializeGame(game);
  }

  revealWord(code: string, playerId: string) {
    // helper to reveal word
  }

  castVote(code: string, voterId: string, targetId: string) {
    // helper to cast vote
  }

  endGame(code: string) {
    if (!this.games.has(code)) throw new Error("Game not found");
    this.games.delete(code);
  }

  private _chooseImposters(playerIds: string[], count: number) {
    // helper to choose imposter
  }

  private _chooseWordPair(): WordPair {
    // helper to choose random word pair

    return {
      real: "real",
      imposter: "fake",
    };
  }

  // serialization helpers to convert Maps to plain objects for API responses
  private _serializeLobby(lobby: Lobby) {
    return {
      code: lobby.code,
      hostId: lobby.hostId,
      players: Array.from(lobby.players.values()),
      options: lobby.options,
      createdAt: lobby.createdAt,
    } as Lobby;
  }

  private _serializeGame(game: Game) {
    return {
      code: game.code,
      startedAt: game.startedAt,
      state: game.state,
      players: Array.from(game.players.values()),
      votes: Object.fromEntries(game.votes.entries()),
      imposters: game.imposters,
      wordPairUsed: game.wordPairUsed,
      starterId: game.starterId,
    };
  }
}

export const GameManager = new _GameManager();
