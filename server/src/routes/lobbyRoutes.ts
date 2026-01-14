import { Router } from "express";
import * as lobbyController from "../controllers/lobbyControllers";
import { validateBody } from "../middlewares/validateBody";

const router = Router();

/**
 * POST /api/lobby/create
 * body: { name: string, options?: { imposterCount?: number, imposterKnows?: boolean } }
 */
router.post("/create", validateBody(["name"]), lobbyController.createLobby);

/**
 * POST /api/lobby/:code/join
 * body: { name: string }
 */
router.post("/:code/join", validateBody(["name"]), lobbyController.joinLobby);

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
  lobbyController.leaveLobby
);

/**
 * GET /api/lobby (list lobbies - useful for dev)
 */
router.get("/", lobbyController.listLobbies);

export default router;
