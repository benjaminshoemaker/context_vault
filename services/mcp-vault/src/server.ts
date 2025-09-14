import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fetch from "node-fetch";

const VAULT_URL = process.env.VAULT_URL || "http://localhost:4000";

const server = new Server(
  { name: "mcp-vault", version: "0.1.0" },
  {
    resources: [{
      uri: "mcp+vault://context",
      name: "User Context v0",
      mimeType: "application/json"
    }],
    tools: {
      getContext: {
        description: "Return UserContextV0 JSON",
        inputSchema: { type: "object", properties: { scopes: { type: "array", items: { type: "string" } } }, required: ["scopes"] },
        handler: async () => {
          const r = await fetch(`${VAULT_URL}/v0/context`);
          const data = await r.json();
          return { content: [{ type: "json", data }] };
        }
      }
    }
  }
);

await server.connect(new StdioServerTransport());
