import Link from "next/link";
import {Award, BriefcaseBusiness, ChevronLeft, GraduationCap, UserPlus, Users} from "lucide-react";

import {getI18n} from "@/lib/i18n/server";

const TYPES = [
  {type: "student", icon: GraduationCap},
  {type: "visitor", icon: Users},
  {type: "graduate", icon: Award},
  {type: "staff", icon: BriefcaseBusiness},
] as const;

/** "New here?" panel on the sign-in page: the four registration types, each opening its form. */
export async function RegisterChoices() {
  const {t} = await getI18n();
  return (
    <section aria-labelledby="register-choices" className="h-full rounded-[2rem] bg-paper-deep/70 p-5 ring-1 ring-line sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-crimson text-white">
          <UserPlus className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="register-choices" className="font-display text-xl font-semibold sm:text-2xl">{t("auth.newHere")}</h2>
          <p className="text-sm text-ink-soft">{t("auth.newHereLede")}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2.5">
        {TYPES.map((item) => (
          <li key={item.type}>
            <Link
              href={`/register?type=${item.type}`}
              className="group flex min-h-16 items-center gap-3.5 rounded-2xl bg-card p-3.5 ring-1 ring-line transition hover:ring-crimson/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-crimson-wash text-crimson transition group-hover:bg-crimson group-hover:text-white">
                <item.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">{t(`register.types.${item.type}.title`)}</span>
                <span className="block text-xs leading-relaxed text-muted sm:text-sm">{t(`register.types.${item.type}.body`)}</span>
              </span>
              <ChevronLeft className="size-4 shrink-0 text-muted ltr:rotate-180" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("auth.newHereNote")}</p>
    </section>
  );
}
