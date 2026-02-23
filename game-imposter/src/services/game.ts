import { GameOptions, JoinLobbyInput } from "@/lib/types";

const url = "http://localhost:4000/api/lobby";

export async function createLobby({
  name,
  options,
}: {
  name: string;
  options: GameOptions;
}) {
  // post req
  try {
    const response = await fetch(`${url}/create`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, options }),
    });
    return response.json();
  } catch (err) {
    console.log(err);
  }
}

export async function joinLobby({ name, code }: JoinLobbyInput) {
  try {
    const response = await fetch(`${url}/join`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ name, code }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  } catch (err) {
    console.log(err);
  }
}
