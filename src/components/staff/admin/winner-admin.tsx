"use client";

import {Megaphone, Trophy} from "lucide-react";
import {useRef, useState, useTransition} from "react";

import {lookupGuest} from "@/app/actions/desk";
import {adminAnnounceWinner, adminWithdrawWinner} from "@/app/actions/ranks";
import {useActionForm, useErrorMessage} from "@/components/forms/use-action-form";
import {Button} from "@/components/ui/button";
import {ConfirmButton, Dialog} from "@/components/ui/dialog";
import {FormAlert, TextAreaField, TextField} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";

const PRIZE_SUGGESTIONS = ["Grand prize", "الجائزة الكبرى", "Teddy bear", "دبدوب", "Best National Day outfit", "أفضل زي وطني"];

/**
 * Announce a winner: the administrator chooses the guest and the prize, then confirms with the
 * guest's name shown — nothing is sent until "Yes, announce". The server re-checks the role.
 */
export function WinnerAnnouncer() {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const formElement = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState<{name: string; code: string; prize: string} | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const form = useActionForm(adminAnnounceWinner, {
    resetOnSuccess: true,
    onSuccess: (data) => {
      setConfirming(null);
      toast("success", t("staff.winners.announced", {name: data.name}));
    },
  });

  // Step 1: check the Guest ID and show who it is before anything is announced.
  const review = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get("guestCode") ?? "").trim();
    const prize = String(data.get("prize") ?? "").trim();
    setLookupError(null);
    form.reset();
    if (!code || !prize) {
      setLookupError(t("errors.invalidInput"));
      return;
    }
    startChecking(async () => {
      const result = await lookupGuest(code);
      if (!result.ok) setLookupError(errorMessage(result));
      else setConfirming({name: result.data.fullName, code: result.data.code, prize});
    });
  };

  // Step 2: confirmed — submit the same form to the server action.
  const announce = () => {
    const element = formElement.current;
    if (element) form.onSubmit({preventDefault() {}, currentTarget: element} as unknown as React.FormEvent<HTMLFormElement>);
  };

  return (
    <>
      <form ref={formElement} onSubmit={review} className="space-y-4" noValidate>
        {lookupError ? <FormAlert>{lookupError}</FormAlert> : null}
        {form.error ? <FormAlert>{form.error}</FormAlert> : null}
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <TextField label={t("staff.winners.guestCode")} name="guestCode" placeholder="G-1001" required dir="ltr" autoComplete="off" error={form.fieldError("guestCode")} />
          <TextField label={t("staff.winners.prize")} name="prize" list="prize-suggestions" required hint={t("staff.winners.prizeHint")} error={form.fieldError("prize")} />
          <datalist id="prize-suggestions">
            {PRIZE_SUGGESTIONS.map((prize) => (
              <option key={prize} value={prize} />
            ))}
          </datalist>
        </div>
        <TextAreaField label={t("staff.winners.message")} name="message" optional rows={2} maxLength={300} error={form.fieldError("message")} />
        <Button type="submit" pending={checking} className="h-12 w-full sm:w-auto">
          {!checking ? <Megaphone className="size-4" aria-hidden /> : null}
          {checking ? t("staff.winners.checking") : t("staff.winners.announce")}
        </Button>
      </form>

      <Dialog open={confirming !== null} onClose={() => !form.pending && setConfirming(null)} title={t("staff.winners.confirmTitle")} size="sm">
        {confirming ? (
          <>
            <div className="flex items-start gap-3 rounded-2xl bg-gold-wash/70 p-4 ring-1 ring-gold/20">
              <Trophy className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden />
              <p className="text-ink-soft">{t("staff.winners.confirmBody", {name: confirming.name, code: confirming.code, prize: confirming.prize})}</p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirming(null)} disabled={form.pending}>
                {t("common.cancel")}
              </Button>
              <Button onClick={announce} pending={form.pending}>
                {t("staff.winners.confirm")}
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

export function WithdrawWinner({id, name, prize}: {id: string; name: string; prize: string}) {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  return (
    <ConfirmButton
      message={t("staff.winners.withdrawConfirm", {name, prize})}
      confirmLabel={t("staff.winners.withdraw")}
      onConfirm={async () => {
        const result = await adminWithdrawWinner(id);
        if (result.ok) toast("success", t("staff.winners.withdrawn"));
        else toast("error", errorMessage(result));
      }}
    >
      {t("staff.winners.withdraw")}
    </ConfirmButton>
  );
}
