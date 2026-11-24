import {defineConfig, devices} from "@playwright/test";

const PORT = 3200;

/**
 * End-to-end tests run against a production build (`npm run build` first) with a
 * throwaway data directory that is wiped on every run, so results are repeatable.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 45_000,
  expect: {timeout: 10_000},
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{name: "chromium", use: {...devices["Desktop Chrome"]}}],
  webServer: {
    command: `node -e "require('fs').rmSync('.e2e-data',{recursive:true,force:true})" && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    // A throwaway database with the demo fixtures, wiped on every run.
    env: {DATA_DIR: ".e2e-data", SEED_DEMO_DATA: "true"},
  },
});
