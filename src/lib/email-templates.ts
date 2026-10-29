import "server-only";
import { formatRange } from "./slots";

// Email HTML in the site's look (canvas background, white card, ink button, neon accents) written the
// way mail clients need it: table layout, inline styles, no SVG. A <style> block adds dark mode and
// small-screen padding where the client supports it. `{{ref}}` is filled in by sendMail.

const C = {
  canvas: "#f5f5f7",
  card: "#ffffff",
  ink: "#1a1a1c",
  neon: "#d4ff2b",
  lilac: "#a78bfa",
  // Lilac text is too faint on light gray; links use a deeper violet (lilac again in dark mode).
  violet: "#6d28d9",
  muted: "#6b6b70",
  soft: "#f5f5f7",
};
const FONT = "'IBM Plex Sans Thai','Plus Jakarta Sans','Leelawadee UI','Segoe UI',Tahoma,Arial,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A link styled as the site's primary (ink) button; turns neon in dark mode. */
function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="btn" bgcolor="${C.ink}" style="border-radius:999px;background:${C.ink}">
<a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font:bold 16px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:999px">${label}</a>
</td></tr></table>`;
}

function layout({ title, preheader, origin, body, extra }: { title: string; preheader: string; origin: string; body: string; extra?: string }) {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background: #0f0f12 !important; }
    .card { background: #19191d !important; }
    .fg { color: #ececf0 !important; }
    .muted { color: #a1a1a8 !important; }
    .soft { background: #232328 !important; }
    .btn { background: ${C.neon} !important; }
    .btn a { color: ${C.ink} !important; }
    .violet { color: #c4b5fd !important; }
  }
  @media (max-width: 600px) {
    .pad { padding: 24px 20px !important; }
    .h1 { font-size: 22px !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:${C.canvas};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(preheader)}</div>
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.canvas}" style="background:${C.canvas}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

<tr><td style="padding:0 4px 20px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle"><img src="${origin}/email/logo.png" width="40" height="40" alt="" style="display:block;border:0"></td>
    <td style="vertical-align:middle;padding-left:10px;font-family:${FONT}">
      <div class="fg" style="font-size:16px;font-weight:bold;color:${C.ink};line-height:1.2">Set up a meeting</div>
      <div class="muted" style="font-size:12px;color:${C.muted};line-height:1.3">นัดประชุม</div>
    </td>
  </tr></table>
</td></tr>

<tr><td class="card pad" bgcolor="${C.card}" style="background:${C.card};border-radius:24px;padding:32px;font-family:${FONT}">
${body}
</td></tr>

${extra ?? ""}

<tr><td class="muted" align="center" style="padding:24px 16px 0;font:12px/1.7 ${FONT};color:${C.muted}">
  อีเมลนี้ส่งอัตโนมัติจาก <a href="${origin}" style="color:${C.muted};text-decoration:underline">นัดประชุม · setmeet.tontaan.tech</a> กรุณาอย่าตอบกลับ<br>
  ระบบไม่ได้เก็บอีเมลของคุณ · รหัสอ้างอิง {{ref}}
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export interface AdminLinkEmail {
  title: string;
  /** Offered dates (sorted) — shown as "3 วัน · 7 ธ.ค. – 9 ธ.ค. 2569". */
  dates: string[];
  adminUrl: string;
  memberUrl: string;
  origin: string;
}

export function adminLinkEmail(m: AdminLinkEmail) {
  const when = m.dates.length ? `${m.dates.length} วัน · ${formatRange(m.dates[0], m.dates[m.dates.length - 1])}` : "";
  const subject = `ลิงก์ผู้ดูแลห้องนัดประชุม “${m.title}”`;

  const steps = [
    ["ส่งลิงก์สมาชิก", "แชร์ในกลุ่ม LINE หรือส่งลิงก์ส่วนตัวรายคนจากหน้าผู้ดูแล"],
    ["รอทุกคนเลือกเวลา", "ดูได้ว่าใครตอบแล้ว และคัดลอกข้อความทวงคนที่ยังไม่ตอบ"],
    ["สรุปวันประชุม", "เลือกช่วงที่ว่างตรงกันมากที่สุด แล้วส่งประกาศพร้อมลิงก์ Google Calendar"],
  ];

  const body = `
