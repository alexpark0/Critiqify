import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_QUESTION, isDemoMode } from "./demoMode.js";

test("demo mode is opt-in from the query string", () => {
  assert.equal(isDemoMode("?demo=1"), true);
  assert.equal(isDemoMode("demo=1"), true);
  assert.equal(isDemoMode(""), false);
  assert.equal(isDemoMode("?demo=0"), false);
  assert.equal(isDemoMode("?page=1"), false);
});

test("demo mode starts on a field-agnostic behavioral question", () => {
  assert.match(DEMO_QUESTION, /conflict/i);
  assert.match(DEMO_QUESTION, /[.?!]$/);
  assert.doesNotMatch(DEMO_QUESTION, /bug|software|engineer|technical/i);
});
