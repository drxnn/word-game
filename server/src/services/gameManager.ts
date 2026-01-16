// memory manager
import { v4 as uuidv4 } from "uuid";
import { WordPair, GameOptions } from "../types/index";

import {
  Lobby,
  Player,
  Game,
  VoteResult,
  GameState,
} from "../schemas/gameSchema";
import * as lobbiesModel from "../db/models/lobbies";
import * as playersModel from "../db/models/players";
import { enterPlayer } from "../db/models/players";

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

  async startLobby({
    name,
    options,
  }: {
    name: string;
    options?: Partial<GameOptions>;
  }) {
    let lobbyCode = generateCode();
    let imposter_knows = options?.imposterKnows ?? false;
    try {
      let lobby = await lobbiesModel.createLobby(lobbyCode);
      if (!lobby)
        throw new Error("Something went wrong with lobby creation, try again");
      await lobbiesModel.setImposterKnows(lobby.id, imposter_knows);
      let player = await enterPlayer(name, lobby.id);

      // could change + add type safety later
      return {
        lobby,
        player,
      };
    } catch (err) {
      // better error handling later
      console.log(err);
    }
  }

  async joinLobby(code: string, name: string) {
    if (!code) throw new Error("Lobby code is required");
    if (!name || !name.trim()) throw new Error("Player name is required");

    let lobby = await lobbiesModel.getLobbyByCode(code);
    if (!lobby) {
      throw new Error("Lobby with given code not found!");
    }
    try {
      let player = await playersModel.enterPlayer(name, lobby.id);
      return { player, lobby };
    } catch (err: any) {
      if (err.code === "23505")
        throw new Error("Player name already taken in this lobby"); // NAME is unique so someone else took it
      throw err;
    }
  }

  async leaveLobby(lobbyId: string, playerId: string) {
    if (!lobbyId) throw new Error("lobbyId is required");
    if (!playerId) throw new Error("playerId is required");

    const lobby = await lobbiesModel.getLobbyById(lobbyId);
    if (!lobby) throw new Error("Lobby not found");

    try {
      let player = await playersModel.exitPlayer(playerId, lobbyId);

      let playerCount = await lobbiesModel.countLobbyPlayers(lobbyId);
      if (playerCount === 0) {
        await lobbiesModel.deleteLobby(lobbyId);
      }
      // check if removed player was the host, if yes make someone else host
    } catch (err) {}
  }

  getLobby(code: string): Lobby {}

  listLobbies() {}

  startGame(code: string, starterId?: string) {
    const lobby = lobbiesModel.getLobbyByCode(code);
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
