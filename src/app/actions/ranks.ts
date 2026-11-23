"use server";

import {refresh} from "next/cache";
import {z} from "zod";

import {parse, runAction} from "@/lib/actions";
import {requireGuest, requireStaff} from "@/lib/auth/guards";
import {addAttendance, removeAttendance, saveRankThresholds} from "@/lib/data/attendance";
import {staffActor} from "@/lib/data/staff";
import {announceWinner, markAwardSeen, withdrawAnnouncement} from "@/lib/data/winners";
import {announceWinnerSchema, attendanceSchema, thresholdsSchema} from "@/lib/validation";

/* Every action re-checks the role on the server; the pages hiding buttons is not the boundary. */

const admin = async () => staffActor(await requireStaff(["admin"]));

export async function adminAddAttendance(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const actor = await admin();
    const input = parse(attendanceSchema, formData);
    await addAttendance(input.guestId, input.year, actor);
    refresh();
  });
}

export async function adminRemoveAttendance(guestId: string, year: number) {
  return runAction(async () => {
    const actor = await admin();
    const input = attendanceSchema.parse({guestId, year});
    await removeAttendance(input.guestId, input.year, actor);
    refresh();
  });
}

export async function adminSaveThresholds(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const actor = await admin();
    await saveRankThresholds(parse(thresholdsSchema, formData), actor);
    refresh();
  });
}

export async function adminAnnounceWinner(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const actor = await admin();
    const input = parse(announceWinnerSchema, formData);
    const announcement = await announceWinner({guestCode: input.guestCode, prize: input.prize, message: input.message}, actor);
    refresh();
    return {code: announcement.guestCode, name: announcement.guestName};
  });
}

export async function adminWithdrawWinner(id: string) {
  return runAction(async () => {
    const actor = await admin();
    await withdrawAnnouncement(z.uuid().parse(id), actor);
    refresh();
  });
}

/** The signed-in guest dismisses their own congratulations pop-up (never anyone else's). */
export async function dismissAward(id: string) {
  return runAction(async () => {
    const guest = await requireGuest();
    await markAwardSeen(guest.id, z.uuid().parse(id));
  });
}
