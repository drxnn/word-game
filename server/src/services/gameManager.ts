// memory manager

import {
  Lobby,
  Player,
  GameOptions,
  CreateLobbyInput,
  JoinLobbyInput,
  LeaveLobbySchema,
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
  async startLobby({ name, options }: CreateLobbyInput) {
    let imposter_knows = options?.imposterKnows ?? false;
    for (let i = 0; i < 5; i++) {
      // try 5 times in case generated code isnt unique // good for now, will improve later
      let lobbyCode = generateCode();
      console.log(`generated lobby code is: ${lobbyCode}`);

      try {
        let lobby = await lobbiesModel.createLobby(lobbyCode);
        if (!lobby) {
          console.log(`this is the lobby code: ${lobbyCode}`);

          throw new Error(
            "Something went wrong with lobby creation, try again",
          );
        }
        await lobbiesModel.setImposterKnows(lobby.id, imposter_knows);
        let player = await enterPlayer(name, lobby.id);

        return {
          lobby,
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

  async joinLobby({ code, name }: JoinLobbyInput) {
    let lobby = await lobbiesModel.getLobbyByCode(code);
    if (!lobby) {
      throw new Error("Lobby with given code not found!");
    }
    try {
      let player = await playersModel.enterPlayer(name, lobby.id);
      const players = await playersModel.getAllPlayersInLobby(lobby.id);
      return { players, lobby }; // maybe just players + lobby
    } catch (err: any) {
      if (err.code === "23505")
        throw new Error("Player name already taken in this lobby"); // NAME is unique so someone else took it
      throw err;
    }
  }

  async leaveLobby({ code, playerId }: LeaveLobbySchema) {
    let lobbyId = await lobbiesModel.getLobbyByCode(code);
    const lobby = await lobbiesModel.getLobbyById(lobbyId);
    if (!lobby) throw new Error("Lobby not found");

    try {
      let player = await playersModel.exitPlayer(playerId, lobbyId);

      let playerCount = await lobbiesModel.countLobbyPlayers(lobbyId);
      if (playerCount === 0) {
        await lobbiesModel.deleteLobby(lobbyId);
      } else {
        return player;
      }

      // check if removed player was the host, if yes make someone else host
    } catch (err) {
      console.log("err"); // later
    }
  }

  async getLobby(lobbyId: string) {
    if (!lobbyId) {
      throw new Error("lobby id missing");
    }
    try {
      let lobby = await lobbiesModel.getLobbyById(lobbyId);

      if (!lobby) {
        throw new Error("Lobby not found");
      }
      return lobby;
    } catch (err) {}
  }

  listLobbies() {} // dont need for now

  // use zod later
  async startGame(lobbyId: string, options: Partial<GameOptions>) {
    // game starts when all players are in the lobby, so they get each get assigned a word, then round 1 starts
    //
    if (!lobbyId) {
      throw new Error("Something went wrong, lobby id is missing");
    }

    let imposter_knows = options?.imposterKnows ?? false;
    try {
      await lobbiesModel.incrementVotingRound(lobbyId); // first time its called, this increments it to 1
      await lobbiesModel.setImposterKnows(lobbyId, imposter_knows);
      await playersModel.assignImposter(lobbyId);
      await playersModel.assignWordsToPlayers(lobbyId);
    } catch (err) {
      console.log(err); // fix later
    }
  }

  async castVote(lobbyId: string, voterId: string, targetId: string) {
    if (!lobbyId) {
      throw new Error("Lobby id required");
    }
    if (!voterId || !targetId) {
      throw new Error("Something went wrong, could not cast vote ");
    }

    try {
      let voted_player = await playersModel.votePlayer(
        voterId,
        targetId,
        lobbyId,
      );

      return voted_player;
    } catch (err) {
      console.log("err");
    }
  }

  async countVotes(lobbyId: string) {
    if (!lobbyId) {
      throw new Error("Something went wrong, lobby id not found");
    }

    try {
      let votes = playersModel.countVotes(lobbyId); // returns all players {id,name, is imposter,vc}
    } catch (err) {
      console.log(err);
    }
  }

  async deleteLobby(lobbyId: string) {
    // delete
    try {
      let lobby = await lobbiesModel.deleteLobby(lobbyId);
      return lobby.rows[0];
    } catch (err) {
      console.log("err");
    }
  }
}

export const GameManager = new _GameManager();
