import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

// The host's Traefik access log (JSON lines, rotated daily: access.log, access.log.1, access.log.N.gz),
// mounted read-only. It covers every site on the server, so only our host's lines are used.
const DIR = process.env.TRAEFIK_LOG_DIR ?? "/var/log/traefik-host";
const HOST = (() => {
  try {
    return process.env.APP_URL ? new URL(process.env.APP_URL).host : null;
  } catch {
    return null;
  }
})();

interface Entry {
  t: number;
  ip: string;
  method: string;
  path: string;
  status: number;
  ua: string;
}

// Paths only scanners ask for — this app has no PHP, WordPress, dotfiles or CGI.
const PROBE = /\.(php|asp|aspx|jsp|cgi|env|git|sql|bak|ini|ya?ml)\b|\/wp-|\/wordpress|phpmyadmin|\/\.|\/cgi-bin|\/vendor\/|\/actuator|\/boaform|\/HNAP1/i;

let cache: { at: number; entries: Entry[]; files: number } | null = null;

async function loadEntries(maxDays: number): Promise<{ entries: Entry[]; files: number }> {
  if (cache && Date.now() - cache.at < 60_000) return cache;
  const names = (await readdir(DIR)).filter((n) => /^access\.log(\.\d+(\.gz)?)?$/.test(n));
  const order = (n: string) => Number(n.match(/^access\.log\.(\d+)/)?.[1] ?? 0);
  const recent = names.sort((a, b) => order(a) - order(b)).filter((n) => order(n) <= maxDays);
  const since = Date.now() - maxDays * 86_400_000;
  const entries: Entry[] = [];
  for (const name of recent) {
    const raw = await readFile(join(DIR, name));
    const text = (name.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8");
    for (const line of text.split("\n")) {
      if (!line || (HOST && !line.includes(`"RequestHost":"${HOST}"`))) continue;
      try {
        const d = JSON.parse(line);
        const t = Date.parse(d.StartUTC ?? d.time);
        if (t < since) continue;
        entries.push({
          t,
          ip: d.ClientHost ?? "?",
          method: d.RequestMethod ?? "",
          path: String(d.RequestPath ?? "").slice(0, 200),
          status: Number(d.DownstreamStatus ?? 0),
          ua: String(d["request_User-Agent"] ?? "").slice(0, 160),
        });
      } catch {
        /* skip a malformed line */
      }
    }
  }
  cache = { at: Date.now(), entries, files: recent.length };
  return cache;
}

const top = <T,>(items: T[], key: (x: T) => string, n = 10) => {
  const counts = new Map<string, number>();
  for (const x of items) counts.set(key(x), (counts.get(key(x)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, count]) => ({ key: k, count }));
};

/** Request stats for our host over the last `hours` (up to 7 days). */
export async function trafficSummary(hours: number) {
  let loaded;
  try {
    loaded = await loadEntries(7);
  } catch (err) {
    return { available: false as const, reason: (err as Error).message };
  }
  const since = Date.now() - hours * 3600_000;
  const e = loaded.entries.filter((x) => x.t >= since);
  const cls = (s: number) => `${Math.floor(s / 100)}xx`;
  const probes = e.filter((x) => PROBE.test(x.path));
  const recent = (xs: Entry[], n = 30) =>
    xs.slice(-n).reverse().map((x) => ({ ...x, at: new Date(x.t).toISOString() }));
  return {
    available: true as const,
    host: HOST,
    files: loaded.files,
    total: e.length,
    uniqueIps: new Set(e.map((x) => x.ip)).size,
    byClass: Object.fromEntries(top(e, (x) => cls(x.status)).map((x) => [x.key, x.count])),
    rateLimited: e.filter((x) => x.status === 429).length,
    topIps: top(e, (x) => x.ip).map((t) => ({
      ip: t.key,
      count: t.count,
      errors: e.filter((x) => x.ip === t.key && x.status >= 400).length,
    })),
    rateLimitedIps: top(e.filter((x) => x.status === 429), (x) => x.ip),
    probes: { count: probes.length, topPaths: top(probes, (x) => x.path), topIps: top(probes, (x) => x.ip) },
    recentErrors: recent(e.filter((x) => x.status >= 500)),
    recentDenied: recent(e.filter((x) => x.status === 401 || x.status === 403)),
  };
}
