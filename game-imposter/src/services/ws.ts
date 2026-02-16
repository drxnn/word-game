import { ClientToServer, ServerToClientSchema } from "@/lib/types";

export let socket: WebSocket | null = null;

export const startWsConnection = (wsUri = "ws://localhost:4000/") => {
  socket = new WebSocket(wsUri);

  socket.addEventListener("open", () => {
    console.log("connected to websocket");
  });

  socket.addEventListener("message", (e) => {
    console.log(`message received: ${e.data}`);
    // theres a few types of different messages coming from the backend. Check and respond appropriately
    const message = JSON.parse(e.data);
  });

  socket.addEventListener("error", (event) => {
    console.log("WebSocket error: ", event);
  });

  return socket;
};

export const sendWsMessage = (msg: ClientToServer, socket: WebSocket) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
};
