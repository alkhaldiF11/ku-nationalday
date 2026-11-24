import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {defineConfig} from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      DATABASE_PATH: ":memory:",
      // Tests run against the demo fixtures (sample guests, staff and results).
      SEED_DEMO_DATA: "true",
      DATA_DIR: path.join(os.tmpdir(), "nationalday-vitest"),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
