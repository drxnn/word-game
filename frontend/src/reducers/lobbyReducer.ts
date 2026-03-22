import { LobbyAction, LobbyType } from "shared-types";

export function lobbyReducer(state: LobbyType, action: LobbyAction) {
  const { type } = action;

  switch (type) {
    case "PLAYER_JOINED": {
      const alreadyExists = state.players.some(
        (pl) => pl.id === action.payload.id,
      );
      if (alreadyExists) return state;
      return {
        ...state,
        players: [
          ...state.players,
          { ...action.payload, votes: 0, votedOut: false, inLobby: true },
        ],
      };
    }
    case "PLAYER_RECONNECTED": {
      if (!state.players) return state;
      return {
        ...state,
        players: state.players.map((pl) =>
          pl.id === action.payload.id
            ? { ...pl, inLobby: true, playerLeft: false }
            : pl,
        ),
      };
    }
    case "HOST_REASSIGNED": {
      if (!state.player || !state.players) return state;
      return {
        ...state,
        player:
          state.player.id === action.payload.playerId
            ? { ...state.player, isHost: true }
            : { ...state.player, isHost: false },
        players: state.players.map((pl) => ({
          ...pl,
          isHost: pl.id === action.payload.playerId,
        })),
      };
    }
    case "PLAYER_LEFT": {
      if (!state.players) return state;
      return {
        ...state,
        players: state.players.filter(
          (pl) => pl.id !== action.payload.playerId,
        ),
      };
    }
    case "PLAYER_VOTED": {
      if (!state.players) return state;
      return {
        ...state,
        players: state.players.map((pl) => {
          return pl.id === action.payload.targetId
            ? { ...pl, votes: pl.votes + 1 }
            : pl;
        }),
      };
    }
    case "EXIT_TO_LOBBY": {
      return {
        ...state,
        lobby: {
          ...state.lobby,
          wordPairId: "",
          votingRound: state.lobby.votingRound + 1,
          gameStarted: false,
        },
        player: {
          ...state.player,
          isImposter: false,
          votes: 0,
          assignedWord: "",
        },
        players: state.players.map((x) => ({
          ...x,
          votes: 0,
          votedOut: false,
          inLobby: x.id === state.player.id ? true : x.inLobby,
        })),
      };
    }
    case "PLAYER_INFO": {
      if (!state.players || !state.player) return state;
      return {
        ...state,
        lobby: { ...state.lobby, gameStarted: true },
        player: {
          ...state.player,
          assignedWord: action.payload.assignedWord,
          isImposter: action.payload.isImposter,
          votes: 0,
          votedOut: false,
        },
        players: state.players.map((x) => ({
          ...x,
          inLobby: false,
          votes: 0,
          votedOut: false,
        })),
      };
    }
    case "GAME_OVER": {
      if (!state.players) return state;
      return {
        ...state,
        players: state.players.map((x) => {
          if (x.id === action.payload.lastPlayerToBeVotedOutId) {
            return { ...x, votedOut: true };
          } else {
            return x;
          }
        }),
      };
    }
    case "PLAYER_BACK_IN_LOBBY": {
      if (!state.players) return state;
      return {
        ...state,
        players: state.players.map((x) =>
          x.id === action.payload.playerId ? { ...x, inLobby: true } : x,
        ),
      };
    }
    case "PLAYER_VOTED_OUT": {
      if (!state.players) return state;
      return {
        ...state,
        players: state.players.map((x) => {
          if (x.id === action.payload.playerId) {
            return { ...x, votedOut: true };
          } else {
            return x;
          }
        }),
      };
    }
    case "SET_LOBBY": {
      return { ...action.payload };
    }
    case "VOTES_COUNTED": {
      if (!state.players) return state;
      return {
        ...state,
        players: state.players.map((x) => {
          const match = action.payload.votes.find((v) => v.id === x.id);

          return match ? { ...x, votes: +match.voteCount } : x;
        }),
      };
    }
    case "RESET": {
      return {} as LobbyType;
    }
  }
}
