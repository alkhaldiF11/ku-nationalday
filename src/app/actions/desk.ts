"use server";

import {refresh} from "next/cache";

import {DESK_ACCESS, requireStaff} from "@/lib/auth/guards";
import {checkInGuest, createGuest, getGuestByCode} from "@/lib/data/guests";
import {getGameResult} from "@/lib/data/prizes";
import {staffActor} from "@/lib/data/staff";
import {parse, runAction} from "@/lib/actions";
import {AppError} from "@/lib/errors";
import {deskRegisterSchema, guestCodeSchema} from "@/lib/validation";

export type DeskGuest = {
  id: string;
  code: string;
  fullName: string;
  isActive: boolean;
  checkedInAt: string | null;
  result: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number | null;
    eligible: boolean;
    teddyCollectedAt: string | null;
  } | null;
};

async function toDeskGuest(code: string): Promise<DeskGuest> {
  const guest = await getGuestByCode(code);
  if (!guest) {
    throw new AppError("guestNotFound");
  }
  const result = await getGameResult(guest.id);
  return {
    id: guest.id,
    code: guest.code,
    fullName: guest.fullName,
    isActive: guest.isActive,
    checkedInAt: guest.checkedInAt,
    result: result
      ? {gamesPlayed: result.gamesPlayed, gamesWon: result.gamesWon, winRate: result.winRate, eligible: result.eligible, teddyCollectedAt: result.teddyCollectedAt}
      : null,
  };
}

/** Any signed-in staff member can look a guest up from their desk. */
export async function lookupGuest(code: string) {
  return runAction(async () => {
    await requireStaff();
    const input = parse(guestCodeSchema, {code});
    return await toDeskGuest(input.code);
  });
}

export async function registerAtDesk(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const staff = await requireStaff(DESK_ACCESS.reception);
    const input = parse(deskRegisterSchema, formData);
    const {guest, temporaryPassword} = await createGuest({...input, source: "reception"}, staffActor(staff));
    refresh();
    return {code: guest.code, fullName: guest.fullName, temporaryPassword: temporaryPassword!};
  });
}

export async function checkIn(code: string) {
  return runAction(async () => {
    const staff = await requireStaff(DESK_ACCESS.reception);
    const {guest, alreadyCheckedIn} = await checkInGuest(parse(guestCodeSchema, {code}).code, staffActor(staff));
    refresh();
    return {guest: await toDeskGuest(guest.code), alreadyCheckedIn};
  });
}
