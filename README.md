# AI Context Vault — Phase 1

Monorepo with two runnable parts:
- `vault-api`: Node+TS Express server exposing `GET /v0/context`.
- `mcp-vault`: Node+TS MCP HTTP server (Streamable HTTP) exposing a `getContext` tool that fetches from `vault-api`.

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
- `mcp-vault` listens on `http://localhost:5058/mcp` (stateless Streamable HTTP MCP).

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

Optionally, connect an MCP client that supports Streamable HTTP to `http://localhost:5058/mcp` and invoke the `getContext` tool. By default it fetches from `VAULT_URL` (defaults to `http://localhost:4000`).

## Project layout
- `services/vault-api`: Express server source.
- `services/mcp-vault`: MCP stdio server source.
- `packages/schema`: Shared JSON schema (UserContextV0).
- `tsconfig.base.json`: Shared TS config (NodeNext, ES2022, strict).
