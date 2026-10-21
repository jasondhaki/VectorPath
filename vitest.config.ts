import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": root, "server-only": fileURLToPath(new URL("tests/setup/server-only-stub.ts", import.meta.url)) } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], setupFiles: ["tests/setup/block-network.mjs"], environment: "node" },
      },
      {
        extends: true,
        test: { name: "integration", include: ["tests/integration/**/*.test.ts"], setupFiles: ["tests/setup/block-network.mjs"], environment: "node", fileParallelism: false },
      },
    ],
  },
});
