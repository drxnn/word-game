import { Router } from "express";
import * as gameController from "../controllers/gameControllers";
import { validateBody } from "../middlewares/validateBody";

const router = Router();

/**
 * POST /api/game/:code/start
 * body: { starterId?: string }
 */
router.post("/:code/start", gameController.startGame);

/**
 * GET /api/game/:code/state
 */
router.get("/:code/state", gameController.getGameState);

/**
 * POST /api/game/:code/reveal
 * body: { playerId: string }
 * endpoint to mark player revealed their card (optional UX)
 */
router.post(
  "/:code/reveal",
  validateBody(["playerId"]),
  gameController.revealWord
);

/**
 * POST /api/game/:code/vote
 * body: { voterId: string, targetId: string }
 */
router.post(
  "/:code/vote",
  validateBody(["voterId", "targetId"]),
  gameController.vote
);

/**
 * POST /api/game/:code/end
 * body: {}
 */
router.post("/:code/end", gameController.endGame);

export default router;
