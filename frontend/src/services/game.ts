import { GameOptions, JoinLobbyInput } from "shared-types";

const url = import.meta.env.VITE_API_URL + "/api/lobby";
// const url = "http://localhost:4000/api/lobby";

export async function createLobby({
  name,
  options,
}: {
  name: string;
  options: GameOptions;
}) {
  try {
    const response = await fetch(`${url}/create`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, options }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error ?? "Lobby creation failed");
    }
    const { token, lobby, player } = await response.json();

    localStorage.setItem("token", token);
    return { lobby, player };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function joinLobby({ name, code }: JoinLobbyInput) {
  try {
    const response = await fetch(`${url}/join`, {
      method: "POST",

      body: JSON.stringify({ name, code }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error ?? "Lobby creation failed");
    }
    const { token, lobby, player, players } = await response.json();
    localStorage.setItem("token", token);
    return { lobby, player, players };
  } catch (err) {
    console.error(err);
    throw err;
  }
}
