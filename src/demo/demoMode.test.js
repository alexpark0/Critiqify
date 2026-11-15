import assert from "node:assert/strict";
import test from "node:test";
import { isDemoMode } from "./demoMode.js";

test("demo mode is opt-in from the query string", () => {
  assert.equal(isDemoMode("?demo=1"), true);
  assert.equal(isDemoMode("demo=1"), true);
  assert.equal(isDemoMode(""), false);
  assert.equal(isDemoMode("?demo=0"), false);
  assert.equal(isDemoMode("?page=1"), false);
});
