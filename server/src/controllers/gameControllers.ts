import { Request, Response, NextFunction } from "express";
import { GameManager } from "../helpers/gameManager";

/**
 * Start a game in a lobby (choose imposters, assign words, create game state)
 */
export async function startGame(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { code } = req.params;
    const { starterId } = req.body;
    const game = GameManager.startGame(code, starterId);
    return res.status(200).json({ game });
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
  next: NextFunction
) {
  try {
    const { code } = req.params;
    const state = GameManager.getGameState(code);
    return res.json({ state });
  } catch (err) {
    next(err);
  }
}

/**
 * Reveal word for a player (optional tracking)
 */
export async function revealWord(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { code } = req.params;
    const { playerId } = req.body;
    const player = GameManager.revealWord(code, playerId);
    return res.json({ player });
  } catch (err) {
    next(err);
  }
}

/**
 * Cast a vote
 */
export async function vote(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const { voterId, targetId } = req.body;
    const result = GameManager.castVote(code, voterId, targetId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * End game manually
 */
export async function endGame(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    GameManager.endGame(code);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
