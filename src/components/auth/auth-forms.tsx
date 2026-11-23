"use client";

import {guestLogin, staffLogin} from "@/app/actions/auth";
import {useActionForm} from "@/components/forms/use-action-form";
import {Button} from "@/components/ui/button";
import {FormAlert, TextField} from "@/components/ui/field";
import {useI18n} from "@/lib/i18n/client";

export function GuestLoginForm({next}: {next?: string}) {
  const {t} = useI18n();
  const form = useActionForm(guestLogin);
  return (
    <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
      <TextField label={t("auth.identifier")} name="identifier" autoComplete="username" placeholder="G-1001" required autoFocus error={form.fieldError("identifier")} dir="ltr" />
      <TextField label={t("auth.password")} name="password" type="password" autoComplete="current-password" required error={form.fieldError("password")} />
      <Button type="submit" size="lg" className="w-full" pending={form.pending}>
        {form.pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
      <p className="text-sm text-muted">{t("auth.forgot")}</p>

    </form>
  );
}

export function StaffLoginForm({next, demo}: {next?: string; demo: Array<{username: string; password: string; role: string}> | null}) {
  const {t} = useI18n();
  const form = useActionForm(staffLogin);
  return (
    <form onSubmit={form.onSubmit} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {form.error ? <FormAlert>{form.error}</FormAlert> : null}
      <TextField label={t("auth.username")} name="username" autoComplete="username" required autoFocus error={form.fieldError("username")} dir="ltr" />
      <TextField label={t("auth.password")} name="password" type="password" autoComplete="current-password" required error={form.fieldError("password")} />
      <Button type="submit" size="lg" variant="dark" className="w-full" pending={form.pending}>
        {form.pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
      {demo ? (
        <details className="rounded-xl bg-paper px-4 py-3 text-sm ring-1 ring-line">
          <summary className="cursor-pointer font-semibold text-ink-soft">{t("auth.demoHint")}</summary>
          <ul className="mt-2 space-y-1 font-mono text-xs text-ink-soft" dir="ltr">
            {demo.map((item) => (
              <li key={item.username}>
                {item.username} / {item.password}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </form>
  );
}
