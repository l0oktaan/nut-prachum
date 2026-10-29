// Light/dark theme: the visitor's choice (or the system's) as <html data-theme>, kept in localStorage.
import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_KEY as KEY } from "./theme-init";

export type ThemePref = "light" | "dark" | "system";

function readPref(): ThemePref {
  try {
    const p = localStorage.getItem(KEY);
    return p === "light" || p === "dark" ? p : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia(DARK_QUERY).matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // While following the system, track it live (e.g. the OS switching to dark at sunset).
  const mq = matchMedia(DARK_QUERY);
  const onSystem = () => readPref() === "system" && apply("system");
  mq.addEventListener("change", onSystem);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", onSystem);
  };
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable — still switch for this page */
  }
  apply(pref);
  listeners.forEach((l) => l());
}

export const useThemePref = () => useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);
