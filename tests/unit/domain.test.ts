import {beforeEach, describe, expect, it} from "vitest";

import {SYSTEM_ACTOR} from "@/lib/data/audit";
import {dashboardStats, listActivities, listGallery, listGalleryAlbums} from "@/lib/data/content";
import {
  authenticateGuest,
  changeGuestPassword,
  checkInGuest,
  createGuest,
  getGuestByCode,
  normalizeGuestCode,
  normalizePhone,
  setGuestActive,
} from "@/lib/data/guests";
import {
  cancelDraw,
  drawGrandPrize,
  finalizeDraw,
  getGameResult,
  isTeddyEligible,
  listDrawEntries,
  listDraws,
  listGameResults,
  markTeddyCollected,
  saveGameResult,
  undoTeddyCollection,
  winRate,
} from "@/lib/data/prizes";
import {authenticateStaff, listStaff, updateStaff} from "@/lib/data/staff";
import {DEMO_GUEST_PASSWORD} from "@/lib/db/seed";
import {resetDb, run} from "@/lib/db";
import {AppError} from "@/lib/errors";

const desk = {type: "staff" as const, id: "desk", name: "Test Desk"};

async function expectAppError(fn: () => unknown, key: string) {
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).key).toBe(key);
    return;
  }
  throw new Error(`Expected AppError(${key})`);
}

beforeEach(async () => {
  await resetDb();
});

describe("seed", () => {
  it("creates a ready-to-run event", async () => {
    expect((await listStaff()).map((s) => s.role).sort()).toEqual(["admin", "itdesk", "reception"]);
    expect((await listActivities()).length).toBeGreaterThan(4);
    expect((await listGallery()).length).toBe(4);
    // 2025 and 2026 folders exist from the start; 2025 is empty until photos are added.
    expect((await listGalleryAlbums()).map(({year, count}) => ({year, count}))).toEqual([
      {year: 2026, count: 4},
      {year: 2025, count: 0},
    ]);
    expect(await listGallery({year: 2025})).toHaveLength(0);
    expect((await dashboardStats()).guests).toBe(3);
    expect(await getGameResult((await getGuestByCode("G-1001"))!.id)).toMatchObject({gamesPlayed: 4, gamesWon: 3, winRate: 75, eligible: true});
  });
});

describe("normalization", () => {
  it("normalizes phones and guest codes", async () => {
    expect(normalizePhone("3300 0001")).toBe("+97333000001");
    expect(normalizePhone("00973 3300-0001")).toBe("+97333000001");
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizeGuestCode("g1001")).toBe("G-1001");
    expect(normalizeGuestCode("NDG:G-1002")).toBe("G-1002");
    expect(normalizeGuestCode(" 1003 ")).toBe("G-1003");
  });
});

describe("guest accounts", () => {
  it("registers with sequential codes, rejects duplicate phones, and logs in by code or phone", async () => {
    const {guest, temporaryPassword} = await createGuest({fullName: "Ali Hasan", phone: "39998877", source: "reception", checkIn: true}, desk);
    expect(guest.code).toBe("G-1004");
    expect(guest.phone).toBe("+97339998877");
    expect(guest.checkedInAt).not.toBeNull();
    expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);

    await expectAppError(() => createGuest({fullName: "Dup", phone: "+973 3999 8877", source: "self", password: "abc12345"}, desk), "phoneTaken");

    expect((await authenticateGuest("g-1004", temporaryPassword!)).id).toBe(guest.id);
    expect((await authenticateGuest("39998877", temporaryPassword!)).id).toBe(guest.id);
    await expectAppError(() => authenticateGuest("G-1004", "wrong"), "invalidCredentials");
  });

  it("blocks inactive guests and supports password change", async () => {
    const guest = (await getGuestByCode("G-1003"))!;
    await changeGuestPassword(guest.id, DEMO_GUEST_PASSWORD, "NewPass123", null);
    expect((await authenticateGuest("G-1003", "NewPass123")).id).toBe(guest.id);
    await expectAppError(() => changeGuestPassword(guest.id, "bad", "Other1234", null), "wrongPassword");

    await setGuestActive(guest.id, false, SYSTEM_ACTOR);
    await expectAppError(() => authenticateGuest("G-1003", "NewPass123"), "accountInactive");
    await expectAppError(() => checkInGuest("G-1003", desk), "guestInactive");
  });

  it("check-in is idempotent", async () => {
    expect((await checkInGuest("G-1003", desk)).alreadyCheckedIn).toBe(false);
    expect((await checkInGuest("G-1003", desk)).alreadyCheckedIn).toBe(true);
  });
});

