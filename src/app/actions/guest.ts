"use server";

import {refresh} from "next/cache";

import {requireGuest} from "@/lib/auth/guards";
import {currentGuestSessionHash} from "@/lib/auth/session";
import {changeGuestPassword, updateOwnContact} from "@/lib/data/guests";
import {parse, runAction} from "@/lib/actions";
import {changePasswordSchema, contactSchema} from "@/lib/validation";

export async function updateContact(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const guest = await requireGuest();
    const input = parse(contactSchema, formData);
    await updateOwnContact(guest.id, input);
    refresh();
  });
}

export async function changePassword(_prev: unknown, formData: FormData) {
  return runAction(async () => {
    const guest = await requireGuest();
    const input = parse(changePasswordSchema, formData);
    await changeGuestPassword(guest.id, input.currentPassword, input.password, await currentGuestSessionHash());
  });
}
