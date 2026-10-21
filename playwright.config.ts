import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const desktop = devices["Desktop Chrome"];

// Isolated server: separate build output and port; third-party network blocked server-side
// via NODE_OPTIONS and browser-side via tests/e2e/fixtures.ts.
// Viewport projects (ui-context §4): 375 mobile bar, 1024 icon rail, 1440 full sidebar.
// Width-specific specs are matched per project instead of skipped at runtime.
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "w375", testMatch: ["scaffold.spec.ts", "shell.spec.ts", "mobile.spec.ts"], use: { ...desktop, viewport: { width: 375, height: 812 } } },
    { name: "w1024", testMatch: ["shell.spec.ts", "rail.spec.ts"], use: { ...desktop, viewport: { width: 1024, height: 768 } } },
    { name: "w1440", testMatch: ["scaffold.spec.ts", "shell.spec.ts", "wide.spec.ts"], use: { ...desktop, viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATA_MODE: "fixtures",
      LLM_MODE: "mock",
      PERSONAL_LLM_ENABLED: "false",
      NODE_OPTIONS: "--import ./tests/setup/block-network.mjs",
    },
  },
});
