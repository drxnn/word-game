import { Router } from "express";
import * as lobbyController from "../controllers/lobbyControllers";

const router = Router();

/**
 * POST /api/lobby/create
 * body: { name: string, options?: { imposterCount?: number, imposterKnows?: boolean } }
 */
router.post("/create", lobbyController.createLobby);

router.post("/join", lobbyController.joinLobby);

export default router;
