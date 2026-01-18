import { Request, Response, NextFunction } from "express";
import { GameManager } from "../services/gameManager";
import {
  createLobbySchema,
  joinLobbySchema,
  leaveLobbySchema,
} from "../schemas/gameSchema";
import { z } from "zod";

/**
 * Create a lobby
 */
export async function createLobby(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, options } = req.body;

    const parsed = createLobbySchema.safeParse({ name, options });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }

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
  next: NextFunction
) {
  try {
    const { code } = req.params;
    const { name } = req.body;
    let parsed = joinLobbySchema.safeParse({ name, code });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }

    const lobbyPlayers = await GameManager.joinLobby(parsed.data);

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
  next: NextFunction
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
  next: NextFunction
) {
  try {
    const { code } = req.params;
    const lobby = GameManager.getLobby(code);
    return res.json({ lobby });
  } catch (err) {
    next(err);
  }
}

/**
 * List lobbies (dev)
 */
export async function listLobbies(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const lobbies = GameManager.listLobbies();
    return res.json({ lobbies });
  } catch (err) {
    next(err);
  }
}
