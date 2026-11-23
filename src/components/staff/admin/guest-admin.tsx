"use client";

import Link from "next/link";
import {KeyRound, Power, Trash2, UserRoundPlus} from "lucide-react";
import {useState, useTransition} from "react";

import {adminCreateGuest, adminDeleteGuest, adminResetGuestPassword, adminSetGuestActive, adminUpdateGuest} from "@/app/actions/admin";
import {useActionForm, useErrorMessage} from "@/components/forms/use-action-form";
import {Button, buttonClass} from "@/components/ui/button";
import {ConfirmButton, Dialog} from "@/components/ui/dialog";
import {FormAlert, TextAreaField, TextField, Toggle} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";

export function AddGuestButton() {
  const {t} = useI18n();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{id: string; code: string; fullName: string; temporaryPassword: string} | null>(null);
  const form = useActionForm(adminCreateGuest, {onSuccess: setCreated});

  const close = () => {
    setOpen(false);
    setCreated(null);
    form.reset();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserRoundPlus className="size-4" aria-hidden />
        {t("staff.guests.add")}
      </Button>
      <Dialog open={open} onClose={close} title={created ? t("staff.guests.created", {code: created.code}) : t("staff.guests.add")}>
        {created ? (
          <div className="space-y-4">
            <p className="font-semibold">{created.fullName}</p>
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
              <p className="text-xs font-semibold text-muted">{t("staff.reception.tempPassword")}</p>
              <p className="font-mono text-2xl font-bold tracking-wider" dir="ltr" data-testid="temp-password">
                {created.temporaryPassword}
              </p>
              <p className="mt-1 text-xs text-muted">{t("staff.reception.tempPasswordHint")}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {t("common.close")}
              </Button>
              <Link href={`/staff/guests/${created.id}`} className={buttonClass()} onClick={close}>
                {t("staff.guests.detailTitle")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
            {form.error ? <FormAlert>{form.error}</FormAlert> : null}
            <TextField label={t("auth.fullName")} name="fullName" required error={form.fieldError("fullName")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={t("auth.mobile")} name="phone" type="tel" required hint={t("auth.mobileHint")} error={form.fieldError("phone")} dir="ltr" />
              <TextField label={t("auth.email")} name="email" type="email" optional error={form.fieldError("email")} dir="ltr" />
            </div>
            <TextAreaField label={t("staff.reception.notes")} name="notes" optional rows={2} error={form.fieldError("notes")} />
            <Toggle label={t("staff.reception.checkInNow")} name="checkIn" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" pending={form.pending}>
                {t("staff.guests.add")}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function GuestEditForm({guest}: {guest: {id: string; fullName: string; phone: string; email: string; notes: string}}) {
  const {t} = useI18n();
  const toast = useToast();
  const form = useActionForm(adminUpdateGuest, {onSuccess: () => toast("success", t("staff.guests.saved"))});
  return (
    <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={guest.id} />
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
      <TextField label={t("auth.fullName")} name="fullName" defaultValue={guest.fullName} required error={form.fieldError("fullName")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t("auth.mobile")} name="phone" type="tel" defaultValue={guest.phone} required error={form.fieldError("phone")} dir="ltr" />
        <TextField label={t("auth.email")} name="email" type="email" defaultValue={guest.email} optional error={form.fieldError("email")} dir="ltr" />
      </div>
      <TextAreaField label={t("staff.reception.notes")} name="notes" defaultValue={guest.notes} optional error={form.fieldError("notes")} />
      <Button type="submit" pending={form.pending}>
        {t("common.save")}
      </Button>
    </form>
  );
}

export function GuestAdminActions({guest}: {guest: {id: string; code: string; fullName: string; isActive: boolean}}) {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [password, setPassword] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleActive = () =>
    startTransition(async () => {
      const result = await adminSetGuestActive(guest.id, !guest.isActive);
      if (result.ok) toast("success", t(guest.isActive ? "staff.guests.deactivated" : "staff.guests.activated"));
      else toast("error", errorMessage(result));
    });

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmButton
        variant="secondary"
        message={t("staff.guests.resetConfirm")}
        confirmLabel={t("staff.guests.resetPassword")}
        onConfirm={async () => {
          const result = await adminResetGuestPassword(guest.id);
          if (result.ok) setPassword(result.data);
          else toast("error", errorMessage(result));
        }}
      >
        <KeyRound className="size-4" aria-hidden />
        {t("staff.guests.resetPassword")}
      </ConfirmButton>
      <Button variant="secondary" size="sm" pending={pending} onClick={toggleActive}>
        <Power className="size-4" aria-hidden />
        {guest.isActive ? t("staff.guests.deactivate") : t("staff.guests.activate")}
      </Button>
      <ConfirmButton
        message={t("staff.guests.deleteConfirm", {name: guest.fullName})}
        onConfirm={async () => {
          const result = await adminDeleteGuest(guest.id);
          if (result && !result.ok) toast("error", errorMessage(result));
          else toast("success", t("staff.guests.deleted"));
        }}
      >
        <Trash2 className="size-4" aria-hidden />
        {t("common.delete")}
      </ConfirmButton>

      <Dialog open={password !== null} onClose={() => setPassword(null)} title={t("staff.guests.newPassword", {code: guest.code})} size="sm">
        <p className="rounded-2xl bg-paper p-4 text-center font-mono text-3xl font-bold tracking-wider ring-1 ring-line" dir="ltr" data-testid="temp-password">
          {password}
        </p>
        <p className="mt-3 text-sm text-muted">{t("staff.reception.tempPasswordHint")}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setPassword(null)}>{t("common.close")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
