import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` ships a module that throws on import so a client bundle
      // fails loudly. Vitest resolves that variant; the tests here ARE the
      // server, so point at the no-op the react-server condition would pick.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    // Only unit-testable logic lives under src/lib; components are verified in
    // a real browser against the production build (see README).
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
