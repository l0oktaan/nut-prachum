// Browser-side helpers: JSON fetch wrapper and the "rooms I created" list kept in localStorage.
import { useSyncExternalStore } from "react";
import type { TimeMode } from "./slots";

const noopSubscribe = () => () => {};

/**
 * Reads a browser-only value (URL hash, origin, localStorage…) without a hydration mismatch:
 * the server render and first client pass use `server`, then `get()` takes over.
 * `get` must return a stable primitive.
 */
export function useClientValue<T extends string | number | boolean | null | undefined>(get: () => T, server: T): T {
  return useSyncExternalStore(noopSubscribe, get, () => server);
}

export async function api<T>(url: string, init: RequestInit & { adminKey?: string } = {}): Promise<T> {
  const { adminKey, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
      ...headers,
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
  return data as T;
}

export interface SavedRoom {
  slug: string;
  title: string;
  adminKey: string;
  savedAt: string;
}

const STORAGE_KEY = "nut-prachum:rooms";

export function readSavedRoomsRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseSavedRooms(raw: string): SavedRoom[] {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as SavedRoom[]) : [];
  } catch {
    return [];
  }
}

export const loadSavedRooms = () => parseSavedRooms(readSavedRoomsRaw());

export function saveRoom(room: Omit<SavedRoom, "savedAt">) {
  try {
    const rest = loadSavedRooms().filter((r) => r.slug !== room.slug);
    const next = [{ ...room, savedAt: new Date().toISOString() }, ...rest].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function forgetRoom(slug: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loadSavedRooms().filter((r) => r.slug !== slug)));
  } catch {
    /* ignore */
  }
}

/** A new room prefilled from an earlier one ("สร้างนัดซ้ำ"): same topic, members and time settings, new dates. */
export interface RoomDraft {
  fromSlug: string;
  title: string;
  description: string;
  organizerName: string;
  timeMode: TimeMode;
  dayStartMin: number;
  dayEndMin: number;
  slotMinutes: number;
  durationDays: number;
  allowNewMembers: boolean;
  members: string[];
}

// Kept per tab and only picked up by /?repeat={slug}, so a plain visit to the home page stays blank.
const draftKey = (slug: string) => `nut-prachum:repeat:${slug}`;

export function saveDraft(draft: RoomDraft) {
  try {
    sessionStorage.setItem(draftKey(draft.fromSlug), JSON.stringify(draft));
  } catch {
    /* storage unavailable — ignore */
  }
}

/** The raw draft named by ?repeat= in the URL, or null. */
export function readDraftRaw(): string | null {
  const slug = new URLSearchParams(window.location.search).get("repeat");
  try {
    return slug ? sessionStorage.getItem(draftKey(slug)) : null;
  } catch {
    return null;
  }
}

export function parseDraft(raw: string | null): RoomDraft | null {
  try {
    return raw ? (JSON.parse(raw) as RoomDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(slug: string) {
  try {
    sessionStorage.removeItem(draftKey(slug));
  } catch {
    /* ignore */
  }
}

export function readHashParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.hash.slice(1)).get(name);
}

export function clearHash() {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const relFmt = new Intl.RelativeTimeFormat("th", { numeric: "auto" });

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "เมื่อสักครู่";
  if (abs < 3600) return relFmt.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return relFmt.format(Math.round(diff / 3600), "hour");
  return relFmt.format(Math.round(diff / 86400), "day");
}
