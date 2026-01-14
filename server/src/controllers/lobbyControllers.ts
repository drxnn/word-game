import { Request, Response, NextFunction } from "express";
import { GameManager } from "../helpers/gameManager";

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
    const lobby = GameManager.createLobby({ hostName: name, options });
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
    if (!name || !code) {
      res.status(400).send("name or lobby code is missing");
    }
    const player = GameManager.joinLobby(code, name);
    // when lobby is joined, player needs to be added to the data as part of the lobby in "players"
    // request to db

    return res.status(200).json({ player });
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
    GameManager.leaveLobby(code, playerId);
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
