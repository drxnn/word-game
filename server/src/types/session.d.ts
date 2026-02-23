import "express-session";
import { Lobby, Player } from "../schemas/gameSchema";

declare module "express-session" {
  interface SessionData {
    player: Player;
    lobby: Lobby;
  }
}
