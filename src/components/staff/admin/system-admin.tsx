"use client";

import {KeyRound} from "lucide-react";

import {adminCreateStaff, adminSaveSettings, adminSetStaffPassword, adminUpdateStaff} from "@/app/actions/admin";
import {useActionForm} from "@/components/forms/use-action-form";
import {EditorDialog} from "@/components/staff/admin/editor-dialog";
import {Button} from "@/components/ui/button";
import {Dialog} from "@/components/ui/dialog";
import {FormAlert, SelectField, TextField, Toggle} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import type {EventSettings} from "@/lib/data/content";
import type {StaffUser} from "@/lib/data/staff";
import {useI18n} from "@/lib/i18n/client";
import {useState} from "react";

const ROLES = ["admin", "reception", "itdesk"] as const;

function RoleSelect({defaultValue, error}: {defaultValue?: string; error?: string}) {
  const {t} = useI18n();
  return (
    <SelectField label={t("staff.team.role")} name="role" defaultValue={defaultValue ?? "reception"} hint={t("staff.team.roleHelp")} error={error}>
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {t(`staff.roles.${role}`)}
        </option>
      ))}
    </SelectField>
  );
}

export function AddStaffButton() {
  const {t} = useI18n();
  return (
    <EditorDialog
      action={adminCreateStaff}
      mode="add"
      trigger={t("staff.team.add")}
      title={t("staff.team.add")}
      successMessage={t("staff.team.created")}
      fields={(error) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t("staff.team.fullName")} name="fullName" required error={error("fullName")} />
            <TextField label={t("staff.team.username")} name="username" required autoComplete="off" error={error("username")} dir="ltr" />
          </div>
          <RoleSelect error={error("role")} />
          <TextField label={t("staff.team.password")} name="password" type="password" autoComplete="new-password" required hint={t("auth.passwordHint")} error={error("password")} />
        </>
      )}
    />
  );
}

export function EditStaffButton({member}: {member: StaffUser}) {
  const {t} = useI18n();
  return (
    <EditorDialog
      action={adminUpdateStaff}
      mode="edit"
      trigger={t("common.edit")}
      title={member.username}
      successMessage={t("staff.team.saved")}
      hidden={{id: member.id}}
      itemLabel={member.fullName}
      fields={(error) => (
        <>
          <TextField label={t("staff.team.fullName")} name="fullName" defaultValue={member.fullName} required error={error("fullName")} />
          <RoleSelect defaultValue={member.role} error={error("role")} />
          <Toggle label={t("common.active")} name="isActive" defaultChecked={member.isActive} />
        </>
      )}
    />
  );
}

export function SetStaffPasswordButton({member}: {member: StaffUser}) {
  const {t} = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const form = useActionForm(adminSetStaffPassword, {
    onSuccess: () => {
      toast("success", t("staff.team.passwordSet"));
      setOpen(false);
    },
  });
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" aria-hidden />
        <span className="max-sm:sr-only">{t("staff.team.setPassword")}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${t("staff.team.setPassword")} · ${member.username}`} size="sm">
        <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={member.id} />
          {form.error ? <FormAlert>{form.error}</FormAlert> : null}
          <TextField label={t("staff.team.password")} name="password" type="password" autoComplete="new-password" required hint={t("auth.passwordHint")} error={form.fieldError("password")} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" pending={form.pending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function SettingsForm({settings}: {settings: EventSettings}) {
  const {t} = useI18n();
  const toast = useToast();
  const form = useActionForm(adminSaveSettings, {onSuccess: () => toast("success", t("staff.settings.saved"))});
  return (
    <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
      <TextField label={t("staff.settings.eventName")} name="eventName" defaultValue={settings.eventName} required error={form.fieldError("eventName")} />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <TextField label={t("staff.settings.eventDate")} name="eventDate" type="date" defaultValue={settings.eventDate} required error={form.fieldError("eventDate")} />
        <TextField label={t("staff.settings.venue")} name="eventVenue" defaultValue={settings.eventVenue} required error={form.fieldError("eventVenue")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t("staff.settings.contactEmail")} name="contactEmail" type="email" defaultValue={settings.contactEmail} required error={form.fieldError("contactEmail")} dir="ltr" />
        <TextField label={t("staff.settings.contactPhone")} name="contactPhone" defaultValue={settings.contactPhone} optional error={form.fieldError("contactPhone")} dir="ltr" />
      </div>
      <TextField
        label={t("staff.settings.universityDomains")}
        name="universityDomains"
        defaultValue={settings.universityDomains}
        required
        hint={t("staff.settings.universityDomainsHint")}
        error={form.fieldError("universityDomains")}
        dir="ltr"
      />

      <fieldset className="space-y-4 rounded-2xl border border-line p-4">
        <legend className="px-1 font-display text-lg font-semibold">{t("staff.settings.countdownTitle")}</legend>
        <p className="text-sm text-ink-soft">{t("staff.settings.countdownHint")}</p>
        <Toggle label={t("staff.settings.countdownEnabled")} name="countdownEnabled" defaultChecked={settings.countdownEnabled} />
        <TextField label={t("staff.settings.countdownDate")} name="countdownDate" type="date" defaultValue={settings.countdownDate} required className="sm:max-w-[16rem]" error={form.fieldError("countdownDate")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t("staff.settings.countdownLabelEn")} name="countdownLabelEn" defaultValue={settings.countdownLabelEn} optional placeholder="Celebrations begin in" error={form.fieldError("countdownLabelEn")} dir="ltr" />
          <TextField label={t("staff.settings.countdownLabelAr")} name="countdownLabelAr" defaultValue={settings.countdownLabelAr} optional placeholder="تبدأ الاحتفالات بعد" error={form.fieldError("countdownLabelAr")} dir="rtl" />
        </div>
      </fieldset>

      <Button type="submit" pending={form.pending}>
        {t("common.save")}
      </Button>
    </form>
  );
}
