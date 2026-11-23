import {unstable_rethrow} from "next/navigation";
import {ZodError, type ZodType} from "zod";

import {AppError, type ErrorKey} from "@/lib/errors";

export type ActionError = {ok: false; error: ErrorKey; vars?: Record<string, string | number>; fieldErrors?: Record<string, string>};
export type ActionResult<T = null> = {ok: true; data: T} | ActionError;

/**
 * Runs a server action body and converts thrown errors into a serializable result.
 * Field errors carry `validation.*` message keys so the client can translate them.
 * Navigation signals (redirect/notFound) are re-thrown so Next.js can handle them.
 */
export async function runAction<T>(fn: () => Promise<T> | T): Promise<ActionResult<T>> {
  try {
    return {ok: true, data: await fn()};
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      return {ok: false, error: error.key, vars: error.vars};
    }
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const field = String(issue.path[0] ?? "form");
        fieldErrors[field] ??= issue.message.startsWith("validation.") ? issue.message : "validation.invalid";
      }
      return {ok: false, error: "invalidInput", fieldErrors};
    }
    console.error("[action] unexpected error", error);
    return {ok: false, error: "unexpected"};
  }
}

/** Parses FormData (or a plain object) with a zod schema; throws ZodError on failure. */
export function parse<T>(schema: ZodType<T>, input: FormData | Record<string, unknown>): T {
  const raw = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  return schema.parse(raw);
}
