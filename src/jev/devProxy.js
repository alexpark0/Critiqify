/* eslint-env node */
import { loadEnv } from "vite";
import { handleJevProxy } from "./proxyHandler.js";

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function jevDevProxy() {
  return {
    name: "jev-dev-proxy",
    configureServer(server) {
      const fileEnv = loadEnv(server.config.mode, server.config.envDir || process.cwd(), "");
      server.middlewares.use("/api/jev", (req, res) => {
        readRequestBody(req)
          .then(async (body) => {
            const request = new Request("http://127.0.0.1/api/jev", {
              method: req.method,
              headers: { "content-type": req.headers["content-type"] || "application/json" },
              body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
            });
            const response = await handleJevProxy(request, {
              env: { ...process.env, ...fileEnv },
              fetchImpl: globalThis.fetch,
            });
            const text = await response.text();
            res.statusCode = response.status;
            res.setHeader("content-type", response.headers.get("content-type") || "application/json");
            res.end(text);
          })
          .catch((error) => {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({
              error: "proxy",
              message: "The local Jev proxy failed.",
              detail: error?.message || "",
            }));
          });
      });
    },
  };
}
