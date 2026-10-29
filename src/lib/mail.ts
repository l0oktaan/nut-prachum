import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Hostinger Mail API (https://api.mail.hostinger.com): sends from a real mailbox (MAIL_FROM) that the
// API key manages, and keeps a copy in that mailbox's Sent folder — which we remove, since our mails
// carry admin links. Nothing about recipients is stored except a masked address in the security log.
const API = "https://api.mail.hostinger.com/api/v1";
const apiKey = () => process.env.HOSTINGER_MAIL_API_KEY || null;
const fromAddress = () => (process.env.MAIL_FROM ?? "").toLowerCase();
const displayName = () => process.env.MAIL_DISPLAY_NAME || "นัดประชุม · Set up a meeting";

export const mailEnabled = () => apiKey() !== null && fromAddress() !== "";
export const mailFrom = () => fromAddress() || null;

/** "somchai@gmail.com" → "so***@gm***.com" — enough to tell entries apart, not to read the address. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  const dot = domain.lastIndexOf(".");
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, Math.min(2, Math.max(1, local.length - 1)))}***@${name.slice(0, 2)}***${tld}`;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, data };
}

let mailbox: { id: string; sent: string } | null = null;

/** The sending mailbox's resource id and Sent folder path (looked up once). */
async function getMailbox() {
  if (mailbox) return mailbox;
  const me = await call<{ data: { mailboxes: { resourceId: string; address: string }[] } }>("/me");
  const box = me.data?.data.mailboxes.find((m) => m.address.toLowerCase() === fromAddress());
  if (!box) throw new Error(`API key can't send as ${fromAddress()} (HTTP ${me.status})`);
  const folders = await call<{ data: { path: string; specialUse: string | null }[] }>(
    `/mailboxes/${box.resourceId}/folders?perPage=100`,
  );
  const sent = folders.data?.data.find((f) => f.specialUse === "\\Sent")?.path ?? "INBOX.Sent";
  mailbox = { id: box.resourceId, sent };
  return mailbox;
}

/* -------------------------------- throttling ------------------------------- */

// Anyone can type an address into the create form, so cap how often we mail: per sender IP, per
// recipient, and overall — enough for real use, too little to be worth abusing.
const LIMITS = { perIp: 5, perRecipient: 3, perDay: 200 };
const hits = new Map<string, number[]>();

function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function mayMail(ip: string | null, to: string): boolean {
  const recipient = createHash("sha256").update(to.toLowerCase()).digest("hex");
  return (
    allow(`ip:${ip ?? "?"}`, LIMITS.perIp, 3600_000) &&
    allow(`to:${recipient}`, LIMITS.perRecipient, 3600_000) &&
    allow("all", LIMITS.perDay, 86_400_000)
  );
}

/* ---------------------------------- sending -------------------------------- */

export interface Outgoing {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendResult = { ok: true; ref: string } | { ok: false; reason: string };

/** Sends one email; the body gets a random reference so the Sent copy can be found and removed. */
export async function sendMail(m: Outgoing): Promise<SendResult> {
  if (!mailEnabled()) return { ok: false, reason: "mail not configured" };
  const ref = `np-${randomBytes(8).toString("hex")}`;
  try {
    const box = await getMailbox();
    const res = await call<{ error?: string; code?: string }>(`/mailboxes/${box.id}/send`, {
      method: "POST",
      body: JSON.stringify({
        to: [m.to],
        displayName: displayName(),
        subject: m.subject,
        text: `${m.text}\n\nรหัสอ้างอิง: ${ref}`,
        html: `${m.html}<p style="color:#9a9aa0;font-size:11px">รหัสอ้างอิง: ${ref}</p>`,
      }),
    });
    if (res.status === 204 || res.status === 200 || res.status === 202) return { ok: true, ref };
    return { ok: false, reason: `HTTP ${res.status}${res.data?.code ? ` ${res.data.code}` : ""}` };
  } catch (err) {
    return { ok: false, reason: (err as Error).message.slice(0, 200) };
  }
}

type Found = { uid: number; subject: string; to: { address: string }[] };

/**
 * Deletes the Sent-folder copy of one email we just sent. A message is deleted only if it carries
 * our random reference AND has exactly our subject and recipient — so the mailbox owner's own mail
 * can never match. Returns how many copies were removed (normally 1; 0 if not found yet).
 */
export async function removeSentCopy(ref: string, m: Outgoing): Promise<number> {
  const box = await getMailbox();
  const folder = encodeURIComponent(box.sent);
  const today = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000));
    const found = await call<{ data: Found[] }>(`/mailboxes/${box.id}/folders/${folder}/messages/search?perPage=10`, {
      method: "POST",
      body: JSON.stringify({ body: ref, since: today }),
    });
    const ours = (found.data?.data ?? []).filter(
      (x) => x.subject === m.subject && x.to?.length === 1 && x.to[0].address.toLowerCase() === m.to.toLowerCase(),
    );
    if (!ours.length) continue;
    let removed = 0;
    for (const x of ours) {
      const del = await call(`/mailboxes/${box.id}/folders/${folder}/messages/${x.uid}`, { method: "DELETE" });
      if (del.status < 300) removed++;
    }
    return removed;
  }
  return 0;
}
