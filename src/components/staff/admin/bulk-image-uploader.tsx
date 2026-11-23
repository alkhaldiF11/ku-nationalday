"use client";

import {ImagePlus, Plus, Upload, X} from "lucide-react";
import {useEffect, useRef, useState} from "react";

import {adminFinishUploads, adminUploadImage} from "@/app/actions/admin";
import {useErrorMessage} from "@/components/forms/use-action-form";
import {Button} from "@/components/ui/button";
import {Dialog} from "@/components/ui/dialog";
import {FormAlert, SelectField, TextField} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import {preparePhoto} from "@/lib/client/prepare-photo";
import {useI18n} from "@/lib/i18n/client";
import {cn} from "@/lib/utils/cn";

type Selected = {key: string; file: File; preview: string};

/** Photos uploaded at the same time. Each is its own request (Vercel caps a request at 4.5 MB). */
const PARALLEL = 3;

/**
 * Bulk gallery upload: pick (or drop) any number of photos, choose the album once, press one
 * button. Each photo is shrunk in the browser and sent separately, so one bad file never loses
 * the rest — failed photos stay selected for another try.
 */
export function BulkImageUploader({categories, albums, defaultYear, label}: {categories: string[]; albums: number[]; defaultYear: number; label?: string}) {
  const {t, locale} = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [albumYear, setAlbumYear] = useState(defaultYear);
  const [category, setCategory] = useState("General");
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<{done: number; total: number} | null>(null);
  const [failures, setFailures] = useState<Array<{name: string; message: string}>>([]);
  const [dragging, setDragging] = useState(false);
  const busy = progress !== null;

  // Release preview URLs when photos leave the selection, and all of them on unmount.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const release = (items: Selected[]) =>
    items.forEach((item) => {
      URL.revokeObjectURL(item.preview);
      previews.current.delete(item.preview);
    });

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setFailures([]);
    const additions = [...files]
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        return {key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, preview};
      });
    setSelected((current) => [...current, ...additions]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (key: string) =>
    setSelected((current) => {
      release(current.filter((item) => item.key === key));
      return current.filter((item) => item.key !== key);
    });

  const clear = () =>
    setSelected((current) => {
      release(current);
      return [];
    });

  const upload = async () => {
    const queue = [...selected];
    const photoTitle = title.trim() || t("gallery.yearAlbum", {year: albumYear});
    const failed: Array<{item: Selected; message: string}> = [];
    let done = 0;
    let ok = 0;
    setFailures([]);
    setProgress({done: 0, total: queue.length});

    const uploadOne = async (item: Selected) => {
      try {
        const photo = await preparePhoto(item.file, 2560, 0.88);
        const form = new FormData();
        form.append("file", new File([photo], "photo.jpg", {type: "image/jpeg"}));
        form.append("title", photoTitle);
        form.append("caption", "");
        form.append("category", category.trim() || "General");
        form.append("albumYear", String(albumYear));
        form.append("deferRefresh", "1");
        const response = await adminUploadImage(null, form);
        if (response.ok) ok += 1;
        else failed.push({item, message: errorMessage(response)});
      } catch {
        failed.push({item, message: t("photos.unreadable")});
      }
      done += 1;
      setProgress({done, total: queue.length});
    };

    // A few workers pull from the shared queue until it's empty.
    let next = 0;
    await Promise.all(
      Array.from({length: Math.min(PARALLEL, queue.length)}, async () => {
        while (next < queue.length) await uploadOne(queue[next++]);
      }),
    );

    const failedKeys = new Set(failed.map((entry) => entry.item.key));
    setSelected((current) => {
      release(current.filter((item) => !failedKeys.has(item.key)));
      return current.filter((item) => failedKeys.has(item.key));
    });
    setFailures(failed.map((entry) => ({name: entry.item.file.name, message: entry.message})));
    setProgress(null);
    if (ok) {
      await adminFinishUploads();
      toast("success", t("staff.gallery.bulkDone", {count: ok.toLocaleString(locale === "ar" ? "ar-BH" : "en")}));
    }
    if (!failed.length) setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        {label ?? t("staff.gallery.bulkUpload")}
      </Button>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} title={t("staff.gallery.bulkUpload")} size="lg">
        <div className="space-y-5">
          {failures.length ? (
            <FormAlert>
              <p>{t("staff.gallery.bulkFailed", {count: failures.length})}</p>
              <ul className="mt-1 max-h-32 list-inside list-disc overflow-y-auto font-normal">
                {failures.map((entry, index) => (
                  <li key={entry.name + index}>
                    <span dir="ltr">{entry.name}</span>: {entry.message}
                  </li>
                ))}
              </ul>
            </FormAlert>
          ) : null}

          {/* Picker / drop zone */}
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-paper px-4 py-7 text-center transition hover:border-crimson/50",
              dragging && "border-crimson bg-crimson-wash",
              busy && "pointer-events-none opacity-60",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <ImagePlus className="size-8 text-crimson" aria-hidden />
            <span className="font-bold">{selected.length ? t("staff.gallery.bulkAddMore") : t("staff.gallery.bulkChoose")}</span>
            <span className="max-w-md text-sm text-muted">{t("staff.gallery.bulkDrop")}</span>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label={t("staff.gallery.bulkChoose")} onChange={(event) => addFiles(event.target.files)} disabled={busy} />
          </label>

          {selected.length ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{t("staff.gallery.bulkSelected", {count: selected.length})}</p>
                {!busy ? (
                  <button type="button" onClick={clear} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-crimson">
                    {t("staff.gallery.bulkClear")}
                  </button>
                ) : null}
              </div>
              <ul className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-2xl bg-paper p-2 ring-1 ring-line sm:grid-cols-6">
                {selected.map((item) => (
                  <li key={item.key} className="relative aspect-square overflow-hidden rounded-xl bg-paper-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview (object URL) */}
                    <img src={item.preview} alt="" loading="lazy" className="size-full object-cover" />
                    {!busy ? (
                      <button
                        type="button"
                        onClick={() => remove(item.key)}
                        className="absolute end-1 top-1 grid size-7 place-items-center rounded-full bg-night/70 text-white hover:bg-crimson"
                        aria-label={`${t("staff.gallery.bulkRemove")}: ${item.file.name}`}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* One set of details for the whole batch */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t("staff.gallery.album")} name="albumYear" value={String(albumYear)} onChange={(event) => setAlbumYear(Number(event.target.value))} disabled={busy}>
              {albums.map((year) => (
                <option key={year} value={year}>
                  {t("gallery.yearAlbum", {year})}
                </option>
              ))}
            </SelectField>
            <TextField label={t("staff.gallery.category")} name="category" list="bulk-gallery-categories" value={category} onChange={(event) => setCategory(event.target.value)} disabled={busy} />
            <datalist id="bulk-gallery-categories">
              {categories.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          <TextField
            label={t("staff.gallery.bulkTitle")}
            name="title"
            optional
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            hint={t("staff.gallery.bulkTitleHint", {year: albumYear})}
            disabled={busy}
          />

          {busy ? (
            <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={t("staff.gallery.bulkProgress", {done: progress.done, total: progress.total})}>
              <div className="mb-1.5 flex justify-between text-sm font-semibold">
                <span>{t("staff.gallery.bulkProgress", {done: progress.done, total: progress.total})}</span>
                <span className="tabular">{Math.round((progress.done / progress.total) * 100)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper-deep">
                <div className="h-full rounded-full bg-crimson transition-[width] duration-300" style={{width: `${Math.max(4, (progress.done / progress.total) * 100)}%`}} />
              </div>
              <p className="mt-2 text-xs text-muted">{t("staff.gallery.bulkKeepOpen")}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void upload()} pending={busy} disabled={!selected.length}>
              {!busy ? <Upload className="size-4" aria-hidden /> : null}
              {t("staff.gallery.bulkStart", {count: selected.length})}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
