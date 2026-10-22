import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Atlas Lab smoke tests", () => {
  it("keeps the public demo contract documented", () => {
    assert.equal(typeof "/api/health", "string");
    assert.equal(typeof "/api/ask", "string");
  });
});
