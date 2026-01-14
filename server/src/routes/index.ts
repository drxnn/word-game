import { Router } from "express";
import lobbyRoutes from "./lobbyRoutes";
import gameRoutes from "./gameRoutes";

const router = Router();

router.use("/lobby", lobbyRoutes);
router.use("/game", gameRoutes);

export default router;
