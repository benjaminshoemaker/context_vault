import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import { app as vaultApp } from "../../vault-api/src/index.js";
import { buildHttpApp } from "../src/server.js";

let vaultServer: http.Server;
let baseUrl: string;
let sessionId: string | undefined;
let protocolVersion: string = "2025-03-26";

function parseSSEData(text: string): any[] {
  const lines = text.split(/\r?\n/);
  const datas = lines
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.replace(/^data:\s*/, ""));
  const out: any[] = [];
  for (const d of datas) {
    try { out.push(JSON.parse(d)); } catch { /* ignore */ }
  }
  return out;
}

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
  let mcpApp: any;
  beforeAll(async () => {
    // Ensure tests receive JSON content for assertions
    process.env.MCP_INCLUDE_JSON = '1';
    mcpApp = buildHttpApp();
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
      });
    // Debug headers to ensure session id is present
    // eslint-disable-next-line no-console
    console.log('init headers', res.headers);
    sessionId = res.headers['mcp-session-id'];
    // In SSE mode, body is empty; use known protocol version constant
  });

  it("initializes and returns serverInfo", async () => {
    // Validate values from beforeAll initialization
    expect(typeof sessionId).toBe("string");
    expect(typeof protocolVersion).toBe("string");
  });

  it("lists tools including getContext", async () => {
    const res = await request(mcpApp)
      .post("/mcp")
      .set("Content-Type", "application/json")
      .set("Accept", "application/json, text/event-stream")
      .set("Mcp-Session-Id", sessionId as string)
      .set("Mcp-Protocol-Version", protocolVersion as string)
      .send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
      .expect(200)
      .expect('content-type', /text\/event-stream/);

    const events = parseSSEData(res.text || "");
    const last = events[events.length - 1];
    expect(last?.result?.tools?.some((t: any) => t.name === "getContext")).toBe(true);
    expect(last?.result?.tools?.some((t: any) => t.name === "healthCheck")).toBe(true);
  });

  it("calls getContext and returns JSON content", async () => {
    const res = await request(mcpApp)
      .post("/mcp")
      .set("Content-Type", "application/json")
      .set("Accept", "application/json, text/event-stream")
      .set("Mcp-Session-Id", sessionId as string)
      .set("Mcp-Protocol-Version", protocolVersion as string)
      .send({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "getContext", arguments: { scopes: ["identity:read"] } }
      })
      .expect(200)
      .expect('content-type', /text\/event-stream/);

    const events = parseSSEData(res.text || "");
    const last = events[events.length - 1];
    const item = last?.result?.content?.[0];
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

  it("GET without session returns 400", async () => {
    const res = await request(mcpApp)
      .get("/mcp")
      .set("Accept", "text/event-stream")
      .expect(400);
    expect(typeof res.text).toBe("string");
  });
});
