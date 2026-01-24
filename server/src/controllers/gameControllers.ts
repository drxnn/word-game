import { Request, Response, NextFunction } from "express";
import { GameManager } from "../services/gameManager";
import {
  endGameSchema,
  getGameStateSchema,
  startGameSchema,
  voteSchema,
} from "../schemas/gameSchema";
import { z } from "zod";
/**
 * Start a game in a lobby (choose imposters, assign words, create game state)
 */
export async function startGame(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { lobbyId, options } = req.body;
  const parsed = startGameSchema.safeParse({ lobbyId, options });
  if (!parsed.success) {
    const prettyError = z.prettifyError(parsed.error);
    return res.status(400).send(prettyError);
  }
  try {
    await GameManager.startGame(parsed.data.lobbyId, parsed.data.options);
  } catch (err) {
    next(err);
  }
}

/**
 * Get game state
 */
export async function getGameState(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { lobbyId } = req.params;
    const parsed = getGameStateSchema.safeParse({ lobbyId });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }
    const lobby = await GameManager.getLobby(parsed.data.lobbyId);
    return res.status(200).json({ lobby });
  } catch (err) {
    next(err);
  }
}

/**
 * Cast a vote
 */

export async function vote(req: Request, res: Response, next: NextFunction) {
  try {
    const { lobbyId, voterId, targetId } = req.body;
    const parsed = voteSchema.safeParse({ lobbyId, voterId, targetId });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }
    const votedPlayer = await GameManager.castVote(
      parsed.data.lobbyId,
      parsed.data.voterId,
      parsed.data.targetId,
    );
    return res.status(200).json({ votedPlayer });
  } catch (err) {
    next(err);
  }
}

export async function endGame(req: Request, res: Response, next: NextFunction) {
  try {
    const { lobbyId } = req.body;
    const parsed = endGameSchema.safeParse({ lobbyId });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }
    const lobby = await GameManager.deleteLobby(parsed.data.lobbyId);
    return res.status(200).json({ lobby });
  } catch (err) {
    next(err);
  }
}
