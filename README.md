# AI Context Vault — Phase 1

Monorepo with two runnable parts:
- `vault-api`: Node+TS Express server exposing `GET /v0/context`.
- `mcp-vault`: Node+TS MCP server exposing a `getContext` tool that fetches from `vault-api`.

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
- `mcp-vault` runs as an MCP stdio server.

## Acceptance checks
- API check:
```bash
curl http://localhost:4000/v0/context | jq .identity.fullName
# => "Ben Shoemaker"
```
- MCP server (separate shell):
```bash
# Start mcp-vault dev
pnpm -C services/mcp-vault dev
# It starts without error and exposes the `getContext` tool for MCP clients.
```

Optionally, you can exercise the MCP server by connecting an MCP-compatible client and invoking the `getContext` tool. By default it fetches from `VAULT_URL` (defaults to `http://localhost:4000`).

## Project layout
- `services/vault-api`: Express server source.
- `services/mcp-vault`: MCP stdio server source.
- `packages/schema`: Shared JSON schema (UserContextV0).
- `tsconfig.base.json`: Shared TS config (NodeNext, ES2022, strict).
