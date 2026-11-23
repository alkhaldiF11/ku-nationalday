"use client";

import {LoaderCircle} from "lucide-react";
import {useState, useTransition} from "react";

import {dismissAward} from "@/app/actions/ranks";
import {Confetti} from "@/components/prizes/confetti";
import {TrophyEmblem} from "@/components/ranks/trophy-emblem";
import {useI18n} from "@/lib/i18n/client";
import {cn} from "@/lib/utils/cn";

type Award = {id: string; prize: string; message: string | null};

/**
 * Congratulations pop-up for awards the guest hasn't seen yet (announced by an administrator,
 * possibly while the guest was offline). Dismissing records it, so a refresh doesn't show it again.
 *
 * Entrance sequence (see the award-* keyframes in globals.css; all skipped with reduced motion):
 * overlay fades in → card scales up → trophy bounces in → glow → confetti → text fades in.
 */
export function WinnerCelebration({awards}: {awards: Award[]}) {
  const {t, locale} = useI18n();
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const award = awards[index];
  if (!award) return null;

  const dismiss = () =>
    startTransition(async () => {
      await dismissAward(award.id);
      setIndex((value) => value + 1);
    });

  return (
    <div
      className="award-overlay fixed inset-0 z-[70] grid place-items-center overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-title"
      aria-describedby="winner-prize"
    >
      <Confetti key={award.id} count={90} scale={0.6} delayMs={650} durationMs={5500} />

      {/* Gold gradient frame around an ivory card; the card sits above the confetti. */}
      <div className="award-card relative z-[90] my-auto w-full max-w-[25rem] rounded-[2rem] bg-[linear-gradient(140deg,#f7dc8f,#c98b1b_32%,#fff2c2_55%,#b47a1c_80%,#f3cf6b)] p-[1.5px] shadow-[0_30px_80px_-20px_rgb(20_2_6/0.75),0_0_0_1px_rgb(255_242_194/0.15)]">
        <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-[#fffaf2] px-6 pb-6 text-center sm:px-8 sm:pb-7">
          {/* Soft red and gold light at the top of the card */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(70%_80%_at_50%_0%,rgb(206_17_38/0.12),transparent_70%)]" aria-hidden />

          {/* Trophy with its glow */}
          <div className="relative mx-auto flex h-[9.5rem] items-end justify-center sm:h-[10.5rem]">
            <div className="award-glow absolute top-6 size-40 rounded-full bg-[radial-gradient(circle,rgb(247_200_115/0.75),rgb(247_200_115/0)_68%)] sm:size-44" aria-hidden />
            <TrophyEmblem size={118} className="award-trophy relative sm:hidden" />
            <TrophyEmblem size={134} className="award-trophy relative hidden sm:block" />
          </div>

          <h2 id="winner-title" className={cn(
              "award-text mt-3 font-display leading-tight font-bold text-crimson-deep",
              // Capitals are wide: the English heading is sized to fit an iPhone in one line.
              locale === "en" ? "text-[1.55rem] tracking-[0.03em] uppercase sm:text-[1.9rem]" : "text-[2rem] sm:text-[2.35rem]",
            )}>
            {t("awards.congrats")}
          </h2>
          <p className="award-text mt-1 text-[15px] font-semibold text-ink-soft [animation-delay:760ms] sm:text-base">{t("awards.winnerLine")}</p>

          {/* Gold ornament */}
          <div className="award-text my-5 flex items-center justify-center gap-2 [animation-delay:840ms]" aria-hidden>
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#c98b1b] rtl:bg-gradient-to-l" />
            <span className="size-2 rotate-45 bg-[linear-gradient(135deg,#fff2c2,#c98b1b)] shadow-[0_0_6px_rgb(233_182_73/0.8)]" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#c98b1b] rtl:bg-gradient-to-r" />
          </div>

          <p className="award-text text-sm font-semibold text-muted [animation-delay:900ms]">{t("awards.youWon")}</p>
          <p
            id="winner-prize"
            data-testid="award-prize"
            dir="auto"
            className="award-text mt-1.5 bg-[linear-gradient(180deg,#d4162d,#8a0a1a)] bg-clip-text font-display text-[1.75rem] leading-snug font-bold text-transparent [animation-delay:980ms] sm:text-[2rem]"
          >
            {award.prize}
          </p>

          {award.message ? (
            <blockquote className="award-text mt-5 rounded-2xl bg-[#fbf2df] px-4 py-3 text-start ring-1 ring-[#e9b649]/35 [animation-delay:1060ms]">
              <p className="text-xs font-semibold text-[#8a5a0c]">{t("awards.fromTeam")}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink" dir="auto">
                {award.message}
              </p>
            </blockquote>
          ) : null}

          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            autoFocus
            className="award-text mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#e3253c_0%,#ce1126_48%,#9c0c1d_100%)] text-lg font-bold text-white shadow-[0_14px_30px_-12px_rgb(156_12_29/0.8),inset_0_1px_0_rgb(255_226_160/0.55)] ring-1 ring-[#e9b649]/50 transition duration-200 [animation-delay:1140ms] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_18px_34px_-12px_rgb(156_12_29/0.9),inset_0_1px_0_rgb(255_226_160/0.7)] active:translate-y-0 active:scale-[0.98] disabled:opacity-80"
          >
            {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
            {t("awards.awesome")}
          </button>
        </div>
      </div>
    </div>
  );
}
