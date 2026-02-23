import { Router } from "express";
import lobbyRoutes from "./lobbyRoutes";

const router = Router();

router.use("/lobby", lobbyRoutes);

export default router;
