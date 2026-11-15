import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// The public pages we want search engines to find.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl }, { url: `${siteUrl}/sign-up` }];
}
