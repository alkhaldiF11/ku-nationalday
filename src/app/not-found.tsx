import {ButtonLink} from "@/components/ui/button";
import {FlagMark} from "@/components/ui/flag-mark";
import {getI18n} from "@/lib/i18n/server";

export default async function NotFound() {
  const {t} = await getI18n();
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <FlagMark width={80} className="mx-auto rounded-md shadow-[var(--shadow-card)]" />
        <p className="mt-8 font-display text-7xl font-semibold text-crimson">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{t("notFound.title")}</h1>
        <p className="mt-2 text-ink-soft">{t("notFound.body")}</p>
        <ButtonLink href="/" className="mt-8">
          {t("notFound.home")}
        </ButtonLink>
      </div>
    </div>
  );
}
