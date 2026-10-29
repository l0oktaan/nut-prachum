import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IBM_Plex_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { getSettings } from "@/lib/settings";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { themeInitScript } from "@/lib/theme-init";
import "./globals.css";

// Plus Jakarta Sans has no Thai glyphs; the browser falls back to IBM Plex Sans Thai for those.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

const TITLE = "Set up a meeting นัดประชุม — หาวันที่ทุกคนว่างตรงกัน";
const DESCRIPTION = "สร้างห้องนัดประชุม ส่งลิงก์ให้สมาชิกเลือกวันเวลาที่สะดวก แล้วดูผลว่าช่วงไหนว่างตรงกันมากที่สุด ฟรี ไม่ต้องล็อกอิน";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Link previews in LINE, Facebook and other chats.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "th_TH",
    title: "หาวันประชุมที่ทุกคนว่างตรงกัน ในลิงก์เดียว",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "นัดประชุม — Set up a meeting" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by the inline script before hydration, so the server's <html> differs by design.
    <html lang="th" className={`${jakarta.variable} ${plexThai.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full font-sans">
        <Sidebar />
        <div className="flex min-h-screen flex-col lg:pl-[17.5rem]">
          <main className="flex-1">{children}</main>
          <footer className="py-6 text-center text-xs text-stone-400">
            Set up a meeting · นัดประชุม · ไม่ต้องสมัครสมาชิก ไม่ต้องล็อกอิน
            <Suspense>
              <PrivacyLink />
            </Suspense>
          </footer>
        </div>
      </body>
    </html>
  );
}

/** Footer link to /privacy, shown only while the super admin has the page published. */
async function PrivacyLink() {
  await connection();
  const { privacyPublished } = await getSettings();
  if (!privacyPublished) return null;
  return (
    <>
      {" · "}
      <Link href="/privacy" className="underline-offset-4 hover:underline">
        นโยบายความเป็นส่วนตัว
      </Link>
    </>
  );
}
