import WebSocket, { RawData } from "ws";
import {
  ClientInfo,
  ClientToServer,
  ServerToClient,
} from "../schemas/gameSchema";

export const socketToClient = new WeakMap<WebSocket, ClientInfo>();
export const lobbyToSockets = new Map<string, Set<WebSocket>>();
export function addSocketToLobby(lobbyId: string, ws: WebSocket) {
  if (!lobbyId || !ws) return;

  let set = lobbyToSockets.get(lobbyId);

  if (!set) {
    set = new Set<WebSocket>();
    lobbyToSockets.set(lobbyId, set);
  }

  set.add(ws);
}

export const removeSocketFromLobby = (lobbyId: string, ws: WebSocket) => {
  if (!lobbyId || !ws) return;
  let set = lobbyToSockets.get(lobbyId);
  if (!set) return;
  set.delete(ws);

  if (!set || set.size === 0) {
    lobbyToSockets.delete(lobbyId);
  }
};

export const broadCastToLobby = (
  lobbyId: string,
  msg: ServerToClient | ClientToServer,
) => {
  let allSockets = lobbyToSockets.get(lobbyId);
  // make sure msg is stringified json
  let stringifiedMsg = JSON.stringify(msg);

  allSockets?.forEach((x) => {
    if (x.readyState === WebSocket.OPEN) {
      x.send(stringifiedMsg);
    }
  });
};
export const addToClientInfo = (
  ws: WebSocket,
  others: Partial<ClientInfo>,
  clientId: string,
) => {
  const prev = socketToClient.get(ws) ?? { clientId };
  const merged: ClientInfo = { ...prev, ...others, clientId: prev.clientId };
  socketToClient.set(ws, merged);
  return merged;
};

export const parseWsMessage = (
  data: RawData,
): { ok: true; value: any } | { ok: false; error: string } => {
  // goodfornow
  if (typeof data === "string") {
    try {
      return { ok: true, value: JSON.parse(data) };
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  if (Buffer.isBuffer(data)) {
    try {
      return { ok: true, value: JSON.parse(data.toString("utf8")) };
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  return { ok: false, error: "bad_payload_type" };
};

export const sendError = (ws: WebSocket, msg: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "error", msg }));
  }
};
