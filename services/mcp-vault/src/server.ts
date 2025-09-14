import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getContextHandler } from "./contextTool.js";

function createServer() {
  const server = new McpServer(
    { name: "mcp-vault", version: "0.1.0" },
    {}
  );

  server.registerTool(
    "getContext",
    {
      title: "Return UserContextV0 JSON",
      description: "Fetch UserContextV0 from vault-api",
    },
    async () => {
      const result = await getContextHandler();
      return result;
    }
  );

  return server;
}

export function buildHttpApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  app.get("/mcp", async (_req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null
    }));
  });

  app.delete("/mcp", async (_req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null
    }));
  });

  return app;
}

async function startHttpServer() {
  const app = buildHttpApp();
  const port = Number(process.env.MCP_PORT || 5058);
  app.listen(port, () => {
    console.log(`mcp-vault HTTP MCP listening on :${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startHttpServer();
}
