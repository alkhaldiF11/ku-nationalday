"use client";

import {Lock, Minus, Plus, Save} from "lucide-react";
import {useState} from "react";

import {recordGameResult} from "@/app/actions/prizes";
import {useActionForm} from "@/components/forms/use-action-form";
import {EligibilityBadge, TEDDY_THRESHOLD, WinRate} from "@/components/prizes/prize-badges";
import {Button} from "@/components/ui/button";
import {FormAlert} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";
import type {MessageKey} from "@/lib/i18n/core";

type Props = {
  guest: {code: string; fullName: string};
  current: {gamesPlayed: number; gamesWon: number; teddyCollectedAt: string | null} | null;
  isAdmin: boolean;
};

/** Live preview of the same rule the server applies (integer math, ≥ 75%). */
const qualifies = (played: number, won: number) => played > 0 && won * 100 >= TEDDY_THRESHOLD * played;

/**
 * IT Desk form: totals for one guest, prefilled with what's already recorded.
 * The win rate and teddy eligibility update as staff type; the server recalculates and enforces them.
 */
export function ResultRecorder({guest, current, isAdmin}: Props) {
  const {t} = useI18n();
  const toast = useToast();
  const [played, setPlayed] = useState(current?.gamesPlayed ?? 0);
  const [won, setWon] = useState(current?.gamesWon ?? 0);
  const form = useActionForm(recordGameResult, {
    onSuccess: (result) => toast("success", t("prizes.results.saved", {code: result.guestCode, won: result.gamesWon, played: result.gamesPlayed})),
  });

  const locked = Boolean(current?.teddyCollectedAt) && !isAdmin;
  const invalid = won > played;
  const rate = played > 0 ? Math.round((won / played) * 1000) / 10 : null;

  const stepper = (label: string, value: number, set: (next: number) => void, name: string) => (
    <div>
      <label htmlFor={`${name}-input`} className="text-sm font-semibold text-ink-soft">
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <button type="button" onClick={() => set(Math.max(0, value - 1))} disabled={locked || value <= 0} className="grid w-12 place-items-center rounded-xl bg-paper ring-1 ring-line-strong hover:bg-paper-deep disabled:opacity-40" aria-label={`${label} −1`}>
          <Minus className="size-4" />
        </button>
        <input
          id={`${name}-input`}
          name={name}
          type="number"
          inputMode="numeric"
          min={0}
          max={500}
          value={value}
          disabled={locked}
          onChange={(event) => set(Math.max(0, Math.min(500, Number(event.target.value) || 0)))}
          aria-invalid={form.fieldError(name) ? true : undefined}
          className="tabular h-14 w-full min-w-0 rounded-xl bg-card text-center font-display text-3xl font-semibold ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none disabled:bg-paper"
        />
        <button type="button" onClick={() => set(Math.min(500, value + 1))} disabled={locked} className="grid w-12 place-items-center rounded-xl bg-paper ring-1 ring-line-strong hover:bg-paper-deep disabled:opacity-40" aria-label={`${label} +1`}>
          <Plus className="size-4" />
        </button>
      </div>
      {form.fieldError(name) ? <p className="mt-1 text-xs font-semibold text-danger">{t(form.fieldError(name) as MessageKey)}</p> : null}
    </div>
  );

  return (
    <form onSubmit={form.onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="code" value={guest.code} />
      {locked ? (
        <FormAlert>
          <span className="inline-flex items-center gap-2">
            <Lock className="size-4" aria-hidden />
            {t("prizes.results.locked")}
          </span>
        </FormAlert>
      ) : null}
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {stepper(t("prizes.played"), played, setPlayed, "gamesPlayed")}
        {stepper(t("prizes.won"), won, setWon, "gamesWon")}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t("prizes.winRate")}</p>
          <WinRate rate={invalid ? null : rate} size="lg" />
        </div>
        <div className="text-end">
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t("prizes.teddyLabel")}</p>
          {invalid ? <p className="text-sm font-semibold text-danger">{t("validation.wonExceedsPlayed")}</p> : <EligibilityBadge played={played} eligible={qualifies(played, won)} />}
          <p className="mt-1 text-xs text-muted">{t("prizes.rule", {threshold: TEDDY_THRESHOLD})}</p>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" pending={form.pending} disabled={locked || invalid}>
        <Save className="size-5" aria-hidden />
        {current ? t("prizes.results.update") : t("prizes.results.save")}
      </Button>
    </form>
  );
}
