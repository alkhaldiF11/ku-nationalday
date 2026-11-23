import type {Metadata} from "next";
import {redirect} from "next/navigation";

import {RegisterFlow} from "@/components/auth/register-flow";
import {PhotoBackdrop} from "@/components/site/photo-backdrop";
import {getCurrentGuest} from "@/lib/auth/session";
import {getUniversityDomains, REGISTRATION_TYPES} from "@/lib/data/registrations";
import {getI18n} from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {title: t("register.title")};
}

/** Online registration: four types, each reviewed by an administrator before the account works. */
export default async function RegisterPage({searchParams}: PageProps<"/register">) {
  if (await getCurrentGuest()) {
    redirect("/guest");
  }
  const {t} = await getI18n();
  const {type} = await searchParams;
  const initialType = REGISTRATION_TYPES.find((item) => item === type) ?? null;

  return (
    <div className="relative">
      <PhotoBackdrop opacity={0.4} className="-z-10 bottom-auto h-80" />
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
        <header className="mb-6 animate-rise">
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight sm:text-4xl">{t("register.title")}</h1>
          <p className="mt-2 text-[15px] text-ink-soft sm:text-base">{t("register.lede")}</p>
        </header>
        <RegisterFlow domains={await getUniversityDomains()} initialType={initialType} />
      </div>
    </div>
  );
}