<span style="display:inline-block;background:${C.neon};color:${C.ink};font-size:12px;font-weight:bold;padding:5px 12px;border-radius:999px">ลิงก์ผู้ดูแล</span>
<h1 class="fg h1" style="margin:14px 0 6px;font-size:26px;line-height:1.3;color:${C.ink}">${esc(m.title)}</h1>
${when ? `<p class="muted" style="margin:0 0 18px;font-size:14px;color:${C.muted}">🗓️ ${esc(when)}</p>` : ""}
<p class="fg" style="margin:0 0 22px;font-size:15px;line-height:1.7;color:${C.ink}">
  ห้องนัดประชุมของคุณพร้อมแล้ว ใช้ปุ่มด้านล่างกลับมาดูผล ยืนยันวันประชุม และจัดการรายชื่อสมาชิกได้ทุกเมื่อ
</p>
${button(m.adminUrl, "เปิดหน้าผู้ดูแล →")}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px"><tr>
<td class="soft" bgcolor="${C.soft}" style="background:${C.soft};border-radius:16px;padding:14px 16px;font-size:13px;line-height:1.6">
  <span class="fg" style="color:${C.ink};font-weight:bold">🔒 เก็บอีเมลนี้เป็นความลับ</span><br>
  <span class="muted" style="color:${C.muted}">ใครมีลิงก์ผู้ดูแลจะแก้ไขห้องได้ — ส่งให้สมาชิกเฉพาะ “ลิงก์สำหรับสมาชิก” ด้านล่าง</span>
</td></tr></table>

<p class="fg" style="margin:26px 0 8px;font-size:14px;font-weight:bold;color:${C.ink}">ลิงก์สำหรับสมาชิก</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="soft" bgcolor="${C.soft}" style="background:${C.soft};border-left:4px solid ${C.lilac};border-radius:12px;padding:12px 14px;font:14px/1.5 ${MONO};word-break:break-all">
  <a class="violet" href="${esc(m.memberUrl)}" style="color:${C.violet};text-decoration:none">${esc(m.memberUrl)}</a>
</td></tr></table>
<p class="muted" style="margin:8px 0 0;font-size:12px;color:${C.muted}">ส่งลิงก์นี้ในกลุ่มแชต สมาชิกเปิดแล้วเลือกชื่อตัวเองได้ทันที ไม่ต้องสมัครสมาชิก</p>

<p class="muted" style="margin:26px 0 0;font-size:12px;line-height:1.6;color:${C.muted};word-break:break-all">
  ถ้าปุ่มกดไม่ได้ คัดลอกลิงก์ผู้ดูแลนี้ไปเปิด:<br>
  <a href="${esc(m.adminUrl)}" style="color:${C.muted}">${esc(m.adminUrl)}</a>
</p>`;

  // The dark "next steps" card mirrors the site's "4 ขั้นตอนง่าย ๆ" panel; it stays dark in both modes.
  const extra = `<tr><td style="padding-top:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ink}" style="background:${C.ink};border-radius:24px">
<tr><td class="pad" style="padding:24px 28px;font-family:${FONT}">
  <div style="font-size:11px;letter-spacing:1px;color:#a8a29e;font-weight:bold">ขั้นตอนต่อไป</div>
  ${steps
    .map(
      ([h, d], i) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px"><tr>
    <td style="vertical-align:top;width:40px"><div style="width:30px;height:30px;line-height:30px;border-radius:15px;text-align:center;font-weight:bold;font-size:14px;${i === 0 ? `background:${C.neon};color:${C.ink}` : "background:#2f2f34;color:#ffffff"}">${i + 1}</div></td>
    <td style="vertical-align:top">
      <div style="color:#ffffff;font-size:15px;font-weight:bold;line-height:1.4">${h}</div>
      <div style="color:#a8a29e;font-size:13px;line-height:1.5">${d}</div>
    </td></tr></table>`,
    )
    .join("")}
</td></tr></table>
</td></tr>`;

  const text = [
    subject,
    when,
    "",
    "ห้องนัดประชุมของคุณพร้อมแล้ว ใช้ลิงก์นี้กลับมาดูผลและจัดการห้อง — เก็บไว้เป็นความลับ ใครมีลิงก์นี้จะแก้ไขห้องได้",
    m.adminUrl,
    "",
    "ลิงก์สำหรับสมาชิก (ส่งในกลุ่มแชตได้):",
    m.memberUrl,
    "",
    "—",
    "อีเมลนี้ส่งอัตโนมัติจาก นัดประชุม (setmeet.tontaan.tech) กรุณาอย่าตอบกลับ",
    "ระบบไม่ได้เก็บอีเมลของคุณ · รหัสอ้างอิง {{ref}}",
  ]
    .filter((l, i) => l || i !== 1)
    .join("\n");

  return {
    subject,
    text,
    html: layout({ title: subject, preheader: `${when ? `${when} — ` : ""}ลิงก์ผู้ดูแลและลิงก์สำหรับสมาชิก`, origin: m.origin, body, extra }),
  };
}
