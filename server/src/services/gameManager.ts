import { customAlphabet } from "nanoid";

import {
  GameOptions,
  CreateLobbyInput,
  JoinLobbyInput,
  LeaveLobbySchema,
  GameStatus,
  PlayerVoteResult,
} from "shared-types";
import * as lobbiesModel from "../db/models/lobbies";
import * as playersModel from "../db/models/players";
import { enterPlayer } from "../db/models/players";

const nanoid = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);
function generateCode(len = 6) {
  return nanoid();
}

class _GameManager {
  async startLobby({ name, options }: CreateLobbyInput) {
    let imposterKnows = options?.imposterKnows ?? false;
    for (let i = 0; i < 5; i++) {
      let lobbyCode = generateCode();

      try {
        const lobby = await lobbiesModel.createLobby(lobbyCode);
        if (!lobby) {
          throw new Error(
            "Something went wrong with lobby creation, try again",
          );
        }
        const updatedLobby = await lobbiesModel.setImposterKnows(
          lobby.id,
          imposterKnows,
        );
        const playerStart = await enterPlayer(name, lobby.id);
        const player = await playersModel.setIsHost(playerStart.id, lobby.id);

        return {
          lobby: updatedLobby,
          player,
        };
      } catch (err: any) {
        if (err?.code === "23505") {
          continue;
        }
        throw err;
      }
    }
    throw new Error(
      "Unable to generate a unique lobby code after multiple attempts",
    );
  }

  async getPlayerInLobby(lobbyId: string, playerId: string) {
    let player = await playersModel.getPlayerInLobby(lobbyId, playerId);
    if (!player) {
      throw new Error("Player doesn't exist in lobby");
    }
    return player;
  }
  async joinLobby({ code, name }: JoinLobbyInput) {
    let lobby = await lobbiesModel.getLobbyByCode(code);
    if (!lobby) {
      throw new Error("Lobby with given code not found!");
    }
    const gameStatus = await lobbiesModel.getGameStatus(lobby.id);
    if (
      gameStatus === GameStatus.started ||
      gameStatus === GameStatus.voting ||
      gameStatus === GameStatus.voted
    ) {
      throw new Error("Cannot join lobby while a game is in progress");
    }

    const currentCount = await lobbiesModel.countLobbyPlayers(lobby.id);
    if (currentCount >= 12) {
      throw new Error("Lobby is full (maximum 12 players)");
    }
    try {
      const player = await playersModel.enterPlayer(name, lobby.id);
      const players = await playersModel.getAllPlayersInLobby(lobby.id);
      return { player, players, lobby };
    } catch (err: any) {
      if (err.code === "23505")
        throw new Error("Player name already taken in this lobby");
      throw err;
    }
  }

  async leaveLobby({ code, playerId }: LeaveLobbySchema) {
    const lobby = await lobbiesModel.getLobbyByCode(code);

    if (!lobby) throw new Error("Lobby not found");
    const player = await playersModel.exitPlayer(playerId, lobby.id);

    const playerCount = await lobbiesModel.countLobbyPlayers(lobby.id);
    if (playerCount === 0) {
      try {
        await lobbiesModel.deleteLobby(lobby.id);
      } catch (err) {
        console.error("Failed to delete empty lobby:", err);
      }
    }
    return player;
  }

  async getLobby(lobbyId: string) {
    if (!lobbyId) {
      throw new Error("lobby id missing");
    }

    let lobby = await lobbiesModel.getLobbyById(lobbyId);

    if (!lobby) {
      throw new Error("Lobby not found");
    }
    return lobby;
  }

  async getAllPlayers(lobbyId: string) {
    if (!lobbyId) {
      throw new Error("Something went wrong, lobby id is missing");
    }

    const players = await playersModel.getAllPlayersInLobby(lobbyId);
    return players;
  }

  async startGame(lobbyId: string, options?: GameOptions) {
    //
    if (!lobbyId) throw new Error("Lobby id is required");

    await lobbiesModel.resetLobbyVotingRound(lobbyId);

    const imposterKnows = options?.imposterKnows ?? false;
    const numOfImposters = options?.numOfImposters ?? 1;

    const playerCount = await playersModel.playersLeftInGame(lobbyId);
    if (playerCount < 3) throw new Error("Need at least 3 players to start");
    if (numOfImposters >= playerCount) throw new Error("Too many imposters");

    const round = await lobbiesModel.incrementVotingRound(lobbyId);
    if (imposterKnows) {
      await lobbiesModel.setImposterKnows(lobbyId, imposterKnows);
    }

    const imposter = await playersModel.assignImposter(lobbyId, numOfImposters);

    await lobbiesModel.changeGameStatus(lobbyId, GameStatus.started);

    await playersModel.assignWordsToPlayers(lobbyId);

    return {
      round,
      imposter,
      imposterKnows,
    };
  }

  async countVotes(lobbyId: string): Promise<PlayerVoteResult[]> {
    if (!lobbyId) {
      throw new Error("Something went wrong, lobby id not found");
    }

    const votes = await playersModel.countVotes(lobbyId);
    return votes;
  }

  async deleteLobby(lobbyId: string) {
    const result = await lobbiesModel.deleteLobby(lobbyId);
    if (!result) {
      throw new Error("Lobby not found or already deleted");
    }

    return result;
  }

  async incrementVotingRound(lobbyId: string) {
    if (!lobbyId) {
      throw new Error("Something went wrong, lobby ID not defined");
    }
    await lobbiesModel.incrementVotingRound(lobbyId);
  }

  async playerVotedOut(lobbyId: string, playerId: string) {
    const result = await playersModel.playerVotedOut(lobbyId, playerId);
    return result;
  }

  async haveAllPlayersVoted(lobbyId: string, votingRound: number) {
    const result = await lobbiesModel.haveAllPlayersVoted(lobbyId, votingRound);

    return result;
  }

  async playersLeftInGame(lobbyId: string) {
    if (!lobbyId) {
      throw new Error("Something went wrong, lobby ID not defined");
    }

    const playersLeft = await playersModel.playersLeftInGame(lobbyId);

    return playersLeft;
  }

  async resetLobbyVotingRound(lobbyId: string) {
    if (!lobbyId) {
      throw new Error("Something went wrong, lobby ID not defined");
    }

    await lobbiesModel.resetLobbyVotingRound(lobbyId);
  }

  async isLobbyActive(lobbyId: string) {
    if (!lobbyId) throw new Error("Something went wrong, lobby ID not defined");
    const isActive = await lobbiesModel.isLobbyActive(lobbyId);
    return isActive;
  }

  async getGameStatus(lobbyId: string): Promise<GameStatus> {
    if (!lobbyId)
      throw new Error("Cannot get lobby_status, lobby ID not defined");
    const status = await lobbiesModel.getGameStatus(lobbyId);

    return status;
  }

  async setGameStatus(lobbyId: string, status: GameStatus) {
    if (!lobbyId)
      throw new Error("Cannot set lobby_status, lobby ID not defined");
    await lobbiesModel.changeGameStatus(lobbyId, status);
  }

  async reassignHost(lobbyId: string) {
    const newHost = await playersModel.reassignHost(lobbyId);
    return newHost;
  }
  async countLobbyPlayers(lobbyId: string) {
    return lobbiesModel.countLobbyPlayers(lobbyId);
  }
  async getRemainingImposters(lobbyId: string) {
    return playersModel.getRemainingImposters(lobbyId);
  }
}

export const GameManager = new _GameManager();
