"use client";

import {Pencil, Plus} from "lucide-react";
import {useState, type ReactNode} from "react";

import {useActionForm} from "@/components/forms/use-action-form";
import {Button} from "@/components/ui/button";
import {Dialog} from "@/components/ui/dialog";
import {FormAlert} from "@/components/ui/field";
import {useToast} from "@/components/ui/toast";
import type {ActionResult} from "@/lib/actions";
import {useI18n} from "@/lib/i18n/client";

type Action = (prev: unknown, formData: FormData) => Promise<ActionResult<unknown>>;

/**
 * Button + dialog + form wired to a server action. `fields` receives a fieldError
 * lookup so each input can show its translated validation message.
 */
export function EditorDialog({
  action,
  title,
  trigger,
  mode,
  successMessage,
  fields,
  hidden,
  itemLabel,
  size = "md",
}: {
  /** Name of the item being edited, for the edit button's accessible label. */
  itemLabel?: string;
  action: Action;
  title: ReactNode;
  trigger: ReactNode;
  mode: "add" | "edit";
  successMessage: string;
  fields: (fieldError: (name: string) => string | undefined) => ReactNode;
  hidden?: Record<string, string>;
  size?: "sm" | "md" | "lg";
}) {
  const {t} = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const form = useActionForm(action, {
    onSuccess: () => {
      toast("success", successMessage);
      setOpen(false);
    },
  });

  const close = () => {
    setOpen(false);
    form.reset();
  };

  return (
    <>
      {mode === "add" ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {trigger}
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={itemLabel ? `${t("common.edit")}: ${itemLabel}` : t("common.edit")}>
          <Pencil className="size-4" aria-hidden />
          <span className="max-sm:sr-only">{t("common.edit")}</span>
        </Button>
      )}
      <Dialog open={open} onClose={close} title={title} size={size}>
        <form onSubmit={form.onSubmit} className="space-y-4" noValidate encType="multipart/form-data">
          {hidden ? Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />) : null}
          {form.error ? <FormAlert>{form.error}</FormAlert> : null}
          {fields(form.fieldError)}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" pending={form.pending}>
              {form.pending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
