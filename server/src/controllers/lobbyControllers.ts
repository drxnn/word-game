import { Request, Response, NextFunction } from "express";
import { GameManager } from "../services/gameManager";
import {
  createLobbySchema,
  joinLobbySchema,
  leaveLobbySchema,
  getLobbySchema,
  deleteLobbySchema,
} from "shared-types";
import { z } from "zod";
import { getLobbyByCode } from "../db/models/lobbies";
import jwt from "jsonwebtoken";
import { lobbyTracker } from "../services/lobbyCleanup";

export async function createLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, options } = req.body;

    const parsed = createLobbySchema.safeParse({ name, options });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }

    const { lobby, player } = await GameManager.startLobby(parsed.data);

    const token = jwt.sign(
      {
        playerId: player.id,
        lobbyId: lobby.id,
        code: lobby.code,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "2h" },
    );

    lobbyTracker(lobby.id);
    return res.status(201).json({ lobby, player, token });
  } catch (err) {
    next(err);
  }
}

export async function joinLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, code } = req.body;

    const parsed = joinLobbySchema.safeParse({ name, code });
    if (!parsed.success) {
      const prettyError = z.prettifyError(parsed.error);
      return res.status(400).send(prettyError);
    }

    const { player, players, lobby } = await GameManager.joinLobby(parsed.data);

    const token = jwt.sign(
      {
        playerId: player.id,
        lobbyId: lobby.id,
        code: lobby.code,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "2h" },
    );

    return res.status(200).json({ player, players, lobby, token });
  } catch (err) {
    next(err);
  }
}

export async function getLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { code } = req.params;
  let parsed = getLobbySchema.safeParse({ code });

  if (!parsed.success) {
    const prettyError = z.prettifyError(parsed.error);
    return res.status(400).send(prettyError);
  }
  try {
    let lobby = await getLobbyByCode(parsed.data.code);

    return res.status(200).json({ lobby });
  } catch (err) {
    next(err);
  }
}
