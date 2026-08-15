import type { MetadataRoute } from "next";

import { SITE } from "@/constants/data";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/elan-yarat",
          "/create-listing",
          "/reset-password",
          "/auth/",
          "/admin/",
          "/account/",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