describe("IT Desk game results & teddy bear", () => {
  const itDesk = {actor: desk, role: "itdesk" as const};
  const admin = {actor: {type: "staff" as const, id: null, name: "Admin"}, role: "admin" as const};

  it("calculates the winning rate and the 75% teddy bear rule exactly (spec examples)", async () => {
    expect([isTeddyEligible(4, 3), isTeddyEligible(8, 6), isTeddyEligible(10, 7), isTeddyEligible(10, 8)]).toEqual([true, true, false, true]);
    expect([winRate(4, 3), winRate(8, 6), winRate(10, 7), winRate(10, 8), winRate(3, 2)]).toEqual([75, 75, 70, 80, 66.7]);
    expect(isTeddyEligible(0, 0)).toBe(false);
    expect(winRate(0, 0)).toBeNull();
  });

  it("records and replaces totals, rejecting impossible results and unknown guests", async () => {
    const first = await saveGameResult({guestCode: "G-1003", gamesPlayed: 3, gamesWon: 2}, itDesk);
    expect(first).toMatchObject({winRate: 66.7, eligible: false});
    const updated = await saveGameResult({guestCode: "g1003", gamesPlayed: 4, gamesWon: 3}, itDesk);
    expect(updated).toMatchObject({gamesPlayed: 4, gamesWon: 3, eligible: true});
    expect((await listGameResults({filter: "eligible"})).map((row) => row.guestCode).sort()).toEqual(["G-1001", "G-1003"]);

    await expectAppError(() => saveGameResult({guestCode: "G-1003", gamesPlayed: 2, gamesWon: 3}, itDesk), "wonExceedsPlayed");
    await expectAppError(() => saveGameResult({guestCode: "G-9999", gamesPlayed: 1, gamesWon: 1}, itDesk), "guestNotFound");
  });

  it("hands each qualifying guest exactly one teddy bear and locks their results for desk staff", async () => {
    const fatima = (await getGuestByCode("G-1001"))!.id;
    const yousef = (await getGuestByCode("G-1002"))!.id;
    await expectAppError(() => markTeddyCollected(yousef, desk), "notEligible"); // 2/4 = 50%
    await expectAppError(async () => markTeddyCollected((await getGuestByCode("G-1003"))!.id, desk), "noResults");

    await markTeddyCollected(fatima, desk);
    await expectAppError(() => markTeddyCollected(fatima, desk), "teddyAlreadyCollected");
    expect((await listGameResults({filter: "collected"})).map((row) => row.guestCode)).toEqual(["G-1001"]);

    // After collection, only an administrator may change the results.
    await expectAppError(() => saveGameResult({guestCode: "G-1001", gamesPlayed: 4, gamesWon: 4}, itDesk), "resultLocked");
    expect((await saveGameResult({guestCode: "G-1001", gamesPlayed: 4, gamesWon: 4}, admin)).gamesWon).toBe(4);

    await undoTeddyCollection(fatima, admin.actor);
    expect((await getGameResult(fatima))!.teddyCollectedAt).toBeNull();
  });
});

