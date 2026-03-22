import { ClientToServer } from "shared-types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000/";
export let socket: WebSocket | null = null;

export const startWsConnection = (wsUri = WS_URL) => {
  const token = localStorage.getItem("token");
  socket = new WebSocket(wsUri);

  socket.addEventListener("open", () => {
    console.log("connected to websocket");
    if (token) {
      socket?.send(
        JSON.stringify({
          type: "auth",
          msg: { token: token },
        }),
      );
    }
  });

  socket.addEventListener("error", (event) => {
    console.error("WebSocket error: ", event);
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
