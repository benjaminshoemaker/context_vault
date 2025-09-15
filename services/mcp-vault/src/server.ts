import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
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
      description: "Fetch UserContextV0 from vault-api (plain-text by default; include JSON when MCP_INCLUDE_JSON=1)",
    },
    async () => {
      const result = await getContextHandler();
      return result;
    }
  );

  server.registerTool(
    "healthCheck",
    {
      title: "Health Check",
      description: "Verify vault-api connectivity and basic MCP readiness",
    },
    async () => {
      const baseUrl = process.env.VAULT_URL || "http://localhost:4000";
      try {
        const data = await fetchContext(baseUrl);
        const fullName = data?.identity?.fullName ?? "unknown";
        const text = `ok: vault-api reachable at ${baseUrl}, identity: ${fullName}`;
        // Health returns text only for maximum compatibility
        return { content: [{ type: 'text', text }] };
      } catch (e: any) {
        const text = `unhealthy: failed to reach ${baseUrl}: ${e?.message || String(e)}`;
        return { content: [{ type: 'text', text }], isError: true } as any;
      }
    }
  );

  // Optional JSON-RPC outgoing payload logger
  if (process.env.MCP_LOG_RPC === '1') {
    // Patch the underlying Server.send to log outgoing messages
    try {
      const baseSend = (server.server as any).send?.bind(server.server);
      if (typeof baseSend === 'function') {
        (server.server as any).send = async (message: unknown, options?: unknown) => {
          try {
            // eslint-disable-next-line no-console
            console.log('[MCP RPC OUT]', JSON.stringify(message));
          } catch {}
          return baseSend(message, options);
        };
      }
    } catch {}
  }

  return server;
}

export function buildHttpApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Optional debug logging: enable with MCP_LOG_HTTP=1
  if (process.env.MCP_LOG_HTTP === '1') {
    app.use((req, res, next) => {
      const accept = req.headers.accept;
      const ct = req.headers['content-type'];
      const sid = req.headers['mcp-session-id'];
      const proto = req.headers['mcp-protocol-version'];
      let isInit = false;
      try {
        isInit = req.method === 'POST' && isInitializeRequest(req.body);
      } catch {}
      const started = Date.now();
      res.on('finish', () => {
        console.log(
          `[MCP HTTP] ${req.method} ${req.path} status=${res.statusCode} accept=${accept} ct=${ct} sid=${sid} proto=${proto} init=${isInit} ${Date.now() - started}ms`
        );
      });
      next();
    });
  }

  // Session store for stateful transport
  const transports: Record<string, StreamableHTTPServerTransport> = {};
  const servers: Record<string, McpServer> = {};

  app.post("/mcp", async (req, res) => {
    try {
      const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;

      let transport: StreamableHTTPServerTransport | undefined;
      let server: McpServer | undefined;

      if (sessionIdHeader && transports[sessionIdHeader]) {
        // Existing session
        transport = transports[sessionIdHeader];
        server = servers[sessionIdHeader];
      } else if (!sessionIdHeader && isInitializeRequest(req.body)) {
        // New session via initialization
        const newServer = createServer();
        server = newServer;

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: process.env.MCP_JSON_RESP === '1',
          onsessioninitialized: (sid: string) => {
            // eslint-disable-next-line no-console
            console.warn('Storing session', sid);
            transports[sid] = transport!;
            servers[sid] = newServer;
          },
        });

        // Clean up when transport closes
        transport.onclose = () => {
          const sid = transport!.sessionId;
          if (sid) {
            delete transports[sid];
            delete servers[sid];
          }
        };

        await newServer.connect(transport);
      } else {
        // Debug: show known sessions
        // eslint-disable-next-line no-console
        console.warn('No valid session, known sessions:', Object.keys(transports), 'requested:', sessionIdHeader);
        // Invalid: non-init without session, or unknown session
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }

      // Delegate handling to the transport
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

  // SSE stream for notifications (requires session)
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (_req, res) => {
    const sessionId = _req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.writeHead(400).end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
        id: null
      }));
      return;
    }
    await transports[sessionId].close();
    delete transports[sessionId];
    delete servers[sessionId];
    res.writeHead(200).end();
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
