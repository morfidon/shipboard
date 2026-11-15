import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Rules for search engine crawlers. The app itself is behind sign-in, so
// there is nothing for them there. This file only asks: the real locks are
// the sign-in and the data layer.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/projects", "/team", "/invitations"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
