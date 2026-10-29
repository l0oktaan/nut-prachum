import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";
import { fail, json } from "./api";
import { clientIp } from "./security-log";

// The super admin page exists only when SUPERADMIN_TOKEN is set (at least 24 characters).
const token = () => {
  const t = process.env.SUPERADMIN_TOKEN ?? "";
  return t.length >= 24 ? t : null;
};
export const superadminEnabled = () => token() !== null;

const COOKIE = "np_sa";
const SESSION_HOURS = 8;
// Sessions are signed with a key derived from the token, so rotating the token signs everyone out.
const signingKey = (t: string) => createHash("sha256").update(`np-superadmin-session:${t}`).digest();
const sign = (t: string, exp: number) => createHmac("sha256", signingKey(t)).update(String(exp)).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

/* ---------------------------- login throttling ---------------------------- */

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; until: number }>();

/** Seconds left on an IP's lockout after too many wrong tokens, or 0. */
export function lockedFor(req: NextRequest): number {
  const f = failures.get(clientIp(req) ?? "?");
  return f && f.count >= MAX_FAILURES && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
}

/** Checks a login attempt; returns "ok", "bad" or "locked" (this attempt tipped the IP over the limit). */
export function checkLogin(req: NextRequest, attempt: string): "ok" | "bad" | "locked" {
  const t = token();
  const ip = clientIp(req) ?? "?";
  if (t && safeEqual(attempt, t)) {
    failures.delete(ip);
    return "ok";
  }
  const prev = failures.get(ip);
  const count = prev && prev.until > Date.now() ? prev.count + 1 : 1;
  failures.set(ip, { count, until: Date.now() + LOCK_MS });
  return count >= MAX_FAILURES ? "locked" : "bad";
}

/* -------------------------------- sessions -------------------------------- */

export async function startSession() {
  const t = token()!;
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  (await cookies()).set(COOKIE, `${exp}.${sign(t, exp)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

async function hasSession(): Promise<boolean> {
  const t = token();
  const value = (await cookies()).get(COOKIE)?.value;
  if (!t || !value) return false;
  const [expRaw, sig] = value.split(".");
  const exp = Number(expRaw);
  return Number.isFinite(exp) && exp > Date.now() && !!sig && safeEqual(sig, sign(t, exp));
}

/** JSON that browsers and proxies must not keep. */
export function privateJson<T>(data: T, status = 200) {
  const res = json(data, status);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Gate for super admin API routes: 404 while disabled, 401 without a valid session. */
export async function requireSuperadmin() {
  // Decide per request — otherwise a GET handler can be prerendered at build time, when the env has no token.
  await connection();
  if (!superadminEnabled()) return { ok: false as const, res: fail(404, "Not found") };
  if (!(await hasSession())) return { ok: false as const, res: fail(401, "กรุณาเข้าสู่ระบบ super admin") };
  return { ok: true as const };
}