describe("grand prize draw", () => {
  it("draws registered Guest IDs fairly, never the same ID twice, one open draw at a time", async () => {
    const all = (await listDrawEntries()).map((entry) => entry.code);
    expect(all).toEqual(["G-1001", "G-1002", "G-1003"]);

    const first = await drawGrandPrize({}, desk);
    expect(all).toContain(first.guestCode);
    expect(first).toMatchObject({status: "drawn", entries: 3});
    await expectAppError(() => drawGrandPrize({}, desk), "drawPending");
    await finalizeDraw(first.id, desk);
    await expectAppError(() => finalizeDraw(first.id, desk), "drawSettled");

    const second = await drawGrandPrize({}, desk);
    expect(second.guestCode).not.toBe(first.guestCode);
    expect(second.entries).toBe(2);
    await cancelDraw(second.id, desk); // winner absent: that ID is excluded from later draws too

    const third = await drawGrandPrize({}, desk);
    expect([first.guestCode, second.guestCode]).not.toContain(third.guestCode);
    await finalizeDraw(third.id, desk);
    await expectAppError(() => drawGrandPrize({}, desk), "noEntries");
    expect((await listDraws()).map((draw) => draw.status).sort()).toEqual(["final", "final", "void"]);
  });

  it("can restrict entries to checked-in guests and excludes inactive accounts", async () => {
    await expectAppError(() => drawGrandPrize({checkedInOnly: true}, desk), "noEntries");
    await checkInGuest("G-1002", desk);
    await setGuestActive((await getGuestByCode("G-1003"))!.id, false, SYSTEM_ACTOR);
    expect((await listDrawEntries()).map((entry) => entry.code)).toEqual(["G-1001", "G-1002"]);
    expect((await drawGrandPrize({checkedInOnly: true}, desk)).guestCode).toBe("G-1002");
  });

  it("picks uniformly at random", async () => {
    // 600 draws over 3 entries: each guest should win roughly a third of the time.
    const wins: Record<string, number> = {};
    for (let round = 0; round < 600; round += 1) {
      await run("DELETE FROM grand_prize_draws"); // fresh draw each round, same 3 entries
      const draw = await drawGrandPrize({}, desk);
      wins[draw.guestCode] = (wins[draw.guestCode] ?? 0) + 1;
    }
    for (const code of ["G-1001", "G-1002", "G-1003"]) {
      expect(wins[code]).toBeGreaterThan(140);
      expect(wins[code]).toBeLessThan(260);
    }
  });

  describe("at event scale (500 students registered at the IT Desk)", () => {
    beforeEach(async () => {
      // Bulk insert like scripts/test-guests.mjs (hashing 500 passwords would only slow the test down).
      const now = new Date().toISOString();
      for (let index = 1; index <= 500; index += 1) {
        await run(
          `INSERT INTO guests (id, code, full_name, phone, password_hash, is_active, source, checked_in_at, created_at, updated_at)
           VALUES (:id, :code, :name, :phone, 'x', 1, 'reception', :checkedIn, :now, :now)`,
          {id: `load-${index}`, code: `G-${2000 + index}`, name: `Student ${index}`, phone: `+97339${String(index).padStart(6, "0")}`, checkedIn: index % 5 ? now : null, now},
        );
      }
    });

    it("draws every one of 503 Guest IDs exactly once, quickly, then reports no entries", async () => {
      expect(await listDrawEntries()).toHaveLength(503);
      expect(await listDrawEntries({checkedInOnly: true})).toHaveLength(400);

      const winners = new Set<string>();
      const started = performance.now();
      for (let round = 0; round < 503; round += 1) {
        const draw = await drawGrandPrize({}, desk);
        expect(draw.entries).toBe(503 - round);
        expect(winners.has(draw.guestCode)).toBe(false);
        winners.add(draw.guestCode);
        if (round % 7 === 0) await cancelDraw(draw.id, desk);
        else await finalizeDraw(draw.id, desk);
      }
      const perDraw = (performance.now() - started) / 503;
      expect(winners.size).toBe(503);
      expect(perDraw).toBeLessThan(50); // milliseconds — instant on the big screen
      await expectAppError(() => drawGrandPrize({}, desk), "noEntries");
    }, 30_000);

    it("gives every Guest ID the same chance among 500 entries", async () => {
      // Winners grouped into 10 bands of ~50 Guest IDs: each band should win about a tenth of 2000 draws.
      await run("DELETE FROM guests WHERE id NOT LIKE 'load-%'");
      const bands = Array.from({length: 10}, () => 0);
      for (let round = 0; round < 2000; round += 1) {
        await run("DELETE FROM grand_prize_draws");
        const number = Number((await drawGrandPrize({}, desk)).guestCode.slice(2)) - 2001;
        bands[Math.floor(number / 50)] += 1;
      }
      for (const wins of bands) {
        expect(wins).toBeGreaterThan(130);
        expect(wins).toBeLessThan(270);
      }
    }, 30_000); // 2,000 draws: slower than Vitest's 5 s default on a busy machine
  });
});

