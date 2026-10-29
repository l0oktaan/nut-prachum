import { blockDays, blockStarts, cellKey, getDates, getSlots, type SlotConfig } from "./slots";
import type { Cell } from "./types";

export interface CellTally {
  key: string;
  /** First day (for multi-day meetings, the block's start). */
  date: string;
  /** Every day covered — one entry for single-day meetings. */
  days: string[];
  slot: number;
  yes: string[]; // participant ids
  maybe: string[];
}

export function tally(config: SlotConfig, cells: Cell[]): Map<string, CellTally> {
  const map = new Map<string, CellTally>();
  for (const date of getDates(config)) {
    for (const s of getSlots(config)) {
      const key = cellKey(date, s.key);
      map.set(key, { key, date, days: [date], slot: s.key, yes: [], maybe: [] });
    }
  }
  for (const c of cells) {
    const t = map.get(cellKey(c.d, c.s));
    if (!t) continue;
    (c.l === 2 ? t.yes : t.maybe).push(c.p);
  }
  return map;
}

/**
 * Candidate meetings. For multi-day rooms, each candidate is the same slot on `durationDays`
 * consecutive days: a person counts only if they marked every one of those days —
 * "available" if all days are available, otherwise "if needed".
 */
export function candidates(config: SlotConfig, cellTallies: Map<string, CellTally>): Map<string, CellTally> {
  if (config.durationDays <= 1) return cellTallies;
  const out = new Map<string, CellTally>();
  const offered = new Set(getDates(config));
  for (const start of blockStarts(config)) {
    const days = blockDays(config, start, offered)!;
    for (const s of getSlots(config)) {
      const parts = days.map((d) => cellTallies.get(cellKey(d, s.key))!);
      const marked = (t: CellTally) => new Set([...t.yes, ...t.maybe]);
      const all = parts.slice(1).reduce((acc, t) => {
        const m = marked(t);
        return acc.filter((p) => m.has(p));
      }, [...marked(parts[0])]);
      const yes = all.filter((p) => parts.every((t) => t.yes.includes(p)));
      const key = cellKey(start, s.key);
      out.set(key, { key, date: start, days, slot: s.key, yes, maybe: all.filter((p) => !yes.includes(p)) });
    }
  }
  return out;
}

export const score = (t: CellTally) => t.yes.length + t.maybe.length * 0.5;

/** Best candidates first: most "available", then most "if needed", then earliest. */
export function rank(tallies: Map<string, CellTally>, limit = 5): CellTally[] {
  return [...tallies.values()]
    .filter((t) => t.yes.length + t.maybe.length > 0)
    .sort(
      (a, b) =>
        b.yes.length - a.yes.length ||
        b.maybe.length - a.maybe.length ||
        a.date.localeCompare(b.date) ||
        a.slot - b.slot,
    )
    .slice(0, limit);
}
