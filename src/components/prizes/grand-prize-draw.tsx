"use client";

import {useRouter} from "next/navigation";
import {Check, Maximize2, Sparkles, Trophy, X} from "lucide-react";
import {useEffect, useRef, useState, useTransition} from "react";

import {cancelGrandPrizeDraw, finalizeGrandPrizeDraw, runGrandPrizeDraw} from "@/app/actions/prizes";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {Confetti} from "@/components/prizes/confetti";
import {Button} from "@/components/ui/button";
import {KuLogo} from "@/components/ui/ku-logo";
import {useToast} from "@/components/ui/toast";
import {useI18n} from "@/lib/i18n/client";
import {formatNumber} from "@/lib/i18n/core";

type Winner = {id: string; guestCode: string; guestName: string; entries: number};

const ROLL_MS = 3600;

/**
 * Start-the-draw button plus the full-screen ceremony view: Guest IDs roll on screen
 * while the server picks the winner (cryptographically random), then the winner is
 * revealed with confetti. The admin then finalizes the winner or cancels the draw.
 */
export function GrandPrizeDraw({entryCodes, checkedInOnly, pending, disabled}: {entryCodes: string[]; checkedInOnly: boolean; pending: Winner | null; disabled: boolean}) {
  const {t, locale} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "rolling" | "winner">("idle");
  const [winner, setWinner] = useState<Winner | null>(null);
  const [rollingCode, setRollingCode] = useState("");
  const [settling, startSettling] = useTransition();
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  };

  const start = async () => {
    enterFullscreen();
    setStage("rolling");
    const pool = entryCodes.length ? entryCodes : ["G-????"];
    timer.current = window.setInterval(() => setRollingCode(pool[Math.floor(Math.random() * pool.length)]), 70);
    // The result comes from the server; the rolling animation is only for the audience.
    const [result] = await Promise.all([runGrandPrizeDraw({checkedInOnly}), new Promise((resolve) => setTimeout(resolve, ROLL_MS))]);
    if (timer.current) window.clearInterval(timer.current);
    if (!result.ok) {
      setStage("idle");
      exitFullscreen();
      toast("error", errorMessage(result));
      return;
    }
    setWinner(result.data);
    setStage("winner");
  };

  const reveal = (draw: Winner) => {
    enterFullscreen();
    setWinner(draw);
    setStage("winner");
  };

  const close = () => {
    setStage("idle");
    exitFullscreen();
    router.refresh();
  };

  const settle = (kind: "final" | "void") =>
    startSettling(async () => {
      if (!winner) return;
      const result = kind === "final" ? await finalizeGrandPrizeDraw(winner.id) : await cancelGrandPrizeDraw(winner.id);
      if (!result.ok) {
        toast("error", errorMessage(result));
        return;
      }
      toast("success", kind === "final" ? t("prizes.draw.finalized", {code: winner.guestCode}) : t("prizes.draw.cancelled"));
      setWinner(null);
      close();
    });

  return (
    <>
      {pending ? (
        <div className="rounded-2xl bg-gold-wash p-4 ring-1 ring-gold/30">
          <p className="font-semibold">{t("prizes.draw.pendingTitle", {code: pending.guestCode, name: pending.guestName})}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("prizes.draw.pendingBody")}</p>
          <Button className="mt-3" variant="dark" onClick={() => reveal(pending)}>
            <Maximize2 className="size-4" aria-hidden />
            {t("prizes.draw.showAgain")}
          </Button>
        </div>
      ) : (
        <Button size="lg" className="w-full" disabled={disabled} onClick={() => void start()}>
          <Sparkles className="size-5" aria-hidden />
          {t("prizes.draw.start")}
        </Button>
      )}

      {stage !== "idle" ? (
        <div className="lattice fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-night px-6 text-center text-white" role="dialog" aria-modal="true" aria-label={t("prizes.draw.grandPrize")}>
          {stage === "winner" ? <Confetti /> : null}
          <div className="absolute top-6 start-6">
            <KuLogo tone="white" size={56} />
          </div>
          {stage === "winner" ? (
            <button type="button" onClick={close} className="absolute top-6 end-6 rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label={t("common.close")}>
              <X className="size-6" />
            </button>
          ) : null}

          <p className="flex items-center gap-3 text-sm font-bold tracking-[0.4em] text-gold uppercase sm:text-base">
            <Trophy className="size-5" aria-hidden />
            {t("prizes.draw.grandPrize")}
            <Trophy className="size-5" aria-hidden />
          </p>

          {stage === "rolling" ? (
            <>
              <p className="mt-10 font-mono text-7xl font-bold tracking-wider text-white/90 tabular sm:text-9xl" dir="ltr" aria-live="off">
                {rollingCode || "G-····"}
              </p>
              <p className="mt-8 animate-pulse text-lg text-white/60">{t("prizes.draw.rolling", {count: formatNumber(locale, entryCodes.length)})}</p>
            </>
          ) : winner ? (
            <div className="animate-pop" aria-live="assertive">
              <p className="mt-6 text-lg text-white/70 sm:text-2xl">{t("prizes.draw.winnerIs")}</p>
              <p className="mt-4 font-mono text-7xl font-bold tracking-wider text-white sm:text-[10rem] sm:leading-none" dir="ltr" data-testid="draw-winner-code">
                {winner.guestCode}
              </p>
              <p className="mt-6 font-display text-4xl font-semibold text-gold sm:text-6xl" data-testid="draw-winner-name">
                {winner.guestName}
              </p>
              <p className="mt-6 text-sm text-white/50">{t("prizes.draw.fromEntries", {count: formatNumber(locale, winner.entries)})}</p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Button size="lg" variant="success" pending={settling} onClick={() => settle("final")}>
                  <Check className="size-5" aria-hidden />
                  {t("prizes.draw.finalize")}
                </Button>
                <Button size="lg" variant="secondary" disabled={settling} onClick={() => settle("void")}>
                  {t("prizes.draw.cancel")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
