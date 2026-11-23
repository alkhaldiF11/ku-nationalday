import type {Metadata} from "next";
import {redirect} from "next/navigation";

import {GuestLoginForm} from "@/components/auth/auth-forms";
import {AuthShell} from "@/components/auth/auth-shell";
import {RegisterChoices} from "@/components/auth/register-choices";
import {getCurrentGuest} from "@/lib/auth/session";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("nav.signIn")};
}

export default async function LoginPage({searchParams}: PageProps<"/login">) {
  if (await getCurrentGuest()) {
    redirect("/guest");
  }
  const {t} = await getI18n();
  const {next} = await searchParams;
  return (
    <AuthShell title={t("auth.guestTitle")} lede={t("auth.guestLede")} side={<RegisterChoices />}>
      <GuestLoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
