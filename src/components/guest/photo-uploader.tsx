"use client";

import {ImagePlus, Send, X} from "lucide-react";
import {useEffect, useRef, useState} from "react";

import {finishGuestUpload, uploadGuestPhoto} from "@/app/actions/photos";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {Button} from "@/components/ui/button";
import {Card, CardHeader} from "@/components/ui/card";
import {FormAlert} from "@/components/ui/field";
import {preparePhoto} from "@/lib/client/prepare-photo";
import {useI18n} from "@/lib/i18n/client";

type Selected = {key: string; file: File; preview: string; title: string; caption: string};

const MAX_SELECTION = 10;

/**
 * Multi-photo upload: pick photos, optionally title/caption each, submit for review.
 * Photos are resized in the browser and sent one per request, so a large selection
 * never hits the server's request-size limit and a single failure doesn't lose the rest.
 */
export function PhotoUploader() {
  const {t} = useI18n();
  const errorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [progress, setProgress] = useState<{done: number; total: number} | null>(null);
  const [result, setResult] = useState<{ok: number; failed: Array<{name: string; message: string}>} | null>(null);

  // Preview URLs are released when a photo leaves the selection, and all of them on unmount.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const release = (url: string) => {
    URL.revokeObjectURL(url);
    previews.current.delete(url);
  };

  const track = (url: string) => {
    previews.current.add(url);
    return url;
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setResult(null);
    const additions = [...files]
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, MAX_SELECTION - selected.length))
      .map((file) => ({key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, preview: track(URL.createObjectURL(file)), title: "", caption: ""}));
    setSelected((current) => [...current, ...additions]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const update = (key: string, patch: Partial<Selected>) => setSelected((current) => current.map((item) => (item.key === key ? {...item, ...patch} : item)));
  const remove = (key: string) =>
    setSelected((current) => {
      const item = current.find((entry) => entry.key === key);
      if (item) release(item.preview);
      return current.filter((entry) => entry.key !== key);
    });

  const submit = async () => {
    const queue = selected;
    let ok = 0;
    const failed: Array<{name: string; message: string}> = [];
    setProgress({done: 0, total: queue.length});
    for (const [index, item] of queue.entries()) {
      try {
        const photo = await preparePhoto(item.file);
        const form = new FormData();
        form.append("file", photo, "photo.jpg");
        form.append("title", item.title);
        form.append("caption", item.caption);
        const response = await uploadGuestPhoto(form);
        if (response.ok) ok += 1;
        else failed.push({name: item.file.name, message: errorMessage(response)});
      } catch {
        failed.push({name: item.file.name, message: t("photos.unreadable")});
      }
      setProgress({done: index + 1, total: queue.length});
    }
    // Keep only the photos that failed, so the guest can retry or remove them.
    const failedNames = new Set(failed.map((entry) => entry.name));
    setSelected((current) => {
      current.filter((item) => !failedNames.has(item.file.name)).forEach((item) => release(item.preview));
      return current.filter((item) => failedNames.has(item.file.name));
    });
    setProgress(null);
    setResult({ok, failed});
    if (ok) await finishGuestUpload();
  };

  const busy = progress !== null;

  return (
    <Card>
      <CardHeader title={t("photos.uploadTitle")} description={t("photos.chooseHint")} />

      {result?.ok ? (
        <div className="mb-4">
          <FormAlert tone="success">{result.ok === 1 ? t("photos.submitted") : t("photos.submittedMany", {count: result.ok})}</FormAlert>
        </div>
      ) : null}
      {result?.failed.length ? (
        <div className="mb-4">
          <FormAlert>
            <p>{t("photos.someFailed", {count: result.failed.length})}</p>
            <ul className="mt-1 list-inside list-disc font-normal">
              {result.failed.map((entry) => (
                <li key={entry.name}>
                  <span dir="ltr">{entry.name}</span>: {entry.message}
                </li>
              ))}
            </ul>
          </FormAlert>
        </div>
      ) : null}


      {selected.length ? (
        <ul className="mb-4 grid gap-4 sm:grid-cols-2">
          {selected.map((item) => (
            <li key={item.key} className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
              <div className="relative aspect-[4/3] bg-paper-deep">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={item.preview} alt="" className="absolute inset-0 size-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  disabled={busy}
                  className="absolute top-2 end-2 grid size-8 place-items-center rounded-full bg-night/70 text-white hover:bg-night disabled:opacity-50"
                  aria-label={t("photos.remove")}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="space-y-2 p-3">
                <input
                  value={item.title}
                  onChange={(event) => update(item.key, {title: event.target.value})}
                  maxLength={100}
                  placeholder={`${t("photos.titleLabel")} (${t("common.optional")})`}
                  aria-label={t("photos.titleLabel")}
                  disabled={busy}
                  dir="auto"
                  className="h-10 w-full rounded-lg bg-card px-3 text-sm ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none"
                />
                <input
                  value={item.caption}
                  onChange={(event) => update(item.key, {caption: event.target.value})}
                  maxLength={300}
                  placeholder={`${t("photos.captionLabel")} (${t("common.optional")})`}
                  aria-label={t("photos.captionLabel")}
                  disabled={busy}
                  dir="auto"
                  className="h-10 w-full rounded-lg bg-card px-3 text-sm ring-1 ring-line-strong focus:ring-2 focus:ring-crimson focus:outline-none"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-ink ring-1 ring-line-strong hover:bg-paper has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
          aria-disabled={busy || selected.length >= MAX_SELECTION}
        >
          <ImagePlus className="size-4" aria-hidden />
          {t("photos.choose")}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            className="sr-only"
           
            aria-label={t("photos.choose")}
            onChange={(event) => addFiles(event.target.files)}
            disabled={busy || selected.length >= MAX_SELECTION}
          />
        </label>
        {selected.length ? (
          <Button onClick={() => void submit()} pending={busy}>
            {!busy ? <Send className="size-4 rtl:-scale-x-100" aria-hidden /> : null}
            {busy ? t("photos.uploading", {done: progress.done, total: progress.total}) : t("photos.submit", {count: selected.length})}
          </Button>
        ) : null}
        <span className="text-xs text-muted">{t("photos.reviewNote")}</span>
      </div>
      {busy ? (
        <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={t("photos.uploading", {done: progress.done, total: progress.total})}>
          <div className="h-2 overflow-hidden rounded-full bg-paper-deep">
            <div className="h-full rounded-full bg-crimson transition-[width] duration-500" style={{width: `${Math.max(6, (progress.done / Math.max(1, progress.total)) * 100)}%`}} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
