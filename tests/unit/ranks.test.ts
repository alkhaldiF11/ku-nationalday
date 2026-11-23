import {beforeEach, describe, expect, it} from "vitest";

import {addAttendance, currentEventYear, getRankThresholds, guestRank, listRankedGuests, rankStats, removeAttendance, saveRankThresholds} from "@/lib/data/attendance";
import {checkInGuest, createGuest, getGuestByCode, setGuestActive} from "@/lib/data/guests";
import {announceWinner, guestAwards, markAwardSeen, unseenAwards, withdrawAnnouncement} from "@/lib/data/winners";
import {resetDb} from "@/lib/db";
import {AppError} from "@/lib/errors";
import {DEFAULT_THRESHOLDS, rankFor, validThresholds} from "@/lib/ranks";

const admin = {type: "staff" as const, id: "admin-1", name: "Event Administrator"};

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

describe("rank rules", () => {
  it("map attendance counts to ranks with the configured thresholds", () => {
    expect(DEFAULT_THRESHOLDS).toEqual({silver: 1, gold: 2, platinum: 3, crystal: 5});
    expect(rankFor(0)).toMatchObject({rank: null, next: "silver", nextAt: 1, percent: 0});
    expect(rankFor(1)).toMatchObject({rank: "silver", next: "gold", nextAt: 2});
    expect(rankFor(2)).toMatchObject({rank: "gold", next: "platinum"});
    expect(rankFor(4)).toMatchObject({rank: "platinum", next: "crystal", nextAt: 5, percent: 80});
    expect(rankFor(3)).toMatchObject({rank: "platinum", percent: 60});
    expect(rankFor(9)).toMatchObject({rank: "crystal", next: null, nextAt: null, percent: 100});
    expect(validThresholds({silver: 1, gold: 3, platinum: 6, crystal: 10})).toBe(true);
    expect(validThresholds({silver: 1, gold: 1, platinum: 6, crystal: 10})).toBe(false);
    expect(validThresholds({silver: 0, gold: 2, platinum: 3, crystal: 4})).toBe(false);
  });
});

describe("attendance", () => {
  it("counts a check-in once per year — never a registration alone", async () => {
    const year = await currentEventYear();
    const {guest} = await createGuest({fullName: "New Guest", phone: "+97333441122", source: "reception"}, admin);
    expect((await guestRank(guest.id)).attended).toBe(0); // registered, not attended

    await checkInGuest(guest.code, admin);
    await checkInGuest(guest.code, admin); // scanned twice
    const rank = await guestRank(guest.id);
    expect(rank.history).toEqual([expect.objectContaining({year, source: "checkin"})]);
    expect(rank.rank).toBe("silver");

    // Desk registration with "check in now" counts too.
    const walkIn = await createGuest({fullName: "Walk In", phone: "+97333441133", source: "reception", checkIn: true}, admin);
    expect((await guestRank(walkIn.guest.id)).attended).toBe(1);
  });

  it("keeps a yearly history, refuses duplicates, and moves up through every rank", async () => {
    const guest = (await getGuestByCode("G-1001"))!;
    const ranks: Array<string | null> = [];
    for (const year of [2022, 2023, 2024, 2025, 2026]) {
      await addAttendance(guest.id, year, admin);
      ranks.push((await guestRank(guest.id)).rank);
    }
    expect(ranks).toEqual(["silver", "gold", "platinum", "platinum", "crystal"]);
    await expectAppError(() => addAttendance(guest.id, 2024, admin), "attendanceExists");
    expect((await guestRank(guest.id)).history.map((record) => record.year)).toEqual([2026, 2025, 2024, 2023, 2022]);

    await removeAttendance(guest.id, 2022, admin);
    expect((await guestRank(guest.id)).rank).toBe("platinum");
    await expectAppError(() => removeAttendance(guest.id, 2022, admin), "notFound");
  });

  it("uses administrator thresholds everywhere, and only valid ones", async () => {
    const guest = (await getGuestByCode("G-1002"))!;
    for (const year of [2025, 2026]) await addAttendance(guest.id, year, admin);
    expect((await guestRank(guest.id)).rank).toBe("gold");

    await expectAppError(() => saveRankThresholds({silver: 2, gold: 2, platinum: 3, crystal: 4}, admin), "invalidThresholds");
    await saveRankThresholds({silver: 1, gold: 3, platinum: 5, crystal: 8}, admin);
    expect(await getRankThresholds()).toEqual({silver: 1, gold: 3, platinum: 5, crystal: 8});
    expect((await guestRank(guest.id)).rank).toBe("silver");

    const stats = await rankStats();
    expect(stats.counts.silver).toBeGreaterThanOrEqual(1);
    const silver = await listRankedGuests({rank: "silver"});
    expect(silver.guests.map((item) => item.code)).toContain("G-1002");
    const none = await listRankedGuests({rank: "none"});
    expect(none.guests.map((item) => item.code)).toContain("G-1003");
  });
});

describe("winner announcements", () => {
  it("are chosen by an administrator, shown once, and kept in the guest's history", async () => {
    const fatima = (await getGuestByCode("G-1001"))!;
    const yousef = (await getGuestByCode("G-1002"))!;
    const award = await announceWinner({guestCode: "g-1001", prize: "Grand Prize", message: "See you on stage!"}, admin);
    expect(award).toMatchObject({guestCode: "G-1001", prize: "Grand Prize", message: "See you on stage!", seenAt: null});

    // Duplicate (case and spacing don't matter); unknown or inactive guests are refused.
    await expectAppError(() => announceWinner({guestCode: "G-1001", prize: "  grand prize "}, admin), "winnerDuplicate");
    await expectAppError(() => announceWinner({guestCode: "G-9999", prize: "Teddy bear"}, admin), "guestNotFound");
    await setGuestActive(yousef.id, false, admin);
    await expectAppError(() => announceWinner({guestCode: "G-1002", prize: "Teddy bear"}, admin), "guestInactive");

    // Only the winner sees it; another guest can't mark it as seen.
    expect(await unseenAwards(yousef.id)).toHaveLength(0);
    expect(await unseenAwards(fatima.id)).toHaveLength(1);
    await markAwardSeen(yousef.id, award.id);
    expect(await unseenAwards(fatima.id)).toHaveLength(1);

    // Dismissed: no more pop-up, but still in the history.
    await markAwardSeen(fatima.id, award.id);
    expect(await unseenAwards(fatima.id)).toHaveLength(0);
    expect((await guestAwards(fatima.id)).map((item) => item.prize)).toEqual(["Grand Prize"]);

    await withdrawAnnouncement(award.id, admin);
    expect(await guestAwards(fatima.id)).toHaveLength(0);
  });
});
