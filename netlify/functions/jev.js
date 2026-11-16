import { handleJevProxy } from "../../src/jev/proxyHandler.js";

export default function handler(request) {
  return handleJevProxy(request, {
    env: process.env,
    fetchImpl: globalThis.fetch,
  });
}
