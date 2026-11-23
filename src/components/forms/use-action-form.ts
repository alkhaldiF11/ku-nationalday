"use client";

import {useCallback, useRef, useState, useTransition, type FormEvent} from "react";

import type {ActionResult} from "@/lib/actions";
import {useI18n} from "@/lib/i18n/client";
import type {MessageKey} from "@/lib/i18n/core";

type FormAction<T> = (prev: unknown, formData: FormData) => Promise<ActionResult<T>>;

/**
 * Submits a form to a server action without React's automatic form reset,
 * so the user's input survives validation errors. Resets only on success.
 */
export function useActionForm<T>(action: FormAction<T>, options: {onSuccess?: (data: T, form: HTMLFormElement) => void; resetOnSuccess?: boolean} = {}) {
  const {t} = useI18n();
  const [result, setResult] = useState<ActionResult<T> | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const {onSuccess, resetOnSuccess = false} = options;

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      startTransition(async () => {
        const next = await action(null, formData);
        setResult(next);
        if (next?.ok) {
          if (resetOnSuccess) form.reset();
          onSuccess?.(next.data, form);
        }
      });
    },
    [action, onSuccess, resetOnSuccess],
  );

  const failure = result && !result.ok ? result : null;

  return {
    formRef,
    onSubmit,
    pending,
    result,
    reset: () => setResult(null),
    fieldError: (name: string) => failure?.fieldErrors?.[name],
    error: failure && !(failure.error === "invalidInput" && failure.fieldErrors) ? t(`errors.${failure.error}` as MessageKey, failure.vars) : null,
  };
}

/** Translates an action error for toasts. */
export function useErrorMessage() {
  const {t} = useI18n();
  return useCallback(
    (result: {error: string; vars?: Record<string, string | number>}) => t(`errors.${result.error}` as MessageKey, result.vars),
    [t],
  );
}
