"use client";

import {changePassword, updateContact} from "@/app/actions/guest";
import {useActionForm} from "@/components/forms/use-action-form";
import {Button} from "@/components/ui/button";
import {FormAlert, TextField} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";

export function ContactForm({fullName, phone, email}: {fullName: string; phone: string; email: string}) {
  const {t} = useI18n();
  const toast = useToast();
  const form = useActionForm(updateContact, {onSuccess: () => toast("success", t("guest.contactSaved"))});
  return (
    <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
      <TextField label={t("auth.fullName")} name="fullName" defaultValue={fullName} disabled />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t("auth.mobile")} name="phone" type="tel" defaultValue={phone} required error={form.fieldError("phone")} dir="ltr" />
        <TextField label={t("auth.email")} name="email" type="email" defaultValue={email} optional error={form.fieldError("email")} dir="ltr" />
      </div>
      <Button type="submit" pending={form.pending}>
        {t("common.save")}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const {t} = useI18n();
  const toast = useToast();
  const form = useActionForm(changePassword, {resetOnSuccess: true, onSuccess: () => toast("success", t("guest.passwordChanged"))});
  return (
    <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
      <TextField label={t("guest.currentPassword")} name="currentPassword" type="password" autoComplete="current-password" required error={form.fieldError("currentPassword")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t("auth.newPassword")} name="password" type="password" autoComplete="new-password" required hint={t("auth.passwordHint")} error={form.fieldError("password")} />
        <TextField label={t("auth.confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password" required error={form.fieldError("confirmPassword")} />
      </div>
      <Button type="submit" variant="dark" pending={form.pending}>
        {t("guest.passwordTitle")}
      </Button>
    </form>
  );
}
