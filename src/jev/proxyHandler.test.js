import assert from "node:assert/strict";
import test from "node:test";
import { handleJevProxy } from "./proxyHandler.js";
import { JEV_UPSTREAM_URL } from "./messages.js";

function request(body, { method = "POST", authorization = "" } = {}) {
  const headers = { "content-type": "application/json" };
  if (authorization) headers.authorization = authorization;
  return new Request("http://local/api/jev", {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

const payload = {
  state: "Practice question:\nTell me about a bug.\n\nTimestamped transcript:\n[0:02] um I checked the logs",
  model: "jev-preview",
  questions: {
    cadence: { type: "score", instructions: "How even is the pace?", criteria: ["rushed", "even"] },
  },
};

test("a missing key returns a clear error and does not call Jev", async () => {
  let calls = 0;
  const response = await handleJevProxy(request(payload), {
    env: { VITE_JEV_API_KEY: "  " },
    fetchImpl: async () => {
      calls += 1;
      return new Response("nope");
    },
  });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error, "missing_key");
  assert.match(body.message, /VITE_JEV_API_KEY/);
  assert.match(body.message, /\/api\/jev/);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(body).includes("secret"), false);
});

test("the proxy sends the server key to System One and ignores a browser key", async () => {
  let seen;
  const response = await handleJevProxy(
    request(payload, { authorization: "Bearer browser-key" }),
    {
      env: { JEV_API_KEY: "server-key" },
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return new Response(JSON.stringify({ model: "jev-1.13.0", answers: {}, usage: {} }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": "session=secret" },
        });
      },
    },
  );
  assert.equal(seen.url, JEV_UPSTREAM_URL);
  assert.equal(seen.init.headers.authorization, "Bearer server-key");
  assert.equal(seen.init.method, "POST");
  const forwarded = JSON.parse(seen.init.body);
  assert.equal(forwarded.model, "jev-latest");
  assert.equal(forwarded.state, payload.state);
  assert.equal(forwarded.questions.cadence.type, "score");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), null);
  const text = await response.text();
  assert.equal(text.includes("server-key"), false);
  assert.equal(text.includes("browser-key"), false);
});

test("non-POST, bad JSON, and an upstream failure stay on this server", async () => {
  const method = await handleJevProxy(new Request("http://local/api/jev", { method: "GET" }), {
    env: { VITE_JEV_API_KEY: "server-key" },
    fetchImpl: async () => {
      throw new Error("should not be called");
    },
  });
  assert.equal(method.status, 405);

  const bad = await handleJevProxy(
    new Request("http://local/api/jev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    }),
    {
      env: { VITE_JEV_API_KEY: "server-key" },
      fetchImpl: async () => {
        throw new Error("should not be called");
      },
    },
  );
  assert.equal(bad.status, 400);

  const down = await handleJevProxy(request(payload), {
    env: { VITE_JEV_API_KEY: "server-key" },
    fetchImpl: async () => {
      throw new Error("connect ECONNREFUSED");
    },
  });
  const body = await down.json();
  assert.equal(down.status, 502);
  assert.equal(body.error, "upstream");
  assert.match(body.detail, /ECONNREFUSED/);
  assert.equal(JSON.stringify(body).includes("server-key"), false);
});
