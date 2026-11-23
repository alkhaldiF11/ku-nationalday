"use server";

import {refresh} from "next/cache";
import {z} from "zod";

import {DESK_ACCESS, requireStaff} from "@/lib/auth/guards";
import {cancelDraw, drawGrandPrize, finalizeDraw, markTeddyCollected, saveGameResult, undoTeddyCollection} from "@/lib/data/prizes";
import {staffActor} from "@/lib/data/staff";
import {parse, runAction} from "@/lib/actions";
import {gameResultSchema} from "@/lib/validation";

/*
 * Games & Prizes actions. Every one re-checks the staff session and role:
 *   • IT Desk staff (and admins) record results and hand out teddy bears;
 *   • only administrators correct locked records, undo a collection, or run the grand prize draw.
 * Guests have no actions here at all — their results are read-only.
 */

const uuid = z.uuid();

export async function recordGameResult(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const staff = await requireStaff(DESK_ACCESS.itdesk);
    const input = parse(gameResultSchema, formData);
    const result = await saveGameResult({guestCode: input.code, gamesPlayed: input.gamesPlayed, gamesWon: input.gamesWon}, {actor: staffActor(staff), role: staff.role});
    refresh();
    return result;
  });
}

export async function collectTeddy(guestId: string) {
  return runAction(async () => {
    const staff = await requireStaff(DESK_ACCESS.itdesk);
    const result = await markTeddyCollected(uuid.parse(guestId), staffActor(staff));
    refresh();
    return result;
  });
}

export async function undoTeddy(guestId: string) {
  return runAction(async () => {
    const staff = await requireStaff(["admin"]);
    await undoTeddyCollection(uuid.parse(guestId), staffActor(staff));
    refresh();
  });
}

export async function runGrandPrizeDraw(options: {checkedInOnly: boolean}) {
  return runAction(async () => {
    const staff = await requireStaff(DESK_ACCESS.draw);
    const draw = await drawGrandPrize({checkedInOnly: options?.checkedInOnly === true}, staffActor(staff));
    return draw; // the page refreshes after the on-screen reveal, not before
  });
}

export async function finalizeGrandPrizeDraw(drawId: string) {
  return runAction(async () => {
    const staff = await requireStaff(DESK_ACCESS.draw);
    await finalizeDraw(uuid.parse(drawId), staffActor(staff));
    refresh();
  });
}

export async function cancelGrandPrizeDraw(drawId: string) {
  return runAction(async () => {
    const staff = await requireStaff(DESK_ACCESS.draw);
    await cancelDraw(uuid.parse(drawId), staffActor(staff));
    refresh();
  });
}
