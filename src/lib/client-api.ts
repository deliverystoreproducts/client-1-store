"use client";

import type { ApiErrorBody } from "@/lib/public-types";

/**
 * Browser -> our own backend. Every path here is same-origin and relative.
 *
 * There is no configuration for a base URL because there is no other host to
 * talk to: the browser only ever speaks to this app. If you ever find yourself
 * adding an absolute URL to this file, stop — that call belongs on the server.
 */

export class ClientApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: Record<string, string | number> | undefined;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message || "Something went wrong.");
    this.status = status;
    this.code = body?.error || "error";
    this.detail = body?.detail;
  }
}

async function parse<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty or non-JSON */
  }
  if (!res.ok) throw new ClientApiError(res.status, (body ?? null) as ApiErrorBody | null);
  return body as T;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return parse<T>(await fetch(path, { signal, headers: { Accept: "application/json" } }));
}

export async function apiPost<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  return parse<T>(await fetch(path, { method: "POST", body: form }));
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
