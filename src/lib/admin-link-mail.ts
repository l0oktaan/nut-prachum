import "server-only";
import { after, type NextRequest } from "next/server";
import { publicOrigin } from "./api";
import { mailEnabled, maskEmail, mayMail, removeSentCopy, sendMail, type Outgoing } from "./mail";
import { clientIp, logSecurityEvent } from "./security-log";

export type MailOutcome = "sent" | "failed" | "throttled" | "disabled";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Emails a room's admin link to its organizer. The address is used for this one send and never
 * stored; the security log keeps only a masked form.
 */
export async function emailAdminLink(
  req: NextRequest,
  room: { slug: string; title: string; adminKey: string },
  to: string,
): Promise<MailOutcome> {
  if (!mailEnabled()) return "disabled";
  const masked = maskEmail(to);
  if (!mayMail(clientIp(req), to)) {
    await logSecurityEvent("email_throttled", req, { slug: room.slug, detail: masked });
    return "throttled";
  }

  const origin = publicOrigin(req);
  const adminUrl = `${origin}/r/${room.slug}/admin#key=${room.adminKey}`;
  const memberUrl = `${origin}/r/${room.slug}`;
  const title = room.title.slice(0, 120);
  const mail: Outgoing = {
    to,
    subject: `ลิงก์ผู้ดูแลห้องนัดประชุม “${title}”`,
    text: [
      `ลิงก์ผู้ดูแลห้องนัดประชุม “${title}”`,
      "",
      "ใช้ลิงก์นี้กลับมาดูผลและจัดการห้อง — เก็บไว้เป็นความลับ ใครมีลิงก์นี้จะแก้ไขห้องได้",
      adminUrl,
      "",
      "ลิงก์สำหรับสมาชิก (ส่งในกลุ่มแชตได้):",
      memberUrl,
      "",
      "—",
      "อีเมลนี้ส่งอัตโนมัติจาก นัดประชุม (setmeet.tontaan.tech) กรุณาอย่าตอบกลับ",
      "ระบบไม่ได้เก็บอีเมลของคุณ",
    ].join("\n"),
    html: `<div style="font-family:Tahoma,'Leelawadee UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1c;max-width:560px">
<p style="font-size:18px;font-weight:bold;margin:0 0 12px">ลิงก์ผู้ดูแลห้องนัดประชุม “${escapeHtml(title)}”</p>
<p style="margin:0 0 16px">ใช้ลิงก์นี้กลับมาดูผลและจัดการห้อง — <b>เก็บไว้เป็นความลับ</b> ใครมีลิงก์นี้จะแก้ไขห้องได้</p>
<p style="margin:0 0 20px"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#1a1a1c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:bold">เปิดหน้าผู้ดูแล</a></p>
<p style="margin:0 0 4px;color:#6b6b70;font-size:13px">ลิงก์สำหรับสมาชิก (ส่งในกลุ่มแชตได้)</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(memberUrl)}">${escapeHtml(memberUrl)}</a></p>
<p style="margin:0;color:#9a9aa0;font-size:12px">อีเมลนี้ส่งอัตโนมัติจาก นัดประชุม (setmeet.tontaan.tech) กรุณาอย่าตอบกลับ · ระบบไม่ได้เก็บอีเมลของคุณ</p>
</div>`,
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
