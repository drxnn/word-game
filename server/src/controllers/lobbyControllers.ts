import { Request, Response, NextFunction } from "express";
import { GameManager } from "../services/gameManager";
import {
  createLobbySchema,
  joinLobbySchema,
  leaveLobbySchema,
  DeleteLobbySchema,
  getLobbySchema,
  deleteLobbySchema,
} from "../schemas/gameSchema";
import { z } from "zod";
import { getLobbyByCode } from "../db/models/lobbies";

/**
 * Create a lobby
 */
export async function createLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    console.log("we are here");
    const { name, options } = req.body;
    // generate a websocket token for authentication later on

    const parsed = createLobbySchema.safeParse({ name, options });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }
    console.log("body:", req.body);
    console.log("options type:", typeof options);
    console.log("parsed.data is: ", parsed.data);

    const lobby = await GameManager.startLobby(parsed.data);
    return res.status(201).json({ lobby });
  } catch (err) {
    next(err);
  }
}

/**
 * Join an existing lobby
 */
export async function joinLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // dont forget ws token
    const { code } = req.params;
    const { name } = req.body;
    let parsed = joinLobbySchema.safeParse({ name, code });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }

    const lobbyPlayers = await GameManager.joinLobby(parsed.data);
    console.log("we are here, after the call to joinLobby");

    return res.status(200).json({ lobbyPlayers });
  } catch (err) {
    next(err);
  }
}

/**
 * Leave a lobby
 */
export async function leaveLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { code } = req.params;
    const { playerId } = req.body;
    let parsed = leaveLobbySchema.safeParse({ code, playerId });

    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }

    await GameManager.leaveLobby(parsed.data);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Get lobby info
 */

export async function getLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { code } = req.params;
  let parsed = getLobbySchema.safeParse(code);

  if (!parsed.success) {
    const prettyError = z.prettifyError(parsed.error);
    return res.status(400).send(prettyError);
  }
  try {
    let lobby = await getLobbyByCode(parsed.data.code);

    return res.status(200).json({ lobby });
  } catch (err) {
    next(err);
  }
}

export async function deleteLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.body;
  const parsed = deleteLobbySchema.safeParse(id);

  if (!parsed.success) {
    const prettyError = z.prettifyError(parsed.error);
    return res.status(400).send(prettyError);
  }
  try {
    let lobby = await GameManager.deleteLobby(parsed.data.id);

    res.json({ lobby });
  } catch (err) {
    next(err);
  }
}

/**
 * List lobbies
 */
// export async function listLobbies(
//   _req: Request,
//   res: Response,
//   next: NextFunction,
// ) {
//   try {
//   } catch (err) {
//     next(err);
//   }
// }
