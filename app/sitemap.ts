import type { MetadataRoute } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://musical-survival-official.robloxphu113.workers.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/news`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/events`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/store`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/status`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${baseUrl}/legal/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 }
  ];
}
