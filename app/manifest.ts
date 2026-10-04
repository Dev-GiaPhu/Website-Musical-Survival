import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Musical Survival Official",
    short_name: "Musical Survival",
    description: "Trang chính thức của Musical Survival.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090d",
    theme_color: "#08090d",
    lang: "vi"
  };
}
