"use client";

import {Camera, CameraOff} from "lucide-react";
import {useEffect, useId, useRef, useState} from "react";

import {Button} from "@/components/ui/button";
import {useI18n} from "@/lib/i18n/client";

type Status = "starting" | "running" | "stopped" | "error";

/**
 * Camera QR scanner. The effect owns the camera lifecycle: it starts on mount (and
 * whenever `session` changes), and always releases the camera on cleanup.
 */
export function QrScanner({onScan}: {onScan: (value: string) => void}) {
  const {t} = useI18n();
  const regionId = `qr-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [session, setSession] = useState(0);
  const [status, setStatus] = useState<Status>("starting");
  const onScanRef = useRef(onScan);
  const lastRef = useRef("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (session < 0) return; // session < 0 means "stopped by the user"
    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    import("html5-qrcode")
      .then(async ({Html5Qrcode}) => {
        if (cancelled) return;
        scanner = new Html5Qrcode(regionId, {verbose: false});
        await scanner.start(
          {facingMode: "environment"},
          {fps: 10, qrbox: (w, h) => ({width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7})},
          (text) => {
            const value = text.trim();
            if (value && value !== lastRef.current) {
              lastRef.current = value;
              onScanRef.current(value);
            }
          },
          () => undefined,
        );
        if (!cancelled) setStatus("running");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      const active = scanner;
      if (active) {
        active
          .stop()
          .catch(() => undefined)
          .finally(() => active.clear());
      }
    };
  }, [regionId, session]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-night">
        <div id={regionId} className="aspect-square w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
        {status !== "running" ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">
            {status === "error" ? (
              <span className="flex flex-col items-center gap-2">
                <CameraOff className="size-8" aria-hidden />
                {t("staff.lookup.cameraError")}
              </span>
            ) : (
              <Camera className={status === "starting" ? "size-8 animate-pulse" : "size-8"} aria-hidden />
            )}
          </div>
        ) : null}
      </div>
      <p className="text-sm text-muted">{t("staff.lookup.scanHint")}</p>
      {status === "running" ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSession(-1);
            setStatus("stopped");
          }}
        >
          {t("staff.lookup.stopCamera")}
        </Button>
      ) : status !== "starting" ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setStatus("starting");
            setSession((value) => Math.abs(value) + 1);
          }}
        >
          {t("staff.lookup.startCamera")}
        </Button>
      ) : null}
    </div>
  );
}
