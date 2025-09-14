import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";

const schema = JSON.parse(
  readFileSync(new URL("../../../packages/schema/userContext.schema.json", import.meta.url), "utf-8")
);
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

describe("GET /v0/context", () => {
  it("returns UserContextV0 with expected identity", async () => {
    const res = await request(app).get("/v0/context").expect(200);
    expect(res.body).toBeTruthy();
    expect(typeof res.body.identity?.fullName).toBe("string");
    expect(res.body.identity?.fullName.length).toBeGreaterThan(0);
    expect(res.body.prefs?.tone).toBe("concise");
    const ok = validate(res.body);
    if (!ok) {
      // For easier debugging on failure
      // eslint-disable-next-line no-console
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });
});
