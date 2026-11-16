import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { jevDevProxy } from "./src/jev/devProxy.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    // Always replace these two names with strings. If one is left unset, Vite
    // falls back to the whole import.meta.env object and would ship every
    // VITE_ variable, including the Jev key.
    define: {
      "import.meta.env.VITE_API_KEY": JSON.stringify(env.VITE_API_KEY || ""),
      "import.meta.env.VITE_MOCK_GEMINI": JSON.stringify(env.VITE_MOCK_GEMINI || ""),
    },
    plugins: [react(), jevDevProxy()],
    build: {
      target: "es2022",
    },
    esbuild: {
      target: "es2022",
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "es2022",
      },
    },
  };
});
