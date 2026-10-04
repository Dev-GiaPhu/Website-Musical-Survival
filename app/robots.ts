import type { MetadataRoute } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://musical-survival-official.robloxphu113.workers.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/news", "/events", "/legal"],
      disallow: ["/account", "/admin", "/api", "/auth", "/top-up"]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
