"use client";

import {Plus, Trash2} from "lucide-react";

import {adminAddAttendance, adminRemoveAttendance, adminSaveThresholds} from "@/app/actions/ranks";
import {useActionForm, useErrorMessage} from "@/components/forms/use-action-form";
import {RankEmblem} from "@/components/ranks/rank-emblem";
import {Button} from "@/components/ui/button";
import {ConfirmButton} from "@/components/ui/dialog";
import {FormAlert, TextField} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";
import {RANKS, type RankThresholds} from "@/lib/ranks";

/** Administrators: minimum attendances per rank (validated again on the server). */
export function ThresholdsForm({thresholds}: {thresholds: RankThresholds}) {
  const {t} = useI18n();
  const toast = useToast();
  const form = useActionForm(adminSaveThresholds, {onSuccess: () => toast("success", t("staff.ranks.saved"))});
  return (
    <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RANKS.map((rank) => (
          <div key={rank} className="flex items-end gap-2">
            <RankEmblem rank={rank} size={36} wreath={false} className="mb-1.5 shrink-0" />
            <TextField
              label={t(`ranks.${rank}.title`)}
              name={rank}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              defaultValue={thresholds[rank]}
              required
              className="min-w-0 flex-1"
              error={form.fieldError(rank)}
            />
          </div>
        ))}
      </div>
      <Button type="submit" pending={form.pending}>
        {t("staff.ranks.saveThresholds")}
      </Button>
    </form>
  );
}

/** Administrators: a guest's attendance by year — add a past year, or remove a mistake. */
export function AttendanceEditor({guestId, guestCode, years, currentYear}: {guestId: string; guestCode: string; years: number[]; currentYear: number}) {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const form = useActionForm(adminAddAttendance, {onSuccess: () => toast("success", t("staff.attendance.added"))});

  return (
    <div className="space-y-4">
      {years.length ? (
        <ul className="flex flex-wrap gap-2">
          {years.map((year) => (
            <li key={year} className="inline-flex items-center gap-1 rounded-full bg-success-wash py-1 ps-3 pe-1 text-sm font-semibold text-success">
              <span className="tabular">{year}</span>
              <ConfirmButton
                message={t("staff.attendance.removeConfirm", {year, code: guestCode})}
                confirmLabel={t("staff.attendance.remove")}
                onConfirm={async () => {
                  const result = await adminRemoveAttendance(guestId, year);
                  if (result.ok) toast("success", t("staff.attendance.removed"));
                  else toast("error", errorMessage(result));
                }}
                className="size-7 rounded-full px-0"
              >
                <Trash2 className="size-3.5" aria-hidden />
                <span className="sr-only">
                  {t("staff.attendance.remove")} {year}
                </span>
              </ConfirmButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t("staff.attendance.none")}</p>
      )}
      <form onSubmit={form.onSubmit} className="flex items-end gap-2" noValidate>
        <input type="hidden" name="guestId" value={guestId} />
        <TextField
          label={t("staff.attendance.year")}
          name="year"
          type="number"
          inputMode="numeric"
          min={2000}
          max={2100}
          defaultValue={currentYear}
          required
          className="w-32"
          error={form.fieldError("year")}
          dir="ltr"
        />
        <Button type="submit" variant="secondary" pending={form.pending} className="h-11">
          <Plus className="size-4" aria-hidden />
          {t("staff.attendance.add")}
        </Button>
      </form>
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
    </div>
  );
}
