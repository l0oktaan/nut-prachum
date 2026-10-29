import "server-only";
import { after, type NextRequest } from "next/server";
import { publicOrigin } from "./api";
import { adminLinkEmail } from "./email-templates";
import { mailEnabled, maskEmail, mayMail, removeSentCopy, sendMail, type Outgoing } from "./mail";
import { clientIp, logSecurityEvent } from "./security-log";

export type MailOutcome = "sent" | "failed" | "throttled" | "disabled";

/**
 * Emails a room's admin link to its organizer. The address is used for this one send and never
 * stored; the security log keeps only a masked form.
 */
export async function emailAdminLink(
  req: NextRequest,
  room: { slug: string; title: string; dates: string[]; adminKey: string },
  to: string,
): Promise<MailOutcome> {
  if (!mailEnabled()) return "disabled";
  const masked = maskEmail(to);
  if (!mayMail(clientIp(req), to)) {
    await logSecurityEvent("email_throttled", req, { slug: room.slug, detail: masked });
    return "throttled";
  }

  const origin = publicOrigin(req);
  const mail: Outgoing = {
    to,
    ...adminLinkEmail({
      title: room.title.slice(0, 120),
      dates: room.dates,
      adminUrl: `${origin}/r/${room.slug}/admin#key=${room.adminKey}`,
      memberUrl: `${origin}/r/${room.slug}`,
      origin,
    }),
  };

  const res = await sendMail(mail);
  if (!res.ok) {
    await logSecurityEvent("email_failed", req, { slug: room.slug, detail: `${masked} · ${res.reason}` });
    return "failed";
  }
  await logSecurityEvent("email_sent", req, { slug: room.slug, detail: masked });

  // The mailbox keeps a Sent copy (with the admin link): remove it once the response is out.
  after(async () => {
    try {
      const removed = await removeSentCopy(res.ref, mail);
      if (!removed) await logSecurityEvent("email_copy_kept", req, { slug: room.slug, detail: `${masked} · ไม่พบสำเนาใน Sent` });
    } catch (err) {
      await logSecurityEvent("email_copy_kept", req, {
        slug: room.slug,
        detail: `${masked} · ${(err as Error).message.slice(0, 120)}`,
      });
    }
  });
  return "sent";
}