describe("staff", () => {
  it("authenticates and protects the last admin", async () => {
    const admin = await authenticateStaff("ADMIN", "Admin@2026");
    expect(admin.role).toBe("admin");
    await expectAppError(() => authenticateStaff("admin", "nope"), "invalidCredentials");
    await expectAppError(() => updateStaff(admin.id, {fullName: admin.fullName, role: "itdesk", isActive: true}, {type: "staff", id: admin.id, name: admin.fullName}), "cannotChangeSelf");
    await expectAppError(() => updateStaff(admin.id, {fullName: admin.fullName, role: "admin", isActive: false}, desk), "lastAdmin");
  });
});

describe("bilingual evening programme", () => {
  it("seeds the poster-style programme with Arabic titles and splits all-evening attractions", async () => {
    const {localizeActivity} = await import("@/lib/data/content");
    const {currentOrNext, isOngoing, toInstant} = await import("@/lib/event-time");
    const activities = await listActivities();
    const draw = activities.find((item) => item.title === "Grand Prize Draw")!;

    expect(localizeActivity(draw, "ar")).toMatchObject({title: "السحب على الجائزة الكبرى", alt: "Grand Prize Draw"});
    expect(localizeActivity(draw, "en")).toMatchObject({title: "Grand Prize Draw", alt: "السحب على الجائزة الكبرى"});
    expect(activities.filter(isOngoing).map((item) => item.title).sort()).toEqual(["Carnival Games", "Food Trucks"]);

    // At 18:00 the Liwa band is on stage — not the food trucks that are also running.
    expect(currentOrNext(activities, toInstant("2026-12-16", "18:00"))?.title).toBe("Liwa – Traditional Band");
    // Between segments, the next stage item is chosen.
    expect(currentOrNext(activities, toInstant("2026-12-16", "21:00"))?.title).toBe("Grand Prize Draw");
  });

  it("falls back to English when an activity has no Arabic text", async () => {
    const {localizeActivity} = await import("@/lib/data/content");
    const plain = {...(await listActivities())[0], titleAr: null, locationAr: null, descriptionAr: null};
    expect(localizeActivity(plain, "ar")).toMatchObject({title: plain.title, alt: null, location: plain.location});
  });
});

describe("gallery albums", () => {
  const PNG = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64"));

  it("creates folders, files photos only into existing ones, and deletes only empty ones", async () => {
    const {addGalleryImage, createAlbum, deleteAlbum} = await import("@/lib/data/content");
    const upload = (albumYear: number) => addGalleryImage({title: "Archive", category: "General", albumYear, bytes: PNG}, SYSTEM_ACTOR);

    await expectAppError(() => upload(2024), "albumNotFound");
    await createAlbum(2024, SYSTEM_ACTOR);
    await expectAppError(() => createAlbum(2024, SYSTEM_ACTOR), "albumExists");
    await upload(2024);
    expect((await listGalleryAlbums()).map((album) => album.year)).toEqual([2026, 2025, 2024]);

    await expectAppError(() => deleteAlbum(2024, SYSTEM_ACTOR), "albumNotEmpty");
    await deleteAlbum(2025, SYSTEM_ACTOR);
    expect((await listGalleryAlbums()).map((album) => album.year)).toEqual([2026, 2024]);
  });
});
