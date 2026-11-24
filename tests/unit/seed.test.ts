import {afterEach, describe, expect, it} from "vitest";

import {many, one, resetDb} from "@/lib/db";

afterEach(async () => {
  process.env.SEED_DEMO_DATA = "true"; // the other test files use the demo fixtures
  await resetDb();
});

describe("a new database", () => {
  it("contains only the administrator — no demo data unless SEED_DEMO_DATA=true", async () => {
    delete process.env.SEED_DEMO_DATA;
    await resetDb();
    expect(await many<{username: string; role: string}>(`SELECT username, role FROM staff_users`)).toEqual([{username: "admin", role: "admin"}]);
    for (const table of ["guests", "game_results", "announcements", "gallery_images", "activities", "registrations", "attendance"]) {
      expect((await one<{n: number}>(`SELECT COUNT(*) AS n FROM ${table}`))!.n, table).toBe(0);
    }
  });
});
