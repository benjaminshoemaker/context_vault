# AI Context Vault — Phase 1

Monorepo with two runnable parts:
- `vault-api`: Node+TS Express server exposing `GET /v0/context`.
- `mcp-vault`: Node+TS MCP HTTP server (Streamable HTTP) exposing tools:
  - `getContext` (plain-text summary by default; can include JSON)
  - `healthCheck` (simple connectivity check)

## Prerequisites
- Node.js 20+
- Corepack (bundled with Node 18+) with pnpm enabled: `corepack enable`.

## Install
```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm i
```

## Run both services (dev)
```bash
pnpm dev
```
- `vault-api` listens on `http://localhost:4000`.
- `mcp-vault` listens on `http://localhost:5058/mcp` (stateful Streamable HTTP MCP).

## Acceptance checks
- API check:
```bash
curl http://localhost:4000/v0/context | jq .identity.fullName
# => "Ben Shoemaker"
```
- MCP server (HTTP) quick check (JSON-RPC initialize):
```bash
curl -sS \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{"tools":{}},"clientInfo":{"name":"local","version":"0.0.0"}}}' \
  http://127.0.0.1:5058/mcp | jq .result.serverInfo

# List tools (stateless):
curl -sS \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  http://127.0.0.1:5058/mcp | jq .result.tools

# Call getContext tool (stateless):
curl -sS \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"getContext","arguments":{"scopes":["identity:read"]}}}' \
  http://127.0.0.1:5058/mcp | jq '.result.content[0]'
```

Optionally, connect an MCP client that supports Streamable HTTP to `http://localhost:5058/mcp` and invoke the tools. By default it fetches from `VAULT_URL` (defaults to `http://localhost:4000`).

## Recommended env for ChatGPT
- Easiest: use scripts
  - `pnpm dev:chatgpt` → runs both; mcp-vault with JSON responses, vault-api at 127.0.0.1:4000
  - `pnpm dev:debug` → same as above plus verbose logs (transport, tools, RPC)

- Manual env (if you prefer):
  - `VAULT_URL=http://127.0.0.1:4000` (explicit IPv4 loopback)
  - `MCP_JSON_RESP=1` (POST responses as JSON bodies)
  - Default tool output is plain-text; to also include JSON content set `MCP_INCLUDE_JSON=1`.
  - Optional logs while debugging: `MCP_LOG_HTTP=1` (transport), `MCP_LOG_TOOLS=1` (tool), `MCP_LOG_RPC=1` (outgoing JSON-RPC).

## New tool: healthCheck
- Returns a one-line status (text) indicating if `vault-api` is reachable and basic identity info.
- Useful to verify connectivity inside ChatGPT before calling `getContext`.

## Project layout
- `services/vault-api`: Express server source.
- `services/mcp-vault`: MCP stdio server source.
- `packages/schema`: Shared JSON schema (UserContextV0).
- `tsconfig.base.json`: Shared TS config (NodeNext, ES2022, strict).
