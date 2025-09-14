import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { app as vaultApp } from "../../vault-api/src/index.js";
import { fetchContext } from "../src/contextTool.js";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";

let server: http.Server;
let baseUrl: string;
const schema = JSON.parse(
  readFileSync(new URL("../../../packages/schema/userContext.schema.json", import.meta.url), "utf-8")
);
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = http.createServer(vaultApp).listen(0, () => resolve());
  });
  const addr = server.address();
  if (addr && typeof addr === "object") {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  } else {
    throw new Error("failed to get server address");
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("mcp-vault getContext handler", () => {
  it("fetches JSON from vault-api", async () => {
    const data = await fetchContext(baseUrl);
    expect(data.identity?.fullName).toBe("Ben Shoemaker");
    const ok = validate(data);
    if (!ok) {
      // eslint-disable-next-line no-console
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });
});
