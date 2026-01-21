import ws = require("ws");

type ClientInfo = {
  clientId: string;
  lobbyId: string;
  playerId: string;
  name: string;
  code: string;
};

export class MyExtendedClass extends WebSocket {
  clientInfo?: ClientInfo;
}

declare module "ws" {
  namespace WebSocket {
    interface WebSocket {
      clientInfo?: ClientInfo;
    }
  }
}
