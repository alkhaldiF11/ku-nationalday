import Image from "next/image";
import Link from "next/link";
import {ArrowRight, CalendarDays, Gamepad2, Gift, Mail, MapPin, Phone, QrCode, Trophy, UserPlus} from "lucide-react";

import {Countdown} from "@/components/site/countdown";
import {PhotoBackdrop} from "@/components/site/photo-backdrop";
import {ProgrammeList} from "@/components/site/programme-list";
import {ButtonLink} from "@/components/ui/button";
import {Badge} from "@/components/ui/card";
import {KuLogo} from "@/components/ui/ku-logo";
import {getCurrentGuest} from "@/lib/auth/session";
import {getSettings, listActivities, listAnnouncements, listGallery} from "@/lib/data/content";
import {eventWindow, toInstant} from "@/lib/event-time";
import {formatDay, formatNumber, relativeTime} from "@/lib/i18n/core";
import {getI18n} from "@/lib/i18n/server";

export default async function HomePage() {
  const {t, locale} = await getI18n();
  const guest = await getCurrentGuest();
  const settings = await getSettings();
  const activities = await listActivities();
  // The countdown has its own date (the party can be held before National Day itself).
  // Programme times on that day set the start; otherwise it counts down to midnight.
  const span = activities.some((item) => item.date === settings.countdownDate)
    ? eventWindow(settings.countdownDate, activities)
    : {start: toInstant(settings.countdownDate, "00:00"), end: toInstant(settings.countdownDate, "23:59")};
  const countdownLabel = (locale === "ar" ? settings.countdownLabelAr : settings.countdownLabelEn) || undefined;
  const gallery = await listGallery({limit: 4});
  const news = await listAnnouncements({limit: 2});

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {/* The photo as a faded full-width backdrop behind the text, on every screen size. */}
        <PhotoBackdrop opacity={0.5} className="-z-10" />

        <div className="mx-auto max-w-7xl px-5 pt-8 pb-14 sm:px-6 md:pt-14 md:pb-20 lg:pt-20 lg:pb-28">
          <div className="max-w-2xl animate-rise">
            <KuLogo size={52} className="mb-6 lg:mb-8" alt={t("brand.university")} />
            <p className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-[13px] font-semibold text-crimson ring-1 ring-line">
              <CalendarDays className="size-4" aria-hidden />
              {formatDay(locale, settings.eventDate)}
            </p>
            <h1 className="mt-4 font-display text-[2rem] leading-[1.25] font-semibold tracking-tight text-ink sm:text-[2.5rem] lg:text-[3.5rem] lg:leading-[1.1]">
              {t("home.title")}
              <span className="block text-crimson italic rtl:not-italic">{t("home.titleAccent")}</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-[1.8] font-semibold text-ink-soft sm:text-base lg:mt-6 lg:text-lg">{t("home.lede")}</p>

            <div className="mt-6 lg:mt-8">
              {guest ? (
                <ButtonLink href="/guest" size="lg" className="h-12 w-full sm:w-auto">
                  <QrCode className="size-5" aria-hidden />
                  {t("home.ctaMyPass")}
                </ButtonLink>
              ) : (
                <>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                    <ButtonLink href="/login" size="lg" className="h-12 w-full text-base sm:w-auto">
                      {t("home.ctaSignIn")}
                      <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden />
                    </ButtonLink>
                    <ButtonLink href="/register" size="lg" variant="secondary" className="h-12 w-full text-base sm:w-auto">
                      <UserPlus className="size-5" aria-hidden />
                      {t("home.ctaRegister")}
                    </ButtonLink>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted">{t("auth.noAccountItDesk")}</p>
                </>
              )}
            </div>

            {settings.countdownEnabled ? (
              <div className="mt-7 lg:mt-10">
                <Countdown start={span.start} end={span.end} label={countdownLabel} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-night text-white">
        <div className="serration h-[14px] [--serration-fill:var(--color-paper)] sm:h-[18px]" aria-hidden />
        <div className="lattice">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-20">
            <p className="text-xs font-bold tracking-[0.14em] text-white/60 uppercase">{t("home.stepsEyebrow")}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-4xl">{t("home.stepsTitle")}</h2>
            <ol className="mt-6 grid gap-3 sm:mt-10 sm:gap-5 md:grid-cols-3">
              {[
                {icon: QrCode, title: t("home.step1Title"), body: t("home.step1Body")},
                {icon: Gamepad2, title: t("home.step2Title"), body: t("home.step2Body")},
                {icon: Gift, title: t("home.step3Title"), body: t("home.step3Body")},
              ].map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 md:block md:rounded-3xl md:p-6">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-crimson/15 text-crimson md:size-12">
                    <step.icon className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold md:mt-4 md:text-xl">
                      <span className="tabular me-1.5 text-white/40">{formatNumber(locale, index + 1)}.</span>
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/70 md:mt-2 md:text-base">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="serration h-[14px] rotate-180 [--serration-fill:var(--color-paper)] sm:h-[18px]" aria-hidden />
      </section>

      {/* Programme */}
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-12 sm:gap-10 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-bold tracking-[0.14em] text-crimson uppercase">{t("home.programmeEyebrow")}</p>
          <h2 className="mt-2 font-display text-2xl leading-snug font-semibold sm:text-4xl">{t("home.programmeTitle")}</h2>
          <p className="mt-3 text-[15px] text-ink-soft sm:mt-4 sm:text-base">{t("programme.lede")}</p>
          <ButtonLink href="/programme" variant="secondary" className="mt-5 hidden sm:inline-flex">
            {t("home.fullProgramme")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </ButtonLink>
        </div>
        {activities.length ? <ProgrammeList activities={activities.slice(0, 6)} compact /> : <p className="text-muted">{t("programme.empty")}</p>}
        <ButtonLink href="/programme" variant="secondary" className="h-12 w-full sm:hidden">
          {t("home.fullProgramme")}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </ButtonLink>
      </section>

      {/* Gallery */}
      {gallery.length ? (
        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
          <div className="mb-5 flex items-end justify-between gap-4 sm:mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-crimson uppercase">{t("home.galleryEyebrow")}</p>
              <h2 className="mt-2 font-display text-2xl font-semibold sm:text-4xl">{t("home.galleryTitle")}</h2>
            </div>
            <Link href="/gallery" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-crimson hover:underline sm:text-base">
              {t("common.viewAll")}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:grid-rows-2">
            {gallery.map((image, index) => (
              <Link
                key={image.id}
                href="/gallery"
                className={`group relative overflow-hidden rounded-2xl bg-paper-deep sm:rounded-3xl ${index === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-[4/3]"}`}
              >
                <Image src={image.src} alt={image.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/80 to-transparent p-3 pt-8 text-[13px] font-semibold text-white sm:p-4 sm:text-sm">{image.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Prizes: teddy bear (75% win rate) and the grand prize draw */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.14em] text-gold uppercase">{t("home.prizesEyebrow")}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-4xl">{t("home.prizesTitle")}</h2>
          <p className="mt-3 text-[15px] text-ink-soft sm:text-base">{t("home.prizesBody")}</p>
        </div>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2">
          <article className="rounded-3xl bg-gold-wash p-5 ring-1 ring-gold/20 sm:rounded-[2rem] sm:p-8">
            <Gift className="size-7 text-gold sm:size-8" aria-hidden />
            <h3 className="mt-3 font-display text-xl font-semibold sm:mt-4 sm:text-3xl">{t("home.teddyTitle")}</h3>
            <p className="mt-2 text-[15px] text-ink-soft sm:text-base">{t("home.teddyBody")}</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm sm:mt-5">
              {[[3, 4], [6, 8], [8, 10], [7, 10]].map(([won, played]) => {
                const ok = won * 100 >= 75 * played;
                return (
                  <li key={won + "-" + played} className="flex flex-col items-start gap-1.5 rounded-xl bg-card px-3 py-2.5 ring-1 ring-gold/15 lg:flex-row lg:items-center lg:justify-between">
                    {/* Separate pieces, so mixed-direction text can't reorder "3/4 · 75%". */}
                    <span className="tabular flex items-baseline gap-2 whitespace-nowrap">
                      <span className="font-bold" dir="ltr">{formatNumber(locale, won)}/{formatNumber(locale, played)}</span>
                      <span className="text-ink-soft">{formatNumber(locale, Math.round((won / played) * 100))}%</span>
                    </span>
                    <Badge tone={ok ? "success" : "danger"}>{ok ? t("prizes.qualified") : t("prizes.notQualified")}</Badge>
                  </li>
                );
              })}
            </ul>
          </article>
          <article className="lattice rounded-3xl bg-night p-5 text-white sm:rounded-[2rem] sm:p-8">
            <Trophy className="size-7 text-gold sm:size-8" aria-hidden />
            <h3 className="mt-3 font-display text-xl font-semibold sm:mt-4 sm:text-3xl">{t("prizes.draw.grandPrize")}</h3>
            <p className="mt-2 text-[15px] text-white/75 sm:text-base">{t("home.grandPrizeBody")}</p>
            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-mono text-[13px] ring-1 ring-white/15 sm:mt-5 sm:text-sm" dir="ltr">
              G-1001 · G-1002 · G-1003 · …
            </p>
          </article>
        </div>
      </section>

      {/* Announcements + contact */}
      <section id="contact" className="mx-auto grid max-w-7xl scroll-mt-20 gap-4 px-5 sm:gap-6 sm:px-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-8">
          <p className="text-xs font-bold tracking-[0.14em] text-crimson uppercase">{t("home.newsEyebrow")}</p>
          {news.length ? (
            <ul className="mt-4 divide-y divide-line">
              {news.map((item) => (
                <li key={item.id} className="py-4 first:pt-2">
                  <p className="font-bold" dir="auto">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft" dir="auto">{item.body}</p>
                  <p className="mt-2 text-xs text-muted">{relativeTime(locale, item.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted">{t("guest.noNews")}</p>
          )}
        </div>
        <div className="rounded-3xl bg-crimson p-5 text-white sm:p-8">
          <p className="text-xs font-bold tracking-[0.14em] text-white/70 uppercase">{t("home.contactEyebrow")}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{t("home.contactTitle")}</h2>
          <dl className="mt-5 space-y-4 sm:mt-6">
            <ContactRow icon={MapPin} label={t("home.venue")} value={settings.eventVenue} />
            <ContactRow icon={CalendarDays} label={t("home.date")} value={formatDay(locale, settings.eventDate)} />
            <ContactRow icon={Mail} label={t("home.email")} value={settings.contactEmail} ltr />
            {settings.contactPhone ? <ContactRow icon={Phone} label={t("home.phone")} value={settings.contactPhone} ltr /> : null}
          </dl>
          <Link href="/staff/login" className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white sm:mt-8">
            {t("home.staffLink")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}

function ContactRow({icon: Icon, label, value, ltr}: {icon: typeof MapPin; label: string; value: string; ltr?: boolean}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-white/70" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-white/60">{label}</dt>
        <dd className="font-semibold break-words" dir={ltr ? "ltr" : undefined}>
          {value}
        </dd>
      </div>
    </div>
  );
}
