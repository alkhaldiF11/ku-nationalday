"use client";

import {CheckCircle2, CircleSlash, Gift, QrCode, Search, Trophy, X} from "lucide-react";
import {useCallback, useState, useTransition, type FormEvent, type ReactNode} from "react";

import {lookupGuest, type DeskGuest} from "@/app/actions/desk";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {QrScanner} from "@/components/staff/qr-scanner";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/card";
import {Dialog} from "@/components/ui/dialog";
import {useI18n} from "@/lib/i18n/client";
import {formatNumber} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

/** Guest ID input + QR scan. Calls `onFound` with the guest, or shows the error inline. */
export function GuestLookup({onFound, onClear, guest, autoFocus = true}: {onFound: (guest: DeskGuest) => void; onClear?: () => void; guest?: DeskGuest | null; autoFocus?: boolean}) {
  const {t} = useI18n();
  const errorMessage = useErrorMessage();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pending, startTransition] = useTransition();

  const find = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setError(null);
      startTransition(async () => {
        const result = await lookupGuest(trimmed);
        if (result.ok) {
          setCode(result.data.code);
          onFound(result.data);
        } else {
          setError(errorMessage(result));
        }
      });
    },
    [errorMessage, onFound],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    find(code);
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex gap-2" role="search">
        <label className="sr-only" htmlFor="guest-code">
          {t("staff.lookup.label")}
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="guest-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t("staff.lookup.placeholder")}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            aria-invalid={error ? true : undefined}
            className="h-12 w-full rounded-xl bg-card ps-10 pe-3 font-mono text-base tracking-wide uppercase ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none aria-[invalid=true]:ring-danger"
          />
        </div>
        <Button type="submit" size="md" className="h-12" variant="dark" pending={pending}>
          {t("staff.lookup.find")}
        </Button>
        <Button size="md" className="h-12" variant="secondary" onClick={() => setScanning(true)} aria-label={t("staff.lookup.scan")}>
          <QrCode className="size-5" aria-hidden />
          <span className="hidden sm:inline">{t("staff.lookup.scan")}</span>
        </Button>
      </form>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {guest ? (
        <GuestCard
          guest={guest}
          onClear={
            onClear
              ? () => {
                  setCode("");
                  onClear();
                }
              : undefined
          }
        />
      ) : null}

      <Dialog open={scanning} onClose={() => setScanning(false)} title={t("staff.lookup.scanTitle")} size="sm">
        {scanning ? (
          <QrScanner
            onScan={(value) => {
              setScanning(false);
              find(value);
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

export function GuestCard({guest, onClear, children}: {guest: DeskGuest; onClear?: () => void; children?: ReactNode}) {
  const {t, locale} = useI18n();
  return (
    <div className={cn("mt-4 animate-pop rounded-2xl p-4 ring-1", guest.isActive ? "bg-paper ring-line" : "bg-danger-wash ring-danger/30")} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{guest.fullName}</p>
          <p className="font-mono text-sm text-muted" dir="ltr">
            {guest.code}
          </p>
        </div>
        {onClear ? (
          <button type="button" onClick={onClear} className="-m-1 rounded-lg p-1.5 text-muted hover:bg-paper-deep hover:text-ink" aria-label={t("staff.lookup.clear")}>
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="gold">
          <Trophy className="size-3" aria-hidden />
          {guest.result
            ? `${formatNumber(locale, guest.result.gamesWon)}/${formatNumber(locale, guest.result.gamesPlayed)} · ${guest.result.winRate === null ? "—" : `${formatNumber(locale, guest.result.winRate)}%`}`
            : t("prizes.noGamesYet")}
        </Badge>
        {guest.result?.eligible ? (
          <Badge tone={guest.result.teddyCollectedAt ? "neutral" : "crimson"}>
            <Gift className="size-3" aria-hidden />
            {guest.result.teddyCollectedAt ? t("prizes.collected") : t("prizes.qualified")}
          </Badge>
        ) : null}
        {guest.checkedInAt ? (
          <Badge tone="success">
            <CheckCircle2 className="size-3" aria-hidden />
            {t("guest.checkedIn")}
          </Badge>
        ) : (
          <Badge>{t("guest.notCheckedIn")}</Badge>
        )}
        {!guest.isActive ? (
          <Badge tone="danger">
            <CircleSlash className="size-3" aria-hidden />
            {t("staff.lookup.inactive")}
          </Badge>
        ) : null}
      </div>
      {children}
    </div>
  );
}
