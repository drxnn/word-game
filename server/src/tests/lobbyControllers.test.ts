import request from "supertest";
import { app } from "../main";
import { strict as assert } from "node:assert";

async function testCreateLobby() {
  console.log("Testing: Create Lobby...");

  const response = await request(app)
    .post("/lobbies")
    .send({
      name: "Alice",
      options: { imposterKnows: false },
    });

  assert.strictEqual(response.status, 201, "Status should be 201");
  assert.ok(response.body.lobby, "Should have lobby property");
  assert.ok(response.body.lobby.lobby.code, "Should have lobby code");

  console.log("✓ Create Lobby passed");
  return response.body.lobby;
}
