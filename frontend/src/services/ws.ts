import { ClientToServer } from "shared-types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000/";
export let socket: WebSocket | null = null;

export const startWsConnection = (wsUri = WS_URL) => {
  socket = new WebSocket(wsUri);

  socket.addEventListener("open", () => {
    console.log("connected to websocket");
  });

  socket.addEventListener("error", (event) => {
    console.log("WebSocket error: ", event);
  });

  socket.addEventListener("close", () => {
    console.log("websocket connection closed");
  });
  return socket;
};

export const sendWsMessage = (msg: ClientToServer, socket: WebSocket) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
};
