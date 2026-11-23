"use client";

import {Gift, Undo2} from "lucide-react";

import {collectTeddy, undoTeddy} from "@/app/actions/prizes";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {ConfirmButton} from "@/components/ui/dialog";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";

export function CollectTeddyButton({guestId, guestName, guestCode}: {guestId: string; guestName: string; guestCode: string}) {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  return (
    <ConfirmButton
      variant="primary"
      message={t("prizes.teddy.collectConfirm", {name: guestName, code: guestCode})}
      confirmLabel={t("prizes.teddy.collect")}
      onConfirm={async () => {
        const result = await collectTeddy(guestId);
        if (result.ok) toast("success", t("prizes.teddy.collectedToast", {name: guestName}));
        else toast("error", errorMessage(result));
      }}
    >
      <Gift className="size-4" aria-hidden />
      {t("prizes.teddy.collect")}
    </ConfirmButton>
  );
}

/** Administrators only: reverse a collection recorded by mistake. */
export function UndoTeddyButton({guestId, guestCode}: {guestId: string; guestCode: string}) {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  return (
    <ConfirmButton
      variant="secondary"
      message={t("prizes.teddy.undoConfirm", {code: guestCode})}
      confirmLabel={t("prizes.teddy.undo")}
      onConfirm={async () => {
        const result = await undoTeddy(guestId);
        if (result.ok) toast("success", t("prizes.teddy.undone"));
        else toast("error", errorMessage(result));
      }}
    >
      <Undo2 className="size-4 rtl:-scale-x-100" aria-hidden />
      <span className="max-sm:sr-only">{t("prizes.teddy.undo")}</span>
    </ConfirmButton>
  );
}
