// Site-wide facts shown to users (landing page, privacy page, metadata).

/** Public origin; the env var is only there at runtime, so builds fall back to the production URL. */
export const SITE_URL = process.env.APP_URL || "https://setmeet.tontaan.tech";

export const SITE_NAME = "Set up a meeting · นัดประชุม";

/** Where people can reach the operator (privacy requests, lost admin links). */
export const CONTACT_EMAIL = "admin@tontaan.tech";

/** How long rooms are kept, in words — always matching what the automatic cleanup actually does. */
export const retentionText = (days: number | null) =>
  days
    ? `ห้องและคำตอบทั้งหมดจะถูกลบอัตโนมัติเมื่อวันสุดท้ายที่ถามสมาชิกผ่านไปแล้ว ${days} วัน และผู้จัดลบห้องเองได้ทุกเมื่อ`
    : "ห้องและคำตอบจะถูกเก็บไว้จนกว่าผู้จัดจะลบห้องเองในหน้าตั้งค่า";
