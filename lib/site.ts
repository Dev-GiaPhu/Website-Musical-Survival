export const siteConfig = {
  name: "Musical Survival",
  title: "Musical Survival Official",
  description: "Trang chính thức của Musical Survival.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://musical-survival-official.robloxphu113.workers.dev"
} as const;
