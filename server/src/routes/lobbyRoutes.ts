import { Router } from "express";
import * as lobbyController from "../controllers/lobbyControllers";
import { validateBody } from "../middlewares/validateBody";

const router = Router();

/**
 * POST /api/lobby/create
 * body: { name: string, options?: { imposterCount?: number, imposterKnows?: boolean } }
 */
router.post("/create", lobbyController.createLobby);

router.delete("/delete/:id", lobbyController.deleteLobby);

/**
 * POST /api/lobby/:code/join
 * body:\
 */
router.post("/:code/join", lobbyController.joinLobby);

/**
 * GET /api/lobby/:code
 */
router.get("/:code", lobbyController.getLobby);

/**
 * POST /api/lobby/:code/leave
 * body: { playerId: string }
 */
router.post(
  "/:code/leave",
  validateBody(["playerId"]),
  lobbyController.leaveLobby,
);

/**

 */

export default router;
