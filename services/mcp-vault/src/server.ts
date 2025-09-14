import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getContextHandler } from "./contextTool.js";

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
        handler: getContextHandler
      }
    }
  }
);

// Connect only when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await server.connect(new StdioServerTransport());
}
