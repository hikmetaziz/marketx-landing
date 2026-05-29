import type { MetadataRoute } from "next";

import { SITE } from "@/constants/data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages = ["/", "/privacy", "/terms"];

  return pages.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/privacy" ? 0.9 : path === "/" ? 1 : 0.7,
  }));
}
