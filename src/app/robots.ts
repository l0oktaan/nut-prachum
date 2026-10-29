import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Rooms, the API and the super admin page stay out of search engines (rooms are noindex too).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/r/", "/api/", "/superadmin"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
