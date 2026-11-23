"use client";

import {CheckCircle2, Printer, UserRoundCheck, UserRoundPlus} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import {useState, useTransition} from "react";

import {checkIn, registerAtDesk, type DeskGuest} from "@/app/actions/desk";
import {useActionForm, useErrorMessage} from "@/components/forms/use-action-form";
import {qrPayload} from "@/components/guest/guest-pass";
import {GuestLookup} from "@/components/staff/guest-lookup";
import {Button} from "@/components/ui/button";
import {Card, CardHeader} from "@/components/ui/card";
import {FormAlert, SelectField, TextAreaField, TextField, Toggle} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";

type Registered = {code: string; fullName: string; temporaryPassword: string};

export function ReceptionDesk() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <RegisterCard />
      <CheckInCard />
    </div>
  );
}

function RegisterCard() {
  const {t} = useI18n();
  const [registered, setRegistered] = useState<Registered | null>(null);
  const form = useActionForm(registerAtDesk, {resetOnSuccess: true, onSuccess: (data) => setRegistered(data)});

  if (registered) {
    return (
      <Card className="animate-pop">
        <div className="print-area">
          <p className="inline-flex items-center gap-2 rounded-full bg-success-wash px-3 py-1 text-sm font-semibold text-success">
            <CheckCircle2 className="size-4" aria-hidden />
            {t("staff.reception.registered", {name: registered.fullName})}
          </p>
          <div className="mt-5 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
            <div className="justify-self-center rounded-2xl bg-paper p-4 ring-1 ring-line">
              <QRCodeSVG value={qrPayload(registered.code)} size={160} level="M" marginSize={0} fgColor="#1d1517" bgColor="transparent" />
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-semibold text-muted">{t("guest.guestId")}</dt>
                <dd className="font-display text-4xl font-semibold" dir="ltr">
                  {registered.code}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{t("staff.reception.tempPassword")}</dt>
                <dd className="font-mono text-2xl font-bold tracking-wider" dir="ltr" data-testid="temp-password">
                  {registered.temporaryPassword}
                </dd>
                <p className="mt-1 text-xs text-muted">{t("staff.reception.tempPasswordHint")}</p>
              </div>
            </dl>
          </div>
        </div>
        <div className="no-print mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setRegistered(null)}>
            <UserRoundPlus className="size-4" aria-hidden />
            {t("staff.reception.registerAnother")}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t("common.print")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={t("staff.reception.registerTitle")} />
      <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
        {form.error ? <FormAlert>{form.error}</FormAlert> : null}
        <TextField label={t("auth.fullName")} name="fullName" required autoComplete="off" error={form.fieldError("fullName")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t("auth.mobile")} name="phone" type="tel" inputMode="tel" required placeholder="3300 0000" hint={t("auth.mobileHint")} error={form.fieldError("phone")} dir="ltr" />
          <TextField label={t("auth.email")} name="email" type="email" optional error={form.fieldError("email")} dir="ltr" />
        </div>
        <TextAreaField label={t("staff.reception.notes")} name="notes" optional rows={2} placeholder={t("staff.reception.notesPlaceholder")} error={form.fieldError("notes")} />
        <SelectField label={t("staff.reception.category")} name="category" defaultValue="visitor">
          {(["visitor", "student", "graduate", "staff"] as const).map((category) => (
            <option key={category} value={category}>
              {t(`guestCategories.${category}`)}
            </option>
          ))}
        </SelectField>
        <Toggle label={t("staff.reception.checkInNow")} name="checkIn" defaultChecked />
        <Button type="submit" size="lg" pending={form.pending}>
          <UserRoundPlus className="size-5" aria-hidden />
          {t("staff.reception.register")}
        </Button>
      </form>
    </Card>
  );
}

function CheckInCard() {
  const {t} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [guest, setGuest] = useState<DeskGuest | null>(null);
  const [pending, startTransition] = useTransition();

  const doCheckIn = () => {
    if (!guest) return;
    startTransition(async () => {
      const result = await checkIn(guest.code);
      if (!result.ok) {
        toast("error", errorMessage(result));
        return;
      }
      setGuest(result.data.guest);
      toast(result.data.alreadyCheckedIn ? "info" : "success", t(result.data.alreadyCheckedIn ? "staff.reception.alreadyCheckedIn" : "staff.reception.checkedIn", {name: result.data.guest.fullName}));
    });
  };

  return (
    <Card>
      <CardHeader title={t("staff.reception.checkInTitle")} />
      <GuestLookup guest={guest} onFound={setGuest} onClear={() => setGuest(null)} autoFocus={false} />
      {guest && !guest.checkedInAt && guest.isActive ? (
        <Button size="lg" variant="success" className="mt-4 w-full" pending={pending} onClick={doCheckIn}>
          <UserRoundCheck className="size-5" aria-hidden />
          {t("staff.reception.checkIn")}
        </Button>
      ) : null}
    </Card>
  );
}
