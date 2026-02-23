import { Request, Response, NextFunction } from "express";
import { GameManager } from "../services/gameManager";
import {
  createLobbySchema,
  joinLobbySchema,
  leaveLobbySchema,
  getLobbySchema,
  deleteLobbySchema,
} from "shared-types";
import { success, z } from "zod";
import { getLobbyByCode } from "../db/models/lobbies";

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
    req.session.player = player;
    req.session.lobby = lobby;

    return res.status(201).json({ lobby, player });
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

    req.session.player = player;
    req.session.lobby = lobby;

    return res.status(200).json({ player, players, lobby });
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

export async function deleteLobby(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.body;
  const parsed = deleteLobbySchema.safeParse(id);

  if (!parsed.success) {
    const prettyError = z.prettifyError(parsed.error);
    return res.status(400).send(prettyError);
  }
  try {
    let lobby = await GameManager.deleteLobby(parsed.data.id);

    return res.status(204).send({ lobby });
  } catch (err) {
    next(err);
  }
}
