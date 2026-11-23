"use client";

import Link from "next/link";
import {ArrowLeft, Award, BriefcaseBusiness, CheckCircle2, GraduationCap, Plus, Send, Trash2, Users} from "lucide-react";
import {useState} from "react";

import {registerApplicant} from "@/app/actions/registration";
import {useActionForm} from "@/components/forms/use-action-form";
import {PhoneField} from "@/components/forms/phone-field";
import {Button, ButtonLink} from "@/components/ui/button";
import {FormAlert, TextField} from "@/components/ui/field";
import {useI18n} from "@/lib/i18n/client";
import type {MessageKey} from "@/lib/i18n/core";
import {cn} from "@/lib/utils/cn";

type RegistrationType = "student" | "visitor" | "graduate" | "staff";

const TYPES: Array<{type: RegistrationType; icon: typeof Users}> = [
  {type: "student", icon: GraduationCap},
  {type: "visitor", icon: Users},
  {type: "graduate", icon: Award},
  {type: "staff", icon: BriefcaseBusiness},
];

const MAX_CHILDREN = 12;

/** Choose a registration type, fill in its form, and get a "pending approval" confirmation. */
export function RegisterFlow({domains, initialType}: {domains: string[]; initialType: RegistrationType | null}) {
  const {t} = useI18n();
  const [type, setType] = useState<RegistrationType | null>(initialType);
  const [done, setDone] = useState<{type: RegistrationType; family: number} | null>(null);

  if (done) {
    return (
      <div className="animate-rise rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-card)] ring-1 ring-line sm:p-10">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">{t("register.doneTitle")}</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          {t("register.doneBody", {identifier: done.type === "student" || done.type === "staff" ? t("register.identifierEmail") : t("register.identifierPhone")})}
        </p>
        {done.family ? <p className="mx-auto mt-2 max-w-md font-semibold text-ink">{t("register.doneFamily", {count: done.family})}</p> : null}
        <ButtonLink href="/login" size="lg" className="mt-6 h-12 w-full sm:w-auto">
          {t("register.goSignIn")}
        </ButtonLink>
      </div>
    );
  }

  if (!type) {
    return (
      <div className="animate-rise">
        <p className="mb-3 text-sm font-semibold text-ink-soft">{t("register.choose")}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TYPES.map((item) => (
            <li key={item.type}>
              <button
                type="button"
                onClick={() => setType(item.type)}
                className="group flex h-full w-full items-start gap-4 rounded-2xl bg-card p-4 text-start shadow-[var(--shadow-card)] ring-1 ring-line transition hover:ring-crimson/40 focus-visible:ring-2 focus-visible:ring-crimson sm:p-5"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-crimson-wash text-crimson transition group-hover:bg-crimson group-hover:text-white">
                  <item.icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold text-ink">{t(`register.types.${item.type}.title` as MessageKey)}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{t(`register.types.${item.type}.body` as MessageKey)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-ink-soft">
          {t("register.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-crimson hover:underline">
            {t("register.signIn")}
          </Link>
        </p>
      </div>
    );
  }

  return <RegistrationForm key={type} type={type} domains={domains} onBack={() => setType(null)} onDone={(family) => setDone({type, family})} />;
}

function RegistrationForm({type, domains, onBack, onDone}: {type: RegistrationType; domains: string[]; onBack: () => void; onDone: (family: number) => void}) {
  const {t} = useI18n();
  const form = useActionForm(registerApplicant, {onSuccess: (data) => onDone(data.family)});
  const [family, setFamily] = useState(false);
  const [children, setChildren] = useState<Array<{key: number; name: string}>>([{key: 1, name: ""}]);
  const Icon = TYPES.find((item) => item.type === type)!.icon;
  const university = type === "student" || type === "staff";

  const addChild = () => setChildren((list) => (list.length >= MAX_CHILDREN ? list : [...list, {key: Math.max(0, ...list.map((item) => item.key)) + 1, name: ""}]));
  const removeChild = (key: number) => setChildren((list) => (list.length > 1 ? list.filter((item) => item.key !== key) : [{key: key + 1, name: ""}]));

  return (
    <form onSubmit={form.onSubmit} className="animate-rise space-y-5 rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-8" noValidate>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-crimson-wash text-crimson">
            <Icon className="size-6" aria-hidden />
          </span>
          <span className="text-xl font-bold">{t(`register.types.${type}.title` as MessageKey)}</span>
        </span>
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-soft hover:bg-paper-deep" disabled={form.pending}>
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
          {t("register.changeType")}
        </button>
      </div>

      {form.error ? <FormAlert>{form.error}</FormAlert> : null}

      <input type="hidden" name="type" value={type} />
      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {type === "visitor" && family ? <h3 className="text-sm font-bold text-muted">{t("register.parentHeading")}</h3> : null}
      <TextField label={t("register.fullName")} name="fullName" required autoComplete="name" error={form.fieldError("fullName")} />

      {university ? (
        <TextField
          label={t("register.universityEmail")}
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          hint={t("register.universityEmailHint", {domains: domains.map((domain) => `@${domain}`).join(" / ")})}
          error={form.fieldError("email")}
        />
      ) : null}

      <PhoneField
        label={t("register.phone")}
        name="phone"
        required={type === "visitor" || type === "graduate"}
        optional={university}
        hint={t("register.phoneHint")}
        error={form.fieldError("phone")}
      />

      {type === "visitor" ? <TextField label={t("register.email")} name="email" type="email" optional autoComplete="email" dir="ltr" error={form.fieldError("email")} /> : null}
      {type === "graduate" ? (
        <TextField label={t("register.studentId")} name="studentId" required dir="ltr" autoComplete="off" hint={t("register.studentIdHint")} error={form.fieldError("studentId")} />
      ) : null}
      {type === "staff" ? <TextField label={t("register.jobTitle")} name="jobTitle" required autoComplete="organization-title" error={form.fieldError("jobTitle")} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t("register.password")} name="password" type="password" required autoComplete="new-password" error={form.fieldError("password")} />
        <TextField label={t("register.confirmPassword")} name="confirmPassword" type="password" required autoComplete="new-password" error={form.fieldError("confirmPassword")} />
      </div>
      <p className="-mt-2 text-xs text-muted">{t("register.passwordHint")}</p>

      {type === "visitor" ? (
        <fieldset className="space-y-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="family"
              checked={family}
              onChange={(event) => setFamily(event.target.checked)}
              className="mt-1 size-5 shrink-0 accent-crimson"
            />
            <span>
              <span className="block font-semibold">{t("register.family")}</span>
              <span className="block text-sm text-muted">{t("register.familyHint")}</span>
            </span>
          </label>

          {family ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-muted">{t("register.childrenHeading")}</h3>
              <ol className="space-y-3">
                {children.map((child, index) => (
                  <li key={child.key} className="flex items-end gap-2">
                    <TextField
                      label={t("register.child", {n: index + 1})}
                      name="child"
                      value={child.name}
                      onChange={(event) => setChildren((list) => list.map((item) => (item.key === child.key ? {...item, name: event.target.value} : item)))}
                      className="min-w-0 flex-1"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => removeChild(child.key)}
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-muted ring-1 ring-line hover:bg-danger-wash hover:text-danger"
                      aria-label={t("register.removeChild", {n: index + 1})}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
              {form.fieldError("children") ? (
                <p className="text-xs font-semibold text-danger" role="alert">
                  {t(form.fieldError("children") as MessageKey, {max: MAX_CHILDREN})}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="secondary" onClick={addChild} disabled={children.length >= MAX_CHILDREN}>
                  <Plus className="size-4" aria-hidden />
                  {t("register.addChild")}
                </Button>
                <span className="text-xs text-muted">{t("register.maxChildren", {max: MAX_CHILDREN})}</span>
              </div>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <Button type="submit" size="lg" pending={form.pending} className={cn("h-12 w-full")}>
        {!form.pending ? <Send className="size-4 rtl:-scale-x-100" aria-hidden /> : null}
        {t("register.submit")}
      </Button>
    </form>
  );
}
