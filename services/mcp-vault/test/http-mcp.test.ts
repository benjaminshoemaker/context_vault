import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import { app as vaultApp } from "../../vault-api/src/index.js";
import { buildHttpApp } from "../src/server.js";

let vaultServer: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    vaultServer = http.createServer(vaultApp).listen(0, () => resolve());
  });
  const addr = vaultServer.address();
  if (addr && typeof addr === "object") {
    baseUrl = `http://127.0.0.1:${addr.port}`;
    process.env.VAULT_URL = baseUrl;
  } else {
    throw new Error("failed to get vault-api address");
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => vaultServer.close(() => resolve()));
});

describe("HTTP MCP server /mcp", () => {
  const mcpApp = buildHttpApp();

  it("initializes and returns serverInfo", async () => {
    const res = await request(mcpApp)
      .post("/mcp")
      .set("Content-Type", "application/json")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          clientInfo: { name: "vitest", version: "0.0.0" }
        }
      })
      .expect(200);

    expect(res.body?.result?.serverInfo?.name).toBe("mcp-vault");
  });

  it("lists tools including getContext", async () => {
    const res = await request(mcpApp)
      .post("/mcp")
      .set("Content-Type", "application/json")
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
      .expect(200);

    const tools = res.body?.result?.tools || [];
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.some((t: any) => t.name === "getContext")).toBe(true);
  });

  it("calls getContext and returns JSON content", async () => {
    const res = await request(mcpApp)
      .post("/mcp")
      .set("Content-Type", "application/json")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "getContext", arguments: { scopes: ["identity:read"] } }
      })
      .expect(200);

    const item = res.body?.result?.content?.[0];
    expect(item?.type).toBe("json");
    expect(typeof item?.data?.identity?.fullName).toBe("string");
  });

  it("returns 406 when Accept header is missing", async () => {
    const res = await request(mcpApp)
      .post("/mcp")
      .set("Content-Type", "application/json")
      // No Accept header on purpose
      .send({
        jsonrpc: "2.0",
        id: 99,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          clientInfo: { name: "vitest", version: "0.0.0" }
        }
      })
      .expect(406);

    const text = res.text || JSON.stringify(res.body || {});
    expect(text).toMatch(/Not Acceptable/);
  });
});
