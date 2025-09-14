AI Context Vault — Agent Notes

Scope: Entire repository

Stack
- Node.js 20+
- pnpm workspaces; run from repo root
- TypeScript with NodeNext modules; use tsx for dev (no build step)

Conventions
- Keep services minimal and production‑legible. Prefer small modules and explicit exports.
- Use the shared tsconfig at `tsconfig.base.json`. Service tsconfigs should extend it.
- ESM only (`"type": "module"`). Avoid CommonJS patterns.
- Do not add a compile/build step; dev runs via `tsx`.
- Keep dependencies lean. Favor stdlib and small libs.

Services
- `services/vault-api`: Express app. Export the `app` from `src/index.ts`. Only call `listen()` when executed directly.
- `services/mcp-vault`: MCP stdio server. Keep the tool logic isolated (see `src/contextTool.ts`). Only connect in `server.ts` when executed directly.

Testing
- Use Vitest at the repo root. Tests live near each service in `test/` folders.
- API tests: use Supertest against the exported Express `app`.
- MCP tests: import the tool functions directly and, if needed, launch an ephemeral HTTP server from the API app on a random port.
- Add fast, deterministic tests only. Avoid networked or timing‑fragile tests.

Scripts
- Dev: `pnpm dev` runs both services via `concurrently`.
- Tests: `pnpm test` for CI; `pnpm test:watch` for local iteration.

Style
- Strict TypeScript, prefer explicit types at module boundaries.
- No inline copyright or license headers.
- Keep patches minimal and focused on the task at hand.

Notes
- No auth or DB for Phase‑1.
- Schema lives at `packages/schema/userContext.schema.json`.
